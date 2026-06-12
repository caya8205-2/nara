import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';

const _emerald = Color(0xFF059669);
const _amber = Color(0xFFD97706);
const _rose = Color(0xFFE11D48);
const _ink = Color(0xFF1F2937);

class TasksScreen extends StatelessWidget {
  const TasksScreen({
    required this.state,
    required this.onRefresh,
    required this.onCreateTask,
    required this.onCompleteTask,
    super.key,
  });

  final NaraMobileState state;
  final Future<void> Function() onRefresh;
  final Future<void> Function(NaraTaskDraft draft) onCreateTask;
  final Future<void> Function(String id) onCompleteTask;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed:
            state.tasksLoading ? null : () => _showCreateTaskSheet(context),
        icon: const Icon(Icons.add),
        label: const Text('Task'),
      ),
      body: RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            const _TasksHeader(),
            const SizedBox(height: 16),
            if (state.tasksLoading) const LinearProgressIndicator(),
            if (state.tasksError != null) ...[
              _MessageCard(
                icon: Icons.error_outline,
                title: 'Tasks need attention',
                body: state.tasksError!,
              ),
              const SizedBox(height: 12),
            ],
            Row(
              children: [
                Expanded(
                  child: _TaskStatCard(
                    label: 'Today',
                    value: state.todayTasks.length.toString(),
                    icon: Icons.today_outlined,
                    color: _amber,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _TaskStatCard(
                    label: 'Open',
                    value: state.openTasks.length.toString(),
                    icon: Icons.radio_button_unchecked,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _TaskStatCard(
                    label: 'Done',
                    value: state.completedTaskCount.toString(),
                    icon: Icons.check_circle_outline,
                    color: _emerald,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            _TaskSection(
              title: 'Today',
              emptyTitle: 'Nothing due today',
              emptyBody: 'The day is clear.',
              tasks: state.todayTasks,
              onCompleteTask: onCompleteTask,
            ),
            const SizedBox(height: 18),
            _TaskSection(
              title: 'Open',
              emptyTitle: 'No open tasks',
              emptyBody: 'Add a task when something needs Nara attention.',
              tasks: state.openTasks,
              onCompleteTask: onCompleteTask,
            ),
            const SizedBox(height: 18),
            _TaskSection(
              title: 'Done',
              emptyTitle: 'Nothing completed yet',
              emptyBody: 'Completed work will appear here.',
              tasks: state.completedTasks,
              onCompleteTask: onCompleteTask,
              completed: true,
            ),
            const SizedBox(height: 88),
          ],
        ),
      ),
    );
  }

  Future<void> _showCreateTaskSheet(BuildContext context) async {
    final draft = await _collectTaskDraft(context);
    if (draft == null) return;
    await _waitForSheetTeardown();
    if (!context.mounted) return;

    try {
      await onCreateTask(draft);
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not create task. Check your connection.'),
        ),
      );
    }
  }

  Future<NaraTaskDraft?> _collectTaskDraft(BuildContext context) async {
    return showModalBottomSheet<NaraTaskDraft>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => const _TaskDraftSheet(),
    );
  }
}

class _TaskDraftSheet extends StatefulWidget {
  const _TaskDraftSheet();

  @override
  State<_TaskDraftSheet> createState() => _TaskDraftSheetState();
}

class _TaskDraftSheetState extends State<_TaskDraftSheet> {
  final titleController = TextEditingController();
  final descriptionController = TextEditingController();
  final formKey = GlobalKey<FormState>();
  String priority = 'normal';
  DateTime? dueAt;

  @override
  void dispose() {
    titleController.dispose();
    descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: Form(
        key: formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'New task',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: titleController,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Title'),
              validator: (value) {
                if ((value ?? '').trim().isEmpty) {
                  return 'Task title is required';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descriptionController,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Notes',
                hintText: 'Optional context for Nara',
              ),
            ),
            const SizedBox(height: 16),
            const _SheetLabel(icon: Icons.flag_outlined, label: 'Priority'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final option in _priorityOptions)
                  ChoiceChip(
                    label: Text(option.label),
                    selected: priority == option.value,
                    onSelected: (_) {
                      setState(() => priority = option.value);
                    },
                  ),
              ],
            ),
            const SizedBox(height: 16),
            const _SheetLabel(icon: Icons.event_outlined, label: 'Due'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('None'),
                  selected: dueAt == null,
                  onSelected: (_) {
                    setState(() => dueAt = null);
                  },
                ),
                ChoiceChip(
                  label: const Text('Today'),
                  selected: dueAt != null && _isSameDay(dueAt!, DateTime.now()),
                  onSelected: (_) {
                    final now = DateTime.now();
                    setState(
                      () => dueAt = DateTime(now.year, now.month, now.day, 18),
                    );
                  },
                ),
                ChoiceChip(
                  label: const Text('Tomorrow'),
                  selected: dueAt != null &&
                      _isSameDay(
                        dueAt!,
                        DateTime.now().add(const Duration(days: 1)),
                      ),
                  onSelected: (_) {
                    final tomorrow =
                        DateTime.now().add(const Duration(days: 1));
                    setState(
                      () => dueAt = DateTime(
                        tomorrow.year,
                        tomorrow.month,
                        tomorrow.day,
                        18,
                      ),
                    );
                  },
                ),
                ActionChip(
                  avatar: const Icon(Icons.calendar_month, size: 18),
                  label: Text(dueAt == null ? 'Pick date' : _dateLabel(dueAt!)),
                  onPressed: () async {
                    final now = DateTime.now();
                    final picked = await showDatePicker(
                      context: context,
                      firstDate: DateTime(now.year, now.month, now.day),
                      lastDate: DateTime(now.year + 2),
                      initialDate: dueAt ?? now,
                    );
                    if (picked == null || !mounted) return;
                    setState(
                      () => dueAt = DateTime(
                        picked.year,
                        picked.month,
                        picked.day,
                        18,
                      ),
                    );
                  },
                ),
              ],
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: submit,
              icon: const Icon(Icons.add_task),
              label: const Text('Create Task'),
            ),
          ],
        ),
      ),
    );
  }

  void submit() {
    if (!formKey.currentState!.validate()) return;
    final description = descriptionController.text.trim();
    Navigator.of(context).pop(
      NaraTaskDraft(
        title: titleController.text.trim(),
        description: description.isEmpty ? null : description,
        dueAt: dueAt,
        priority: priority,
      ),
    );
  }
}

