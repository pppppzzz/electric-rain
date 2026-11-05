# 综合检查版验证记录

日期：2026-11-03。以下区分实际编译、机器码软件仿真及实体硬件。

## AVR 编译通过

- Arduino CLI 1.5.2-rc.1；Arduino AVR Boards 1.8.8；MD_MAX72XX 3.5.1；SPI 1.0。
- 目标 `arduino:avr:uno`，真实编译链接退出码0，输出 `.build/ElectricRain.ino.hex`。
- 最终 Flash **19194 / 32256 字节（59%）**；静态 SRAM **1229 / 2048 字节（60%）**，余819字节供运行时堆与栈使用。余量不代表实物测得的最小空闲内存；点阵库另有小型动态缓冲。
- `--warnings all` 只剩MD_MAX72XX的defined宏兼容性/SPI接口提示；首次重建还显示Arduino核心new.cpp的未使用参数警告。项目源码没有新增编译警告，未修改第三方库。
- 最后一次编译记录 `compile.log`，工具依赖 `.tools/`，构建产物 `.build/` 均在本项目内。

复现编译（1106piano目录下）：

```powershell
& .\.tools\arduino-cli.exe --config-file .\.tools\arduino-cli.yaml compile --fqbn arduino:avr:uno --warnings all --build-path .\.build .\ElectricRain
```

## 编译机器码的软件仿真通过

使用本地开发依赖 **avr8js** 运行上述实际HEX，并模拟ATmega328P、Timer0/1/2、ADC、GPIO/PCINT、UART与SPI，模拟时间约120秒。脚本 `.tools/sim/test.cjs`，记录 `.tools/simulation.log`。这不是实体硬件测试，也没有仿真实际声学、反射、多径、供电或LED电路。

已断言：

- 完成13个上电检查步骤，再自动进入WAITING；用模拟轻/中/响ADC输入分别选到歌曲1/2/3；每首结束自动回WAITING。
- 第一首首个Mi进入事件命中+100；继续停在Mi不会命中第二个重复Mi；换入错误Re时输出实际Re触发并将对应Sol目标判为miss。最终三首成绩100/0/0符合输入脚本预期。
- 串口JSON逐行解析成功，事件丢弃数为0；收到60条SOUND、240条DISTANCE，验证同周期发送不会让距离遥测被声音遥测饿死。
- 解析实际SPI事务：单点阶段1点，单列8点，单行32点，八轨步骤最多24点，清屏阶段0点；TEST=0、DECODE=0、INTENSITY=0、SCANLIMIT=7。跨帧传输有短暂中间态，断言按测试步骤稳定时段统计，不等于实际LED观测。
- 仿真结束蜂鸣器I/O D12空闲HIGH。没有据此宣称能听到不同音高，也没有检测模块内部有源/无源。
- 此输入脚本最低SP=1793（ATmega328P SRAM地址），仅代表该仿真覆盖路径，不保证所有未来改动和实物负载的峰值栈。

脚本从 `.tools/sim/` 目录运行：`node test.cjs`。它只读取同一工程的已编译HEX，没有第二份Arduino测试程序。

## 原曲谱保留

Songs.h及三首旋律未修改，分别44/26/72条记录，计分目标44/26/68，均为24秒片段。首次生成时已检查音高范围、正时值和连续起点；来源及需人工复核的节奏细分仍见songs.md。

## 实物验证尚未完成

最新Arduino CLI端口扫描仍为 `detected_ports: []`，未上传。没有确认点阵接收命令、芯片型号/方向、电源、麦克风实际响应、超声波真实精度或蜂鸣器实际音高。矩阵初始化成功只表示库分配内存，不是SPI应答。所有模块均没有被标为实物测试通过。

用户只需上传这一份程序并打开115200串口，按README观察约20.6秒综合检查，再用同一程序直接玩音游。
