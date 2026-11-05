// 《电子雨季》Electric Rain — Arduino UNO R3 / ATmega328P
#include <Arduino.h>
#include <SPI.h>
#include <MD_MAX72xx.h>
#include <avr/interrupt.h>
#include <avr/pgmspace.h>

// ===== 现场校准集中区 =====
const MD_MAX72XX::moduleType_t MATRIX_TYPE = MD_MAX72XX::FC16_HW;
const uint8_t MATRIX_DEVICES = 4, MATRIX_BRIGHTNESS = 0; // 0~15，0 是最低亮度，不是关闭
const bool MIRROR_X = true, MIRROR_Y = false; // 逻辑左上角为 (0,0)
// MH-FMD 的丝印不能证明内部有源/无源；默认尝试方波，不能承诺可变音高。
const bool BUZZER_ACTIVE_LOW=true;
const uint8_t BUZZER_MODE=0; // 0=尝试 tone 音高；1=固定音开关，明确不具备八音能力
const uint16_t DIAG_BEEP_MS=450, DIAG_REPORT_MS=500;
const uint16_t SOUND_LIGHT=6, SOUND_MEDIUM=22, SOUND_LOUD=55;
const uint16_t SOUND_NOISE_MARGIN_MAX=12;
const uint16_t DISTANCE_REPORT_MS=500;
// 综合检查各步骤时长，顺序见 diagnosticTask。
const uint16_t CHECK_TIMES[]={500,3200,1600,1600,1600,500,900,800,800,800,800,2500,5000};
const uint8_t SOUND_PIN=A0, TRIG_PIN=8, ECHO_PIN=9, CS_PIN=10, BUZZER_PIN=12;
const int16_t KEY_EDGES_MM[9] = {30,45,60,75,90,105,120,135,150};
const int16_t DISTANCE_OFFSET_MM = 0;
const uint16_t DISTANCE_SCALE_PERMILLE = 1000;
const uint8_t HYSTERESIS_MM = 2, STABLE_SAMPLES = 2;
const uint16_t PING_INTERVAL_MS=65, ECHO_TIMEOUT_US=3500;
const uint16_t VALID_MIN_MM=20, VALID_MAX_MM=500, RELEASE_MS=130;
const uint16_t NOTE_GAP_MS=150, BEEP_MS=100;
// AO 的 ADC 峰峰值单位，非分贝；相对于环境基线的增量
// LIGHT/MEDIUM/LOUD 已在配置区上方集中定义。
const uint8_t SOUND_TRIGGER_WINDOWS=2;
const uint16_t SOUND_WINDOW_MS=25, SOUND_CAPTURE_MS=650;
const uint16_t NOISE_CAL_MS=2000, QUIET_REARM_MS=250, SOUND_COOLDOWN_MS=1000;
const uint16_t COUNTDOWN_MS=2400, FALL_MS=1800, HIT_WINDOW_MS=180;
const uint16_t FINISH_MS=1800, FLASH_MS=240, FRAME_MS=33;
const uint16_t SOUND_TELEMETRY_MS=500, PLAY_TELEMETRY_MS=500;
const uint16_t POINTS_PER_HIT=100;
const uint32_t SERIAL_BAUD=115200;

