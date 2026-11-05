# 串口协议与适配

已取得同学的 InteractivePiano v3.2 / 550–700 / early130-late200 完整源码快照，并核对其串口输出。原样保存于 arduino/，7 个源文件哈希与随包 manifest 一致；未改源码、未上传，板内二进制是否对应此快照仍未核实。另有用户视频中的部分实际串口画面，缺少开机/选歌开头，不能冒充完整原始日志。

## 当前实际文本协议（默认自动兼容）

config.js 的 protocol 默认为 auto，同时支持文本和以下暂定 JSON；设为 json 时只接收 JSON。新 text-v32.js 独立适配普通 ASCII 行，波特率仍为 115200：

| 实际文本 | 网页处理 |
|---|---|
| Keep quiet for 2 seconds: calibrating microphone. | 清理文本轮次，回到等待；结算弹窗保留正常读数时间 |
| Blow strength=N | 0–1023 原始输入幅度按比例驱动波形，网页不据此选曲 |
| Selected: Mo Li Hua / Jingle Bells / Doll and Bear Dance | 映射歌曲 1/2/3，开始选歌画面 |
| Microphone locked... | 仅表示选后倒计时，不冒充已开始 |
| 选歌后首条 Sonar / PRESS / GREEN HIT / RED MISS | 说明固件已进入演奏路径，进入 PLAYING；精确开始时间仍未知 |
| PRESS mm=N key=1..8 | 只按 key 播放实际音；相同 key 的再次 PRESS 正常重播 |
| GREEN HIT event=N | 命中视觉、+3 分、连击 +1；按本轮字符索引去重 |
| YELLOW EARLY/WRONG event=-1 | 中性破碎反馈、-1 分、连击归零；同一次 PRESS 的重复黄灯只计一次 |
| RED MISS event=N | 漏音视觉、-1 分、连击归零，不发声；按本轮字符索引去重 |
| Song finished. Quiet pause, then recalibrate and blow again. | 真实结束，结算显示本轮累计最终分数和最高连击 |

固件的倒计时约 1500ms，但没有明确开始消息。适配器不使用 1500ms 网页计时器猜测开局，优先跟随选歌后的实际演奏遥测，因此选歌动画可提前收起。Sonar 的 target key/stable key 不能代替 PRESS 发声；仅在已知本轮选歌上下文内用于识别演奏路径，不能精确同步谱面时钟。

LED TEST、MATRIX commands sent、BLANK commands sent 会进入诊断上下文，抑制演奏发声。若连接时已在一首歌中间且从未收到 Selected，忽略未确认按键并提示按一次板上 RESET，以获取完整生命周期，避免把诊断 PRESS 当成演奏。断开连接会清空此上下文。

该快照没有 Score/Combo/最高连击接口。按用户最新要求，网页在 serial/scoring.js 中依据收到的灯色判定累计成绩：绿 +3、黄/红 -1，初始/最低均为 0。它是按板端判定累计的网页成绩，不是固件输出的分数，也没有引入网页谱面判定。r 是重新校准，1/2/3 是直接选歌，都不是开始回执；startCommand 继续为 null。真实双向开始控制仍需双方另行约定。当前固件的选歌强度范围已确认是 550–600、601–650、651–700，范围外重试，不能沿用先前代码片段的 800 上限。

## 保留的暂定 JSON 与历史兼容

新版所有转换位于 `web/native/serial/`：config.js 集中波特率（默认 115200）、字段别名、行长度上限和可选开始命令；protocol.js 负责分行与校验；transport.js 负责设备和流；session.js 负责统一事件状态。输入 UTF-8，一行一个 JSON，LF/CRLF 均支持。分包保留尾部，多行依次处理；坏行写开发日志，过长行丢弃到下一换行，未结束行等待下个数据包。断开清空解析缓存与去重记录。原 web/src/serial/ TypeScript 源码仅保留备查，新 HTML 不引用。

| 暂定事件 | 必要字段 | 网页行为 |
|---|---|---|
| sound | sound:number | 只驱动输入波形，不选择歌曲、不调钢琴音量 |
| song | song:1~3 | 接受硬件选歌，播放唱片动画 |
| state / status | phase | 硬件状态同步；PLAYING 立即抢占选歌动画 |
| trigger | actual:1~8 | 立即发出实际音高，新增演奏雨滴 |
| hit | score?, combo? | 完整涟漪，更新提供的数值 |
| early | score?, combo? | 轻微破碎、不完整波纹 |
| miss | score?, combo? | 半空散开，不发声 |
| wrong | score?, combo? | 中性错误破碎；不擅自解释为提前 |
| end | score?, bestCombo? | 幂等结算，缺少字段保留本轮当前累计值 |

示例：
```json
{"event":"sound","sound":45}
{"event":"song","song":2}
{"event":"state","phase":"PLAYING"}
{"event":"trigger","actual":3}
{"event":"hit","score":12,"combo":4}
{"event":"early","score":11,"combo":0}
{"event":"miss","score":10,"combo":0}
{"event":"end","score":18,"bestCombo":8}
```

按最新要求，本轮数值初始为 0，分数低于 0 时显示 0。JSON 显式分数仍直接使用，不另外叠加本地命中奖励；最高连击可取真实上报连击的最大值。网页不读取正确谱面发声，不使用网页曲长结束真实会话。不使用 DISTANCE.note 发声，传感器停留读数不是有效触发。

历史固件：事件大小写混用，统一转小写；SOUND.relative 优先作为强度；SELECTED→SONG_SELECT、LISTENING→WAITING；FINISHING 不能代替 end。它在 STATE SELECTED 后发 song，约 2400ms 自行 startPlay。网页根据真实 PLAYING 立即进入演奏，允许缩短 3.6 秒选歌动画。历史固件 TRIGGER 和 HIT/MISS/WRONG 各发一条，判定事件中的 actual 不再次发声。该程序没有 bestCombo，也没有 Serial.read 命令接收；开始命令默认 null，不发送。STATUS 可恢复当前曲目、分数、连击和 PLAYING 状态。

去重：只有显式 eventId/seq 或带时间戳的完整重复报文会被去重（最多 512 条窗口）；历史 id 是谱面索引，经常 -1，不能当事件唯一标识。同音高不同触发正常重播。没有唯一标识的 trigger 不能安全去重，要求固件保证每次物理触发只发一次。end 另有会话级锁，重复结束不重复结算。

双向扩展：与组员约定明确的 start 请求与 PLAYING 确认、波特率、等待模式、超时/重试策略后，将 config.startCommand 设置为真实命令并包含换行。网页只在选歌动画结束发一次，不轮询或反复发送；等待 PLAYING 或有效 trigger 才开始。默认兼容自动开始固件，不伪造双向控制完成。

建议增加 runId、seq、noteEventId（关联触发和判定）、bestCombo、进度以及重连状态快照。若需要独立的“提前”视觉，固件必须提供 early，不能把现有 wrong 当作提前。最终 JSON 样本到手后在此更新映射并运行 `node --test web/native/tests/*.cjs`。
