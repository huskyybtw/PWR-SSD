<#
.SYNOPSIS
  Builds a release APK (Android only) locally and copies it to dist/.

.DESCRIPTION
  1. expo prebuild --platform android   (generates the gitignored android/ project from app.json)
  2. gradlew assembleRelease             (JS bundle + native build, signed with the debug keystore)
  3. copies the APK to dist/budget-analysis-v<version>.apk

  Requirements: Android SDK (ANDROID_HOME or %LOCALAPPDATA%\Android\Sdk) and a JDK 17-21.
  Android Studio's bundled JDK (jbr) is used automatically when JAVA_HOME is not set.
  EXPO_PUBLIC_* variables from .env (e.g. the Gemini key) are baked into the APK.

.EXAMPLE
  npm run build:apk
  npm run build:apk -- -Clean      # regenerate android/ from scratch first
#>
param(
  [switch]$Clean
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

# --- JDK -------------------------------------------------------------------
if (-not $env:JAVA_HOME) {
  $jbr = Join-Path $env:ProgramFiles "Android\Android Studio\jbr"
  if (Test-Path (Join-Path $jbr "bin\java.exe")) {
    $env:JAVA_HOME = $jbr
  } else {
    throw "JAVA_HOME is not set and Android Studio's JDK was not found. Install JDK 17 or 21."
  }
}
$env:PATH = "$(Join-Path $env:JAVA_HOME 'bin');$env:PATH"
Write-Host "JDK: $env:JAVA_HOME" -ForegroundColor DarkGray

# --- Android SDK -----------------------------------------------------------
if (-not $env:ANDROID_HOME) {
  $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  if (-not (Test-Path $sdk)) { throw "Android SDK not found. Set ANDROID_HOME." }
  $env:ANDROID_HOME = $sdk
}
Write-Host "SDK: $env:ANDROID_HOME" -ForegroundColor DarkGray

$version = (Get-Content app.json -Raw | ConvertFrom-Json).expo.version
Write-Host "Building Budget Analysis v$version (release APK)" -ForegroundColor Cyan

# --- 1. prebuild -------------------------------------------------------------
$prebuildArgs = @("expo", "prebuild", "--platform", "android", "--no-install")
if ($Clean -or -not (Test-Path "android")) { $prebuildArgs += "--clean" }
& npx @prebuildArgs
if ($LASTEXITCODE -ne 0) { throw "expo prebuild failed" }

# Gradle reads the SDK location from local.properties.
$sdkDir = $env:ANDROID_HOME -replace "\\", "\\\\"
Set-Content -Path "android\local.properties" -Value "sdk.dir=$sdkDir" -Encoding ascii

# --- 2. gradle ---------------------------------------------------------------
Push-Location android
try {
  & .\gradlew.bat assembleRelease --no-daemon
  if ($LASTEXITCODE -ne 0) { throw "gradle assembleRelease failed" }
} finally {
  Pop-Location
}

# --- 3. copy -----------------------------------------------------------------
$apk = "android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $apk)) { throw "APK not found at $apk" }
New-Item -ItemType Directory -Force -Path dist | Out-Null
$out = "dist\budget-analysis-v$version.apk"
Copy-Item $apk $out -Force
$sizeMB = [math]::Round((Get-Item $out).Length / 1MB, 1)

Write-Host ""
Write-Host "APK ready: $(Resolve-Path $out) ($sizeMB MB)" -ForegroundColor Green
Write-Host "Install on a connected phone/emulator:  adb install -r `"$out`""
