# 原生 HTML 验证

后续已增加 +3/-1/-1 实时计分和中英文切换，最新 19 项测试及浏览器验证见 scoring-and-language.md。下文保留早期“无成绩接口时显示未知”的历史检查记录。

本次新入口为根目录 index.html，运行时只有相对路径的经典 JavaScript 脚本和 CSS，没有 ES module、fetch、CDN、React、Vite 或 node_modules 依赖。原 React 源码仍保留，旧验证记录见 verification-web.md。

## 已验证

- `node --test web/native/tests/native.test.cjs`：10 项通过。覆盖资源存在/相对路径、分包/CRLF/坏行/超长行恢复、重复报文与同音连续触发、实际音高和判定分离、模拟/硬件隔离、三首曲名、外部状态优先、负分、幂等结束、同曲新会话、UTF-8 流重连、开始命令默认关闭、串口不支持提示、八音重触发及声部清理。
- 原生脚本通过 Node 语法检查；后备服务器只用 Node 内置模块，不需要 npm。
- 浏览器实际加载原生 HTML 的本地 HTTP 入口，观察封面、动态像素雨与椭圆涟漪。Ctrl + Shift + D 成功展开控制台，音频解锁显示 ready。
- 后备服务器根页面返回 HTTP 200；对非静态项目文档的访问返回 404。浏览器检查未记录 JavaScript error。
- 完整模拟包含选歌、PLAYING、实际触发、同音、提前、漏音和 end；已观察脚本结束后自动返回 WAITING。手动连续 C4、miss、End、Return 流程可运行，未知最终分数与最高连击保持破折号。

## 验证限制

内置自动化浏览器的安全策略拒绝 file://，仅允许 HTTP/HTTPS，因此没有宣称已自动化实测直接文件打开。未绕过该策略；交互检查使用允许的本地 HTTP。文件兼容已做相对资源完整性与无模块/无网络依赖检查，仍请在 Windows Chrome/Edge 双击根 index.html 完成最终确认。

没有实体 UNO 或最终固件日志参与本次验收；真实 COM 选择、设备拔线重连、点阵/交通灯、串口时序和双向开始命令仍待现场验证。音频测试验证八音触发和上下文就绪，未进行扬声器听辨或延迟测量。
