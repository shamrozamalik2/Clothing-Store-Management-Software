import 'package:firebase_messaging/firebase_messaging.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Background message handler — must be a top-level function.
// Registered via FirebaseMessaging.onBackgroundMessage().
// ─────────────────────────────────────────────────────────────────────────────

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Firebase is already initialised by the time this is called because the
  // isolate is started with the Flutter engine still present.
  // Add any lightweight persistence work here (e.g. write to Hive).
  // Do NOT update UI — this runs in a separate background isolate.
  debugPrintFirebaseMessage('BACKGROUND', message);
}

void debugPrintFirebaseMessage(String context, RemoteMessage message) {
  // Kept intentionally minimal; replace with your logger in production.
  assert(() {
    // ignore: avoid_print
    print('[FCM][$context] id=${message.messageId} '
        'title=${message.notification?.title} '
        'data=${message.data}');
    return true;
  }());
}

// ─────────────────────────────────────────────────────────────────────────────
// NotificationService
// ─────────────────────────────────────────────────────────────────────────────

class NotificationService {
  NotificationService._();

  static final FirebaseMessaging _fcm = FirebaseMessaging.instance;

  // ── Initialise ─────────────────────────────────────────────────────────────

  /// Call once from `main()` after `Firebase.initializeApp()`.
  static Future<void> init() async {
    // Register the background handler.
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    // Request permission (iOS + Android 13+).
    final settings = await _fcm.requestPermission(
      alert:         true,
      announcement:  false,
      badge:         true,
      carPlay:       false,
      criticalAlert: false,
      provisional:   false,
      sound:         true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional) {
      // Retrieve the APNs token first on iOS (no-op on Android).
      await _fcm.getAPNSToken();

      final token = await _fcm.getToken();
      assert(() {
        // ignore: avoid_print
        print('[FCM] device token: $token');
        return true;
      }());

      // Ensure foreground notifications are shown on iOS.
      await _fcm.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );
    }
  }

  // ── Token ──────────────────────────────────────────────────────────────────

  /// Returns the current FCM registration token, or `null` on failure.
  static Future<String?> getToken() async {
    try {
      return await _fcm.getToken();
    } catch (_) {
      return null;
    }
  }

  // ── Message listeners ──────────────────────────────────────────────────────

  /// Listen to messages received while the app is in the foreground.
  static void onMessage(void Function(RemoteMessage message) handler) {
    FirebaseMessaging.onMessage.listen(handler);
  }

  /// Listen for when the user taps a notification that opens the app from
  /// the background / terminated state.
  static void onMessageOpenedApp(void Function(RemoteMessage message) handler) {
    FirebaseMessaging.onMessageOpenedApp.listen(handler);

    // Also handle the message that opened the app from a terminated state.
    _fcm.getInitialMessage().then((message) {
      if (message != null) handler(message);
    });
  }

  // ── Topic subscriptions ───────────────────────────────────────────────────

  /// Subscribe to a topic (e.g. company slug) for broadcast notifications.
  static Future<void> subscribeToTopic(String topic) async {
    await _fcm.subscribeToTopic(_sanitiseTopic(topic));
  }

  /// Unsubscribe from a topic.
  static Future<void> unsubscribeFromTopic(String topic) async {
    await _fcm.unsubscribeFromTopic(_sanitiseTopic(topic));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /// FCM topics must match `[a-zA-Z0-9-_.~%]`.
  static String _sanitiseTopic(String topic) =>
      topic.replaceAll(RegExp(r'[^a-zA-Z0-9\-_.~%]'), '_');
}
