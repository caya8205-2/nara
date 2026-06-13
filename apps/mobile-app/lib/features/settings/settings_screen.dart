import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';
import '../../core/theme/nara_theme.dart';
import '../../core/widgets/nara_card.dart';
import '../../core/widgets/nara_logo_mark.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({
    required this.state,
    required this.onLogout,
    required this.onOpenAssistant,
    required this.onBack,
    required this.onThemeChanged,
    required this.onLanguageChanged,
    required this.user,
    super.key,
  });

  final NaraMobileState state;
  final VoidCallback onLogout;
  final VoidCallback onOpenAssistant;
  final VoidCallback onBack;
  final Future<void> Function(NaraThemePreference preference) onThemeChanged;
  final Future<void> Function(NaraLanguagePreference preference)
      onLanguageChanged;
  final Map<String, dynamic>? user;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isIndonesian =
        state.languagePreference == NaraLanguagePreference.indonesia;
    final displayName = user?['displayName']?.toString() ?? 'Nara user';
    final email = user?['email']?.toString() ?? '';
    final avatarLabel = displayName.trim().isEmpty
        ? 'N'
        : displayName.trim().substring(0, 1).toUpperCase();

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) onBack();
      },
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                onPressed: onBack,
                icon: const Icon(Icons.arrow_back_rounded),
                tooltip: 'Back',
                style: IconButton.styleFrom(
                  backgroundColor: theme.colorScheme.surfaceContainerHighest,
                  foregroundColor: theme.colorScheme.onSurface,
                  side: BorderSide(color: theme.colorScheme.outline),
                ),
              ),
            ),
            const SizedBox(height: 8),
            // ── Header ──
            Text(
              isIndonesian ? 'Pengaturan' : 'Settings',
              style: theme.textTheme.headlineMedium,
            ),
            const SizedBox(height: 4),
            Text(
              isIndonesian
                  ? 'Akun, notifikasi, dan preferensi aplikasi.'
                  : 'Account, notifications, and app preferences.',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: theme.textTheme.bodyMedium?.color,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 18),

            // ── Profile card ──
            NaraCard(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      radius: 22,
                      backgroundColor:
                          theme.colorScheme.primary.withValues(alpha: 0.14),
                      child: Text(
                        avatarLabel,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ),
                    title: Text(
                      displayName,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: theme.textTheme.titleMedium?.color,
                      ),
                    ),
                    subtitle: email.isNotEmpty
                        ? Text(
                            email,
                            style: TextStyle(
                              fontSize: 12,
                              color: theme.textTheme.bodySmall?.color,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: onLogout,
                    icon: const Icon(Icons.logout, size: 16),
                    label: Text(isIndonesian ? 'Keluar' : 'Sign Out'),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: NaraColors.dangerLight),
                      foregroundColor: NaraColors.danger,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // ── Personal setup ──
            _SettingsGroup(
              title: isIndonesian ? 'Pengaturan pribadi' : 'Personal setup',
              children: [
                _SettingsTile(
                  icon: Icons.smart_toy_outlined,
                  title: 'Nara Bot & WhatsApp',
                  subtitle: _botSubtitle(state),
                  trailing: _StatusDot(color: _botStatusColor(state)),
                  onTap: onOpenAssistant,
                ),
                const _SettingsDivider(),
                _SettingsTile(
                  icon: Icons.notifications_outlined,
                  title: isIndonesian ? 'Notifikasi' : 'Notifications',
                  subtitle: isIndonesian
                      ? 'Alarm pengingat, dorongan tugas, dan jam tenang'
                      : 'Reminder alerts, task nudges, and quiet hours',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const NotificationsSettingsScreen(),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // ── Privacy & Trust ──
            _SettingsGroup(
              title: isIndonesian ? 'Privasi & Kepercayaan' : 'Privacy & Trust',
              children: [
                _SettingsTile(
                  icon: Icons.privacy_tip_outlined,
                  title: isIndonesian ? 'Data & Privasi' : 'Data & Privacy',
                  subtitle: isIndonesian
                      ? 'Cara Nara menyimpan dan memakai informasimu'
                      : 'How Nara stores and uses your information',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                        builder: (_) => const RestoredDataPrivacyScreen()),
                  ),
                ),
                const _SettingsDivider(),
                _SettingsTile(
                  icon: Icons.description_outlined,
                  title: isIndonesian
                      ? 'Ketentuan & Kebijakan Privasi'
                      : 'Terms & Privacy Policy',
                  subtitle: isIndonesian
                      ? 'Kebijakan Nara dengan bahasa sederhana'
                      : 'Plain-language policies for Nara',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                        builder: (_) => const RestoredTermsPrivacyScreen()),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // ── App ──
            _SettingsGroup(
              title: 'App',
              children: [
                _SettingsTile(
                  icon: Icons.palette_outlined,
                  title: isIndonesian ? 'Tampilan' : 'Appearance',
                  subtitle: _appearanceSubtitle(state),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => AppearanceSettingsScreen(
                        state: state,
                        onThemeChanged: onThemeChanged,
                        onLanguageChanged: onLanguageChanged,
                      ),
                    ),
                  ),
                ),
                const _SettingsDivider(),
                _SettingsTile(
                  icon: Icons.favorite_border,
                  title: isIndonesian
                      ? 'Atribusi Open Source'
                      : 'Open Source Attribution',
                  subtitle: isIndonesian
                      ? 'Library dan lisensi'
                      : 'Libraries and licenses',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const RestoredOpenSourceScreen(),
                    ),
                  ),
                ),
                const _SettingsDivider(),
                _SettingsTile(
                  icon: Icons.info_outline,
                  title: isIndonesian ? 'Tentang Nara' : 'About Nara',
                  subtitle: isIndonesian
                      ? 'Versi 0.1.0 - asisten personal self-hosted'
                      : 'Version 0.1.0 - self-hosted personal assistant',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const RestoredAboutNaraScreen(),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _botSubtitle(NaraMobileState state) {
    if (state.whatsappContact == null) {
      return 'Not connected';
    }
    return '${state.whatsappContact!.value} · ${state.whatsappStatusLabel}';
  }

  Color _botStatusColor(NaraMobileState state) {
    return switch (state.whatsappAccess?.status) {
      'allowed' => NaraColors.agent,
      'blocked' => NaraColors.danger,
      'sync_failed' => NaraColors.danger,
      'pending_verification' => NaraColors.warning,
      'pending_allowlist' => NaraColors.warning,
      _ => NaraColors.textMuted,
    };
  }

  String _appearanceSubtitle(NaraMobileState state) {
    final isIndonesian =
        state.languagePreference == NaraLanguagePreference.indonesia;
    final theme = switch (state.themePreference) {
      NaraThemePreference.system => isIndonesian ? 'Sistem' : 'System',
      NaraThemePreference.light => isIndonesian ? 'Terang' : 'Light',
      NaraThemePreference.dark => isIndonesian ? 'Gelap' : 'Dark',
    };
    final language = switch (state.languagePreference) {
      NaraLanguagePreference.english => 'English',
      NaraLanguagePreference.indonesia => 'Bahasa Indonesia',
    };
    return '$theme mode · $language';
  }
}

// ── Reusable Settings Components ─────────────────────────────────────────

class _SettingsGroup extends StatelessWidget {
  const _SettingsGroup({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              height: 1.3,
            ).copyWith(color: theme.textTheme.bodySmall?.color),
          ),
        ),
        NaraCard(
          padding: EdgeInsets.zero,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: children,
          ),
        ),
      ],
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.trailing,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? trailing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, size: 20, color: theme.iconTheme.color),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: theme.textTheme.titleMedium?.color,
          height: 1.3,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(
          fontSize: 12,
          color: theme.textTheme.bodySmall?.color,
          height: 1.4,
        ),
      ),
      trailing: trailing ??
          Icon(Icons.chevron_right,
              size: 18, color: theme.textTheme.bodySmall?.color),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
    );
  }
}