MD_MAX72XX matrix(MATRIX_TYPE, CS_PIN, MATRIX_DEVICES); // 硬件 SPI：D11、D13
// 统一谱面：note=0 休止，1~8 白键；start/duration 均为毫秒，存在 Flash。
struct Note { uint16_t start; uint16_t duration; uint8_t note; };
#include "Songs.h"
static_assert(FALL_MS==SONG_LEAD_MS,"修改 FALL_MS 后请同步 generate_songs.py 并重新生成曲谱");
static_assert(STABLE_SAMPLES>=1,"稳定确认次数至少为 1");
static_assert(SOUND_LIGHT>0 && SOUND_LIGHT<SOUND_MEDIUM && SOUND_MEDIUM<SOUND_LOUD,"声音阈值需递增");
enum Phase : uint8_t { WAITING, LISTENING, SELECTED, PLAYING, FINISHING, CHECKING };
enum Event : uint8_t { STATE, SOUND, SONG, TRIGGER, HIT, MISS, WRONG, END, STATUS, DISTANCE, DIAGNOSTIC };
// 显式声明自定义类型参数，兼容 Arduino IDE 自动生成函数声明的步骤。
void formatDiagnostic(int16_t code, uint32_t t);
void soundBuzzer(uint8_t note,uint16_t duration);
void stopBuzzer();
void buzzerTask();
void resetMatrix();
void drawCheck(uint32_t elapsed);
void diagnosticTask();
void emit(Event ev, uint8_t actual=0, int16_t id=-1, uint8_t target=0);
void setPhase(Phase p);
Note getNote(uint8_t i);
const char phaseNames[][11] PROGMEM={"WAITING","LISTENING","SELECTED","PLAYING","FINISHING","CHECKING"};
const char eventNames[][12] PROGMEM={"state","sound","song","trigger","hit","miss","wrong","end","status","DISTANCE","diagnostic"};
const char songNames[][32] PROGMEM={"","茉莉花","铃儿响叮当","洋娃娃和小熊跳舞"};
const uint16_t frequencies[8] PROGMEM={262,294,330,349,392,440,494,523};
Phase phase=CHECKING;
uint32_t phaseAt=0, playAt=0;
uint8_t songId=0, noteCount=0, outcomes[MAX_SONG_NOTES]; // 0未判，1命中，2未命中
uint16_t score=0, combo=0, judged=0, songDuration=0;
int8_t currentNote=0, candidate=0, flashNote=0;
uint8_t candidateCount=0;
bool armed=true, releasing=false;
uint32_t releaseAt=0, lastTriggerAt=0, flashAt=0, lastFrame=0;
int16_t distanceMm=-1;

// 串口只入队快照；每轮仅写 UART 缓冲区剩余空间，避免 print 等待。
struct Packet {
  uint32_t t; uint16_t score, combo, sound, base; int16_t mm, id;
  uint8_t event, phase, song, note, actual, target;
};
const uint8_t QUEUE_SIZE=12;
Packet queue[QUEUE_SIZE];
uint8_t qHead=0,qTail=0;
uint16_t dropped=0, soundPp=0, relativeSound=0, noiseBase=0;
uint16_t soundRaw=0, soundLow=0, soundHigh=0;
uint16_t triggerLevel=SOUND_LIGHT, mediumLevel=SOUND_MEDIUM, loudLevel=SOUND_LOUD;
uint16_t validEchoes=0, invalidEchoes=0, lastEchoUs=0;
uint8_t soundFlags=0; // bit0校准完成 bit1已武装 bit2已触发 bit3整窗贴电源轨
uint8_t checkStep=255;
uint32_t checkAt=0;
bool matrixReady=false;
char tx[320]; uint16_t txLength=0,txPosition=0;
void emit(Event ev, uint8_t actual, int16_t id, uint8_t target) {
  uint8_t next=(qHead+1)%QUEUE_SIZE;
  if(next==qTail) { ++dropped; return; }
  Packet &p=queue[qHead];
  p.t=millis(); p.score=score; p.combo=combo; p.sound=soundPp; p.base=noiseBase;
  p.mm=distanceMm; p.id=id; p.event=ev; p.phase=phase; p.song=songId;
  p.note=currentNote; p.actual=actual; p.target=target;
  if(ev==SOUND) { p.id=soundRaw; p.mm=relativeSound; p.actual=soundFlags; }
  if(ev==DISTANCE) { p.sound=lastEchoUs; p.base=validEchoes; p.id=invalidEchoes; }
  qHead=next;
}
void serialTask() {
  if(txPosition==txLength && qTail!=qHead) {
    Packet &p=queue[qTail]; char st[11], ev[12], title[32];
    strcpy_P(st,phaseNames[p.phase]); strcpy_P(ev,eventNames[p.event]);
    strcpy_P(title,songNames[p.song]);
    if(p.event==SOUND) {
      txLength=snprintf_P(tx,sizeof(tx),PSTR("{\"v\":1,\"t\":%lu,\"event\":\"SOUND\",\"phase\":\"%s\",\"adc\":%d,\"pp\":%u,\"baseline\":%u,\"relative\":%d,\"light\":%u,\"medium\":%u,\"loud\":%u,\"calibrated\":%u,\"armed\":%u,\"triggered\":%u,\"rail\":%u,\"result\":\"adc_read_not_acoustic_proof\"}\n"),
        p.t,st,p.id,p.sound,p.base,p.mm,triggerLevel,mediumLevel,loudLevel,
        !!(p.actual&1),!!(p.actual&2),!!(p.actual&4),!!(p.actual&8));
    } else if(p.event==DISTANCE) {
      txLength=snprintf_P(tx,sizeof(tx),PSTR("{\"v\":1,\"t\":%lu,\"event\":\"DISTANCE\",\"phase\":\"%s\",\"mm\":%d,\"note\":%u,\"echo_us\":%u,\"valid_count\":%u,\"invalid_count\":%u,\"result\":\"%s\"}\n"),
        p.t,st,p.mm,p.note,p.sound,p.base,(uint16_t)p.id,p.mm<0?"invalid_or_timeout":"echo_seen_accuracy_unverified");
    } else if(p.event==DIAGNOSTIC) {
      formatDiagnostic(p.id,p.t); // 提示只表示命令已发送，不表示模块通过
    } else {
    txLength=snprintf_P(tx,sizeof(tx),PSTR("{\"v\":1,\"t\":%lu,\"event\":\"%s\",\"phase\":\"%s\",\"sound\":%u,\"baseline\":%u,\"song\":%u,\"title\":\"%s\",\"note\":%u,\"actual\":%u,\"mm\":%d,\"id\":%d,\"target\":%u,\"score\":%u,\"combo\":%u,\"dropped\":%u}\n"),
      p.t,ev,st,p.sound,p.base,p.song,title,p.note,p.actual,p.mm,p.id,p.target,p.score,p.combo,dropped);
    }
    if(txLength>=sizeof(tx)) txLength=0; // 配置扩大字段时防止越界
    txPosition=0; qTail=(qTail+1)%QUEUE_SIZE;
  }
  uint16_t space=Serial.availableForWrite();
  uint16_t remaining=txLength-txPosition;
  uint16_t n=min(space,remaining);
  if(n) { Serial.write((const uint8_t*)tx+txPosition,n); txPosition+=n; }
}
Note getNote(uint8_t i) {
  Note n; const Note *table = songId==1?song1:(songId==2?song2:song3);
  memcpy_P(&n,table+i,sizeof(n)); return n;
}
void setPhase(Phase p) { phase=p; phaseAt=millis(); emit(STATE); }

