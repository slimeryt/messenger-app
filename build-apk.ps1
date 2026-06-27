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
    $notes = '{"type":"minor","force":false,"notes":"What\'s new in Nod","changelog":["Update modal now shows changelogs","Tab swipe shows adjacent page while dragging","New version system with typed update badges"],"counters":{"major":1,"minor":0,"ui":3,"bugfixMajor":0,"bugfixMinor":5}}'
    $notesFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($notesFile, $notes, (New-Object System.Text.UTF8Encoding $false))
    try { gh release delete $Release --repo slimeryt/messenger-app --yes 2>$null } catch {}
    gh release create $Release "$apkSrc#Nod.apk" --repo slimeryt/messenger-app --title $Release --notes-file $notesFile
    Remove-Item $notesFile -Force
    Write-Host "Release $Release published!" -ForegroundColor Green
    $downloadUrl = "https://github.com/slimeryt/messenger-app/releases/download/$Release/Nod.apk"
    Write-Host "Sending to Discord..." -ForegroundColor Yellow
    $msg = "**Nod $Release** - $downloadUrl"
    $status = curl.exe -s -o NUL -w "%{http_code}" -X POST -F "content=$msg" $webhook
    if ($status -eq "204") { Write-Host "Sent to Discord!" -ForegroundColor Green }
} else {
    Write-Host "Sending to Discord..." -ForegroundColor Yellow
    $status = curl.exe -s -o NUL -w "%{http_code}" -X POST -F "file=@`"$apkSrc`";filename=Nod.apk" $webhook
    if ($status -eq "200") { Write-Host "Sent to Discord!" -ForegroundColor Green }
    else { Write-Host "APK too large for Discord ($status) - copy from Desktop" -ForegroundColor Yellow }
}

Write-Host "--- Done: $apkDest ---" -ForegroundColor Cyan
