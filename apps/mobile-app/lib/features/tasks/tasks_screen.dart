import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';
import '../../core/theme/nara_theme.dart';
import '../../core/widgets/nara_card.dart';
import '../../core/widgets/nara_empty_state.dart';
import '../../core/widgets/nara_metric_tile.dart';

import '../../core/widgets/nara_task_row.dart';

enum _TaskFilter { all, pending, overdue, done }

class TasksScreen extends StatefulWidget {
  const TasksScreen({
    required this.state,
    required this.onRefresh,
    required this.onCreateTask,
    required this.onCompleteTask,
    required this.onOpenTaskDetail,
    required this.onDeleteTask,
    super.key,
  });

  final NaraMobileState state;
  final Future<void> Function() onRefresh;
  final Future<void> Function(NaraTaskDraft draft) onCreateTask;
  final Future<void> Function(String id) onCompleteTask;
  final Future<void> Function(NaraTask task) onOpenTaskDetail;
  final Future<void> Function(String id) onDeleteTask;

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  _TaskFilter _filter = _TaskFilter.all;
  final _searchController = TextEditingController();
  String _searchQuery = '';
  Timer? _debounce;
  bool _isGuest = false;

  @override
  void initState() {
    super.initState();
    _isGuest = widget.state.isGuest;
  }

