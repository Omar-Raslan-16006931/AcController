import Foundation
import ActivityKit

/// Shared by the app (which starts / updates the Live Activity) and the
/// widget extension (which draws it in the Dynamic Island and on the lock
/// screen). Compiled into both targets.
@available(iOS 16.1, *)
struct ACActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var power: Bool
        var temperature: Int
        var mode: String
        var fan: String
        /// "turn_on" / "turn_off" when a timer is running.
        var timerAction: String?
        /// When that timer fires. iOS counts down to it by itself, so the
        /// island stays correct even with the app closed.
        var timerEnd: Date?
        /// Short message shown instead of the On/Off pill when a button
        /// press failed ("Couldn't reach the AC"). Cleared by the next
        /// successful press or by the app refreshing the activity.
        var note: String?
    }

    var room: String
}
