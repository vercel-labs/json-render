#if canImport(SwiftUI)
import SwiftUI
import XCTest
@testable import JSONRenderCatalog

/// Covers how the native catalog uses numbers a spec supplies.
final class CatalogLayoutTests: XCTestCase {
    func testGridGapPropIsClampedToALayoutSafeValue() {
        XCTAssertEqual(CatalogTheme.gap(.number(-140), fallback: 12), 0)
        XCTAssertEqual(CatalogTheme.gap(.number(.nan), fallback: 12), 12)
        XCTAssertEqual(CatalogTheme.gap(.number(.infinity), fallback: 12), 12)
        XCTAssertEqual(CatalogTheme.gap(.number(8), fallback: 12), 8)
        XCTAssertEqual(CatalogTheme.gap("md", fallback: 12), 12)
    }

    func testNegativeGridSpacingDoesNotTrapColumnMath() {
        // A gap equal to the minimum column width used to leave the column
        // count's divisor at zero. The resulting infinite value trapped when
        // it was converted to Int.
        let layout = ColumnsLayout(columns: 2, spacing: -140, minColumnWidth: 140)

        XCTAssertEqual(layout.spacing, 0)
        XCTAssertEqual(layout.columnCount(width: 600, count: 4), 2)
    }
}
#endif
