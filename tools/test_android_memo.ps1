param(
 [string]$AndroidSdk = "$env:LOCALAPPDATA/Android/Sdk",
 [string]$JavaHome = 'C:/Program Files/Android/Android Studio/jbr',
 [string]$Serial = 'emulator-5556'
)
$ErrorActionPreference = 'Stop'
if ($Serial -notmatch '^emulator-[0-9]+$') { throw 'Only an emulator may receive this synthetic fixture.' }
$root = Split-Path $PSScriptRoot -Parent
$build = Join-Path $root 'local-artifacts/android-memo-test'
$original = Join-Path $root 'android-companion/app/build/local-debug'
$versionSource = [IO.File]::ReadAllText("$root/android-companion/app/build.gradle")
$codeMatch = [regex]::Match($versionSource, 'versionCode\s+(\d+)')
if (!$codeMatch.Success) { throw 'Versione Android non disponibile' }
$versionCode = $codeMatch.Groups[1].Value
$tools = Join-Path $AndroidSdk 'build-tools/35.0.0'
$platform = Join-Path $AndroidSdk 'platforms/android-35/android.jar'
$adb = Join-Path $AndroidSdk 'platform-tools/adb.exe'
New-Item -ItemType Directory -Force -Path $build, "$build/gen", "$build/classes", "$build/dex" | Out-Null
$manifest = [IO.File]::ReadAllText("$original/AndroidManifest.xml").Replace('<application ', '<application android:debuggable="true" ')
$manifest = $manifest.Replace('</application>', '<activity android:name="it.lezionify.mobile.MemoWidgetTest$HostActivity" android:exported="false" /></application><instrumentation android:name="it.lezionify.mobile.MemoWidgetTest" android:targetPackage="it.lezionify.mobile" />')
[IO.File]::WriteAllText("$build/AndroidManifest.xml", $manifest, [Text.UTF8Encoding]::new($false))
& "$tools/aapt2.exe" link -I $platform --manifest "$build/AndroidManifest.xml" --java "$build/gen" --min-sdk-version 26 --target-sdk-version 35 --version-code $versionCode --version-name 'test-only' -o "$build/unsigned.apk" "$original/resources.zip"
if ($LASTEXITCODE) { throw 'aapt link failed' }
$sources = @(Get-ChildItem "$root/android-companion/app/src/main/java", "$root/android-companion/crypto", "$build/gen" -Filter '*.java' -Recurse | ForEach-Object { $_.FullName })
$sources += "$root/tests/android/MemoWidgetTest.java"
& "$JavaHome/bin/javac.exe" -source 8 -target 8 -classpath $platform -d "$build/classes" $sources
if ($LASTEXITCODE) { throw 'javac failed' }
$classes = @(Get-ChildItem "$build/classes" -Filter '*.class' -Recurse | ForEach-Object { $_.FullName })
& "$tools/d8.bat" --lib $platform --min-api 26 --output "$build/dex" $classes
if ($LASTEXITCODE) { throw 'dex failed' }
Push-Location "$build/dex"
try { & "$JavaHome/bin/jar.exe" uf "$build/unsigned.apk" classes.dex; if ($LASTEXITCODE) { throw 'jar failed' } } finally { Pop-Location }
& "$tools/zipalign.exe" -f 4 "$build/unsigned.apk" "$build/aligned.apk"
& "$tools/apksigner.bat" sign --ks "$original/debug.keystore" --ks-pass pass:android --key-pass pass:android --out "$build/test-only.apk" "$build/aligned.apk"
if ($LASTEXITCODE) { throw 'sign failed' }
& $adb -s $Serial install -r "$build/test-only.apk"
if ($LASTEXITCODE) { throw 'install failed' }
& $adb -s $Serial shell appwidget grantbind --package it.lezionify.mobile --user 0
$result = & $adb -s $Serial shell am instrument -w it.lezionify.mobile/it.lezionify.mobile.MemoWidgetTest
$result | Write-Output
if (($result -join "`n") -notmatch 'PASS') { throw 'Android Memo test failed' }
& $adb -s $Serial pull /sdcard/Android/data/it.lezionify.mobile/files/memo-widget.png "$build/widget.png"
