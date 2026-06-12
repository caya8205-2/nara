import 'package:flutter/material.dart';

import '../../core/services/api_client.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    required this.apiClient,
    required this.onAuthenticated,
    super.key,
  });

  final NaraApiClient apiClient;
  final ValueChanged<Map<String, dynamic>> onAuthenticated;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final formKey = GlobalKey<FormState>();
  final displayNameController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final serverController = TextEditingController();

  bool isRegister = false;
  bool loading = false;
  String? error;

  @override
  void initState() {
    super.initState();
    serverController.text = widget.apiClient.serverUrl;
  }

  @override
  void dispose() {
    displayNameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    serverController.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!formKey.currentState!.validate()) return;

    setState(() {
      loading = true;
      error = null;
    });
    widget.apiClient.serverUrl = serverController.text.trim();

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
      widget.onAuthenticated(user);
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
            child: ListView(
              padding: const EdgeInsets.all(20),
              shrinkWrap: true,
              children: [
                const SizedBox(height: 24),
                Text(
                  'Nara',
                  style: theme.textTheme.headlineLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  isRegister
                      ? 'Create your account to start setting up tasks and Nara Bot.'
                      : 'Sign in to your Nara workspace.',
                  style: theme.textTheme.bodyLarge,
                ),
                const SizedBox(height: 24),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Form(
                      key: formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          SegmentedButton<bool>(
                            segments: const [
                              ButtonSegment(value: false, label: Text('Login')),
                              ButtonSegment(
                                  value: true, label: Text('Register')),
                            ],
                            selected: {isRegister},
                            onSelectionChanged: loading
                                ? null
                                : (value) {
                                    setState(() {
                                      isRegister = value.first;
                                      error = null;
                                    });
                                  },
                          ),
                          const SizedBox(height: 16),
                          if (isRegister) ...[
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
                          TextFormField(
                            controller: emailController,
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            decoration: const InputDecoration(
                              labelText: 'Email',
                            ),
                            validator: (value) {
                              final email = (value ?? '').trim();
                              if (email.isEmpty) {
                                return 'Email is required';
                              }
                              if (!email.contains('@')) {
                                return 'Enter a valid email';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: passwordController,
                            obscureText: true,
                            textInputAction: TextInputAction.next,
                            decoration: const InputDecoration(
                              labelText: 'Password',
                            ),
                            validator: (value) {
                              final password = value ?? '';
                              if (password.isEmpty) {
                                return 'Password is required';
                              }
                              if (isRegister && password.length < 8) {
                                return 'Use at least 8 characters';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: serverController,
                            keyboardType: TextInputType.url,
                            textInputAction: TextInputAction.done,
                            decoration: const InputDecoration(
                              labelText: 'Backend API URL',
                              hintText: 'https://nara.example.com',
                            ),
                            validator: (value) {
                              final serverUrl = (value ?? '').trim();
                              if (serverUrl.isEmpty) {
                                return 'Backend API URL is required';
                              }
                              final uri = Uri.tryParse(serverUrl);
                              if (uri == null ||
                                  !uri.hasScheme ||
                                  uri.host.isEmpty) {
                                return 'Enter a valid server URL';
                              }
                              return null;
                            },
                            onFieldSubmitted: (_) => loading ? null : submit(),
                          ),
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
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : Icon(isRegister
                                    ? Icons.person_add_alt
                                    : Icons.login),
                            label:
                                Text(isRegister ? 'Create Account' : 'Sign In'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Connect to your Nara server to continue.',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _friendlyError(Object error) {
    final message = error.toString();
    if (message.contains('Email already registered')) {
      return 'Email is already registered.';
    }
    if (message.contains('Invalid email or password')) {
      return 'Invalid email or password.';
    }
    if (message.contains('Backend API URL')) {
      return 'Backend API URL is not configured.';
    }
    return 'Could not connect to Nara. Check the server URL and try again.';
  }
}