class _SettingsDivider extends StatelessWidget {
  const _SettingsDivider();

  @override
  Widget build(BuildContext context) {
    return Divider(
      height: 1,
      indent: 52,
      endIndent: 16,
      color: Theme.of(context).dividerTheme.color,
    );
  }
}

class _StatusDot extends StatelessWidget {
  const _StatusDot({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}

// ── Sub-screens ──────────────────────────────────────────────────────────

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
    return _SubSettingsScaffold(
      title: 'Notifications',
      children: [
        NaraCard(
          padding: EdgeInsets.zero,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SwitchListTile(
                value: reminders,
                onChanged: (value) => setState(() => reminders = value),
                secondary: const Icon(Icons.notifications_active_outlined),
                title: const Text('Reminder alerts'),
                subtitle:
                    const Text('Get notified when a reminder becomes due.'),
              ),
              const _SettingsDivider(),
              SwitchListTile(
                value: taskNudges,
                onChanged: (value) => setState(() => taskNudges = value),
                secondary: const Icon(Icons.checklist_outlined),
                title: const Text('Task nudges'),
                subtitle: const Text('Highlight tasks due today.'),
              ),
              const _SettingsDivider(),
              SwitchListTile(
                value: botUpdates,
                onChanged: (value) => setState(() => botUpdates = value),
                secondary: const Icon(Icons.smart_toy_outlined),
                title: const Text('Nara Bot updates'),
                subtitle: const Text('Status changes for WhatsApp access.'),
              ),
              const _SettingsDivider(),
              SwitchListTile(
                value: quietHours,
                onChanged: (value) => setState(() => quietHours = value),
                secondary: const Icon(Icons.bedtime_outlined),
                title: const Text('Quiet hours'),
                subtitle: const Text('Mute notifications during night hours.'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class DataPrivacyScreen extends StatelessWidget {
  const DataPrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _SubSettingsScaffold(
      title: 'Data & Privacy',
      children: [
        NaraCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: const [
              Text(
                'How Nara handles your data',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: NaraColors.textPrimary,
                ),
              ),
              SizedBox(height: 10),
              Text(
                'Nara stores your tasks, reminders, and preferences on your own server. No data is sent to third-party services unless you connect WhatsApp through Nara Bot.\n\n'
                'Your WhatsApp messages are processed locally through OpenClaw. Only task-related requests are stored — conversations are not logged.',
                style: TextStyle(
                  fontSize: 13,
                  color: NaraColors.textSecondary,
                  height: 1.55,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class TermsPrivacyScreen extends StatelessWidget {
  const TermsPrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _SubSettingsScaffold(
      title: 'Terms & Privacy',
      children: [
        NaraCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: const [
              Text(
                'Nara Terms of Service (MVP)',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: NaraColors.textPrimary,
                ),
              ),
              SizedBox(height: 10),
              Text(
                'Nara is self-hosted software. You control your data, your server, and your instance.\n\n'
                'By using Nara, you agree not to use it for illegal activities. '
                'The software is provided as-is with no warranty. '
                'Formal terms will be published before the stable release.',
                style: TextStyle(
                  fontSize: 13,
                  color: NaraColors.textSecondary,
                  height: 1.55,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class RestoredDataPrivacyScreen extends StatelessWidget {
  const RestoredDataPrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _SubSettingsScaffold(
      title: 'Data & Privacy',
      children: [
        NaraCard(
          child: Column(
            children: [
              _InfoBlock(
                icon: Icons.lock_outline,
                title: 'Stored on Nara Server',
                body:
                    'Your account, tasks, WhatsApp access request, and assistant preferences are stored on the Nara backend configured for this app build.',
              ),
              _InfoBlock(
                icon: Icons.visibility_off_outlined,
                title: 'No ads or third-party sale',
                body:
                    'Nara does not sell your task data. The app only sends data to the Nara backend configured for this build.',
              ),
              _InfoBlock(
                icon: Icons.rule_folder_outlined,
                title: 'Used only for Nara features',
                body:
                    'Nara uses your data to run tasks, reminders, assistant setup, WhatsApp access, and future approval flows. It is not used for advertising.',
              ),
              _InfoBlock(
                icon: Icons.chat_bubble_outline,
                title: 'WhatsApp messages',
                body:
                    'WhatsApp-related data is used to connect Nara Bot and create useful task or reminder context. Nara should only keep the information needed to run those workflows.',
              ),
              _InfoBlock(
                icon: Icons.delete_outline,
                title: 'Account deletion',
                body:
                    'Account deletion is not self-service yet. For MVP testing, request deletion from the server operator so related account data can be removed intentionally.',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class RestoredTermsPrivacyScreen extends StatelessWidget {
  const RestoredTermsPrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _SubSettingsScaffold(
      title: 'Terms & Privacy',
      children: [
        NaraCard(
          child: Column(
            children: [
              _InfoBlock(
                icon: Icons.handshake_outlined,
                title: 'Early access software',
                body:
                    'Nara is currently an MVP. Features, screens, and automation behavior may change while the product is being tested and refined.',
              ),
              _InfoBlock(
                icon: Icons.dns_outlined,
                title: 'Server availability',
                body:
                    'The app depends on the Nara Server configured for this build. If that server is offline or under maintenance, some features may stop syncing temporarily.',
              ),
              _InfoBlock(
                icon: Icons.verified_user_outlined,
                title: 'Use responsibly',
                body:
                    'Keep your account and device secure. Avoid storing passwords, private keys, or sensitive business secrets until backup and deletion flows are fully production-ready.',
              ),
              _InfoBlock(
                icon: Icons.privacy_tip_outlined,
                title: 'Privacy promise',
                body:
                    'Nara does not sell your data and does not use your tasks, reminders, or WhatsApp setup data for advertising.',
              ),
              _InfoBlock(
                icon: Icons.update_outlined,
                title: 'Policy updates',
                body:
                    'These terms will become more formal before a stable release. The app should continue to explain data use in clear, plain language.',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class AppearanceSettingsScreen extends StatefulWidget {
  const AppearanceSettingsScreen({
    required this.state,
    required this.onThemeChanged,
    required this.onLanguageChanged,
    super.key,
  });

  final NaraMobileState state;
  final Future<void> Function(NaraThemePreference preference) onThemeChanged;
  final Future<void> Function(NaraLanguagePreference preference)
      onLanguageChanged;

  @override
  State<AppearanceSettingsScreen> createState() =>
      _AppearanceSettingsScreenState();
}

class _AppearanceSettingsScreenState extends State<AppearanceSettingsScreen> {
  late NaraThemePreference themePreference;
  late NaraLanguagePreference languagePreference;

  @override
  void initState() {
    super.initState();
    themePreference = widget.state.themePreference;
    languagePreference = widget.state.languagePreference;
  }

  Future<void> _changeTheme(NaraThemePreference preference) async {
    setState(() => themePreference = preference);
    await widget.onThemeChanged(preference);
  }

  Future<void> _changeLanguage(NaraLanguagePreference preference) async {
    setState(() => languagePreference = preference);
    await widget.onLanguageChanged(preference);
  }

  @override
  Widget build(BuildContext context) {
    final isIndonesian = languagePreference == NaraLanguagePreference.indonesia;
    return _SubSettingsScaffold(
      title: isIndonesian ? 'Tampilan' : 'Appearance',
      children: [
        _ThemePreviewCard(themePreference: themePreference),
        const SizedBox(height: 14),
        _SettingsGroup(
          title: isIndonesian ? 'Tema' : 'Theme',
          children: [
            _RadioSettingsTile<NaraThemePreference>(
              value: NaraThemePreference.light,
              groupValue: themePreference,
              icon: Icons.light_mode_outlined,
              title: isIndonesian ? 'Terang' : 'Light',
              subtitle: isIndonesian
                  ? 'Tampilan off-white hangat untuk siang hari.'
                  : 'Warm off-white interface for daytime use.',
              onChanged: _changeTheme,
            ),
            const _SettingsDivider(),
            _RadioSettingsTile<NaraThemePreference>(
              value: NaraThemePreference.dark,
              groupValue: themePreference,
              icon: Icons.dark_mode_outlined,
              title: isIndonesian ? 'Gelap' : 'Dark',
              subtitle: isIndonesian
                  ? 'Palet Nara rendah silau untuk malam hari.'
                  : 'Low-glare Nara palette for night sessions.',
              onChanged: _changeTheme,
            ),
            const _SettingsDivider(),
            _RadioSettingsTile<NaraThemePreference>(
              value: NaraThemePreference.system,
              groupValue: themePreference,
              icon: Icons.phone_android_outlined,
              title: isIndonesian ? 'Sistem' : 'System',
              subtitle: isIndonesian
                  ? 'Ikuti tema perangkat Kamu.'
                  : 'Follow your device theme.',
              onChanged: _changeTheme,
            ),
          ],
        ),
        const SizedBox(height: 14),
        _SettingsGroup(
          title: isIndonesian ? 'Bahasa' : 'Language',
          children: [
            _RadioSettingsTile<NaraLanguagePreference>(
              value: NaraLanguagePreference.english,
              groupValue: languagePreference,
              icon: Icons.language_outlined,
              title: 'English',
              subtitle: 'Use English copy across the app.',
              onChanged: _changeLanguage,
            ),
            const _SettingsDivider(),
            _RadioSettingsTile<NaraLanguagePreference>(
              value: NaraLanguagePreference.indonesia,
              groupValue: languagePreference,
              icon: Icons.translate_outlined,
              title: 'Bahasa Indonesia',
              subtitle: 'Gunakan Bahasa Indonesia untuk teks utama.',
              onChanged: _changeLanguage,
            ),
          ],
        ),
      ],
    );
  }
}

class _ThemePreviewCard extends StatelessWidget {
  const _ThemePreviewCard({required this.themePreference});

  final NaraThemePreference themePreference;

  @override
  Widget build(BuildContext context) {
    final dark = themePreference == NaraThemePreference.dark ||
        (themePreference == NaraThemePreference.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: dark
              ? const [
                  Color(0xFF182725),
                  Color(0xFF254C47),
                  Color(0xFF3B3A25),
                ]
              : const [
                  NaraColors.surface,
                  NaraColors.primaryMuted,
                  NaraColors.warningMuted,
                ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: dark ? const Color(0xFF34504C) : NaraColors.border,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: dark ? const Color(0xFF5EEAD4) : NaraColors.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              dark ? Icons.dark_mode_outlined : Icons.light_mode_outlined,
              color: dark ? const Color(0xFF063F3A) : Colors.white,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dark ? 'Dark mode preview' : 'Light mode preview',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color:
                        dark ? const Color(0xFFF1F7F5) : NaraColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'Theme changes apply instantly.',
                  style: TextStyle(
                    fontSize: 12,
                    color: dark
                        ? const Color(0xFFC5D6D2)
                        : NaraColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RadioSettingsTile<T> extends StatelessWidget {
  const _RadioSettingsTile({
    required this.value,
    required this.groupValue,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onChanged,
  });

  final T value;
  final T groupValue;
  final IconData icon;
  final String title;
  final String subtitle;
  final Future<void> Function(T value) onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      onTap: () => onChanged(value),
      leading: Icon(icon, size: 20, color: theme.iconTheme.color),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: theme.textTheme.titleMedium?.color,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(color: theme.textTheme.bodySmall?.color),
      ),
      trailing: Radio<T>(
        value: value,
        groupValue: groupValue,
        onChanged: (next) {
          if (next != null) onChanged(next);
        },
      ),
    );
  }
}

// ignore: unused_element
class _LegacyAppearanceSettingsScreen extends StatefulWidget {
  const _LegacyAppearanceSettingsScreen();

  @override
  State<_LegacyAppearanceSettingsScreen> createState() =>
      _LegacyAppearanceSettingsScreenState();
}

class _LegacyAppearanceSettingsScreenState
    extends State<_LegacyAppearanceSettingsScreen> {
  String _theme = 'light';

  @override
  Widget build(BuildContext context) {
    return _SubSettingsScaffold(
      title: 'Appearance',
      children: [
        NaraCard(
          padding: EdgeInsets.zero,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: Radio<String>(
                  value: 'light',
                  // ignore: deprecated_member_use
                  groupValue: _theme,
                  // ignore: deprecated_member_use
                  onChanged: (v) => setState(() => _theme = v!),
                ),
                title: const Text('Light'),
                subtitle: const Text('Warm off-white theme.'),
                onTap: () => setState(() => _theme = 'light'),
              ),
              const _SettingsDivider(),
              ListTile(
                leading: const Radio<String>(
                  value: 'dark',
                  // ignore: deprecated_member_use
                  groupValue: null,
                  // ignore: deprecated_member_use
                  onChanged: null,
                ),
                title: const Text('Dark'),
                subtitle: const Text('Coming in a future update.'),
                enabled: false,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class OpenSourceScreen extends StatelessWidget {
  const OpenSourceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _SubSettingsScaffold(
      title: 'Open Source',
      children: [
        NaraCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: const [
              _AttributionItem(
                name: 'Flutter',
                description: 'UI toolkit by Google',
                license: 'BSD-3-Clause',
                mark: 'F',
                color: Color(0xFF42A5F5),
              ),
              _SettingsDivider(),
              _AttributionItem(
                name: 'OpenClaw',
                description: 'Agent runtime for WhatsApp integration',
                license: 'MIT',
                mark: 'OC',
                color: Color(0xFF14B8A6),
              ),
              _SettingsDivider(),
              _AttributionItem(
                name: 'Fastify',
                description: 'Backend server framework',
                license: 'MIT',
                mark: 'Fx',
                color: Color(0xFF111827),
              ),
              _SettingsDivider(),
              _AttributionItem(
                name: 'PostgreSQL',
                description: 'Database engine',
                license: 'PostgreSQL License',
                mark: 'PG',
                color: Color(0xFF336791),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class AboutNaraScreen extends StatelessWidget {
  const AboutNaraScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _SubSettingsScaffold(
      title: 'About Nara',
      children: [
        NaraCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: const [
              Text(
                'Nara v0.1.0',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: NaraColors.textPrimary,
                ),
              ),
              SizedBox(height: 8),
              Text(
                'A self-hosted personal assistant for managing tasks, reminders, and daily operations.\n\n'
                'Built with Flutter, Fastify, and OpenClaw. '
                'Runs on your own server — your data stays with you.',
                style: TextStyle(
                  fontSize: 13,
                  color: NaraColors.textSecondary,
                  height: 1.55,
                ),
              ),
              SizedBox(height: 14),
              Text(
                'Nara is in early development. Features and design may change before the stable release.',
                style: TextStyle(
                  fontSize: 12,
                  color: NaraColors.textMuted,
                  fontStyle: FontStyle.italic,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Shared Sub-screen Scaffold ──────────────────────────────────────────

class RestoredOpenSourceScreen extends StatelessWidget {
  const RestoredOpenSourceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _SubSettingsScaffold(
      title: 'Open Source Attribution',
      children: [
        const NaraCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _InfoBlock(
                icon: Icons.favorite_border,
                title: 'Built with open source',
                body:
                    'Nara is built with open-source tools. These libraries make the mobile app, backend, dashboard, desktop shell, and local agent runtime possible.',
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        const _AttributionGroup(
          title: 'Mobile app',
          items: [
            _AttributionData('Flutter', 'Mobile UI toolkit by Google',
                'BSD-3-Clause', 'F', Color(0xFF42A5F5)),
            _AttributionData(
                'Dart',
                'Programming language for Flutter app logic',
                'BSD-3-Clause',
                'D',
                Color(0xFF0175C2)),
            _AttributionData(
                'shared_preferences',
                'Local session and app preference storage',
                'BSD-3-Clause',
                'SP',
                Color(0xFF64748B)),
          ],
        ),
        const SizedBox(height: 14),
        const _AttributionGroup(
          title: 'Backend and data',
          items: [
            _AttributionData('Fastify', 'Backend HTTP framework', 'MIT', 'Fx',
                Color(0xFF111827)),
            _AttributionData('Drizzle ORM', 'PostgreSQL schema and query layer',
                'Apache-2.0', 'Dz', Color(0xFFC5F74F)),
            _AttributionData('PostgreSQL', 'Primary relational database',
                'PostgreSQL License', 'PG', Color(0xFF336791)),
            _AttributionData(
                'pgvector',
                'Vector search extension for PostgreSQL',
                'PostgreSQL License',
                'V',
                Color(0xFF6366F1)),
            _AttributionData('Redis', 'Cache and queue infrastructure',
                'BSD-3-Clause', 'R', Color(0xFFDC382D)),
            _AttributionData('BullMQ', 'Background job queue for Node.js',
                'MIT', 'BQ', Color(0xFFEAB308)),
            _AttributionData('Zod', 'Runtime schema validation', 'MIT', 'Z',
                Color(0xFF3068B7)),
          ],
        ),
        const SizedBox(height: 14),
        const _AttributionGroup(
          title: 'Admin, desktop, and agent',
          items: [
            _AttributionData('React', 'Local admin dashboard UI', 'MIT', 'R',
                Color(0xFF61DAFB)),
            _AttributionData('Vite', 'Frontend build tooling', 'MIT', 'V',
                Color(0xFF646CFF)),
            _AttributionData('Tailwind CSS', 'Utility styling for web surfaces',
                'MIT', 'Tw', Color(0xFF38BDF8)),
            _AttributionData('Tauri', 'Desktop app foundation',
                'Apache-2.0 / MIT', 'T', Color(0xFFFFC131)),
            _AttributionData(
                'OpenClaw',
                'Agent runtime foundation for Nara Bot integration',
                'MIT',
                'OC',
                Color(0xFF14B8A6)),
            _AttributionData('Docker', 'Local infrastructure packaging',
                'Apache-2.0', 'Dk', Color(0xFF2496ED)),
          ],
        ),
        const SizedBox(height: 14),
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

class RestoredAboutNaraScreen extends StatelessWidget {
  const RestoredAboutNaraScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _SubSettingsScaffold(
      title: 'About Nara',
      children: [
        Center(child: NaraLogoMark(size: 86)),
        SizedBox(height: 16),
        NaraCard(
          child: Column(
            children: [
              _InfoBlock(
                icon: Icons.auto_awesome_outlined,
                title: 'Nara 0.1.0',
                body:
                    'Nara is a self-hosted assistant for tasks, reminders, WhatsApp-based Nara Bot setup, and future agent approvals.',
              ),
              _InfoBlock(
                icon: Icons.home_work_outlined,
                title: 'Local-first',
                body:
                    'Nara is designed to run from a trusted local server, with mobile, desktop, and admin surfaces built around daily operations.',
              ),
              _InfoBlock(
                icon: Icons.smart_toy_outlined,
                title: 'Nara Bot',
                body:
                    'Nara Bot is the main assistant experience. The app helps users configure preferences, review tasks, and approve future agent actions.',
              ),
            ],
          ),
        ),
      ],
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
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: colorScheme.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: colorScheme.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: theme.textTheme.titleMedium?.color,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  body,
                  style: TextStyle(
                    fontSize: 13,
                    color: theme.textTheme.bodyMedium?.color,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AttributionData {
  const _AttributionData(
    this.name,
    this.description,
    this.license,
    this.mark,
    this.color,
  );

  final String name;
  final String description;
  final String license;
  final String mark;
  final Color color;
}

class _AttributionGroup extends StatelessWidget {
  const _AttributionGroup({
    required this.title,
    required this.items,
  });

  final String title;
  final List<_AttributionData> items;

  @override
  Widget build(BuildContext context) {
    return _SettingsGroup(
      title: title,
      children: [
        for (var index = 0; index < items.length; index++) ...[
          if (index > 0) const _SettingsDivider(),
          _AttributionItem(
            name: items[index].name,
            description: items[index].description,
            license: items[index].license,
            mark: items[index].mark,
            color: items[index].color,
          ),
        ],
      ],
    );
  }
}

class _SubSettingsScaffold extends StatelessWidget {
  const _SubSettingsScaffold({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(title),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: children,
      ),
    );
  }
}

class _AttributionItem extends StatelessWidget {
  const _AttributionItem({
    required this.name,
    required this.description,
    required this.license,
    required this.mark,
    required this.color,
  });

  final String name;
  final String description;
  final String license;
  final String mark;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final markColor = context.isNaraDark && color.computeLuminance() < 0.22
        ? Colors.white
        : color;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: color.withValues(alpha: context.isNaraDark ? 0.18 : 0.12),
              borderRadius: BorderRadius.circular(11),
              border: Border.all(color: color.withValues(alpha: 0.28)),
            ),
            child: Text(
              mark,
              style: TextStyle(
                fontSize: mark.length > 1 ? 11 : 15,
                fontWeight: FontWeight.w900,
                color: markColor,
                letterSpacing: -0.2,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: theme.textTheme.titleMedium?.color,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 12,
                    color: theme.textTheme.bodySmall?.color,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Container(
            constraints: const BoxConstraints(maxWidth: 92),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                  color: theme.dividerTheme.color ?? NaraColors.border),
            ),
            child: Text(
              license,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: theme.textTheme.bodySmall?.color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
