import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';
import '../../core/widgets/nara_card.dart';
import '../../core/widgets/nara_empty_state.dart';
import '../../core/widgets/nara_section_header.dart';

class RemindersScreen extends StatelessWidget {
  const RemindersScreen({
    required this.state,
    required this.onRefresh,
    required this.onCreate,
    required this.onSetEnabled,
    required this.onDelete,
    super.key,
  });

  final NaraMobileState state;
  final Future<void> Function({bool silent}) onRefresh;
  final Future<void> Function(NaraReminderDraft draft) onCreate;
  final Future<void> Function(NaraReminder reminder, bool enabled)
      onSetEnabled;
  final Future<void> Function(String id) onDelete;

  bool get _isIndonesian =>
      state.languagePreference == NaraLanguagePreference.indonesia;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return RefreshIndicator(
      onRefresh: () => onRefresh(silent: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
        children: [
          Text(
            _isIndonesian ? 'Pengingat' : 'Reminders',
            style: theme.textTheme.headlineMedium,
          ),
          const SizedBox(height: 4),
          Text(
            _isIndonesian
                ? 'Pengingat sekali jalan dan berulang agar harimu tetap rapi.'
                : 'One-time and recurring reminders keep your day on track.',
            style: theme.textTheme.bodyMedium,
          ),
          if (state.remindersError != null) ...[
            const SizedBox(height: 12),
            Text(
              _isIndonesian
                  ? 'Pengingat belum dapat dimuat.'
                  : state.remindersError!,
              style: TextStyle(color: theme.colorScheme.error),
            ),
          ],
          const SizedBox(height: 18),
          NaraSectionHeader(
            title: _isIndonesian ? 'Akan datang' : 'Upcoming',
            subtitle: _isIndonesian ? 'Pengingat terdekat' : 'Reminders due soon',
            actionLabel: _isIndonesian ? 'Tambah' : 'Add',
            onActionTap: () => _showCreateReminderSheet(context),
          ),
          if (state.remindersLoading && state.reminders.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 28),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (state.upcomingReminders.isEmpty)
            NaraEmptyState(
              icon: Icons.notifications_outlined,
              title: _isIndonesian
                  ? 'Belum ada pengingat'
                  : 'No upcoming reminders',
              body: _isIndonesian
                  ? 'Tambahkan pengingat untuk follow-up, deadline, atau check-in harian.'
                  : 'Add a reminder for a follow-up, deadline, or daily check-in.',
              actionLabel: _isIndonesian ? 'Pengingat Baru' : 'New Reminder',
              onActionTap: () => _showCreateReminderSheet(context),
            )
          else
            _ReminderGroup(
              reminders: state.upcomingReminders,
              isIndonesian: _isIndonesian,
              onSetEnabled: onSetEnabled,
              onDelete: onDelete,
            ),
          const SizedBox(height: 18),
          NaraSectionHeader(
            title: _isIndonesian ? 'Berulang' : 'Recurring',
            subtitle: _isIndonesian
                ? 'Harian, mingguan, atau bulanan'
                : 'Daily, weekly, or monthly',
          ),
          if (state.recurringReminders.isEmpty)
            NaraEmptyState(
              icon: Icons.repeat_outlined,
              title: _isIndonesian
                  ? 'Belum ada pengingat berulang'
                  : 'No recurring reminders',
              body: _isIndonesian
                  ? 'Jadwalkan ringkasan harian, review mingguan, atau laporan bulanan.'
                  : 'Schedule daily summaries, weekly reviews, or monthly reports.',
            )
          else
            _ReminderGroup(
              reminders: state.recurringReminders,
              isIndonesian: _isIndonesian,
              onSetEnabled: onSetEnabled,
              onDelete: onDelete,
            ),
          const SizedBox(height: 18),
          NaraSectionHeader(
            title: _isIndonesian ? 'Dijeda' : 'Paused',
            subtitle: _isIndonesian
                ? 'Sementara tidak aktif'
                : 'Temporarily inactive',
          ),
          if (state.pausedReminders.isEmpty)
            NaraEmptyState(
              icon: Icons.pause_circle_outline,
              title: _isIndonesian ? 'Tidak ada yang dijeda' : 'Nothing paused',
              body: _isIndonesian
                  ? 'Pengingat yang dijeda akan muncul di sini.'
                  : 'Paused reminders will appear here.',
            )
          else
            _ReminderGroup(
              reminders: state.pausedReminders,
              isIndonesian: _isIndonesian,
              onSetEnabled: onSetEnabled,
              onDelete: onDelete,
            ),
        ],
      ),
    );
  }

  Future<void> _showCreateReminderSheet(BuildContext context) async {
    final draft = await showModalBottomSheet<NaraReminderDraft>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _CreateReminderSheet(isIndonesian: _isIndonesian),
    );
    if (draft == null) return;

    try {
      await onCreate(draft);
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(_isIndonesian
            ? 'Pengingat gagal dibuat.'
            : 'Could not create reminder.'),
      ));
    }
  }
}

