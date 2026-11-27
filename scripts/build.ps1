param(
    [ValidateSet('DEV', 'TEST')][string]$Stage = 'DEV'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'common.ps1')

$projectRoot = Get-ProjectRoot
$distDir = Assert-PathInsideProject -Path (Join-Path $projectRoot 'dist') -ProjectRoot $projectRoot
$artifactDir = Assert-PathInsideProject -Path (Join-Path $projectRoot 'artifacts') -ProjectRoot $projectRoot
$stateDir = Assert-PathInsideProject -Path (Join-Path $projectRoot '.focus') -ProjectRoot $projectRoot
$criticalEntries = @('style.css', 'icon.png', 'Mirror.svg', 'Reset.svg', 'platform/xhs-minitool.js', 'mp4-standard.js', 'app.js', 'ui-controls.js')
$deliveryEntries = @('index.html', 'assets/demo.png') + @($criticalEntries | ForEach-Object { "assets/$_" })

foreach ($entry in $deliveryEntries) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $entry))) { throw "Delivery source is missing: $entry" }
}

if (Test-Path -LiteralPath $distDir) {
    $distItem = Get-Item -LiteralPath $distDir -Force
    if (($distItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -or
        (Get-ChildItem -LiteralPath $distDir -Force -Recurse -Attributes ReparsePoint)) {
        throw "Refusing to clean a distribution directory containing a linked path: $distDir"
    }
    Remove-Item -LiteralPath $distDir -Recurse -Force
}
$criticalDir = Join-Path $distDir 'critical'
New-Item -ItemType Directory -Force -Path (Join-Path $distDir 'assets'), (Join-Path $criticalDir 'platform'), $artifactDir, $stateDir | Out-Null
foreach ($entry in $criticalEntries) {
    Copy-Item -LiteralPath (Join-Path $projectRoot "assets/$entry") -Destination (Join-Path $criticalDir $entry)
}
Copy-Item -LiteralPath (Join-Path $projectRoot 'assets/demo.png') -Destination (Join-Path $distDir 'assets/demo.png')
$entryHtml = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $projectRoot 'index.html')
foreach ($entry in $criticalEntries) { $entryHtml = $entryHtml.Replace("./assets/$entry", "./critical/$entry") }
[System.IO.File]::WriteAllText((Join-Path $distDir 'index.html'), $entryHtml, [System.Text.UTF8Encoding]::new($false))

$package = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $projectRoot 'package.json') | ConvertFrom-Json
$gitShort = 'nogit'
$gitDirty = $null
if ((Test-Path -LiteralPath (Join-Path $projectRoot '.git')) -and (Get-Command git -ErrorAction SilentlyContinue)) {
    $candidate = (& git.exe '-c' 'core.excludesFile=' '-C' $projectRoot rev-parse --short HEAD 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -eq 0 -and $candidate) {
        $gitShort = $candidate
        $gitDirty = [bool]((& git.exe '-c' 'core.excludesFile=' '-C' $projectRoot status --porcelain 2>$null | Out-String).Trim())
    }
}

$now = [DateTime]::UtcNow
$releaseId = '{0}-{1}' -f $now.ToString('yyyyMMddTHHmmssfffZ'), $gitShort
$fingerprintLines = @(Get-ChildItem -File -Recurse -LiteralPath $distDir | Sort-Object FullName | ForEach-Object {
    $relative = $_.FullName.Substring($distDir.Length).TrimStart('\').Replace('\', '/')
    "$relative=$(Get-ArtifactSha256 -Path $_.FullName)"
})
$fingerprintInput = [System.Text.Encoding]::UTF8.GetBytes(($fingerprintLines -join "`n"))
$hasher = [System.Security.Cryptography.SHA256]::Create()
try { $contentFingerprint = ([System.BitConverter]::ToString($hasher.ComputeHash($fingerprintInput))).Replace('-', '').ToLowerInvariant() }
finally { $hasher.Dispose() }

$buildMeta = [ordered]@{
    schemaVersion = 1; releaseId = $releaseId; appVersion = [string]$package.version; stageCandidate = $Stage
    builtAtUtc = $now.ToString('o'); gitCommit = $gitShort; gitDirty = $gitDirty
    contentFingerprint = $contentFingerprint; compatibility = 'ES2017 / Chrome 61 baseline'
}
Write-Utf8Json -Value $buildMeta -Path (Join-Path $distDir 'build-meta.json')

$artifactPath = Join-Path $artifactDir ("focus-archive-$releaseId.zip")
if (Test-Path -LiteralPath $artifactPath) { throw "Immutable artifact already exists: $artifactPath" }
$archiveFiles = @(Get-ChildItem -File -Recurse -Force -LiteralPath $distDir)
if ($archiveFiles.Count -eq 0) { throw 'dist is empty.' }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipStream = [System.IO.File]::Open($artifactPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
$zipArchive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
try {
    foreach ($file in $archiveFiles) {
        $entryName = $file.FullName.Substring($distDir.Length).TrimStart('\').Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipArchive, $file.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
}
finally { $zipArchive.Dispose(); $zipStream.Dispose() }

$sha256 = Get-ArtifactSha256 -Path $artifactPath
$manifest = [ordered]@{
    schemaVersion = 1; releaseId = $releaseId; appVersion = [string]$package.version; stageCandidate = $Stage
    artifactPath = $artifactPath; artifactFile = Split-Path -Leaf $artifactPath; artifactSha256 = $sha256
    artifactBytes = (Get-Item -LiteralPath $artifactPath).Length; contentFingerprint = $contentFingerprint
    createdAtUtc = $now.ToString('o'); gitCommit = $gitShort; gitDirty = $gitDirty
}
Write-Utf8Json -Value $manifest -Path (Join-Path $artifactDir "$releaseId.manifest.json")
Write-Utf8Json -Value $manifest -Path (Join-Path $stateDir 'last-build.json')
Write-Host "Build complete: $releaseId"
Write-Host "Artifact: $artifactPath"
Write-Host "SHA-256: $sha256"
