import UIKit
import UserNotifications

/// UIApplicationDelegate adapter that owns APNS push registration and the
/// device-token round-trip to the `register-device-token` edge function.
///
/// Adopted from CriderGPTApp via @UIApplicationDelegateAdaptor.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    /// Call from anywhere (e.g. Profile → "Enable notifications") to prompt for
    /// permission and register with APNS. The OS will then call
    /// `didRegisterForRemoteNotificationsWithDeviceToken`.
    static func requestPushAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            guard granted else { return }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        Task { await PushRegistration.register(token: token) }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[Push] APNS registration failed: \(error.localizedDescription)")
    }

    // Show banners while the app is in foreground.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }
}

enum PushRegistration {
    static func register(token: String) async {
        do {
            let label = await UIDevice.current.name
            struct Body: Encodable {
                let platform: String
                let token: String
                let device_label: String
            }
            _ = try await SB.client.functions.invoke(
                "register-device-token",
                options: FunctionInvokeOptions(body: Body(
                    platform: "ios", token: token, device_label: label
                ))
            )
            print("[Push] registered APNS token")
        } catch {
            print("[Push] failed to upload token: \(error)")
        }
    }
}
