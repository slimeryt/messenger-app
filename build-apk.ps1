param([switch]$SkipWeb, [string]$Release)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$webhook = "https://discord.com/api/webhooks/1520452428728893451/gFVA7L_vdesk6auc0GyoRr7BEetMm2KzfVDB8vK-eDPruLFM1quVVnOJxwoe9N5hipqd"
$apkSrc = "$root\android\app\build\outputs\apk\debug\app-debug.apk"
$apkDest = "$env:USERPROFILE\Desktop\Nod.apk"
$env:ANDROID_HOME = "C:\Users\slime\Android\Sdk"

Write-Host "--- Build started ---" -ForegroundColor Cyan

if (-not $SkipWeb) {
    Write-Host "Building web..." -ForegroundColor Yellow
    Set-Location $root
    npm run build
    Write-Host "Syncing to Android..." -ForegroundColor Yellow
    npx cap sync android
}

Write-Host "Building APK..." -ForegroundColor Yellow
Set-Location "$root\android"
.\gradlew.bat assembleDebug

Write-Host "Copying to Desktop..." -ForegroundColor Yellow
Copy-Item $apkSrc $apkDest -Force

if ($Release) {
    Write-Host "Creating GitHub release $Release..." -ForegroundColor Yellow
    Set-Location $root
    $notes = '{"force":false,"notes":"Update available"}'
    gh release delete $Release --repo slimeryt/messenger-app --yes 2>$null
    gh release create $Release "$apkSrc#Nod.apk" --repo slimeryt/messenger-app --title $Release --notes $notes
    Write-Host "Release $Release published!" -ForegroundColor Green
    $downloadUrl = "https://github.com/slimeryt/messenger-app/releases/download/$Release/Nod.apk"
    Write-Host "Sending to Discord..." -ForegroundColor Yellow
    $msg = "**Nod $Release** — $downloadUrl"
    $status = curl.exe -s -o NUL -w "%{http_code}" -X POST -F "content=$msg" $webhook
    if ($status -eq "204") { Write-Host "Sent to Discord!" -ForegroundColor Green }
} else {
    Write-Host "Sending to Discord..." -ForegroundColor Yellow
    $status = curl.exe -s -o NUL -w "%{http_code}" -X POST -F "file=@`"$apkSrc`";filename=Nod.apk" $webhook
    if ($status -eq "200") { Write-Host "Sent to Discord!" -ForegroundColor Green }
    else { Write-Host "APK too large for Discord ($status) — copy from Desktop" -ForegroundColor Yellow }
}

Write-Host "--- Done: $apkDest ---" -ForegroundColor Cyan
