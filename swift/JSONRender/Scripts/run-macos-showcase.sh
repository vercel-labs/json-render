#!/usr/bin/env bash
set -euo pipefail

package_dir="$(cd "$(dirname "$0")/.." && pwd)"
stage="$(mktemp -d "${TMPDIR:-/tmp}/json-render-mac-showcase.XXXXXX")"
sdk="$(xcrun --sdk macosx --show-sdk-path)"

# The explicit SDK and native SwiftPM linker record the SDK used by AppKit to
# select its system appearance. Keep the deployment target in Package.swift.
build=(swift build --build-system native --sdk "$sdk" --package-path "$package_dir" --scratch-path "$stage/build")
"${build[@]}" --product JSONRenderStreamingDemo
products="$("${build[@]}" --show-bin-path)"

app="$stage/Trail Planner.app"
mkdir -p "$app/Contents/MacOS"
cp "$products/JSONRenderStreamingDemo" "$app/Contents/MacOS/TrailPlannerShowcase"
cat > "$app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleExecutable</key><string>TrailPlannerShowcase</string>
<key>CFBundleIdentifier</key><string>dev.json-render.trail-planner-macos</string>
<key>CFBundleName</key><string>Trail Planner</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>13.0</string>
<key>NSPrincipalClass</key><string>NSApplication</string>
</dict></plist>
PLIST

# Keep this staging directory alive while SwiftPM's resource bundle is in use.
codesign --force --sign - "$app"
open -n "$app" --args --liquid-glass-showcase
