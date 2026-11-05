#pragma once
#include "Config.h"
enum Verdict : uint8_t { PENDING, HIT, EARLY, MISSED };

// 保持原下落动画：top=floor(age*7/FALL_MS)，top=6 时已到最底两行。
constexpr uint16_t LANDING_MS = (6UL*FALL_MS+6)/7;
constexpr int8_t songForStrength(uint16_t strength) {
  return strength<SONG_MIN || strength>SONG_MAX ? -1 :
    (strength<SONG_MEDIUM ? 0 : (strength<SONG_LOUD ? 1 : 2));
}
constexpr int8_t keyForDistance(uint16_t mm) {
  return mm<FIRST_KEY_MM || mm>=FIRST_KEY_MM+8*KEY_WIDTH_MM ? -1 :
    (mm-FIRST_KEY_MM)/KEY_WIDTH_MM;
}
constexpr int8_t stableKeyForDistance(uint16_t mm, int8_t previous) {
  return keyForDistance(mm)<0 ? -1 :
    (previous>=0 && previous<8 &&
     mm>=FIRST_KEY_MM+previous*KEY_WIDTH_MM-KEY_HYSTERESIS_MM &&
     mm<FIRST_KEY_MM+(previous+1)*KEY_WIDTH_MM+KEY_HYSTERESIS_MM ? previous : keyForDistance(mm));
}
constexpr bool freshHeldKey(int8_t active, int8_t candidate, uint8_t count, uint8_t releases, uint32_t age) {
  return active>=0 && active==candidate && count>=2 && releases==0 && age<=SONAR_FRESH_MS;
}
constexpr bool inHitWindow(uint32_t elapsed, uint32_t onset) {
  return elapsed>=onset+LANDING_MS && elapsed<=onset+LANDING_MS+HIT_WINDOW_MS+HIT_LATE_MS;
}
constexpr bool inEarlyBuffer(uint32_t elapsed, uint32_t onset) {
  return elapsed>=onset+LANDING_MS-EARLY_BUFFER_MS && elapsed<onset+LANDING_MS;
}
constexpr bool expired(uint32_t elapsed, uint32_t onset) {
  return elapsed>onset+LANDING_MS+HIT_WINDOW_MS+HIT_LATE_MS;
}
// 编译时边界回归检查，实际业务使用的同一组函数。
static_assert(songForStrength(0)==-1 && songForStrength(549)==-1, "Below specified range");
static_assert(songForStrength(550)==0 && songForStrength(600)==0, "Low range");
static_assert(songForStrength(601)==1 && songForStrength(650)==1, "Medium range");
static_assert(songForStrength(651)==2 && songForStrength(700)==2, "High range");
static_assert(songForStrength(701)==-1 && songForStrength(1023)==-1, "Above specified range");
static_assert(keyForDistance(29)==-1 && keyForDistance(30)==0 && keyForDistance(44)==0 && keyForDistance(45)==1, "Distance lower bounds");
static_assert(keyForDistance(149)==7 && keyForDistance(150)==-1, "Distance upper bounds");
static_assert(!inHitWindow(LANDING_MS-1,0) && inHitWindow(LANDING_MS,0), "Landing boundary");
static_assert(inHitWindow(LANDING_MS+HIT_WINDOW_MS+HIT_LATE_MS,0) && !expired(LANDING_MS+HIT_WINDOW_MS+HIT_LATE_MS,0) && expired(LANDING_MS+HIT_WINDOW_MS+HIT_LATE_MS+1,0), "Miss boundary");
static_assert(stableKeyForDistance(46,0)==0 && stableKeyForDistance(48,0)==1, "Upper hysteresis boundary");
static_assert(stableKeyForDistance(42,1)==1 && stableKeyForDistance(41,1)==0, "Lower hysteresis boundary");
static_assert(stableKeyForDistance(29,0)==-1 && stableKeyForDistance(150,7)==-1, "Hysteresis cannot extend keyboard");
static_assert(freshHeldKey(2,2,2,0,SONAR_FRESH_MS) && !freshHeldKey(2,2,2,0,SONAR_FRESH_MS+1), "Reject stale echo");
static_assert(!freshHeldKey(2,2,2,1,0) && !freshHeldKey(2,3,1,0,0), "Reject lost echo and unsettled key");
static_assert(EARLY_BUFFER_MS<LANDING_MS && KEY_HYSTERESIS_MM*2<KEY_WIDTH_MM, "Tolerance must be bounded");
static_assert(!inEarlyBuffer(LANDING_MS-EARLY_BUFFER_MS-1,0) && inEarlyBuffer(LANDING_MS-EARLY_BUFFER_MS,0) && !inEarlyBuffer(LANDING_MS,0), "Early buffer bounds");