class _ReminderGroup extends StatelessWidget {
  const _ReminderGroup({
    required this.reminders,
    required this.isIndonesian,
    required this.onSetEnabled,
    required this.onDelete,
  });

  final List<NaraReminder> reminders;
  final bool isIndonesian;
  final Future<void> Function(NaraReminder reminder, bool enabled)
      onSetEnabled;
  final Future<void> Function(String id) onDelete;

  @override
  Widget build(BuildContext context) {
    return NaraCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          for (var index = 0; index < reminders.length; index++) ...[
            _ReminderTile(
              reminder: reminders[index],
              isIndonesian: isIndonesian,
              onSetEnabled: onSetEnabled,
              onDelete: onDelete,
            ),
            if (index < reminders.length - 1) const Divider(height: 1),
          ],
        ],
      ),
    );
  }
}

class _ReminderTile extends StatelessWidget {
  const _ReminderTile({
    required this.reminder,
    required this.isIndonesian,
    required this.onSetEnabled,
    required this.onDelete,
  });

  final NaraReminder reminder;
  final bool isIndonesian;
  final Future<void> Function(NaraReminder reminder, bool enabled)
      onSetEnabled;
  final Future<void> Function(String id) onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      leading: Icon(reminder.kind == 'recurring'
          ? Icons.repeat_rounded
          : Icons.notifications_outlined),
      title: Text(reminder.name, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(_reminderStatusLabel(reminder, isIndonesian)),
      trailing: PopupMenuButton<String>(
        onSelected: (value) {
          if (value == 'toggle') onSetEnabled(reminder, !reminder.enabled);
          if (value == 'delete') onDelete(reminder.id);
        },
        itemBuilder: (_) => [
          PopupMenuItem(
            value: 'toggle',
            child: Text(reminder.enabled
                ? (isIndonesian ? 'Jeda' : 'Pause')
                : (isIndonesian ? 'Lanjutkan' : 'Resume')),
          ),
          PopupMenuItem(
            value: 'delete',
            child: Text(
              isIndonesian ? 'Hapus' : 'Delete',
              style: TextStyle(color: theme.colorScheme.error),
            ),
          ),
        ],
      ),
    );
  }
}

class _CreateReminderSheet extends StatefulWidget {
  const _CreateReminderSheet({required this.isIndonesian});

  final bool isIndonesian;

  @override
  State<_CreateReminderSheet> createState() => _CreateReminderSheetState();
}

class _CreateReminderSheetState extends State<_CreateReminderSheet> {
  final nameController = TextEditingController();
  final descriptionController = TextEditingController();
  String kind = 'once';
  String repeat = 'daily';
  DateTime scheduledAt = DateTime.now().add(const Duration(hours: 1));

