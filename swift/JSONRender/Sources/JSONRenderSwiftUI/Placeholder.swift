// The other files in this target are compiled only when SwiftUI is available.
// This import keeps the module valid on Linux, where the target builds empty.
#if canImport(SwiftUI)
import SwiftUI
#endif
