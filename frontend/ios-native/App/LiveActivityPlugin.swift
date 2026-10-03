import Foundation
import Capacitor
import UserNotifications
import ActivityKit

/// Native bridge the website calls through Capacitor
/// (window.Capacitor.nativePromise("LiveActivity", method, options)):
///   update            start or update the Dynamic Island / lock screen activity
///   end               remove it
///   testNotification  schedule a local notification after N seconds
///   availability      whether Live Activities are allowed on this phone
@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin, UNUserNotificationCenterDelegate {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "testNotification", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "availability", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        // Lets notifications show as a banner even while the app is open.
        UNUserNotificationCenter.current().delegate = self
    }

    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .list, .sound])
    }

    // MARK: - Live Activity

    @objc func availability(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            call.resolve(["liveActivities": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["liveActivities": false])
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["active": false, "reason": "Needs iOS 16.2 or later"])
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["active": false, "reason": "Live Activities are turned off in Settings"])
            return
        }

        var timerEnd: Date? = nil
        if let ms = call.getDouble("timerEnd"), ms > 0 {
            timerEnd = Date(timeIntervalSince1970: ms / 1000)
        }
        let state = ACActivityAttributes.ContentState(
            power: call.getBool("power") ?? false,
            temperature: call.getInt("temperature") ?? 24,
            mode: call.getString("mode") ?? "cool",
            fan: call.getString("fan") ?? "medium",
            timerAction: call.getString("timerAction"),
            timerEnd: timerEnd
        )
        let room = call.getString("room") ?? "Bedroom"

        Task {
            let content = ActivityContent(state: state, staleDate: nil)
            if let activity = Activity<ACActivityAttributes>.activities.first {
                await activity.update(content)
                call.resolve(["active": true])
                return
            }
            do {
                _ = try Activity.request(
                    attributes: ACActivityAttributes(room: room),
                    content: content,
                    pushType: nil
                )
                call.resolve(["active": true])
            } catch {
                call.reject("Couldn't start the Live Activity: \(error.localizedDescription)")
            }
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task {
            for activity in Activity<ACActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }

    // MARK: - Notifications

    @objc func testNotification(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()
        let seconds = max(1, call.getDouble("seconds") ?? 5)
        let title = call.getString("title") ?? "AC Controller"
        let body = call.getString("body") ?? "Test notification. Notifications work."

        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            guard granted else {
                call.reject("Notifications are off for AC Controller. Turn them on in iPhone Settings > Notifications.")
                return
            }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
            let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
            center.add(request) { error in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve(["scheduled": true])
                }
            }
        }
    }
}
