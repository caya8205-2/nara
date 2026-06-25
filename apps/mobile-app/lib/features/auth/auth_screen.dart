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
  bool _obscurePassword = true;
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

  String _friendlyError(Object err) {
    final msg = err.toString().toLowerCase();
    if (msg.contains('invalid') ||
        msg.contains('401') ||
        msg.contains('wrong')) {
      return _isIndonesian
          ? 'Email atau kata sandi tidak cocok.'
          : 'Email or password does not match.';
    }
    if (msg.contains('already exists') || msg.contains('409')) {
      return _isIndonesian
          ? 'Akun dengan email ini sudah terdaftar.'
          : 'An account with this email already exists.';
    }
    if (msg.contains('network') ||
        msg.contains('socket') ||
        msg.contains('timeout')) {
      return _isIndonesian
          ? 'Tidak bisa terhubung. Periksa koneksi internet kamu.'
          : 'Could not connect. Check your internet connection.';
    }
    return _isIndonesian
        ? 'Terjadi kesalahan. Coba lagi sebentar.'
        : 'Something went wrong. Try again in a moment.';
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return PopScope(
      canPop: !_showingForm,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _showingForm) {
          _closeForm();
        }
      },
      child: Scaffold(
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
      ),
    );
  }

  // ── Onboarding ─────────────────────────────────────────────────────────

  Widget _buildOnboarding() {
    final slides = _isIndonesian
        ? const [
            _OnboardingSlide(
              icon: Icons.checklist_rounded,
              title: 'Lihat kerjaan penting tanpa bongkar chat',
              body:
                  'Nara merapikan tugas, jadwal, dan hal yang perlu ditindaklanjuti di satu tempat.',
            ),
            _OnboardingSlide(
              icon: Icons.chat_bubble_outline_rounded,
              title: 'Siapkan Nara Bot saat WhatsApp sudah siap',
              body:
                  'Hubungkan nomor kerja, atur izin, lalu biarkan Nara membantu mengingatkan hal penting.',
            ),
            _OnboardingSlide(
              icon: Icons.verified_user_outlined,
              title: 'Tindakan penting tetap minta izin',
              body:
                  'Kamu tetap pegang kontrol untuk tugas, pengingat, dan akses yang butuh persetujuan.',
            ),
          ]
        : const [
            _OnboardingSlide(
              icon: Icons.checklist_rounded,
              title: 'Start the day with a clear list',
              body:
                  'Tasks and reminders stay organized so you know what needs attention first.',
            ),
            _OnboardingSlide(
              icon: Icons.chat_bubble_outline_rounded,
              title: 'Prepare help from Nara Bot',
              body:
                  'Connect WhatsApp when you are ready, then let Nara keep follow-ups tidy.',
            ),
            _OnboardingSlide(
              icon: Icons.tune_rounded,
              title: 'Match your working style',
              body:
                  'Choose how Nara responds, how independently it helps, and when it should ask first.',
            ),
          ];

    return Column(
      children: [
        // Skip button (top-right)
        Align(
          alignment: Alignment.topRight,
          child: Padding(
            padding: const EdgeInsets.only(right: 16, top: 8),
            child: TextButton(
              onPressed: () => setState(() => _onboardingDone = true),
              child: Text(_isIndonesian ? 'Lewati' : 'Skip'),
            ),
          ),
        ),

        // Slides
        Expanded(
          child: PageView(
            controller: _pageController,
            onPageChanged: (page) => setState(() => _onboardingPage = page),
            children: slides,
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
                child: Text(
                  _onboardingPage < 2
                      ? (_isIndonesian ? 'Lanjut' : 'Next')
                      : (_isIndonesian ? 'Mulai' : 'Get Started'),
                ),
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
    final theme = Theme.of(context);
    return ListView(
      key: const ValueKey('welcome'),
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
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
              Row(
                children: [
                  const NaraLogoMark(size: 48, showWordmark: false, pulse: 0),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Nara',
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0,
                            color: dark
                                ? const Color(0xFFF1F7F5)
                                : NaraColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _isIndonesian
                              ? 'Ruang kerja pribadi'
                              : 'Personal work assistant',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: dark
                                ? const Color(0xFFC5D6D2)
                                : NaraColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _WorkspaceStatusPill(
                    icon: Icons.lock_outline_rounded,
                    label: _isIndonesian ? 'Privat' : 'Private',
                  ),
                ],
              ),
              const SizedBox(height: 26),
              Text(
                _isIndonesian
                    ? 'Satu tempat buat kerjaan yang gampang kelewat.'
                    : 'One place for the work that is easy to miss.',
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0,
                  height: 1.06,
                  color:
                      dark ? const Color(0xFFF1F7F5) : NaraColors.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                _isIndonesian
                    ? 'Catat tugas, siapkan pengingat, dan atur kapan Nara Bot boleh membantu lewat WhatsApp.'
                    : 'Capture what needs doing, prepare reminders, and tune Nara to support your working rhythm.',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  height: 1.5,
                  color:
                      dark ? const Color(0xFFC5D6D2) : NaraColors.textSecondary,
                ),
              ),
              const SizedBox(height: 20),
              _WelcomeWorkspacePreview(isIndonesian: _isIndonesian),
            ],
          ),
        ),
        const SizedBox(height: 18),
        _WelcomeActionPanel(
          isIndonesian: _isIndonesian,
          onRegister: () => _openForm(register: true),
          onSignIn: () => _openForm(register: false),
          onPreview: widget.onTryAsGuest,
        ),
        const SizedBox(height: 14),
        _WelcomeSecurityNote(
          text: _isIndonesian
              ? 'Nara Bot, persetujuan, dan pengingat bisa kamu atur lagi setelah masuk.'
              : 'Nara Bot, approvals, and reminders can be adjusted after sign-in.',
        ),
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
            onPressed: _closeForm,
            icon: const Icon(Icons.arrow_back_rounded),
            tooltip: _isIndonesian ? 'Kembali' : 'Back',
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
          _isRegister
              ? (_isIndonesian ? 'Buat akun baru' : 'Create account')
              : (_isIndonesian ? 'Masuk ke Nara' : 'Sign in to Nara'),
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
              ? (_isIndonesian
                  ? 'Siapkan akun agar tugas dan pengingat tetap tersimpan.'
                  : 'Create an account so your tasks and reminders stay saved.')
              : (_isIndonesian
                  ? 'Lanjutkan mengelola tugas dan pengingat kamu.'
                  : 'Continue managing your tasks and reminders.'),
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
                  decoration: InputDecoration(
                    labelText: _isIndonesian ? 'Nama' : 'Name',
                    hintText: _isIndonesian ? 'Nama kamu' : 'Your name',
                    prefixIcon: const Icon(Icons.person_outline, size: 20),
                  ),
                  validator: (v) => (v ?? '').trim().isEmpty
                      ? (_isIndonesian
                          ? 'Nama tidak boleh kosong'
                          : 'Name is required')
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
                    return _isIndonesian
                        ? 'Email tidak boleh kosong'
                        : 'Email is required';
                  }
                  if (!v!.contains('@')) {
                    return _isIndonesian
                        ? 'Format email tidak valid'
                        : 'Enter a valid email address';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _passwordController,
                textInputAction: TextInputAction.done,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  labelText: _isIndonesian ? 'Kata sandi' : 'Password',
                  prefixIcon: const Icon(Icons.lock_outline, size: 20),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      size: 20,
                    ),
                    tooltip: _obscurePassword
                        ? (_isIndonesian ? 'Lihat kata sandi' : 'Show password')
                        : (_isIndonesian ? 'Sembunyikan' : 'Hide password'),
                    onPressed: () => setState(
                      () => _obscurePassword = !_obscurePassword,
                    ),
                  ),
                ),
                validator: (v) => (v ?? '').length < 6
                    ? (_isIndonesian
                        ? 'Minimal 6 karakter'
                        : 'Use at least 6 characters')
                    : null,
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
            label: Text(
              _loading
                  ? (_isRegister
                      ? (_isIndonesian ? 'Membuat akun...' : 'Creating...')
                      : (_isIndonesian ? 'Masuk...' : 'Signing in...'))
                  : (_isRegister
                      ? (_isIndonesian ? 'Buat Akun' : 'Create Account')
                      : (_isIndonesian ? 'Masuk' : 'Sign In')),
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Toggle register/login
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              _isRegister
                  ? (_isIndonesian
                      ? 'Sudah punya akun?'
                      : 'Already have an account?')
                  : (_isIndonesian
                      ? 'Belum punya akun?'
                      : 'Do not have an account yet?'),
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
                _isRegister
                    ? (_isIndonesian ? 'Masuk' : 'Sign in')
                    : (_isIndonesian ? 'Buat akun' : 'Create account'),
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
      _obscurePassword = true;
    });
  }

  void _closeForm() {
    setState(() {
      _showingForm = false;
      _error = null;
    });
  }
}

