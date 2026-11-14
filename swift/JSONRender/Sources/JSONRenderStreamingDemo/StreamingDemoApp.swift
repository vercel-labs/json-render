#if canImport(SwiftUI) && os(macOS)
import AppKit
import SwiftUI
import JSONRenderCore
import JSONRenderSwiftUI
import JSONRenderCatalog

/// Replays recorded model output through `SpecStreamCompiler` and renders the
/// spec with the native catalog as it grows.
///
/// The recordings in `Resources` hold real streamed responses with the time
/// each chunk arrived. `Scripts/record-demo-streams.mjs` makes them.
@main
struct StreamingDemoApp: App {
    @NSApplicationDelegateAdaptor(DemoAppDelegate.self) private var delegate
    @StateObject private var player = StreamPlayer(options: .current)
    @StateObject private var toaster = Toaster()

    var body: some Scene {
        WindowGroup("json-render") {
            DemoView(player: player, toaster: toaster)
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: DemoOptions.current.width, height: DemoOptions.current.height)
        .commands {
            CommandMenu("Demo") {
                ForEach(player.recordings.indices, id: \.self) { index in
                    Button(player.recordings[index].title) {
                        player.select(index)
                    }
                    .keyboardShortcut(KeyEquivalent(Character("\(index + 1)")), modifiers: .command)
                }
                Divider()
                Button("Generate") { player.play() }
                    .keyboardShortcut(.return, modifiers: .command)
                Button("Reset") { player.reset() }
                    .keyboardShortcut("k", modifiers: .command)
            }
        }
    }
}

