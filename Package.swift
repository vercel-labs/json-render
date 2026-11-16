// swift-tools-version: 5.9
import PackageDescription

// This manifest makes the repository root the Swift package, so Xcode and
// SwiftPM can add it by URL, for example:
//
//     .package(url: "https://github.com/vercel-labs/json-render", from: "0.23.1")
//
// The sources stay in `swift/JSONRender`, which also has its own manifest for
// local use. Keep the two manifests in step: same tools version, platforms,
// products, targets, dependencies, exclusions, and resources.
let package = Package(
    name: "JSONRender",
    platforms: [
        .macOS(.v13),
        .iOS(.v16),
    ],
    products: [
        .library(name: "JSONRenderCore", targets: ["JSONRenderCore"]),
        .library(name: "JSONRenderSwiftUI", targets: ["JSONRenderSwiftUI"]),
        .library(name: "JSONRenderCatalog", targets: ["JSONRenderCatalog"]),
        .executable(name: "JSONRenderMacExample", targets: ["JSONRenderMacExample"]),
        .executable(name: "JSONRenderStreamingDemo", targets: ["JSONRenderStreamingDemo"]),
    ],
    targets: [
        // Spec model, validation, expressions, actions, state, streaming, and
        // tree building. No UI frameworks, so it builds and tests on Linux.
        .target(
            name: "JSONRenderCore",
            path: "swift/JSONRender/Sources/JSONRenderCore"
        ),
        // SwiftUI views for the built-in catalog and `JSONRenderView`.
        .target(
            name: "JSONRenderSwiftUI",
            dependencies: ["JSONRenderCore"],
            path: "swift/JSONRender/Sources/JSONRenderSwiftUI"
        ),
        // Native catalog: cards, metrics, lists, controls, and charts.
        .target(
            name: "JSONRenderCatalog",
            dependencies: ["JSONRenderCore", "JSONRenderSwiftUI"],
            path: "swift/JSONRender/Sources/JSONRenderCatalog"
        ),
        // macOS example app. Built and run on a Mac that has SwiftUI.
        .executableTarget(
            name: "JSONRenderMacExample",
            dependencies: ["JSONRenderCore", "JSONRenderSwiftUI"],
            path: "swift/JSONRender/Sources/JSONRenderMacExample"
        ),
        // macOS app that replays recorded model streams through the stream
        // compiler and renders them with the native catalog.
        .executableTarget(
            name: "JSONRenderStreamingDemo",
            dependencies: ["JSONRenderCore", "JSONRenderSwiftUI", "JSONRenderCatalog"],
            path: "swift/JSONRender/Sources/JSONRenderStreamingDemo",
            resources: [.copy("Resources")]
        ),
        .testTarget(
            name: "JSONRenderCoreTests",
            dependencies: ["JSONRenderCore"],
            path: "swift/JSONRender/Tests/JSONRenderCoreTests",
            exclude: ["Fixtures"]
        ),
        // Model behavior behind `JSONRenderView`. Its sources compile to
        // nothing where SwiftUI is unavailable, so this target builds empty on
        // Linux and the macOS job is what runs these tests.
        .testTarget(
            name: "JSONRenderSwiftUITests",
            dependencies: ["JSONRenderCore", "JSONRenderSwiftUI", "JSONRenderCatalog"],
            path: "swift/JSONRender/Tests/JSONRenderSwiftUITests"
        ),
    ]
)
