# 现场对接清单

- [ ] 组员提供最新完整工程，原样放入 arduino/，标明版本；确认 D6/D7、交通灯 D3/D4/D5。
- [ ] 提供串口原始日志：开机、校准、sound、song、PLAYING、同音连续两次 trigger、命中、提前、错误、无人操作漏音、end。
- [ ] 确认 baud、UTF-8、换行、song 1~3、actual 1~8；评分允许负值时使用有符号类型。
- [ ] 确认只用 trigger 表示真实发声，DISTANCE、hit.actual 和 miss.actual 不重复发音。
- [ ] end 增加最终 score 与 bestCombo，推荐增加 runId、seq、触发与判定关联 id。
- [ ] 确认固件自动开始还是等待网页 start；如等待，需要实际实现命令接收与 PLAYING 回执，随后才设置 config.startCommand。
- [ ] 关闭 Arduino IDE 串口监视器/绘图器；Chrome/Edge 中选择 UNO COM。文件页面串口受限制时，双击 Start Hardware.cmd，使用打印的 Local 地址，无需 npm。
- [ ] 实测错误音仍发实际音；漏音不发声；连打同音两次均发声；Score/Combo 与实体日志一致。
- [ ] 拔 USB 后页面不崩溃；重新 Connect 后由固件状态恢复。UNO 开串口可能复位，需要等其检查/校准。
- [ ] 验证 RESULT 保持可读、Return 与 10 秒自动返回；下一位观众无旧音和旧成绩。
- [ ] 确认扬声器未静音；Audio ready，必要时 Enable sound；浏览器可能在后台暂停音频，展示时保持前台。
- [ ] 向老师确认点阵和交通灯是否满足“不同实体输出类型”；完成 5 分钟彩排。

已完成软件验证不代替上述硬件验收；真实设备和最终固件输出尚未取得。
