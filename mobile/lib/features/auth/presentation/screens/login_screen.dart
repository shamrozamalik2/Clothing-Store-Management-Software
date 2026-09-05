import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/storage_keys.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';

const _kGradStart  = Color(0xFF0D0B2A);
const _kGradMid    = Color(0xFF160D3B);
const _kGradEnd    = Color(0xFF231B4F);
const _kGlowIndigo = Color(0xFF4F46E5);

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
    final size    = MediaQuery.of(context).size;

    return Theme(
      data: AppTheme.dark(),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        resizeToAvoidBottomInset: true,
        body: Container(
          width:  double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin:  Alignment.topLeft,
              end:    Alignment.bottomRight,
              colors: [_kGradStart, _kGradMid, _kGradEnd],
              stops:  [0.0, 0.5, 1.0],
            ),
          ),
          child: Stack(
            children: [
              // ── Decorative glow blobs ─────────────────────────────────────
              Positioned(
                top:   -100,
                left:  -80,
                child: Container(
                  width:  320,
                  height: 320,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        _kGlowIndigo.withValues(alpha: 0.18),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: -120,
                right:  -80,
                child: Container(
                  width:  280,
                  height: 280,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        const Color(0xFF7C3AED).withValues(alpha: 0.14),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),

              // ── Scrollable content ────────────────────────────────────────
              SafeArea(
                child: SingleChildScrollView(
                  physics: const ClampingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: size.height
                          - MediaQuery.of(context).padding.top
                          - MediaQuery.of(context).padding.bottom,
                    ),
                    child: IntrinsicHeight(
                      child: Form(
                        key: _form,
                        child: Column(
                          children: [

                            // ── Top spacer ────────────────────────────────
                            SizedBox(height: size.height * 0.07),

                            // ── Logo hero ─────────────────────────────────
                            _LogoHero(),

                            SizedBox(height: size.height * 0.05),

                            // ── Heading ───────────────────────────────────
                            const _Heading(),

                            const SizedBox(height: 28),

                            // ── Error banner ──────────────────────────────
                            if (error != null) ...[
                              _ErrorBanner(message: error),
                              const SizedBox(height: 16),
                            ],

                            // ── Form card ─────────────────────────────────
                            _FormCard(
                              slugCtrl:  _slugCtrl,
                              emailCtrl: _emailCtrl,
                              passCtrl:  _passCtrl,
                              obscure:   _obscure,
                              onToggleObscure: () =>
                                  setState(() => _obscure = !_obscure),
                            ),

                            const SizedBox(height: 16),

                            // ── Remember me ───────────────────────────────
                            _RememberRow(
                              value:     _remember,
                              onChanged: (v) => setState(() => _remember = v),
                            ),

                            const SizedBox(height: 24),

                            // ── Sign in button ────────────────────────────
                            _SignInButton(loading: loading, onPressed: _submit),

                            const Spacer(),

                            // ── Footer ────────────────────────────────────
                            Padding(
                              padding: const EdgeInsets.only(bottom: 24, top: 32),
                              child: Text(
                                'ProBusinessCloud · Secure Business Platform',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize:   11,
                                  color:      Colors.white.withValues(alpha: 0.28),
                                  letterSpacing: 0.2,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Logo Hero ─────────────────────────────────────────────────────────────────

class _LogoHero extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        children: [
          // Logo card with glow
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color:      _kGlowIndigo.withValues(alpha: 0.35),
                  blurRadius: 40,
                  spreadRadius: 4,
                  offset:     const Offset(0, 8),
                ),
                BoxShadow(
                  color:      Colors.black.withValues(alpha: 0.4),
                  blurRadius: 20,
                  offset:     const Offset(0, 6),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end:   Alignment.bottomRight,
                    colors: [Color(0xFF1E1B6B), Color(0xFF312E81)],
                  ),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.08),
                  ),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Image.asset(
                  'assets/images/newlogo.png',
                  height: 52,
                  fit:    BoxFit.contain,
                  color:  Colors.white,
                  colorBlendMode: BlendMode.srcIn,
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          // PBC wordmark below logo
          Text(
            'ProBusinessCloud',
            style: TextStyle(
              fontFamily:    'Inter',
              fontSize:      13,
              fontWeight:    FontWeight.w600,
              color:         Colors.white.withValues(alpha: 0.45),
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Heading ───────────────────────────────────────────────────────────────────

class _Heading extends StatelessWidget {
  const _Heading();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [Color(0xFFF0F5FF), Color(0xFFC7D2FE)],
          ).createShader(bounds),
          child: const Text(
            'Welcome back',
            style: TextStyle(
              fontFamily:    'Inter',
              fontSize:      28,
              fontWeight:    FontWeight.w900,
              letterSpacing: -0.8,
              color:         Colors.white,
              height:        1.1,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Sign in to your business account',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize:   14,
            color:      Colors.white.withValues(alpha: 0.50),
            height:     1.4,
          ),
        ),
      ],
    );
  }
}

// ── Error Banner ──────────────────────────────────────────────────────────────

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color:        const Color(0xFF7F1D1D).withValues(alpha: 0.30),
        borderRadius: BorderRadius.circular(12),
        border:       Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.40)),
      ),
      child: Row(children: [
        const Icon(Icons.error_outline_rounded, color: Color(0xFFFCA5A5), size: 18),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            message,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize:   13,
              color:      Color(0xFFFCA5A5),
            ),
          ),
        ),
      ]),
    );
  }
}

