import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';
import '../../core/widgets/nara_logo_mark.dart';

const _emerald = Color(0xFF059669);
const _amber = Color(0xFFD97706);
const _rose = Color(0xFFE11D48);

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({
    required this.state,
    required this.onLogout,
    required this.onOpenAssistant,
    required this.user,
    super.key,
  });

  final NaraMobileState state;
  final VoidCallback onLogout;
  final VoidCallback onOpenAssistant;
  final Map<String, dynamic>? user;

  @override
  Widget build(BuildContext context) {
    final displayName = user?['displayName']?.toString() ?? 'Nara user';
    final email = user?['email']?.toString() ?? 'No email';
    final avatarLabel = displayName.trim().isEmpty
        ? 'N'
        : displayName.trim().substring(0, 1).toUpperCase();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Me',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        const Text('Account, privacy, notifications, and app information.'),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(child: Text(avatarLabel)),
                  title: Text(displayName),
                  subtitle: Text(email),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: onLogout,
                  icon: const Icon(Icons.logout),
                  label: const Text('Sign Out'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        _SettingsGroup(
          title: 'Personal setup',
          children: [
            _SettingsTile(
              icon: Icons.smart_toy_outlined,
              title: 'Nara Bot & WhatsApp',
              subtitle: _botSubtitle(state),
              trailing: _StatusDot(color: _botStatusColor(state)),
              onTap: onOpenAssistant,
            ),
            _SettingsTile(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              subtitle: 'Reminder alerts, quiet hours, and task nudges',
              onTap: () => _push(context, const NotificationsSettingsScreen()),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _SettingsGroup(
          title: 'Trust',
          children: [
            _SettingsTile(
              icon: Icons.privacy_tip_outlined,
              title: 'Data & Privacy',
              subtitle: 'How Nara stores and uses your information',
              onTap: () => _push(context, const DataPrivacyScreen()),
            ),
            _SettingsTile(
              icon: Icons.description_outlined,
              title: 'Terms & Privacy Policy',
              subtitle: 'Plain-language MVP policy for Nara',
              onTap: () => _push(context, const TermsPrivacyScreen()),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _SettingsGroup(
          title: 'App',
          children: [
            _SettingsTile(
              icon: Icons.palette_outlined,
              title: 'Appearance',
              subtitle: 'Light mode is active',
              onTap: () => _push(context, const AppearanceSettingsScreen()),
            ),
            _SettingsTile(
              icon: Icons.favorite_border,
              title: 'Open Source Attribution',
              subtitle: 'Major tools and package licenses',
              onTap: () => _push(context, const OpenSourceScreen()),
            ),
            _SettingsTile(
              icon: Icons.info_outline,
              title: 'About Nara',
              subtitle: 'Version, purpose, and product notes',
              onTap: () => _push(context, const AboutNaraScreen()),
            ),
          ],
        ),
      ],
    );
  }

  String _botSubtitle(NaraMobileState state) {
    if (state.whatsappContact == null) {
      return 'WhatsApp number not connected yet';
    }
    return '${state.whatsappContact!.value} - ${state.whatsappStatusLabel}';
  }

  Color _botStatusColor(NaraMobileState state) {
    return switch (state.whatsappAccess?.status) {
      'allowed' => _emerald,
      'blocked' => _rose,
      'sync_failed' => _rose,
      'pending_verification' => _amber,
      'pending_allowlist' => _amber,
      _ => _amber,
    };
  }
}

class NotificationsSettingsScreen extends StatefulWidget {
  const NotificationsSettingsScreen({super.key});

  @override
  State<NotificationsSettingsScreen> createState() =>
      _NotificationsSettingsScreenState();
}

class _NotificationsSettingsScreenState
    extends State<NotificationsSettingsScreen> {
  bool reminders = true;
  bool taskNudges = true;
  bool botUpdates = true;
  bool quietHours = false;

  @override
  Widget build(BuildContext context) {
    return _SettingsDetailScaffold(
      title: 'Notifications',
      children: [
        SwitchListTile(
          value: reminders,
          onChanged: (value) => setState(() => reminders = value),
          secondary: const Icon(Icons.notifications_active_outlined),
          title: const Text('Reminder alerts'),
          subtitle: const Text('Notify when a reminder becomes due.'),
        ),
        const Divider(height: 1),
        SwitchListTile(
          value: taskNudges,
          onChanged: (value) => setState(() => taskNudges = value),
          secondary: const Icon(Icons.checklist_outlined),
          title: const Text('Task nudges'),
          subtitle: const Text('Highlight tasks due today.'),
        ),
        const Divider(height: 1),
        SwitchListTile(
          value: botUpdates,
          onChanged: (value) => setState(() => botUpdates = value),
          secondary: const Icon(Icons.smart_toy_outlined),
          title: const Text('Nara Bot updates'),
          subtitle: const Text('Show status changes for WhatsApp access.'),
        ),
        const Divider(height: 1),
        SwitchListTile(
          value: quietHours,
          onChanged: (value) => setState(() => quietHours = value),
          secondary: const Icon(Icons.bedtime_outlined),
          title: const Text('Quiet hours'),
          subtitle: const Text('Planned for night-time notification control.'),
        ),
      ],
    );
  }
}

class DataPrivacyScreen extends StatelessWidget {
  const DataPrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _SettingsDetailScaffold(
      title: 'Data & Privacy',
      children: [
        _InfoBlock(
          icon: Icons.lock_outline,
          title: 'Stored on your Nara server',
          body:
              'Your account, tasks, WhatsApp access request, and assistant preferences are used to run Nara features. Nara is designed for a self-hosted server, not public advertising or resale.',
        ),
        _InfoBlock(
          icon: Icons.visibility_off_outlined,
          title: 'No ads or third-party sale',
          body:
              'Nara does not sell your task data. The app only sends data to the Nara backend configured for this build.',
        ),
        _InfoBlock(
          icon: Icons.admin_panel_settings_outlined,
          title: 'Admin access is limited by default',
          body:
              'The local admin dashboard is for maintenance. User task content is not shown in the default admin task list.',
        ),
        _InfoBlock(
          icon: Icons.delete_outline,
          title: 'Account deletion',
          body:
              'Account deletion is not self-service yet. For MVP testing, request deletion from the server operator so related account data can be removed intentionally.',
        ),
      ],
    );
  }
}

class TermsPrivacyScreen extends StatelessWidget {
  const TermsPrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _SettingsDetailScaffold(
      title: 'Terms & Privacy',
      children: [
        _InfoBlock(
          icon: Icons.handshake_outlined,
          title: 'MVP terms',
          body:
              'Nara is an early self-hosted assistant. Use it for personal and operational workflows you are comfortable storing on your own Nara server.',
        ),
        _InfoBlock(
          icon: Icons.verified_user_outlined,
          title: 'Your responsibility',
          body:
              'Keep your account and device secure. Do not store secrets or sensitive business data until backup, deletion, and approval flows are fully hardened.',
        ),
        _InfoBlock(
          icon: Icons.privacy_tip_outlined,
          title: 'Privacy summary',
          body:
              'Nara stores the information needed to provide tasks, reminders, assistant setup, and WhatsApp access. Data is not sold and is not used for ads.',
        ),
        _InfoBlock(
          icon: Icons.update_outlined,
          title: 'Policy changes',
          body:
              'This policy will become more formal before production distribution. The app should always describe data use in plain language.',
        ),
      ],
    );
  }
}

class AppearanceSettingsScreen extends StatelessWidget {
  const AppearanceSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _SettingsDetailScaffold(
      title: 'Appearance',
      children: [
        _InfoBlock(
          icon: Icons.light_mode_outlined,
          title: 'Light mode',
          body:
              'Nara currently uses a light premium interface tuned for readability and calm daily use.',
        ),
        _InfoBlock(
          icon: Icons.dark_mode_outlined,
          title: 'Dark mode',
          body:
              'Dark mode is planned after the mobile MVP screens are stable enough to theme cleanly.',
        ),
      ],
    );
  }
}

class OpenSourceScreen extends StatelessWidget {
  const OpenSourceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _SettingsDetailScaffold(
      title: 'Open Source Attribution',
      children: [
        const _InfoBlock(
          icon: Icons.favorite_border,
          title: 'Built with open source',
          body:
              'Nara uses open source software across the app, backend, database, and agent runtime. Major components are listed below.',
        ),
        const _AttributionList(),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: () {
            showLicensePage(
              context: context,
              applicationName: 'Nara',
              applicationVersion: '0.1.0',
              applicationIcon: const NaraLogoMark(
                size: 56,
                showWordmark: false,
              ),
              applicationLegalese: 'Nara MVP. Built with open source tools.',
            );
          },
          icon: const Icon(Icons.article_outlined),
          label: const Text('View Package Licenses'),
        ),
      ],
    );
  }
}

