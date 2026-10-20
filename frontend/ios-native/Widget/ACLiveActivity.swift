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

/// Shorter, for the chips ("Medium" -> "Med").
private func fanShort(_ fan: String) -> String {
    fan == "medium" ? "Med" : fanLabel(fan)
}

/// Accent colour for the whole activity: follows the mode, grey when off.
private func tint(_ s: ACState) -> Color {
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

/// Round mode icon: the activity's "logo".
private struct ModeBadge: View {
    let state: ACState
    var size: CGFloat = 30

    var body: some View {
        Image(systemName: modeSymbol(state.mode))
            .font(.system(size: size * 0.44, weight: .semibold))
            .foregroundStyle(tint(state))
            .frame(width: size, height: size)
            .background(Circle().fill(tint(state).opacity(0.18)))
    }
}

/// "On" / "Off" pill, or the reason the last button press failed.
private struct StatusPill: View {
    let state: ACState

    var body: some View {
        let color: Color = state.note != nil ? warm : (state.power ? onGreen : offRed)
        HStack(spacing: 5) {
            if state.note != nil {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 10, weight: .bold))
            } else {
                Circle().fill(color).frame(width: 6, height: 6)
            }
            Text(state.note ?? (state.power ? "On" : "Off"))
                .font(.system(size: 12, weight: .semibold))
                .lineLimit(1)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 10)
        .frame(height: 24)
        .background(Capsule().fill(color.opacity(0.16)))
    }
}

/// Round glyph button face (+ / -).
private struct GlyphLabel: View {
    let symbol: String
    let color: Color
    var enabled = true

    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(color)
            .frame(width: 40, height: 40)
            .background(Circle().fill(Color.white.opacity(0.10)))
            .overlay(Circle().strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
            .opacity(enabled ? 1 : 0.35)
    }
}

/// Capsule button face (mode / fan / timer).
private struct ChipLabel: View {
    let symbol: String
    let text: String
    let color: Color
    var enabled = true

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: symbol)
                .font(.system(size: 12, weight: .semibold))
            Text(text)
                .font(.system(size: 13, weight: .semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .foregroundStyle(color)
        .frame(maxWidth: .infinity)
        .frame(height: 34)
        .background(Capsule().fill(Color.white.opacity(0.10)))
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
        .opacity(enabled ? 1 : 0.35)
    }
}

/// Timer shown as the third chip: icon + live countdown.
private struct TimerChip: View {
    let end: Date
    let turnsOff: Bool

