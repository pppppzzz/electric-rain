#include <SPI.h>
#include "Config.h"
#include "Songs.h"
#include "GameRules.h"

enum Mode : uint8_t { CALIBRATING, WAIT_BLOW, CAPTURE_BLOW, COUNTDOWN, PLAYING, FINISHED, DISPLAY_TEST, LED_TEST, MATRIX_BLANK };
Mode mode;
uint32_t stateStart, windowStart, lastSonar, lastFrame, lastReport, songStart;
uint16_t sampleMin=1023, sampleMax=0, noiseFloor=0, blowPeak=0;
uint32_t noiseSum=0;
uint16_t noiseWindows=0;
uint8_t triggerWindows=0;
uint8_t pixels[4][8];
int8_t activeKey=-1, candidateKey=-1;
uint8_t candidateCount=0, releaseCount=0;
uint32_t lastStableReading=0;
int16_t bufferedEvent=-1;
const char *song=JASMINE;
uint16_t songCount=0;
uint32_t songDuration=0;
uint8_t selectedSong=0;
uint8_t verdicts[sizeof(DOLL_BEAR)-1];
static_assert(sizeof(JASMINE)<=sizeof(DOLL_BEAR) && sizeof(JINGLE)<=sizeof(DOLL_BEAR), "Score buffer too small");
uint32_t lightStart=0;
bool lightActive=false;
uint32_t lastMatrixConfig=0;

void lightsOff() {
  digitalWrite(RED_PIN,!LED_ON); digitalWrite(YELLOW_PIN,!LED_ON); digitalWrite(GREEN_PIN,!LED_ON);
  lightActive=false;
}
void showLight(uint8_t pin,uint32_t now) {
  lightsOff(); digitalWrite(pin,LED_ON); lightStart=now; lightActive=true;
}
void reportResult(Verdict result, int16_t index, uint32_t now) {
  if(index>=0) {
    if(verdicts[index]!=PENDING) return; // 一音符只判定一次
    verdicts[index]=result;
  }
  if(result==HIT) { showLight(GREEN_PIN,now); Serial.print(F("GREEN HIT")); }
  else {
    if(result==MISSED) { showLight(RED_PIN,now); Serial.print(F("RED MISS")); }
    else { showLight(YELLOW_PIN,now); Serial.print(F("YELLOW EARLY/WRONG")); }
  }
  Serial.print(F(" event=")); Serial.println(index);
}
void checkMisses(uint32_t now) {
  uint32_t elapsed=now-songStart;
  for(uint16_t i=0;i<songCount;i++) {
    char symbol=pgm_read_byte(song+i);
    if(symbol>='1' && symbol<='8' && verdicts[i]==PENDING && expired(elapsed,uint32_t(i)*SCORE_BEAT_MS))
      reportResult(MISSED,i,now);
  }
}
bool tryHitKey(uint8_t key,uint32_t now) {
  uint32_t elapsed=now-songStart;
  for(uint16_t i=0;i<songCount;i++) {
    if(verdicts[i]==PENDING && pgm_read_byte(song+i)==('1'+key) &&
       inHitWindow(elapsed,uint32_t(i)*SCORE_BEAT_MS)) {
      reportResult(HIT,i,now);
      return true;
    }
  }
  return false;
}
void onKeyPress(uint8_t key,uint32_t now) {
  if(mode!=PLAYING) return;
  bufferedEvent=-1;
  if(tryHitKey(key,now)) return;
  // 只缓存新按下，且必须处在到底前 EARLY_BUFFER_MS 的时间内。
  for(uint16_t i=0;i<songCount;i++) {
    if(verdicts[i]==PENDING && pgm_read_byte(song+i)==('1'+key) &&
       inEarlyBuffer(now-songStart,uint32_t(i)*SCORE_BEAT_MS)) {
      bufferedEvent=i;
      break;
    }
  }
  // 黄灯仅提醒：不终结任何音符，因此之后仍能修正为绿灯。
  reportResult(EARLY,-1,now);
}
void updateBufferedHit(uint32_t now) {
  if(mode!=PLAYING || bufferedEvent<0) return;
  uint16_t i=bufferedEvent;
  if(verdicts[i]!=PENDING || pgm_read_byte(song+i)!=('1'+activeKey) ||
     !freshHeldKey(activeKey,candidateKey,candidateCount,releaseCount,now-lastStableReading)) {
    bufferedEvent=-1; return;
  }
  uint32_t onset=uint32_t(i)*SCORE_BEAT_MS;
  if(inHitWindow(now-songStart,onset)) {
    reportResult(HIT,i,now); bufferedEvent=-1;
  } else if(expired(now-songStart,onset)) bufferedEvent=-1;
}

