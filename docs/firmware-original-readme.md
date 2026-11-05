# 《电子雨季》Electric Rain — 综合检查与音游固件

打开 `ElectricRain/ElectricRain.ino`。同目录 `Songs.h` 和 `HardwareCheck.h` 属于同一份固件，Arduino IDE 会一起编译，不需要分别上传。根目录旧 `1106piano.ino` 是空模板，不要上传。原有三首曲目与判定保留，没有网页、按钮或其他独立测试工程。

## 只需这样操作

1. 保持现有接线，用数据 USB 线连接 UNO。Arduino IDE 安装 **Arduino AVR Boards** 和库 **MD_MAX72XX（MajicDesigns）**，选择 **Arduino Uno** 及其 COM 端口。
2. 打开 `ElectricRain/ElectricRain.ino`，上传一次。打开串口监视器设 **115200 baud**；打开串口可能复位，若错过检查可按板载 RESET，不需要再次上传。
3. 上电自动检查约 **20.6 秒**：观察移动单点、单列、单行、八轨位置和清屏；听一次低电平使能短响及 Do/Mi/Sol/高音 Do 四次频率尝试。移动反射片，看 DISTANCE 的 mm/note 是否随实际位置变化。
4. 看到 SOUND 的 `keep_quiet_2.5s` 时保持安静；之后 `speak_or_blow_for_5s` 时说话/轻吹，看 ADC、pp、relative 是否变化。此五秒只诊断，不选歌。
5. 自动进入 WAITING 后，安静约 1 秒，看到 `calibrated:1, armed:1` 再轻声/中声/大声输入。选中歌曲后倒计时，按八轨雨滴弹奏；每曲音乐片段 24 秒，曲终自动回等待。无需拆线或上传多份测试程序。

**没有物理反馈的点阵和蜂鸣器不报告“通过”。** `observe_not_verified` / `listen_not_verified` 表示需要观察实物/听辨；诊断 complete 只表示命令流程结束。若清屏阶段仍全亮，或四次声音相同，软件不能宣布硬件已修好。

## 固定接线与兼容性

| 模块 | 连接 |
|---|---|
| HW-484 声音传感器 | AO → A0，电源按实物规格，GND 共地；DO 不接 |
| HC-SR04 | Trig → D8，Echo → D9，5V，GND |
| MAX7219 四联 8×32 | DIN → D11，CS/LOAD → D10，CLK → D13，5V，GND |
| MH-FMD 三针蜂鸣器 | I/O → D12，VCC 按模块规格，GND 共地 |

引脚没有冲突。MAX7219 单向发送不用 MISO，所以 D12 可作蜂鸣器信号。tone 使用 Timer2，会影响 D3/D11 的 PWM，但本程序 D11 用 SPI，没有 analogWrite。D9 用 ATmega328P 的 PB1/PCINT1 捕获回波边沿，不占用 D2/D3。

四联点阵可能消耗数百 mA，满亮极端情况可超过 1A，取决于限流电阻。若使用独立稳压 5V 电源供点阵，建议容量至少 2A，和 USB 供电的 UNO 共地，不随意并联两路 5V。默认亮度 **0（最低档，不是关闭）**。MAX7219 电源旁建议 470~1000µF，并确认芯片附近有 0.1µF/10µF 去耦。AO 应在 0~5V，不可输入负电压。现有三针模块由 VCC 供电，D12 只作逻辑控制，不将大负载直接挂在 I/O。

## 点阵全亮的处理

程序仍用 **FC16_HW、四片、硬件 SPI、D11/D10/D13**。检查了当前 MD_MAX72XX 实现：硬件 SPI 每次事务使用 8MHz、MODE0，符合 MAX7219 标称接口上限；信号完整性和实际线材仍可能影响通信。库 begin 返回值只检查内存分配，不代表芯片应答。

