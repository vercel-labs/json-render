import Foundation
import XCTest
@testable import JSONRenderCore

#if canImport(Glibc)
import Glibc
#endif

enum Fixtures {
    static let directory = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()
        .appendingPathComponent("Fixtures")

    static var specsDirectory: URL { directory.appendingPathComponent("specs") }
    static var expectedDirectory: URL { directory.appendingPathComponent("expected") }

    static func specNames() throws -> [String] {
        try FileManager.default
            .contentsOfDirectory(atPath: specsDirectory.path)
            .filter { $0.hasSuffix(".json") }
            .map { String($0.dropLast(".json".count)) }
            .sorted()
    }

    static func specData(_ name: String) throws -> Data {
        try Data(contentsOf: specsDirectory.appendingPathComponent("\(name).json"))
    }

    static func spec(_ name: String) throws -> Spec {
        try JSONDecoder().decode(Spec.self, from: specData(name))
    }

    static func rawSpec(_ name: String) throws -> JSONValue {
        guard let value = JSONValue.decode(String(decoding: try specData(name), as: UTF8.self)) else {
            throw SimpleError("Fixture \(name) is not valid JSON")
        }
        return value
    }

    static func expected(_ name: String) throws -> RecordedElement {
        try JSONDecoder().decode(
            RecordedElement.self,
            from: Data(contentsOf: expectedDirectory.appendingPathComponent("\(name).json"))
        )
    }

    /// Every component name the fixtures use, except the deliberately unknown
    /// `Mystery`.
    static let knownComponents = [
        "Card", "Heading", "Text", "Badge", "Stack", "Separator", "Progress",
        "Button", "Input", "Select", "Switch", "Image", "List", "Row", "Column",
    ]

    static func recordingRegistry() -> RendererRegistry<String> {
        var components: [String: ComponentDefinition<String>] = [:]
        for name in knownComponents {
            components[name] = ComponentDefinition { context in context.element.type }
        }
        return RendererRegistry(components: components)
    }
}

struct SimpleError: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

/// Captures renderer warnings so tests can assert on them without printing.
final class WarningRecorder {
    private(set) var messages: [String] = []

    init() {
        JSONRenderLog.handler = { [weak self] message in
            self?.messages.append(message)
        }
    }

    deinit {
        JSONRenderLog.handler = { message in
            print("[json-render] \(message)")
        }
    }
}

/// The process's resident memory in bytes, so a test can bound an allocation
/// spike. Returns 0 where the platform has no cheap reading.
func residentMemoryBytes() -> Int {
    #if os(Linux)
    guard let contents = try? String(contentsOfFile: "/proc/self/statm", encoding: .utf8) else {
        return 0
    }
    // Fields: total size, resident pages, shared pages, ...
    let fields = contents.split(separator: " ")
    guard fields.count > 1, let pages = Int(fields[1]) else { return 0 }
    return pages * Int(getpagesize())
    #else
    return 0
    #endif
}