void matrixAll(uint8_t reg, uint8_t value) {
  SPI.beginTransaction(SPISettings(MATRIX_SPI_HZ, MSBFIRST, SPI_MODE0));
  digitalWrite(MATRIX_CS, LOW);
  for(uint8_t i=0;i<4;i++) { SPI.transfer(reg); SPI.transfer(value); }
  digitalWrite(MATRIX_CS, HIGH);
  SPI.endTransaction();
}
void clearPixels() { memset(pixels,0,sizeof(pixels)); }
void pixel(uint8_t x,uint8_t y) {
  if(x>=32 || y>=8) return;
  uint8_t tile=x/8, tx=x%8, ty=y;
  if(REVERSE_MODULES) tile=3-tile;
  if(TRANSPOSE_TILE) { uint8_t t=tx; tx=ty; ty=t; }
  if(FLIP_TILE_X) tx=7-tx;
  if(FLIP_TILE_Y) ty=7-ty;
  pixels[tile][ty] |= uint8_t(1U<<tx);
}
void block(uint8_t key,int8_t top) {
  for(uint8_t dx=0;dx<4;dx++)
    for(int8_t dy=0;dy<2;dy++)
      if(top+dy>=0 && top+dy<8) pixel(key*4+dx,top+dy);
}
void flushMatrix() {
  SPI.beginTransaction(SPISettings(MATRIX_SPI_HZ, MSBFIRST, SPI_MODE0));
  for(uint8_t row=0;row<8;row++) {
    digitalWrite(MATRIX_CS, LOW);
    for(int8_t tile=3;tile>=0;tile--) { SPI.transfer(row+1); SPI.transfer(pixels[tile][row]); }
    digitalWrite(MATRIX_CS, HIGH);
  }
  SPI.endTransaction();
}
void configureMatrix() {
  // 全亮测试模式会覆盖显示 RAM；只更新像素不能退出它。
  matrixAll(0x0F,0); // display test OFF，四片同时写入
  matrixAll(0x09,0); // 不使用数码管 BCD 解码
  matrixAll(0x0B,7); // 扫描全部八行
  matrixAll(0x0A,MATRIX_BRIGHTNESS);
  matrixAll(0x0C,1); // normal operation
  lastMatrixConfig=millis();
}
void resetMatrix() {
  matrixAll(0x0F,0); // 先关闭会覆盖 shutdown 的全亮测试
  matrixAll(0x0C,0);
  clearPixels(); flushMatrix();
  configureMatrix();
}
void resetDistance() { activeKey=candidateKey=-1; candidateCount=releaseCount=0; lastStableReading=0; bufferedEvent=-1; }
void startLedTest() {
  lightsOff(); resetDistance(); mode=LED_TEST; stateStart=millis();
  Serial.println(F("LED TEST: red, yellow, green; 1 second each."));
}
void updateLedTest(uint32_t now) {
  uint32_t elapsed=now-stateStart;
  if(elapsed<1000) showLight(RED_PIN,now);
  else if(elapsed<2000) showLight(YELLOW_PIN,now);
  else if(elapsed<3000) showLight(GREEN_PIN,now);
  else { lightsOff(); mode=FINISHED; stateStart=now; }
}
void restartSelection() {
  lightsOff(); resetDistance(); mode=CALIBRATING; stateStart=windowStart=millis();
  sampleMin=1023; sampleMax=0; noiseSum=0; noiseWindows=0; noiseFloor=0;
  triggerWindows=0; blowPeak=0;
  Serial.println(F("Keep quiet for 2 seconds: calibrating microphone."));
}
void selectSong(uint8_t id) {
  selectedSong=id;
  if(id==0) { song=JASMINE; songCount=sizeof(JASMINE)-1; }
  else if(id==1) { song=JINGLE; songCount=sizeof(JINGLE)-1; }
  else { song=DOLL_BEAR; songCount=sizeof(DOLL_BEAR)-1; }
  songDuration=uint32_t(songCount)*SCORE_BEAT_MS;
  memset(verdicts,0,sizeof(verdicts));
  lightsOff(); resetDistance(); mode=COUNTDOWN; stateStart=millis();
  Serial.print(F("Selected: "));
  if(id==0) Serial.println(F("Mo Li Hua"));
  else if(id==1) Serial.println(F("Jingle Bells"));
  else Serial.println(F("Doll and Bear Dance"));
  Serial.println(F("Microphone locked. Play when blocks reach the bottom. r = restart."));
}
void updateMicrophone(uint32_t now) {
  // 此函数只在选歌阶段调用，演奏时完全不读取声音传感器。
  uint16_t value=analogRead(MIC_PIN);
  if(value<sampleMin) sampleMin=value;
  if(value>sampleMax) sampleMax=value;
  if(now-windowStart<MIC_WINDOW_MS) return;
  uint16_t amplitude=sampleMax-sampleMin;
  sampleMin=1023; sampleMax=0; windowStart=now;
  if(mode==CALIBRATING) {
    noiseSum+=amplitude; noiseWindows++;
    if(now-stateStart>=CALIBRATION_MS) {
      noiseFloor=noiseSum/noiseWindows; mode=WAIT_BLOW; stateStart=now;
      Serial.print(F("Noise floor=")); Serial.println(noiseFloor);
      Serial.println(F("Blow now: soft / medium / strong."));
    }
    return;
  }
  uint16_t strength=amplitude; // 0..1023 raw peak-to-peak; no baseline subtraction
  if(now-lastReport>=250) {
    lastReport=now; Serial.print(F("Blow strength=")); Serial.println(strength);
  }
  if(mode==WAIT_BLOW) {
    if(strength>=BLOW_TRIGGER) {
      if(triggerWindows==0) blowPeak=0;
      if(strength>blowPeak) blowPeak=strength;
      if(++triggerWindows>=3) { mode=CAPTURE_BLOW; stateStart=now; }
    } else { triggerWindows=0; blowPeak=0; }
  } else if(mode==CAPTURE_BLOW) {
    if(strength>blowPeak) blowPeak=strength;
    if(now-stateStart>=BLOW_CAPTURE_MS) {
      Serial.print(F("Captured peak=")); Serial.println(blowPeak);
      int8_t choice=songForStrength(blowPeak);
      if(choice>=0) selectSong(choice);
      else {
        if(blowPeak<SONG_MIN) {
          Serial.print(F("Below ")); Serial.print(SONG_MIN);
          Serial.println(F(": no song selected. Blow harder and try again."));
        } else {
          Serial.print(F("Above ")); Serial.print(SONG_MAX);
          Serial.println(F(": no song selected. Blow more gently and try again."));
        }
        mode=WAIT_BLOW; triggerWindows=0; blowPeak=0;
      }
    }
  }
}
void updateSonar(uint32_t now) {
  if(now-lastSonar<SONAR_INTERVAL_MS) return;
  lastSonar=now;
  digitalWrite(TRIG_PIN,LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN,HIGH); delayMicroseconds(10); digitalWrite(TRIG_PIN,LOW);
  uint32_t us=pulseInLong(ECHO_PIN,HIGH,SONAR_TIMEOUT_US);
  uint16_t mm=(us*343UL+1000)/2000;
  if(now-lastReport>=500) {
    lastReport=now;
    if(us==0) Serial.println(F("Sonar: NO ECHO. Check Trig=D6, Echo=D7, 5V, GND."));
    else {
      Serial.print(F("Sonar raw mm=")); Serial.print(mm);
      if(keyForDistance(mm)<0) Serial.println(F(" OUTSIDE 30..149 mm -> released"));
      else { Serial.print(F(" target key=")); Serial.print(keyForDistance(mm)+1); Serial.print(F(" stable key=")); Serial.println(activeKey+1); }
    }
  }
  int8_t key=us==0 ? -1 : stableKeyForDistance(mm,activeKey);
  if(key<0) {
    candidateKey=-1; candidateCount=0;
    if(releaseCount<2) releaseCount++;
    if(releaseCount>=2) activeKey=-1; // 连续两次离开才允许重按，避免回波偶发丢失重触发
    return;
  }
  releaseCount=0;
  if(key!=candidateKey) { candidateKey=key; candidateCount=1; }
  else if(candidateCount<2) candidateCount++;
  if(candidateCount>=2) lastStableReading=millis();
  if(candidateCount>=2 && key!=activeKey) {
    activeKey=key;
    Serial.print(F("PRESS mm=")); Serial.print(mm); Serial.print(F(" key=")); Serial.println(key+1);
    if(mode==DISPLAY_TEST) showLight(GREEN_PIN,millis());
    else {
      uint32_t detected=millis();
      checkMisses(detected);
      onKeyPress(key,detected);
    }
  }
}

