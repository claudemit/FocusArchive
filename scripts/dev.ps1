param([int]$Port = 4173, [switch]$SkipVerify)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'common.ps1')
$projectRoot = Get-ProjectRoot
if (-not $SkipVerify) { & (Join-Path $PSScriptRoot 'test.ps1') -Stage DEV }
& node (Join-Path $PSScriptRoot 'dev-server.mjs') $projectRoot $Port
exit $LASTEXITCODE
