import XCTest
@testable import JSONRenderCore

final class PathTests: XCTestCase {
    func testSetAtArrayLengthAppends() {
        let root = JSONValue.object(["items": .array([])])
        let updated = setByPath(root, "/items/0", .string("a"))
        XCTAssertEqual(getByPath(updated, "/items"), .array([.string("a")]))

        let next = setByPath(updated, "/items/1", .string("b"))
        XCTAssertEqual(getByPath(next, "/items"), .array([.string("a"), .string("b")]))
    }

    func testSetReplacesExistingArrayItem() {
        let root = JSONValue.object(["items": .array([.string("a"), .string("b")])])
        let updated = setByPath(root, "/items/1", .string("c"))
        XCTAssertEqual(getByPath(updated, "/items"), .array([.string("a"), .string("c")]))
    }

    func testSetWithDashAppends() {
        let root = JSONValue.object(["items": .array([.string("a")])])
        let updated = setByPath(root, "/items/-", .string("b"))
        XCTAssertEqual(getByPath(updated, "/items"), .array([.string("a"), .string("b")]))
    }

    func testSetPastArrayLengthIsIgnored() {
        let root = JSONValue.object(["items": .array([])])
        XCTAssertEqual(setByPath(root, "/items/2", .string("a")), root)
    }

    func testSetAtArrayLengthCreatesNestedContainer() {
        let root = JSONValue.object(["items": .array([])])
        let updated = setByPath(root, "/items/0/name", .string("a"))
        XCTAssertEqual(getByPath(updated, "/items"), .array([.object(["name": .string("a")])]))
    }

    func testStoreSetAtArrayLengthAppends() {
        let store = StateStore(["items": .array([])])
        store.set("/items/0", .string("a"))
        XCTAssertEqual(store.get("/items"), .array([.string("a")]))
    }
}
