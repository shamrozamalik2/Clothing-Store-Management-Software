import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _kBiometricEnabledKey = 'biometric_lock_enabled';

// ── Provider ──────────────────────────────────────────────────────────────────

final biometricLockProvider =
    StateNotifierProvider<BiometricLockNotifier, bool>((ref) {
  return BiometricLockNotifier();
});

// ── Notifier ──────────────────────────────────────────────────────────────────

class BiometricLockNotifier extends StateNotifier<bool> {
  BiometricLockNotifier() : super(false);

  final _auth = LocalAuthentication();

  // Called by the lifecycle observer on resume
  Future<void> onResume() async {
    final prefs = await SharedPreferences.getInstance();
    final enabled = prefs.getBool(_kBiometricEnabledKey) ?? false;
    if (!enabled) return;

    // Lock the app until authenticated
    state = true;
  }

  Future<void> authenticate() async {
    try {
      final ok = await _auth.authenticate(
        localizedReason: 'Authenticate to open the app',
        options: const AuthenticationOptions(
          biometricOnly: false, // allow PIN fallback
          stickyAuth:    true,
        ),
      );
      if (ok) state = false;
    } catch (_) {
      // local_auth may throw on unsupported devices — treat as unlocked
      state = false;
    }
  }

  void unlock() => state = false;
}

// ── Lock overlay widget ───────────────────────────────────────────────────────

class BiometricLockOverlay extends ConsumerStatefulWidget {
  const BiometricLockOverlay({super.key, required this.child});
  final Widget child;

  @override
  ConsumerState<BiometricLockOverlay> createState() => _BiometricLockOverlayState();
}

class _BiometricLockOverlayState extends ConsumerState<BiometricLockOverlay>
    with WidgetsBindingObserver {

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState s) {
    if (s == AppLifecycleState.resumed) {
      ref.read(biometricLockProvider.notifier).onResume();
    }
  }

  @override
  Widget build(BuildContext context) {
    final locked = ref.watch(biometricLockProvider);
    return Stack(
      children: [
        widget.child,
        if (locked) _LockScreen(),
      ],
    );
  }
}

// ── Lock screen UI ────────────────────────────────────────────────────────────

class _LockScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      color: const Color(0xFF0C1427),
      child: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width:  80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color:      const Color(0xFF4F46E5).withValues(alpha: 0.35),
                      blurRadius: 32,
                      offset:     const Offset(0, 8),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.fingerprint_rounded,
                  color: Colors.white,
                  size:  42,
                ),
              ),
              const SizedBox(height: 28),
              const Text(
                'App Locked',
                style: TextStyle(
                  color:      Colors.white,
                  fontSize:   22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Authenticate to continue',
                style: TextStyle(
                  color:    Colors.white.withValues(alpha: 0.55),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 40),
              FilledButton.icon(
                onPressed: () =>
                    ref.read(biometricLockProvider.notifier).authenticate(),
                icon:  const Icon(Icons.fingerprint_rounded),
                label: const Text('Authenticate'),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF4F46E5),
                  foregroundColor: Colors.white,
                  minimumSize:    const Size(200, 52),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
