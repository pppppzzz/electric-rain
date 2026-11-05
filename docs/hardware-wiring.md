# 最新接线与历史差异

| 模块 | UNO R3 |
|---|---|
| HW-484 | VCC 5V，GND，AO A0，DO 不接 |
| HC-SR04 | VCC 5V，GND，Trig D6，Echo D7 |
| MAX7219 8×32 | VCC 5V，GND，DIN D11，CS/LOAD D10，CLK D13 |
| 交通信号灯 | R D3，Y D4，G D5，GND |

这是用户提供的最新接线，不是串口协议。网页不能通过 Web Serial 直接设置物理引脚。

根目录 ElectricRain 历史工程目前写的是 Trig D8、Echo D9、蜂鸣器 D12，没有本次交通灯逻辑。本次没有改动它。请组员提供与最新接线匹配并实测的工程；不要为适配旧程序私自改接线，也不要上传旧程序作为最新展示版。原 README 已备份至 firmware-original-readme.md，其中旧接线仅供历史追溯。
