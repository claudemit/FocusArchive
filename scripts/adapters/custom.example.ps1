param(
    [Parameter(Mandatory = $true)][ValidateSet('deploy-test', 'publish', 'rollback')][string]$Action,
    [Parameter(Mandatory = $true)][string]$ArtifactPath,
    [Parameter(Mandatory = $true)][string]$ReleaseId,
    [Parameter(Mandatory = $true)][string]$ArtifactSha256,
    [Parameter(Mandatory = $true)][string]$ProjectRoot,
    [string]$TargetReleaseId = ''
)

# Copy this file to a project-local adapter and implement only against a verified official tool/API or trusted internal service.
# Keep credentials out of arguments, source, logs, the ZIP, and this JSON response. Validate the artifact hash before upload.
[ordered]@{ status = 'FAILED'; providerReleaseId = ''; testUrl = ''; qrCode = ''; rollbackToken = ''; message = 'Example adapter is intentionally disabled. Implement a verified integration before selecting it.' } | ConvertTo-Json -Compress
exit 1