  @override
  void dispose() {
    nameController.dispose();
    descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(widget.isIndonesian ? 'Pengingat baru' : 'New reminder',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            SegmentedButton<String>(
              segments: [
                ButtonSegment(value: 'once', label: Text(widget.isIndonesian ? 'Sekali' : 'Once')),
                ButtonSegment(value: 'recurring', label: Text(widget.isIndonesian ? 'Berulang' : 'Recurring')),
              ],
              selected: {kind},
              onSelectionChanged: (value) => setState(() => kind = value.first),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: nameController,
              autofocus: true,
              decoration: InputDecoration(labelText: widget.isIndonesian ? 'Judul' : 'Title'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descriptionController,
              decoration: InputDecoration(labelText: widget.isIndonesian ? 'Catatan (opsional)' : 'Note (optional)'),
            ),
            const SizedBox(height: 12),
            if (kind == 'once')
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.schedule_outlined),
                title: Text(_formatDateTime(scheduledAt)),
                subtitle: Text(widget.isIndonesian ? 'Waktu pengingat' : 'Reminder time'),
                onTap: _pickDateTime,
              )
            else
              DropdownButtonFormField<String>(
                initialValue: repeat,
                decoration: InputDecoration(labelText: widget.isIndonesian ? 'Ulangi' : 'Repeat'),
                items: [
                  DropdownMenuItem(value: 'daily', child: Text(widget.isIndonesian ? 'Setiap hari, 09.00' : 'Every day, 9:00 AM')),
                  DropdownMenuItem(value: 'weekly', child: Text(widget.isIndonesian ? 'Setiap Senin, 09.00' : 'Every Monday, 9:00 AM')),
                  DropdownMenuItem(value: 'monthly', child: Text(widget.isIndonesian ? 'Tanggal 1, 09.00' : 'Monthly on day 1, 9:00 AM')),
                ],
                onChanged: (value) => setState(() => repeat = value ?? 'daily'),
              ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _submit,
              child: Text(widget.isIndonesian ? 'Buat Pengingat' : 'Create Reminder'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: scheduledAt,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(scheduledAt),
    );
    if (time == null) return;
    setState(() {
      scheduledAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  void _submit() {
    final name = nameController.text.trim();
    if (name.isEmpty) return;
    Navigator.of(context).pop(NaraReminderDraft(
      name: name,
      description: descriptionController.text.trim(),
      kind: kind,
      scheduledAt: kind == 'once' ? scheduledAt : null,
      cronExpr: kind == 'recurring' ? _cronFor(repeat) : null,
    ));
  }
}

String _cronFor(String repeat) => switch (repeat) {
      'weekly' => '0 9 * * 1',
      'monthly' => '0 9 1 * *',
      _ => '0 9 * * *',
    };

String _scheduleLabel(NaraReminder reminder, bool isIndonesian) {
  if (!reminder.enabled) return isIndonesian ? 'Dijeda' : 'Paused';
  if (reminder.kind == 'once' && reminder.scheduledAt != null) {
    return _formatDateTime(reminder.scheduledAt!.toLocal());
  }
  return switch (reminder.cronExpr) {
    '0 9 * * 1' => isIndonesian ? 'Setiap Senin, 09.00' : 'Every Monday, 9:00 AM',
    '0 9 1 * *' => isIndonesian ? 'Tanggal 1, 09.00' : 'Monthly on day 1, 9:00 AM',
    '0 9 * * *' => isIndonesian ? 'Setiap hari, 09.00' : 'Every day, 9:00 AM',
    _ => reminder.cronExpr ?? (isIndonesian ? 'Berulang' : 'Recurring'),
  };
}

String _reminderStatusLabel(NaraReminder reminder, bool isIndonesian) {
  final parts = <String>[_scheduleLabel(reminder, isIndonesian)];
  final nextRunAt = reminder.nextRunAt?.toLocal();
  final lastTriggeredAt = reminder.lastTriggeredAt?.toLocal();

  if (reminder.enabled && nextRunAt != null) {
    parts.add(isIndonesian
        ? 'Berikutnya ${_formatDateTime(nextRunAt)}'
        : 'Next ${_formatDateTime(nextRunAt)}');
  }

  if (lastTriggeredAt != null) {
    parts.add(isIndonesian
        ? 'Terakhir tercatat ${_formatDateTime(lastTriggeredAt)}'
        : 'Last recorded ${_formatDateTime(lastTriggeredAt)}');
  }

  return parts.join(' - ');
}

String _formatDateTime(DateTime value) {
  String two(int number) => number.toString().padLeft(2, '0');
  return '${two(value.day)}/${two(value.month)}/${value.year} ${two(value.hour)}:${two(value.minute)}';
}
