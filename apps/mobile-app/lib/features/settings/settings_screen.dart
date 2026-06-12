import 'package:flutter/material.dart';

import '../../core/services/api_client.dart';
import '../../core/state/nara_mobile_state.dart';

const _emerald = Color(0xFF059669);
const _amber = Color(0xFFD97706);
const _rose = Color(0xFFE11D48);

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({
    required this.apiClient,
    required this.state,
    required this.onServerUrlChanged,
    required this.onTestConnection,
    required this.onAuthTokenChanged,
    required this.onLogout,
    required this.user,
    super.key,
  });

  final NaraApiClient apiClient;
  final NaraMobileState state;
  final ValueChanged<String> onServerUrlChanged;
  final Future<void> Function() onTestConnection;
  final ValueChanged<String?> onAuthTokenChanged;
  final VoidCallback onLogout;
  final Map<String, dynamic>? user;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController serverController;

  @override
  void initState() {
    super.initState();
    serverController = TextEditingController(text: widget.apiClient.serverUrl);
  }

  @override
  void didUpdateWidget(covariant SettingsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (serverController.text != widget.apiClient.serverUrl) {
      serverController.text = widget.apiClient.serverUrl;
    }
  }

  @override
  void dispose() {
    serverController.dispose();
    super.dispose();
  }

  Future<void> refreshConnection() async {
    widget.onServerUrlChanged(serverController.text.trim());
    await widget.onTestConnection();
  }

  @override
  Widget build(BuildContext context) {
    final displayName = widget.user?['displayName']?.toString() ?? 'Nara user';
    final email = widget.user?['email']?.toString() ?? 'No email';
    final avatarLabel = displayName.trim().isEmpty
        ? 'N'
        : displayName.trim().substring(0, 1).toUpperCase();

    return RefreshIndicator(
      onRefresh: refreshConnection,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Settings',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          const Text('Account, server, and local app preferences.'),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Account',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      child: Text(avatarLabel),
                    ),
                    title: Text(displayName),
                    subtitle: Text(email),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () {
                      widget.onAuthTokenChanged(null);
                      widget.onLogout();
                    },
                    icon: const Icon(Icons.logout),
                    label: const Text('Sign Out'),
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
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Server connection',
                          style: TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                      _ConnectionBadge(state: widget.state.connectionState),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: serverController,
                    keyboardType: TextInputType.url,
                    decoration: const InputDecoration(
                      labelText: 'Backend API URL',
                      hintText: 'https://your-tunnel-hostname.example.com',
                    ),
                    onChanged: widget.onServerUrlChanged,
                  ),
                  const SizedBox(height: 12),
                  Text(widget.state.connectionMessage),
                  if (widget.state.lastConnectionCheck != null)
                    Text(
                      'Last checked ${_timeLabel(widget.state.lastConnectionCheck!)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.storage_outlined),
                  title: const Text('Backend mode'),
                  subtitle: Text(
                    widget.apiClient.serverUrl.contains('10.0.2.2')
                        ? 'Android emulator development'
                        : 'Custom server URL',
                  ),
                ),
                const Divider(height: 1),
                const ListTile(
                  leading: Icon(Icons.security_outlined),
                  title: Text('Session'),
                  subtitle:
                      Text('User session is restored when the app opens.'),
                ),
                const Divider(height: 1),
                const ListTile(
                  leading: Icon(Icons.info_outline),
                  title: Text('Open source'),
                  subtitle: Text(
                      'Attribution screen will be added with app settings.'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ConnectionBadge extends StatelessWidget {
  const _ConnectionBadge({required this.state});

  final NaraConnectionState state;

  @override
  Widget build(BuildContext context) {
    final color = switch (state) {
      NaraConnectionState.connected => _emerald,
      NaraConnectionState.attention => _amber,
      NaraConnectionState.offline => _rose,
      NaraConnectionState.checking => Theme.of(context).colorScheme.primary,
      NaraConnectionState.unknown => Theme.of(context).colorScheme.primary,
    };
    final label = switch (state) {
      NaraConnectionState.connected => 'Connected',
      NaraConnectionState.attention => 'Check',
      NaraConnectionState.offline => 'Offline',
      NaraConnectionState.checking => 'Checking',
      NaraConnectionState.unknown => 'Unknown',
    };

    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: color),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Text(
          label,
          style: TextStyle(color: color, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}

String _timeLabel(DateTime value) {
  final now = DateTime.now();
  final delta = now.difference(value);
  if (delta.inMinutes < 1) return 'just now';
  if (delta.inMinutes < 60) return '${delta.inMinutes}m ago';
  return '${delta.inHours}h ago';
}
