import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';

const _emerald = Color(0xFF059669);

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
  final Future<void> Function(String title, String? description) onCreateTask;
  final Future<void> Function(String id) onCompleteTask;

  @override
  Widget build(BuildContext context) {
    final pendingTasks = state.tasks.where((task) => !task.done).toList();
    final completedTasks = state.tasks.where((task) => task.done).toList();

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
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                const Expanded(
                  child: Column(
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
                      Text('Capture, review, and close the small loops.'),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: state.tasksLoading ? null : onRefresh,
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
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
                    label: 'Open',
                    value: pendingTasks.length.toString(),
                    icon: Icons.radio_button_unchecked,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _TaskStatCard(
                    label: 'Done',
                    value: completedTasks.length.toString(),
                    icon: Icons.check_circle_outline,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _TaskSection(
              title: 'Open tasks',
              emptyTitle: 'No open tasks',
              emptyBody:
                  'Add a task from the button below and it will appear here.',
              tasks: pendingTasks,
              onCompleteTask: onCompleteTask,
            ),
            const SizedBox(height: 16),
            _TaskSection(
              title: 'Completed',
              emptyTitle: 'Nothing completed yet',
              emptyBody:
                  'Completed tasks will stay visible for quick confidence checks.',
              tasks: completedTasks,
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

    try {
      await onCreateTask(draft.title, draft.description);
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not create task. Check your connection.'),
        ),
      );
    }
  }

  Future<_TaskDraft?> _collectTaskDraft(BuildContext context) async {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    final result = await showModalBottomSheet<_TaskDraft>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
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
                    const Text(
                      'New task',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 12),
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
                    FilledButton.icon(
                      onPressed: () {
                        if (!formKey.currentState!.validate()) return;
                        Navigator.of(context).pop(
                          _TaskDraft(
                            titleController.text.trim(),
                            descriptionController.text.trim(),
                          ),
                        );
                      },
                      icon: const Icon(Icons.add_task),
                      label: const Text('Create Task'),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    titleController.dispose();
    descriptionController.dispose();
    return result;
  }
}

class _TaskDraft {
  const _TaskDraft(this.title, this.description);

  final String title;
  final String description;
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
        Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
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
              child: Card(
                child: ListTile(
                  leading: Icon(
                    completed ? Icons.check_circle : Icons.circle_outlined,
                    color: completed ? _emerald : null,
                  ),
                  title: Text(task.title),
                  subtitle: Text(task.description ?? 'No notes'),
                  trailing: completed
                      ? const Text('Done')
                      : IconButton(
                          tooltip: 'Complete task',
                          onPressed: () => onCompleteTask(task.id),
                          icon: const Icon(Icons.check),
                        ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _TaskStatCard extends StatelessWidget {
  const _TaskStatCard({
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
        child: Row(
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
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
