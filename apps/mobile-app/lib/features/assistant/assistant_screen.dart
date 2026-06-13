import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';
import '../../core/theme/nara_theme.dart';
import '../../core/widgets/nara_card.dart';

class AssistantScreen extends StatefulWidget {
  const AssistantScreen({
    required this.state,
    required this.onRefresh,
    required this.onSavePreferences,
    required this.onRequestWhatsAppAccess,
    super.key,
  });

  final NaraMobileState state;
  final Future<void> Function() onRefresh;
  final Future<void> Function(NaraAssistantPreferences preferences)
      onSavePreferences;
  final Future<void> Function(String number) onRequestWhatsAppAccess;

  @override
  State<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends State<AssistantScreen> {
  late final TextEditingController customPersonalityController;
  late final TextEditingController whatsappController;
  final customPersonalityFocus = FocusNode();
  final whatsappFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    customPersonalityController = TextEditingController(
      text: widget.state.assistantPreferences.customPersonality,
    );
    whatsappController = TextEditingController(
      text: widget.state.whatsappContact?.value ?? '',
    );
  }

  @override
  void didUpdateWidget(covariant AssistantScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    final customPersonality =
        widget.state.assistantPreferences.customPersonality;
    if (!customPersonalityFocus.hasFocus &&
        customPersonalityController.text != customPersonality) {
      customPersonalityController.text = customPersonality;
    }

    final whatsappNumber = widget.state.whatsappContact?.value ?? '';
    if (!whatsappFocus.hasFocus && whatsappController.text != whatsappNumber) {
      whatsappController.text = whatsappNumber;
    }
  }

  @override
  void dispose() {
    customPersonalityController.dispose();
    whatsappController.dispose();
    customPersonalityFocus.dispose();
    whatsappFocus.dispose();
    super.dispose();
  }

