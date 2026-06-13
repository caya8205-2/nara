import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/services/api_client.dart';
import '../../core/widgets/nara_logo_mark.dart';

const _ink = Color(0xFF0F172A);
const _muted = Color(0xFF64748B);
const _teal = Color(0xFF0D9488);
const _green = Color(0xFF22C55E);
const _amber = Color(0xFFF59E0B);

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    required this.apiClient,
    required this.onAuthenticated,
    super.key,
  });

  final NaraApiClient apiClient;
  final void Function(Map<String, dynamic> user, {required bool isNewUser})
      onAuthenticated;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen>
    with SingleTickerProviderStateMixin {
  final formKey = GlobalKey<FormState>();
  final displayNameController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  late final AnimationController motionController;

  bool isRegister = false;
  bool showingForm = false;
  bool loading = false;
  String? error;

  @override
  void initState() {
    super.initState();
    motionController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 5200),
    )..repeat();
  }

  @override
  void dispose() {
    motionController.dispose();
    displayNameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!formKey.currentState!.validate()) return;

    setState(() {
      loading = true;
      error = null;
    });
    widget.apiClient.serverUrl = NaraApiClient.defaultServerUrl;

    try {
      final user = isRegister
          ? await widget.apiClient.registerUser(
              displayName: displayNameController.text.trim(),
              email: emailController.text.trim(),
              password: passwordController.text,
            )
          : await widget.apiClient.loginUser(
              email: emailController.text.trim(),
              password: passwordController.text,
            );
      widget.onAuthenticated(user, isNewUser: isRegister);
    } catch (err) {
      setState(() => error = _friendlyError(err));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedBuilder(
        animation: motionController,
        builder: (context, child) {
          return Stack(
            fit: StackFit.expand,
            children: [
              _AuthBackdrop(progress: motionController.value),
              SafeArea(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 480),
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 460),
                      switchInCurve: Curves.easeOutCubic,
                      switchOutCurve: Curves.easeInCubic,
                      transitionBuilder: (child, animation) {
                        final offset = Tween<Offset>(
                          begin: const Offset(0, 0.045),
                          end: Offset.zero,
                        ).animate(animation);
                        return FadeTransition(
                          opacity: animation,
                          child: SlideTransition(position: offset, child: child),
                        );
                      },
                      child: showingForm
                          ? _buildAuthForm(context)
                          : _buildWelcome(context),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildWelcome(BuildContext context) {
    final theme = Theme.of(context);
    final pulse = (math.sin(motionController.value * math.pi * 2) + 1) / 2;

    return ListView(
      key: const ValueKey('welcome'),
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
      children: [
        const SizedBox(height: 18),
        _BrandHero(pulse: pulse),
        const SizedBox(height: 24),
        Text(
          'Nara',
          textAlign: TextAlign.center,
          style: theme.textTheme.displaySmall?.copyWith(
            color: _ink,
            fontWeight: FontWeight.w900,
            letterSpacing: 0,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Your self-hosted command center for tasks, reminders, and WhatsApp-powered Nara Bot setup.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: _muted,
            height: 1.45,
          ),
        ),
        const SizedBox(height: 22),
        const _SignalPanel(),
        const SizedBox(height: 18),
        const Row(
          children: [
            Expanded(
              child: _FeatureTile(
                icon: Icons.checklist_rounded,
                label: 'Tasks',
                value: 'User scoped',
                color: _teal,
              ),
            ),
            SizedBox(width: 10),
            Expanded(
              child: _FeatureTile(
                icon: Icons.chat_bubble_outline_rounded,
                label: 'Nara Bot',
                value: 'WhatsApp ready',
                color: _green,
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: () => _openForm(register: false),
          icon: const Icon(Icons.login_rounded),
          label: const Text('Sign In'),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: () => _openForm(register: true),
          icon: const Icon(Icons.person_add_alt_rounded),
          label: const Text('Create Account'),
        ),
        const SizedBox(height: 12),
        Text(
          'Built for a private Nara server, not a public cloud workspace.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodySmall?.copyWith(color: _muted),
        ),
      ],
    );
  }

  Widget _buildAuthForm(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      key: const ValueKey('auth-form'),
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 20),
      shrinkWrap: true,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: IconButton.filledTonal(
            onPressed: loading
                ? null
                : () => setState(() {
                      showingForm = false;
                      error = null;
                    }),
            icon: const Icon(Icons.arrow_back_rounded),
            tooltip: 'Back',
          ),
        ),
        const SizedBox(height: 8),
        _AuthPreviewCard(isRegister: isRegister),
        const SizedBox(height: 14),
        DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.94),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 28,
                offset: const Offset(0, 18),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    isRegister ? 'Create account' : 'Welcome back',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      color: _ink,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isRegister
                        ? 'Start with your Nara account, then connect WhatsApp when ready.'
                        : 'Sign in to sync tasks, Nara Bot access, and assistant preferences.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: _muted,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _AuthModeToggle(
                    isRegister: isRegister,
                    enabled: !loading,
                    onChanged: (value) {
                      setState(() {
                        isRegister = value;
                        error = null;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 240),
                    child: isRegister
                        ? Column(
                            key: const ValueKey('display-name'),
                            children: [
                              TextFormField(
                                controller: displayNameController,
                                textInputAction: TextInputAction.next,
                                decoration: const InputDecoration(
                                  labelText: 'Display name',
                                  prefixIcon: Icon(Icons.badge_outlined),
                                ),
                                validator: (value) {
                                  if ((value ?? '').trim().isEmpty) {
                                    return 'Display name is required';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 12),
                            ],
                          )
                        : const SizedBox.shrink(key: ValueKey('no-name')),
                  ),
                  TextFormField(
                    controller: emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.alternate_email_rounded),
                    ),
                    validator: (value) {
                      final email = (value ?? '').trim();
                      if (email.isEmpty) return 'Email is required';
                      if (!email.contains('@')) return 'Enter a valid email';
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: passwordController,
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      prefixIcon: Icon(Icons.lock_outline_rounded),
                    ),
                    onFieldSubmitted: (_) => loading ? null : submit(),
                    validator: (value) {
                      final password = value ?? '';
                      if (password.isEmpty) return 'Password is required';
                      if (isRegister && password.length < 8) {
                        return 'Use at least 8 characters';
                      }
                      return null;
                    },
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    _AuthError(message: error!),
                  ],
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: loading ? null : submit,
                    icon: loading
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Icon(
                            isRegister
                                ? Icons.person_add_alt_rounded
                                : Icons.login_rounded,
                          ),
                    label: Text(isRegister ? 'Create Account' : 'Sign In'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _openForm({required bool register}) {
    setState(() {
      isRegister = register;
      showingForm = true;
      error = null;
    });
  }

  String _friendlyError(Object error) {
    final message = error.toString();
    if (message.contains('Email already registered')) {
      return 'Email is already registered.';
    }
    if (message.contains('Invalid email or password')) {
      return 'Invalid email or password.';
    }
    return 'Could not reach Nara right now. Please try again.';
  }
}

class _AuthBackdrop extends StatelessWidget {
  const _AuthBackdrop({required this.progress});

  final double progress;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _AuthBackdropPainter(progress),
      child: const SizedBox.expand(),
    );
  }
}

class _AuthBackdropPainter extends CustomPainter {
  const _AuthBackdropPainter(this.progress);

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final background = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Color(0xFFF8FAFC),
          Color(0xFFEFFDF9),
          Color(0xFFFFFBEB),
        ],
      ).createShader(rect);
    canvas.drawRect(rect, background);

    final diagonalPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          _teal.withValues(alpha: 0.12),
          _green.withValues(alpha: 0.04),
        ],
      ).createShader(rect);
    final path = Path()
      ..moveTo(size.width * 0.08, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width, size.height * 0.46)
      ..lineTo(0, size.height * 0.7)
      ..lineTo(0, size.height * 0.18)
      ..close();
    canvas.drawPath(path, diagonalPaint);

    final gridPaint = Paint()
      ..color = const Color(0xFF0F766E).withValues(alpha: 0.055)
      ..strokeWidth = 1;
    final drift = progress * 18;
    for (double x = -36 + drift; x < size.width + 36; x += 36) {
      canvas.drawLine(Offset(x, 0), Offset(x - size.height * 0.18, size.height),
          gridPaint);
    }
    for (double y = -32; y < size.height + 32; y += 32) {
      canvas.drawLine(Offset(0, y + drift), Offset(size.width, y), gridPaint);
    }

    final bottomPaint = Paint()..color = Colors.white.withValues(alpha: 0.62);
    final bottomPath = Path()
      ..moveTo(0, size.height * 0.72)
      ..quadraticBezierTo(
        size.width * 0.45,
        size.height * 0.64,
        size.width,
        size.height * 0.78,
      )
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(bottomPath, bottomPaint);
  }

  @override
  bool shouldRepaint(covariant _AuthBackdropPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

class _BrandHero extends StatelessWidget {
  const _BrandHero({required this.pulse});

  final double pulse;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Transform.translate(
        offset: Offset(0, -4 + pulse * 8),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.82),
            border: Border.all(color: Colors.white),
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: _teal.withValues(alpha: 0.18),
                blurRadius: 36,
                offset: const Offset(0, 18),
              ),
            ],
          ),
          child: const Padding(
            padding: EdgeInsets.all(12),
            child: NaraLogoMark(size: 112, showWordmark: false),
          ),
        ),
      ),
    );
  }
}

