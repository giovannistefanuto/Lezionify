param(
  [string]$AndroidSdk = "$env:LOCALAPPDATA\Android\Sdk",
  [string]$JavaHome = 'C:\Program Files\Android\Android Studio\jbr'
)
$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = $JavaHome
$root = $PSScriptRoot
$build = Join-Path $root 'app/build/local-debug'
$tools = Join-Path $AndroidSdk 'build-tools/35.0.0'
$platform = Join-Path $AndroidSdk 'platforms/android-35/android.jar'
New-Item -ItemType Directory -Force -Path $build, "$build/gen", "$build/classes", "$build/dex" | Out-Null
& "$tools/aapt2.exe" compile --dir "$root/app/src/main/res" -o "$build/resources.zip"
if ($LASTEXITCODE) { exit $LASTEXITCODE }
$manifest = [IO.File]::ReadAllText("$root/app/src/main/AndroidManifest.xml").Replace('<manifest ', '<manifest package="it.lezionify.mobile" ')
[IO.File]::WriteAllText("$build/AndroidManifest.xml", $manifest, [Text.UTF8Encoding]::new($false))
& "$tools/aapt2.exe" link -I $platform --manifest "$build/AndroidManifest.xml" --java "$build/gen" --min-sdk-version 26 --target-sdk-version 35 --version-code 1 --version-name '0.1.0' -o "$build/unsigned.apk" "$build/resources.zip"
if ($LASTEXITCODE) { exit $LASTEXITCODE }
$sources = @(Get-ChildItem "$root/app/src/main/java", "$root/crypto", "$build/gen" -Filter '*.java' -Recurse | ForEach-Object { $_.FullName })
& "$JavaHome/bin/javac.exe" -source 8 -target 8 -classpath $platform -d "$build/classes" $sources
if ($LASTEXITCODE) { exit $LASTEXITCODE }
$classes = @(Get-ChildItem "$build/classes" -Filter '*.class' -Recurse | ForEach-Object { $_.FullName })
& "$tools/d8.bat" --lib $platform --min-api 26 --output "$build/dex" $classes
if ($LASTEXITCODE) { exit $LASTEXITCODE }
Push-Location "$build/dex"
try { & "$JavaHome/bin/jar.exe" uf "$build/unsigned.apk" classes.dex; if ($LASTEXITCODE) { exit $LASTEXITCODE } } finally { Pop-Location }
& "$tools/zipalign.exe" -f 4 "$build/unsigned.apk" "$build/aligned.apk"
if ($LASTEXITCODE) { exit $LASTEXITCODE }
$keystore = "$build/debug.keystore"
if (!(Test-Path $keystore)) {
  & "$JavaHome/bin/keytool.exe" -genkeypair -keystore $keystore -storepass android -keypass android -alias androiddebugkey -dname 'CN=Android Debug,O=Android,C=US' -keyalg RSA -keysize 2048 -validity 3650 | Out-Null
  if ($LASTEXITCODE) { exit $LASTEXITCODE }
}
& "$tools/apksigner.bat" sign --ks $keystore --ks-pass pass:android --key-pass pass:android --out "$build/lezionify-debug.apk" "$build/aligned.apk"
if ($LASTEXITCODE) { exit $LASTEXITCODE }
& "$tools/apksigner.bat" verify "$build/lezionify-debug.apk"
if ($LASTEXITCODE) { exit $LASTEXITCODE }
Write-Output "APK debug: $build/lezionify-debug.apk"