// D9 是 PB1/PCINT1。捕获回波两条边沿，不用 pulseIn() 等待。
volatile bool echoActive=false,echoHigh=false,echoReady=false;
volatile uint32_t echoRise=0;
volatile uint16_t echoWidth=0;
uint32_t pingAtUs=0,lastPing=0;
ISR(PCINT0_vect) {
  if(!echoActive) return;
  if(PINB & _BV(PB1)) { echoRise=micros(); echoHigh=true; }
  else if(echoHigh) {
    echoWidth=(uint16_t)(micros()-echoRise);
    echoReady=true; echoActive=false; echoHigh=false;
  }
}

void expireNotes(uint32_t elapsed) {
  for(uint8_t i=0;i<noteCount;i++) {
    Note n=getNote(i);
    if(!outcomes[i] && n.note && elapsed>(uint32_t)n.start+HIT_WINDOW_MS) {
      outcomes[i]=2; ++judged; combo=0; emit(MISS,0,i,n.note);
    }
  }
}
void playEvent(uint8_t actual) {
  // 发声只看实测音高，谱面永远不会调用 tone。
  soundBuzzer(actual,BEEP_MS);
  emit(TRIGGER,actual);
  uint32_t elapsed=millis()-playAt;
  expireNotes(elapsed);
  int16_t nearest=-1; uint16_t best=HIT_WINDOW_MS+1;
  for(uint8_t i=0;i<noteCount;i++) {
    Note n=getNote(i);
    if(outcomes[i] || !n.note) continue;
    int32_t delta=(int32_t)elapsed-n.start;
    uint32_t diff=delta<0?-delta:delta;
    if(diff<=HIT_WINDOW_MS && diff<best) { best=diff; nearest=i; }
  }
  if(nearest<0) { combo=0; emit(WRONG,actual); return; }
  Note n=getNote(nearest); ++judged;
  if(n.note==actual) {
    outcomes[nearest]=1; score+=POINTS_PER_HIT; ++combo;
    flashNote=actual; flashAt=millis(); emit(HIT,actual,nearest,n.note);
  } else {
    outcomes[nearest]=2; combo=0; emit(MISS,actual,nearest,n.note);
  }
}
void acceptDistance(int16_t mm) {
  distanceMm=mm;
  int8_t detected=0;
  // 已确认音区保留 2mm 边界迟滞。无效回波不伪造为旧距离。
  if(mm>=0 && currentNote &&
     mm>=(int16_t)KEY_EDGES_MM[currentNote-1]-HYSTERESIS_MM &&
     mm<(int16_t)KEY_EDGES_MM[currentNote]+HYSTERESIS_MM) detected=currentNote;
  else if(mm>=KEY_EDGES_MM[0] && mm<KEY_EDGES_MM[8]) {
    for(uint8_t i=0;i<8;i++) if(mm>=KEY_EDGES_MM[i] && mm<KEY_EDGES_MM[i+1]) detected=i+1;
  }
  // 连续一致样本是时间滤波；不再叠加三点中值以免额外拖慢窄键识别。
  if(detected!=candidate) { candidate=detected; candidateCount=1; }
  else if(candidateCount<STABLE_SAMPLES) ++candidateCount;
  if(candidateCount<STABLE_SAMPLES) return;
  uint32_t now=millis();
  if(detected==0) {
    currentNote=0;
    if(!releasing) { releasing=true; releaseAt=now; }
    if(now-releaseAt>=RELEASE_MS) armed=true;
    return;
  }
  releasing=false;
  bool changed=detected!=currentNote;
  currentNote=detected;
  if(phase==PLAYING && (changed || armed) && now-lastTriggerAt>=NOTE_GAP_MS) {
    armed=false; lastTriggerAt=now; playEvent(detected);
  }
}
void ultrasoundTask() {
  uint32_t now=millis(); bool ready; uint16_t width;
  noInterrupts(); ready=echoReady; width=echoWidth; echoReady=false; interrupts();
  if(ready) {
    int32_t mm=((uint32_t)width*10UL/58UL)*DISTANCE_SCALE_PERMILLE/1000L+DISTANCE_OFFSET_MM;
    lastEchoUs=width;
    if(mm>=VALID_MIN_MM && mm<=VALID_MAX_MM) { if(validEchoes<65535) ++validEchoes; acceptDistance(mm); }
    else { if(invalidEchoes<65535) ++invalidEchoes; acceptDistance(-1); }
  } else if(echoActive && micros()-pingAtUs>=ECHO_TIMEOUT_US) {
    noInterrupts(); echoActive=false; echoHigh=false; interrupts(); lastEchoUs=0; if(invalidEchoes<65535) ++invalidEchoes; acceptDistance(-1);
  }
  if(!echoActive && now-lastPing>=PING_INTERVAL_MS) {
    lastPing=now; pingAtUs=micros();
    noInterrupts(); echoHigh=false; echoActive=true; interrupts();
    digitalWrite(TRIG_PIN,HIGH); delayMicroseconds(12); digitalWrite(TRIG_PIN,LOW);
  }
}