final class DemoAppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        JSONRenderLog.handler = { message in
            FileHandle.standardError.write(Data("[json-render] \(message)\n".utf8))
        }
        NSApp.setActivationPolicy(.regular)
        switch DemoOptions.current.appearance {
        case "dark": NSApp.appearance = NSAppearance(named: .darkAqua)
        case "light": NSApp.appearance = NSAppearance(named: .aqua)
        default: break
        }
        NSApp.activate(ignoringOtherApps: true)
        // Apply the requested size even when macOS restores a saved frame.
        DispatchQueue.main.async {
            guard let window = NSApp.windows.first else { return }
            let options = DemoOptions.current
            window.setContentSize(NSSize(width: options.width, height: options.height))
            if let origin = options.origin, let screen = window.screen ?? NSScreen.main {
                let y = screen.frame.maxY - origin.y - window.frame.height
                window.setFrameOrigin(NSPoint(x: origin.x, y: y))
            } else {
                window.center()
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}

// MARK: - Options

/// Launch options, for example `--demo tokyo-trip --autoplay --appearance dark`.
struct DemoOptions {
    var demo: String?
    var autoplay = false
    var startDelay = 1.0
    var appearance: String?
    /// Pauses the replay after this many patches, for still frames.
    var stopAfter: Int?
    /// Playback speed. 1 replays the recorded timing.
    var speed = 1.0
    /// The recorded wait before the first token is shortened to this many
    /// seconds. Chunk timing after the first token is unchanged.
    var firstTokenDelay = 0.9
    var width: CGFloat = 900
    var height: CGFloat = 900
    /// The window's top-left corner in screen points, measured from the top
    /// of the main screen. When nil the window is centered.
    var origin: CGPoint?
    /// Scrolls to follow new content while streaming.
    var follow = true
    /// Multiplies text and icon sizes, for example for a recording.
    var textScale: CGFloat = 1
    /// Scrolls back to the top when the stream finishes.
    var returnToTop = true

    static let current = DemoOptions(arguments: CommandLine.arguments)

    init(arguments: [String]) {
        var iterator = arguments.dropFirst().makeIterator()
        while let argument = iterator.next() {
            switch argument {
            case "--demo": demo = iterator.next()
            case "--autoplay": autoplay = true
            case "--delay": startDelay = iterator.next().flatMap(Double.init) ?? startDelay
            case "--appearance": appearance = iterator.next()
            case "--stop-after": stopAfter = iterator.next().flatMap(Int.init)
            case "--speed": speed = iterator.next().flatMap(Double.init) ?? speed
            case "--first-token": firstTokenDelay = iterator.next().flatMap(Double.init) ?? firstTokenDelay
            case "--no-follow": follow = false
            case "--stay": returnToTop = false
            case "--origin":
                let parts = (iterator.next() ?? "").split(separator: ",").compactMap { Double($0) }
                if parts.count == 2 { origin = CGPoint(x: parts[0], y: parts[1]) }
            case "--text-scale": textScale = iterator.next().flatMap(Double.init).map { CGFloat($0) } ?? textScale
            case "--size":
                let parts = (iterator.next() ?? "").split(separator: "x").compactMap { Double($0) }
                if parts.count == 2 {
                    width = CGFloat(parts[0])
                    height = CGFloat(parts[1])
                }
            default: break
            }
        }
    }
}

// MARK: - Recordings

struct Recording: Decodable, Identifiable {
    struct Chunk: Decodable {
        /// Milliseconds since the request was sent.
        let t: Int
        let text: String
    }

    let id: String
    let title: String
    let prompt: String
    let model: String
    let chunks: [Chunk]

    static func loadAll() -> [Recording] {
        let order = ["coffee-shop", "tokyo-trip", "smart-home"]
        let urls = Bundle.module.urls(forResourcesWithExtension: "json", subdirectory: "Resources") ?? []
        let recordings = urls.compactMap { url -> Recording? in
            guard let data = try? Data(contentsOf: url) else { return nil }
            return try? JSONDecoder().decode(Recording.self, from: data)
        }
        return recordings.sorted {
            (order.firstIndex(of: $0.id) ?? .max, $0.id) < (order.firstIndex(of: $1.id) ?? .max, $1.id)
        }
    }
}

// MARK: - Player

@MainActor
final class StreamPlayer: ObservableObject {
    enum Phase: Equatable {
        case idle, typing, waiting, streaming, paused, done
    }

    @Published var prompt = ""
    @Published private(set) var spec = Spec(root: "", elements: [:])
    @Published private(set) var phase: Phase = .idle
    @Published private(set) var patchCount = 0
    @Published private(set) var runID = UUID()
    @Published private(set) var selected = 0

    let recordings: [Recording]
    let options: DemoOptions
    /// The rendered content height, tracked to follow content an
    /// interaction reveals.
    var contentHeight: CGFloat = 0
    /// The scroll area's height.
    var viewportHeight: CGFloat = 0
    /// The top of each rendered element, in the scroll content's coordinates.
    var elementTops: [CGFloat] = []
    /// The offset the view last scrolled to.
    var scrollTarget: CGFloat = 0
    /// Where the scroll anchor sits. Scrolling to the anchor scrolls to this
    /// offset.
    @Published var anchorOffset: CGFloat = 0
    private var task: Task<Void, Never>?

    init(options: DemoOptions) {
        self.options = options
        self.recordings = Recording.loadAll()
        if let demo = options.demo, let index = recordings.firstIndex(where: { $0.id == demo }) {
            selected = index
        }
        if options.autoplay {
            Task { @MainActor [weak self] in
                try? await Task.sleep(nanoseconds: UInt64(options.startDelay * 1_000_000_000))
                self?.play()
            }
        }
    }

    var recording: Recording? {
        recordings.indices.contains(selected) ? recordings[selected] : nil
    }

    var isBusy: Bool {
        phase == .typing || phase == .waiting || phase == .streaming
    }

    /// True once the spec has something to draw: the root element and, for a
    /// container, at least one of its children.
    var hasContent: Bool {
        guard let root = spec.elements[spec.root] else { return false }
        let children = root.children ?? []
        return children.isEmpty || children.contains { spec.elements[$0] != nil }
    }

    /// True after the prompt is sent and until the stream ends. The send
    /// button shows a stop control only in this window.
    var isGenerating: Bool {
        phase == .waiting || phase == .streaming
    }

    func select(_ index: Int) {
        guard recordings.indices.contains(index) else { return }
        selected = index
        play()
    }

    func reset() {
        task?.cancel()
        task = nil
        prompt = ""
        spec = Spec(root: "", elements: [:])
        patchCount = 0
        phase = .idle
        runID = UUID()
        scrollTarget = 0
    }

    /// Plays the recording whose prompt matches the field, or the selected one.
    func submit() {
        if let index = recordings.firstIndex(where: {
            $0.prompt.caseInsensitiveCompare(prompt.trimmingCharacters(in: .whitespaces)) == .orderedSame
        }) {
            selected = index
        }
        play(typing: prompt.isEmpty)
    }

    func play(typing: Bool = true) {
        task?.cancel()
        task = Task { [weak self] in
            await self?.run(typing: typing)
        }
    }

    private func run(typing: Bool) async {
        guard let recording else { return }
        spec = Spec(root: "", elements: [:])
        scrollTarget = 0
        patchCount = 0
        runID = UUID()

        if typing {
            phase = .typing
            prompt = ""
            for character in recording.prompt {
                prompt.append(character)
                // About 1.5 seconds for a typical prompt.
                let pause: Double = ",.:".contains(character) ? 0.06 : (character == " " ? 0.024 : 0.015)
                guard await sleep(seconds: pause + Double.random(in: 0...0.006)) else { return }
            }
            guard await sleep(seconds: 0.35) else { return }
        }

        phase = .waiting
        let compiler = SpecStreamCompiler()
        let speed = max(options.speed, 0.05)
        let firstChunk = Double(recording.chunks.first?.t ?? 0) / 1000
        let shift = max(0, firstChunk - options.firstTokenDelay)
        let start = Date()

        for chunk in recording.chunks {
            let due = (Double(chunk.t) / 1000 - shift) / speed
            let wait = due - Date().timeIntervalSince(start)
            if wait > 0 {
                guard await sleep(seconds: wait) else { return }
            }
            let update = compiler.push(chunk.text)
            guard !update.newPatches.isEmpty else { continue }
            phase = .streaming
            patchCount += update.newPatches.count
            spec = Spec.decodePartial(update.result)
            if let stopAfter = options.stopAfter, patchCount >= stopAfter {
                phase = .paused
                return
            }
        }

        spec = Spec.decodePartial(compiler.getResult())
        patchCount = compiler.getPatches().count
        phase = .done
        FileHandle.standardError.write(Data("[demo] Finished \(recording.id): \(patchCount) patches\n".utf8))
    }

    private func sleep(seconds: Double) async -> Bool {
        try? await Task.sleep(nanoseconds: UInt64(max(0, seconds) * 1_000_000_000))
        return !Task.isCancelled
    }
}

// MARK: - Toasts

@MainActor
final class Toaster: ObservableObject {
    @Published private(set) var message: String?
    private var generation = 0

    func show(_ text: String) {
        generation += 1
        let current = generation
        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
            message = text
        }
        Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 2_400_000_000)
            guard let self, self.generation == current else { return }
            withAnimation(.easeOut(duration: 0.25)) {
                self.message = nil
            }
        }
    }
}

