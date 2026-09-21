import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/constants/storage_keys.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';

const _kBg    = Color(0xFF05091A);
const _kBrand = Color(0xFF2C6BF5);

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with TickerProviderStateMixin {

  final _form      = GlobalKey<FormState>();
  final _slugCtrl  = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl  = TextEditingController();
  bool  _remember  = false;
  bool  _obscure   = true;

  late final AnimationController _entryCtrl;
  late final AnimationController _bgCtrl;

  late final List<Animation<double>>  _fades;
  late final List<Animation<Offset>>  _slides;

  @override
  void initState() {
    super.initState();

    // Entry animations — 5 staggered slots
    _entryCtrl = AnimationController(vsync: this,
        duration: const Duration(milliseconds: 1000));

    _bgCtrl = AnimationController(vsync: this,
        duration: const Duration(seconds: 9))
      ..repeat(reverse: true);

    _fades  = [];
    _slides = [];
    for (var i = 0; i < 5; i++) {
      final start = i * 0.09;
      final end   = start + 0.40;
      _fades.add(
        Tween<double>(begin: 0.0, end: 1.0).animate(
          CurvedAnimation(parent: _entryCtrl,
              curve: Interval(start, end, curve: Curves.easeOut))),
      );
      _slides.add(
        Tween<Offset>(
          begin: const Offset(0, 0.07),
          end:   Offset.zero,
        ).animate(CurvedAnimation(parent: _entryCtrl,
            curve: Interval(start, end, curve: Curves.easeOutCubic))),
      );
    }

    Future.microtask(() { if (mounted) _entryCtrl.forward(); });
    _loadSaved();
  }

  Future<void> _loadSaved() async {
    final storage  = ref.read(secureStorageProvider);
    final remember = await storage.read(kKeyRememberLogin);
    if (remember == 'true') {
      final slug = await storage.read(kKeyCompanySlug) ?? '';
      if (mounted) setState(() { _slugCtrl.text = slug; _remember = true; });
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
    _entryCtrl.dispose();
    _bgCtrl.dispose();
    _slugCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Widget _wrap(int slot, Widget child) => FadeTransition(
    opacity: _fades[slot],
    child:   SlideTransition(position: _slides[slot], child: child),
  );

  @override
  Widget build(BuildContext context) {
    final auth    = ref.watch(authProvider);
    final loading = auth is AuthLoading;
    final error   = auth is AuthError ? auth.message : null;
    final size    = MediaQuery.of(context).size;

    return Theme(
      data: AppTheme.dark(),
      child: Scaffold(
        backgroundColor: _kBg,
        resizeToAvoidBottomInset: true,
        body: AnimatedBuilder(
          animation: _bgCtrl,
          builder: (context, child) => Stack(
            fit: StackFit.expand,
            children: [

              // ── Animated background ────────────────────────────────────
              _AnimatedBackground(t: _bgCtrl.value),

              // ── Dot grid ──────────────────────────────────────────────
              CustomPaint(painter: _DotGridPainter()),

              // ── Form content ──────────────────────────────────────────
              child!,

            ],
          ),
          child: SafeArea(
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
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [

                        SizedBox(height: size.height * 0.07),

                        // ── Logo block ──────────────────────────────────
                        _wrap(0, _LogoBlock()),

                        SizedBox(height: size.height * 0.05),

                        // ── Heading ─────────────────────────────────────
                        _wrap(1, const _Heading()),

                        const SizedBox(height: 32),

                        // ── Error banner ─────────────────────────────────
                        if (error != null)
                          _wrap(2, Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: _ErrorBanner(message: error),
                          )),

                        // ── Glassmorphism form card ───────────────────────
                        _wrap(2, _GlassFormCard(
                          slugCtrl:        _slugCtrl,
                          emailCtrl:       _emailCtrl,
                          passCtrl:        _passCtrl,
                          obscure:         _obscure,
                          onToggleObscure: () =>
                              setState(() => _obscure = !_obscure),
                        )),

                        const SizedBox(height: 16),

                        // ── Remember me ──────────────────────────────────
                        _wrap(3, _RememberRow(
                          value:     _remember,
                          onChanged: (v) => setState(() => _remember = v),
                        )),

                        const SizedBox(height: 28),

                        // ── Sign in button ───────────────────────────────
                        _wrap(4, _PressButton(
                          loading:   loading,
                          onPressed: _submit,
                        )),

                        const Spacer(),
                        const SizedBox(height: 36),

                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Animated background ───────────────────────────────────────────────────────

class _AnimatedBackground extends StatelessWidget {
  const _AnimatedBackground({required this.t});
  final double t;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Base gradient
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin:  Alignment.topLeft,
              end:    Alignment.bottomRight,
              colors: [Color(0xFF05091A), Color(0xFF080E26)],
            ),
          ),
        ),
        // Moving blob top-left
        Positioned(
          top:  -80 + t * 50,
          left: -80 + t * 40,
          child: Container(
            width: 360, height: 360,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(colors: [
                _kBrand.withValues(alpha: 0.08 + t * 0.05),
                Colors.transparent,
              ]),
            ),
          ),
        ),
        // Moving blob bottom-right
        Positioned(
          bottom: -100 + t * 40,
          right:  -80 + t * 30,
          child: Container(
            width: 300, height: 300,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(colors: [
                const Color(0xFF1A3BA0).withValues(alpha: 0.10 + t * 0.04),
                Colors.transparent,
              ]),
            ),
          ),
        ),
        // Accent blob top-right (moves opposite)
        Positioned(
          top:   -40 + (1 - t) * 60,
          right: -60 + (1 - t) * 40,
          child: Container(
            width: 240, height: 240,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(colors: [
                const Color(0xFF1E4FD0).withValues(alpha: 0.07 + (1 - t) * 0.04),
                Colors.transparent,
              ]),
            ),
          ),
        ),
      ],
    );
  }
}

