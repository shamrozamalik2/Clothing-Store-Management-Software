import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/storage_keys.dart';
import '../../../../core/storage/secure_storage.dart';
import '../providers/auth_provider.dart';

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
    final cs      = Theme.of(context).colorScheme;
    final tt      = Theme.of(context).textTheme;
    final auth    = ref.watch(authProvider);
    final loading = auth is AuthLoading;
    final error   = auth is AuthError ? auth.message : null;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Form(
              key: _form,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [

                  // ── Logo — PNG only, no text ───────────────────────────
                  Center(
                    child: Container(
                      decoration: BoxDecoration(
                        color:        Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color:      const Color(0xFF4F46E5).withValues(alpha: 0.12),
                            blurRadius: 24,
                            offset:     const Offset(0, 6),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                      child: Image.asset(
                        'assets/images/newlogo.png',
                        height: 64,
                        fit:    BoxFit.contain,
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),

                  // ── Heading ───────────────────────────────────────────────
                  Text(
                    'Welcome back',
                    style: tt.headlineSmall?.copyWith(
                      fontWeight:  FontWeight.w900,
                      letterSpacing: -0.5,
                      color: cs.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Sign in to your ProBusinessCloud account',
                    style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                  ),
                  const SizedBox(height: 28),

                  // ── Error banner ──────────────────────────────────────────
                  if (error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color:        cs.errorContainer.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(12),
                        border:       Border.all(
                          color: cs.error.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(children: [
                        Icon(Icons.error_outline_rounded, color: cs.error, size: 18),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            error,
                            style: tt.bodySmall?.copyWith(color: cs.error),
                          ),
                        ),
                      ]),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // ── Company code ─────────────────────────────────────────
                  TextFormField(
                    controller:      _slugCtrl,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      labelText:  'Company Code',
                      hintText:   'e.g. my-company',
                      prefixIcon: Icon(Icons.business_rounded),
                    ),
                    validator: (v) =>
                        v!.trim().isEmpty ? 'Company code is required' : null,
                  ),
                  const SizedBox(height: 14),

                  // ── Email ─────────────────────────────────────────────────
                  TextFormField(
                    controller:      _emailCtrl,
                    keyboardType:    TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      labelText:  'Email Address',
                      hintText:   'you@company.com',
                      prefixIcon: Icon(Icons.email_rounded),
                    ),
                    validator: (v) {
                      if (v!.trim().isEmpty) return 'Email is required';
                      if (!v.contains('@'))  return 'Enter a valid email';
                      return null;
                    },
                  ),
                  const SizedBox(height: 14),

                  // ── Password ──────────────────────────────────────────────
                  TextFormField(
                    controller:      _passCtrl,
                    obscureText:     _obscure,
                    textInputAction: TextInputAction.done,
                    onFieldSubmitted: (_) => _submit(),
                    decoration: InputDecoration(
                      labelText:  'Password',
                      prefixIcon: const Icon(Icons.lock_rounded),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscure
                              ? Icons.visibility_rounded
                              : Icons.visibility_off_rounded,
                        ),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                    validator: (v) =>
                        v!.isEmpty ? 'Password is required' : null,
                  ),
                  const SizedBox(height: 10),

                  // ── Remember me ───────────────────────────────────────────
                  Row(
                    children: [
                      SizedBox(
                        width:  24,
                        height: 24,
                        child: Checkbox(
                          value:     _remember,
                          onChanged: (v) => setState(() => _remember = v!),
                          shape:     RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Remember company & stay signed in',
                        style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // ── Sign in button ─────────────────────────────────────────
                  SizedBox(
                    width:  double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: loading ? null : _submit,
                      child: loading
                          ? const SizedBox(
                              width:  22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth:  2.5,
                                color:        Colors.white,
                              ),
                            )
                          : const Text('Sign In to ProBusinessCloud'),
                    ),
                  ),

                  const SizedBox(height: 32),

                  // ── Footer ───────────────────────────────────────────────
                  Center(
                    child: Text(
                      'ProBusinessCloud · Secure Business Platform',
                      style: tt.bodySmall?.copyWith(
                        color:    cs.onSurfaceVariant.withValues(alpha: 0.6),
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}