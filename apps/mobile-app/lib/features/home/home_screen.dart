import 'package:flutter/material.dart';
import '../../core/theme/nara_fonts.dart';

import '../../core/state/nara_mobile_state.dart';
import '../../core/theme/nara_theme.dart';
import '../../core/widgets/nara_card.dart';
import '../../core/widgets/nara_empty_state.dart';
import '../../core/widgets/nara_logo_mark.dart';
import '../../core/widgets/nara_metric_tile.dart';
import '../../core/widgets/nara_section_header.dart';
import '../../core/widgets/nara_status_chip.dart';
import '../../core/widgets/nara_task_row.dart';
import '../approvals/pending_approvals_module.dart';

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
    required this.onOpenAssistant,
    required this.onOpenApprovals,
    required this.onApproveApproval,
    required this.onRejectApproval,
    required this.onRequestWhatsAppAccess,
    required this.onOpenSettings,
    required this.onOpenTaskDetail,
    required this.onSignIn,
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
  final VoidCallback onOpenAssistant;
  final VoidCallback onOpenApprovals;
  final Future<void> Function(NaraApproval approval) onApproveApproval;
  final Future<void> Function(NaraApproval approval) onRejectApproval;
  final Future<void> Function(String number) onRequestWhatsAppAccess;
  final VoidCallback onOpenSettings;
  final Future<void> Function(NaraTask task) onOpenTaskDetail;
  final VoidCallback onSignIn;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final TextEditingController _whatsappController;

  @override
  void initState() {
    super.initState();
    _whatsappController = TextEditingController(
      text: widget.state.whatsappContact?.value ?? '',
    );
  }

  @override
  void didUpdateWidget(covariant HomeScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    final value = widget.state.whatsappContact?.value ?? '';
    if (_whatsappController.text != value && value.isNotEmpty) {
      _whatsappController.text = value;
    }
  }

  @override
  void dispose() {
    _whatsappController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final displayName = widget.user?['displayName']?.toString() ?? '';
    final firstName = displayName.split(' ').first;
    final isGuest = widget.state.isGuest;
    final isId =
        widget.state.languagePreference == NaraLanguagePreference.indonesia;

    return RefreshIndicator(
      color: NaraColors.primary,
      onRefresh: () async {
        if (isGuest) return;
        await widget.onRefreshConnection();
        await widget.onRefreshTasks();
        await widget.onRefreshAssistant();
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
        children: [
          if (isGuest) ...[
            _GuestBanner(isIndonesian: isId, onSignIn: widget.onSignIn),
            const SizedBox(height: 16),
          ],

          _EditorialHeader(
            firstName: firstName,
            state: widget.state,
            displayName: displayName,
            onRefreshConnection: isGuest ? null : widget.onRefreshConnection,
            onOpenSettings: widget.onOpenSettings,
          ),
          const SizedBox(height: 16),

          if (!isGuest && widget.state.pendingApprovals.isNotEmpty) ...[
            NaraApprovalAlertStrip(
              count: widget.state.pendingApprovals.length,
              isIndonesian: isId,
              onTap: widget.onOpenApprovals,
            ),
            const SizedBox(height: 12),
            PendingApprovalsModule(
              state: widget.state,
              compact: true,
              onOpenApprovals: widget.onOpenApprovals,
              onApprove: widget.onApproveApproval,
              onReject: widget.onRejectApproval,
            ),
            const SizedBox(height: 16),
          ],

          NaraTodayBand(
            todayCount: widget.state.todayTasks.length,
            openCount: widget.state.pendingTaskCount,
            nextReminderLabel: formatNextReminderLabel(
              widget.state.reminders,
              isId,
            ),
            isIndonesian: isId,
          ),
          const SizedBox(height: 20),

          NaraSectionHeader(
            title: isId ? 'Tugas hari ini' : 'Today\'s tasks',
            subtitle: isId
                ? '${widget.state.todayTasks.length} jatuh tempo'
                : '${widget.state.todayTasks.length} due today',
            actionLabel: isId ? 'Semua' : 'All',
            onActionTap: widget.onOpenTasks,
          ),
          if (widget.state.todayTasks.isEmpty)
            NaraPanel(
              child: NaraEmptyState(
                title: isId ? 'Hari ini kosong' : 'Clear for today',
                body: isId
                    ? 'Tambahkan tugas kalau ada yang perlu dikerjakan.'
                    : 'Add a task when something needs attention.',
                actionLabel: isId ? 'Tambah tugas' : 'Add task',
                onActionTap: isGuest
                    ? widget.onSignIn
                    : () => widget.onCreateTask(const NaraTaskDraft(title: '')),
              ),
            )
          else
            NaraPanel(
              child: Column(
                children: [
                  for (int i = 0; i < widget.state.todayTasks.take(5).length; i++) ...[
                    if (i > 0) Divider(height: 1, color: context.naraBorder),
                    GestureDetector(
                      onTap: () =>
                          widget.onOpenTaskDetail(widget.state.todayTasks[i]),
                      behavior: HitTestBehavior.opaque,
                      child: NaraTaskRow(
                        task: widget.state.todayTasks[i],
                        onToggleComplete: isGuest
                            ? (_) async => _showGuestDialog(context)
                            : widget.onCompleteTask,
                        compact: true,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          const SizedBox(height: 20),

          if (!isGuest) ...[
            NaraSectionHeader(
              title: isId ? 'Aktivitas' : 'Activity',
              subtitle: widget.state.activity.isEmpty
                  ? (isId ? 'Belum ada update' : 'No updates yet')
                  : (isId ? 'Terbaru' : 'Recent'),
            ),
            if (widget.state.activity.isEmpty)
              NaraPanel(
                child: NaraEmptyState(
                  title: isId ? 'Belum ada aktivitas' : 'No activity yet',
                  body: isId
                      ? 'Tindakan kamu akan muncul di sini.'
                      : 'Your actions will appear here.',
                ),
              )
            else
              NaraPanel(
                child: Column(
                  children: [
                    for (int i = 0;
                        i < widget.state.activity.take(5).length;
                        i++) ...[
                      if (i > 0)
                        Divider(height: 1, color: context.naraBorder),
                      _ActivityRow(
                        activity: widget.state.activity[i],
                        isIndonesian: isId,
                      ),
                    ],
                  ],
                ),
              ),
            const SizedBox(height: 20),
          ],

          NaraSectionHeader(
            title: 'Nara Bot',
            subtitle: isId ? 'Asisten WhatsApp' : 'WhatsApp assistant',
            actionLabel: isId ? 'Atur' : 'Setup',
            onActionTap: widget.onOpenAssistant,
          ),
          NaraPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: NaraColors.agentMuted,
                        borderRadius:
                            BorderRadius.circular(NaraColors.radiusSm),
                      ),
                      child: const Icon(
                        Icons.chat_outlined,
                        size: 18,
                        color: NaraColors.agent,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          NaraAgentChip(state: widget.state),
                          const SizedBox(height: 4),
                          Text(
                            widget.state.whatsappContact != null
                                ? widget.state.whatsappContact!.value
                                : (isId
                                    ? 'Hubungkan nomor WhatsApp kamu'
                                    : 'Link your WhatsApp number'),
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12,
                              color: context.naraTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (widget.state.whatsappContact == null && !isGuest) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _whatsappController,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            hintText: '+62 812-3456-7890',
                            isDense: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: () {
                          final number = _whatsappController.text.trim();
                          if (number.isNotEmpty) {
                            widget.onRequestWhatsAppAccess(number);
                          }
                        },
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 40),
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                        ),
                        child: Text(isId ? 'Hubungkan' : 'Link'),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),

          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: isGuest
                  ? () => _showGuestDialog(context)
                  : () => widget.onCreateTask(const NaraTaskDraft(title: '')),
              borderRadius: BorderRadius.circular(NaraColors.radiusMd),
              child: Ink(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(NaraColors.radiusMd),
                  border: Border.all(
                    color: context.naraBorder,
                    style: BorderStyle.solid,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(Icons.add, size: 18, color: NaraColors.primary),
                    const SizedBox(width: 10),
                    Text(
                      isId ? 'Tambah tugas' : 'Add task',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: context.naraTextPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
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
              widget.onSignIn();
            },
            child: Text(isIndonesian ? 'Masuk' : 'Sign In'),
          ),
        ],
      ),
    );
  }
}

class _GuestBanner extends StatelessWidget {
  const _GuestBanner({
    required this.isIndonesian,
    required this.onSignIn,
  });

  final bool isIndonesian;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: NaraColors.warningMuted,
        borderRadius: BorderRadius.circular(NaraColors.radiusMd),
        border: Border.all(color: NaraColors.warning.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              isIndonesian
                  ? 'Mode pratinjau — masuk untuk menyimpan data.'
                  : 'Preview mode — sign in to save your data.',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: context.naraTextPrimary,
              ),
            ),
          ),
          TextButton(onPressed: onSignIn, child: Text(isIndonesian ? 'Masuk' : 'Sign In')),
        ],
      ),
    );
  }
}

