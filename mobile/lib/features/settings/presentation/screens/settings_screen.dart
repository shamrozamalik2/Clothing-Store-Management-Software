import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../../../../core/constants/storage_keys.dart';
import '../../../../core/widgets/grad_widgets.dart';
import '../providers/settings_provider.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../shell/main_shell.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs        = Theme.of(context).colorScheme;
    final user      = ref.watch(currentUserProvider);
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // ── App bar ───────────────────────────────────────────────────────
          SliverAppBar(
            floating:         true,
            snap:             true,
            backgroundColor:  cs.surface,
            surfaceTintColor: Colors.transparent,
            elevation:        0,
            leading: IconButton(
              icon:      const Icon(Icons.menu_rounded),
              onPressed: () =>
                  MainShell.scaffoldKey.currentState?.openDrawer(),
            ),
            title: Row(
              children: [
                const GradIconBox(
                  icon:         Icons.settings_rounded,
                  colors:       kGradViolet,
                  size:         32,
                  iconSize:     16,
                  borderRadius: 9,
                ),
                const SizedBox(width: 10),
                ShaderMask(
                  shaderCallback: (b) =>
                      const LinearGradient(colors: kGradViolet)
                          .createShader(b),
                  child: const Text(
                    'Settings',
                    style: TextStyle(
                      color:      Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize:   18,
                    ),
                  ),
                ),
              ],
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(1),
              child: Container(
                height: 1,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: kGradViolet),
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Profile ───────────────────────────────────────────────
                const _SectionLabel('Profile'),
                _GradCard(
                  colors: kGradPrimary,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        (user?.avatar != null && user!.avatar!.isNotEmpty)
                            ? Container(
                                width:  56,
                                height: 56,
                                decoration: BoxDecoration(
                                  shape:    BoxShape.circle,
                                  gradient: const LinearGradient(
                                    begin:  Alignment.topLeft,
                                    end:    Alignment.bottomRight,
                                    colors: kGradPrimary,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color:      kGradPrimary[0]
                                          .withValues(alpha: 0.28),
                                      blurRadius: 12,
                                      offset:     const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: ClipOval(
                                  child: Image.network(user.avatar!,
                                      fit: BoxFit.cover),
                                ),
                              )
                            : GradAvatar(
                                name:   user?.name ?? '?',
                                radius: 28,
                                colors: kGradPrimary,
                              ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ShaderMask(
                                shaderCallback: (b) =>
                                    const LinearGradient(
                                            colors: kGradPrimary)
                                        .createShader(b),
                                child: Text(
                                  user?.name ?? '—',
                                  style: const TextStyle(
                                    color:      Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize:   16,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                user?.email ?? '—',
                                style: TextStyle(
                                  color:    cs.onSurfaceVariant,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 4),
                              _RoleBadge(role: user?.roleName ?? ''),
                            ],
                          ),
                        ),
                        // Edit profile button
                        GestureDetector(
                          onTap: () => _showEditProfileSheet(context, ref),
                          child: Container(
                            width:  34,
                            height: 34,
                            decoration: BoxDecoration(
                              color:        kGradPrimary[0]
                                  .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                  color: kGradPrimary[0]
                                      .withValues(alpha: 0.2)),
                            ),
                            child: Icon(
                              Icons.edit_rounded,
                              color: kGradPrimary[0],
                              size:  17,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // ── Company ───────────────────────────────────────────────
                const _SectionLabel('Company'),
                _GradCard(
                  colors: kGradElectric,
                  child: Column(
                    children: [
                      _InfoTile(
                        icon:    Icons.business_rounded,
                        label:   'Company Name',
                        value:   user?.companyName ?? '—',
                        colors:  kGradElectric,
                        onEdit:  () =>
                            _showEditCompanySheet(context, ref, user?.companyName ?? ''),
                      ),
                      Divider(
                        indent:    56,
                        endIndent: 0,
                        height:    1,
                        color: cs.outlineVariant.withValues(alpha: 0.5),
                      ),
                      _InfoTile(
                        icon:   Icons.tag_rounded,
                        label:  'Company Code',
                        value:  user?.companySlug ?? '—',
                        colors: kGradElectric,
                      ),
                    ],
                  ),
                ),

                // ── Appearance ────────────────────────────────────────────
                const _SectionLabel('Appearance'),
                _GradCard(
                  colors: kGradViolet,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            GradIconBox(
                              icon:         Icons.palette_outlined,
                              colors:       kGradViolet,
                              size:         32,
                              iconSize:     16,
                              borderRadius: 9,
                            ),
                            SizedBox(width: 12),
                            Text('Theme',
                                style: TextStyle(
                                    fontWeight: FontWeight.w600)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SegmentedButton<ThemeMode>(
                          segments: const [
                            ButtonSegment(
                              value: ThemeMode.light,
                              label: Text('Light'),
                              icon: Icon(Icons.light_mode_rounded, size: 16),
                            ),
                            ButtonSegment(
                              value: ThemeMode.dark,
                              label: Text('Dark'),
                              icon: Icon(Icons.dark_mode_rounded, size: 16),
                            ),
                            ButtonSegment(
                              value: ThemeMode.system,
                              label: Text('System'),
                              icon: Icon(Icons.brightness_auto_rounded,
                                  size: 16),
                            ),
                          ],
                          selected: {themeMode},
                          onSelectionChanged: (s) => ref
                              .read(themeModeProvider.notifier)
                              .setMode(s.first),
                          style: SegmentedButton.styleFrom(
                            visualDensity: VisualDensity.compact,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // ── Security ──────────────────────────────────────────────
                const _SectionLabel('Security'),
                Container(
                  margin: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 4),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Material(
                      color: cs.surfaceContainer,
                      child: Column(
                        children: [
                          Container(
                            height:     3,
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(colors: kGradGreen),
                            ),
                          ),
                          ListTile(
                            leading: const GradIconBox(
                              icon:         Icons.pin_rounded,
                              colors:       kGradGreen,
                              size:         36,
                              iconSize:     18,
                              borderRadius: 10,
                            ),
                            title:   const Text('Set PIN Code'),
                            trailing: Icon(Icons.chevron_right_rounded,
                                color: cs.onSurfaceVariant),
                            onTap: () => _showPinSetupSheet(context),
                          ),
                          Divider(
                            indent:    56,
                            endIndent: 0,
                            height:    1,
                            color: cs.outlineVariant
                                .withValues(alpha: 0.5),
                          ),
                          const _BiometricTile(),
                        ],
                      ),
                    ),
                  ),
                ),

                // ── Logout ────────────────────────────────────────────────
                const SizedBox(height: 24),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: GestureDetector(
                    onTap: () => _confirmLogout(context, ref),
                    child: Container(
                      height: 52,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color:      const Color(0xFFEF4444)
                                .withValues(alpha: 0.3),
                            blurRadius: 12,
                            offset:     const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.logout_rounded,
                              color: Colors.white, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'Logout',
                            style: TextStyle(
                              color:      Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize:   15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // ── Version ───────────────────────────────────────────────
                const SizedBox(height: 32),
                Center(
                  child: ShaderMask(
                    shaderCallback: (b) =>
                        const LinearGradient(colors: kGradViolet)
                            .createShader(b),
                    child: Text(
                      'v1.0.0',
                      style: TextStyle(
                        fontSize:   12,
                        fontWeight: FontWeight.w600,
                        color: cs.onSurfaceVariant
                            .withValues(alpha: 0.6),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Sheet helpers ─────────────────────────────────────────────────────────

  void _showEditProfileSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context:            context,
      isScrollControlled: true,
      showDragHandle:     true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _EditProfileSheet(ref: ref),
    );
  }

  void _showEditCompanySheet(
      BuildContext context, WidgetRef ref, String current) {
    showModalBottomSheet<void>(
      context:            context,
      isScrollControlled: true,
      showDragHandle:     true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) =>
          _EditCompanySheet(ref: ref, currentName: current),
    );
  }

  void _showPinSetupSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context:            context,
      isScrollControlled: true,
      builder:            (_) => const _PinSetupSheet(),
    );
  }

  void _confirmLogout(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title:   const Text('Logout'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child:     const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
              foregroundColor: Theme.of(ctx).colorScheme.onError,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              await ref.read(authProvider.notifier).logout();
              // ignore: use_build_context_synchronously
              if (context.mounted) context.go('/login');
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit profile name sheet
// ─────────────────────────────────────────────────────────────────────────────

class _EditProfileSheet extends StatefulWidget {
  const _EditProfileSheet({required this.ref});
  final WidgetRef ref;

  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  late final _nameCtrl = TextEditingController(
      text: widget.ref.read(currentUserProvider)?.name ?? '');
  bool _saving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return;
    setState(() => _saving = true);
    try {
      await widget.ref.read(authProvider.notifier).updateProfileName(name);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content:         Text('Failed: $e'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final mq = MediaQuery.of(context);

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 24 + mq.viewInsets.bottom),
      child: Column(
        mainAxisSize:       MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const GradIconBox(
                icon:         Icons.person_rounded,
                colors:       kGradPrimary,
                size:         38,
                iconSize:     19,
                borderRadius: 11,
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Edit Profile',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700)),
                  Text('Update your display name',
                      style: TextStyle(
                          color: cs.onSurfaceVariant, fontSize: 12)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          TextField(
            controller:         _nameCtrl,
            autofocus:          true,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText:  'Display Name',
              prefixIcon: Icon(Icons.badge_outlined),
            ),
          ),
          const SizedBox(height: 24),
          GradButton(
            label:    'Save Name',
            icon:     Icons.check_circle_outline_rounded,
            onPressed: _save,
            loading:  _saving,
            colors:   kGradPrimary,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit company name sheet
// ─────────────────────────────────────────────────────────────────────────────

class _EditCompanySheet extends StatefulWidget {
  const _EditCompanySheet(
      {required this.ref, required this.currentName});
  final WidgetRef ref;
  final String    currentName;

  @override
  State<_EditCompanySheet> createState() => _EditCompanySheetState();
}

class _EditCompanySheetState extends State<_EditCompanySheet> {
  late final _nameCtrl =
      TextEditingController(text: widget.currentName);
  bool _saving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return;
    setState(() => _saving = true);
    try {
      // Update in backend settings table
      await widget.ref.read(apiClientProvider).put(
        '${ApiEndpoints.settings}/company_name',
        data: {'value': name},
      );
      // Update local auth state so UI reflects instantly
      await widget.ref
          .read(authProvider.notifier)
          .updateCompanyName(name);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Company name updated')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content:         Text('Failed: $e'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final mq = MediaQuery.of(context);

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 24 + mq.viewInsets.bottom),
      child: Column(
        mainAxisSize:       MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const GradIconBox(
                icon:         Icons.business_rounded,
                colors:       kGradElectric,
                size:         38,
                iconSize:     19,
                borderRadius: 11,
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Company Name',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700)),
                  Text('Shown on receipts and reports',
                      style: TextStyle(
                          color: cs.onSurfaceVariant, fontSize: 12)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          TextField(
            controller:         _nameCtrl,
            autofocus:          true,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText:  'Company Name',
              prefixIcon: Icon(Icons.business_outlined),
            ),
          ),
          const SizedBox(height: 24),
          GradButton(
            label:    'Save',
            icon:     Icons.check_circle_outline_rounded,
            onPressed: _save,
            loading:  _saving,
            colors:   kGradElectric,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gradient card wrapper
// ─────────────────────────────────────────────────────────────────────────────

class _GradCard extends StatelessWidget {
  const _GradCard({required this.colors, required this.child});
  final List<Color> colors;
  final Widget      child;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(color: cs.surfaceContainer),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height:     3,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: colors),
                ),
              ),
              child,
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Biometric tile — local_auth
// ─────────────────────────────────────────────────────────────────────────────

const _kBiometricKey = 'biometric_lock_enabled';

class _BiometricTile extends StatefulWidget {
  const _BiometricTile();

  @override
  State<_BiometricTile> createState() => _BiometricTileState();
}

class _BiometricTileState extends State<_BiometricTile> {
  final _auth      = LocalAuthentication();
  bool _enabled    = false;
  bool _available  = false;
  bool _loading    = true;
  bool _toggling   = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final supported = await _auth.isDeviceSupported();
    final prefs     = await SharedPreferences.getInstance();
    final stored    = prefs.getBool(_kBiometricKey) ?? false;

    if (mounted) {
      setState(() {
        _available = supported; // includes PIN/pattern fallback
        _enabled   = supported && stored;
        _loading   = false;
      });
    }
  }

  Future<void> _toggle(bool value) async {
    if (!_available) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Secure lock not available on this device.'),
      ));
      return;
    }

    setState(() => _toggling = true);
    try {
      if (value) {
        final ok = await _auth.authenticate(
          localizedReason: 'Confirm to enable app lock',
          options: const AuthenticationOptions(biometricOnly: false),
        );
        if (!ok) return;
      }
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_kBiometricKey, value);
      if (mounted) setState(() => _enabled = value);
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return ListTile(
        leading: SizedBox(
          width:  24,
          height: 24,
          child:  CircularProgressIndicator(
              strokeWidth: 2, color: kGradViolet[0]),
        ),
        title: const Text('Biometric Login'),
      );
    }
    return SwitchListTile.adaptive(
      secondary: _toggling
          ? SizedBox(
              width:  36,
              height: 36,
              child:  CircularProgressIndicator(
                  strokeWidth: 2.5, color: kGradViolet[0]),
            )
          : const GradIconBox(
              icon:         Icons.fingerprint_rounded,
              colors:       kGradViolet,
              size:         36,
              iconSize:     18,
              borderRadius: 10,
            ),
      title:    const Text('Biometric Login'),
      subtitle: Text(
        _available
            ? 'Lock app with fingerprint, face or PIN'
            : 'Secure lock not available on this device',
        style: const TextStyle(fontSize: 12),
      ),
      value:     _enabled,
      onChanged: _available && !_toggling ? _toggle : null,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PIN setup bottom sheet
// ─────────────────────────────────────────────────────────────────────────────

class _PinSetupSheet extends StatefulWidget {
  const _PinSetupSheet();

  @override
  State<_PinSetupSheet> createState() => _PinSetupSheetState();
}

class _PinSetupSheetState extends State<_PinSetupSheet> {
  final _pinCtrl     = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _storage     = const FlutterSecureStorage();
  String? _error;
  bool    _saving = false;

  @override
  void dispose() {
    _pinCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs      = Theme.of(context).colorScheme;
    final padding = MediaQuery.viewInsetsOf(context);

    return Padding(
      padding: EdgeInsets.fromLTRB(24, 24, 24, 24 + padding.bottom),
      child: Column(
        mainAxisSize:       MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const GradIconBox(
                icon:         Icons.pin_rounded,
                colors:       kGradGreen,
                size:         38,
                iconSize:     19,
                borderRadius: 11,
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Set PIN Code',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700)),
                  Text('Enter a 4–6 digit PIN for quick access',
                      style: TextStyle(
                          color: cs.onSurfaceVariant, fontSize: 12)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          TextField(
            controller:      _pinCtrl,
            keyboardType:    TextInputType.number,
            obscureText:     true,
            maxLength:       6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText:   'New PIN',
              counterText: '',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller:      _confirmCtrl,
            keyboardType:    TextInputType.number,
            obscureText:     true,
            maxLength:       6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText:   'Confirm PIN',
              counterText: '',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!,
                style: TextStyle(color: cs.error, fontSize: 12)),
          ],
          const SizedBox(height: 20),
          GradButton(
            label:    'Save PIN',
            icon:     Icons.check_circle_outline_rounded,
            onPressed: _save,
            loading:  _saving,
            colors:   kGradGreen,
          ),
        ],
      ),
    );
  }

  Future<void> _save() async {
    final pin     = _pinCtrl.text.trim();
    final confirm = _confirmCtrl.text.trim();
    if (pin.length < 4) {
      setState(() => _error = 'PIN must be at least 4 digits');
      return;
    }
    if (pin != confirm) {
      setState(() => _error = 'PINs do not match');
      return;
    }
    setState(() => _saving = true);
    try {
      await _storage.write(key: kKeyPinCode, value: pin);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('PIN saved successfully')),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Failed to save PIN. Try again.');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared small widgets
// ─────────────────────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 6),
      child: Row(
        children: [
          Container(
            width:  3,
            height: 14,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(2),
              gradient: const LinearGradient(
                begin:  Alignment.topCenter,
                end:    Alignment.bottomCenter,
                colors: kGradPrimary,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            text.toUpperCase(),
            style: const TextStyle(
              fontSize:      11,
              fontWeight:    FontWeight.w700,
              letterSpacing: 0.8,
              color:         Color(0xFF6366F1),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
    this.colors = kGradPrimary,
    this.onEdit,
  });

  final IconData     icon;
  final String       label;
  final String       value;
  final List<Color>  colors;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return ListTile(
      leading: GradIconBox(
        icon:         icon,
        colors:       colors,
        size:         36,
        iconSize:     18,
        borderRadius: 10,
      ),
      title: Text(label,
          style: TextStyle(color: cs.onSurfaceVariant, fontSize: 12)),
      subtitle: Text(value,
          style: const TextStyle(
              fontWeight: FontWeight.w600, fontSize: 15)),
      trailing: onEdit != null
          ? GestureDetector(
              onTap: onEdit,
              child: Container(
                width:  30,
                height: 30,
                decoration: BoxDecoration(
                  color:        colors[0].withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: colors[0].withValues(alpha: 0.2)),
                ),
                child: Icon(Icons.edit_rounded,
                    color: colors[0], size: 15),
              ),
            )
          : null,
      onTap: onEdit,
    );
  }
}

class _RoleBadge extends StatelessWidget {
  const _RoleBadge({required this.role});
  final String role;

  @override
  Widget build(BuildContext context) {
    if (role.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin:  Alignment.topLeft,
          end:    Alignment.bottomRight,
          colors: [Color(0x254F46E5), Color(0x257C3AED)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x404F46E5)),
      ),
      child: Text(
        role[0].toUpperCase() + role.substring(1),
        style: const TextStyle(
          color:      Color(0xFF818CF8),
          fontSize:   11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