// ── Logo block ────────────────────────────────────────────────────────────────

class _LogoBlock extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Logo icon with glow
        Container(
          width:  72,
          height: 72,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color:      _kBrand.withValues(alpha: 0.50),
                blurRadius: 32,
                offset:     const Offset(0, 6),
              ),
              BoxShadow(
                color:      Colors.black.withValues(alpha: 0.35),
                blurRadius: 16,
                offset:     const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: SvgPicture.asset(
              'assets/images/logo-mark.svg',
              width: 72, height: 72, fit: BoxFit.cover,
            ),
          ),
        ),
        const SizedBox(height: 14),
        // Wordmark
        RichText(
          text: TextSpan(children: [
            TextSpan(
              text:  'ProBusiness',
              style: TextStyle(
                fontFamily:    'Inter',
                fontSize:      17,
                fontWeight:    FontWeight.w700,
                color:         Colors.white.withValues(alpha: 0.92),
                letterSpacing: -0.3,
              ),
            ),
            const TextSpan(
              text:  'Cloud',
              style: TextStyle(
                fontFamily:    'Inter',
                fontSize:      17,
                fontWeight:    FontWeight.w700,
                color:         _kBrand,
                letterSpacing: -0.3,
              ),
            ),
          ]),
        ),
      ],
    );
  }
}

// ── Heading ───────────────────────────────────────────────────────────────────

class _Heading extends StatelessWidget {
  const _Heading();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            begin:  Alignment.topLeft,
            end:    Alignment.bottomRight,
            colors: [Color(0xFFFFFFFF), Color(0xFF8AB4FF)],
          ).createShader(bounds),
          child: Text(
            'Welcome back',
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(
              fontSize:      34,
              fontWeight:    FontWeight.w800,
              color:         Colors.white,
              letterSpacing: -1.0,
              height:        1.1,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Sign in to your business account',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize:   14,
            color:      Colors.white.withValues(alpha: 0.48),
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
        color:        const Color(0xFF7F1D1D).withValues(alpha: 0.26),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: const Color(0xFFEF4444).withValues(alpha: 0.36)),
      ),
      child: Row(children: [
        const Icon(Icons.error_outline_rounded,
            color: Color(0xFFFCA5A5), size: 18),
        const SizedBox(width: 10),
        Expanded(
          child: Text(message,
              style: const TextStyle(
                fontFamily: 'Inter', fontSize: 13,
                color: Color(0xFFFCA5A5))),
        ),
      ]),
    );
  }
}

// ── Glassmorphism Form Card ───────────────────────────────────────────────────

class _GlassFormCard extends StatelessWidget {
  const _GlassFormCard({
    required this.slugCtrl,
    required this.emailCtrl,
    required this.passCtrl,
    required this.obscure,
    required this.onToggleObscure,
  });

