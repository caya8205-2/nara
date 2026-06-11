import 'package:flutter/material.dart';

import '../../core/services/api_client.dart';

const _emerald = Color(0xFF059669);

class HomeScreen extends StatefulWidget {
  const HomeScreen({required this.apiClient, super.key});

  final NaraApiClient apiClient;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool loading = false;
  String status = 'Not checked';

  Future<void> checkStatus() async {
    setState(() {
      loading = true;
      status = 'Checking';
    });

    try {
      final report = await widget.apiClient.testReadiness();
      setState(() {
        status = report['ok'] == true ? 'Connected' : 'Needs attention';
      });
    } catch (error) {
      setState(() => status = 'Offline');
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Today',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
                  ),
                  SizedBox(height: 4),
                  Text('Tasks, Nara Bot, and pending decisions'),
                ],
              ),
            ),
            IconButton(
              onPressed: loading ? null : checkStatus,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(
                  status == 'Connected'
                      ? Icons.check_circle
                      : Icons.info_outline,
                  color: status == 'Connected'
                      ? _emerald
                      : Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Office server',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      Text(status),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        const _SummaryCard(
          title: 'Pending tasks',
          value: 'Open Tasks tab',
          icon: Icons.checklist,
        ),
        const SizedBox(height: 12),
        const _SummaryCard(
          title: 'Nara Bot',
          value: 'Set up WhatsApp access in Assistant',
          icon: Icons.smart_toy_outlined,
        ),
        const SizedBox(height: 12),
        const _SummaryCard(
          title: 'Approvals',
          value: 'No approval queue connected yet',
          icon: Icons.verified_outlined,
        ),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.title,
    required this.value,
    required this.icon,
  });

  final String title;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(value),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
