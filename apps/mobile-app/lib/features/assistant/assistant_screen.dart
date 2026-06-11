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
  bool requireApproval = true;
  bool allowTaskCreation = true;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Assistant',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        const Text('Set how Nara Bot should help you.'),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Reply tone',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'Balanced', label: Text('Balanced')),
                    ButtonSegment(value: 'Formal', label: Text('Formal')),
                    ButtonSegment(value: 'Concise', label: Text('Concise')),
                  ],
                  selected: {tone},
                  onSelectionChanged: (value) {
                    setState(() => tone = value.first);
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
                value: requireApproval,
                onChanged: (value) => setState(() => requireApproval = value),
                title: const Text('Require approval for sensitive actions'),
              ),
              const Divider(height: 1),
              SwitchListTile(
                value: allowTaskCreation,
                onChanged: (value) => setState(() => allowTaskCreation = value),
                title: const Text('Allow task creation from WhatsApp'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'WhatsApp access',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                SizedBox(height: 8),
                Text('Add phone number flow will connect to Nara Bot access endpoints next.'),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