void drawSong(uint32_t elapsed) {
  uint32_t onset=0;
  for(uint16_t i=0;i<songCount;i++) {
    char symbol=pgm_read_byte(song+i);
    uint8_t key=(symbol>='1' && symbol<='8') ? symbol-'0' : 0;
    // 保留已调好的动画；top 首次为 6 的时刻就是判定起点。
    int32_t age=int32_t(elapsed)-int32_t(onset);
    if(key && age>=0 && age<=int32_t(FALL_MS+180)) {
      int8_t top=age>=FALL_MS ? 6 : (uint32_t(age)*7/FALL_MS);
      block(key-1,top);
    }
    onset+=SCORE_BEAT_MS; // 空格也占一拍，但不画方块
  }
}
void render(uint32_t now) {
  if(now-lastFrame<30) return;
  lastFrame=now; clearPixels();
  if(mode==PLAYING) drawSong(now-songStart);
  else if(mode==COUNTDOWN) { for(uint8_t i=0;i<=selectedSong;i++) block(i,3); }
  else if(mode==DISPLAY_TEST) {
    uint32_t step=(now-stateStart)/250;
    block((step/7)%8,step%7);
    pixel(0,0); // 左上角定位点
  } else if(mode==WAIT_BLOW || mode==CAPTURE_BLOW) {
    if((now/400)%2) { pixel(14,3); pixel(15,3); pixel(16,3); pixel(17,3); }
  } else if(mode==CALIBRATING) {
    uint8_t count=min(32UL,(now-stateStart)*32/CALIBRATION_MS);
    for(uint8_t x=0;x<count;x++) pixel(x,7);
  } else if(mode==FINISHED) { for(uint8_t x=0;x<32;x+=4) pixel(x,7); }
  flushMatrix();
}
void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN,OUTPUT); pinMode(ECHO_PIN,INPUT); pinMode(RED_PIN,OUTPUT); pinMode(YELLOW_PIN,OUTPUT); pinMode(GREEN_PIN,OUTPUT); lightsOff();
  pinMode(MATRIX_CS,OUTPUT); digitalWrite(MATRIX_CS,HIGH); SPI.begin();
  delay(50); // 上电初始化前给模块供电短暂稳定时间；不在游戏中阻塞
  resetMatrix();
  Serial.println(F("Interactive Piano v3.2 MODERATE | r: restart | 1/2/3: song | t/m: reset matrix + animation | x: blank matrix | l: LED test"));
  restartSelection();
}
void loop() {
  uint32_t now=millis();
  while(Serial.available()) {
    char ch=Serial.read();
    if(ch=='r' || ch=='R') restartSelection();
    else if(ch=='l' || ch=='L') startLedTest();
    else if(ch>='1' && ch<='3') selectSong(ch-'1');
    else if(ch=='x' || ch=='X') {
      lightsOff(); resetDistance(); mode=MATRIX_BLANK; resetMatrix();
      Serial.println(F("BLANK commands sent. All pixels should be OFF. If still all ON, check IN/DIN=D11/CLK=D13/CS=D10/GND/power. m: animation, r: game."));
    }
    else if(ch=='t' || ch=='T' || ch=='m' || ch=='M') {
      resetMatrix();
      lightsOff(); resetDistance(); mode=DISPLAY_TEST; stateStart=millis();
      Serial.println(F("MATRIX commands sent (no readback). Expect falling blocks. Sonar press flashes green. x: blank, r: game."));
    }
  }
  now=millis();
  if(mode==CALIBRATING || mode==WAIT_BLOW || mode==CAPTURE_BLOW) updateMicrophone(now);
  else if(mode==COUNTDOWN && now-stateStart>=COUNTDOWN_MS) {
    mode=PLAYING; songStart=now; lastSonar=now-SONAR_INTERVAL_MS;
  } else if(mode==PLAYING) {
    updateSonar(now);
    now=millis(); updateBufferedHit(now); checkMisses(now);
    if(now-songStart>=songDuration+LANDING_MS+HIT_WINDOW_MS+HIT_LATE_MS+1) {
      resetDistance(); mode=FINISHED; stateStart=now;
      Serial.println(F("Song finished. Quiet pause, then recalibrate and blow again."));
    }
  } else if(mode==DISPLAY_TEST) updateSonar(now);
  else if(mode==LED_TEST) updateLedTest(now);
  else if(mode==FINISHED && now-stateStart>=ROUND_PAUSE_MS) restartSelection();
  now=millis(); // 避免状态切换后 now 早于 stateStart
  if(lightActive && mode!=LED_TEST && now-lightStart>=LIGHT_HOLD_MS) lightsOff();
  // 只重写控制寄存器，不清除动画。可恢复偶发状态异常，不能修复断线/供电故障。
  if(now-lastMatrixConfig>=MATRIX_REFRESH_CONFIG_MS) configureMatrix();
  render(now);
}
