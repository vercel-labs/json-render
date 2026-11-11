import XCTest
@testable import JSONRenderCore

/// Compares Swift tree building with the React renderer's output for the same
/// specs. The expected trees are produced by
/// `Tools/conformance/render-fixtures.mjs`.
final class ConformanceTests: XCTestCase {
    func testFixtureTreesMatchReact() throws {
        let recorder = WarningRecorder()
        let names = try Fixtures.specNames()
        XCTAssertFalse(names.isEmpty, "No spec fixtures found")

        for name in names {
            let spec = try Fixtures.spec(name)
            let expected = try Fixtures.expected(name)

            let store = StateStore(spec: spec)
            let tree = buildRenderTree(
                spec: spec,
                registry: Fixtures.recordingRegistry(),
                store: store
            )

            let root = try XCTUnwrap(tree, "Fixture \(name) did not render")
            XCTAssertEqual(record(root), expected, "Rendered tree differs for \(name)")
        }

        // The unknown component fixture should have warned once and dropped
        // the subtree, which the comparison above already checks.
        XCTAssertTrue(recorder.messages.contains { $0.contains("Mystery") })
    }

    func testEveryFixtureValidates() throws {
        for name in try Fixtures.specNames() {
            let result = validateSpecJSON(try Fixtures.rawSpec(name))
            XCTAssertTrue(result.valid, "\(name): \(result.issues.map(\.message))")
        }
    }

    func testRepeatFixtureTreeShape() throws {
        let spec = try Fixtures.spec("todo-repeat")
        let store = StateStore(spec: spec)
        let tree = try XCTUnwrap(
            buildRenderTree(spec: spec, registry: Fixtures.recordingRegistry(), store: store)
        )

        let list = try XCTUnwrap(tree.children.last)
        XCTAssertEqual(list.component, "List")
        // Beta is archived, so the container's $item condition filters it out.
        XCTAssertEqual(list.children.count, 1)

        let card = try XCTUnwrap(list.children.first)
        XCTAssertEqual(card.props["title"], .string("Alpha"))
        XCTAssertEqual(card.props["index"], .number(0))

        let tasks = try XCTUnwrap(card.children.first)
        XCTAssertEqual(tasks.children.count, 2)
        XCTAssertEqual(tasks.children[1].props["title"], .string("Ship"))
        XCTAssertEqual(tasks.children[1].props["position"], .number(1))
    }
}
