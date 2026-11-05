#pragma once
#include <Arduino.h>

// 接线配置：修改后须与真实接线一致。
constexpr uint8_t MIC_PIN = A0;
constexpr uint8_t TRIG_PIN = 6;
constexpr uint8_t ECHO_PIN = 7;
constexpr uint8_t RED_PIN = 3;
constexpr uint8_t YELLOW_PIN = 4;
constexpr uint8_t GREEN_PIN = 5;
constexpr uint8_t LED_ON = HIGH; // 常见 GND/R/Y/G 模块；低电平有效模块改 LOW
constexpr uint8_t MATRIX_CS = 10; // DIN=D11，CLK=D13 (UNO 硬件 SPI)
constexpr uint32_t MATRIX_SPI_HZ = 250000; // 降低通信时钟，给杜邦线连接留更多时序余量
constexpr uint16_t MATRIX_REFRESH_CONFIG_MS = 1000;

// 不同厂家点阵方向不同；用串口 t 检查，详见 README。
constexpr bool REVERSE_MODULES = false; // IN 在左侧时，通常 false
// 根据反馈照片取消行列交换，使方块沿屏幕短边向下落。
constexpr bool TRANSPOSE_TILE = false;
constexpr bool FLIP_TILE_X = false;
constexpr bool FLIP_TILE_Y = true;
constexpr uint8_t MATRIX_BRIGHTNESS = 1; // 0..15，初次调试保持低亮度

constexpr uint16_t MIC_WINDOW_MS = 20;
constexpr uint16_t CALIBRATION_MS = 2000;
constexpr uint16_t BLOW_CAPTURE_MS = 1200;
constexpr uint16_t BLOW_TRIGGER = 350; // 独立的吹气启动门限，不是低档范围下限
constexpr uint16_t SONG_MIN = 550;
constexpr uint16_t SONG_MEDIUM = 601;
constexpr uint16_t SONG_LOUD = 651;
constexpr uint16_t SONG_MAX = 700; // 低于 SONG_MIN 或超过此值均提示重新吹气

constexpr uint16_t FIRST_KEY_MM = 30;
constexpr uint16_t KEY_WIDTH_MM = 15;
constexpr uint16_t SONAR_INTERVAL_MS = 65;
constexpr uint8_t KEY_HYSTERESIS_MM = 3; // 已确认琴键在边界外 3 mm 内不跳键
constexpr uint16_t SONAR_FRESH_MS = 160; // 旧距离超过此时长不能自动命中
constexpr uint16_t EARLY_BUFFER_MS = 130; // 仅缓冲稍早的新按下，不接受长期停留自动命中
constexpr uint16_t SONAR_TIMEOUT_US = 12000; // 有效键范围 30..149 mm
constexpr uint16_t FALL_MS = 1400;
constexpr uint16_t COUNTDOWN_MS = 1500;
constexpr uint16_t SCORE_BEAT_MS = 500; // 一个数字或一个空格占一拍
constexpr uint16_t ROUND_PAUSE_MS = 1500; // 结束静音后重新校准并等待吹气
constexpr uint16_t HIT_WINDOW_MS = 380; // 与原动画底部停留时间一致：1200..1580 ms
constexpr uint16_t HIT_LATE_MS = 200; // 消失后追加迟到容错，不改变点阵动画
constexpr uint16_t LIGHT_HOLD_MS = 350;
