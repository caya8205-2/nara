import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';

const _emerald = Color(0xFF059669);
const _amber = Color(0xFFD97706);
const _rose = Color(0xFFE11D48);

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    required this.state,
    required this.user,
    required this.onRefreshConnection,
    required this.onRefreshTasks,
    required this.onRefreshAssistant,
    required this.onOpenTasks,
    required this.onCreateTask,
    required this.onCompleteTask,
    required this.onOpenNara,
    required this.onRequestWhatsAppAccess,
    super.key,
  });

  final NaraMobileState state;
  final Map<String, dynamic>? user;
  final Future<void> Function() onRefreshConnection;
  final Future<void> Function() onRefreshTasks;
  final Future<void> Function() onRefreshAssistant;
  final VoidCallback onOpenTasks;
  final Future<void> Function(NaraTaskDraft draft) onCreateTask;
  final Future<void> Function(String id) onCompleteTask;
  final VoidCallback onOpenNara;
  final Future<void> Function(String number) onRequestWhatsAppAccess;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final TextEditingController whatsappController;

  @override
  void initState() {
    super.initState();
    whatsappController = TextEditingController(
      text: widget.state.whatsappContact?.value ?? '',
    );
  }

  @override
  void didUpdateWidget(covariant HomeScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    final value = widget.state.whatsappContact?.value ?? '';
    if (whatsappController.text != value && value.isNotEmpty) {
      whatsappController.text = value;
    }
  }

  @override
  void dispose() {
    whatsappController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final displayName = widget.user?['displayName']?.toString() ?? 'there';
    final theme = Theme.of(context);

    return RefreshIndicator(
      onRefresh: () async {
        await widget.onRefreshConnection();
        await widget.onRefreshTasks();
        await widget.onRefreshAssistant();
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Hi, $displayName',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          const Text('Start with today, then let Nara handle the edges.'),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  label: 'Today',
                  value: widget.state.todayTasks.length.toString(),
                  icon: Icons.today_outlined,
                  color: _amber,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  label: 'Open',
                  value: widget.state.pendingTaskCount.toString(),
                  icon: Icons.checklist,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  label: 'Done',
                  value: widget.state.completedTaskCount.toString(),
                  icon: Icons.check_circle_outline,
                  color: _emerald,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _TodayActionCard(
            state: widget.state,
            onCreateTask: widget.onCreateTask,
            onCompleteTask: widget.onCompleteTask,
            onOpenTasks: widget.onOpenTasks,
          ),
          const SizedBox(height: 12),
          _NaraBotActionCard(
            state: widget.state,
            controller: whatsappController,
            onOpenNara: widget.onOpenNara,
            onRequestWhatsAppAccess: widget.onRequestWhatsAppAccess,
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.verified_outlined),
              title: const Text('Approvals'),
              subtitle: const Text('No agent approval queue yet.'),
              trailing: const Text('Soon'),
              onTap: widget.onOpenNara,
            ),
          ),
        ],
      ),
    );
  }
}

class _TodayActionCard extends StatelessWidget {
  const _TodayActionCard({
    required this.state,
    required this.onCreateTask,
    required this.onCompleteTask,
    required this.onOpenTasks,
  });

  final NaraMobileState state;
  final Future<void> Function(NaraTaskDraft draft) onCreateTask;
  final Future<void> Function(String id) onCompleteTask;
  final VoidCallback onOpenTasks;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final todayTasks = state.todayTasks.take(4).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Today',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                TextButton(
                  onPressed: onOpenTasks,
                  child: const Text('All tasks'),
                ),
              ],
            ),
            if (state.tasksLoading)
              const LinearProgressIndicator()
            else if (state.tasksError != null)
              Text(
                state.tasksError!,
                style: TextStyle(color: theme.colorScheme.error),
              )
            else if (todayTasks.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 10),
                child: Text(
                    'No tasks due today. Add one when something needs attention.'),
              )
            else
              ...todayTasks.map(
                (task) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: IconButton(
                    tooltip: 'Complete task',
                    onPressed: () => onCompleteTask(task.id),
                    icon: const Icon(Icons.circle_outlined),
                  ),
                  title: Text(task.title),
                  subtitle: Text(_taskSubtitle(task)),
                  trailing: _PriorityPill(priority: task.priority),
                ),
              ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: () => _showQuickTaskSheet(context, onCreateTask),
              icon: const Icon(Icons.add_task),
              label: const Text('Quick Add Task'),
            ),
          ],
        ),
      ),
    );
  }
}

