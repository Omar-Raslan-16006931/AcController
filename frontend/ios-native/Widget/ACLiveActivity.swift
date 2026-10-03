import ActivityKit
import WidgetKit
import SwiftUI

private let ice = Color(red: 0.56, green: 0.83, blue: 1.0)
private let onGreen = Color(red: 0.24, green: 0.88, blue: 0.56)
private let offRed = Color(red: 1.0, green: 0.42, blue: 0.37)

private func modeLabel(_ mode: String) -> String {
    switch mode {
    case "heat": return "Heat"
    case "dry": return "Dry"
    default: return "Cool"
    }
}

private func modeSymbol(_ mode: String) -> String {
    switch mode {
    case "heat": return "sun.max.fill"
    case "dry": return "drop.fill"
    default: return "snowflake"
    }
}

private func fanLabel(_ fan: String) -> String {
    guard let first = fan.first else { return fan }
    return first.uppercased() + fan.dropFirst()
}

/// Running timer, or nil once it has fired.
private func activeTimer(_ s: ACActivityAttributes.ContentState) -> (end: Date, turnsOff: Bool)? {
    guard let end = s.timerEnd, end > Date() else { return nil }
    return (end, s.timerAction != "turn_on")
}

/// "Off in 1:29:59" style countdown that iOS updates on its own.
private struct Countdown: View {
    let end: Date
    var body: some View {
        Text(timerInterval: Date()...end, countsDown: true)
            .monospacedDigit()
    }
}

struct ACLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ACActivityAttributes.self) { context in
            LockScreenView(state: context.state, room: context.attributes.room)
                .activityBackgroundTint(Color.black.opacity(0.6))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let s = context.state
            let timer = activeTimer(s)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: modeSymbol(s.mode))
                            .foregroundStyle(s.power ? ice : .gray)
                        Text("\(s.temperature)°")
                            .font(.system(size: 30, weight: .light))
                            .monospacedDigit()
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(s.power ? "On" : "Off")
                            .font(.headline)
                            .foregroundStyle(s.power ? onGreen : offRed)
                        Text("\(modeLabel(s.mode)) · \(fanLabel(s.fan))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if let timer = timer {
                        HStack(spacing: 6) {
                            Image(systemName: "timer")
                            Text(timer.turnsOff ? "Turns off in" : "Turns on in")
                            Countdown(end: timer.end)
                                .font(.body.weight(.semibold))
                                .foregroundStyle(timer.turnsOff ? offRed : onGreen)
                        }
                        .font(.subheadline)
                    } else {
                        Text(context.attributes.room)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            } compactLeading: {
                Image(systemName: timer != nil ? "timer" : modeSymbol(s.mode))
                    .foregroundStyle(s.power ? ice : .gray)
            } compactTrailing: {
                if let timer = timer {
                    Countdown(end: timer.end)
                        .frame(maxWidth: 52)
                        .foregroundStyle(timer.turnsOff ? offRed : onGreen)
                } else {
                    Text(s.power ? "\(s.temperature)°" : "Off")
                        .foregroundStyle(s.power ? ice : .gray)
                }
            } minimal: {
                Image(systemName: timer != nil ? "timer" : modeSymbol(s.mode))
                    .foregroundStyle(ice)
            }
            .keylineTint(ice)
        }
    }
}

private struct LockScreenView: View {
    let state: ACActivityAttributes.ContentState
    let room: String

    var body: some View {
        let timer = activeTimer(state)
        HStack(spacing: 14) {
            Image(systemName: modeSymbol(state.mode))
                .font(.title2)
                .foregroundStyle(state.power ? ice : .gray)
            VStack(alignment: .leading, spacing: 2) {
                Text("\(room) AC")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(state.power ? "\(state.temperature)° · \(modeLabel(state.mode)) · \(fanLabel(state.fan))" : "Off")
                    .font(.headline)
            }
            Spacer()
            if let timer = timer {
                VStack(alignment: .trailing, spacing: 2) {
                    Text(timer.turnsOff ? "Off in" : "On in")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Countdown(end: timer.end)
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(timer.turnsOff ? offRed : onGreen)
                        .multilineTextAlignment(.trailing)
                }
            }
        }
        .padding(16)
    }
}