初始化及测试步骤切换会明确发送 TEST=OFF、DECODE=OFF、SCANLIMIT=7、最低亮度、清空显存并唤醒显示。每帧先 UPDATE=OFF、clear、画当前像素，最后 UPDATE=ON 统一发送。绘图入口检查 row<8、col<32、note=1~8；谱面在 Flash，判定数组按固定容量分配。

检查顺序如下，非测试部分保持清屏：

| step | 内容 | 时长 | 应观察到 |
|---:|---|---:|---|
| 0 | 清屏与配置 | 0.5秒 | 全灭 |
| 1 | 移动单点 | 3.2秒 | 仅一个点横向移动 |
| 2 | 单列扫描 | 1.6秒 | 每次仅一列8点 |
| 3 | 单行扫描 | 1.6秒 | 每次仅一行32点 |
| 4 | 八轨定位 | 1.6秒 | 每四列一轨，依次点亮轨中心及底行标记 |
| 5 | 再清屏 | 0.5秒 | 全灭 |
| 6 | 蜂鸣器使能 | 0.9秒 | 前450ms使能，后450ms关闭 |
| 7~10 | 四种方波频率 | 各0.8秒 | 每次450ms尝试发声，余下静音 |
| 11 | 安静校准 | 2.5秒 | 安静，不选歌 |
| 12 | 声音响应观察 | 5秒 | 发声看读数，不选歌 |

若每片内部方向不对，调整代码顶部 MATRIX_TYPE；整体左右/上下镜像用 MIRROR_X/MIRROR_Y。类型错误通常影响排列，不能直接据此认定是全亮原因。若单点/清屏仍接近全亮，需要检查实际驱动、IN/DIN 端、电源和通信；软件没有 MAX7219 状态回读，也没有视觉反馈，不能自动区分这些原因。

## HW-484 声音选歌

每25ms采样 AO 原始 ADC，计算 max-min（pp），relative=max(0,pp-baseline)。它是相对幅度，**不是 dB，也不是蜂鸣器音量**。HW-484 的 AO 可能变化很小，模块版本和增益不同，不能把型号当作灵敏度保证。旋钮常主要作用于 DO 比较阈值，不保证能放大 AO。

新版默认 LIGHT/MEDIUM/LOUD 为 **6/22/55 ADC计数**。安静校准计算平均峰峰值与噪声波动，LIGHT 加最多12计数噪声余量；中/响阈值保证依次递增，串口显示实际 light/medium/loud。基线采用 Q8 小数递推，避免旧整数递推向下取整导致背景声相对值虚高。连续两窗超出 light 后，捕获650ms内**最强三个窗口的平均相对幅度**，减少单个尖峰误选第三首。

| 捕获幅度 | 曲目 |
|---|---|
| light 至 medium | 1 茉莉花 |
| medium 至 loud | 2 铃儿响叮当 |
| ≥ loud | 3 洋娃娃和小熊跳舞 |

等待状态的安静判据放宽到实际 light 的75%，连续250ms安静且等待阶段至少1秒后武装。不要用超时强制触发来假装麦克风有反应。若整窗ADC≤2或≥1021，则 rail=1，暂停武装；这提示输入贴电源轨，不能单凭它确定接线错误。PLAYING/SELECTED/FINISHING 不采样声音选歌。每曲结束后重新安静校准2秒。

`calibrated=0`：仍在校准；`calibrated=1,armed=0`：需满足安静/冷却，或 rail=1；`armed=1`：可以触发；`triggered=1`：正在 LISTENING。正常诊断结果仍是 `adc_read_not_acoustic_proof`：ADC能读数不等于已经确认麦克风正常。

若说话时 relative 只有2~4，可根据实测下调 SOUND_LIGHT，同时检查安静噪声是否也在此范围。若所有幅度都很高，先观察 pp、baseline、rail，不能仅把“选到歌曲3”当成麦克风正常。包络型AO可能需要按直流偏移而非峰峰值改算法，当前优先针对原始麦克风AO。

## HC-SR04 距离与实际触发

