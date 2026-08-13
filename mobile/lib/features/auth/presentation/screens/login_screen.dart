import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../../../../core/constants/storage_keys.dart';
import '../../../../core/storage/secure_storage.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form       = GlobalKey<FormState>();
  final _slugCtrl   = TextEditingController();
  final _emailCtrl  = TextEditingController();
  final _passCtrl   = TextEditingController();
  bool  _remember   = false;
  bool  _obscure    = true;

  @override
  void initState() {
    super.initState();
    _loadSaved();
  }

  Future<void> _loadSaved() async {
    final storage = ref.read(secureStorageProvider);
    final remember = await storage.read(kKeyRememberLogin);
    if (remember == 'true') {
      final slug  = await storage.read(kKeyCompanySlug) ?? '';
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
    final cs    = Theme.of(context).colorScheme;
    final auth  = ref.watch(authProvider);
    final loading = auth is AuthLoading;
    final error   = auth is AuthError ? (auth).message : null;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Form(
                key: _form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Logo / header
                    Center(
                      child: Column(children: [
                        Container(
                          width: 72, height: 72,
                          decoration: BoxDecoration(
                            color:        cs.primaryContainer,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Icon(Icons.storefront_rounded, size: 40, color: cs.primary),
                        ),
                        const SizedBox(height: 16),
                        Text('SAS Garments', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text('Sign in to your account', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
                      ]),
                    ),
                    const SizedBox(height: 36),

                    if (error != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color:        cs.errorContainer,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(children: [
                          Icon(Icons.error_outline, color: cs.error, size: 18),
                          const SizedBox(width: 8),
                          Expanded(child: Text(error, style: TextStyle(color: cs.error, fontSize: 13))),
                        ]),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Company slug
                    TextFormField(
                      controller: _slugCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Company Code',
                        hintText:  'e.g. my-store',
                        prefixIcon: Icon(Icons.business_rounded),
                      ),
                      textInputAction: TextInputAction.next,
                      validator: (v) => v!.trim().isEmpty ? 'Company code is required' : null,
                    ),
                    const SizedBox(height: 16),

                    // Email
                    TextFormField(
                      controller:     _emailCtrl,
                      keyboardType:   TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText:  'Email',
                        prefixIcon: Icon(Icons.email_rounded),
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
                      controller:     _passCtrl,
                      obscureText:    _obscure,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _submit(),
                      decoration: InputDecoration(
                        labelText:  'Password',
                        prefixIcon: const Icon(Icons.lock_rounded),
                        suffixIcon: IconButton(
                          icon: Icon(_obscure ? Icons.visibility_rounded : Icons.visibility_off_rounded),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                      validator: (v) => v!.isEmpty ? 'Password is required' : null,
                    ),
                    const SizedBox(height: 12),

                    // Remember me
                    Row(children: [
                      Checkbox(
                        value: _remember,
                        onChanged: (v) => setState(() => _remember = v!),
                      ),
                      const Text('Remember company & stay signed in'),
                    ]),
                    const SizedBox(height: 24),

                    // Submit
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: loading ? null : _submit,
                        child: loading
                            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Text('Sign In'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
