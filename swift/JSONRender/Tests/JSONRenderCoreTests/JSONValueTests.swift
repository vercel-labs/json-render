import XCTest
@testable import JSONRenderCore

final class JSONValueTests: XCTestCase {
    func testDisplayStringOfWholeNumbers() {
        XCTAssertEqual(JSONValue.number(3).displayString, "3")
        XCTAssertEqual(JSONValue.number(-2).displayString, "-2")
        XCTAssertEqual(JSONValue.number(2.5).displayString, "2.5")
    }

    func testDisplayStringPastIntMaxDoesNotCrash() {
        // `Int(1e19)` traps; the display form must fall back to the number.
        XCTAssertEqual(JSONValue.number(1e19).displayString, "1e+19")
        XCTAssertEqual(JSONValue.number(-1e19).displayString, "-1e+19")
        XCTAssertEqual(JSONValue.number(.infinity).displayString, "inf")
        XCTAssertEqual(JSONValue.number(.nan).displayString, "nan")
    }

    func testIntValueOfWholeNumbers() {
        XCTAssertEqual(JSONValue.number(42).intValue, 42)
        XCTAssertEqual(JSONValue.number(-7).intValue, -7)
        XCTAssertEqual(JSONValue.number(42.5).intValue, nil)
        XCTAssertEqual(JSONValue.number(.nan).intValue, nil)
        XCTAssertEqual(JSONValue.string("42").intValue, nil)
    }

    func testIntValuePastIntMaxIsNil() {
        XCTAssertNil(JSONValue.number(1e19).intValue)
        XCTAssertNil(JSONValue.number(-1e19).intValue)
        XCTAssertNil(JSONValue.number(.infinity).intValue)
    }

    func testClampedIntClampsBeforeConverting() {
        XCTAssertEqual(1e19.clampedInt(to: 1...6, fallback: 2), 6)
        XCTAssertEqual((-1e19).clampedInt(to: 1...6, fallback: 2), 1)
        XCTAssertEqual(3.4.clampedInt(to: 1...6, fallback: 2), 3)
        XCTAssertEqual(0.5.clampedInt(to: 1...6, fallback: 2), 1)
        XCTAssertEqual(Double.infinity.clampedInt(to: 1...6, fallback: 2), 2)
        XCTAssertEqual(Double.nan.clampedInt(to: 1...6, fallback: 2), 2)
    }
}