上电检查、等待、倒计时、演奏、结束阶段都保持65ms一次测距，串口每500ms报告。D9引脚变化中断捕获回波，不用 pulseIn。3.5ms超时或超量程记 mm=-1；这覆盖当前琴键范围，超时会限制最远可见距离到约60cm。`echo_us` 显示原始脉宽；`valid_count`/`invalid_count` 是累计计数，饱和后不再递增。

| 音符编号 | 音符 | 初始距离/mm |
|---:|---|---|
| 1 | Do | 30~45 |
| 2 | Re | 45~60 |
| 3 | Mi | 60~75 |
| 4 | Fa | 75~90 |
| 5 | Sol | 90~105 |
| 6 | La | 105~120 |
| 7 | Si | 120~135 |
| 8 | 高音Do | 135~150 |

左闭右开；150mm不在音区。两次一致分类才确认音区，当前键保留左右各2mm迟滞。mm为最新有效/无效读数，note为稳定分类，短暂坏读数可能使 mm=-1 而 note暂留。`echo_seen_accuracy_unverified` 只表示收到有效范围回波，不保证距离准确；`invalid_or_timeout` 表示未得到有效值，音区之外的有效回波仍会显示mm，note=0。

只有PLAYING的新进入事件会发声和判定。保持一个键不会连续命中；同音再弹需移出含迟滞的音区、稳定释放130ms、再进入并确认。建议移出约0.4秒。换到另一个稳定键可直接触发，最短事件间隔150ms；过快切换可能被抑制。不能识别真正敲桌瞬间，扫过中间键也可能发声。

HC-SR04标称近端约2cm、波束约15°，资料建议周期超过60ms。1.5cm宽琴键、手指/细棍、小反射片与桌面多径仍很苛刻；初始3~15cm不是实测成功结论。密集重复音可能跟不上重新触发，不能保证当前谱面满分可达。

## MH-FMD 蜂鸣器的关键限制

**低电平触发描述使能逻辑，不证明内部无源，也不证明能产生八种音高。** 同名模块资料存在差异。综合检查先使能直流450ms，再尝试262/330/392/523Hz四种方波，均由人工听辨。若直流使能时持续固定音、四次频率尝试仍同音或仅断续，可能是内部有源振荡器；MCU无法从单根I/O线读回声学类型。

旧版直接 noTone() 最后会把AVR输出拉低，可能让低触发模块一直使能。新版每次停止都 noTone() 后恢复 HIGH，初始化先写HIGH再配置OUTPUT；发音由 millis 计时停止，不依赖 tone 的自动结束低电平。

代码顶部：

- `BUZZER_ACTIVE_LOW=true`：适配当前低电平模块，空闲HIGH。
- `BUZZER_MODE=0`：默认尝试实际音符对应的tone频率。方波反相不改变无源器件音高；对有源器件不保证八音。
- `BUZZER_MODE=1`：明确仅做固定音开关反馈，仍按实际距离记录音符和判定，但**不能称为八音演奏**。

诊断无论上述模式如何都会尝试四种方波频率，输出 `pitch_verified:false`。若模块实际不能变调，单靠软件不能完成“错Mi就听到Mi”的声学要求；当前代码始终根据实际距离发送频率，没有用谱面正确答案代替玩家发音。

## 音游规则保留

流程 `CHECKING → WAITING → LISTENING → SELECTED → PLAYING → FINISHING → WAITING`。综合检查仅上电/复位运行一次，曲终不重复检查。三首均保留24秒片段，另有倒计时、1.8秒下落前导、判定尾窗和结束展示。

点阵0~5行下落，6行判定线，7行短闪及最多32个连击点。一次进入事件匹配±180ms内最近的一个未判音符，最多判一次：正确+100/Combo+1，错音立即miss并清零；错过窗口超时miss。窗口外额外发音为wrong，清零但不提前消费未来目标。休止不计分、长音只判起点。真实距离的错误音也会触发蜂鸣器，不自动播放标准答案。曲谱详情、来源及需人工复核的节奏见 `songs.md`。

## 串口 JSON

