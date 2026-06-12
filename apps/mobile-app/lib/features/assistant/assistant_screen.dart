import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';

const _emerald = Color(0xFF059669);
const _amber = Color(0xFFD97706);
const _rose = Color(0xFFE11D48);

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
    final preferences = widget.state.assistantPreferences;

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Assistant',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          const Text('Set how Nara Bot should respond and reach you.'),
          const SizedBox(height: 16),
          _WhatsAppAccessCard(
            state: widget.state,
            controller: whatsappController,
            focusNode: whatsappFocus,
            onRequestAccess: widget.onRequestWhatsAppAccess,
          ),
          const SizedBox(height: 12),
          _AssistantMessage(state: widget.state),
          const SizedBox(height: 12),
          _ChoiceCard(
            title: 'Personality',
            subtitle: 'Choose the baseline tone Nara uses in replies.',
            options: const [
              _ChoiceOption('Balanced', Icons.tune),
              _ChoiceOption('Formal', Icons.work_outline),
              _ChoiceOption('Concise', Icons.short_text),
              _ChoiceOption('Custom', Icons.edit_note),
            ],
            selected: preferences.tone,
            onChanged: (value) {
              savePreference(preferences.copyWith(tone: value));
            },
          ),
          if (preferences.tone == 'Custom') ...[
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: customPersonalityController,
                  focusNode: customPersonalityFocus,
                  minLines: 2,
                  maxLines: 4,
                  textInputAction: TextInputAction.done,
                  decoration: const InputDecoration(
                    labelText: 'Custom personality',
                    hintText:
                        'Example: calm, practical, concise, but warm when reminding me.',
                  ),
                  onChanged: (value) {
                    savePreference(
                      preferences.copyWith(customPersonality: value),
                    );
                  },
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          _ChoiceCard(
            title: 'Action style',
            subtitle: 'Set how much Nara can do before asking you.',
            options: const [
              _ChoiceOption('Suggest', Icons.lightbulb_outline),
              _ChoiceOption('Confirm', Icons.verified_outlined),
              _ChoiceOption('Act', Icons.bolt_outlined),
            ],
            selected: preferences.autonomy,
            onChanged: (value) {
              savePreference(preferences.copyWith(autonomy: value));
            },
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  value: preferences.allowTaskCreation,
                  onChanged: (value) {
                    savePreference(
                      preferences.copyWith(allowTaskCreation: value),
                    );
                  },
                  secondary: const Icon(Icons.add_task),
                  title: const Text('Create tasks from chats'),
                  subtitle:
                      const Text('Nara can turn clear requests into tasks.'),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  value: preferences.allowReminderDrafts,
                  onChanged: (value) {
                    savePreference(
                      preferences.copyWith(allowReminderDrafts: value),
                    );
                  },
                  secondary: const Icon(Icons.notifications_outlined),
                  title: const Text('Draft reminders'),
                  subtitle: const Text(
                    'Reminder drafts will wait for your approval.',
                  ),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  value: preferences.allowSensitiveActions,
                  onChanged: (value) {
                    savePreference(
                      preferences.copyWith(allowSensitiveActions: value),
                    );
                  },
                  secondary: const Icon(Icons.lock_outline),
                  title: const Text('Sensitive actions'),
                  subtitle:
                      const Text('Keep disabled until approval flow is ready.'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _WhatsAppAccessCard extends StatelessWidget {
  const _WhatsAppAccessCard({
    required this.state,
    required this.controller,
    required this.focusNode,
    required this.onRequestAccess,
  });

  final NaraMobileState state;
  final TextEditingController controller;
  final FocusNode focusNode;
  final Future<void> Function(String number) onRequestAccess;

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(context, state.whatsappAccess?.status);
    final isBusy = state.assistantSaving || state.assistantLoading;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.smart_toy_outlined),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'WhatsApp access',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                _StatusBadge(
                  label: state.whatsappStatusLabel,
                  color: statusColor,
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              focusNode: focusNode,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Your WhatsApp number',
                hintText: '+62812...',
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: isBusy
                    ? null
                    : () => onRequestAccess(controller.text.trim()),
                icon: isBusy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.verified_user_outlined),
                label: Text(
                  state.whatsappContact == null
                      ? 'Request Access'
                      : 'Update Access',
                ),
              ),
            ),
            if (state.whatsappAccess?.syncError != null) ...[
              const SizedBox(height: 10),
              Text(
                state.whatsappAccess!.syncError!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _statusColor(BuildContext context, String? status) {
    return switch (status) {
      'allowed' => _emerald,
      'blocked' => _rose,
      'sync_failed' => _rose,
      'pending_verification' => _amber,
      'pending_allowlist' => _amber,
      _ => Theme.of(context).colorScheme.primary,
    };
  }
}

class _AssistantMessage extends StatelessWidget {
  const _AssistantMessage({required this.state});

  final NaraMobileState state;

  @override
  Widget build(BuildContext context) {
    final message = state.assistantError ?? state.assistantMessage;
    if (message == null) return const SizedBox.shrink();

    final isError = state.assistantError != null;
    final color = isError ? _rose : _emerald;

    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: color.withAlpha(102)),
        borderRadius: BorderRadius.circular(8),
        color: color.withAlpha(20),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: color,
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
      ),
    );
  }
}

class _ChoiceCard extends StatelessWidget {
  const _ChoiceCard({
    required this.title,
    required this.subtitle,
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final List<_ChoiceOption> options;
  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(subtitle),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: options.map((option) {
                return ChoiceChip(
                  selected: selected == option.label,
                  avatar: Icon(option.icon, size: 18),
                  label: Text(option.label),
                  onSelected: (_) => onChanged(option.label),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
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

class _ChoiceOption {
  const _ChoiceOption(this.label, this.icon);

  final String label;
  final IconData icon;
}
