import UIKit
import Capacitor

/// Replaces Capacitor's default view controller (Main.storyboard is pointed
/// here by the build) so the app's own native plugin gets registered.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LiveActivityPlugin())
    }
}
