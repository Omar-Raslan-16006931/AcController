import UIKit
import Capacitor

/// Replaces the AppDelegate that `npx cap add ios` generates (the build copies
/// it over that one, and removes UIMainStoryboardFile from Info.plist).
///
/// The only difference: the window, and with it Capacitor's web view and the
/// whole website, is built when the app actually comes on screen. When iOS
/// starts the app in the background just to run a Dynamic Island button, it
/// used to boot the web view and download the site before the button's code
/// could run; now it starts almost nothing, so the island updates at once.
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if application.applicationState != .background {
            showUI()
        }
        return true
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        showUI()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        showUI()
    }

    /// Builds the window from Main.storyboard (MainViewController) once.
    private func showUI() {
        guard window == nil else { return }
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = UIStoryboard(name: "Main", bundle: nil).instantiateInitialViewController()
        window.makeKeyAndVisible()
        self.window = window
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