uint16_t soundMin=1023,soundMax=0,noiseSamples=0,capturePeak=0;
uint16_t noisePeak=0, topLevels[3]={0,0,0};
uint32_t soundWindowAt=0, noiseSum=0, quietAt=0, calibrationAt=0;
int32_t baselineQ8=0;
uint8_t loudWindows=0;
bool calibrated=false,quietRunning=false,soundArmed=false;
void resetSound() {
  soundMin=1023; soundMax=0; soundWindowAt=millis(); calibrationAt=millis();
  noiseSum=0; noiseSamples=0; noisePeak=0; noiseBase=0; baselineQ8=0;
  calibrated=false; quietRunning=false; soundArmed=false;
  loudWindows=0; capturePeak=0; soundPp=0; relativeSound=0; soundFlags=0;
  memset(topLevels,0,sizeof(topLevels));
}
void captureLevel(uint16_t level) {
  // 三个最强窗口的平均值，避免一个尖峰直接把选歌推到第三首。
  for(uint8_t i=0;i<3;i++) if(level>topLevels[i]) {
    for(uint8_t j=2;j>i;j--) topLevels[j]=topLevels[j-1];
    topLevels[i]=level; break;
  }
  capturePeak=((uint32_t)topLevels[0]+topLevels[1]+topLevels[2])/3;
}
void soundTask() {
  soundRaw=analogRead(SOUND_PIN);
  soundMin=min(soundMin,soundRaw); soundMax=max(soundMax,soundRaw);
  uint32_t now=millis(); if(now-soundWindowAt<SOUND_WINDOW_MS) return;
  soundWindowAt=now; soundLow=soundMin; soundHigh=soundMax;
  soundPp=soundMax-soundMin; soundMin=1023; soundMax=0;
  bool rail=soundHigh<=2 || soundLow>=1021;
  if(!calibrated) {
    noiseSum+=soundPp; ++noiseSamples; noisePeak=max(noisePeak,soundPp);
    if(now-calibrationAt>=NOISE_CAL_MS && noiseSamples) {
      noiseBase=noiseSum/noiseSamples; baselineQ8=(int32_t)noiseBase*256;
      uint16_t jitter=noisePeak>noiseBase?(noisePeak-noiseBase)/2:0;
      triggerLevel=SOUND_LIGHT+min(SOUND_NOISE_MARGIN_MAX,jitter);
      mediumLevel=max(SOUND_MEDIUM,(uint16_t)(triggerLevel+8));
      loudLevel=max(SOUND_LOUD,(uint16_t)(mediumLevel+12)); calibrated=true;
    }
  }
  relativeSound=soundPp>noiseBase?soundPp-noiseBase:0;
  if(phase==LISTENING) captureLevel(relativeSound);
  if(calibrated && phase==WAITING) {
    // 安静门限为触发门限的 75%，比旧版 50% 容易重新武装。
    bool quiet=relativeSound<max((uint16_t)2,(uint16_t)(triggerLevel*3/4));
    if(quiet && !rail) {
      if(!quietRunning) { quietRunning=true; quietAt=now; }
      if(now-quietAt>=QUIET_REARM_MS && now-phaseAt>=SOUND_COOLDOWN_MS) soundArmed=true;
      // Q8 基线保存小数，修复原整数递推反复向下取整造成的基线漂移。
      baselineQ8+=((int32_t)soundPp*256-baselineQ8)/64;
      noiseBase=(baselineQ8+128)/256;
    } else quietRunning=false;
    if(rail) { soundArmed=false; loudWindows=0; }
    else if(soundArmed) {
      if(relativeSound>=triggerLevel) ++loudWindows; else loudWindows=0;
      if(loudWindows>=SOUND_TRIGGER_WINDOWS) {
        soundArmed=false; memset(topLevels,0,sizeof(topLevels)); captureLevel(relativeSound);
        setPhase(LISTENING); emit(DIAGNOSTIC,0,15);
      }
    }
  }
  soundFlags=(calibrated?1:0)|(soundArmed?2:0)|(phase==LISTENING?4:0)|(rail?8:0);
}
void pixel(uint8_t row,uint8_t col) {
  if(!matrixReady || row>=8 || col>=32) return;
  matrix.setPoint(MIRROR_Y?7-row:row,MIRROR_X?31-col:col,true);
}
void lane(uint8_t row,uint8_t note,bool wide=false) {
  if(note<1 || note>8 || row>=8) return;
  uint8_t x=(note-1)*4;
  for(uint8_t c=wide?0:1;c<(wide?4:3);c++) pixel(row,x+c);
}
void displayTask() {
  uint32_t now=millis(); if(now-lastFrame<FRAME_MS) return; lastFrame=now;
  if(!matrixReady) return;
  matrix.control(MD_MAX72XX::UPDATE,MD_MAX72XX::OFF); matrix.clear();
  if(phase==CHECKING) drawCheck(now-checkAt);
  else if(phase==PLAYING) {
    uint32_t elapsed=now-playAt;
    for(uint8_t k=1;k<=8;k++) pixel(6,(k-1)*4); // 稀疏判定线
    for(uint8_t i=0;i<noteCount;i++) {
      Note n=getNote(i); if(!n.note || outcomes[i]) continue;
      int32_t remaining=(int32_t)n.start-(int32_t)elapsed;
      if(remaining>(int32_t)FALL_MS || remaining<-(int32_t)HIT_WINDOW_MS) continue;
      uint8_t row=remaining<=0?6:(uint32_t)(FALL_MS-remaining)*6/FALL_MS;
      lane(row,n.note);
    }
    for(uint8_t c=0;c<min((uint16_t)32,combo);c++) pixel(7,c);
    if(flashNote && now-flashAt<FLASH_MS && ((now-flashAt)/60)%2==0) {
      lane(6,flashNote,true); lane(7,flashNote,true);
    }
  } else if(phase==SELECTED) {
    uint8_t count=3-min((uint32_t)2,(now-phaseAt)*3/COUNTDOWN_MS);
    for(uint8_t i=0;i<count;i++) lane(3,i*2+2,true);
  } else if(phase==FINISHING) {
    for(uint8_t c=0;c<min((uint16_t)32,(uint16_t)(score/POINTS_PER_HIT));c++) pixel(7,c);
  } else {
    uint8_t level=min((uint16_t)8,(uint16_t)(relativeSound/25));
    for(uint8_t k=1;k<=level;k++) lane(7,k,true);
    if(calibrated && (now/500)%2) pixel(6,15);
  }
  matrix.control(MD_MAX72XX::UPDATE,MD_MAX72XX::ON);
}
void startPlay() {
  memset(outcomes,0,sizeof(outcomes)); score=0; combo=0; judged=0;
  noteCount=songId==1?SONG1_COUNT:(songId==2?SONG2_COUNT:SONG3_COUNT);
  songDuration=songId==1?SONG1_DURATION:(songId==2?SONG2_DURATION:SONG3_DURATION);
  currentNote=0; candidate=0; candidateCount=0; armed=true; releasing=false;
  distanceMm=-1; flashNote=0; lastTriggerAt=millis()-NOTE_GAP_MS;
  noInterrupts(); echoActive=false; echoReady=false; interrupts();
  playAt=millis(); setPhase(PLAYING);
}
#include "HardwareCheck.h"
void setup() {
  pinMode(TRIG_PIN,OUTPUT); digitalWrite(TRIG_PIN,LOW); pinMode(ECHO_PIN,INPUT);
  // 先写入不触发电平再设 OUTPUT，避免低电平模块上电被一直使能。
  digitalWrite(BUZZER_PIN,BUZZER_ACTIVE_LOW?HIGH:LOW); pinMode(BUZZER_PIN,OUTPUT);
  Serial.begin(SERIAL_BAUD); matrixReady=matrix.begin();
  if(matrixReady) resetMatrix();
  PCMSK0|=_BV(PCINT1); PCICR|=_BV(PCIE0);
  resetSound(); setPhase(CHECKING);
}
void loop() {
  serialTask(); buzzerTask();
  ultrasoundTask(); // 综合检查、等待及演奏全程读数；只有 PLAYING 才计分发音
  if(phase==CHECKING || phase==WAITING || phase==LISTENING) soundTask();
  uint32_t now=millis();
  if(phase==CHECKING) diagnosticTask();
  else if(phase==LISTENING && now-phaseAt>=SOUND_CAPTURE_MS) {
    songId=capturePeak>=loudLevel?3:(capturePeak>=mediumLevel?2:1);
    score=0; combo=0; setPhase(SELECTED); emit(SONG);
  } else if(phase==SELECTED && now-phaseAt>=COUNTDOWN_MS) startPlay();
  else if(phase==PLAYING) {
    expireNotes(now-playAt);
    if(now-playAt>=(uint32_t)FALL_MS+songDuration+HIT_WINDOW_MS) {
      stopBuzzer(); setPhase(FINISHING); emit(END);
    }
  } else if(phase==FINISHING && now-phaseAt>=FINISH_MS) {
    songId=0; resetSound(); setPhase(WAITING);
  }
  static uint32_t telemetryAt=0,distanceAt=0;
  if(now-telemetryAt>=SOUND_TELEMETRY_MS) {
    telemetryAt=now;
    if(qHead==qTail) emit(phase==CHECKING||phase==WAITING||phase==LISTENING?SOUND:STATUS);
  }
  if(now-distanceAt>=DISTANCE_REPORT_MS) {
    distanceAt=now; emit(DISTANCE); // 与声音遥测同周期也必须发送，避免一直被 SOUND 抢占
  }
  displayTask(); serialTask();
}