    var body: some View {
        let color = turnsOff ? offRed : onGreen
        HStack(spacing: 5) {
            Image(systemName: "timer")
                .font(.system(size: 12, weight: .semibold))
            Countdown(end: end)
                .font(.system(size: 13, weight: .semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .foregroundStyle(color)
        .frame(maxWidth: .infinity)
        .frame(height: 34)
        .background(Capsule().fill(color.opacity(0.16)))
    }
}

private struct PowerLabel: View {
    let on: Bool
    var size: CGFloat = 44

    var body: some View {
        Image(systemName: "power")
            .font(.system(size: size * 0.4, weight: .bold))
            .foregroundStyle(on ? ink : offRed)
            .frame(width: size, height: size)
            .background(Circle().fill(on ? onGreen : Color.white.opacity(0.12)))
    }
}

private struct BigTemperature: View {
    let state: ACState
    var size: CGFloat = 40

    var body: some View {
        Text("\(state.temperature)°")
            .font(.system(size: size, weight: .semibold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(state.power ? Color.white : Color.white.opacity(0.4))
            .minimumScaleFactor(0.7)
            .lineLimit(1)
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
private struct PowerButton: View {
    let state: ACState
    var size: CGFloat = 44

    var body: some View {
        IntentButton(ACPowerIntent()) { PowerLabel(on: state.power, size: size) }
    }
}

@available(iOS 17.0, *)
private struct TemperatureButtons: View {
    let state: ACState

    var body: some View {
        let canDown = state.power && state.temperature > ACIslandActions.temperatureRange.lowerBound
        let canUp = state.power && state.temperature < ACIslandActions.temperatureRange.upperBound
        HStack(spacing: 8) {
            IntentButton(ACTempIntent(delta: -1)) {
                GlyphLabel(symbol: "minus", color: tint(state), enabled: canDown)
            }
            .disabled(!canDown)
            IntentButton(ACTempIntent(delta: 1)) {
                GlyphLabel(symbol: "plus", color: tint(state), enabled: canUp)
            }
            .disabled(!canUp)
        }
    }
}

@available(iOS 17.0, *)
private struct ModeFanChips: View {
    let state: ACState

    var body: some View {
        IntentButton(ACModeIntent()) {
            ChipLabel(symbol: modeSymbol(state.mode), text: modeLabel(state.mode), color: tint(state), enabled: state.power)
        }
        .disabled(!state.power)
        IntentButton(ACFanIntent()) {
            ChipLabel(symbol: "fan.fill", text: fanShort(state.fan), color: tint(state), enabled: state.power)
        }
        .disabled(!state.power)
    }
}

// MARK: - Lock screen / banner

private struct LockScreenView: View {
    let state: ACState
    let room: String

    var body: some View {
        let timer = activeTimer(state)
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                ModeBadge(state: state, size: 24)
                Text("\(room) AC")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.7))
                Spacer()
                StatusPill(state: state)
            }

            if #available(iOS 17.0, *) {
                HStack(spacing: 12) {
                    HStack(spacing: 10) {
                        TemperatureButtons(state: state)
                        BigTemperature(state: state)
                    }
                    Spacer(minLength: 0)
                    PowerButton(state: state)
                }
                HStack(spacing: 8) {
                    ModeFanChips(state: state)
                    if let timer = timer {
                        TimerChip(end: timer.end, turnsOff: timer.turnsOff)
                    }
                }
            } else {
                // iOS 16.2: button intents don't exist, show the state only.
                HStack {
                    BigTemperature(state: state)
                    Spacer()
                    Text("\(modeLabel(state.mode)) · \(fanLabel(state.fan))")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white.opacity(0.7))
                }
                if let timer = timer {
                    HStack {
                        TimerChip(end: timer.end, turnsOff: timer.turnsOff)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RadialGradient(
                colors: [tint(state).opacity(0.22), .clear],
                center: .topLeading,
                startRadius: 0,
                endRadius: 260
            )
        )
    }
}

// MARK: - Dynamic Island

struct ACLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ACActivityAttributes.self) { context in
            LockScreenView(state: context.state, room: context.attributes.room)
                .activityBackgroundTint(Color(red: 0.03, green: 0.07, blue: 0.14).opacity(0.92))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let s = context.state
            let timer = activeTimer(s)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        ModeBadge(state: s, size: 34)
                        VStack(alignment: .leading, spacing: 0) {
                            BigTemperature(state: s, size: 30)
                            Text(s.power ? "\(modeLabel(s.mode)) · \(fanLabel(s.fan))" : "Off")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if #available(iOS 17.0, *) {
                        PowerButton(state: s, size: 46)
                            .padding(.trailing, 4)
                    } else {
                        StatusPill(state: s)
                            .padding(.trailing, 4)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        if #available(iOS 17.0, *) {
                            HStack(spacing: 8) {
                                TemperatureButtons(state: s)
                                ModeFanChips(state: s)
                            }
                        }
                        if let note = s.note {
                            Label(note, systemImage: "exclamationmark.triangle.fill")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(warm)
                        } else if let timer = timer {
                            HStack(spacing: 6) {
                                Image(systemName: "timer")
                                Text(timer.turnsOff ? "Turns off in" : "Turns on in")
                                Countdown(end: timer.end)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(timer.turnsOff ? offRed : onGreen)
                            }
                            .font(.system(size: 13))
                        } else if s.power == false {
                            Text("\(context.attributes.room) AC is off")
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.top, 4)
                }
            } compactLeading: {
                Image(systemName: timer != nil ? "timer" : modeSymbol(s.mode))
                    .foregroundStyle(tint(s))
            } compactTrailing: {
                if let timer = timer {
                    Countdown(end: timer.end)
                        .frame(maxWidth: 52)
                        .foregroundStyle(timer.turnsOff ? offRed : onGreen)
                } else {
                    Text(s.power ? "\(s.temperature)°" : "Off")
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(tint(s))
                }
            } minimal: {
                Image(systemName: timer != nil ? "timer" : modeSymbol(s.mode))
                    .foregroundStyle(tint(s))
            }
            .keylineTint(tint(s))
        }
    }
}