// ── Form Card ─────────────────────────────────────────────────────────────────

class _FormCard extends StatelessWidget {
  const _FormCard({
    required this.slugCtrl,
    required this.emailCtrl,
    required this.passCtrl,
    required this.obscure,
    required this.onToggleObscure,
  });
  final TextEditingController slugCtrl;
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final bool   obscure;
  final VoidCallback onToggleObscure;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color:        Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.09),
        ),
        boxShadow: [
          BoxShadow(
            color:      Colors.black.withValues(alpha: 0.18),
            blurRadius: 20,
            offset:     const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          _Field(
            controller:     slugCtrl,
            label:          'Company Code',
            hint:           'e.g. my-company',
            icon:           Icons.business_rounded,
            inputAction:    TextInputAction.next,
            validator:      (v) => v!.trim().isEmpty ? 'Company code is required' : null,
          ),
          const SizedBox(height: 14),
          _Field(
            controller:     emailCtrl,
            label:          'Email Address',
            hint:           'you@company.com',
            icon:           Icons.email_rounded,
            keyboardType:   TextInputType.emailAddress,
            inputAction:    TextInputAction.next,
            validator:      (v) {
              if (v!.trim().isEmpty) return 'Email is required';
              if (!v.contains('@'))  return 'Enter a valid email';
              return null;
            },
          ),
          const SizedBox(height: 14),
          _Field(
            controller:     passCtrl,
            label:          'Password',
            hint:           'Enter your password',
            icon:           Icons.lock_rounded,
            obscureText:    obscure,
            inputAction:    TextInputAction.done,
            suffix: IconButton(
              icon: Icon(
                obscure ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                color: Colors.white.withValues(alpha: 0.40),
                size:  20,
              ),
              onPressed: onToggleObscure,
            ),
            validator: (v) => v!.isEmpty ? 'Password is required' : null,
          ),
        ],
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    this.keyboardType,
    this.inputAction   = TextInputAction.next,
    this.obscureText   = false,
    this.suffix,
    this.validator,
  });
  final TextEditingController    controller;
  final String                   label;
  final String                   hint;
  final IconData                 icon;
  final TextInputType?           keyboardType;
  final TextInputAction          inputAction;
  final bool                     obscureText;
  final Widget?                  suffix;
  final FormFieldValidator<String>? validator;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller:      controller,
      keyboardType:    keyboardType,
      textInputAction: inputAction,
      obscureText:     obscureText,
      style: const TextStyle(
        fontFamily: 'Inter',
        color:      Color(0xFFF0F5FF),
        fontSize:   14,
      ),
      decoration: InputDecoration(
        labelText:   label,
        hintText:    hint,
        labelStyle:  TextStyle(
          fontFamily: 'Inter',
          color:      Colors.white.withValues(alpha: 0.50),
          fontSize:   13,
        ),
        hintStyle:   TextStyle(
          fontFamily: 'Inter',
          color:      Colors.white.withValues(alpha: 0.22),
        ),
        prefixIcon:  Icon(icon, color: Colors.white.withValues(alpha: 0.38), size: 19),
        suffixIcon:  suffix,
        filled:      true,
        fillColor:   Colors.white.withValues(alpha: 0.06),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   BorderSide(color: Colors.white.withValues(alpha: 0.10)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   BorderSide(color: Colors.white.withValues(alpha: 0.10)),
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
        errorStyle:     const TextStyle(color: Color(0xFFFCA5A5), fontSize: 11),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      validator: validator,
    );
  }
}

// ── Remember Me Row ───────────────────────────────────────────────────────────

class _RememberRow extends StatelessWidget {
  const _RememberRow({required this.value, required this.onChanged});
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          SizedBox(
            width: 22, height: 22,
            child: Checkbox(
              value:     value,
              onChanged: (v) => onChanged(v!),
              fillColor: WidgetStateProperty.resolveWith((s) =>
                s.contains(WidgetState.selected)
                    ? const Color(0xFF818CF8)
                    : Colors.transparent),
              side:  BorderSide(color: Colors.white.withValues(alpha: 0.32)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Remember company & stay signed in',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize:   13,
                color:      Colors.white.withValues(alpha: 0.52),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Sign In Button ────────────────────────────────────────────────────────────

class _SignInButton extends StatelessWidget {
  const _SignInButton({required this.loading, required this.onPressed});
  final bool         loading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width:  double.infinity,
      height: 52,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin:  Alignment.topLeft,
            end:    Alignment.bottomRight,
            colors: [Color(0xFF4338CA), Color(0xFF4F46E5), Color(0xFF7C3AED)],
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color:      const Color(0xFF4F46E5).withValues(alpha: 0.45),
              blurRadius: 22,
              offset:     const Offset(0, 8),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: loading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor:     Colors.transparent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            disabledBackgroundColor: Colors.transparent,
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
                  'Sign In',
                  style: TextStyle(
                    fontFamily:    'Inter',
                    fontSize:      15,
                    fontWeight:    FontWeight.w700,
                    color:         Colors.white,
                    letterSpacing: 0.2,
                  ),
                ),
        ),
      ),
    );
  }
}
