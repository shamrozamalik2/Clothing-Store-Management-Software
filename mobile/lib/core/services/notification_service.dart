import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

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

// Must match AndroidManifest.xml's com.google.firebase.messaging.default_notification_channel_id
// meta-data, and the channel created below — FCM notification payloads that
// arrive while the app is backgrounded/killed are auto-shown by the OS
// through this channel, so its id has to agree in both places.
const _kAndroidChannelId   = 'default_channel';
const _kAndroidChannelName = 'General';

class NotificationService {
  NotificationService._();

  static final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  // ── Initialise ─────────────────────────────────────────────────────────────

  /// Call once from `main()` after `Firebase.initializeApp()`.
  static Future<void> init() async {
    // Register the background handler.
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    // Android only auto-shows an FCM notification's banner for you when the
    // app is backgrounded or not running at all — while it's open, nothing
    // appears unless the app explicitly draws one itself. This sets up the
    // plugin and channel that onMessage() below uses to do that.
    await _localNotifications.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
    );
    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(const AndroidNotificationChannel(
          _kAndroidChannelId,
          _kAndroidChannelName,
          importance: Importance.high,
        ));

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
      // Token retrieval can fail (e.g. no APNs token available yet on iOS
      // Simulator, or a slow/denied registration) — don't let that crash
      // app startup.
      try {
        // Retrieve the APNs token first on iOS (no-op on Android).
        await _fcm.getAPNSToken();

        final token = await _fcm.getToken();
        assert(() {
          // ignore: avoid_print
          print('[FCM] device token: $token');
          return true;
        }());
      } catch (e) {
        assert(() {
          // ignore: avoid_print
          print('[FCM] token retrieval failed: $e');
          return true;
        }());
      }

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

  /// Listen to messages received while the app is in the foreground. Always
  /// draws the system notification banner first — iOS does this itself via
  /// setForegroundNotificationPresentationOptions, Android does not — then
  /// calls [handler] for any additional in-app handling (badges, lists, etc).
  static void onMessage(void Function(RemoteMessage message) handler) {
    FirebaseMessaging.onMessage.listen((message) {
      _showForegroundNotification(message);
      handler(message);
    });
  }

  static Future<void> _showForegroundNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;
    try {
      await _localNotifications.show(
        id: message.hashCode,
        title: notification.title,
        body: notification.body,
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            _kAndroidChannelId,
            _kAndroidChannelName,
            importance: Importance.high,
            priority: Priority.high,
          ),
        ),
      );
    } catch (_) {
      // A missing/misconfigured plugin must never crash message handling —
      // the in-app handler (badge, notifications list) still runs either way.
    }
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
