import 'package:flutter/material.dart';

import '../../core/services/api_client.dart';
import '../../core/widgets/nara_logo_mark.dart';

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
  late final AnimationController logoController;

  bool isRegister = false;
  bool showingForm = false;
  bool loading = false;
  String? error;

  @override
  void initState() {
    super.initState();
    logoController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    logoController.dispose();
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
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 420),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              transitionBuilder: (child, animation) {
                final offset = Tween<Offset>(
                  begin: const Offset(0, 0.04),
                  end: Offset.zero,
                ).animate(animation);
                return FadeTransition(
                  opacity: animation,
                  child: SlideTransition(position: offset, child: child),
                );
              },
              child: showingForm
                  ? _buildAuthForm(theme)
                  : _buildWelcome(context, theme),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWelcome(BuildContext context, ThemeData theme) {
    return Padding(
      key: const ValueKey('welcome'),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Spacer(),
          AnimatedBuilder(
            animation: logoController,
            builder: (context, child) {
              return NaraLogoMark(
                size: 112,
                pulse: Curves.easeInOut.transform(logoController.value),
              );
            },
          ),
          const SizedBox(height: 16),
          Text(
            'Your calm command center for tasks and Nara Bot.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyLarge,
          ),
          const Spacer(),
          FilledButton.icon(
            onPressed: () => _openForm(register: false),
            icon: const Icon(Icons.login),
            label: const Text('Sign In'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => _openForm(register: true),
            icon: const Icon(Icons.person_add_alt),
            label: const Text('Create Account'),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildAuthForm(ThemeData theme) {
    return ListView(
      key: const ValueKey('auth-form'),
      padding: const EdgeInsets.all(20),
      shrinkWrap: true,
      children: [
        Row(
          children: [
            const NaraLogoMark(size: 46, showWordmark: false),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isRegister ? 'Create account' : 'Welcome back',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    isRegister
                        ? 'Start setting up tasks and Nara Bot.'
                        : 'Sign in to your Nara workspace.',
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
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
                    decoration: const InputDecoration(labelText: 'Email'),
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
                    decoration: const InputDecoration(labelText: 'Password'),
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
                  const SizedBox(height: 4),
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      error!,
                      style: TextStyle(color: theme.colorScheme.error),
                    ),
                  ],
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: loading ? null : submit,
                    icon: loading
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Icon(isRegister ? Icons.person_add_alt : Icons.login),
                    label: Text(isRegister ? 'Create Account' : 'Sign In'),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        TextButton.icon(
          onPressed: loading
              ? null
              : () => setState(() {
                    showingForm = false;
                    error = null;
                  }),
          icon: const Icon(Icons.arrow_back),
          label: const Text('Back'),
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
        color: Theme.of(context)
            .colorScheme
            .surfaceContainerHighest
            .withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Row(
          children: [
            Expanded(
              child: _AuthModeButton(
                label: 'Login',
                icon: Icons.login,
                selected: !isRegister,
                enabled: enabled,
                onTap: () => onChanged(false),
              ),
            ),
            const SizedBox(width: 4),
            Expanded(
              child: _AuthModeButton(
                label: 'Register',
                icon: Icons.person_add_alt,
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
    final color = selected
        ? Theme.of(context).colorScheme.primary
        : Theme.of(context).colorScheme.onSurfaceVariant;

    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(6),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
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
                style: TextStyle(color: color, fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