// ── Background & Floating Elements ─────────────────────────────────────

class _WelcomeWorkspacePreview extends StatelessWidget {
  const _WelcomeWorkspacePreview({required this.isIndonesian});

  final bool isIndonesian;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final surface = dark
        ? Colors.white.withValues(alpha: 0.08)
        : NaraColors.surface.withValues(alpha: 0.86);
    final border =
        dark ? Colors.white.withValues(alpha: 0.1) : NaraColors.border;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _WorkspaceStatusPill(
                icon: Icons.today_outlined,
                label: isIndonesian ? 'Hari ini' : 'Today',
              ),
              const Spacer(),
              Icon(
                Icons.more_horiz_rounded,
                size: 20,
                color: dark ? const Color(0xFF91AAA5) : NaraColors.textMuted,
              ),
            ],
          ),
          const SizedBox(height: 12),
          _WorkspaceAgendaRow(
            icon: Icons.assignment_turned_in_outlined,
            title: isIndonesian
                ? 'Follow up proposal yang belum dijawab'
                : 'Follow up the proposal still waiting',
            meta: isIndonesian ? 'Sore ini' : 'This afternoon',
            color: NaraColors.primary,
          ),
          const SizedBox(height: 10),
          _WorkspaceAgendaRow(
            icon: Icons.notifications_active_outlined,
            title: isIndonesian
                ? 'Ingatkan pembayaran DP'
                : 'Remind about the deposit payment',
            meta: isIndonesian ? 'Besok 09.00' : 'Tomorrow 09:00',
            color: NaraColors.warning,
          ),
          const SizedBox(height: 10),
          _WorkspaceAgendaRow(
            icon: Icons.verified_user_outlined,
            title: isIndonesian
                ? 'Nara Bot minta izin sebelum jalan'
                : 'Nara Bot asks before acting',
            meta: isIndonesian ? 'Menunggu persetujuan' : 'Waiting approval',
            color: NaraColors.agent,
          ),
        ],
      ),
    );
  }
}