115200、8N1、UTF-8、每行一对象。SOUND和DISTANCE各约2Hz；阶段切换、测试步骤及命中即时入队。不会每个ADC样本刷屏。等待读到换行再解析。

| event / module | 字段及含义 |
|---|---|
| SOUND | adc=当前原始ADC，pp=25ms峰峰值，baseline=基线，relative=相对幅度，light/medium/loud=实际阈值，calibrated/armed/triggered/rail=状态 |
| DISTANCE | mm、note=0~8、echo_us、valid_count、invalid_count、result |
| diagnostic，module=MATRIX/BUZZER/SOUND/CHECK | step、detail为检查内容与需要观察的说明；pitch_verified:false，不是假装通过 |
| state | phase为当前阶段 |
| song | song编号、title中文曲名 |
| trigger | actual为本次实际触发音，note为当前稳定音区 |
| hit / miss / wrong | id为零起始谱面索引，target目标音，actual实际音，score/combo成绩快照 |
| end | 最终score/combo；随后WAITING回到选歌 |
| status | 演奏阶段成绩/状态快照 |

通用游戏行保留v=1、t上电毫秒、sound、baseline、song、title、note、actual、mm、id、target、score、combo、dropped。SOUND与DISTANCE使用独立、清楚的专用字段；大小写按上表。t约49天回绕，id=-1表示无目标。只有游戏行携带dropped队列丢弃计数，正常应为0。SOUND只在CHECKING/WAITING/LISTENING发送，不在演奏中将旧声音值假作新测量。不是音频波形，未来网页只能据此绘制幅度包络。

固定12槽队列、320字节行缓冲，按availableForWrite分批发送，避免串口阻塞；没有String/ArduinoJson动态堆分配。MD_MAX72XX有小型运行时缓冲，编译静态SRAM不含它和峰值栈。

## 参数与排查

所有现场参数在 ino 顶部：MATRIX_TYPE/方向/亮度，KEY_EDGES_MM/距离偏移/比例，HYSTERESIS_MM/STABLE_SAMPLES，测距周期/超时，有效范围，释放/触发间隔，SOUND三级阈值与噪声余量，蜂鸣器模式/极性，判定窗口。修改FALL_MS还须同步生成器LEAD_MS并重新生成，编译会检查两者一致。

| 现象 | 用这一份程序检查 |
|---|---|
| 清屏仍全亮 | MATRIX step0/5，实际芯片、IN端、电源/通信；软件无法保证自动修复 |
| 声音无反应 | SOUND adc是否贴电源轨、pp是否随发声变化、relative与light差距、armed是否为1 |
| 总选第三首 | 安静校准是否有说话、pp与baseline差值、实际loud阈值；噪声不是观众声强 |
| 距离一直-1 | DISTANCE echo_us/invalid_count与反射面、盲区；无需等到PLAYING才有读数 |
| 距离有效但note=0 | 不在30~150mm范围或还未完成两次稳定确认 |
| 同音只响一次 | 防自动连击规则；稳定移出后重新进入 |
| 蜂鸣器一直响/同一种音 | 注意空闲电平与直流/四频率测试结果；内部有源器件可能无法八音 |
| 大量miss | 表示谱面没有收到合格进入事件，不证明任何传感器健康 |
| 点阵闪时复位 | 电源稳定性、共地与去耦；不是谱面软件能验证的项目 |

实际编译及软件仿真范围见 `verification.md`，构建输出 `.build/`，工具依赖 `.tools/`；两者都在1106piano内。未检测到可用COM端口，未上传或声称实物测试通过。

参考：[MD_MAX72XX官方模块说明](https://majicdesigns.github.io/MD_MAX72XX/page_hardware.html)、[MAX7219数据手册](https://www.analog.com/media/en/technical-documentation/data-sheets/MAX7219-MAX7221.pdf)、[HC-SR04资料](https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf)、[麦克风AO/DO模块资料](https://www.ecbazis.hu/pdf/kithw484.pdf)。型号并不能替代实际模块规格。
