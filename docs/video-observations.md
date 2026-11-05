# 用户视频观察与本次适配

此为首次协议适配时的观察记录；后续用户已授权按真实判定累计 +3/-1/-1、最低 0 分，并增加双语，最新行为见 scoring-and-language.md。

输入：65b2de1d4e1ff772809321411053f4d8.mp4，约 15.67 秒，1280×304。通过本地抽帧阅读，没有把屏幕文字冒充原始串口 TXT。

可辨识的保留记录包括（节选，不是完整原始日志）：

```text
PRESS mm=58 key=2
GREEN HIT event=108
PRESS mm=65 key=3
YELLOW EARLY/WRONG event=-1
RED MISS event=115
Song finished. Quiet pause, then recalibrate and blow again.
Keep quiet for 2 seconds: calibrating microphone.
Noise floor=1
Blow now: soft / medium / strong.
```

最后等待画面的 Blow strength 多为 0–11，不能据此认定整次吹气峰值，也没有录到 Selected 开头。视频顶部显示“未连接”，底部 COM3 也标为未连接，因此它展示的是监视器保留内容，不能证明录屏时或当前电脑仍连接该端口。不要将视频中的 COM3 当成本机固定端口。

ZIP 同时提供 Config.h、GameRules.h、Songs.h、主 .ino 和源码协议说明，确认当前版本选歌范围 550–700，自动倒计时 1500ms，没有分数/连击/最高连击和专用开始消息。7 个原始工程文件的 SHA256 与 manifest 一致，按原样保存至 arduino/，没有修改/上传。

网页新增 serial/text-v32.js，在现有分行缓冲之后识别文本生命周期、实际 PRESS、命中/漏音与结束。JSON 兼容保留。无专用开始消息时，等待选歌后的真实演奏遥测再进入 PLAYING，不按网页自设曲长或倒计时伪造硬件状态。合并的 EARLY/WRONG 仅给中性破碎，不武断判为提前。

自动测试现共 13 项通过，包含文本全流程、分包、同音、诊断隔离、判定去重、重连上下文清理与成绩未知。原生脚本语法检查通过。测试输入由源码和可读视频片段构造，属于测试夹具；没有宣称是完整实测日志或真实串口接入验收。

现场只需再核对：刷新根 HTML → 关闭串口监视器 → Connect 正确 COM → 必要时按板上 RESET → 安静校准 → 吹气选歌 → 演奏 → 实际结束。缺失的成绩接口需组员另行提供，网页不补算。
