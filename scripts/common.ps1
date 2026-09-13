Set-StrictMode -Version Latest

function Get-ProjectRoot {
    return [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
}

function Assert-PathInsideProject {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$ProjectRoot
    )

    $resolvedRoot = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\') + '\'
    $resolvedPath = [System.IO.Path]::GetFullPath($Path)
    if (-not $resolvedPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing path outside project: $resolvedPath"
    }
    return $resolvedPath
}

function Write-Utf8Json {
    param(
        [Parameter(Mandatory = $true)]$Value,
        [Parameter(Mandatory = $true)][string]$Path,
        [int]$Depth = 12
    )

    $parent = Split-Path -Parent $Path
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    $json = $Value | ConvertTo-Json -Depth $Depth
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, $utf8NoBom)
}

function Get-ArtifactSha256 {
    param([Parameter(Mandatory = $true)][string]$Path)
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Get-DeployConfig {
    param([Parameter(Mandatory = $true)][string]$ProjectRoot)

    $localPath = Join-Path $ProjectRoot 'config\deploy.local.json'
    $defaultPath = Join-Path $ProjectRoot 'config\deploy.example.json'
    $configPath = if (Test-Path -LiteralPath $localPath) { $localPath } else { $defaultPath }
    if (-not (Test-Path -LiteralPath $configPath)) { throw "Deployment config not found: $configPath" }
    return Get-Content -Raw -Encoding UTF8 -LiteralPath $configPath | ConvertFrom-Json
}

function Invoke-DeploymentAdapter {
    param(
        [Parameter(Mandatory = $true)]$ConfigSection,
        [Parameter(Mandatory = $true)][ValidateSet('deploy-test', 'publish', 'rollback')][string]$Action,
        [Parameter(Mandatory = $true)][string]$ArtifactPath,
        [Parameter(Mandatory = $true)][string]$ReleaseId,
        [Parameter(Mandatory = $true)][string]$ArtifactSha256,
        [Parameter(Mandatory = $true)][string]$ProjectRoot,
        [string]$TargetReleaseId = ''
    )

    if (-not $ConfigSection.script) { throw 'Adapter config requires a script path.' }
    $adapterPath = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot ([string]$ConfigSection.script)))
    Assert-PathInsideProject -Path $adapterPath -ProjectRoot $ProjectRoot | Out-Null
    if (-not (Test-Path -LiteralPath $adapterPath -PathType Leaf)) { throw "Adapter script not found: $adapterPath" }

    $raw = & $adapterPath -Action $Action -ArtifactPath $ArtifactPath -ReleaseId $ReleaseId -ArtifactSha256 $ArtifactSha256 -ProjectRoot $ProjectRoot -TargetReleaseId $TargetReleaseId
    if (-not $?) { throw "Adapter process failed: $adapterPath" }
    $rawText = ($raw | Out-String).Trim()
    if (-not $rawText) { throw "Adapter returned no JSON: $adapterPath" }
    try { $result = $rawText | ConvertFrom-Json } catch { throw "Adapter output is not valid JSON: $rawText" }

    $allowed = @('DEPLOYED', 'ROLLED_BACK', 'AWAITING_PLATFORM_UPLOAD', 'AWAITING_PLATFORM_RELEASE', 'AWAITING_PLATFORM_ROLLBACK', 'FAILED')
    if ($allowed -notcontains [string]$result.status) { throw "Adapter returned unsupported status: $($result.status)" }
    return $result
}