Future<void> _waitForSheetTeardown() async {
  await Future<void>.delayed(const Duration(milliseconds: 240));
  await WidgetsBinding.instance.endOfFrame;
}

class _TasksHeader extends StatelessWidget {
  const _TasksHeader();

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tasks',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
          ),
        ),
        SizedBox(height: 4),
        Text('Today, open loops, and finished work.'),
      ],
    );
  }
}

class _TaskSection extends StatelessWidget {
  const _TaskSection({
    required this.title,
    required this.emptyTitle,
    required this.emptyBody,
    required this.tasks,
    required this.onCompleteTask,
    this.completed = false,
  });

  final String title;
  final String emptyTitle;
  final String emptyBody;
  final List<NaraTask> tasks;
  final Future<void> Function(String id) onCompleteTask;
  final bool completed;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(width: 8),
            Text(
              tasks.length.toString(),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (tasks.isEmpty)
          _MessageCard(
            icon: Icons.inbox_outlined,
            title: emptyTitle,
            body: emptyBody,
          )
        else
          ...tasks.map(
            (task) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _TaskTile(
                task: task,
                completed: completed,
                onCompleteTask: onCompleteTask,
              ),
            ),
          ),
      ],
    );
  }
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({
    required this.task,
    required this.completed,
    required this.onCompleteTask,
  });

  final NaraTask task;
  final bool completed;
  final Future<void> Function(String id) onCompleteTask;

  @override
  Widget build(BuildContext context) {
    final priorityColor = _priorityColor(task.priority);

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Icon(
                completed ? Icons.check_circle : Icons.circle_outlined,
                color: completed ? _emerald : priorityColor,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.title,
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      decoration: completed ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  if ((task.description ?? '').isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      task.description!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      _TaskChip(
                        icon: Icons.flag_outlined,
                        label: _priorityLabel(task.priority),
                        color: priorityColor,
                      ),
                      if (task.dueAt != null)
                        _TaskChip(
                          icon: Icons.event_outlined,
                          label: _dateLabel(task.dueAt!),
                          color: task.isDueToday ? _amber : _ink,
                        ),
                      _TaskChip(
                        icon: _sourceIcon(task.source),
                        label: _sourceLabel(task.source),
                        color: _ink,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (completed)
              const Padding(
                padding: EdgeInsets.only(top: 4),
                child: Text(
                  'Done',
                  style: TextStyle(
                    color: _emerald,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              )
            else
              IconButton(
                tooltip: 'Complete task',
                onPressed: () => onCompleteTask(task.id),
                icon: const Icon(Icons.check),
              ),
          ],
        ),
      ),
    );
  }
}

class _TaskChip extends StatelessWidget {
  const _TaskChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskStatCard extends StatelessWidget {
  const _TaskStatCard({
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
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(label),
          ],
        ),
      ),
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
      ),
    );
  }
}

class _SheetLabel extends StatelessWidget {
  const _SheetLabel({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
      ],
    );
  }
}

class _PriorityOption {
  const _PriorityOption(this.value, this.label);

  final String value;
  final String label;
}

const _priorityOptions = [
  _PriorityOption('normal', 'Normal'),
  _PriorityOption('high', 'High'),
  _PriorityOption('urgent', 'Urgent'),
  _PriorityOption('low', 'Low'),
];

String _priorityLabel(String value) {
  return switch (value) {
    'low' => 'Low',
    'high' => 'High',
    'urgent' => 'Urgent',
    _ => 'Normal',
  };
}

Color _priorityColor(String value) {
  return switch (value) {
    'low' => _emerald,
    'high' => _amber,
    'urgent' => _rose,
    _ => _ink,
  };
}

String _sourceLabel(String value) {
  return switch (value) {
    'admin' => 'Admin',
    'agent' => 'Nara',
    'scheduled' => 'Schedule',
    _ => 'Manual',
  };
}

IconData _sourceIcon(String value) {
  return switch (value) {
    'admin' => Icons.admin_panel_settings_outlined,
    'agent' => Icons.smart_toy_outlined,
    'scheduled' => Icons.schedule,
    _ => Icons.edit_note,
  };
}

String _dateLabel(DateTime value) {
  final local = value.toLocal();
  final now = DateTime.now();
  if (_isSameDay(local, now)) return 'Today';
  if (_isSameDay(local, now.add(const Duration(days: 1)))) {
    return 'Tomorrow';
  }
  return '${local.day} ${_monthLabel(local.month)}';
}

String _monthLabel(int month) {
  const labels = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return labels[month - 1];
}

bool _isSameDay(DateTime first, DateTime second) {
  final left = first.toLocal();
  final right = second.toLocal();
  return left.year == right.year &&
      left.month == right.month &&
      left.day == right.day;
}
