#pragma once
#include <Arduino.h>
#include <avr/pgmspace.h>

// User score: one digit = one beat, one space = one silent beat.
// Each newline in the picture is TWO silent beats (two spaces at line end).
// 1..8 = do re mi fa sol la si high-do (C4..C5).
const char JASMINE[] PROGMEM =
  "3 3568865 565  "
  "3 3568865 565  "
  "5 5 5 35665  "
  "3 235 321 121";
const char JINGLE[] PROGMEM =
  "333 333 35123  "
  "444 433 32232  "
  "333 333 35123  "
  "444 433 55321";
const char DOLL_BEAR[] PROGMEM =
  "12345 5 543 4 4 432 1 3 5  "
  "12345 5 543 4 4 432 1 3 1  "
  "6 6 654 5 5 543 4 4 432  "
  "1 3 5  "
  "6 6 654 5 5 543 4 4 432  "
  "1 3 1";
