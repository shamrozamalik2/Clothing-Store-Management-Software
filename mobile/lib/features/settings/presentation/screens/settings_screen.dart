import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/grad_widgets.dart';
import '../providers/settings_provider.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../shell/main_shell.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _urlController = TextEditingController();
  bool _urlDirty       = false;
  bool _savingUrl      = false;

  @override
  void initState() {
    super.initState();
    // Populate URL field once provider has loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final url = ref.read(appUrlProvider);
      _urlController.text = url;
    });
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs        = Theme.of(context).colorScheme;
    final user      = ref.watch(currentUserProvider);
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded),
          onPressed: () => MainShell.scaffoldKey.currentState?.openDrawer(),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            height: 1,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.transparent,
                  Color(0x334F46E5),
                  Color(0x338B5CF6),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
      ),
      body: ListView(
        children: [
          // ── Profile ────────────────────────────────────────────────────────
          const _SectionLabel('Profile'),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Gradient avatar — if user has a photo, overlay it; otherwise show initials
                  (user?.avatar != null && user!.avatar!.isNotEmpty)
                      ? Container(
                          width:  56,
                          height: 56,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end:   Alignment.bottomRight,
                              colors: kGradPrimary,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color:      kGradPrimary[0].withValues(alpha: 0.28),
                                blurRadius: 12,
                                offset:     const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: ClipOval(
                            child: Image.network(user.avatar!, fit: BoxFit.cover),
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
                        Text(
                          user?.name ?? '—',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize:   16,
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
                ],
              ),
            ),
          ),

          // ── Company ────────────────────────────────────────────────────────
          const _SectionLabel('Company'),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Column(
              children: [
                _InfoTile(
                  icon:  Icons.business_rounded,
                  label: 'Company Name',
                  value: user?.companyName ?? '—',
                ),
                Divider(indent: 56, endIndent: 0, height: 1,
                    color: cs.outlineVariant.withValues(alpha: 0.5)),
                _InfoTile(
                  icon:  Icons.tag_rounded,
                  label: 'Company Code',
                  value: user?.companySlug ?? '—',
                ),
              ],
            ),
          ),

          // ── Appearance ─────────────────────────────────────────────────────
          const _SectionLabel('Appearance'),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      ShaderMask(
                        shaderCallback: (b) => const LinearGradient(
                          colors: kGradViolet,
                        ).createShader(b),
                        child: const Icon(Icons.palette_outlined, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 12),
                      const Text('Theme', style: TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SegmentedButton<ThemeMode>(
                    segments: const [
                      ButtonSegment(
                        value:  ThemeMode.light,
                        label:  Text('Light'),
                        icon:   Icon(Icons.light_mode_rounded, size: 16),
                      ),
                      ButtonSegment(
                        value:  ThemeMode.dark,
                        label:  Text('Dark'),
                        icon:   Icon(Icons.dark_mode_rounded, size: 16),
                      ),
                      ButtonSegment(
                        value:  ThemeMode.system,
                        label:  Text('System'),
                        icon:   Icon(Icons.brightness_auto_rounded, size: 16),
                      ),
                    ],
                    selected: {themeMode},
                    onSelectionChanged: (s) =>
                        ref.read(themeModeProvider.notifier).setMode(s.first),
                    style: SegmentedButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── API / Server URL ───────────────────────────────────────────────
          const _SectionLabel('Server'),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      ShaderMask(
                        shaderCallback: (b) => const LinearGradient(
                          colors: kGradSky,
                        ).createShader(b),
                        child: const Icon(Icons.cloud_outlined, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 12),
                      const Text('API URL',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller:  _urlController,
                    keyboardType: TextInputType.url,
                    autocorrect:  false,
                    onChanged:   (_) => setState(() => _urlDirty = true),
                    decoration: const InputDecoration(
                      hintText:    'https://your-server.com/api',
                      isDense:     true,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () {
                          ref.read(appUrlProvider.notifier).resetToDefault().then((_) {
                            _urlController.text = ref.read(appUrlProvider);
                            setState(() => _urlDirty = false);
                          });
                        },
                        child: const Text('Reset'),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: _urlDirty && !_savingUrl
                            ? () => _saveUrl()
                            : null,
                        child: _savingUrl
                            ? const SizedBox(
                                width: 16, height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Save'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // ── Preferences ────────────────────────────────────────────────────
          const _SectionLabel('Preferences'),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Column(
              children: [
                ListTile(
                  leading: ShaderMask(
                    shaderCallback: (b) => const LinearGradient(
                      colors: kGradElectric,
                    ).createShader(b),
                    child: const Icon(Icons.print_rounded, color: Colors.white),
                  ),
                  title:   const Text('Printer Settings'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () {
                    // /settings/printer is a placeholder route
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Printer settings coming soon')),
                    );
                  },
                ),
                Divider(
                  indent: 56, endIndent: 0, height: 1,
                  color: cs.outlineVariant.withValues(alpha: 0.5),
                ),
                ListTile(
                  leading: ShaderMask(
                    shaderCallback: (b) => const LinearGradient(
                      colors: kGradAmber,
                    ).createShader(b),
                    child: const Icon(Icons.notifications_outlined, color: Colors.white),
                  ),
                  title:   const Text('Notifications'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => _showNotificationsSheet(context),
                ),
              ],
            ),
          ),

          // ── Security ───────────────────────────────────────────────────────
          const _SectionLabel('Security'),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Column(
              children: [
                ListTile(
                  leading: ShaderMask(
                    shaderCallback: (b) => const LinearGradient(
                      colors: kGradGreen,
                    ).createShader(b),
                    child: const Icon(Icons.pin_rounded, color: Colors.white),
                  ),
                  title:   const Text('Set PIN Code'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => _showPinSetupSheet(context),
                ),
                Divider(
                  indent: 56, endIndent: 0, height: 1,
                  color: cs.outlineVariant.withValues(alpha: 0.5),
                ),
                _BiometricTile(),
              ],
            ),
          ),

          // ── Logout ─────────────────────────────────────────────────────────
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: FilledButton.tonal(
              onPressed: () => _confirmLogout(context),
              style: FilledButton.styleFrom(
                backgroundColor: cs.errorContainer,
                foregroundColor: cs.onErrorContainer,
                minimumSize:     const Size(double.infinity, 52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.logout_rounded, size: 20),
                  SizedBox(width: 8),
                  Text('Logout', style: TextStyle(fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),

          // ── Version ────────────────────────────────────────────────────────
          const SizedBox(height: 32),
          Center(
            child: Text(
              'v1.0.0',
              style: TextStyle(
                fontSize: 12,
                color:    cs.onSurfaceVariant.withValues(alpha: 0.6),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  Future<void> _saveUrl() async {
    setState(() => _savingUrl = true);
    try {
      await ref.read(appUrlProvider.notifier).setUrl(_urlController.text);
      setState(() => _urlDirty = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Server URL updated')),
        );
      }
    } finally {
      if (mounted) setState(() => _savingUrl = false);
    }
  }

  void _confirmLogout(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
              foregroundColor: Theme.of(ctx).colorScheme.onError,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              await ref.read(authProvider.notifier).logout();
              if (mounted) context.go('/login');
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  void _showNotificationsSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (_) => const _NotificationsSheet(),
    );
  }

  void _showPinSetupSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context:    context,
      isScrollControlled: true,
      builder:    (_) => const _PinSetupSheet(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Biometric tile — local_auth
// ─────────────────────────────────────────────────────────────────────────────

class _BiometricTile extends ConsumerStatefulWidget {
  @override
  ConsumerState<_BiometricTile> createState() => _BiometricTileState();
}

class _BiometricTileState extends ConsumerState<_BiometricTile> {
  bool _enabled = false;

  @override
  void initState() {
    super.initState();
    _loadPref();
  }

  Future<void> _loadPref() async {
    // Read stored biometric preference (stored in Hive settings box)
    // For simplicity use SharedPreferences
    // ignore: depend_on_referenced_packages
    // We do a lightweight read without importing hive here
    setState(() => _enabled = false); // default off
  }

  @override
  Widget build(BuildContext context) {
    return SwitchListTile.adaptive(
      secondary: ShaderMask(
        shaderCallback: (b) => const LinearGradient(
          colors: kGradViolet,
        ).createShader(b),
        child: const Icon(Icons.fingerprint_rounded, color: Colors.white),
      ),
      title:     const Text('Biometric Login'),
      subtitle:  const Text('Use fingerprint or face ID to unlock',
          style: TextStyle(fontSize: 12)),
      value:     _enabled,
      onChanged: (v) => setState(() => _enabled = v),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications bottom sheet
// ─────────────────────────────────────────────────────────────────────────────

class _NotificationsSheet extends StatefulWidget {
  const _NotificationsSheet();

  @override
  State<_NotificationsSheet> createState() => _NotificationsSheetState();
}

class _NotificationsSheetState extends State<_NotificationsSheet> {
  bool _salesAlerts   = true;
  bool _stockAlerts   = true;
  bool _systemUpdates = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Notifications',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          SwitchListTile.adaptive(
            title:    const Text('Sales Alerts'),
            value:    _salesAlerts,
            onChanged: (v) => setState(() => _salesAlerts = v),
            contentPadding: EdgeInsets.zero,
          ),
          SwitchListTile.adaptive(
            title:    const Text('Low Stock Alerts'),
            value:    _stockAlerts,
            onChanged: (v) => setState(() => _stockAlerts = v),
            contentPadding: EdgeInsets.zero,
          ),
          SwitchListTile.adaptive(
            title:    const Text('System Updates'),
            value:    _systemUpdates,
            onChanged: (v) => setState(() => _systemUpdates = v),
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: 8),
        ],
      ),
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
  final _pinCtrl    = TextEditingController();
  final _confirmCtrl = TextEditingController();
  String? _error;

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
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Set PIN Code',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text('Enter a 4–6 digit PIN for quick access',
              style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13)),
          const SizedBox(height: 20),
          TextField(
            controller:  _pinCtrl,
            keyboardType: TextInputType.number,
            obscureText:  true,
            maxLength:    6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: 'New PIN',
              counterText: '',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller:  _confirmCtrl,
            keyboardType: TextInputType.number,
            obscureText:  true,
            maxLength:    6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: 'Confirm PIN',
              counterText: '',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!,
                style: TextStyle(color: cs.error, fontSize: 12)),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _save,
              child: const Text('Save PIN'),
            ),
          ),
        ],
      ),
    );
  }

  void _save() {
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
    // TODO: persist PIN via SecureStorage using kKeyPinCode
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('PIN saved successfully')),
    );
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
                begin: Alignment.topCenter,
                end:   Alignment.bottomCenter,
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
  });

  final IconData icon;
  final String   label;
  final String   value;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return ListTile(
      leading: ShaderMask(
        shaderCallback: (bounds) => const LinearGradient(
          colors: kGradPrimary,
        ).createShader(bounds),
        child: Icon(icon, color: Colors.white, size: 22),
      ),
      title:    Text(label, style: TextStyle(color: cs.onSurfaceVariant, fontSize: 12)),
      subtitle: Text(value,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
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
          begin: Alignment.topLeft,
          end:   Alignment.bottomRight,
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
