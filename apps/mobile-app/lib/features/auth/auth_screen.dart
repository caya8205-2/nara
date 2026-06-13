import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/services/api_client.dart';
import '../../core/state/nara_mobile_state.dart';
import '../../core/theme/nara_theme.dart';
import '../../core/widgets/nara_logo_mark.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    required this.apiClient,
    required this.onAuthenticated,
    required this.onTryAsGuest,
    required this.language,
    super.key,
  });

  final NaraApiClient apiClient;
  final void Function(Map<String, dynamic> user, {required bool isNewUser})
      onAuthenticated;
  final VoidCallback onTryAsGuest;
  final NaraLanguagePreference language;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _displayNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isRegister = false;
  bool _showingForm = false;
  bool _loading = false;
  String? _error;

  final _pageController = PageController();
  int _onboardingPage = 0;
  bool _onboardingDone = false;

  bool get _isIndonesian => widget.language == NaraLanguagePreference.indonesia;

  @override
  void dispose() {
    _pageController.dispose();
    _displayNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
    });
    widget.apiClient.serverUrl = NaraApiClient.defaultServerUrl;

    try {
      final user = _isRegister
          ? await widget.apiClient.registerUser(
              displayName: _displayNameController.text.trim(),
              email: _emailController.text.trim(),
              password: _passwordController.text,
            )
          : await widget.apiClient.loginUser(
              email: _emailController.text.trim(),
              password: _passwordController.text,
            );
      widget.onAuthenticated(user, isNewUser: _isRegister);
    } catch (err) {
      setState(() => _error = _friendlyError(err));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  static String _friendlyError(Object err) {
    final msg = err.toString().toLowerCase();
    if (msg.contains('invalid') ||
        msg.contains('401') ||
        msg.contains('wrong')) {
      return 'Email atau kata sandi tidak cocok.';
    }
    if (msg.contains('already exists') || msg.contains('409')) {
      return 'Akun dengan email ini sudah terdaftar.';
    }
    if (msg.contains('network') ||
        msg.contains('socket') ||
        msg.contains('timeout')) {
      return 'Tidak bisa terhubung. Periksa koneksi internet kamu.';
    }
    return 'Terjadi kesalahan. Coba lagi sebentar.';
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          const _AnimatedGradient(progress: 0.5),
          _StaticCircle(
            size: 160,
            color: NaraColors.primary,
            right: 50,
            bottom: 60,
            opacity: dark ? 0.08 : 0.04,
          ),
          _StaticCircle(
            size: 120,
            color: NaraColors.agent,
            right: -20,
            bottom: 25,
            opacity: dark ? 0.08 : 0.04,
          ),
          _StaticCircle(
            size: 200,
            color: NaraColors.primary,
            right: 30,
            bottom: 15,
            opacity: dark ? 0.06 : 0.04,
          ),
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child:
                    _onboardingDone ? _buildAppContent() : _buildOnboarding(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Onboarding ─────────────────────────────────────────────────────────

  Widget _buildOnboarding() {
    return Column(
      children: [
        // Skip button (top-right)
        Align(
          alignment: Alignment.topRight,
          child: Padding(
            padding: const EdgeInsets.only(right: 16, top: 8),
            child: TextButton(
              onPressed: () => setState(() => _onboardingDone = true),
              child: const Text('Skip'),
            ),
          ),
        ),

        // Slides
        Expanded(
          child: PageView(
            controller: _pageController,
            onPageChanged: (page) => setState(() => _onboardingPage = page),
            children: const [
              _OnboardingSlide(
                icon: Icons.checklist_rounded,
                title: 'Stay on top of\nyour day',
                body:
                    'Tasks and reminders in one place —\nno clutter, just what needs attention.',
              ),
              _OnboardingSlide(
                icon: Icons.smart_toy_outlined,
                title: 'Nara Bot works\nthrough WhatsApp',
                body:
                    'Connect your WhatsApp number and\nlet Nara help you manage things from chat.',
              ),
              _OnboardingSlide(
                icon: Icons.verified_user_outlined,
                title: 'Private by design',
                body:
                    'Your tasks stay in your Nara space.\nYou decide what the assistant can access.',
              ),
            ],
          ),
        ),

        // Dots + CTA
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _OnboardingDots(active: _onboardingPage, count: 3),
              const Spacer(),
              FilledButton(
                onPressed: () {
                  if (_onboardingPage < 2) {
                    _pageController.nextPage(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeOut,
                    );
                  } else {
                    setState(() => _onboardingDone = true);
                  }
                },
                child: Text(_onboardingPage < 2 ? 'Next' : 'Get Started'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── App content (welcome or form) ─────────────────────────────────────

  Widget _buildAppContent() {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 400),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (child, animation) =>
          FadeTransition(opacity: animation, child: child),
      child: _showingForm ? _buildForm() : _buildWelcome(),
    );
  }

  // ── Welcome Screen ─────────────────────────────────────────────────────

  Widget _buildWelcome() {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return ListView(
      key: const ValueKey('welcome'),
      padding: const EdgeInsets.fromLTRB(22, 28, 22, 24),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: dark
                  ? const [
                      Color(0xFF1B302D),
                      Color(0xFF244742),
                      Color(0xFF3B3A25),
                    ]
                  : const [
                      NaraColors.surface,
                      NaraColors.primaryMuted,
                      NaraColors.warningMuted,
                    ],
              stops: const [0, 0.62, 1],
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: Theme.of(context).dividerTheme.color ?? NaraColors.border,
            ),
            boxShadow: [
              BoxShadow(
                color: (dark ? const Color(0xFF0B1413) : NaraColors.primary)
                    .withValues(alpha: 0.12),
                blurRadius: 30,
                offset: const Offset(0, 16),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const NaraLogoMark(size: 58, showWordmark: false, pulse: 0),
              const SizedBox(height: 28),
              Text(
                _isIndonesian
                    ? 'Nara bantu harimu tetap jalan.'
                    : 'Nara keeps your day moving.',
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.6,
                  height: 1.08,
                  color:
                      dark ? const Color(0xFFF1F7F5) : NaraColors.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                _isIndonesian
                    ? 'Ubah tugas, pengingat, dan catatan WhatsApp jadi satu antrean yang rapi.'
                    : 'Turn scattered tasks, reminders, and WhatsApp notes into one calm queue.',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  height: 1.5,
                  color:
                      dark ? const Color(0xFFC5D6D2) : NaraColors.textSecondary,
                ),
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: const [
                  _WelcomePill(icon: Icons.checklist_rounded, label: 'Tasks'),
                  _WelcomePill(
                    icon: Icons.notifications_active_outlined,
                    label: 'Reminders',
                  ),
                  _WelcomePill(
                    icon: Icons.chat_bubble_outline_rounded,
                    label: 'WhatsApp bot',
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color ?? NaraColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: Theme.of(context).dividerTheme.color ?? NaraColors.border,
            ),
          ),
          child: Column(
            children: [
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton.icon(
                  onPressed: () => _openForm(register: true),
                  icon: const Icon(Icons.person_add_alt_rounded, size: 20),
                  label: Text(
                    _isIndonesian ? 'Buat akun Nara' : 'Create my Nara account',
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton.icon(
                  onPressed: () => _openForm(register: false),
                  icon: const Icon(Icons.login_rounded, size: 20),
                  label: Text(_isIndonesian ? 'Masuk' : 'Sign in'),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: widget.onTryAsGuest,
                child: Text(
                  _isIndonesian ? 'Coba tanpa akun' : 'Preview without account',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  // ignore: unused_element
  Widget _buildWelcomeLegacy() {
    return ListView(
      key: const ValueKey('welcome'),
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
      children: [
        const SizedBox(height: 20),
        NaraLogoMark(
          size: 72,
          showWordmark: false,
          pulse: 0,
        ),
        const SizedBox(height: 20),
        Text(
          'Nara',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.8,
            height: 1.15,
            color: NaraColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Tasks, reminders, and a personal bot —\non your own server.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            height: 1.55,
            color: NaraColors.textSecondary,
          ),
        ),
        const SizedBox(height: 36),

        // CTAs
        FilledButton.icon(
          onPressed: () => _openForm(register: true),
          icon: const Icon(Icons.person_add_alt_rounded, size: 20),
          label: const Text('Get Started'),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () => _openForm(register: false),
          icon: const Icon(Icons.login_rounded, size: 20),
          label: const Text('I have an account'),
        ),
        const SizedBox(height: 20),

        // Guest mode
        Center(
          child: TextButton(
            onPressed: widget.onTryAsGuest,
            child: const Text('Try without account'),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  // ── Auth Form ───────────────────────────────────────────────────────────

  Widget _buildForm() {
    final theme = Theme.of(context);
    return ListView(
      key: const ValueKey('form'),
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
      children: [
        const SizedBox(height: 24),
        // Back button
        Align(
          alignment: Alignment.centerLeft,
          child: IconButton(
            onPressed: () => setState(() {
              _showingForm = false;
              _error = null;
            }),
            icon: const Icon(Icons.arrow_back_rounded),
            tooltip: 'Kembali',
            style: IconButton.styleFrom(
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              foregroundColor: theme.colorScheme.onSurface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: BorderSide(color: theme.colorScheme.outline),
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),

        // Title
        Text(
          _isRegister ? 'Buat akun baru' : 'Masuk ke Nara',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.4,
            height: 1.2,
            color: theme.textTheme.headlineMedium?.color,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          _isRegister
              ? 'Siapkan akun agar tugas dan pengingat tetap tersimpan.'
              : 'Lanjutkan mengelola tugas dan pengingat kamu.',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w400,
            height: 1.5,
            color: theme.textTheme.bodyMedium?.color,
          ),
        ),
        const SizedBox(height: 24),

        // Error banner
        if (_error != null) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: NaraColors.dangerLight,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: NaraColors.danger.withValues(alpha: 0.25),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline,
                    color: NaraColors.danger, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _error!,
                    style: const TextStyle(
                      fontSize: 13,
                      color: NaraColors.danger,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Form fields
        Form(
          key: _formKey,
          child: Column(
            children: [
              if (_isRegister) ...[
                TextFormField(
                  controller: _displayNameController,
                  textInputAction: TextInputAction.next,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'Nama',
                    hintText: 'Nama kamu',
                    prefixIcon: Icon(Icons.person_outline, size: 20),
                  ),
                  validator: (v) => (v ?? '').trim().isEmpty
                      ? 'Nama tidak boleh kosong'
                      : null,
                ),
                const SizedBox(height: 14),
              ],
              TextFormField(
                controller: _emailController,
                textInputAction: TextInputAction.next,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  hintText: 'nama@email.com',
                  prefixIcon: Icon(Icons.email_outlined, size: 20),
                ),
                validator: (v) {
                  if ((v ?? '').trim().isEmpty) {
                    return 'Email tidak boleh kosong';
                  }
                  if (!v!.contains('@')) {
                    return 'Format email tidak valid';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _passwordController,
                textInputAction: TextInputAction.done,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Kata sandi',
                  prefixIcon: const Icon(Icons.lock_outline, size: 20),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.visibility_outlined, size: 20),
                    tooltip: 'Lihat kata sandi',
                    onPressed: () {},
                  ),
                ),
                validator: (v) =>
                    (v ?? '').length < 6 ? 'Minimal 6 karakter' : null,
                onFieldSubmitted: (_) => _submit(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Submit
        SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton.icon(
            onPressed: _loading ? null : _submit,
            icon: _loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Icon(
                    _isRegister
                        ? Icons.person_add_rounded
                        : Icons.login_rounded,
                    size: 20,
                  ),
            label: Text(_loading
                ? (_isRegister ? 'Membuat akun…' : 'Masuk…')
                : (_isRegister ? 'Buat Akun' : 'Masuk')),
          ),
        ),
        const SizedBox(height: 14),

        // Toggle register/login
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              _isRegister ? 'Sudah punya akun?' : 'Belum punya akun?',
              style: TextStyle(
                fontSize: 13,
                color: theme.textTheme.bodyMedium?.color,
              ),
            ),
            TextButton(
              onPressed: () => setState(() {
                _isRegister = !_isRegister;
                _error = null;
              }),
              child: Text(
                _isRegister ? 'Masuk' : 'Buat akun',
                style: const TextStyle(fontSize: 13),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  void _openForm({required bool register}) {
    setState(() {
      _isRegister = register;
      _showingForm = true;
      _error = null;
      _displayNameController.clear();
      _emailController.clear();
      _passwordController.clear();
    });
  }
}

// ── Background & Floating Elements ─────────────────────────────────────

class _WelcomePill extends StatelessWidget {
  const _WelcomePill({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: dark
            ? Colors.white.withValues(alpha: 0.08)
            : NaraColors.surface.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: dark ? const Color(0xFF23423E) : NaraColors.border,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: dark ? const Color(0xFFE5F5F2) : NaraColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _AnimatedGradient extends StatelessWidget {
  const _AnimatedGradient({required this.progress});
  final double progress;

  @override
  Widget build(BuildContext context) {
    // Cycle the teal tint angle slowly
    final t = (progress * 2 * math.pi) % (2 * math.pi);
    final dark = Theme.of(context).brightness == Brightness.dark;

    return Positioned.fill(
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment(
              math.sin(t) * 0.3,
              1.0 + math.cos(t) * 0.2,
            ),
            colors: dark
                ? const [
                    Color(0xFF111C1B),
                    Color(0xFF162522),
                    Color(0xFF203431),
                  ]
                : const [
                    NaraColors.background,
                    Color(0xFFF4F4F0),
                    Color(0xFFF0FDFA),
                  ],
            stops: const [0.0, 0.65, 1.0],
          ),
        ),
      ),
    );
  }
}

class _StaticCircle extends StatelessWidget {
  const _StaticCircle({
    required this.size,
    required this.color,
    required this.right,
    required this.bottom,
    this.opacity = 0.04,
  });

  final double size;
  final Color color;
  final double right;
  final double bottom;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      right: right,
      bottom: bottom,
      child: ExcludeSemantics(
        child: RepaintBoundary(
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withValues(alpha: opacity),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Onboarding Components ───────────────────────────────────────────────

class _OnboardingSlide extends StatelessWidget {
  const _OnboardingSlide({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Icon in soft circle
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 44, color: theme.colorScheme.primary),
          ),
          const SizedBox(height: 32),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
              height: 1.2,
              color: theme.textTheme.headlineMedium?.color,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            body,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              height: 1.55,
              color: theme.textTheme.bodyMedium?.color,
            ),
          ),
        ],
      ),
    );
  }
}

class _OnboardingDots extends StatelessWidget {
  const _OnboardingDots({required this.active, required this.count});
  final int active;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(count, (i) {
        final isActive = i == active;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: isActive ? 20 : 8,
          height: 8,
          decoration: BoxDecoration(
            color: isActive ? NaraColors.primary : NaraColors.borderStrong,
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}