class _SignalPanel extends StatelessWidget {
  const _SignalPanel();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 24,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: const Padding(
        padding: EdgeInsets.all(14),
        child: Column(
          children: [
            _SignalRow(
              icon: Icons.private_connectivity_rounded,
              title: 'Private by default',
              body: 'Runs against your own Nara server.',
              color: _teal,
            ),
            Divider(height: 18),
            _SignalRow(
              icon: Icons.auto_awesome_rounded,
              title: 'Ready for agent workflows',
              body: 'Tasks and WhatsApp access are prepared for Nara Bot.',
              color: _amber,
            ),
          ],
        ),
      ),
    );
  }
}

class _SignalRow extends StatelessWidget {
  const _SignalRow({
    required this.icon,
    required this.title,
    required this.body,
    required this.color,
  });

  final IconData icon;
  final String title;
  final String body;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Padding(
            padding: const EdgeInsets.all(9),
            child: Icon(icon, color: color, size: 20),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: _ink,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                body,
                style: const TextStyle(color: _muted, height: 1.25),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.88),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 10),
            Text(
              label,
              style: const TextStyle(color: _ink, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: _muted, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

class _AuthPreviewCard extends StatelessWidget {
  const _AuthPreviewCard({required this.isRegister});

  final bool isRegister;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.18),
            blurRadius: 24,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            const DecoratedBox(
              decoration: BoxDecoration(
                color: Color(0xFF123B3B),
                borderRadius: BorderRadius.all(Radius.circular(8)),
              ),
              child: Padding(
                padding: EdgeInsets.all(8),
                child: NaraLogoMark(size: 46, showWordmark: false),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isRegister ? 'New Nara workspace' : 'Nara workspace',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isRegister
                        ? 'Create your profile first.'
                        : 'Continue where your tasks left off.',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.72),
                      height: 1.25,
                    ),
                  ),
                ],
              ),
            ),
            const _LiveBadge(),
          ],
        ),
      ),
    );
  }
}