class _WorkspaceAgendaRow extends StatelessWidget {
  const _WorkspaceAgendaRow({
    required this.icon,
    required this.title,
    required this.meta,
    required this.color,
  });

  final IconData icon;
  final String title;
  final String meta;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: color.withValues(alpha: dark ? 0.22 : 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 18),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color:
                      dark ? const Color(0xFFF1F7F5) : NaraColors.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                meta,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: dark ? const Color(0xFF91AAA5) : NaraColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _WelcomeActionPanel extends StatelessWidget {
  const _WelcomeActionPanel({
    required this.isIndonesian,
    required this.onRegister,
    required this.onSignIn,
    required this.onPreview,
  });

  final bool isIndonesian;
  final VoidCallback onRegister;
  final VoidCallback onSignIn;
  final VoidCallback onPreview;

  @override
  Widget build(BuildContext context) {
    return Container(
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
              onPressed: onRegister,
              icon: const Icon(Icons.person_add_alt_rounded, size: 20),
              label: Text(
                isIndonesian ? 'Mulai pakai Nara' : 'Start using Nara',
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 46,
                  child: OutlinedButton.icon(
                    onPressed: onSignIn,
                    icon: const Icon(Icons.login_rounded, size: 20),
                    label: Text(isIndonesian ? 'Masuk' : 'Sign in'),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SizedBox(
                  height: 46,
                  child: TextButton.icon(
                    onPressed: onPreview,
                    icon: const Icon(Icons.visibility_outlined, size: 19),
                    label: Text(isIndonesian ? 'Coba dulu' : 'Preview'),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _WelcomeSecurityNote extends StatelessWidget {
  const _WelcomeSecurityNote({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: dark
            ? Colors.white.withValues(alpha: 0.06)
            : NaraColors.surface.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: dark ? const Color(0xFF23423E) : NaraColors.border,
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.verified_user_outlined,
            size: 18,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12,
                height: 1.45,
                fontWeight: FontWeight.w600,
                color:
                    dark ? const Color(0xFFC5D6D2) : NaraColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WorkspaceStatusPill extends StatelessWidget {
  const _WorkspaceStatusPill({
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
