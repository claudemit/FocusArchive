param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'common.ps1')
$projectRoot = Get-ProjectRoot
& (Join-Path $PSScriptRoot 'test.ps1') -Stage TEST
$build = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $projectRoot '.focus\last-build.json') | ConvertFrom-Json
$config = Get-DeployConfig -ProjectRoot $projectRoot
$artifactPath = [string]$build.artifactPath
$releaseId = [string]$build.releaseId
$artifactSha256 = [string]$build.artifactSha256
$result = Invoke-DeploymentAdapter -ConfigSection $config.test -Action 'deploy-test' -ArtifactPath $artifactPath -ReleaseId $releaseId -ArtifactSha256 $artifactSha256 -ProjectRoot $projectRoot
if ([string]$result.status -eq 'FAILED') { throw "TEST adapter failed: $($result.message)" }

$recordDir = Assert-PathInsideProject -Path (Join-Path $projectRoot "deployments\test\$releaseId") -ProjectRoot $projectRoot
New-Item -ItemType Directory -Force -Path $recordDir | Out-Null
Copy-Item -LiteralPath $artifactPath -Destination (Join-Path $recordDir 'artifact.zip')
$deployment = [ordered]@{
    schemaVersion = 1; releaseId = $releaseId; artifactSha256 = $artifactSha256; stage = 'TEST'
    adapter = [string]$config.test.adapter; attemptedAtUtc = [DateTime]::UtcNow.ToString('o'); result = $result
}
Write-Utf8Json -Value $deployment -Path (Join-Path $recordDir 'deployment.json')

$matrix = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $projectRoot 'config\test-matrix.json') | ConvertFrom-Json
$cases = @($matrix.cases | ForEach-Object { [ordered]@{ id = [string]$_.id; name = [string]$_.name; requiredForProd = [bool]$_.requiredForProd; status = 'PENDING'; notes = ''; evidence = @() } })
$report = [ordered]@{
    schemaVersion = 1; releaseId = $releaseId; artifactSha256 = $artifactSha256; status = 'PENDING'; tester = ''; testedAt = ''; timezone = 'Asia/Shanghai'
    device = [ordered]@{ brand = ''; model = ''; os = ''; osVersion = ''; xhsVersion = '' }
    entry = [ordered]@{
        providerReleaseId = if ($result.PSObject.Properties.Name -contains 'providerReleaseId') { [string]$result.providerReleaseId } else { '' }
        testUrl = if ($result.PSObject.Properties.Name -contains 'testUrl') { [string]$result.testUrl } else { '' }
        qrCode = if ($result.PSObject.Properties.Name -contains 'qrCode') { [string]$result.qrCode } else { '' }
    }
    cases = $cases; criticalDefects = @(); debugSnapshot = [ordered]@{ sessionId = ''; releaseId = ''; artifactSha256 = ''; raw = '' }; notes = ''
}
Write-Utf8Json -Value $report -Path (Join-Path $recordDir 'mobile-test-report.json')
$instructions = @(
    "# FOCUS ARCHIVE mobile test: $releaseId", '', "- Adapter status: $($result.status)", "- ZIP SHA-256: $artifactSha256", '- ZIP: artifact.zip', '- Machine-readable report: mobile-test-report.json', '',
    'If status is AWAITING_PLATFORM_UPLOAD, upload artifact.zip through the supported Xiaohongshu developer tool/console and create the experience entry. A PC web preview is not a real-device TEST.', '',
    'Follow TESTING.md. Edit only result fields. Do not change releaseId, artifactSha256, case id, or requiredForProd. Preserve errMsg/errCode verbatim and attach screenshots or recordings.'
) -join [Environment]::NewLine
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $recordDir 'MOBILE_TEST.md'), $instructions, $utf8NoBom)
Write-Utf8Json -Value $deployment -Path (Join-Path $projectRoot '.focus\last-test-deployment.json')
Write-Host "TEST candidate ready: $releaseId"
Write-Host "Adapter status: $($result.status)"
Write-Host "SHA-256: $artifactSha256"
Write-Host "Phone checklist: $(Join-Path $recordDir 'MOBILE_TEST.md')"
