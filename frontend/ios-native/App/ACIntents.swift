import Foundation
import ActivityKit
import AppIntents

// Control buttons for the Dynamic Island and lock screen.
//
// The buttons are App Intents (iOS 17+). A LiveActivityIntent is performed
// in the *app's* process even though the button lives in the widget, so it
// can read the settings the website handed to the plugin (UserDefaults,
// no App Group needed), call the Pi's API itself and then update the Live
// Activity. Compiled into both the app and the widget target: the widget
// needs the types to draw Button(intent:), only the app ever runs perform().

// MARK: - Settings handed over by the website

/// Where the Pi is and how to authenticate. Written by LiveActivityPlugin's
/// `configure` method whenever the website's session changes.
enum ACRemoteConfig {
    private static let store = UserDefaults.standard
    private static let apiBaseKey = "ac.remote.apiBase"
    private static let tokenKey = "ac.remote.accessToken"
    private static let expiryKey = "ac.remote.expiresAt"
    private static let shortcutKey = "ac.remote.shortcutKey"

    static var apiBase: String? { store.string(forKey: apiBaseKey) }
    static var accessToken: String? { store.string(forKey: tokenKey) }
    static var apiKey: String? { store.string(forKey: shortcutKey) }
    static var expiresAt: Date? {
        let seconds = store.double(forKey: expiryKey)
        return seconds > 0 ? Date(timeIntervalSince1970: seconds) : nil
    }

    static func save(apiBase: String?, accessToken: String?, expiresAt: Date?, apiKey: String?) {
        set(apiBase, forKey: apiBaseKey)
        set(accessToken, forKey: tokenKey)
        set(apiKey, forKey: shortcutKey)
        if let expiresAt = expiresAt {
            store.set(expiresAt.timeIntervalSince1970, forKey: expiryKey)
        } else {
            store.removeObject(forKey: expiryKey)
        }
    }

    private static func set(_ value: String?, forKey key: String) {
        if let value = value, !value.isEmpty {
            store.set(value, forKey: key)
        } else {
            store.removeObject(forKey: key)
        }
    }
}

// MARK: - Talking to the Pi

struct ACReply: Decodable {
    struct State: Decodable {
        let power: Bool
        let temperature: Int
        let mode: String
        let fan: String
    }
    let success: Bool
    let state: State?
    let message: String?
}

enum ACRemoteError: LocalizedError {
    case signedOut
    case rejected(String)
    case unreachable

    var errorDescription: String? {
        switch self {
        case .signedOut: return "Open app to sign in"
        case .rejected(let why): return why
        case .unreachable: return "Can't reach AC"
        }
    }
}

enum ACRemote {
    /// POSTs one command ("power", "temperature", "fan").
    ///
    /// Prefers the Supabase session token the website last handed over (the
    /// same /api/<command> routes the website uses). Those tokens only live
    /// about an hour and the app can't refresh them while it is closed, so
    /// when the token is stale, or rejected, it falls back to the optional
    /// Shortcuts API key (/api/shortcuts/<command>), which does not expire.
    static func send(_ command: String, body: [String: Any]) async throws -> ACReply {
        guard let base = ACRemoteConfig.apiBase?.trimmingCharacters(in: CharacterSet(charactersIn: "/ ")),
              !base.isEmpty else {
            throw ACRemoteError.signedOut
        }

        var attempts: [(path: String, header: String, value: String)] = []
        if let token = ACRemoteConfig.accessToken, !token.isEmpty,
           (ACRemoteConfig.expiresAt ?? .distantFuture) > Date().addingTimeInterval(20) {
            attempts.append(("/api/\(command)", "Authorization", "Bearer \(token)"))
        }
        if let key = ACRemoteConfig.apiKey, !key.isEmpty {
            attempts.append(("/api/shortcuts/\(command)", "X-API-Key", key))
        }
        guard !attempts.isEmpty else { throw ACRemoteError.signedOut }

        let payload = try JSONSerialization.data(withJSONObject: body)
        var lastError: Error = ACRemoteError.unreachable

        for attempt in attempts {
            guard let url = URL(string: base + attempt.path) else { continue }
            var request = URLRequest(url: url, timeoutInterval: 15)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue(attempt.value, forHTTPHeaderField: attempt.header)
            request.httpBody = payload

            let data: Data
            let response: URLResponse
            do {
                (data, response) = try await URLSession.shared.data(for: request)
            } catch {
                lastError = ACRemoteError.unreachable
                continue
            }

            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            if status == 401 || status == 403 {
                lastError = ACRemoteError.signedOut
                continue
            }
            guard (200..<300).contains(status) else {
                // FastAPI errors look like {"detail": "..."}.
                let detail = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["detail"] as? String
                throw ACRemoteError.rejected(detail ?? "The AC refused that (\(status))")
            }
            return try JSONDecoder().decode(ACReply.self, from: data)
        }
        throw lastError
    }
}

