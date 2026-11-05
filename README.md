# Electric Rain｜雨夜记事本

**原创署名：Electric Rain 项目组。** © 2026。完整源码继续公开；不得删除署名、冒充原创，或将项目/原创部分作为本人或其他团队的作业、参赛作品或独立开发成果提交。引用需保留来源并说明自己的修改；第三方内容按各自权利和许可处理。详见 [原创署名与使用声明](COPYRIGHT.md)。该声明不承诺技术上阻止复制，也不取消 GitHub 服务条款允许的查看和 Fork。

## 直接打开 HTML

在项目文件夹中，**双击根目录 index.html**，用 Chrome 或 Edge 打开即可。离线展示与模拟不需要 npm、Node.js、安装依赖、服务器或网络。

复制到其他电脑时，保留 `index.html` 和 `web/native/` 的相对位置，不能只复制 HTML 一个文件。不要打开 `web/index.html`，那是保留备查的旧 React 入口；新入口与本 README 同级。

页面底部“接线与代码”进入 project.html，提供当前 Config.h 对应的接线表、连接步骤和 Arduino/网页源代码入口，中英文均支持。复制离线项目时同时保留 project.html。源代码当前在公开仓库中可见，展示入口不会限制 GitHub 上的访问。

## 中英文与计分

本次访问最高分已加入封面、计分区与结算：只记录本标签页已完成演奏的最高最终成绩，普通刷新保留，换歌/返回不清空；模拟与真实记录分开。不是跨设备排行榜。仓库：https://github.com/pppppzzz/electric-rain 。GitHub Pages 自动部署配置和说明见 docs/github-pages.md，main 分支新提交会触发发布，结果见 Actions。

页面默认中文，右上角 English / 中文 按钮切换整套界面、曲名和提示，浏览器允许存储时记住语言。切换语言不清空分数、不重开歌曲、不重连串口。

按最新规则：初始 0 分、最低 0 分；绿灯 +3，黄灯 -1，红灯 -1。命中连击 +1，黄/红中断连击，结算保留最终分数与最高连击。现有文本固件只判定灯色，因此网页根据收到的真实判定累计分数，不重新计算命中时机。

## 模拟操作

1. 双击 `index.html`，看到雨夜记事本封面。
2. 在网页中按 **Ctrl + Shift + D** 展开测试控制台；再次按下或 Escape 可收起。
3. 点击 **使用模拟模式 / Use simulation**，同时解锁音频。
4. 在 Demo track 中选择三首歌曲之一，点击 **运行完整模拟 / Run full demo**。
5. 约 1 秒声音输入 → 3.6 秒唱片选歌 → 实际音符、同音重复、命中、提前与漏音 → 第 15 秒结算 → 10 秒自动返回。也可手动 Return。

Preview selection 单独测试选歌；C4~C5 测八音；Sound 滑杆测输入波形；hit/early/miss 测反馈；End 测当前累计成绩的结算；Reset 清理模拟。模拟明确标注 SIMULATION / DEMO DATA，与硬件成绩隔离。正式画面默认隐藏开发按钮。URL 中添加 `?dev=1` 仍可直接展开控制台。

## 真实 Arduino

1. 使用匹配最新接线的固件与 USB 数据线连接 UNO。关闭 Arduino IDE 串口监视器、绘图器和其他占用 COM 的程序。
2. 用 Windows Chrome/Edge 打开 `index.html`，点击 **Connect**，选择 UNO 的 COM。网页按实际 API 能力判断串口是否可用，不承诺所有浏览器的文件页面均支持。
3. 若浏览器限制文件页面的串口，**双击 Start Hardware.cmd**。这是可选后备方式，使用本机 Node.js 内置模块，不需要 npm 或依赖安装；当前电脑已有 Node。其他电脑只有使用此后备方式才需要 Node.js LTS。
4. 脚本会打开默认浏览器并在命令窗口打印 Local 地址，默认 `http://127.0.0.1:5173/`。端口被占用则尝试 5174~5183，以实际打印地址为准。默认浏览器不是 Chrome/Edge 时，将地址复制到 Chrome/Edge。硬件服务器使用期间保持命令窗口打开，Ctrl+C 停止。离线 HTML 不依赖此窗口。
5. 打开串口可能导致 UNO 复位，等待真实检查和校准。连接成功后显示 ARDUINO CONNECTED。断线可重新 Connect；无声时检查扬声器音量并点击 Enable sound。

后备服务器仅监听 127.0.0.1，只提供根 HTML 和原生前端静态资源，不提供其他项目文件。没有部署到云端。

## 实际功能与边界

