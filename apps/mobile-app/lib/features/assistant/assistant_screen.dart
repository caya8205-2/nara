import 'package:flutter/material.dart';

import '../../core/services/api_client.dart';

class AssistantScreen extends StatefulWidget {
  const AssistantScreen({required this.apiClient, super.key});

  final NaraApiClient apiClient;

  @override
  State<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends State<AssistantScreen> {
  String tone = 'Balanced';
  String autonomy = 'Confirm';
  final customToneController = TextEditingController();
  bool allowTaskCreation = true;
  bool allowReminderDrafts = true;
  bool allowSensitiveActions = false;

  @override
  void dispose() {
    customToneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Assistant',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        const Text(
            'Shape how Nara Bot should work before WhatsApp is connected.'),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Personality',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                const Text(
                    'Choose the baseline tone Nara should use in replies.'),
                const SizedBox(height: 12),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(
                      value: 'Balanced',
                      icon: Icon(Icons.tune),
                      label: Text('Balanced'),
                    ),
                    ButtonSegment(
                      value: 'Formal',
                      icon: Icon(Icons.work_outline),
                      label: Text('Formal'),
                    ),
                    ButtonSegment(
                      value: 'Concise',
                      icon: Icon(Icons.short_text),
                      label: Text('Concise'),
                    ),
                    ButtonSegment(
                      value: 'Custom',
                      icon: Icon(Icons.edit_note),
                      label: Text('Custom'),
                    ),
                  ],
                  selected: {tone},
                  onSelectionChanged: (value) {
                    setState(() => tone = value.first);
                  },
                ),
                if (tone == 'Custom') ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: customToneController,
                    minLines: 2,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Custom personality',
                      hintText:
                          'Example: calm, practical, concise, but warm when reminding me.',
                    ),
                  ),
                ],
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
                  'Action style',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                const Text('Set how much Nara can do before asking you.'),
                const SizedBox(height: 12),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(
                      value: 'Suggest',
                      icon: Icon(Icons.lightbulb_outline),
                      label: Text('Suggest'),
                    ),
                    ButtonSegment(
                      value: 'Confirm',
                      icon: Icon(Icons.verified_outlined),
                      label: Text('Confirm'),
                    ),
                    ButtonSegment(
                      value: 'Act',
                      icon: Icon(Icons.bolt_outlined),
                      label: Text('Act'),
                    ),
                  ],
                  selected: {autonomy},
                  onSelectionChanged: (value) {
                    setState(() => autonomy = value.first);
                  },
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Column(
            children: [
              SwitchListTile(
                value: allowTaskCreation,
                onChanged: (value) => setState(() => allowTaskCreation = value),
                secondary: const Icon(Icons.add_task),
                title: const Text('Create tasks from chats'),
                subtitle:
                    const Text('Nara can turn clear requests into tasks.'),
              ),
              const Divider(height: 1),
              SwitchListTile(
                value: allowReminderDrafts,
                onChanged: (value) =>
                    setState(() => allowReminderDrafts = value),
                secondary: const Icon(Icons.notifications_outlined),
                title: const Text('Draft reminders'),
                subtitle:
                    const Text('Reminder drafts will wait for your approval.'),
              ),
              const Divider(height: 1),
              SwitchListTile(
                value: allowSensitiveActions,
                onChanged: (value) =>
                    setState(() => allowSensitiveActions = value),
                secondary: const Icon(Icons.lock_outline),
                title: const Text('Sensitive actions'),
                subtitle:
                    const Text('Keep disabled until approval flow is ready.'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const Card(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.smart_toy_outlined),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'WhatsApp access',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                    Text('Not connected'),
                  ],
                ),
                SizedBox(height: 10),
                Text(
                  'Once a dedicated number is ready, this screen will request access to Nara Bot and track the allowlist status.',
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