  Future<void> savePreference(NaraAssistantPreferences preferences) {
    return widget.onSavePreferences(preferences);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.state.assistantPreferences;
    final theme = Theme.of(context);
    final isIndonesian =
        widget.state.languagePreference == NaraLanguagePreference.indonesia;

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
        children: [
          // ── Header ──
          Text(
            isIndonesian ? 'Asisten' : 'Assistant',
            style: theme.textTheme.headlineMedium,
          ),
          const SizedBox(height: 4),
          Text(
            isIndonesian
                ? 'Atur cara Nara Bot merespons dan mengambil tindakan.'
                : 'Configure how Nara Bot behaves, responds, and takes action.',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w400,
              color: theme.textTheme.bodyMedium?.color,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 16),

          // ── Setup progress ──
          _SetupProgress(state: widget.state),
          const SizedBox(height: 18),

          // ── WhatsApp access ──
          _buildSection(
            icon: Icons.message_outlined,
            title: isIndonesian ? 'Koneksi WhatsApp' : 'WhatsApp connection',
            subtitle: widget.state.whatsappContact != null
                ? (isIndonesian
                    ? 'Terhubung sebagai ${widget.state.whatsappContact!.value}'
                    : 'Connected as ${widget.state.whatsappContact!.value}')
                : (isIndonesian
                    ? 'Hubungkan nomor WhatsApp untuk memakai Nara Bot.'
                    : 'Link your WhatsApp number to use Nara Bot.'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                _WhatsAppStatusRow(
                  state: widget.state,
                  isIndonesian: isIndonesian,
                ),
                if (widget.state.whatsappContact == null) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 40,
                          child: TextField(
                            controller: whatsappController,
                            focusNode: whatsappFocus,
                            keyboardType: TextInputType.phone,
                            style: TextStyle(
                              fontSize: 13,
                              color: theme.textTheme.bodyMedium?.color,
                            ),
                            decoration: const InputDecoration(
                              hintText: '+62 812-3456-7890',
                              contentPadding:
                                  EdgeInsets.symmetric(horizontal: 12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: () {
                          final number = whatsappController.text.trim();
                          if (number.isNotEmpty) {
                            widget.onRequestWhatsAppAccess(number);
                          }
                        },
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 40),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                        ),
                        child: Text(isIndonesian ? 'Hubungkan' : 'Link'),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── Personality ──
          _buildSection(
            icon: Icons.psychology_outlined,
            title: isIndonesian ? 'Kepribadian' : 'Personality',
            subtitle: _sampleReply(p),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _PersonalityCard(
                  icon: Icons.tune,
                  label: isIndonesian ? 'Seimbang' : 'Balanced',
                  description: isIndonesian
                      ? 'Profesional tapi tetap ramah untuk kerja harian.'
                      : 'Professional yet friendly. Good for daily work.',
                  selected: p.tone == 'Balanced',
                  onTap: () => savePreference(p.copyWith(tone: 'Balanced')),
                ),
                const SizedBox(height: 8),
                _PersonalityCard(
                  icon: Icons.work_outline,
                  label: 'Formal',
                  description: isIndonesian
                      ? 'Langsung dan profesional untuk konteks kerja.'
                      : 'Direct and business-like. Best for client-facing contexts.',
                  selected: p.tone == 'Formal',
                  onTap: () => savePreference(p.copyWith(tone: 'Formal')),
                ),
                const SizedBox(height: 8),
                _PersonalityCard(
                  icon: Icons.short_text,
                  label: isIndonesian ? 'Ringkas' : 'Concise',
                  description: isIndonesian
                      ? 'Jawaban pendek tanpa basa-basi untuk keputusan cepat.'
                      : 'Short replies, no fluff. Ideal for quick decisions.',
                  selected: p.tone == 'Concise',
                  onTap: () => savePreference(p.copyWith(tone: 'Concise')),
                ),
                const SizedBox(height: 8),
                _PersonalityCard(
                  icon: Icons.edit_note,
                  label: 'Custom',
                  description: isIndonesian
                      ? 'Jelaskan gaya komunikasi Nara sesuai kebutuhanmu.'
                      : 'Describe exactly how you want Nara to communicate.',
                  selected: p.tone == 'Custom',
                  onTap: () => savePreference(p.copyWith(tone: 'Custom')),
                ),
                if (p.tone == 'Custom') ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: customPersonalityController,
                    focusNode: customPersonalityFocus,
                    minLines: 2,
                    maxLines: 4,
                    textInputAction: TextInputAction.done,
                    decoration: InputDecoration(
                      labelText:
                          isIndonesian ? 'Instruksi Kamu' : 'Your instructions',
                      hintText: isIndonesian
                          ? 'Contoh: Tetap tenang dan praktis, jawab maksimal dua kalimat, tapi hangat saat mengingatkan deadline.'
                          : 'Example: Be calm and practical, keep replies under two sentences, but warm when reminding me about deadlines.',
                    ),
                    onChanged: (value) {
                      savePreference(
                        p.copyWith(customPersonality: value),
                      );
                    },
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── Action style ──
          _buildSection(
            icon: Icons.auto_awesome_outlined,
            title: isIndonesian ? 'Gaya tindakan' : 'Action style',
            subtitle: _actionStyleDescription(p.autonomy),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _PersonalityCard(
                  icon: Icons.lightbulb_outline,
                  label: isIndonesian ? 'Saran saja' : 'Suggest only',
                  description: isIndonesian
                      ? 'Nara memberi saran, tapi tidak bertindak tanpa persetujuan Kamu.'
                      : 'Nara will suggest actions but never take them without your approval.',
                  selected: p.autonomy == 'Suggest',
                  onTap: () => savePreference(p.copyWith(autonomy: 'Suggest')),
                ),
                const SizedBox(height: 8),
                _PersonalityCard(
                  icon: Icons.verified_outlined,
                  label: isIndonesian ? 'Konfirmasi dulu' : 'Confirm first',
                  description: isIndonesian
                      ? 'Nara menyiapkan tindakan dan meminta konfirmasi sebelum menjalankannya.'
                      : 'Nara drafts actions and asks for your confirmation before executing.',
                  selected: p.autonomy == 'Confirm',
                  onTap: () => savePreference(p.copyWith(autonomy: 'Confirm')),
                ),
                const SizedBox(height: 8),
                _PersonalityCard(
                  icon: Icons.bolt_outlined,
                  label: isIndonesian ? 'Langsung bertindak' : 'Act directly',
                  description: isIndonesian
                      ? 'Nara menjalankan tindakan rutin otomatis. Tindakan sensitif tetap butuh persetujuan.'
                      : 'Nara completes routine actions automatically. Sensitive ones still require approval.',
                  selected: p.autonomy == 'Act',
                  onTap: () => savePreference(p.copyWith(autonomy: 'Act')),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── Permissions ──
          _buildSection(
            icon: Icons.toggle_off_outlined,
            title: isIndonesian ? 'Izin' : 'Permissions',
            subtitle: isIndonesian
                ? 'Atur apa saja yang boleh dilakukan Nara Bot lewat WhatsApp.'
                : 'Control what Nara Bot can do through WhatsApp conversations.',
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SwitchListTile(
                  value: p.allowTaskCreation,
                  onChanged: (value) {
                    savePreference(p.copyWith(allowTaskCreation: value));
                  },
                  secondary: const Icon(Icons.add_task_outlined),
                  title: const Text('Create tasks from chats'),
                  subtitle: const Text(
                    'Nara Bot can turn clear requests into tasks.',
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  value: p.allowReminderDrafts,
                  onChanged: (value) {
                    savePreference(p.copyWith(allowReminderDrafts: value));
                  },
                  secondary: const Icon(Icons.notifications_outlined),
                  title: const Text('Draft reminders'),
                  subtitle: const Text(
                    'Reminder drafts will wait for your approval.',
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  value: p.allowSensitiveActions,
                  onChanged: (value) {
                    savePreference(p.copyWith(allowSensitiveActions: value));
                  },
                  secondary: const Icon(Icons.lock_outline),
                  title: const Text('Sensitive actions'),
                  subtitle: const Text(
                    'Allow Nara Bot to handle sensitive operations.',
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── Agent message ──
          if (widget.state.assistantMessage != null)
            NaraCard(
              child: Row(
                children: [
                  const Icon(Icons.info_outline,
                      size: 18, color: NaraColors.primary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      widget.state.assistantMessage!,
                      style: TextStyle(
                        fontSize: 13,
                        color: theme.textTheme.bodyMedium?.color,
                        height: 1.45,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSection({
    required IconData icon,
    required String title,
    required String subtitle,
    required Widget child,
  }) {
    final theme = Theme.of(context);
    return NaraCard(
      header: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 20, color: theme.colorScheme.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: theme.textTheme.titleMedium?.color,
                    height: 1.3,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: theme.textTheme.bodySmall?.color,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      child: child,
    );
  }

  String _sampleReply(NaraAssistantPreferences p) {
    final isIndonesian =
        widget.state.languagePreference == NaraLanguagePreference.indonesia;
    if (isIndonesian) {
      return switch (p.tone) {
        'Formal' =>
          'Contoh: "Selamat pagi. Ada 3 tugas jatuh tempo hari ini. Ingin ditinjau?"',
        'Concise' => 'Contoh: "3 tugas jatuh tempo. Tinjau?"',
        'Custom' => 'Menggunakan kepribadian custom Kamu.',
        _ => 'Contoh: "Pagi! Ada 3 tugas jatuh tempo hari ini. Mau kita cek?"',
      };
    }
    return switch (p.tone) {
      'Formal' =>
        'Sample: "Good morning. You have 3 tasks due today. Would you like to review them?"',
      'Concise' => 'Sample: "3 tasks due today. Review?"',
      'Custom' => 'Using your custom personality.',
      _ =>
        'Sample: "Morning! You\'ve got 3 tasks due today — want to go over them?"',
    };
  }

  String _actionStyleDescription(String autonomy) {
    final isIndonesian =
        widget.state.languagePreference == NaraLanguagePreference.indonesia;
    if (isIndonesian) {
      return switch (autonomy) {
        'Suggest' =>
          'Nara memberi saran dan menunggu persetujuan untuk setiap tindakan.',
        'Act' =>
          'Nara menangani rutinitas otomatis. Tindakan sensitif tetap ditanya dulu.',
        _ => 'Nara menyiapkan tindakan dan meminta konfirmasi sebelum jalan.',
      };
    }
    return switch (autonomy) {
      'Suggest' => 'Nara suggests but waits for your go-ahead on every action.',
      'Act' =>
        'Nara handles routine work automatically. Sensitive actions still ask first.',
      _ => 'Nara drafts actions and confirms with you before executing.',
    };
  }
}

// ── WhatsApp Status ──────────────────────────────────────────────────────

class _WhatsAppStatusRow extends StatelessWidget {
  const _WhatsAppStatusRow({
    required this.state,
    required this.isIndonesian,
  });

  final NaraMobileState state;
  final bool isIndonesian;

  @override
  Widget build(BuildContext context) {
    final hasContact = state.whatsappContact != null;
    final active = state.whatsappAccess?.status == 'allowed';
    final color = active
        ? NaraColors.agent
        : hasContact
            ? NaraColors.warning
            : context.naraTextMuted;
    final title = active
        ? (isIndonesian ? 'Nara Bot aktif' : 'Nara Bot active')
        : hasContact
            ? (isIndonesian ? 'Menunggu persetujuan' : 'Awaiting approval')
            : (isIndonesian ? 'Belum terhubung' : 'Not connected');
    final subtitle = hasContact
        ? state.whatsappContact!.value
        : (isIndonesian
            ? 'Tambahkan nomor WhatsApp untuk mulai.'
            : 'Add your WhatsApp number to start.');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: context.isNaraDark ? 0.12 : 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.26)),
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(
              active ? Icons.check_circle_outline : Icons.link_outlined,
              size: 16,
              color: color,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: color,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: context.naraTextSecondary,
                    height: 1.35,
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

// ── Setup Progress ───────────────────────────────────────────────────────

class _SetupProgress extends StatelessWidget {
  const _SetupProgress({required this.state});

  final NaraMobileState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasWhatsapp = state.whatsappContact != null;
    final hasAccess = state.whatsappAccess?.status == 'allowed';
    final hasPersonality = state.assistantPreferences.tone.isNotEmpty;
    final isIndonesian =
        state.languagePreference == NaraLanguagePreference.indonesia;

    final steps = [
      _Step(
        icon: Icons.message_outlined,
        label: isIndonesian ? 'WhatsApp terhubung' : 'WhatsApp linked',
        done: hasWhatsapp,
      ),
      _Step(
        icon: Icons.verified_outlined,
        label: isIndonesian ? 'Bot disetujui' : 'Bot approved',
        done: hasAccess,
      ),
      _Step(
        icon: Icons.psychology_outlined,
        label: isIndonesian ? 'Kepribadian diatur' : 'Personality set',
        done: hasPersonality,
      ),
    ];

    final doneCount = steps.where((s) => s.done).length;

    return NaraCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Text(
                isIndonesian ? 'Progress setup' : 'Setup progress',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontSize: 14,
                    ),
              ),
              const Spacer(),
              Text(
                '$doneCount / ${steps.length}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: doneCount == steps.length
                      ? NaraColors.agent
                      : NaraColors.warning,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...steps.map((step) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Icon(
                      step.done
                          ? Icons.check_circle
                          : Icons.radio_button_unchecked,
                      size: 18,
                      color:
                          step.done ? NaraColors.agent : NaraColors.textMuted,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      step.label,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight:
                            step.done ? FontWeight.w600 : FontWeight.w400,
                        color: step.done
                            ? theme.textTheme.titleMedium?.color
                            : theme.textTheme.bodySmall?.color,
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}

class _Step {
  const _Step({required this.icon, required this.label, required this.done});
  final IconData icon;
  final String label;
  final bool done;
}

// ── Personality Card ─────────────────────────────────────────────────────

class _PersonalityCard extends StatelessWidget {
  const _PersonalityCard({
    required this.icon,
    required this.label,
    required this.description,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String description;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final selectedBg = theme.colorScheme.primary.withValues(alpha: 0.12);
    final borderColor = selected
        ? theme.colorScheme.primary.withValues(alpha: 0.38)
        : (theme.dividerTheme.color ?? theme.colorScheme.outline);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        splashColor: NaraColors.primaryMuted,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            color: selected
                ? selectedBg
                : (theme.cardTheme.color ?? theme.colorScheme.surface),
            border: Border.all(
              color: borderColor,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 20,
                color: selected
                    ? theme.colorScheme.primary
                    : theme.textTheme.bodySmall?.color,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: selected
                            ? theme.colorScheme.primary
                            : theme.textTheme.titleMedium?.color,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 12,
                        color: theme.textTheme.bodyMedium?.color,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              if (selected)
                Icon(Icons.check_circle,
                    size: 18, color: theme.colorScheme.primary),
            ],
          ),
        ),
      ),
    );
  }
}