class _LiveBadge extends StatelessWidget {
  const _LiveBadge();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: _green.withValues(alpha: 0.16),
        border: Border.all(color: _green.withValues(alpha: 0.35)),
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Padding(
        padding: EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        child: Text(
          'Ready',
          style: TextStyle(
            color: Color(0xFF86EFAC),
            fontSize: 12,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _AuthError extends StatelessWidget {
  const _AuthError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.error.withValues(alpha: 0.08),
        border: Border.all(
          color: Theme.of(context).colorScheme.error.withValues(alpha: 0.22),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            Icon(
              Icons.error_outline_rounded,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AuthModeToggle extends StatelessWidget {
  const _AuthModeToggle({
    required this.isRegister,
    required this.enabled,
    required this.onChanged,
  });

  final bool isRegister;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Row(
          children: [
            Expanded(
              child: _AuthModeButton(
                label: 'Login',
                icon: Icons.login_rounded,
                selected: !isRegister,
                enabled: enabled,
                onTap: () => onChanged(false),
              ),
            ),
            const SizedBox(width: 4),
            Expanded(
              child: _AuthModeButton(
                label: 'Register',
                icon: Icons.person_add_alt_rounded,
                selected: isRegister,
                enabled: enabled,
                onTap: () => onChanged(true),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AuthModeButton extends StatelessWidget {
  const _AuthModeButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? _teal : _muted;

    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(6),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: color, fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