// MARK: - Views

private let scale = DemoOptions.current.textScale

struct DemoView: View {
    @ObservedObject var player: StreamPlayer
    @ObservedObject var toaster: Toaster

    private var registry: RendererRegistry<AnyView> {
        let toaster = toaster
        let registry = NativeCatalog.registry(actions: [
            "toast": { params in
                let message = params["message"]?.stringValue ?? "Done"
                await MainActor.run { toaster.show(message) }
            },
        ])
        // Report where each block element starts, so automatic scrolling can
        // stop at a block's top edge instead of halfway through a line.
        let blocks: Set<String> = ["Heading", "Card", "Metric", "ListItem", "Alert", "Switch"]
        for (type, definition) in registry.components where blocks.contains(type) {
            registry.components[type] = ComponentDefinition { context in
                AnyView(definition.render(context).background(
                    GeometryReader { geometry in
                        Color.clear.preference(
                            key: ElementTopsKey.self,
                            value: [geometry.frame(in: .named("content")).minY]
                        )
                    }
                ))
            }
        }
        return registry
    }

    /// The bottom padding, which leaves room for the toast.
    private let bottomPadding = 76 * scale

    /// Scrolls toward the end of the page so that the first visible line
    /// starts at an element's top edge, just below the title bar fade.
    /// `maxBack` limits how far above the true end it may stop.
    private func scrollToEnd(_ proxy: ScrollViewProxy, maxBack: CGFloat, duration: Double, onlyIfNeeded: Bool) {
        let viewport = player.viewportHeight
        let end = max(0, player.contentHeight - viewport)
        if onlyIfNeeded {
            // Scroll only once the content runs past the visible area.
            let contentBottom = player.contentHeight - bottomPadding
            guard contentBottom > player.scrollTarget + viewport - 14 else { return }
        }
        // An element's top sits just inside the fade below the title bar; the
        // line above it is hidden behind the fade's solid part.
        let candidates = player.elementTops
            .map { $0 - 22 }
            .filter { $0 >= 0 && $0 <= end && $0 >= end - maxBack }
        let target = (candidates.max() ?? end).rounded()
        // While streaming, skip a scroll to where the view already is. After
        // the stream the user may have scrolled, so always scroll.
        if onlyIfNeeded, abs(target - player.scrollTarget) < 1 { return }
        player.scrollTarget = target
        player.anchorOffset = target
        // Scroll once the anchor has moved.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.03) {
            withAnimation(.easeInOut(duration: duration)) {
                proxy.scrollTo("anchor", anchor: .top)
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            TitleBar()

            ZStack(alignment: .top) {
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(spacing: 0) {
                            Color.clear.frame(height: 0).id("top")
                            JSONRenderView(
                                spec: player.spec,
                                registry: registry,
                                loading: player.phase != .done,
                                animation: .spring(response: 0.35, dampingFraction: 0.9)
                            )
                            .jsonRenderTextScale(scale)
                            .id(player.runID)
                            .padding(.horizontal, 28)
                            .padding(.top, 24)
                            // Room for the toast below the last element.
                            .padding(.bottom, bottomPadding)
                        }
                        .overlay(alignment: .top) {
                            // Scrolling to this view scrolls to `anchorOffset`.
                            Color.clear.frame(width: 1, height: 1)
                                .id("anchor")
                                .padding(.top, player.anchorOffset)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .allowsHitTesting(false)
                        }
                        .coordinateSpace(name: "content")
                        .background(
                            GeometryReader { geometry in
                                Color.clear.preference(key: ContentHeightKey.self, value: geometry.size.height)
                            }
                        )
                        .animation(.spring(response: 0.4, dampingFraction: 0.92), value: player.patchCount)
                    }
                    .scrollIndicators(.hidden)
                    .background(
                        GeometryReader { geometry in
                            Color.clear.preference(key: ViewportHeightKey.self, value: geometry.size.height)
                        }
                    )
                    .onPreferenceChange(ViewportHeightKey.self) { player.viewportHeight = $0 }
                    .onPreferenceChange(ElementTopsKey.self) { player.elementTops = $0 }
                    .onPreferenceChange(ContentHeightKey.self) { height in
                        let grew = height > player.contentHeight + 1
                        player.contentHeight = height
                        guard player.options.follow else { return }
                        // Wait a turn so the element positions for this layout
                        // have arrived too.
                        if player.phase == .streaming {
                            DispatchQueue.main.async {
                                scrollToEnd(proxy, maxBack: bottomPadding - 18, duration: 0.5, onlyIfNeeded: true)
                            }
                        } else if player.phase == .done, !player.options.returnToTop, grew {
                            // After the stream, when an interaction reveals
                            // content at the end of the page, scroll it into
                            // view, leaving room for a toast.
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
                                scrollToEnd(proxy, maxBack: 28, duration: 0.8, onlyIfNeeded: false)
                            }
                        }
                    }
                    .onChange(of: player.phase) { phase in
                        guard player.options.follow, phase == .done, !player.options.returnToTop else { return }
                        // Settle at the end with room for a toast.
                        DispatchQueue.main.async {
                            scrollToEnd(proxy, maxBack: 28, duration: 0.5, onlyIfNeeded: false)
                        }
                    }
                    .onChange(of: player.phase) { phase in
                        guard player.options.follow, player.options.returnToTop, phase == .done else { return }
                        Task { @MainActor in
                            try? await Task.sleep(nanoseconds: 900_000_000)
                            withAnimation(.easeInOut(duration: 0.9)) {
                                proxy.scrollTo("top", anchor: .top)
                            }
                        }
                    }
                }

