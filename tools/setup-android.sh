#!/usr/bin/env bash
# Installs what the Android build needs into your home folder, for a GitHub Codespace or any Linux machine:
#   - a Java 21 for Gradle (Gradle 8.14 runs on Java 17-24; Codespaces may default to a newer Java)
#   - the Android SDK command-line tools, platform 36 and build-tools 36
#
#   bash tools/setup-android.sh && source ~/.bashrc
#   npm ci && npm run android:apk
#
# The APK lands in android/app/build/outputs/apk/debug/app-debug.apk
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="${ANDROID_HOME:-$HOME/android-sdk}"
TOOLS_ZIP="commandlinetools-linux-11076708_latest.zip"
ENV_FILE="$HOME/.kiln-android.sh"

java_major() { "$1/bin/java" -version 2>&1 | awk -F'"' '/version/ { split($2, v, "."); print v[1]; exit }'; }
jdk_ok() { local v; v="$(java_major "$1" 2>/dev/null || echo 0)"; [ "${v:-0}" -ge 21 ] && [ "${v:-0}" -le 24 ]; }

find_jdk() {
  local d
  if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ] && jdk_ok "$JAVA_HOME"; then echo "$JAVA_HOME"; return 0; fi
  if command -v java >/dev/null 2>&1; then
    d="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
    if jdk_ok "$d"; then echo "$d"; return 0; fi
  fi
  for d in "$HOME/jdk-21" /usr/local/sdkman/candidates/java/21* "$HOME/.sdkman/candidates/java/"21* /usr/lib/jvm/*21* /opt/java/*21*; do
    if [ -x "$d/bin/java" ] && jdk_ok "$d"; then echo "$d"; return 0; fi
  done
  return 1
}

# 1. Java 21 for Gradle
JDK="$(find_jdk || true)"
if [ -z "$JDK" ]; then
  case "$(uname -m)" in
    x86_64) ARCH=x64 ;;
    aarch64 | arm64) ARCH=aarch64 ;;
    *) echo "Unsupported CPU $(uname -m); install Java 21 by hand." >&2; exit 1 ;;
  esac
  echo "Gradle needs Java 21-24. Downloading Temurin Java 21 into $HOME/jdk-21 ..."
  rm -rf "$HOME/jdk-21"
  mkdir -p "$HOME/jdk-21"
  curl -fsSL "https://api.adoptium.net/v3/binary/latest/21/ga/linux/$ARCH/jdk/hotspot/normal/eclipse" \
    | tar -xz -C "$HOME/jdk-21" --strip-components=1
  JDK="$HOME/jdk-21"
fi
echo "Using Java $(java_major "$JDK") at $JDK"
export JAVA_HOME="$JDK"
export PATH="$JAVA_HOME/bin:$PATH"

# Gradle's daemon uses this Java even if another Java is first on PATH.
mkdir -p "$HOME/.gradle"
touch "$HOME/.gradle/gradle.properties"
sed -i '/^org\.gradle\.java\.home=/d' "$HOME/.gradle/gradle.properties"
echo "org.gradle.java.home=$JDK" >> "$HOME/.gradle/gradle.properties"

# 2. Android SDK
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

# 3. Environment for new terminals
cat > "$ENV_FILE" <<EOF
# Written by tools/setup-android.sh (Kiln Android build)
export JAVA_HOME="$JDK"
export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"
export PATH="\$JAVA_HOME/bin:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH"
EOF
if ! grep -q 'kiln-android.sh' "$HOME/.bashrc" 2>/dev/null; then
  echo '[ -f "$HOME/.kiln-android.sh" ] && . "$HOME/.kiln-android.sh"' >> "$HOME/.bashrc"
fi

# A Gradle daemon started earlier on an unsupported Java would be reused otherwise.
(cd "$ROOT/android" && ./gradlew --stop >/dev/null 2>&1) || true

echo
echo "Ready: Java $(java_major "$JDK") and the Android SDK in $SDK."
echo "Next: source ~/.bashrc && npm run android:apk"
