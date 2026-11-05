(() => {
  'use strict';
  const I = window.ElectricRain.i18n;
  const render = () => { I.apply(); document.title = I.t('projectTitle'); };
  document.getElementById('language-toggle').addEventListener('click', () => { I.set(I.language === 'zh' ? 'en' : 'zh'); render(); });
  render();
})();
