import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';
import '../../core/widgets/nara_empty_state.dart';
import '../../core/widgets/nara_section_header.dart';

class RemindersScreen extends StatelessWidget {
  const RemindersScreen({required this.state, super.key});

  final NaraMobileState state;

  bool get _isIndonesian =>
      state.languagePreference == NaraLanguagePreference.indonesia;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
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
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w400,
            color: theme.textTheme.bodyMedium?.color,
            height: 1.45,
          ),
        ),
        const SizedBox(height: 18),
        NaraSectionHeader(
          title: _isIndonesian ? 'Akan datang' : 'Upcoming',
          subtitle: _isIndonesian ? 'Pengingat terdekat' : 'Reminders due soon',
          actionLabel: _isIndonesian ? 'Tambah' : 'Add',
          onActionTap: () => _showCreateReminderSheet(context),
        ),
        NaraEmptyState(
          icon: Icons.notifications_outlined,
          title:
              _isIndonesian ? 'Belum ada pengingat' : 'No upcoming reminders',
          body: _isIndonesian
              ? 'Tambahkan pengingat untuk follow-up, deadline, atau check-in harian.'
              : 'Add a reminder for anything you need to remember, a follow-up, a deadline, or a daily check-in.',
          actionLabel: _isIndonesian ? 'Pengingat Baru' : 'New Reminder',
          onActionTap: () => _showCreateReminderSheet(context),
        ),
        const SizedBox(height: 18),
        NaraSectionHeader(
          title: _isIndonesian ? 'Berulang' : 'Recurring',
          subtitle: _isIndonesian
              ? 'Harian, mingguan, atau jadwal khusus'
              : 'Daily, weekly, or custom repeat',
        ),
        NaraEmptyState(
          icon: Icons.repeat_outlined,
          title: _isIndonesian
              ? 'Belum ada pengingat berulang'
              : 'No recurring reminders',
          body: _isIndonesian
              ? 'Jadwalkan ringkasan harian, review mingguan, atau laporan bulanan otomatis.'
              : 'Schedule daily summaries, weekly reviews, or monthly reports to run automatically.',
        ),
        const SizedBox(height: 18),
        NaraSectionHeader(
          title: _isIndonesian ? 'Dijeda' : 'Paused',
          subtitle:
              _isIndonesian ? 'Sementara tidak aktif' : 'Temporarily inactive',
        ),
        NaraEmptyState(
          icon: Icons.pause_circle_outline,
          title: _isIndonesian ? 'Tidak ada yang dijeda' : 'Nothing paused',
          body: _isIndonesian
              ? 'Pengingat yang dijeda akan muncul di sini agar bisa dilanjutkan nanti.'
              : 'Paused reminders will appear here so you can resume them later.',
        ),
      ],
    );
  }

  void _showCreateReminderSheet(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _isIndonesian
              ? 'Pembuatan pengingat akan tersedia segera.'
              : 'Reminder creation will be available soon.',
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