  @override
  void didUpdateWidget(covariant TasksScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.state.isGuest != oldWidget.state.isGuest) {
      setState(() => _isGuest = widget.state.isGuest);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (mounted) {
        setState(() => _searchQuery = value.trim().toLowerCase());
      }
    });
  }

  List<NaraTask> get _filteredTasks {
    var tasks = switch (_filter) {
      _TaskFilter.all => widget.state.tasks,
      _TaskFilter.pending => widget.state.openTasks,
      _TaskFilter.overdue => widget.state.tasks
          .where((t) => t.dueAt != null && t.dueAt!.isBefore(DateTime.now()))
          .toList(),
      _TaskFilter.done => widget.state.completedTasks,
    };

    if (_searchQuery.isNotEmpty) {
      tasks = tasks.where((t) {
        final titleMatch = t.title.toLowerCase().contains(_searchQuery);
        final descMatch =
            t.description?.toLowerCase().contains(_searchQuery) ?? false;
        return titleMatch || descMatch;
      }).toList();
    }

    return tasks;
  }

  bool get _isSearching => _searchQuery.isNotEmpty;

  NaraTask? get _focusTask {
    final overdue = widget.state.tasks
        .where((t) =>
            !t.done && t.dueAt != null && t.dueAt!.isBefore(DateTime.now()))
        .toList();
    final candidates = [
      ...overdue,
      ...widget.state.todayTasks,
      ...widget.state.openTasks,
    ];
    return candidates.isEmpty ? null : candidates.first;
  }

  @override
  Widget build(BuildContext context) {
    final tasks = _filteredTasks;
    final focusTask = _focusTask;
    final isId =
        widget.state.languagePreference == NaraLanguagePreference.indonesia;
    // Hide FAB when there are zero tasks — empty state owns the CTA there.
    final hasAnyTask = widget.state.tasks.isNotEmpty;
    // Focus panel only shows when there is an actionable task to highlight;
    // never show its standalone "Add" button to avoid duplicate CTAs.
    final showFocusPanel = focusTask != null;

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: _isGuest || !hasAnyTask
          ? null
          : FloatingActionButton.extended(
              onPressed: widget.state.tasksLoading
                  ? null
                  : () => _showCreateTaskSheet(context),
              icon: const Icon(Icons.add),
              label: Text(isId ? 'Tugas' : 'Task'),
            ),
      body: RefreshIndicator(
        color: NaraColors.primary,
        onRefresh: _isGuest ? () async {} : widget.onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 104),
          children: [
            // ── Header ──
            Text(
              isId ? 'Tugas' : 'Tasks',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 4),
            Text(
              '${widget.state.tasks.length} tasks · ${widget.state.completedTaskCount} done',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: context.naraTextSecondary,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 16),

            // ── Search bar ──
            SizedBox(
              height: 44,
              child: TextField(
                controller: _searchController,
                onChanged: _onSearchChanged,
                style: TextStyle(fontSize: 13, color: context.naraTextPrimary),
                decoration: InputDecoration(
                  hintText: 'Search tasks…',
                  hintStyle: TextStyle(
                    fontSize: 13,
                    color: context.naraTextMuted,
                  ),
                  prefixIcon: Icon(
                    Icons.search,
                    size: 20,
                    color: context.naraTextMuted,
                  ),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            _onSearchChanged('');
                          },
                          visualDensity: VisualDensity.compact,
                        )
                      : null,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  filled: true,
                  fillColor: context.naraSurfaceRaised,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: context.naraBorder),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: context.naraBorder),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide:
                        const BorderSide(color: NaraColors.primary, width: 1.5),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // ── Loading ──
            if (widget.state.tasksLoading)
              const Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: LinearProgressIndicator(),
              ),

            // ── Error state ──
            if (widget.state.tasksError != null) ...[
              Container(
                padding: const EdgeInsets.all(14),
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
                        size: 20, color: NaraColors.danger),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        widget.state.tasksError!,
                        style: const TextStyle(
                          fontSize: 13,
                          color: NaraColors.danger,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // ── Today band ──
            if (!_isSearching) ...[
              NaraTodayBand(
                todayCount: widget.state.todayTasks.length,
                openCount: widget.state.openTasks.length,
                nextReminderLabel: formatNextReminderLabel(
                  widget.state.reminders,
                  isId,
                ),
                isIndonesian: isId,
              ),
              const SizedBox(height: 18),
              if (showFocusPanel) ...[
                _FocusTaskPanel(
                  task: focusTask,
                  isGuest: _isGuest,
                  onOpenTaskDetail: widget.onOpenTaskDetail,
                  onCompleteTask: widget.onCompleteTask,
                ),
                const SizedBox(height: 18),
              ],
            ],

            // ── Filter chips ──
            if (!_isSearching)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.only(bottom: 14),
                child: Row(
                  children: _TaskFilter.values.map((f) {
                    final active = _filter == f;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(_filterLabel(f, isId: isId)),
                        selected: active,
                        onSelected: (_) => setState(() => _filter = f),
                        selectedColor: context.naraSelectedTint,
                        labelStyle: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: active
                              ? NaraColors.primary
                              : context.naraTextSecondary,
                        ),
                        side: BorderSide(
                          color: active
                              ? NaraColors.primary.withValues(alpha: 0.3)
                              : context.naraBorder,
                        ),
                        backgroundColor: context.naraSurfaceRaised,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 4, vertical: 0),
                        visualDensity: VisualDensity.compact,
                      ),
                    );
                  }).toList(),
                ),
              ),

            // ── Search result label ──
            if (_isSearching)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  '${tasks.length} task${tasks.length == 1 ? '' : 's'} match "${_searchQuery}"',
                  style: TextStyle(
                    fontSize: 13,
                    color: context.naraTextSecondary,
                  ),
                ),
              ),

            // ── Task list ──
            if (tasks.isEmpty && _isSearching)
              NaraEmptyState(
                title: isId
                    ? 'Tidak ada tugas yang cocok.'
                    : 'No tasks match your search.',
                body: isId
                    ? 'Coba kata kunci lain atau kosongkan pencarian.'
                    : 'Try a different keyword or clear the search.',
              )
            else if (tasks.isEmpty)
              NaraEmptyState(
                title: _emptyTitle(isId: isId),
                body: _emptyBody(isId: isId),
                actionLabel: _filter == _TaskFilter.done
                    ? null
                    : (_isGuest ? null : (isId ? 'Tugas Baru' : 'New Task')),
                onActionTap: _filter == _TaskFilter.done || _isGuest
                    ? null
                    : () => widget.onCreateTask(
                          const NaraTaskDraft(title: ''),
                        ),
              )
            else
              Column(
                children: tasks
                    .map(
                      (task) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _DismissibleTaskCard(
                          task: task,
                          isGuest: _isGuest,
                          isIndonesian: isId,
                          onOpen: () => widget.onOpenTaskDetail(task),
                          onToggleComplete: _isGuest
                              ? (_) async => _showGuestDialog(context)
                              : widget.onCompleteTask,
                          onDelete: _isGuest
                              ? (_) async => _showGuestDialog(context)
                              : widget.onDeleteTask,
                          onGuestAction: () => _showGuestDialog(context),
                        ),
                      ),
                    )
                    .toList(),
              ),
          ],
        ),
      ),
    );
  }

  String _emptyTitle({required bool isId}) {
    if (isId) {
      return switch (_filter) {
        _TaskFilter.all => 'Belum ada tugas',
        _TaskFilter.pending => 'Tidak ada tugas terbuka',
        _TaskFilter.overdue => 'Tidak ada yang terlambat',
        _TaskFilter.done => 'Belum ada yang selesai',
      };
    }
    return switch (_filter) {
      _TaskFilter.all => 'No tasks yet',
      _TaskFilter.pending => 'No open tasks',
      _TaskFilter.overdue => 'Nothing overdue',
      _TaskFilter.done => 'Nothing completed yet',
    };
  }

  String _emptyBody({required bool isId}) {
    if (isId) {
      return switch (_filter) {
        _TaskFilter.all => 'Tambahkan tugas saat ada yang perlu dikerjakan.',
        _TaskFilter.pending =>
          'Semua tugas sudah selesai. Tambahkan tugas baru untuk lanjut.',
        _TaskFilter.overdue => 'Semua masih sesuai jadwal. Bagus.',
        _TaskFilter.done => 'Tugas selesai akan muncul di sini.',
      };
    }
    return switch (_filter) {
      _TaskFilter.all => 'Add a task when something needs attention.',
      _TaskFilter.pending => 'All tasks are done. Add a new one to keep going.',
      _TaskFilter.overdue => 'Everything is on schedule. Good work.',
      _TaskFilter.done => 'Completed tasks will appear here.',
    };
  }

  String _filterLabel(_TaskFilter filter, {required bool isId}) {
    if (isId) {
      return switch (filter) {
        _TaskFilter.all => 'Semua',
        _TaskFilter.pending => 'Pending',
        _TaskFilter.overdue => 'Terlambat',
        _TaskFilter.done => 'Selesai',
      };
    }
    return switch (filter) {
      _TaskFilter.all => 'All',
      _TaskFilter.pending => 'Pending',
      _TaskFilter.overdue => 'Overdue',
      _TaskFilter.done => 'Done',
    };
  }

  void _showGuestDialog(BuildContext context) {
    final isIndonesian =
        widget.state.languagePreference == NaraLanguagePreference.indonesia;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          isIndonesian ? 'Masuk dulu untuk lanjut' : 'Sign in to continue',
        ),
        content: Text(
          isIndonesian
              ? 'Kamu perlu akun untuk membuat atau mengubah tugas.'
              : 'You need an account to create or edit tasks.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(isIndonesian ? 'Batal' : 'Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              // Guest can't sign in from here — use callback if available
            },
            child: Text(isIndonesian ? 'Masuk' : 'Sign In'),
          ),
        ],
      ),
    );
  }

  Future<void> _showCreateTaskSheet(BuildContext context) async {
    final draft = await _collectTaskDraft(context);
    if (draft == null) return;
    await Future.delayed(const Duration(milliseconds: 300));
    if (!context.mounted) return;

    try {
      await widget.onCreateTask(draft);
    } catch (_) {
      if (!context.mounted) return;
      final isIndonesian =
          widget.state.languagePreference == NaraLanguagePreference.indonesia;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isIndonesian
                ? 'Tugas belum bisa dibuat. Periksa koneksi kamu.'
                : 'Could not create task. Check your connection.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<NaraTaskDraft?> _collectTaskDraft(BuildContext context) async {
    return showModalBottomSheet<NaraTaskDraft>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _TaskDraftSheet(),
    );
  }
}

