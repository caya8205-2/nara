import 'package:flutter/material.dart';

import '../../core/services/api_client.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({
    required this.apiClient,
    required this.onServerUrlChanged,
    required this.onOperatorTokenChanged,
    super.key,
  });

  final NaraApiClient apiClient;
  final ValueChanged<String> onServerUrlChanged;
  final ValueChanged<String?> onOperatorTokenChanged;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController serverController;
  final usernameController = TextEditingController();
  final passwordController = TextEditingController();
  bool loading = false;
  String message = 'Not connected';

  @override
  void initState() {
    super.initState();
    serverController = TextEditingController(text: widget.apiClient.serverUrl);
  }

  @override
  void dispose() {
    serverController.dispose();
    usernameController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> testConnection() async {
    setState(() {
      loading = true;
      message = 'Checking';
    });
    widget.onServerUrlChanged(serverController.text.trim());

    try {
      final report = await widget.apiClient.testReadiness();
      setState(() {
        message = report['ok'] == true ? 'Connected' : 'Needs attention';
      });
    } catch (error) {
      setState(() => message = 'Connection failed');
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> login() async {
    setState(() {
      loading = true;
      message = 'Signing in';
    });
    widget.onServerUrlChanged(serverController.text.trim());

    try {
      final token = await widget.apiClient.login(
        usernameController.text.trim(),
        passwordController.text,
      );
      widget.onOperatorTokenChanged(token);
      setState(() => message = 'Signed in');
    } catch (error) {
      setState(() => message = 'Sign in failed');
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Settings',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Office server',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: serverController,
                  decoration: const InputDecoration(
                    labelText: 'Backend API URL',
                    hintText: 'https://your-tunnel-hostname.example.com',
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: loading ? null : testConnection,
                  icon: const Icon(Icons.wifi_tethering),
                  label: const Text('Test Connection'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Operator session',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: usernameController,
                  decoration: const InputDecoration(labelText: 'Username'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password'),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: loading ? null : login,
                  icon: const Icon(Icons.login),
                  label: const Text('Sign In'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('Status'),
            subtitle: Text(message),
          ),
        ),
      ],
    );
  }
}
