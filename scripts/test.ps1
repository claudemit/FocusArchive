param(
    [ValidateSet('DEV', 'TEST')][string]$Stage = 'DEV',
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'common.ps1')
$projectRoot = Get-ProjectRoot
$stateDir = Join-Path $projectRoot '.focus'
if (-not $SkipBuild) { & (Join-Path $PSScriptRoot 'build.ps1') -Stage $Stage }
$lastBuildPath = Join-Path $stateDir 'last-build.json'
if (-not (Test-Path -LiteralPath $lastBuildPath)) { throw 'No build result found. Run build.ps1 first.' }
$build = Get-Content -Raw -Encoding UTF8 -LiteralPath $lastBuildPath | ConvertFrom-Json
$artifactPath = [string]$build.artifactPath
$distDir = Join-Path $projectRoot 'dist'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 18+ is required for static gates and JavaScript syntax checks.' }

& node (Join-Path $projectRoot 'tests\static-gates.mjs') $distDir
if ($LASTEXITCODE -ne 0) { throw 'Static container gates failed.' }
foreach ($file in @(Get-ChildItem -LiteralPath $distDir -Filter '*.js' -File -Recurse)) {
    & node --check $file.FullName
    if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax check failed: $($file.FullName)" }
}
& node (Join-Path $projectRoot 'tests\audit-artifact.mjs') $distDir
if ($LASTEXITCODE -ne 0) { throw 'Directory size audit failed.' }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($artifactPath)
try {
    $entryNames = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    if ($entryNames -notcontains 'index.html') { throw 'ZIP root does not contain index.html.' }
    if ($entryNames | Where-Object { $_ -match '(^|/)(node_modules|\.git)/|\.map$|(^|/)(vite|webpack)\.config\.' }) { throw 'ZIP contains a forbidden development file.' }
}
finally { $archive.Dispose() }
& node (Join-Path $projectRoot 'tests\audit-artifact.mjs') $artifactPath
if ($LASTEXITCODE -ne 0) { throw 'ZIP size audit failed.' }

$currentHash = Get-ArtifactSha256 -Path $artifactPath
if ($currentHash -ne [string]$build.artifactSha256) { throw 'Artifact hash changed after build.' }
$result = [ordered]@{
    schemaVersion = 1; releaseId = [string]$build.releaseId; artifactSha256 = $currentHash; stage = $Stage; status = 'PASS'
    checkedAtUtc = [DateTime]::UtcNow.ToString('o'); note = 'Static and package checks only; real-device compatibility and performance are not yet tested.'
}
Write-Utf8Json -Value $result -Path (Join-Path $stateDir 'last-test.json')
Write-Host "Static/package gates PASS: $($build.releaseId)"
Write-Host 'Real-device status: NOT PERFORMED'