// MARK: - Applying a press to the Live Activity

@available(iOS 16.2, *)
enum ACIslandActions {
    typealias ACState = ACActivityAttributes.ContentState

    /// One button press: the API call to make and how it changes the state.
    struct Plan {
        let command: String
        let body: [String: Any]
        let apply: (inout ACState) -> Void
    }

    /// Updates the island straight away (so the tap feels instant), sends
    /// the command, then settles on what the Pi reports. On failure it puts
    /// the previous state back and shows why in `note`.
    static func run(_ makePlan: (ACState) -> Plan?) async {
        guard let activity = Activity<ACActivityAttributes>.activities.first else { return }
        let before = activity.content.state
        guard let plan = makePlan(before) else { return }

        var optimistic = before
        plan.apply(&optimistic)
        optimistic.note = nil
        await activity.update(ActivityContent(state: optimistic, staleDate: nil))

        do {
            let reply = try await ACRemote.send(plan.command, body: plan.body)
            guard reply.success, let confirmed = reply.state else {
                throw ACRemoteError.rejected(reply.message ?? "The AC didn't respond")
            }
            var settled = activity.content.state
            settled.power = confirmed.power
            settled.temperature = confirmed.temperature
            settled.mode = confirmed.mode
            settled.fan = confirmed.fan
            settled.note = nil
            await activity.update(ActivityContent(state: settled, staleDate: nil))
        } catch {
            var failed = before
            failed.note = (error as? LocalizedError)?.errorDescription ?? "Can't reach AC"
            await activity.update(ActivityContent(state: failed, staleDate: nil))
        }
    }

    static let fans = ["eco", "low", "medium", "high"]
    static let temperatureRange = 20...28

    static func next(_ values: [String], after current: String) -> String {
        let index = values.firstIndex(of: current) ?? -1
        return values[(index + 1) % values.count]
    }
}

// MARK: - The buttons

@available(iOS 17.0, *)
struct ACPowerIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Turn AC on or off"

    init() {}

    func perform() async throws -> some IntentResult {
        await ACIslandActions.run { state in
            let power = !state.power
            return ACIslandActions.Plan(command: "power", body: ["power": power], apply: { $0.power = power })
        }
        return .result()
    }
}

@available(iOS 17.0, *)
struct ACTempIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Change AC temperature"

    @Parameter(title: "Change")
    var delta: Int

    init() {}

    init(delta: Int) {
        self.delta = delta
    }

    func perform() async throws -> some IntentResult {
        let delta = self.delta
        await ACIslandActions.run { state in
            let target = min(
                max(state.temperature + delta, ACIslandActions.temperatureRange.lowerBound),
                ACIslandActions.temperatureRange.upperBound
            )
            guard target != state.temperature else { return nil }
            return ACIslandActions.Plan(command: "temperature", body: ["temperature": target], apply: { $0.temperature = target })
        }
        return .result()
    }
}

@available(iOS 17.0, *)
struct ACFanIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Change AC fan speed"

    init() {}

    func perform() async throws -> some IntentResult {
        await ACIslandActions.run { state in
            let fan = ACIslandActions.next(ACIslandActions.fans, after: state.fan)
            return ACIslandActions.Plan(command: "fan", body: ["fan": fan], apply: { $0.fan = fan })
        }
        return .result()
    }
}
