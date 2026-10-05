import WidgetKit
import SwiftUI

@main
struct ACWidgetBundle: WidgetBundle {
    var body: some Widget {
        ACLiveActivity()
        ACHomeWidget()
    }
}

// MARK: - Home-screen widget
//
// A small "open the remote" widget. Besides being handy, it proves the
// widget extension is installed and running: if "AC Controller" shows up in
// the home-screen widget gallery, the Dynamic Island code is on the phone.

struct ACHomeEntry: TimelineEntry {
    let date: Date
}

struct ACHomeProvider: TimelineProvider {
    func placeholder(in context: Context) -> ACHomeEntry { ACHomeEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (ACHomeEntry) -> Void) {
        completion(ACHomeEntry(date: Date()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<ACHomeEntry>) -> Void) {
        completion(Timeline(entries: [ACHomeEntry(date: Date())], policy: .never))
    }
}

struct ACHomeWidgetView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: "snowflake")
                .font(.title2)
                .foregroundStyle(Color(red: 0.56, green: 0.83, blue: 1.0))
            Spacer(minLength: 0)
            Text("AC Controller")
                .font(.headline)
                .foregroundStyle(.white)
            Text("Open remote")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .modifier(WidgetBackground())
    }
}

/// iOS 17+ wants containerBackground; older iOS uses a plain background.
private struct WidgetBackground: ViewModifier {
    @ViewBuilder
    func body(content: Content) -> some View {
        let bg = LinearGradient(
            colors: [Color(red: 0.07, green: 0.23, blue: 0.53), Color(red: 0.01, green: 0.03, blue: 0.06)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        if #available(iOS 17.0, *) {
            content.containerBackground(for: .widget) { bg }
        } else {
            content.padding().background(bg)
        }
    }
}

struct ACHomeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ACHomeWidget", provider: ACHomeProvider()) { _ in
            ACHomeWidgetView()
        }
        .configurationDisplayName("AC Controller")
        .description("Opens the remote.")
        .supportedFamilies([.systemSmall])
    }
}