                // Hidden at once when the first element arrives, so the two
                // never draw over each other.
                EmptyStateView(player: player)
                    .opacity(player.hasContent ? 0 : 1)
                    .transaction { $0.animation = nil }
            }
            // Content fades out at the edges of the scroll area and is clipped
            // there, so it never runs under the window controls or into the
            // status line.
            .overlay(alignment: .top) { EdgeFade(edge: .top) }
            .overlay(alignment: .bottom) { EdgeFade(edge: .bottom) }
            .clipped()
            // Toasts float above the composer, in the space the content
            // leaves free at its end.
            .overlay(alignment: .bottom) {
                if let message = toaster.message {
                    ToastView(message: message)
                        .padding(.bottom, 14 * scale)
                        // Fades in place, so it never passes over the status
                        // line or the composer.
                        .transition(.asymmetric(
                            insertion: .offset(y: 8).combined(with: .opacity),
                            removal: .opacity
                        ))
                }
            }

            // The composer is pinned to the bottom, like a chat.
            PromptBar(player: player)
                .padding(.horizontal, 20)
                .padding(.top, 10)
                .padding(.bottom, 18)
        }
        .ignoresSafeArea(.container, edges: .top)
        .frame(minWidth: 520, minHeight: 520)
        .background(WindowBackground())
    }
}

