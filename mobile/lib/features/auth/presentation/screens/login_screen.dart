import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/storage_keys.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';

// Brand palette — matches website hero gradient
const _kGradStart = Color(0xFF14122D);
const _kGradMid   = Color(0xFF1E0E3A);
const _kGradEnd   = Color(0xFF332C3F);

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form      = GlobalKey<FormState>();
  final _slugCtrl  = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl  = TextEditingController();
  bool  _remember  = false;
  bool  _obscure   = true;

  @override
  void initState() {
    super.initState();
    _loadSaved();
  }

  Future<void> _loadSaved() async {
    final storage = ref.read(secureStorageProvider);
    final remember = await storage.read(kKeyRememberLogin);
    if (remember == 'true') {
      final slug = await storage.read(kKeyCompanySlug) ?? '';
      setState(() {
        _slugCtrl.text = slug;
        _remember      = true;
      });
    }
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    await ref.read(authProvider.notifier).login(
      slug:     _slugCtrl.text.trim(),
      email:    _emailCtrl.text.trim(),
      password: _passCtrl.text,
      remember: _remember,
    );
  }

  @override
  void dispose() {
    _slugCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth    = ref.watch(authProvider);
    final loading = auth is AuthLoading;
    final error   = auth is AuthError ? auth.message : null;

    // Force dark theme so inputs / text adapt to the dark gradient background
    return Theme(
      data: AppTheme.dark(),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end:   Alignment.bottomRight,
              colors: [_kGradStart, _kGradMid, _kGradEnd],
              stops:  [0.0, 0.55, 1.0],
            ),
          ),
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Form(
                  key: _form,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [

                      // ── Logo — white on dark gradient ────────────────────
                      Center(
                        child: Container(
                          decoration: BoxDecoration(
                            color:        Colors.white.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.14),
                              width: 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color:      Colors.black.withValues(alpha: 0.3),
                                blurRadius: 24,
                                offset:     const Offset(0, 8),
                              ),
                            ],
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
                          child: ColorFiltered(
                            colorFilter: const ColorFilter.matrix([
                              // invert to white
                              -1,  0,  0, 0, 255,
                               0, -1,  0, 0, 255,
                               0,  0, -1, 0, 255,
                               0,  0,  0, 1,   0,
                            ]),
                            child: Image.asset(
                              'assets/images/newlogo.png',
                              height: 56,
                              fit:    BoxFit.contain,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 40),

                      // ── Heading ──────────────────────────────────────────
                      const Text(
                        'Welcome back',
                        style: TextStyle(
                          fontSize:    26,
                          fontWeight:  FontWeight.w900,
                          letterSpacing: -0.5,
                          color:       Color(0xFFF0F5FF),
                          fontFamily:  'Inter',
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Sign in to your ProBusinessCloud account',
                        style: TextStyle(
                          fontSize:  14,
                          color:     Colors.white.withValues(alpha: 0.58),
                          fontFamily: 'Inter',
                        ),
                      ),
                      const SizedBox(height: 32),

                      // ── Error banner ─────────────────────────────────────
                      if (error != null) ...[
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color:        const Color(0xFF7F1D1D).withValues(alpha: 0.35),
                            borderRadius: BorderRadius.circular(12),
                            border:       Border.all(
                              color: const Color(0xFFEF4444).withValues(alpha: 0.45),
                            ),
                          ),
                          child: Row(children: [
                            const Icon(Icons.error_outline_rounded, color: Color(0xFFFCA5A5), size: 18),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                error,
                                style: const TextStyle(
                                  fontSize:   13,
                                  color:      Color(0xFFFCA5A5),
                                  fontFamily: 'Inter',
                                ),
                              ),
                            ),
                          ]),
                        ),
                        const SizedBox(height: 20),
                      ],

                      // ── Form card — frosted glass ─────────────────────────
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color:        Colors.white.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.10),
                          ),
                        ),
                        child: Column(
                          children: [

                            // Company code
                            TextFormField(
                              controller:      _slugCtrl,
                              textInputAction: TextInputAction.next,
                              style: const TextStyle(color: Color(0xFFF0F5FF), fontFamily: 'Inter'),
                              decoration: _inputDeco(
                                label: 'Company Code',
                                hint:  'e.g. my-company',
                                icon:  Icons.business_rounded,
                              ),
                              validator: (v) =>
                                  v!.trim().isEmpty ? 'Company code is required' : null,
                            ),
                            const SizedBox(height: 16),

                            // Email
                            TextFormField(
                              controller:      _emailCtrl,
                              keyboardType:    TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              style: const TextStyle(color: Color(0xFFF0F5FF), fontFamily: 'Inter'),
                              decoration: _inputDeco(
                                label: 'Email Address',
                                hint:  'you@company.com',
                                icon:  Icons.email_rounded,
                              ),
                              validator: (v) {
                                if (v!.trim().isEmpty) return 'Email is required';
                                if (!v.contains('@'))  return 'Enter a valid email';
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),

                            // Password
                            TextFormField(
                              controller:      _passCtrl,
                              obscureText:     _obscure,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) => _submit(),
                              style: const TextStyle(color: Color(0xFFF0F5FF), fontFamily: 'Inter'),
                              decoration: _inputDeco(
                                label:    'Password',
                                hint:     'Enter your password',
                                icon:     Icons.lock_rounded,
                                suffix:   IconButton(
                                  icon: Icon(
                                    _obscure
                                        ? Icons.visibility_rounded
                                        : Icons.visibility_off_rounded,
                                    color: Colors.white.withValues(alpha: 0.45),
                                    size: 20,
                                  ),
                                  onPressed: () => setState(() => _obscure = !_obscure),
                                ),
                              ),
                              validator: (v) =>
                                  v!.isEmpty ? 'Password is required' : null,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // ── Remember me ──────────────────────────────────────
                      Row(
                        children: [
                          SizedBox(
                            width: 24, height: 24,
                            child: Checkbox(
                              value:     _remember,
                              onChanged: (v) => setState(() => _remember = v!),
                              fillColor: WidgetStateProperty.resolveWith((s) =>
                                s.contains(WidgetState.selected)
                                    ? const Color(0xFF818CF8)
                                    : Colors.transparent),
                              side: BorderSide(color: Colors.white.withValues(alpha: 0.35)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'Remember company & stay signed in',
                            style: TextStyle(
                              fontSize:  13,
                              color:     Colors.white.withValues(alpha: 0.55),
                              fontFamily: 'Inter',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 28),

                      // ── Sign in button ───────────────────────────────────
                      SizedBox(
                        width:  double.infinity,
                        height: 52,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
                            ),
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(
                                color:      const Color(0xFF4F46E5).withValues(alpha: 0.40),
                                blurRadius: 20,
                                offset:     const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: ElevatedButton(
                            onPressed: loading ? null : _submit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor:     Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            child: loading
                                ? const SizedBox(
                                    width: 22, height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.5,
                                      color:       Colors.white,
                                    ),
                                  )
                                : const Text(
                                    'Sign In to ProBusinessCloud',
                                    style: TextStyle(
                                      fontSize:    15,
                                      fontWeight:  FontWeight.w700,
                                      color:       Colors.white,
                                      fontFamily:  'Inter',
                                    ),
                                  ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 32),

                      // ── Footer ───────────────────────────────────────────
                      Center(
                        child: Text(
                          'ProBusinessCloud · Secure Business Platform',
                          style: TextStyle(
                            fontSize:  11,
                            color:     Colors.white.withValues(alpha: 0.28),
                            fontFamily: 'Inter',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDeco({
    required String  label,
    required String  hint,
    required IconData icon,
    Widget? suffix,
  }) {
    return InputDecoration(
      labelText:   label,
      hintText:    hint,
      labelStyle:  TextStyle(color: Colors.white.withValues(alpha: 0.55), fontFamily: 'Inter', fontSize: 13),
      hintStyle:   TextStyle(color: Colors.white.withValues(alpha: 0.25), fontFamily: 'Inter'),
      prefixIcon:  Icon(icon, color: Colors.white.withValues(alpha: 0.40), size: 20),
      suffixIcon:  suffix,
      filled:      true,
      fillColor:   Colors.white.withValues(alpha: 0.07),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide:   BorderSide(color: Colors.white.withValues(alpha: 0.12)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide:   BorderSide(color: Colors.white.withValues(alpha: 0.12)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide:   const BorderSide(color: Color(0xFF818CF8), width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide:   const BorderSide(color: Color(0xFFEF4444)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide:   const BorderSide(color: Color(0xFFEF4444), width: 1.5),
      ),
      errorStyle: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 11),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }
}
