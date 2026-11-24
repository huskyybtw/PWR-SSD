<#
.SYNOPSIS
  Pushes test receipts / bank statements to a running Android emulator so they
  show up in the app's image picker (Photos) and document picker (Downloads).

.DESCRIPTION
  Images (*.jpg, *.jpeg, *.png, *.webp) -> /sdcard/Pictures/TestReceipts/
  Documents (*.pdf)                     -> /sdcard/Download/
  Afterwards a media scan is triggered so the Android Photo Picker sees them.

.EXAMPLE
  .\push-to-emulator.ps1
  .\push-to-emulator.ps1 -Serial emulator-5556
  .\push-to-emulator.ps1 -Source C:\path\to\more\receipts
  npm run push:test-files
#>
param(
  # adb device serial; optional when exactly one device is connected
  [string]$Serial = "",
  # folder with files to push (defaults to ./test-data next to this script)
  [string]$Source = (Join-Path $PSScriptRoot "test-data")
)

$ErrorActionPreference = "Stop"

function Find-Adb {
  $cmd = Get-Command adb -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($sdk in @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, "$env:LOCALAPPDATA\Android\Sdk")) {
    if ($sdk) {
      $candidate = Join-Path $sdk "platform-tools\adb.exe"
      if (Test-Path $candidate) { return $candidate }
    }
  }
  throw "adb not found. Install Android SDK platform-tools or add it to PATH."
}

$adb = Find-Adb
Write-Host "Using adb: $adb" -ForegroundColor DarkGray

# --- pick device ---
$devices = & $adb devices | Select-Object -Skip 1 |
  Where-Object { $_ -match "^\S+\s+device$" } |
  ForEach-Object { ($_ -split "\s+")[0] }

if (-not $devices) {
  throw "No Android device/emulator connected. Start the emulator first (adb devices shows nothing)."
}
if (-not $Serial) {
  if (@($devices).Count -gt 1) {
    throw "Several devices connected ($($devices -join ', ')). Pass -Serial <name>."
  }
  $Serial = @($devices)[0]
}
Write-Host "Target device: $Serial" -ForegroundColor Cyan

function Invoke-Adb {
  & $adb -s $Serial @args
  if ($LASTEXITCODE -ne 0) { throw "adb $($args -join ' ') failed (exit $LASTEXITCODE)" }
}

if (-not (Test-Path $Source)) { throw "Source folder not found: $Source" }

$imageExt = @(".jpg", ".jpeg", ".png", ".webp")
$files = Get-ChildItem -Path $Source -File |
  Where-Object { $imageExt -contains $_.Extension.ToLower() -or $_.Extension.ToLower() -eq ".pdf" }

if (-not $files) { throw "No images or PDFs found in $Source" }

$imageDir = "/sdcard/Pictures/TestReceipts"
$docDir = "/sdcard/Download"
Invoke-Adb shell mkdir -p $imageDir
Invoke-Adb shell mkdir -p $docDir

$pushed = @()
foreach ($file in $files) {
  $target = if ($file.Extension.ToLower() -eq ".pdf") { "$docDir/$($file.Name)" } else { "$imageDir/$($file.Name)" }
  Write-Host ("  {0,-30} -> {1}" -f $file.Name, $target)
  Invoke-Adb push $file.FullName $target | Out-Null
  $pushed += $target
}

# --- make files visible to MediaStore (Photo Picker / Files app) ---
Write-Host "Triggering media scan..." -ForegroundColor DarkGray
& $adb -s $Serial shell content call --method scan_volume --uri content://media --arg external_primary | Out-Null
if ($LASTEXITCODE -ne 0) {
  # Fallback for older Android versions
  foreach ($path in $pushed) {
    & $adb -s $Serial shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://$path" | Out-Null
  }
}

Write-Host ""
Write-Host "Done. Pushed $($pushed.Count) file(s) to $Serial." -ForegroundColor Green
Write-Host "  Receipts : Photos / Gallery -> TestReceipts album"
Write-Host "  Statements: Files -> Downloads"
