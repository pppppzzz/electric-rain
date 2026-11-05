# 网页验证记录

此文件记录上一版 React 网页验证；当前双击 HTML 版本见 verification-native.md，入口为根目录 index.html。

验证对象：本次 web/ 源码，非硬件或固件验收。

- Node.js 24.19.0 下 npm install 完成，已生成 package-lock.json；npm run build 的 TypeScript 检查和 Vite 生产构建通过。
- npm test：8 项核心测试通过，覆盖分包/多行/CRLF、坏 JSON、过长行恢复、按唯一标识去重、同音连续触发保留、诊断字段转换、真实状态优先、未知分数、负分、幂等结束与判定不自行计分、结算期间再次选择同曲开始新会话。
- 浏览器本地页面已实际打开；完整 Jasmine Flower 模拟脚本到达 PLAYING 和 RESULT，最终显示测试成绩 0010、x06；后续自动恢复 WAITING。已观察 Canvas 下落雨滴、音符水滴与椭圆波纹，CD 选歌弹窗与模式标识。
- 音频由点击解锁后显示 ready，触发日志与实际事件对应。未进行扬声器听辨或测量端到端延迟，不把音频上下文就绪当作听觉验收。
- 短屏检查后按可用高度约束 16:9 主窗口，底部状态栏可见。未逐一实测所有显示器分辨率。
- 四张 references 原图与 ElectricRain 历史源码保留。旧 README 备份在 firmware-original-readme.md。

未完成的外部验证：真实 UNO COM 连接/拔线重连、最终固件字段、设备判定关联、实测八音听感、交通灯、点阵、双向开始命令与现场同步。具体清单见 integration-checklist.md。
