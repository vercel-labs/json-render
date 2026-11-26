import Foundation

/// Diagnostic output. The renderer warns instead of throwing for problems that
/// a host can recover from, such as an unknown component name, matching the
/// React renderer's `console.warn` calls.
public enum JSONRenderLog {
    /// Receives warning messages. Replace it to capture warnings in tests or to
    /// route them into an app's logging system.
    public static var handler: ((String) -> Void)? = { message in
        print("[json-render] \(message)")
    }

    /// Emits a warning through the current handler.
    public static func warn(_ message: String) {
        handler?(message)
    }
}
