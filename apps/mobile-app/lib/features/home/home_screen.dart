import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';
import '../../core/theme/nara_theme.dart';
import '../../core/widgets/nara_card.dart';
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
      onRefresh: () async {
        if (isGuest) return;
        await widget.onRefreshConnection();
        await widget.onRefreshTasks();
        await widget.onRefreshAssistant();
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
        children: [
          // ── Guest banner ──
          if (isGuest) ...[
            _GuestBanner(onSignIn: widget.onSignIn),
            const SizedBox(height: 16),
          ],

          // ── Greeting + connection chip + settings gear ──
          _GreetingRow(
            firstName: firstName,
            state: widget.state,
            onRefreshConnection: isGuest ? null : widget.onRefreshConnection,
            onOpenSettings: widget.onOpenSettings,
          ),
          const SizedBox(height: 18),

          if (!isGuest && widget.state.pendingApprovals.isNotEmpty) ...[
            PendingApprovalsModule(
              state: widget.state,
              compact: true,
              onOpenApprovals: widget.onOpenApprovals,
              onApprove: widget.onApproveApproval,
              onReject: widget.onRejectApproval,
            ),
            const SizedBox(height: 18),
          ],

          // ── Metric cards ──
          Row(
            children: [
              Expanded(
                child: NaraMetricTile(
                  label: isId ? 'Hari ini' : 'Today',
                  value: widget.state.todayTasks.length.toString(),
                  icon: Icons.today_outlined,
                  color: NaraColors.warning,
                  bgColor: NaraColors.warningMuted,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: NaraMetricTile(
                  label: isId ? 'Terbuka' : 'Open',
                  value: widget.state.pendingTaskCount.toString(),
                  icon: Icons.inbox_outlined,
                  color: NaraColors.primary,
                  bgColor: NaraColors.primaryMuted,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: NaraMetricTile(
                  label: isId ? 'Selesai' : 'Done',
                  value: widget.state.completedTaskCount.toString(),
                  icon: Icons.check_circle_outline,
                  color: NaraColors.agent,
                  bgColor: NaraColors.agentMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // ── Today's tasks ──
          NaraSectionHeader(
            title: isId ? 'Tugas hari ini' : 'Today\'s tasks',
            subtitle: isId
                ? '${widget.state.todayTasks.length} jatuh tempo'
                : '${widget.state.todayTasks.length} task${widget.state.todayTasks.length == 1 ? '' : 's'} due',
            actionLabel: isId ? 'Semua tugas' : 'All tasks',
            onActionTap: widget.onOpenTasks,
          ),
          if (widget.state.todayTasks.isEmpty)
            NaraCard(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.celebration_outlined,
                      size: 36, color: context.naraTextMuted),
                  const SizedBox(height: 10),
                  Text(
                    isId ? 'Tidak ada tugas hari ini' : 'Nothing due today',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: context.naraTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isId
                        ? 'Harimu aman. Tambahkan tugas kalau ada yang perlu dikerjakan.'
                        : 'Your day is clear. Add a task when something comes up.',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: context.naraTextSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 14),
                  FilledButton.icon(
                    onPressed: isGuest
                        ? null
                        : () => widget.onCreateTask(
                              const NaraTaskDraft(title: ''),
                            ),
                    icon: const Icon(Icons.add, size: 18),
                    label: Text(isId ? 'Tambah Tugas' : 'Add Task'),
                  ),
                ],
              ),
            )
          else
            NaraCard(
              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: widget.state.todayTasks
                    .take(5)
                    .map((task) => GestureDetector(
                          onTap: () => widget.onOpenTaskDetail(task),
                          behavior: HitTestBehavior.opaque,
                          child: NaraTaskRow(
                            task: task,
                            onToggleComplete: isGuest
                                ? (_) async {
                                    _showGuestDialog(context);
                                  }
                                : widget.onCompleteTask,
                            compact: true,
                          ),
                        ))
                    .toList(),
              ),
            ),
          const SizedBox(height: 18),

          // ── Recent activity ──
          if (!isGuest) ...[
            NaraSectionHeader(
              title: isId ? 'Aktivitas terbaru' : 'Recent activity',
              subtitle: widget.state.activity.isEmpty
                  ? (isId
                      ? 'Aktivitas Kamu akan muncul di sini.'
                      : 'Your actions will show up here.')
                  : (isId ? 'Update terbaru' : 'Last few updates'),
            ),
            if (widget.state.activity.isEmpty)
              NaraCard(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.timeline_outlined,
                        size: 36, color: context.naraTextMuted),
                    const SizedBox(height: 10),
                    Text(
                      isId ? 'Belum ada aktivitas' : 'No recent activity',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: context.naraTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isId
                          ? 'Aktivitas Kamu akan muncul di sini.'
                          : 'Your actions will show up here.',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: context.naraTextSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              )
            else
              NaraCard(
                padding:
                    const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: widget.state.activity
                      .take(5)
                      .map((a) => _ActivityRow(activity: a))
                      .toList(),
                ),
              ),
            const SizedBox(height: 18),
          ],

          // ── Nara Bot card ──
          NaraSectionHeader(
            title: 'Nara Bot',
            subtitle: isId
                ? 'Koneksi asisten WhatsApp'
                : 'WhatsApp assistant connection',
            actionLabel: isId ? 'Atur' : 'Setup',
            onActionTap: widget.onOpenAssistant,
          ),
          NaraCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: NaraColors.agent
                            .withValues(alpha: context.isNaraDark ? 0.14 : 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.smart_toy_outlined,
                        size: 22,
                        color: NaraColors.agent,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          NaraAgentChip(state: widget.state),
                          const SizedBox(height: 6),
                          Text(
                            widget.state.whatsappContact != null
                                ? (isId
                                    ? 'Terhubung sebagai ${widget.state.whatsappContact!.value}'
                                    : 'Connected as ${widget.state.whatsappContact!.value}')
                                : (isId
                                    ? 'Hubungkan WhatsApp untuk memakai Nara Bot'
                                    : 'Connect your WhatsApp to use Nara Bot'),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: context.naraTextSecondary,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (widget.state.whatsappContact == null && !isGuest) ...[
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 40,
                          child: TextField(
                            controller: _whatsappController,
                            keyboardType: TextInputType.phone,
                            style: TextStyle(
                              fontSize: 13,
                              color: context.naraTextPrimary,
                            ),
                            decoration: InputDecoration(
                              hintText: '+62 812-3456-7890',
                              hintStyle: TextStyle(
                                fontSize: 13,
                                color: context.naraTextMuted,
                              ),
                              contentPadding:
                                  const EdgeInsets.symmetric(horizontal: 12),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide:
                                    BorderSide(color: context.naraBorder),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide:
                                    BorderSide(color: context.naraBorder),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: const BorderSide(
                                    color: NaraColors.primary, width: 1.5),
                              ),
                            ),
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
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                        ),
                        child: Text(isId ? 'Hubungkan' : 'Link'),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 18),

          // ── Quick add ──
          NaraCard.tappable(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            onTap: isGuest
                ? () => _showGuestDialog(context)
                : () => widget.onCreateTask(
                      const NaraTaskDraft(title: ''),
                    ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: NaraColors.primaryMuted,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.add,
                      size: 18, color: NaraColors.primary),
                ),
                const SizedBox(width: 12),
                Text(
                  isId ? 'Tambah tugas cepat' : 'Quick add task',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: context.naraTextSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showGuestDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign in to continue'),
        content: const Text(
          'You need an account to create or edit tasks.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              widget.onSignIn();
            },
            child: const Text('Sign In'),
          ),
        ],
      ),
    );
  }
}

