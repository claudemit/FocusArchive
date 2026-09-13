param(
    [ValidateSet('Publish', 'ConfirmPublished', 'Rollback')][string]$Mode = 'Publish',
    [Parameter(Mandatory = $true)][string]$ReleaseId,
    [Parameter(Mandatory = $true)][string]$Approval,
    [string]$ProviderReleaseId = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'common.ps1')
$projectRoot = Get-ProjectRoot
$config = Get-DeployConfig -ProjectRoot $projectRoot

if ($Mode -eq 'ConfirmPublished') {
    $expected = "CONFIRM_PROD:$ReleaseId"
    if ($Approval -cne $expected) { throw "Manual confirmation requires exact approval: $expected" }
    if (-not $ProviderReleaseId) { throw 'ProviderReleaseId is required for manual production confirmation.' }
    $prodDir = Join-Path $projectRoot "deployments\prod\$ReleaseId"
    $deploymentPath = Join-Path $prodDir 'deployment.json'
    if (-not (Test-Path -LiteralPath $deploymentPath)) { throw "Production staging record not found: $deploymentPath" }
    $deployment = Get-Content -Raw -Encoding UTF8 -LiteralPath $deploymentPath | ConvertFrom-Json
    $deployment.result.status = 'DEPLOYED'; $deployment.result.providerReleaseId = $ProviderReleaseId; $deployment.result.message = 'Manually confirmed from the platform after publish.'
    $deployment | Add-Member -NotePropertyName confirmedAtUtc -NotePropertyValue ([DateTime]::UtcNow.ToString('o')) -Force
    Write-Utf8Json -Value $deployment -Path $deploymentPath
    Write-Utf8Json -Value $deployment -Path (Join-Path $projectRoot '.focus\last-prod.json')
    Write-Host "Production publish confirmed: $ReleaseId"
    exit 0
}

if ($Mode -eq 'Rollback') {
    $expected = "ROLLBACK:$ReleaseId"
    if ($Approval -cne $expected) { throw "Rollback requires exact approval: $expected" }
    $prodDir = Join-Path $projectRoot "deployments\prod\$ReleaseId"
    $artifactPath = Join-Path $prodDir 'artifact.zip'; $deploymentPath = Join-Path $prodDir 'deployment.json'
    if (-not (Test-Path -LiteralPath $artifactPath) -or -not (Test-Path -LiteralPath $deploymentPath)) { throw 'Rollback target is not in the retained production release archive.' }
    $knownDeployment = Get-Content -Raw -Encoding UTF8 -LiteralPath $deploymentPath | ConvertFrom-Json
    if ([string]$knownDeployment.result.status -ne 'DEPLOYED') { throw 'Rollback target is not recorded as a confirmed production release.' }
    $artifactSha256 = Get-ArtifactSha256 -Path $artifactPath
    if ($artifactSha256 -ne [string]$knownDeployment.artifactSha256) { throw 'Rollback artifact hash does not match its production record.' }
    $result = Invoke-DeploymentAdapter -ConfigSection $config.prod -Action 'rollback' -ArtifactPath $artifactPath -ReleaseId $ReleaseId -ArtifactSha256 $artifactSha256 -ProjectRoot $projectRoot -TargetReleaseId $ReleaseId
    if ([string]$result.status -eq 'FAILED') { throw "Rollback adapter failed: $($result.message)" }
    $record = [ordered]@{ schemaVersion = 1; targetReleaseId = $ReleaseId; artifactSha256 = $artifactSha256; attemptedAtUtc = [DateTime]::UtcNow.ToString('o'); result = $result }
    Write-Utf8Json -Value $record -Path (Join-Path $projectRoot ("deployments\rollback-{0}.json" -f [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')))
    Write-Host "Rollback adapter status: $($result.status)"
    exit 0
}

$expected = "PROD:$ReleaseId"
if ($Approval -cne $expected) { throw "Production publish requires exact approval: $expected" }
$testDir = Join-Path $projectRoot "deployments\test\$ReleaseId"
$artifactPath = Join-Path $testDir 'artifact.zip'; $testDeploymentPath = Join-Path $testDir 'deployment.json'; $reportPath = Join-Path $testDir 'mobile-test-report.json'
foreach ($requiredPath in @($artifactPath, $testDeploymentPath, $reportPath)) { if (-not (Test-Path -LiteralPath $requiredPath)) { throw "Required TEST record not found: $requiredPath" } }
$testDeployment = Get-Content -Raw -Encoding UTF8 -LiteralPath $testDeploymentPath | ConvertFrom-Json
$report = Get-Content -Raw -Encoding UTF8 -LiteralPath $reportPath | ConvertFrom-Json
$artifactSha256 = Get-ArtifactSha256 -Path $artifactPath
if ($artifactSha256 -ne [string]$testDeployment.artifactSha256 -or $artifactSha256 -ne [string]$report.artifactSha256) { throw 'TEST artifact, deployment record, and phone report hashes do not match.' }
if ([string]$report.releaseId -ne $ReleaseId -or [string]$report.status -ne 'PASS') { throw 'Phone report must match the release and have overall status PASS.' }
if (@($report.criticalDefects).Count -gt 0) { throw 'Phone report contains critical defects.' }
$failedRequired = @($report.cases | Where-Object { [bool]$_.requiredForProd -and [string]$_.status -ne 'PASS' })
if ($failedRequired.Count -gt 0) { throw "Required phone cases are not PASS: $(($failedRequired | ForEach-Object { $_.id }) -join ', ')" }
$result = Invoke-DeploymentAdapter -ConfigSection $config.prod -Action 'publish' -ArtifactPath $artifactPath -ReleaseId $ReleaseId -ArtifactSha256 $artifactSha256 -ProjectRoot $projectRoot
if ([string]$result.status -eq 'FAILED') { throw "PROD adapter failed: $($result.message)" }
$prodDir = Assert-PathInsideProject -Path (Join-Path $projectRoot "deployments\prod\$ReleaseId") -ProjectRoot $projectRoot
New-Item -ItemType Directory -Force -Path $prodDir | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $prodDir 'artifact.zip'))) { Copy-Item -LiteralPath $artifactPath -Destination (Join-Path $prodDir 'artifact.zip') }
Copy-Item -LiteralPath $reportPath -Destination (Join-Path $prodDir 'mobile-test-report.json') -Force
$deployment = [ordered]@{ schemaVersion = 1; releaseId = $ReleaseId; artifactSha256 = $artifactSha256; stage = 'PROD'; adapter = [string]$config.prod.adapter; attemptedAtUtc = [DateTime]::UtcNow.ToString('o'); result = $result }
Write-Utf8Json -Value $deployment -Path (Join-Path $prodDir 'deployment.json')
if ([string]$result.status -eq 'DEPLOYED') { Write-Utf8Json -Value $deployment -Path (Join-Path $projectRoot '.focus\last-prod.json') }
Write-Host "PROD adapter status: $($result.status)"
if ([string]$result.status -eq 'AWAITING_PLATFORM_RELEASE') { Write-Host ('After platform publication, run release:confirm with CONFIRM_PROD:{0} and the platform release ID.' -f $ReleaseId) }