/// The title bar area. The window hides the system title bar, so this keeps
/// the window controls clear of the content and shows the title.
struct TitleBar: View {
    var body: some View {
        Text("json-render")
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity)
            .frame(height: 28)
            .allowsHitTesting(false)
    }
}

/// A short gradient from the window background to clear.
struct EdgeFade: View {
    let edge: VerticalEdge

    var body: some View {
        let background = Color(nsColor: .windowBackgroundColor)
        // At the top, a solid band below the title bar hides a line before
        // it reaches the bar, so the scroll area starts with a clean edge.
        LinearGradient(
            stops: edge == .top
                ? [.init(color: background, location: 0), .init(color: background, location: 0.6), .init(color: background.opacity(0), location: 1)]
                : [.init(color: background, location: 0), .init(color: background.opacity(0), location: 1)],
            startPoint: edge == .top ? .top : .bottom,
            endPoint: edge == .top ? .bottom : .top
        )
        .frame(height: edge == .top ? 24 : 14)
        .allowsHitTesting(false)
    }
}

struct WindowBackground: View {
    var body: some View {
        Color(nsColor: .windowBackgroundColor).ignoresSafeArea()
    }
}

struct PromptBar: View {
    @ObservedObject var player: StreamPlayer

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .bottom, spacing: 10) {
                TextField("Describe an interface", text: $player.prompt, axis: .vertical)
                    .lineLimit(1...3)
                    .textFieldStyle(.plain)
                    .font(.system(size: 15 * scale))
                    .padding(.vertical, 5 * scale)
                    .onSubmit { player.submit() }

                SendButton(
                    generating: player.isGenerating,
                    enabled: player.isGenerating || !player.prompt.trimmingCharacters(in: .whitespaces).isEmpty
                ) {
                    if player.isGenerating {
                        player.reset()
                    } else if !player.isBusy {
                        player.submit()
                    }
                }
            }
            .padding(.leading, 14)
            .padding(.trailing, 7)
            .padding(.vertical, 7)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color(nsColor: .controlBackgroundColor))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Color.primary.opacity(0.12), lineWidth: 1)
            )
        }
    }
}

