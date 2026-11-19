#!/usr/bin/env bash
set -euo pipefail

device="${1:-booted}"
package_dir="$(cd "$(dirname "$0")/.." && pwd)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

sdk="$(xcrun --sdk iphonesimulator --show-sdk-path)"
build=(swift build --build-system native --package-path "$package_dir" --scratch-path "$stage/build" --sdk "$sdk" --triple "$(uname -m)-apple-ios16.0-simulator")
"${build[@]}" --product JSONRenderStreamingDemo
products="$("${build[@]}" --show-bin-path)"

app="$stage/TrailPlanner.app"
mkdir "$app"
cp "$products/JSONRenderStreamingDemo" "$app/TrailPlanner"
cat > "$app/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleExecutable</key><string>TrailPlanner</string>
<key>CFBundleIdentifier</key><string>dev.json-render.trail-planner-phone</string>
<key>CFBundleName</key><string>Trail Planner</string>
<key>CFBundleVersion</key><string>1</string>
<key>CFBundleShortVersionString</key><string>1.0</string>
<key>CFBundleSupportedPlatforms</key><array><string>iPhoneSimulator</string></array>
<key>UIDeviceFamily</key><array><integer>1</integer></array>
<key>UILaunchScreen</key><dict/>
<key>MinimumOSVersion</key><string>16.0</string>
</dict></plist>
PLIST
codesign --force --sign - "$app"
xcrun simctl install "$device" "$app"
xcrun simctl launch --terminate-running-process "$device" dev.json-render.trail-planner-phone