class _EditorialHeader extends StatelessWidget {
  const _EditorialHeader({
    required this.firstName,
    required this.state,
    required this.displayName,
    this.onRefreshConnection,
    required this.onOpenSettings,
  });

  final String firstName;
  final NaraMobileState state;
  final String displayName;
  final VoidCallback? onRefreshConnection;
  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context) {
    final isId = state.languagePreference == NaraLanguagePreference.indonesia;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _dayLabel(isId: isId),
                style: GoogleFonts.fraunces(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  color: context.naraTextPrimary,
                  height: 1.15,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _greeting(isId: isId),
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14,
                  color: context.naraTextSecondary,
                ),
              ),
              if (!state.isGuest && onRefreshConnection != null) ...[
                const SizedBox(height: 10),
                GestureDetector(
                  onTap: onRefreshConnection,
                  child: NaraConnectionChip(state: state),
                ),
              ],
            ],
          ),
        ),
        NaraAvatarButton(
          displayName: displayName.isNotEmpty ? displayName : (isId ? 'Tamu' : 'Guest'),
          onTap: onOpenSettings,
        ),
      ],
    );
  }

  String _greeting({required bool isId}) {
    final hour = DateTime.now().hour;
    if (state.isGuest) {
      return isId ? 'Selamat datang' : 'Welcome';
    }
    final namePrefix = firstName.isNotEmpty ? firstName : (isId ? 'kamu' : 'there');
    if (isId) {
      if (hour < 11) return 'Selamat pagi, $namePrefix';
      if (hour < 15) return 'Selamat siang, $namePrefix';
      if (hour < 18) return 'Selamat sore, $namePrefix';
      return 'Selamat malam, $namePrefix';
    }
    if (hour < 11) return 'Good morning, $namePrefix';
    if (hour < 15) return 'Good afternoon, $namePrefix';
    if (hour < 18) return 'Good evening, $namePrefix';
    return 'Good night, $namePrefix';
  }

  String _dayLabel({required bool isId}) {
    final now = DateTime.now();
    const daysEn = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday',
    ];
    const daysId = [
      'Minggu', 'Senin', 'Selasa', 'Rabu',
      'Kamis', 'Jumat', 'Sabtu',
    ];
    const monthsEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthsId = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    final days = isId ? daysId : daysEn;
    final months = isId ? monthsId : monthsEn;
    return '${days[now.weekday % 7]}, ${now.day} ${months[now.month - 1]}';
  }
}

class _ActivityRow extends StatelessWidget {
  const _ActivityRow({
    required this.activity,
    required this.isIndonesian,
  });

  final NaraActivity activity;
  final bool isIndonesian;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: _activityColor(activity.type),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              '${activity.title} · ${_timeAgo(activity.timestamp)}',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                color: context.naraTextPrimary,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _activityColor(String type) {
    return switch (type) {
      'task_created' => NaraColors.primary,
      'task_completed' => NaraColors.agent,
      'reminder_triggered' => NaraColors.warning,
      'approval_pending' => NaraColors.warning,
      'bot_action' => NaraColors.agent,
      _ => NaraColors.textMuted,
    };
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return isIndonesian ? 'baru saja' : 'just now';
    if (diff.inMinutes < 60) {
      return isIndonesian ? '${diff.inMinutes}m' : '${diff.inMinutes}m';
    }
    if (diff.inHours < 24) {
      return isIndonesian ? '${diff.inHours}j' : '${diff.inHours}h';
    }
    return isIndonesian ? '${diff.inDays}h' : '${diff.inDays}d';
  }
}