/// Shows a send arrow, dimmed while the field is empty, and a stop control
/// while a response streams.
struct SendButton: View {
    let generating: Bool
    let enabled: Bool
    let action: () -> Void
    @StateObject private var press = PressState()

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(enabled ? Color.accentColor : Color.secondary.opacity(0.3))
                Image(systemName: generating ? "stop.fill" : "arrow.up")
                    .font(.system(size: (generating ? 10 : 13) * scale, weight: .bold))
                    .foregroundStyle(.white.opacity(enabled ? 1 : 0.6))
                    .id(generating)
                    .transition(.scale(scale: 0.6).combined(with: .opacity))
            }
            .frame(width: 26 * scale, height: 26 * scale)
            .scaleEffect(press.on ? 0.88 : 1)
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .animation(.easeInOut(duration: 0.2), value: generating)
        .animation(.easeInOut(duration: 0.15), value: enabled)
        .onChange(of: generating) { generating in
            // A short press when the prompt is sent.
            guard generating else { return }
            withAnimation(.easeOut(duration: 0.1)) { press.on = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) { press.on = false }
            }
        }
    }
}

struct ViewportHeightKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

struct ElementTopsKey: PreferenceKey {
    static var defaultValue: [CGFloat] = []
    static func reduce(value: inout [CGFloat], nextValue: () -> [CGFloat]) {
        value.append(contentsOf: nextValue())
    }
}

struct ContentHeightKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

final class PressState: ObservableObject {
    @Published var on = false
}

struct EmptyStateView: View {
    @ObservedObject var player: StreamPlayer

    var body: some View {
        if player.phase == .waiting || player.phase == .streaming {
            // A quiet line where the response will appear, like a chat.
            ThinkingIndicator()
                .padding(.horizontal, 28)
                .padding(.top, 24)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .allowsHitTesting(false)
        } else {
            idleHint
        }
    }

    private var idleHint: some View {
        VStack(spacing: 10) {
            if player.phase == .idle {
                Image(systemName: "rectangle.3.group")
                    .font(.system(size: 30, weight: .light))
                    .foregroundStyle(.tertiary)
                Text("Press Return to generate")
                    .font(.system(size: 12 * scale))
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .allowsHitTesting(false)
    }
}

/// "Thinking" followed by three dots that pulse in turn.
struct ThinkingIndicator: View {
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text("Thinking")
            TimelineView(.animation) { timeline in
                let time = timeline.date.timeIntervalSinceReferenceDate
                HStack(spacing: 3 * scale) {
                    ForEach(0..<3, id: \.self) { index in
                        let phase = time * 4 - Double(index) * 0.8
                        Circle()
                            .frame(width: 3.5 * scale, height: 3.5 * scale)
                            .opacity(0.3 + 0.7 * max(0, sin(phase)))
                    }
                }
            }
        }
        .font(.system(size: 13 * scale))
        .foregroundStyle(.secondary)
    }
}

struct ToastView: View {
    let message: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
            Text(message)
                .font(.system(size: 12 * scale, weight: .medium))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.regularMaterial, in: Capsule())
        .overlay(Capsule().strokeBorder(Color.primary.opacity(0.08), lineWidth: 1))
        .shadow(color: .black.opacity(0.15), radius: 12, y: 4)
    }
}
#else
@main
struct StreamingDemoApp {
    static func main() {
        print("The streaming demo requires SwiftUI on macOS. Build and run it on a Mac.")
    }
}
#endif
