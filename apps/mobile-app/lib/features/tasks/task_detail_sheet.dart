import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';
import '../../core/theme/nara_theme.dart';

/// Draggable bottom sheet for viewing and editing a single task.
///
/// Opens at ~70% screen height. Supports optimistic update and rollback.
/// Used from Home and Tasks screens on task row tap.
class TaskDetailSheet extends StatefulWidget {
  const TaskDetailSheet({
    required this.task,
    required this.onSave,
    required this.onDelete,
    super.key,
  });

  final NaraTask task;
  final Future<void> Function(NaraTask task) onSave;
  final Future<void> Function(String id) onDelete;

  @override
  State<TaskDetailSheet> createState() => _TaskDetailSheetState();
}

class _TaskDetailSheetState extends State<TaskDetailSheet> {
  late final TextEditingController _titleController;
  late final TextEditingController _descController;
  late String _priority;
  late bool _done;
  late DateTime? _dueAt;
  bool _saving = false;
  bool _deleting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.task.title);
    _descController =
        TextEditingController(text: widget.task.description ?? '');
    _priority = widget.task.priority;
    _done = widget.task.done;
    _dueAt = widget.task.dueAt;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  bool get _hasChanges {
    return _titleController.text.trim() != widget.task.title ||
        _descController.text.trim() != (widget.task.description ?? '') ||
        _priority != widget.task.priority ||
        _done != widget.task.done ||
        _dueAt != widget.task.dueAt;
  }

  Future<void> _save() async {
    if (!_hasChanges) {
      Navigator.of(context).pop();
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    final updated = widget.task.copyWith(
      title: _titleController.text.trim(),
      description: _descController.text.trim().isEmpty
          ? null
          : _descController.text.trim(),
      priority: _priority,
      done: _done,
      dueAt: _dueAt,
    );

    try {
      await widget.onSave(updated);
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = 'Could not save changes. Try again.';
      });
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete task'),
        content: Text(
          'Are you sure you want to delete "${widget.task.title}"? '
          'This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: NaraColors.danger,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() {
      _deleting = true;
      _error = null;
    });

    try {
      await widget.onDelete(widget.task.id);
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _deleting = false;
        _error = 'Could not delete task. Try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: NaraColors.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Drag handle
              Padding(
                padding: const EdgeInsets.only(top: 10, bottom: 4),
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: NaraColors.borderStrong,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                  children: [
                    // Header row
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Task detail',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: NaraColors.textPrimary,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.of(context).pop(),
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Error
                    if (_error != null) ...[
                      _ErrorBanner(message: _error!),
                      const SizedBox(height: 14),
                    ],

                    // Title
                    TextField(
                      controller: _titleController,
                      textInputAction: TextInputAction.next,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: NaraColors.textPrimary,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Title',
                        hintText: 'Task title',
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Description
                    TextField(
                      controller: _descController,
                      textInputAction: TextInputAction.newline,
                      minLines: 2,
                      maxLines: 5,
                      style: const TextStyle(
                        fontSize: 14,
                        color: NaraColors.textPrimary,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        hintText: 'Optional notes…',
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Status toggle
                    Row(
                      children: [
                        const Icon(Icons.check_circle_outline,
                            size: 20, color: NaraColors.textSecondary),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text(
                            'Status',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: NaraColors.textPrimary,
                            ),
                          ),
                        ),
                        SegmentedButton<bool>(
                          segments: const [
                            ButtonSegment(
                              value: false,
                              label: Text('Open'),
                              icon: Icon(Icons.radio_button_unchecked,
                                  size: 16),
                            ),
                            ButtonSegment(
                              value: true,
                              label: Text('Done'),
                              icon: Icon(Icons.check_circle, size: 16),
                            ),
                          ],
                          selected: {_done},
                          onSelectionChanged: (v) =>
                              setState(() => _done = v.first),
                          style: ButtonStyle(
                            visualDensity: VisualDensity.compact,
                            textStyle: WidgetStateProperty.all(
                              const TextStyle(fontSize: 12),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Priority dropdown
                    Row(
                      children: [
                        const Icon(Icons.flag_outlined,
                            size: 20, color: NaraColors.textSecondary),
                        const SizedBox(width: 10),
                        const Text(
                          'Priority',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: NaraColors.textPrimary,
                          ),
                        ),
                        const Spacer(),
                        DropdownButton<String>(
                          value: _priority,
                          underline: const SizedBox(),
                          style: const TextStyle(
                            fontSize: 13,
                            color: NaraColors.textPrimary,
                          ),
                          items: const [
                            DropdownMenuItem(
                                value: 'low', child: Text('Low')),
                            DropdownMenuItem(
                                value: 'normal', child: Text('Normal')),
                            DropdownMenuItem(
                                value: 'high', child: Text('High')),
                            DropdownMenuItem(
                                value: 'urgent', child: Text('Urgent')),
                          ],
                          onChanged: (v) {
                            if (v != null) setState(() => _priority = v);
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Due date
                    Row(
                      children: [
                        const Icon(Icons.calendar_today_outlined,
                            size: 20, color: NaraColors.textSecondary),
                        const SizedBox(width: 10),
                        const Text(
                          'Due date',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: NaraColors.textPrimary,
                          ),
                        ),
                        const Spacer(),
                        if (_dueAt != null)
                          IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () => setState(() => _dueAt = null),
                            visualDensity: VisualDensity.compact,
                            tooltip: 'Clear date',
                          ),
                        TextButton(
                          onPressed: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _dueAt ?? DateTime.now(),
                              firstDate: DateTime(2020),
                              lastDate:
                                  DateTime.now().add(const Duration(days: 365)),
                            );
                            if (picked != null) setState(() => _dueAt = picked);
                          },
                          child: Text(
                            _dueAt == null
                                ? 'Not set'
                                : '${_dueAt!.day}/${_dueAt!.month}/${_dueAt!.year}',
                            style: TextStyle(
                              fontSize: 13,
                              color: _dueAt == null
                                  ? NaraColors.textMuted
                                  : NaraColors.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Source badge (read-only)
                    if (widget.task.source != 'manual') ...[
                      Row(
                        children: [
                          const Icon(Icons.link,
                              size: 20, color: NaraColors.textSecondary),
                          const SizedBox(width: 10),
                          Text(
                            'Source',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: NaraColors.textPrimary,
                            ),
                          ),
                          const Spacer(),
                          _SourceBadge(source: widget.task.source),
                        ],
                      ),
                      const SizedBox(height: 14),
                    ],

                    const SizedBox(height: 6),

                    // Action buttons
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: FilledButton(
                        onPressed: _saving || _deleting ? null : _save,
                        child: _saving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Save Changes'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: OutlinedButton(
                        onPressed: _saving || _deleting ? null : _delete,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: NaraColors.danger,
                          side: const BorderSide(color: NaraColors.dangerLight),
                        ),
                        child: _deleting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: NaraColors.danger,
                                ),
                              )
                            : const Text('Delete Task'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: NaraColors.dangerLight,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: NaraColors.danger.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline,
              color: NaraColors.danger, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 13,
                color: NaraColors.danger,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SourceBadge extends StatelessWidget {
  const _SourceBadge({required this.source});
  final String source;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, String label) = switch (source) {
      'whatsapp' => (Icons.message_outlined, 'WhatsApp'),
      'schedule' => (Icons.schedule, 'Schedule'),
      'agent' => (Icons.smart_toy_outlined, 'Nara Bot'),
      _ => (Icons.edit_note, 'App'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: NaraColors.surfaceRaised,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: NaraColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: NaraColors.textSecondary),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: NaraColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