  final TextEditingController slugCtrl;
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final bool         obscure;
  final VoidCallback onToggleObscure;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.062),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.13),
            ),
          ),
          child: Column(
            children: [
              _Field(
                controller:  slugCtrl,
                label:       'Company Code',
                hint:        'e.g. my-company',
                icon:        Icons.business_rounded,
                inputAction: TextInputAction.next,
                validator:   (v) =>
                    v!.trim().isEmpty ? 'Company code is required' : null,
              ),
              const SizedBox(height: 14),
              _Field(
                controller:   emailCtrl,
                label:        'Email Address',
                hint:         'you@company.com',
                icon:         Icons.email_rounded,
                keyboardType: TextInputType.emailAddress,
                inputAction:  TextInputAction.next,
                validator: (v) {
                  if (v!.trim().isEmpty) return 'Email is required';
                  if (!v.contains('@'))  return 'Enter a valid email';
                  return null;
                },
              ),
              const SizedBox(height: 14),
              _Field(
                controller:  passCtrl,
                label:       'Password',
                hint:        'Enter your password',
                icon:        Icons.lock_rounded,
                obscureText: obscure,
                inputAction: TextInputAction.done,
                suffix: IconButton(
                  icon: Icon(
                    obscure
                        ? Icons.visibility_rounded
                        : Icons.visibility_off_rounded,
                    color: Colors.white.withValues(alpha: 0.38),
                    size:  20,
                  ),
                  onPressed: onToggleObscure,
                ),
                validator: (v) =>
                    v!.isEmpty ? 'Password is required' : null,
              ),
            ],
          ),
        ),
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

  final TextEditingController       controller;
  final String                      label;
  final String                      hint;
  final IconData                    icon;
  final TextInputType?              keyboardType;
  final TextInputAction             inputAction;
  final bool                        obscureText;
  final Widget?                     suffix;
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
        color:      Color(0xFFEEF2FF),
        fontSize:   14,
      ),
      decoration: InputDecoration(
        labelText:  label,
        hintText:   hint,
        labelStyle: TextStyle(
          fontFamily: 'Inter',
          color:      Colors.white.withValues(alpha: 0.46),
          fontSize:   13,
        ),
        hintStyle: TextStyle(
          fontFamily: 'Inter',
          color:      Colors.white.withValues(alpha: 0.20),
        ),
        prefixIcon: Icon(icon,
            color: Colors.white.withValues(alpha: 0.38), size: 19),
        suffixIcon: suffix,
        filled:     true,
        fillColor:  Colors.white.withValues(alpha: 0.065),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.09)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.09)),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          borderSide: BorderSide(color: _kBrand, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFEF4444)),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFEF4444), width: 1.6),
        ),
        errorStyle:     const TextStyle(
            color: Color(0xFFFCA5A5), fontSize: 11),
        contentPadding: const EdgeInsets.symmetric(
            horizontal: 16, vertical: 14),
      ),
      validator: validator,
    );
  }
}

// ── Remember Me ───────────────────────────────────────────────────────────────

class _RememberRow extends StatelessWidget {
  const _RememberRow({required this.value, required this.onChanged});
  final bool               value;
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
                    ? _kBrand
                    : Colors.transparent),
              side:  BorderSide(color: Colors.white.withValues(alpha: 0.28)),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4)),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Remember company & stay signed in',
              style: TextStyle(
                fontFamily: 'Inter', fontSize: 13,
                color: Colors.white.withValues(alpha: 0.48),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Press Button ──────────────────────────────────────────────────────────────

class _PressButton extends StatefulWidget {
  const _PressButton({required this.loading, required this.onPressed});
  final bool         loading;
  final VoidCallback onPressed;

  @override
  State<_PressButton> createState() => _PressButtonState();
}

class _PressButtonState extends State<_PressButton>
    with SingleTickerProviderStateMixin {

  late final AnimationController _scaleCtrl;
  late final Animation<double>   _scale;

  @override
  void initState() {
    super.initState();
    _scaleCtrl = AnimationController(vsync: this,
        duration: const Duration(milliseconds: 110));
    _scale = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _scaleCtrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _scaleCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown:  (_) => _scaleCtrl.forward(),
      onTapUp:    (_) {
        _scaleCtrl.reverse();
        if (!widget.loading) {
          HapticFeedback.lightImpact();
          widget.onPressed();
        }
      },
      onTapCancel: () => _scaleCtrl.reverse(),
      child: AnimatedBuilder(
        animation: _scale,
        builder: (_, child) =>
            Transform.scale(scale: _scale.value, child: child),
        child: Container(
          width:  double.infinity,
          height: 54,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin:  Alignment.topLeft,
              end:    Alignment.bottomRight,
              colors: [Color(0xFF2460E0), Color(0xFF2C6BF5), Color(0xFF4D87FF)],
            ),
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color:      _kBrand.withValues(alpha: 0.42),
                blurRadius: 24,
                offset:     const Offset(0, 8),
              ),
              BoxShadow(
                color:      _kBrand.withValues(alpha: 0.20),
                blurRadius: 48,
                offset:     const Offset(0, 12),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: widget.loading
              ? const SizedBox(width: 22, height: 22,
                  child: CircularProgressIndicator(
                      strokeWidth: 2.5, color: Colors.white))
              : const Text('Sign In',
                  style: TextStyle(
                    fontFamily:    'Inter',
                    fontSize:      15,
                    fontWeight:    FontWeight.w700,
                    color:         Colors.white,
                    letterSpacing: 0.4,
                  )),
        ),
      ),
    );
  }
}

// ── Dot grid ──────────────────────────────────────────────────────────────────

class _DotGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.025)
      ..style  = PaintingStyle.fill;
    const spacing = 28.0;
    const r       = 1.0;
    for (double x = spacing; x < size.width;  x += spacing) {
      for (double y = spacing; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), r, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DotGridPainter _) => false;
}