- 四阶段 WAITING → SONG_SELECT → PLAYING → RESULT → WAITING；真实 PLAYING 立即对齐，不等待选歌动画结束。
- 独立旧系统窗口、纸纹、扫描纹、伞线稿、变速旋转 CD、三曲扫描和设备结果锁定。
- 480×236 逻辑 Canvas 像素雨、演奏水滴、雨滴破碎、椭圆同心涟漪、连击平滑改变雨势与倒影。原参考图未作为整页背景使用。
- Web Audio 合成 C4、D4、E4、F4、G4、A4、B4、C5 八音；是衰减泛音合成近似，不是采样钢琴。每次 trigger.actual 立即播放实测音高，连续同音重新发声；hit/early/miss/wrong 不重复发声，没有背景伴奏。
- Arduino 负责判定；网页仅根据收到的真实绿/黄/红结果累计 +3/-1/-1，不读取谱面重新判定。初始/最低分均为 0。JSON 提供显式成绩时直接显示，不再重复加分；同音实际发声独立于计分。
- 仅真实 end 结算，重复结束锁，Return/10 秒自动清理音频、成绩、模拟计时器与水面。下一位可再次选择同曲。
- 独立串口模块支持 UTF-8 换行 JSON、分包、多行、坏行日志、有限去重、重连与可选开始写入。设置在 `web/native/serial/config.js`，所有协议转换位于 `serial/`。

已收到同学的完整 InteractivePiano v3.2 / 550–700 / early130-late200 工程快照，网页已自动兼容其普通文本输出。看到 Selected 会进入选歌，随后演奏遥测会进入 PLAYING，PRESS 按实际 key 发声，Song finished 进入结算。该固件没有成绩接口，当前网页按真实判定实时累计 Score/Combo/最高连击，并在结束时保留数值；startCommand 默认 null，不向其发送开始指令。真实 COM 联动仍需现场验证，详见 `shared/serial-protocol.md`。

**重新连接步骤：** 关闭 IDE 串口监视器，刷新根 index.html，点击 Connect，选择当前电脑对应 COM。连接后若没有出现校准提示，按一次 UNO 板上的 RESET；安静两秒，之后吹气选歌。实际选歌范围为 550–700 ADC 峰峰值，低于 550 或高于 700 会重试，250ms 强度遥测不代表整次捕获峰值。不要用旧页面缓存或保留的 React 入口测试新适配。

**工程版本：** 历史 `ElectricRain/` 工程使用 D8/D9 与 D12 蜂鸣器。新收到的快照位于 `arduino/InteractivePiano_v3.2_550-700_130-200ms_2026-11-05/`，Config.h 与最新 D6/D7、交通灯 D3/D4/D5 方案一致。原始工程文件哈希已核对，没有修改或上传任何 Arduino 程序；快照与板内版本的一致性和实际接线仍待确认。

## 文件结构

```text
index.html                     双击打开的正式原生 HTML 入口
Start Hardware.cmd             可选硬件本地启动器，无需 npm
web/native/
  app.js                       DOM、控制台、计时、模式操作
  controller.js                事件来源隔离、实际触发音频边界
  data.js                      曲名与八音名称
  i18n.js                      中英文文案和语言偏好
  styles/main.css              独立样式
  animations/rain.js           Canvas 雨水
  audio/piano.js               Web Audio 八音合成
  serial/                      config.js、scoring.js、text-v32.js、protocol.js、session.js、transport.js
  serve.cjs                    可选服务器，仅 Node 内置模块
  tests/native.test.cjs         原生模块回归测试
references/                    四张原始参考图，未改
arduino/                       最新完整固件接收区
ElectricRain/                  历史 Arduino 工程，未改
shared/                        协议、曲目说明
docs/                          接线、流程、汇报、课程核对与验证
web/src/                       原 React/TypeScript 源码，保留备查
web/index.html                 旧 React 入口，新入口不引用
```

原 React 的 package.json、锁文件、源码、测试和 public 资源均保留，新版不引用它们，也不依赖 node_modules/dist。上一版网页说明备份为 `docs/react-version-readme.md`，更早的固件 README 保存在 `docs/firmware-original-readme.md`。根目录其他历史资料没有删除。

原生模块开发检查（可选，普通使用不需要）：

```text
node --test web/native/tests/*.cjs
```

## 课程与验收

两种传感器为声音与超声波。点阵和交通灯虽是两个实体模块，但都属 LED，需向老师确认是否认可为不同输出类型。真实双向控制需组员实现开始命令接收和 PLAYING 回执后，才能配置并启用 startCommand。

五分钟汇报见 `docs/presentation-outline.md`；现场对接见 `docs/integration-checklist.md`；本次验证范围见 `docs/verification-native.md`。没有制作 PPT，没有把模拟通过等同于硬件验收通过。

最新计分边界与双语验证详见 docs/scoring-and-language.md；该更新覆盖早期文档中“分数未知/保留负分”的旧要求。
