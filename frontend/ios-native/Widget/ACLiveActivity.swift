import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

// Palette follows the app's "night glass" look: ice blue for cooling, a warm
// amber for heat, mint for dry, grey when the AC is off.
private let ice = Color(red: 0.56, green: 0.83, blue: 1.0)
private let warm = Color(red: 1.0, green: 0.66, blue: 0.36)
private let mint = Color(red: 0.37, green: 0.88, blue: 0.78)
private let onGreen = Color(red: 0.24, green: 0.88, blue: 0.56)
private let offRed = Color(red: 1.0, green: 0.42, blue: 0.37)
private let ink = Color(red: 0.02, green: 0.04, blue: 0.08)

private typealias ACState = ACActivityAttributes.ContentState

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

/// Accent colour for the whole activity: follows the mode, grey when off.
private func accent(_ s: ACState) -> Color {
    guard s.power else { return .gray }
    switch s.mode {
    case "heat": return warm
    case "dry": return mint
    default: return ice
    }
}

/// Running timer, or nil once it has fired.
private func activeTimer(_ s: ACState) -> (end: Date, turnsOff: Bool)? {
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

// MARK: - Building blocks
//
// Both the island and the lock screen are built from two pieces:
//   Header   one line: mode icon + "Cool" on the left,
//            On/Off, a running timer or an error on the right
//   Controls one row: [ - 24° + ]  [fan]  [power]

private let rowHeight: CGFloat = 40

private struct Title: View {
    let state: ACState

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: modeSymbol(state.mode))
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(accent(state))
            Text(modeLabel(state.mode))
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white.opacity(0.75))
                .lineLimit(1)
        }
    }
}

/// Right side of the header: failure reason, else the running timer, else On/Off.
private struct Status: View {
    let state: ACState

    var body: some View {
        if let note = state.note {
            HStack(spacing: 4) {
                Image(systemName: "exclamationmark.triangle.fill")
                Text(note).lineLimit(1).minimumScaleFactor(0.7)
            }
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(warm)
        } else if let timer = activeTimer(state) {
            let color = timer.turnsOff ? offRed : onGreen
            HStack(spacing: 4) {
                Image(systemName: "timer")
                Text(timer.turnsOff ? "Off in" : "On in")
                Countdown(end: timer.end)
                    .frame(maxWidth: 56, alignment: .leading)
            }
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(color)
        } else {
            let color = state.power ? onGreen : offRed
            HStack(spacing: 5) {
                Circle().fill(color).frame(width: 6, height: 6)
                Text(state.power ? "On" : "Off")
            }
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(color)
        }
    }
}

/// iOS 16.2 has no button intents: show the numbers instead of the controls.
private struct ReadOnlyRow: View {
    let state: ACState

    var body: some View {
        HStack {
            Text("\(state.temperature)°")
                .font(.system(size: 28, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(state.power ? Color.white : Color.white.opacity(0.4))
            Spacer()
            Text("\(modeLabel(state.mode)) · \(fanLabel(state.fan))")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white.opacity(0.7))
        }
        .frame(height: rowHeight)
    }
}

// MARK: - Interactive controls (iOS 17+)

@available(iOS 17.0, *)
private struct IntentButton<I: AppIntent, Face: View>: View {
    let intent: I
    let label: Face

    init(_ intent: I, @ViewBuilder label: () -> Face) {
        self.intent = intent
        self.label = label()
    }

    var body: some View {
        Button(intent: intent) { label }
            .buttonStyle(.plain)
    }
}

@available(iOS 17.0, *)
private struct TemperatureStepper: View {
    let state: ACState

    var body: some View {
        let canDown = state.power && state.temperature > ACIslandActions.temperatureRange.lowerBound
        let canUp = state.power && state.temperature < ACIslandActions.temperatureRange.upperBound
        HStack(spacing: 0) {
            IntentButton(ACTempIntent(delta: -1)) {
                StepLabel(symbol: "minus", color: accent(state), enabled: canDown)
            }
            .disabled(!canDown)

            Text("\(state.temperature)°")
                .font(.system(size: 20, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(state.power ? Color.white : Color.white.opacity(0.4))
                .frame(maxWidth: .infinity)

            IntentButton(ACTempIntent(delta: 1)) {
                StepLabel(symbol: "plus", color: accent(state), enabled: canUp)
            }
            .disabled(!canUp)
        }
        .frame(height: rowHeight)
        .background(Capsule().fill(Color.white.opacity(0.10)))
    }
}

private struct StepLabel: View {
    let symbol: String
    let color: Color
    let enabled: Bool

    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(color)
            .frame(width: 46, height: rowHeight)
            .contentShape(Rectangle())
            .opacity(enabled ? 1 : 0.3)
    }
}

@available(iOS 17.0, *)
private struct FanButton: View {
    let state: ACState

    var body: some View {
        IntentButton(ACFanIntent()) {
            HStack(spacing: 5) {
                Image(systemName: "fan.fill")
                    .font(.system(size: 12, weight: .semibold))
                Text(fanLabel(state.fan))
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)
            }
            .foregroundStyle(accent(state))
            .frame(width: 92, height: rowHeight)
            .background(Capsule().fill(Color.white.opacity(0.10)))
            .opacity(state.power ? 1 : 0.35)
        }
        .disabled(!state.power)
    }
}

@available(iOS 17.0, *)
private struct PowerButton: View {
    let state: ACState

    var body: some View {
        IntentButton(ACPowerIntent()) {
            Image(systemName: "power")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(state.power ? ink : offRed)
                .frame(width: rowHeight, height: rowHeight)
                .background(Circle().fill(state.power ? onGreen : Color.white.opacity(0.12)))
        }
    }
}

@available(iOS 17.0, *)
private struct Controls: View {
    let state: ACState

    var body: some View {
        HStack(spacing: 8) {
            TemperatureStepper(state: state)
            FanButton(state: state)
            PowerButton(state: state)
        }
    }
}

// MARK: - Lock screen / banner

private struct LockScreenView: View {
    let state: ACState

    var body: some View {
        VStack(spacing: 10) {
            HStack {
                Title(state: state)
                Spacer(minLength: 8)
                Status(state: state)
            }
            if #available(iOS 17.0, *) {
                Controls(state: state)
            } else {
                ReadOnlyRow(state: state)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RadialGradient(
                colors: [accent(state).opacity(0.20), .clear],
                center: .topLeading,
                startRadius: 0,
                endRadius: 240
            )
        )
    }
}

// MARK: - Dynamic Island

struct ACLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ACActivityAttributes.self) { context in
            LockScreenView(state: context.state)
                .activityBackgroundTint(Color(red: 0.03, green: 0.07, blue: 0.14).opacity(0.92))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let s = context.state
            let timer = activeTimer(s)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Title(state: s)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Status(state: s)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if #available(iOS 17.0, *) {
                        Controls(state: s)
                    } else {
                        ReadOnlyRow(state: s)
                    }
                }
            } compactLeading: {
                Image(systemName: timer != nil ? "timer" : modeSymbol(s.mode))
                    .foregroundStyle(accent(s))
            } compactTrailing: {
                if let timer = timer {
                    Countdown(end: timer.end)
                        .frame(maxWidth: 52)
                        .foregroundStyle(timer.turnsOff ? offRed : onGreen)
                } else {
                    Text(s.power ? "\(s.temperature)°" : "Off")
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(accent(s))
                }
            } minimal: {
                Image(systemName: timer != nil ? "timer" : modeSymbol(s.mode))
                    .foregroundStyle(accent(s))
            }
            .keylineTint(accent(s))
        }
    }
}
