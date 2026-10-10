#!/usr/bin/env bash
# Installs what the Android build needs (Android SDK command-line tools, platform 36, build-tools 36)
# into ~/android-sdk. For a GitHub Codespace or any Linux machine that has Java 21 and Node 22.
#
#   bash tools/setup-android.sh && source ~/.bashrc
#   npm ci && npm run android:apk
#
# The APK lands in android/app/build/outputs/apk/debug/app-debug.apk
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="${ANDROID_HOME:-$HOME/android-sdk}"
TOOLS_ZIP="commandlinetools-linux-11076708_latest.zip"

if ! command -v java >/dev/null 2>&1; then
  echo "Java is not installed. Install Java 21 first (in a Codespace: sdk list java, then sdk install java <a 21.x version>)." >&2
  exit 1
fi
JAVA_MAJOR="$(java -version 2>&1 | awk -F'"' '/version/ { split($2, v, "."); print v[1]; exit }')"
if [ "${JAVA_MAJOR:-0}" -lt 21 ]; then
  echo "Java 21 or newer is needed; found Java ${JAVA_MAJOR:-unknown}. In a Codespace: sdk list java, then sdk install java <a 21.x version>." >&2
  exit 1
fi

if [ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "Downloading the Android command-line tools into $SDK ..."
  mkdir -p "$SDK/cmdline-tools"
  TMP="$(mktemp -d)"
  curl -fsSL "https://dl.google.com/android/repository/$TOOLS_ZIP" -o "$TMP/tools.zip"
  unzip -q "$TMP/tools.zip" -d "$TMP"
  rm -rf "$SDK/cmdline-tools/latest"
  mv "$TMP/cmdline-tools" "$SDK/cmdline-tools/latest"
  rm -rf "$TMP"
fi

export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"
export PATH="$SDK/cmdline-tools/latest/bin:$SDK/platform-tools:$PATH"

echo "Accepting the Android SDK licences ..."
yes | sdkmanager --licenses >/dev/null || true
echo "Installing platform-tools, Android 36 and build-tools 36 ..."
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"

echo "sdk.dir=$SDK" > "$ROOT/android/local.properties"

if ! grep -q 'ANDROID_HOME=' "$HOME/.bashrc" 2>/dev/null; then
  {
    echo "export ANDROID_HOME=\"$SDK\""
    echo "export ANDROID_SDK_ROOT=\"$SDK\""
    echo 'export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"'
  } >> "$HOME/.bashrc"
fi

echo
echo "Android SDK ready in $SDK."
echo "Next: source ~/.bashrc && npm ci && npm run android:apk"
