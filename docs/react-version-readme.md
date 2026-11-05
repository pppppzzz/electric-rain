# Electric Rain｜雨夜记事本

声音选择歌曲，超声波触发实际钢琴音高，Arduino 点阵出谱与判分，网页留下像素雨和涟漪。网页已可本地运行，真实硬件联调待完成。网页不自动演奏、不计算成绩。

## 启动网站

安装 Node.js 22.18+ 或 24 LTS，在 PowerShell 执行：

```powershell
cd C:\Users\29005\Desktop\code\1106piano\web
npm ci
npm run dev
```

Windows Chrome/Edge 打开终端地址，默认 http://127.0.0.1:5173/ 。不要双击 index.html。可 F11 全屏。主窗口保持 16:9，优先电脑横屏。服务器仅监听本机，项目复制到其他电脑后使用实际路径执行上述命令。

```powershell
npm test
npm run build
npm run preview
```

preview 默认 http://127.0.0.1:4173/ 。构建输出 web/dist/。不需要后端、外部图片、音频服务或云部署。

## 模拟模式

打开 http://127.0.0.1:5173/?dev=1 ，点击 Use simulation 解锁音频；在 Demo track 选择歌曲，点击 Run full demo。

约 1 秒声音输入 → 3.6 秒唱片选歌 → 实际触发、同音重复、命中、提前、漏音 → 第 15 秒结算 → 10 秒自动返回。可重复测试三首歌。C4~C5 按钮测试八音，Sound 滑杆驱动输入波形，hit/early/miss 检查视觉，End 立即结算，Reset 清场。独立 End 没有成绩时，未知值保持破折号。

正式 URL 没有 Developer 入口。?dev=1 是展览隐藏方式而非安全机制。模拟模式明确标注 SIMULATION / DEMO DATA。连接真实硬件时会清理模拟计时器和成绩；连接中禁止切回模拟。网页没有把模拟数据混入真实成绩。

## 连接 Arduino

1. 数据 USB 线连接 UNO，确认组员上传的是匹配最新接线的程序；本次没有改写或上传固件。
2. 关闭 Arduino IDE 串口监视器、绘图器和占用 COM 的软件。不能与网页同时打开同一端口。
3. Windows Chrome/Edge 访问 localhost，点击 Connect，在浏览器选择 UNO 对应 COM；该点击同时解锁音频。
4. ARDUINO CONNECTED 表示端口已打开，可能导致 UNO 复位；等待真实开机检查和校准。Arduino song 决定歌曲，PLAYING 到来立即对齐演奏。
5. trigger.actual 播放实际音，即使后续判错也不会改成目标音；漏音不发声。Score/Combo 只显示硬件提供的数值。结束只依赖 end。
6. 无声时检查系统音量并点击 Enable sound。拔线显示 Disconnected，可再次 Connect；重连清理旧会话，等待固件状态快照。

若 Web Serial 不可用，页面显示提示，请换 Chrome/Edge 的 localhost 页面。嵌入式预览是否支持串口不能作为实机浏览器结论。

## 尚待确认的协议与硬件

用户尚未提供组员最终程序及其串口格式。输入接口已实现 UTF-8 换行 JSON，支持分包、多行、坏行日志、有限去重、重连和幂等结算。波特率、字段别名与可选开始命令在 web/src/serial/config.ts，转换在 protocol.ts；详见 shared/serial-protocol.md。

根目录现有 ElectricRain/ElectricRain.ino 静态检查可见：115200，sound/song/state/trigger/hit/miss/wrong/end/status，另有大写 SOUND 诊断，约 2400ms 自行开始。网页已兼容这些代码中的格式，但没有实机接收验证。该程序没有 start 接收、独立 early 和 bestCombo，网页不会假装它们已存在：startCommand 默认 null，最高连击缺失显示破折号。最终程序可能不同，需用原始串口日志确认。

**历史固件与最新接线冲突：** 当前旧工程是 HC-SR04 D8/D9 和 D12 蜂鸣器，不是 D6/D7 + 交通灯 D3/D4/D5。不要把旧程序当作最新接线版本上传。请组员提供对应工程，原样放入 arduino/。网页不能直接设置物理引脚，真实双向开始控制尚待固件配合。

## 实际功能

- Waiting、Song Select、Playing、Result 四阶段；真实状态可以抢占选歌动画。
- 可编辑旧系统窗口、纸纹、扫描纹、伞线稿、CD 变速旋转与三曲扫描。
- 480×236 逻辑 Canvas 像素雨、不同音高的非固定横向落点、雨滴破碎、椭圆涟漪、连击平滑改变雨势和倒影。
- Web Audio 合成八个衰减钢琴单音，同音重新触发，无背景伴奏；当前为合成钢琴近似而非采样真钢琴。音量不受选歌声音影响。
- 外部成绩显示，保留负分和未知字段，真实 end 结算，Return/10 秒自动清场。
- 正式页面无琴键、八轨、交通灯、判定文字；测试琴键仅在开发控制台。

## 文件结构与保留资料

```text
references/                  四张原始参考图，未覆盖
web/src/App.tsx              主界面、事件协调、模式隔离
web/src/components/          旧窗口标题栏
web/src/pages/               CD 选歌
web/src/animations/          Canvas 雨水
web/src/audio/               八音合成器
web/src/serial/              配置、解析、传输、会话状态
web/src/data/                曲目与八音名称
web/src/styles/              窗口、纸张、唱片、纹理
web/public/assets/           六类独立素材预留目录，当前用程序绘制
web/tests/                   核心通信与状态回归测试
arduino/                     最新组员完整工程接收区
shared/                      serial-protocol.md、songs.md
docs/                       接线、流程、课程核对、汇报与对接检查
ElectricRain/                原历史工程，原样保留
```

原 README 备份为 docs/firmware-original-readme.md（含旧接线，仅作追溯）。根目录旧 1106piano.ino、generate_songs.py、songs.md、verification.md、compile.log、.tools/、.build/ 均保留，没有删除用途不明资料或破坏 Arduino 相对路径。node_modules、dist、构建缓存加入 gitignore；复制源码交付时排除这些可再生目录，执行 npm ci/build 即可重建。

## 课程与汇报

输入为声音和超声波两种传感器。点阵与交通灯是两个实体模块，但都属 LED，需向老师确认是否认可为不同输出类型，不能声称所有要求已完全符合。真实串口、时序和双向指令需现场验收。

请按 docs/integration-checklist.md 收集最终日志，确认 actual、score、combo、bestCombo、独立 early 事件、开局模式和开始回执。五分钟提纲见 docs/presentation-outline.md，本次不制作 PPT。
