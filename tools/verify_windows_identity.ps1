param(
    [ValidateSet('Package', 'AuditShell', 'RepairShell')]
    [string]$Mode = 'AuditShell'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$productionId = 'com.lezionify.app'
if ($Mode -eq 'Package') {
    $package = Get-Content (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
    $executable = Join-Path $projectRoot 'dist\win-unpacked\Lezionify.exe'
    $info = (Get-Item -LiteralPath $executable).VersionInfo
    if ($info.ProductName -ne 'Lezionify' -or $info.FileDescription -ne 'Lezionify' -or $info.ProductVersion -ne "$($package.version).0") {
        throw 'Executable name or version does not identify this Lezionify release.'
    }
    Add-Type -AssemblyName System.Drawing
    function Get-IconFingerprint([string]$path) {
        $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
        if (-not $icon) { throw 'Executable icon missing.' }
        $bitmap = $icon.ToBitmap()
        $stream = New-Object System.IO.MemoryStream
        try {
            $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
            return [Convert]::ToBase64String($stream.ToArray())
        } finally { $stream.Dispose(); $bitmap.Dispose(); $icon.Dispose() }
    }
    $defaultElectron = Join-Path $projectRoot 'node_modules\electron\dist\electron.exe'
    if ((Get-IconFingerprint $executable) -eq (Get-IconFingerprint $defaultElectron)) { throw 'Executable still has the default Electron icon.' }
    Write-Output "PASS: Lezionify $($package.version) executable metadata and custom icon."
    exit 0
}

$shell = New-Object -ComObject Shell.Application
$programsPath = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$programs = $shell.NameSpace($programsPath)
if (-not $programs) { throw 'Real user Start Menu unavailable: run outside the redirected sandbox.' }
$collisionPath = Join-Path $programsPath 'Electron.lnk'
$item = $programs.ParseName('Electron.lnk')
if ($item -and $item.ExtendedProperty('System.AppUserModel.ID') -eq $productionId) {
    if ($Mode -ne 'RepairShell') { throw 'Electron shortcut shares the installed Lezionify identity.' }
    $target = $item.ExtendedProperty('System.Link.TargetParsingPath')
    $expected = Join-Path $projectRoot 'node_modules\electron\dist\electron.exe'
    if ($target -ne $expected) { throw 'Unexpected Electron shortcut target: preserve it and investigate.' }
    $backup = Join-Path $projectRoot ('local-artifacts\windows-identity-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    New-Item -ItemType Directory -Path $backup | Out-Null
    $saved = Join-Path $backup 'Electron.lnk'
    Copy-Item -LiteralPath $collisionPath -Destination $saved
    if ((Get-FileHash -LiteralPath $collisionPath).Hash -ne (Get-FileHash -LiteralPath $saved).Hash) { throw 'Shortcut backup mismatch.' }
    Remove-Item -LiteralPath $collisionPath
    Write-Output "Backed up and removed only the confirmed development shortcut: $backup"
}
$installed = @(Get-StartApps | Where-Object AppID -eq $productionId)
if ($installed.Count -ne 1 -or $installed[0].Name -ne 'Lezionify') { throw 'Windows still does not resolve the installed identity to Lezionify; recheck indexing and NSIS shortcuts.' }
Write-Output 'PASS: Windows Start resolves com.lezionify.app to Lezionify.'
