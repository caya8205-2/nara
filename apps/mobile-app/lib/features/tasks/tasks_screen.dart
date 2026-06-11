import 'package:flutter/material.dart';

import '../../core/services/api_client.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({required this.apiClient, super.key});

  final NaraApiClient apiClient;

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  bool loading = false;
  String? error;
  List<dynamic> tasks = [];

  Future<void> loadTasks() async {
    setState(() {
      loading = true;
      error = null;
    });

    try {
      final result = await widget.apiClient.listTasks();
      setState(() => tasks = result);
    } catch (err) {
      setState(() => error = err.toString());
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
              child: Text(
                'Tasks',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
              ),
            ),
            IconButton(
              onPressed: loading ? null : loadTasks,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (loading)
          const Center(child: CircularProgressIndicator())
        else if (error != null)
          _MessageCard(
            icon: Icons.error_outline,
            title: 'Failed to load tasks',
            body: error!,
          )
        else if (tasks.isEmpty)
          const _MessageCard(
            icon: Icons.inbox_outlined,
            title: 'No tasks loaded',
            body: 'Refresh after connecting to the office server.',
          )
        else
          ...tasks.map((task) {
            final item = task is Map<String, dynamic> ? task : <String, dynamic>{};
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: ListTile(
                  leading: Icon(
                    item['done'] == true
                        ? Icons.check_circle
                        : Icons.circle_outlined,
                  ),
                  title: Text(item['title']?.toString() ?? 'Untitled task'),
                  subtitle: Text(item['description']?.toString() ?? 'No notes'),
                ),
              ),
            );
          }),
      ],
    );
  }
}

class _MessageCard extends StatelessWidget {
  const _MessageCard({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(body),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
