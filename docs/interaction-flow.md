# 交互流程

WAITING → SONG_SELECT → PLAYING → RESULT → WAITING。

等待：稀疏 Canvas 像素雨、底部积水、纸纹与闪烁输入光标；只有 sound 事件改变传感器波形。

选歌：Arduino song 决定结果；CD 加速、快速扫描、减速、停留，默认 3.6 秒。真实 PLAYING 或 trigger 优先，立即收起选歌。自动开始固件不发送命令；等待开始固件需先配置经过确认的 startCommand。

演奏：trigger.actual 立即发声。同音重触发创建新声部。HIT/early/wrong/MISS 只控制雨水反馈与外部数值。Canvas 480×236 逻辑画布清晰缩放，背景、窗口、纸张、唱片、雨滴和椭圆波纹均独立绘制。Combo 平滑改变雨密度与倒影；没有轨道、琴键、交通灯、判定文字或伴奏。网页不知道目标旋律。

结果：仅真实 end 结算，停止新增演奏雨滴，现有雨滴继续，雨势减弱；10 秒或 Return 返回。返回清空声部、模拟定时器、成绩、视觉事件与上一轮水面。结算期间忽略旧 STATUS/STATE，避免历史固件约 1.8 秒自动 WAITING 抹掉结算。下一首 song 可开始新会话。

新版双击根目录 index.html 即可打开。正式画面默认没有测试控制；Ctrl + Shift + D 展开/收起开发控制台，?dev=1 也可直接展开。切到 Simulation 后测试三首曲名、八音、声音输入、命中/提前/漏音、结束或完整脚本。模拟分数是写死的测试夹具，明确标注 DEMO DATA，与真实事件入口隔离。串口若受文件页面限制，可用 Start Hardware.cmd 启动不依赖 npm 的本地访问。
