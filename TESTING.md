# FOCUS ARCHIVE 测试手册

## 三层验证

### 静态门禁

运行 `npm run verify`。它会从现有根目录的 `index.html` 和 `assets/` 重建 `dist/`，创建不可变 ZIP，并验证离线包结构、相对资源、外置经典脚本、禁用能力、JavaScript 语法、ZIP 根入口和体积。通过只代表静态检查通过，不代表真机通过。

### DEV 本地预览

运行 `npm run dev`，打开终端显示的本地地址。检查首屏、编辑主流程、错误态、窄屏、横竖尺寸变化和刷新恢复。普通浏览器不会注入 `window.xhs.miniTool`，不能将其结果当作桥接或相册验证。

### TEST 真机

运行 `npm run deploy:test`。默认 manual adapter 仅生成 ZIP、SHA-256、部署记录和手机测试单；它不会上传、生成二维码或伪造真机结论。通过小红书体验版入口完成测试，并只编辑生成的 `mobile-test-report.json` 结果字段。

必须记录 Bridge 注入、首次/拒绝/再次授权的相册权限、大图内存和耗时、安全区、软键盘、后台恢复，以及 PNG 和动画 WebP 在系统相册中的真实打开与播放情况。

## 发布与回流

`deployments/test/<releaseId>/` 保存不可变 `artifact.zip`、hash、adapter 结果、`MOBILE_TEST.md` 与手机报告。整体报告只有在所有 `requiredForProd` 用例为 `PASS` 且 `criticalDefects` 为空时才可填写 `PASS`。

视频和动画的容器能力必须按真实 MiniTool Bridge 验证。当前交付路径是动画 WebP；不要把 MP4 交给图片相册 API，也不要把小程序 API 当成小工具 H5 的能力证明。