// ── Guest Banner ───────────────────────────────────────────────────────

class _GuestBanner extends StatelessWidget {
  const _GuestBanner({required this.onSignIn});
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: NaraColors.warning.withValues(
          alpha: context.isNaraDark ? 0.14 : 0.08,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: NaraColors.warning.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, size: 20, color: NaraColors.warning),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'You\'re in preview mode — sign in to save your data.',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: context.naraTextPrimary,
                height: 1.4,
              ),
            ),
          ),
          const SizedBox(width: 8),
          TextButton(
            onPressed: onSignIn,
            style: TextButton.styleFrom(
              foregroundColor: NaraColors.warning,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text(
              'Sign In',
              style: TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Greeting Row ───────────────────────────────────────────────────────

class _GreetingRow extends StatelessWidget {
  const _GreetingRow({
    required this.firstName,
    required this.state,
    this.onRefreshConnection,
    required this.onOpenSettings,
  });

  final String firstName;
  final NaraMobileState state;
  final VoidCallback? onRefreshConnection;
  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context) {
    final isId = state.languagePreference == NaraLanguagePreference.indonesia;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _greeting(isId: isId),
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _dayLabel(isId: isId),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: context.naraTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: onOpenSettings,
              icon: const Icon(Icons.settings_outlined),
              tooltip: isId ? 'Pengaturan' : 'Settings',
              visualDensity: VisualDensity.compact,
              style: IconButton.styleFrom(
                backgroundColor: context.naraSurfaceRaised,
                foregroundColor: context.naraTextSecondary,
                side: BorderSide(color: context.naraBorder),
              ),
            ),
          ],
        ),
        if (!state.isGuest && onRefreshConnection != null) ...[
          const SizedBox(height: 10),
          GestureDetector(
            onTap: onRefreshConnection,
            child: NaraConnectionChip(state: state),
          ),
        ],
      ],
    );
  }

  String _greeting({required bool isId}) {
    final hour = DateTime.now().hour;
    if (state.isGuest) {
      if (isId) {
        if (hour < 11) return 'Selamat pagi';
        if (hour < 15) return 'Selamat siang';
        if (hour < 18) return 'Selamat sore';
        return 'Selamat malam';
      }
      if (hour < 11) return 'Good morning';
      if (hour < 15) return 'Good afternoon';
      if (hour < 18) return 'Good evening';
      return 'Good night';
    }
    final namePrefix = firstName.isNotEmpty ? ', $firstName' : '';
    if (isId) {
      if (hour < 11) return 'Selamat pagi$namePrefix';
      if (hour < 15) return 'Selamat siang$namePrefix';
      if (hour < 18) return 'Selamat sore$namePrefix';
      return 'Selamat malam$namePrefix';
    }
    if (hour < 11) return 'Good morning$namePrefix';
    if (hour < 15) return 'Good afternoon$namePrefix';
    if (hour < 18) return 'Good evening$namePrefix';
    return 'Good night$namePrefix';
  }

  String _dayLabel({required bool isId}) {
    final now = DateTime.now();
    const daysEn = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ];
    const daysId = [
      'Minggu',
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
      'Jumat',
      'Sabtu'
    ];
    const monthsEn = [
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
    const monthsId = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    final days = isId ? daysId : daysEn;
    final months = isId ? monthsId : monthsEn;
    return '${days[now.weekday % 7]}, ${now.day} ${months[now.month - 1]}';
  }
}

// ── Activity Row ───────────────────────────────────────────────────────

class _ActivityRow extends StatelessWidget {
  const _ActivityRow({required this.activity});
  final NaraActivity activity;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, Color color) = _activityVisual(activity.type);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: TextStyle(
                  fontSize: 13,
                  color: context.naraTextPrimary,
                  height: 1.4,
                ),
                children: [
                  TextSpan(
                    text: activity.title,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                  TextSpan(
                    text: ' • ${_timeAgo(activity.timestamp)}',
                    style: TextStyle(
                      color: context.naraTextMuted,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  (IconData, Color) _activityVisual(String type) {
    return switch (type) {
      'task_created' => (Icons.add_circle_outline, NaraColors.primary),
      'task_completed' => (Icons.check_circle_outline, NaraColors.agent),
      'reminder_triggered' => (
          Icons.notifications_active_outlined,
          NaraColors.warning
        ),
      'approval_pending' => (Icons.assignment_outlined, NaraColors.warning),
      'bot_action' => (Icons.smart_toy_outlined, NaraColors.agent),
      _ => (Icons.circle, NaraColors.textMuted),
    };
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
