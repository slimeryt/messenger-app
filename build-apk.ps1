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
    $downloadUrl = "https://github.com/slimeryt/messenger-app/releases/download/$Release/Nod.apk"

    $meta = [ordered]@{
        type        = "ui"
        force       = $false
        notes       = "Big UI update"
        changelog   = @(
            "Emoji picker: flag images render inline in the text input (flagcdn.com)",
            "Message selection mode: hold to select on mobile, right-click on PC",
            "Selection header morphs with smooth animations (arrow spins to X)",
            "Selection bottom bar with Reply and Forward buttons",
            "Chat header now shows correct DM contact (not yourself)",
            "Online/offline status with live last-seen in chat header",
            "Removed separators in chat list"
        )
        counters    = [ordered]@{ major=1; minor=0; ui=5; bugfixMajor=0; bugfixMinor=0 }
        downloadUrl = $downloadUrl
    }

    # version.json — fetched by the app at runtime via raw.githubusercontent.com
    $versionJson = $meta | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText("$root\public\version.json", $versionJson, (New-Object System.Text.UTF8Encoding $false))

    # Push so raw.githubusercontent.com serves the new version immediately
    Write-Host "Pushing version.json..." -ForegroundColor Yellow
    git -C $root add "public/version.json"
    git -C $root commit -m "chore: update version.json to $Release"
    git -C $root push

    # GitHub release body (informational only)
    $meta.Remove("downloadUrl")
    $releaseBody = $meta | ConvertTo-Json -Compress
    $notesFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($notesFile, $releaseBody, (New-Object System.Text.UTF8Encoding $false))
    $releaseApk = Join-Path $env:TEMP "Nod.apk"
    Copy-Item $apkSrc $releaseApk -Force
    try { gh release delete $Release --repo slimeryt/messenger-app --yes 2>$null } catch {}
    gh release create $Release $releaseApk --repo slimeryt/messenger-app --title $Release --notes-file $notesFile
    Remove-Item $notesFile -Force
    Remove-Item $releaseApk -Force -ErrorAction SilentlyContinue
    Write-Host "Release $Release published!" -ForegroundColor Green
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
