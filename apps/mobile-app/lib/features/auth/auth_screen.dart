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
  bool _loading = false;
  bool _obscurePassword = true;
  String? _error;

  bool get _isIndonesian => widget.language == NaraLanguagePreference.indonesia;

  @override
  void dispose() {
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
      if (mounted && Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }
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
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          const _WelcomeBackground(),
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: _buildWelcome(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Welcome Screen ─────────────────────────────────────────────────────

  Widget _buildWelcome() {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final theme = Theme.of(context);
    final accent = theme.colorScheme.primary;
    final headingColor =
        dark ? const Color(0xFFF1F7F5) : NaraColors.textPrimary;
    final bodyColor =
        dark ? const Color(0xFFC5D6D2) : NaraColors.textSecondary;
    final mutedColor = dark ? const Color(0xFF91AAA5) : NaraColors.textMuted;

    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
      children: [
        // ── Top bar: logo + wordmark ──
        Row(
          children: [
            const NaraLogoMark(size: 32, showWordmark: false, pulse: 0),
            const SizedBox(width: 10),
            Text(
              'Nara',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.3,
                color: headingColor,
              ),
            ),
          ],
        ),

        const SizedBox(height: 44),

        // ── Editorial headline ──
        // Mixed weight + accent on the key phrase; feels hand-set, not templated.
        RichText(
          text: TextSpan(
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.6,
              height: 1.08,
              color: headingColor,
              fontFamily: theme.textTheme.headlineMedium?.fontFamily,
            ),
            children: _isIndonesian
                ? <InlineSpan>[
                    const TextSpan(text: 'Satu tempat buat\n'),
                    const TextSpan(text: 'kerjaan yang '),
                    TextSpan(
                      text: 'gampang kelewat.',
                      style: TextStyle(
                        color: accent,
                        fontStyle: FontStyle.italic,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ]
                : <InlineSpan>[
                    const TextSpan(text: 'One place for\n'),
                    const TextSpan(text: 'the work that '),
                    TextSpan(
                      text: 'is easy to miss.',
                      style: TextStyle(
                        color: accent,
                        fontStyle: FontStyle.italic,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
          ),
        ),

        const SizedBox(height: 14),

        // ── Subhead — warmer, specific ──
        Text(
          _isIndonesian
              ? 'Catat tugas, siapkan pengingat, dan atur kapan Nara boleh membantu lewat WhatsApp.'
              : 'Capture tasks, prepare reminders, and choose when Nara may help via WhatsApp.',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            height: 1.55,
            color: bodyColor,
          ),
        ),

        const SizedBox(height: 32),

        // ── Bespoke "moment" preview (not a SaaS mock) ──
        _WelcomeMomentPreview(isIndonesian: _isIndonesian),

        const SizedBox(height: 28),

        // ── Single primary CTA ──
        SizedBox(
          width: double.infinity,
          height: 50,
          child: FilledButton.icon(
            onPressed: () => _openForm(register: true),
            icon: const Icon(Icons.arrow_forward_rounded, size: 20),
            label: Text(
              _isIndonesian ? 'Mulai pakai Nara' : 'Start using Nara',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.1,
              ),
            ),
          ),
        ),

        const SizedBox(height: 14),

        // ── Inline text links (not chunky buttons) ──
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              _isIndonesian ? 'Sudah punya akun?' : 'Have an account?',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: bodyColor,
              ),
            ),
            TextButton(
              onPressed: () => _openForm(register: false),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                minimumSize: const Size(0, 32),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                _isIndonesian ? 'Masuk' : 'Sign in',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: accent,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 20),

        // ── Inline microcopy (not a boxed card) ──
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.lock_outline_rounded,
              size: 14,
              color: mutedColor,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _isIndonesian
                    ? 'Tugas, pengingat, dan izin Nara Bot bisa kamu atur lagi setelah masuk.'
                    : 'Tasks, reminders, and Nara Bot permissions can be adjusted after sign-in.',
                style: TextStyle(
                  fontSize: 12,
                  height: 1.45,
                  fontWeight: FontWeight.w500,
                  color: mutedColor,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFormSheet({required ScrollController scrollController}) {
    final theme = Theme.of(context);
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        controller: scrollController,
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: context.naraBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(
              _isRegister
                  ? (_isIndonesian ? 'Buat akun baru' : 'Create account')
                  : (_isIndonesian ? 'Masuk ke Nara' : 'Sign in to Nara'),
              style: theme.textTheme.titleLarge,
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
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: NaraColors.dangerLight,
                  borderRadius: BorderRadius.circular(NaraColors.radiusSm),
                  border: Border.all(
                    color: NaraColors.danger.withValues(alpha: 0.25),
                  ),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(
                    fontSize: 13,
                    color: NaraColors.danger,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
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
                    onFieldSubmitted: (_) => _submit(),
                    decoration: InputDecoration(
                      labelText: _isIndonesian ? 'Kata sandi' : 'Password',
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                          size: 20,
                        ),
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
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 48,
              child: FilledButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(_isRegister
                        ? (_isIndonesian ? 'Buat Akun' : 'Create Account')
                        : (_isIndonesian ? 'Masuk' : 'Sign In')),
              ),
            ),
            const SizedBox(height: 10),
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
                  style: theme.textTheme.bodyMedium,
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
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openForm({required bool register}) async {
    setState(() {
      _isRegister = register;
      _error = null;
      _displayNameController.clear();
      _emailController.clear();
      _passwordController.clear();
      _obscurePassword = true;
    });

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => StatefulBuilder(
        builder: (context, sheetSetState) {
          return DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.72,
            minChildSize: 0.45,
            maxChildSize: 0.92,
            builder: (_, scrollController) {
              return _buildFormSheet(scrollController: scrollController);
            },
          );
        },
      ),
    );
  }
}

// ── Background & Floating Elements ─────────────────────────────────────

class _WelcomeBackground extends StatelessWidget {
  const _WelcomeBackground();

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Positioned.fill(
      child: ColoredBox(
        color: dark ? const Color(0xFF141A18) : NaraColors.background,
      ),
    );
  }
}

/// Bespoke "moment" preview — an open-notebook feel rather than a SaaS mock.
/// Shows one task awaiting action + one reminder + a quiet Nara Bot line.
class _WelcomeMomentPreview extends StatelessWidget {
  const _WelcomeMomentPreview({required this.isIndonesian});

  final bool isIndonesian;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final theme = Theme.of(context);
    final surface = dark ? const Color(0xFF182725) : NaraColors.surface;
    final border = dark ? const Color(0xFF34504C) : NaraColors.border;
    final titleColor =
        dark ? const Color(0xFFF1F7F5) : NaraColors.textPrimary;
    final metaColor =
        dark ? const Color(0xFF91AAA5) : NaraColors.textMuted;
    final dividerColor = dark ? const Color(0xFF23423E) : NaraColors.border;

    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(NaraColors.radiusMd),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Date label with a small accent dot
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                isIndonesian ? 'Hari ini' : 'Today',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.4,
                  color: metaColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // One task — checkbox + title + meta
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              _PreviewCheckbox(color: theme.colorScheme.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isIndonesian
                          ? 'Follow up proposal yang belum dijawab'
                          : 'Follow up the proposal still waiting',
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        height: 1.3,
                        color: titleColor,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isIndonesian ? 'Sore ini' : 'This afternoon',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                        color: metaColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),
          Divider(height: 1, color: dividerColor),
          const SizedBox(height: 14),

          // One reminder — bell icon + chip-like text
          Row(
            children: [
              const Icon(
                Icons.notifications_active_outlined,
                size: 16,
                color: NaraColors.warning,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  isIndonesian
                      ? 'Ingatkan pembayaran DP — Besok 09.00'
                      : 'Remind about the deposit — Tomorrow 09:00',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: titleColor,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),
          Divider(height: 1, color: dividerColor),
          const SizedBox(height: 12),

          // Quiet Nara Bot line — agent dot + text
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: NaraColors.agent,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isIndonesian
                      ? 'Nara Bot minta izin sebelum menjalankan tindakan ini.'
                      : 'Nara Bot asks before taking this action.',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w500,
                    color: metaColor,
                    height: 1.4,
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

class _PreviewCheckbox extends StatelessWidget {
  const _PreviewCheckbox({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 18,
      height: 18,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: color, width: 1.8),
      ),
    );
  }
}
