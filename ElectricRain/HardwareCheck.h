// 同一固件的自动综合检查。无传感反馈的输出设备一律要求人工观察。
#pragma once
bool buzzerRunning=false;
uint32_t buzzerAt=0;
uint16_t buzzerDuration=0;

void stopBuzzer() {
  noTone(BUZZER_PIN); // AVR noTone 最后会拉低，低触发模块必须恢复 HIGH
  digitalWrite(BUZZER_PIN,BUZZER_ACTIVE_LOW?HIGH:LOW);
  buzzerRunning=false;
}
void buzzerTask() {
  if(buzzerRunning && millis()-buzzerAt>=buzzerDuration) stopBuzzer();
}
void soundBuzzer(uint8_t note,uint16_t duration) {
  if(note<1 || note>8) return;
  stopBuzzer(); buzzerAt=millis(); buzzerDuration=duration; buzzerRunning=true;
  if(BUZZER_MODE==0) {
    // 对真正的无源器件，反相方波仍有相同频率；有源模块可能只有固定载音。
    tone(BUZZER_PIN,pgm_read_word(&frequencies[note-1]));
  } else digitalWrite(BUZZER_PIN,BUZZER_ACTIVE_LOW?LOW:HIGH);
}
void resetMatrix() {
  if(!matrixReady) return;
  matrix.control(MD_MAX72XX::UPDATE,MD_MAX72XX::OFF);
  matrix.control(MD_MAX72XX::TEST,MD_MAX72XX::OFF); // 禁止全亮测试模式
  matrix.control(MD_MAX72XX::DECODE,MD_MAX72XX::OFF);
  matrix.control(MD_MAX72XX::SCANLIMIT,7);
  matrix.control(MD_MAX72XX::INTENSITY,MATRIX_BRIGHTNESS);
  matrix.clear();
  matrix.control(MD_MAX72XX::SHUTDOWN,MD_MAX72XX::OFF);
  matrix.control(MD_MAX72XX::UPDATE,MD_MAX72XX::ON); // 发送清空后的帧
}
void drawCheck(uint32_t elapsed) {
  if(checkStep==1) pixel(3,min((uint32_t)31,elapsed/100));
  else if(checkStep==2) {
    uint8_t col=min((uint32_t)31,elapsed/50);
    for(uint8_t row=0;row<8;row++) pixel(row,col);
  } else if(checkStep==3) {
    uint8_t row=min((uint32_t)7,elapsed/200);
    for(uint8_t col=0;col<32;col++) pixel(row,col);
  } else if(checkStep==4) {
    // 依次标出八轨两列中心线；每四列一个音区，永远不填满整屏。
    uint8_t note=min((uint32_t)7,elapsed/200)+1;
    for(uint8_t row=0;row<8;row++) lane(row,note);
    for(uint8_t k=1;k<=8;k++) pixel(7,(k-1)*4);
  }
  // 其余步骤维持清屏，以便专注声音、距离反馈。
}
void formatDiagnostic(int16_t code,uint32_t t) {
  const char *mod=PSTR("CHECK"), *msg=PSTR("observe_hardware_no_feedback");
  switch(code) {
    case 0: mod=PSTR("MATRIX"); msg=PSTR("clear; FC16_HW hardware_SPI D11/D10/D13; brightness=0; observe_not_verified"); break;
    case 1: mod=PSTR("MATRIX"); msg=PSTR("one_moving_dot left_to_right; observe_not_verified"); break;
    case 2: mod=PSTR("MATRIX"); msg=PSTR("one_column_at_a_time; observe_not_verified"); break;
    case 3: mod=PSTR("MATRIX"); msg=PSTR("one_row_at_a_time; observe_not_verified"); break;
    case 4: mod=PSTR("MATRIX"); msg=PSTR("eight_lanes each_4_columns; observe_not_verified"); break;
    case 5: mod=PSTR("MATRIX"); msg=PSTR("clear_again; must_be_dark; no_SPI_readback_not_verified"); break;
    case 6: mod=PSTR("BUZZER"); msg=PSTR("DC_enable_450ms_then_idle; listen; fixed_pitch_suggests_active_type"); break;
    case 7: mod=PSTR("BUZZER"); msg=PSTR("attempt_Do_C4_262Hz; listen_not_verified"); break;
    case 8: mod=PSTR("BUZZER"); msg=PSTR("attempt_Mi_E4_330Hz; listen_not_verified"); break;
    case 9: mod=PSTR("BUZZER"); msg=PSTR("attempt_Sol_G4_392Hz; listen_not_verified"); break;
    case 10: mod=PSTR("BUZZER"); msg=PSTR("attempt_high_Do_C5_523Hz; listen_not_verified"); break;
    case 11: mod=PSTR("SOUND"); msg=PSTR("keep_quiet_2.5s; recalibrate_after_buzzer; ADC_is_not_microphone_health_proof"); break;
    case 12: mod=PSTR("SOUND"); msg=PSTR("speak_or_blow_for_5s; inspect_ADC_pp_relative; song_selection_disabled_during_check"); break;
    case 13: mod=PSTR("CHECK"); msg=PSTR("complete_commands_only; inspect_SOUND_DISTANCE; MATRIX_BUZZER_require_observation; entering_WAITING"); break;
    case 14: mod=PSTR("MATRIX"); msg=PSTR("library_RAM_allocation_failed; display_disabled; other_modules_continue"); break;
    case 15: mod=PSTR("SOUND"); msg=PSTR("input_triggered; capture_650ms; volume_selects_song_not_buzzer_loudness"); break;
    case 16: mod=PSTR("BUZZER"); msg=PSTR("MH-FMD_type_unknown; tone_is_attempt_only; active_module_cannot_guarantee_8_pitches; idle_HIGH"); break;
  }
  char module[8], detail[128];
  strcpy_P(module,mod); strncpy_P(detail,msg,sizeof(detail)-1); detail[sizeof(detail)-1]=0;
  txLength=snprintf_P(tx,sizeof(tx),PSTR("{\"v\":1,\"t\":%lu,\"event\":\"diagnostic\",\"module\":\"%s\",\"step\":%d,\"detail\":\"%s\",\"buzzer_mode\":%u,\"active_low\":%u,\"pitch_verified\":false}\n"),
    t,module,code,detail,BUZZER_MODE,BUZZER_ACTIVE_LOW);
}
void diagnosticTask() {
  uint32_t now=millis();
  if(checkStep!=255 && now-checkAt<CHECK_TIMES[checkStep]) return;
  checkStep=checkStep==255?0:checkStep+1; checkAt=now;
  if(checkStep>=sizeof(CHECK_TIMES)/sizeof(CHECK_TIMES[0])) {
    stopBuzzer(); if(matrixReady) resetMatrix();
    emit(DIAGNOSTIC,0,13);
    emit(SOUND); emit(DISTANCE);
    // 保留刚刚安静校准所得基线，不把检查阶段的发声当作选歌。
    loudWindows=0; soundArmed=false; quietRunning=false;
    memset(topLevels,0,sizeof(topLevels)); setPhase(WAITING); return;
  }
  emit(DIAGNOSTIC,0,checkStep);
  if(checkStep==0) {
    if(!matrixReady) emit(DIAGNOSTIC,0,14);
    emit(DIAGNOSTIC,0,16);
  }
  if(checkStep<=5 && matrixReady) resetMatrix();
  if(checkStep==6) {
    stopBuzzer(); buzzerRunning=true; buzzerAt=now; buzzerDuration=DIAG_BEEP_MS;
    digitalWrite(BUZZER_PIN,BUZZER_ACTIVE_LOW?LOW:HIGH);
  }
  if(checkStep>=7 && checkStep<=10) {
    const uint8_t notes[]={1,3,5,8};
    // 诊断无论游戏模式如何，都实际尝试四种方波频率。
    stopBuzzer(); buzzerRunning=true; buzzerAt=now; buzzerDuration=DIAG_BEEP_MS;
    tone(BUZZER_PIN,pgm_read_word(&frequencies[notes[checkStep-7]-1]));
  }
  if(checkStep==11) { stopBuzzer(); resetSound(); }
}
