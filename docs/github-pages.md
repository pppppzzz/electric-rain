# GitHub Pages 与本次访问最高分

根目录 index.html 可继续双击打开。新 VisitRecords 以 sessionStorage 保存当前标签页已完成演奏的最高最终成绩，普通刷新保留；新的标签页会话重新开始。真实模式与模拟模式各自保存，未结束的演奏不计入记录；返回封面、换歌、切换语言不删除最高分。禁止存储的文件环境退回内存记录，刷新不保证保留。关闭后恢复标签页时，浏览器可能恢复原会话，此行为由浏览器决定。

封面、演奏区和结算显示本次访问最高分，结算同时显示该记录所属曲目。这是本标签页记录，不是跨用户或跨设备排行榜，不上传成绩。

## 自动部署配置

已准备 .github/workflows/pages.yml：推送 main 后先执行原生测试，再使用 scripts/prepare-pages.cjs 生成 _site，发布 GitHub Pages。无需 npm、React 构建或外部资源。部署产物只包含 index.html 引用的 JS/CSS 和 .nojekyll，不包含 Arduino 源码、录屏观察、测试、日志或 node_modules。

目标仓库的 Settings → Pages → Build and deployment → Source 需选择 GitHub Actions。Actions 的 Deploy Electric Rain to GitHub Pages 成功后，github-pages 环境会给出真实网站地址；不要把仅生成 _site 等同于已上线。首次部署需要账号授权、目标仓库地址，以及启用 Pages 的权限。

本地项目位于 1106_piano，远程仓库为 https://github.com/pppppzzz/electric-rain 。使用电脑现有 Git 登录授权推送，main 上的新提交会自动触发部署。部署结果以仓库 Actions 和 github-pages 环境为准。发布不会把用户电脑的 USB 串口暴露给远程访问者；访问者仍需要在自己的支持浏览器中选择本机设备。

参考：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)。
