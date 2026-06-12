import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';

const _emerald = Color(0xFF059669);
const _amber = Color(0xFFD97706);
const _rose = Color(0xFFE11D48);

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    required this.state,
    required this.user,
    required this.onRefreshConnection,
    required this.onRefreshTasks,
    required this.onRefreshAssistant,
    required this.onOpenTasks,
    required this.onAddTask,
    required this.onOpenAssistant,
    required this.onOpenSettings,
    super.key,
  });

  final NaraMobileState state;
  final Map<String, dynamic>? user;
  final Future<void> Function() onRefreshConnection;
  final Future<void> Function() onRefreshTasks;
  final Future<void> Function() onRefreshAssistant;
  final VoidCallback onOpenTasks;
  final VoidCallback onAddTask;
  final VoidCallback onOpenAssistant;
  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context) {
    final displayName = user?['displayName']?.toString() ?? 'there';
    final theme = Theme.of(context);

    return RefreshIndicator(
      onRefresh: () async {
        await onRefreshConnection();
        await onRefreshTasks();
        await onRefreshAssistant();
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hi, $displayName',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                        'Your tasks, server, and Nara Bot setup in one place.'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _ConnectionCard(
            state: state,
            onOpenSettings: onOpenSettings,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  label: 'Pending',
                  value: state.pendingTaskCount.toString(),
                  icon: Icons.checklist,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetricCard(
                  label: 'Completed',
                  value:
                      state.tasks.where((task) => task.done).length.toString(),
                  icon: Icons.check_circle_outline,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Latest tasks',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  if (state.tasksLoading)
                    const LinearProgressIndicator()
                  else if (state.tasksError != null)
                    Text(
                      state.tasksError!,
                      style: TextStyle(color: theme.colorScheme.error),
                    )
                  else if (state.tasks.isEmpty)
                    const Text(
                        'No tasks yet. Add one to start shaping the day.')
                  else
                    ...state.latestTasks.map(
                      (task) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(
                          task.done
                              ? Icons.check_circle
                              : Icons.circle_outlined,
                          color:
                              task.done ? _emerald : theme.colorScheme.primary,
                        ),
                        title: Text(task.title),
                        subtitle: Text(task.description ?? 'No notes'),
                      ),
                    ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: onAddTask,
                          icon: const Icon(Icons.add_task),
                          label: const Text('Add Task'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      IconButton.outlined(
                        onPressed: onOpenTasks,
                        icon: const Icon(Icons.arrow_forward),
                      ),
                    ],
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
                  leading: const Icon(Icons.smart_toy_outlined),
                  title: const Text('Nara Bot'),
                  subtitle: Text(_botSubtitle(state)),
                  trailing: _BotStatusBadge(state: state),
                  onTap: onOpenAssistant,
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.verified_outlined),
                  title: const Text('Approvals'),
                  subtitle: const Text('No approval queue connected yet.'),
                  trailing: const Text('Soon'),
                  onTap: onOpenAssistant,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _botSubtitle(NaraMobileState state) {
    if (state.whatsappContact == null) {
      return 'Add your WhatsApp number to request access.';
    }
    if (state.hasWhatsAppAccess) {
      return '${state.whatsappContact!.value} can use Nara Bot.';
    }
    return '${state.whatsappContact!.value} is ${state.whatsappStatusLabel.toLowerCase()}.';
  }
}

class _BotStatusBadge extends StatelessWidget {
  const _BotStatusBadge({required this.state});

  final NaraMobileState state;

  @override
  Widget build(BuildContext context) {
    final color = switch (state.whatsappAccess?.status) {
      'allowed' => _emerald,
      'blocked' => _rose,
      'sync_failed' => _rose,
      'pending_verification' => _amber,
      'pending_allowlist' => _amber,
      _ => Theme.of(context).colorScheme.primary,
    };

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (state.assistantLoading) ...[
          const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          const SizedBox(width: 8),
        ],
        Text(
          state.whatsappStatusLabel,
          style: TextStyle(color: color, fontWeight: FontWeight.w700),
        ),
        const SizedBox(width: 4),
        Icon(Icons.chevron_right, color: color),
      ],
    );
  }
}

class _ConnectionCard extends StatelessWidget {
  const _ConnectionCard({
    required this.state,
    required this.onOpenSettings,
  });

  final NaraMobileState state;
  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context) {
    final color = _connectionColor(context, state.connectionState);
    final icon = _connectionIcon(state.connectionState);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: color),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Nara server',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(state.connectionMessage),
                  if (state.lastConnectionCheck != null)
                    Text(
                      'Last checked ${_timeLabel(state.lastConnectionCheck!)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
            ),
            IconButton(
              onPressed: onOpenSettings,
              icon: const Icon(Icons.tune),
            ),
          ],
        ),
      ),
    );
  }

  IconData _connectionIcon(NaraConnectionState state) {
    return switch (state) {
      NaraConnectionState.connected => Icons.check_circle,
      NaraConnectionState.attention => Icons.warning_amber,
      NaraConnectionState.offline => Icons.cloud_off,
      NaraConnectionState.checking => Icons.sync,
      NaraConnectionState.unknown => Icons.info_outline,
    };
  }

  Color _connectionColor(BuildContext context, NaraConnectionState state) {
    return switch (state) {
      NaraConnectionState.connected => _emerald,
      NaraConnectionState.attention => _amber,
      NaraConnectionState.offline => _rose,
      NaraConnectionState.checking => Theme.of(context).colorScheme.primary,
      NaraConnectionState.unknown => Theme.of(context).colorScheme.primary,
    };
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 12),
            Text(
              value,
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800),
            ),
            Text(label),
          ],
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
