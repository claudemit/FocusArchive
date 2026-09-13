# 发布门禁与回滚

`release.ps1 -Mode Publish` 只接受经过 TEST 的同一 ZIP，并同时要求：手机报告与 artifact SHA-256 一致、报告总状态为 `PASS`、所有必过用例为 `PASS`、无关键缺陷，以及本次对话中精确提供 `PROD:<releaseId>`。

默认 manual adapter 只返回“等待平台操作”。平台审核或发布完成后，使用 `CONFIRM_PROD:<releaseId>` 和真实平台版本 ID 记录确认；此前不得称为已发布。

回滚只接收本地保留且已确认发布的制品，并要求本次对话精确提供 `ROLLBACK:<releaseId>`。保留事故版本、ZIP、hash 和测试报告，回滚后重新完成冷启动、导出、相册保存与权限恢复的烟雾测试。