// ── Task Draft Sheet ─────────────────────────────────────────────────────

class _FocusTaskPanel extends StatelessWidget {
  const _FocusTaskPanel({
    required this.task,
    required this.isGuest,
    required this.onOpenTaskDetail,
    required this.onCompleteTask,
  });

  final NaraTask task;
  final bool isGuest;
  final Future<void> Function(NaraTask task) onOpenTaskDetail;
  final Future<void> Function(String id) onCompleteTask;

  @override
  Widget build(BuildContext context) {
    final dark = context.isNaraDark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: dark
              ? const [
                  Color(0xFF1A2C29),
                  Color(0xFF244C46),
                  Color(0xFF2B342F),
                ]
              : const [
                  NaraColors.surface,
                  NaraColors.primaryMuted,
                  NaraColors.warningMuted,
                ],
          stops: const [0, 0.7, 1],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: context.naraBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: (dark ? const Color(0xFF081211) : NaraColors.primary)
                .withValues(alpha: 0.08),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.bolt_rounded,
                  size: 18,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Next best action',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: dark
                            ? const Color(0xFFF1F7F5)
                            : NaraColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Keep the queue moving without scanning everything.',
                      style: TextStyle(
                        fontSize: 11,
                        color: dark
                            ? const Color(0xFFC5D6D2)
                            : NaraColors.textSecondary,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            task.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: dark ? const Color(0xFFF1F7F5) : NaraColors.textPrimary,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => onOpenTaskDetail(task),
                  icon: const Icon(Icons.open_in_new_rounded, size: 16),
                  label: const Text('Open'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.primary,
                    side: BorderSide(
                      color: dark ? context.naraBorder : NaraColors.border,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  onPressed: isGuest
                      ? null
                      : () => onCompleteTask(task.id),
                  icon: const Icon(Icons.check_rounded, size: 16),
                  label: const Text('Done'),
                  style: FilledButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: dark
                        ? const Color(0xFF063F3A)
                        : NaraColors.textOnPrimary,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DismissibleTaskCard extends StatelessWidget {
  const _DismissibleTaskCard({
    required this.task,
    required this.isGuest,
    required this.isIndonesian,
    required this.onOpen,
    required this.onToggleComplete,
    required this.onDelete,
    required this.onGuestAction,
  });

  final NaraTask task;
  final bool isGuest;
  final bool isIndonesian;
  final VoidCallback onOpen;
  final Future<void> Function(String id) onToggleComplete;
  final Future<void> Function(String id) onDelete;
  final VoidCallback onGuestAction;

  Future<bool?> _confirmDismiss(BuildContext context) async {
    if (isGuest) {
      onGuestAction();
      return false;
    }
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isIndonesian ? 'Hapus tugas' : 'Delete task'),
        content: Text(
          isIndonesian
              ? 'Yakin ingin menghapus "${task.title}"? Tindakan ini tidak bisa dibatalkan.'
              : 'Are you sure you want to delete "${task.title}"? This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(isIndonesian ? 'Batal' : 'Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: NaraColors.danger,
            ),
            child: Text(isIndonesian ? 'Hapus' : 'Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey('task-${task.id}'),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) => _confirmDismiss(context),
      onDismissed: (_) => onDelete(task.id),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: NaraColors.danger.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(
          Icons.delete_outline_rounded,
          color: NaraColors.danger,
          size: 24,
        ),
      ),
      child: NaraCard.tappable(
        onTap: onOpen,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: NaraTaskRow(
          task: task,
          onToggleComplete: onToggleComplete,
          showSource: true,
        ),
      ),
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
            // Header
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
            // Title
            TextFormField(
              controller: titleController,
              textInputAction: TextInputAction.next,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Title',
                hintText: 'What needs to be done?',
              ),
              validator: (value) {
                if ((value ?? '').trim().isEmpty) {
                  return 'Task title is required';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),
            // Description
            TextFormField(
              controller: descriptionController,
              textInputAction: TextInputAction.newline,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'Optional details...',
              ),
            ),
            const SizedBox(height: 12),
            // Priority
            DropdownButtonFormField<String>(
              initialValue: priority,
              decoration: const InputDecoration(labelText: 'Priority'),
              items: const [
                DropdownMenuItem(value: 'low', child: Text('Low')),
                DropdownMenuItem(value: 'normal', child: Text('Normal')),
                DropdownMenuItem(value: 'high', child: Text('High')),
                DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
              ],
              onChanged: (v) {
                if (v != null) setState(() => priority = v);
              },
            ),
            const SizedBox(height: 12),
            // Due date
            InputDecorator(
              decoration: const InputDecoration(labelText: 'Due date'),
              child: Row(
                children: [
                  Text(
                    dueAt == null
                        ? 'No due date'
                        : '${dueAt!.day}/${dueAt!.month}/${dueAt!.year}',
                    style: TextStyle(
                      fontSize: 14,
                      color: dueAt == null
                          ? NaraColors.textMuted
                          : NaraColors.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  if (dueAt != null)
                    IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () => setState(() => dueAt = null),
                      visualDensity: VisualDensity.compact,
                    ),
                  TextButton(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: dueAt ?? DateTime.now(),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        setState(() => dueAt = picked);
                      }
                    },
                    child: const Text('Pick date'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () {
                if (!formKey.currentState!.validate()) return;
                Navigator.of(context).pop(NaraTaskDraft(
                  title: titleController.text.trim(),
                  description: descriptionController.text.trim().isEmpty
                      ? null
                      : descriptionController.text.trim(),
                  dueAt: dueAt,
                  priority: priority,
                ));
              },
              child: const Text('Create Task'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
