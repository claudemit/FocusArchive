# FOCUS ARCHIVE 测试手册

## 三层验证

### 静态门禁

运行 `npm run verify`。它会从现有根目录的 `index.html` 和 `assets/` 重建 `dist/`，创建不可变 ZIP，并验证离线包结构、相对资源、外置经典脚本、禁用能力、JavaScript 语法、ZIP 根入口和体积。通过只代表静态检查通过，不代表真机通过。

### DEV 本地预览

运行 `npm run dev`，打开终端显示的本地地址。检查首屏、编辑主流程、错误态、窄屏、横竖尺寸变化和刷新恢复。普通浏览器不会注入 `window.xhs.miniTool`，不能将其结果当作桥接或相册验证。

### TEST 真机

运行 `npm run deploy:test`。默认 manual adapter 仅生成 ZIP、SHA-256、部署记录和手机测试单；它不会上传、生成二维码或伪造真机结论。通过小红书体验版入口完成测试，并只编辑生成的 `mobile-test-report.json` 结果字段。

必须记录 Bridge 注入、首次/拒绝/再次授权的相册权限、大图内存和耗时、安全区、软键盘、后台恢复，以及 PNG 在相册中的打开情况和 MP4 在视频发布页的播放情况。

## 发布与回流

`deployments/test/<releaseId>/` 保存不可变 `artifact.zip`、hash、adapter 结果、`MOBILE_TEST.md` 与手机报告。整体报告只有在所有 `requiredForProd` 用例为 `PASS` 且 `criticalDefects` 为空时才可填写 `PASS`。

动画使用 H.264 MP4。先验证编码，再核对 `writeTempFile` 返回的视频和封面路径能否通过 `postNote` 打开视频发布页。缺少 WebCodecs 的设备应显示明确提示，仍可录制、回放和保存 PNG。
