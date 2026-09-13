param(
    [Parameter(Mandatory = $true)][ValidateSet('deploy-test', 'publish', 'rollback')][string]$Action,
    [Parameter(Mandatory = $true)][string]$ArtifactPath,
    [Parameter(Mandatory = $true)][string]$ReleaseId,
    [Parameter(Mandatory = $true)][string]$ArtifactSha256,
    [Parameter(Mandatory = $true)][string]$ProjectRoot,
    [string]$TargetReleaseId = ''
)

$status = switch ($Action) { 'deploy-test' { 'AWAITING_PLATFORM_UPLOAD' } 'publish' { 'AWAITING_PLATFORM_RELEASE' } 'rollback' { 'AWAITING_PLATFORM_ROLLBACK' } }
$message = switch ($Action) {
    'deploy-test' { 'Upload the generated ZIP with the supported Xiaohongshu developer tool or console, then create an experience entry or QR code.' }
    'publish' { 'The exact TEST ZIP is staged. Submit or release it in the platform UI and wait for required review.' }
    'rollback' { 'Re-upload or select the retained known-good artifact using the platform-supported rollback or release flow.' }
}
[ordered]@{ status = $status; providerReleaseId = ''; testUrl = ''; qrCode = ''; rollbackToken = ''; message = $message } | ConvertTo-Json -Compress