class AboutNaraScreen extends StatelessWidget {
  const AboutNaraScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _SettingsDetailScaffold(
      title: 'About Nara',
      children: [
        Center(child: NaraLogoMark(size: 86)),
        SizedBox(height: 16),
        _InfoBlock(
          icon: Icons.auto_awesome_outlined,
          title: 'Nara 0.1.0',
          body:
              'A self-hosted assistant for tasks, reminders, Nara Bot setup, and future agent approvals.',
        ),
        _InfoBlock(
          icon: Icons.home_work_outlined,
          title: 'Local-first',
          body:
              'Nara is designed to run from a trusted office server, with mobile and desktop apps as daily user surfaces.',
        ),
      ],
    );
  }
}

class _SettingsGroup extends StatelessWidget {
  const _SettingsGroup({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          for (var index = 0; index < children.length; index++) ...[
            if (index > 0) const Divider(height: 1),
            children[index],
          ],
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: trailing ?? const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}

class _SettingsDetailScaffold extends StatelessWidget {
  const _SettingsDetailScaffold({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: children,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoBlock extends StatelessWidget {
  const _InfoBlock({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(body),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AttributionList extends StatelessWidget {
  const _AttributionList();

  @override
  Widget build(BuildContext context) {
    const items = [
      ('Flutter', 'Mobile UI framework'),
      ('Dart', 'Application language for the mobile app'),
      ('OpenClaw', 'Agent runtime foundation'),
      ('Fastify', 'Backend HTTP framework'),
      ('Drizzle ORM', 'PostgreSQL schema and query layer'),
      ('PostgreSQL / pgvector', 'Primary data storage'),
      ('Redis / BullMQ', 'Queue and background work foundation'),
      ('React, Vite, Tailwind CSS', 'Local admin dashboard'),
      ('Tauri', 'Desktop app foundation'),
      ('Docker', 'Local infrastructure packaging'),
    ];

    return Column(
      children: [
        for (final item in items)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.code),
            title: Text(item.$1),
            subtitle: Text(item.$2),
          ),
      ],
    );
  }
}

class _StatusDot extends StatelessWidget {
  const _StatusDot({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}

void _push(BuildContext context, Widget screen) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(builder: (context) => screen),
  );
}