class _NaraBotActionCard extends StatelessWidget {
  const _NaraBotActionCard({
    required this.state,
    required this.controller,
    required this.onOpenNara,
    required this.onRequestWhatsAppAccess,
  });

  final NaraMobileState state;
  final TextEditingController controller;
  final VoidCallback onOpenNara;
  final Future<void> Function(String number) onRequestWhatsAppAccess;

  @override
  Widget build(BuildContext context) {
    final statusColor = _botStatusColor(context, state.whatsappAccess?.status);
    final isBusy = state.assistantLoading || state.assistantSaving;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.smart_toy_outlined, color: statusColor),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Nara Bot',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                _StatusBadge(
                    label: state.whatsappStatusLabel, color: statusColor),
              ],
            ),
            const SizedBox(height: 10),
            if (state.whatsappContact == null) ...[
              const Text(
                'Connect your WhatsApp number so Nara can become more than a manual task app.',
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'WhatsApp number',
                  hintText: '+62812...',
                ),
              ),
              const SizedBox(height: 10),
              FilledButton.icon(
                onPressed: isBusy
                    ? null
                    : () => onRequestWhatsAppAccess(controller.text.trim()),
                icon: isBusy
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.chat_outlined),
                label: const Text('Request Nara Bot Access'),
              ),
            ] else ...[
              Text(
                  '${state.whatsappContact!.value} is ${state.whatsappStatusLabel.toLowerCase()}.'),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: onOpenNara,
                icon: const Icon(Icons.tune),
                label: const Text('Tune Nara Behavior'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 10),
            Text(
              value,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            Text(label),
          ],
        ),
      ),
    );
  }
}

class _PriorityPill extends StatelessWidget {
  const _PriorityPill({required this.priority});

  final String priority;

  @override
  Widget build(BuildContext context) {
    final color = switch (priority) {
      'low' => _emerald,
      'high' => _amber,
      'urgent' => _rose,
      _ => Theme.of(context).colorScheme.primary,
    };
    final label = switch (priority) {
      'low' => 'Low',
      'high' => 'High',
      'urgent' => 'Urgent',
      _ => 'Normal',
    };

    return Text(
      label,
      style: TextStyle(color: color, fontWeight: FontWeight.w700),
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

Future<void> _showQuickTaskSheet(
  BuildContext context,
  Future<void> Function(NaraTaskDraft draft) onCreateTask,
) async {
  final draft = await showModalBottomSheet<NaraTaskDraft>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => const _QuickTaskSheet(),
  );

  if (draft == null) return;
  await _waitForSheetTeardown();
  if (!context.mounted) return;

  try {
    await onCreateTask(draft);
  } catch (_) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Could not add task right now.')),
    );
  }
}

class _QuickTaskSheet extends StatefulWidget {
  const _QuickTaskSheet();

  @override
  State<_QuickTaskSheet> createState() => _QuickTaskSheetState();
}

class _QuickTaskSheetState extends State<_QuickTaskSheet> {
  final controller = TextEditingController();

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Quick add',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: controller,
            autofocus: true,
            textInputAction: TextInputAction.done,
            decoration: const InputDecoration(
              labelText: 'Task title',
              hintText: 'Follow up with...',
            ),
            onSubmitted: (_) => submit(),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: submit,
            icon: const Icon(Icons.add_task),
            label: const Text('Add for Today'),
          ),
        ],
      ),
    );
  }

  void submit() {
    final title = controller.text.trim();
    if (title.isEmpty) return;
    final now = DateTime.now();
    Navigator.of(context).pop(
      NaraTaskDraft(
        title: title,
        dueAt: DateTime(now.year, now.month, now.day, 18),
      ),
    );
  }
}

Future<void> _waitForSheetTeardown() async {
  await Future<void>.delayed(const Duration(milliseconds: 240));
  await WidgetsBinding.instance.endOfFrame;
}

Color _botStatusColor(BuildContext context, String? status) {
  return switch (status) {
    'allowed' => _emerald,
    'blocked' => _rose,
    'sync_failed' => _rose,
    'pending_verification' => _amber,
    'pending_allowlist' => _amber,
    _ => Theme.of(context).colorScheme.primary,
  };
}

String _taskSubtitle(NaraTask task) {
  final priority = switch (task.priority) {
    'low' => 'Low priority',
    'high' => 'High priority',
    'urgent' => 'Urgent',
    _ => 'Normal priority',
  };
  if ((task.description ?? '').isNotEmpty) {
    return '$priority - ${task.description}';
  }
  return priority;
}
