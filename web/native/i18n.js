/* Offline English/Chinese strings. Changing language never resets an active session. */
(() => {
  'use strict';
  const E = window.ElectricRain;
  const messages = {
    en: {
      appTitle:'Electric Rain — Notepad', resultWindow:'Electric Rain — Result', cdWindow:'CD Player — finding your rain',
      meta:'ER / A SOUND AND WATER STUDY', established:'EST. 2026', file:'File', edit:'Edit', view:'View', help:'Help',
      folio:'FIELD NOTES / No. 001', subtitle:'a little sound, a passing rain.', invitation:'Blow or Speak',
      waiting:'WAITING FOR A SOUND TO BECOME A SONG', demoWaiting:'A SIMULATED RAIN SESSION',
      simulation:'SIMULATION', hardware:'HARDWARE', offline:'HARDWARE · OFFLINE', connected:'ARDUINO CONNECTED',
      connect:'Connect', disconnect:'Disconnect', connecting:'Connecting…', Disconnected:'Disconnected', Connected:'Connected',
      nowPlaying:'NOW PLAYING', awaiting:'Awaiting track', score:'SCORE', combo:'COMBO', finalScore:'FINAL SCORE', bestCombo:'BEST COMBO', track:'TRACK',
      maxScore:'MAX SCORE', scoreProgress:'PROGRESS TO FULL SCORE', pointsRemaining:'POINTS TO GO',
      visitBest:'VISIT BEST',
      projectDetails:'Wiring & Code', projectTitle:'Electric Rain — Wiring & Code', backToRain:'Back to the rain', projectVersion:'UNO R3 / v3.2 / 550–700',
      projectIntro:'Sound chooses a song. Distance triggers piano. The matrix displays the chart; traffic lights report verdicts.',
      wiringTitle:'Wiring', wiringSource:'Based on the supplied Config.h. Disconnect power before wiring. The website receives USB serial events; it does not set physical pins.',
      module:'Module', modulePin:'Module pin', soundSensor:'sound sensor', ultrasonic:'ultrasonic sensor', unused:'Not connected', trafficLights:'Traffic lights',
      powerNote:'All modules share ground. G on the traffic light means Green, not GND; the current configuration is active HIGH. If the matrix has a separate 5V supply, share ground and avoid directly joining it to USB 5V.',
      codeTitle:'Code & Version', codeIntro:'Arduino reads sensors, displays notes and judges the physical lights. The website plays actual notes, draws rain and accumulates scores from real verdicts.',
      arduinoCode:'View complete Arduino project', webCode:'View native website source',
      codeFiles:'Keep the .ino, Config.h, Songs.h and GameRules.h together. Do not copy only the main sketch. This wiring differs from the older ElectricRain folder; use this page and the current Config.h.',
      versionNote:'The original snapshot is preserved. Verify the actual board version and physical wiring. Firmware starts its own countdown; r recalibrates, it is not a start command.',
      connectionTitle:'Connect the website', connectStep1:'Connect UNO with a data USB cable. Close the IDE serial monitor and plotter.',
      connectStep2:'Open the rain page in Windows Chrome/Edge. Click Connect and choose the UNO COM port. Baud rate is 115200.',
      connectStep3:'If needed, press RESET once. Stay quiet for two seconds, then blow to select a song. Captured strengths 550–700 are accepted.',
      ended:'YOUR RAIN HAS ENDED.', return:'Return', returnHint:'RETURNING TO THE RAIN IN A MOMENT', enableAudio:'Enable sound',
      reading:'READING DISC . . .', found:'TRACK FOUND', seeking:'SEEKING . . .', ready:'READY', captured:'CAPTURED SOUND / SELECT TRACK',
      discLabel:'ELECTRIC RAIN', recording:'PERSONAL RECORDING · 01', eightNotes:'8 NOTES · ONE PASSING MOMENT',
      listen:'LISTEN. REACH. LET IT RAIN.', installation:'AN INTERACTIVE PIANO INSTALLATION', demoData:'DEMO DATA',
      WAITING:'WAITING', SONG_SELECT:'SONG SELECT', PLAYING:'PLAYING', RESULT:'RESULT',
      developer:'Developer', console:'Test console', useSimulation:'Use simulation', useHardware:'Use hardware',
      demo:'Run full demo', preview:'Preview selection', hit:'Hit', early:'Early', miss:'Miss', end:'End', reset:'Reset', sound:'Sound',
      audio:'Audio', audioReady:'ready', audioLocked:'locked', startCommand:'Start command', startDisabled:'disabled · firmware controls start',
      shortcut:'Ctrl + Shift + D · toggle test console', closeConsole:'Close developer console', demoTrack:'Demo track',
      dismissError:'Dismiss error', rain:'Animated pixel rain and water ripples', language:'Switch to Chinese',
      errorSerial:'Web Serial is unavailable here. Use Chrome/Edge, or double-click Start Hardware.cmd and open its local address.',
      errorSecurity:'Serial access was blocked. Open in Chrome/Edge; if needed, double-click Start Hardware.cmd.',
      errorCancelled:'No serial device selected. Click Connect and choose your Arduino port.',
    },
    zh: {
      appTitle:'Electric Rain — 雨夜记事本', resultWindow:'Electric Rain — 演奏结算', cdWindow:'CD 播放器 — 寻找你的雨声',
      meta:'ER / 声音与雨水的记录', established:'创作于 2026', file:'文件', edit:'编辑', view:'查看', help:'帮助',
      folio:'雨夜手记 / 第 001 页', subtitle:'一点声音，一场经过的雨。', invitation:'吹气或说话',
      waiting:'等待声音，成为一首歌', demoWaiting:'这是一场模拟的雨',
      simulation:'模拟模式', hardware:'硬件模式', offline:'硬件模式 · 未连接', connected:'ARDUINO 已连接',
      connect:'连接设备', disconnect:'断开连接', connecting:'连接中…', Disconnected:'未连接', Connected:'已连接',
      nowPlaying:'正在演奏', awaiting:'等待曲目', score:'分数', combo:'连击', finalScore:'最终分数', bestCombo:'最高连击', track:'演奏曲目',
      maxScore:'满分', scoreProgress:'距离满分', pointsRemaining:'还差分数',
      visitBest:'本次访问最高分',
      projectDetails:'接线与代码', projectTitle:'Electric Rain — 接线与代码', backToRain:'返回雨夜记事本', projectVersion:'UNO R3 / v3.2 / 550–700',
      projectIntro:'声音选择歌曲，超声波触发钢琴，点阵显示谱面，交通灯给出判定。',
      wiringTitle:'接线方式', wiringSource:'按当前交付工程 Config.h 整理，接线前断开供电；网页通过 USB 串口接收事件，不直接设置物理引脚。',
      module:'模块', modulePin:'模块端口', soundSensor:'声音传感器', ultrasonic:'超声波', unused:'不接', trafficLights:'红黄绿交通灯',
      powerNote:'所有模块共地。交通灯 G 表示绿灯，不是 GND；当前配置为 HIGH 点亮。点阵若使用独立 5V 供电，需共地并避免与 USB 5V 随意并联。',
      codeTitle:'代码与版本', codeIntro:'Arduino 负责传感器、点阵和灯光判定；网页负责实际钢琴声音、雨水视觉，以及按真实判定累计成绩。',
      arduinoCode:'查看 Arduino 完整工程', webCode:'查看原生网页代码',
      codeFiles:'Arduino 工程需同时保留 .ino、Config.h、Songs.h 和 GameRules.h。打开 .ino 时使用同目录的全部文件，不能只复制主程序。接线与旧 ElectricRain 历史工程不同，请以此页和当前 Config.h 为准。',
      versionNote:'原始 Arduino 快照已保留，板内版本与实物接线仍需操作者自行核对。现有固件自动倒计时开始；r 是重新校准，不是开始命令。',
      connectionTitle:'网页连接', connectStep1:'使用数据 USB 线连接 UNO，关闭 IDE 串口监视器和绘图器。',
      connectStep2:'用 Windows Chrome/Edge 打开雨夜记事本，点击连接设备，选择 UNO 对应 COM；波特率为 115200。',
      connectStep3:'必要时按一下板上的 RESET。安静两秒，再吹气选歌；输入峰值 550–700 有效。',
      ended:'你的这场雨，已经结束。', return:'返回', returnHint:'稍后自动回到等待页面', enableAudio:'启用声音',
      reading:'正在读取唱片…', found:'已找到曲目', seeking:'正在寻找…', ready:'准备就绪', captured:'声音已捕捉 / 正在定位曲目',
      discLabel:'电子雨季', recording:'私人录音 · 01', eightNotes:'八个音符 · 一瞬雨声',
      listen:'倾听。伸手。让雨落下。', installation:'声音与雨水的交互钢琴装置', demoData:'模拟数据',
      WAITING:'等待声音', SONG_SELECT:'唱片选歌', PLAYING:'演奏中', RESULT:'演奏结算',
      developer:'开发测试', console:'测试控制台', useSimulation:'使用模拟模式', useHardware:'使用硬件模式',
      demo:'运行完整模拟', preview:'预览唱片选歌', hit:'命中', early:'提前', miss:'漏音', end:'结束', reset:'重置', sound:'声音强度',
      audio:'音频', audioReady:'已启用', audioLocked:'未启用', startCommand:'开始命令', startDisabled:'未启用 · 由固件自行开始',
      shortcut:'Ctrl + Shift + D · 展开/收起测试控制台', closeConsole:'关闭测试控制台', demoTrack:'模拟曲目',
      dismissError:'关闭提示', rain:'动态像素雨与水面涟漪', language:'切换至英文',
      errorSerial:'此环境无法使用串口。请用 Chrome/Edge，或双击 Start Hardware.cmd 后打开其本地地址。',
      errorSecurity:'浏览器阻止了串口访问。请使用 Chrome/Edge；必要时双击 Start Hardware.cmd。',
      errorCancelled:'尚未选择串口设备。请点击“连接设备”，选择 Arduino 对应端口。',
    }
  };
  let lang = 'zh';
  try { const stored = localStorage.getItem('electric-rain-language'); if (stored === 'en' || stored === 'zh') lang = stored; } catch {}
  const I = {
    get language() { return lang; },
    t(key) { return messages[lang][key] ?? key; },
    song(id) { return id ? (lang === 'zh' ? ['茉莉花','铃儿响叮当','洋娃娃和小熊跳舞'] : E.songs)[id - 1] : I.t('awaiting'); },
    set(language) { if (!messages[language]) return; lang = language; try { localStorage.setItem('electric-rain-language', lang); } catch {} },
    error(message) {
      if (message.startsWith('Web Serial is unavailable')) return I.t('errorSerial');
      if (message.startsWith('Serial access was blocked')) return I.t('errorSecurity');
      if (/No port selected|No device selected|NotFoundError/.test(message)) return I.t('errorCancelled');
      return message;
    },
    apply() {
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
      document.title = I.t('appTitle');
      document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = I.t(node.dataset.i18n); });
      document.querySelectorAll('[data-i18n-aria]').forEach(node => { node.setAttribute('aria-label', I.t(node.dataset.i18nAria)); });
      document.querySelectorAll('[data-track-name]').forEach(node => { node.textContent = `0${node.dataset.trackName} · ${I.song(Number(node.dataset.trackName))}`; });
      document.querySelectorAll('#demo-song option').forEach(option => { option.textContent = I.song(Number(option.value)); });
      const toggle = document.getElementById('language-toggle');
      toggle.textContent = lang === 'zh' ? 'English' : '中文'; toggle.setAttribute('aria-label', I.t('language'));
    },
    // Raw serial strings and protocol enum names deliberately remain untranslated.
  };
  E.i18n = I;
})();
