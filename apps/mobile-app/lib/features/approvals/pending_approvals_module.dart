import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';
import '../../core/theme/nara_theme.dart';
import '../../core/widgets/nara_card.dart';

class PendingApprovalsModule extends StatelessWidget {
  const PendingApprovalsModule({
    required this.state,
    required this.onOpenApprovals,
    required this.onApprove,
    required this.onReject,
    this.compact = false,
    super.key,
  });

  final NaraMobileState state;
  final VoidCallback onOpenApprovals;
  final Future<void> Function(NaraApproval approval) onApprove;
  final Future<void> Function(NaraApproval approval) onReject;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final approvals = state.pendingApprovals;
    final isIndonesian =
        state.languagePreference == NaraLanguagePreference.indonesia;

    if (approvals.isEmpty && !state.approvalsLoading) {
      return const SizedBox.shrink();
    }

    return NaraCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: NaraColors.warning.withValues(
                    alpha: context.isNaraDark ? 0.16 : 0.1,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.priority_high_rounded,
                  color: NaraColors.warning,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isIndonesian
                          ? '${approvals.length} persetujuan menunggu'
                          : '${approvals.length} pending approval${approvals.length == 1 ? '' : 's'}',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: context.naraTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isIndonesian
                          ? 'Nara menunggu keputusan Kamu sebelum menjalankan tindakan.'
                          : 'Nara is waiting for your decision before taking action.',
                      style: TextStyle(
                        fontSize: 12,
                        color: context.naraTextSecondary,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: onOpenApprovals,
                child: Text(isIndonesian ? 'Buka' : 'Open'),
              ),
            ],
          ),
          if (state.approvalsLoading) ...[
            const SizedBox(height: 12),
            const LinearProgressIndicator(minHeight: 2),
          ],
          if (state.approvalsError != null) ...[
            const SizedBox(height: 10),
            Text(
              isIndonesian
                  ? 'Persetujuan belum dapat dimuat.'
                  : state.approvalsError!,
              style: const TextStyle(
                fontSize: 12,
                color: NaraColors.danger,
              ),
            ),
          ],
          if (approvals.isNotEmpty) ...[
            const SizedBox(height: 12),
            ...approvals.take(compact ? 2 : 3).map(
                  (approval) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _ApprovalActionRow(
                      approval: approval,
                      isIndonesian: isIndonesian,
                      onApprove: onApprove,
                      onReject: onReject,
                    ),
                  ),
                ),
          ],
        ],
      ),
    );
  }
}

class _ApprovalActionRow extends StatefulWidget {
  const _ApprovalActionRow({
    required this.approval,
    required this.isIndonesian,
    required this.onApprove,
    required this.onReject,
  });

  final NaraApproval approval;
  final bool isIndonesian;
  final Future<void> Function(NaraApproval approval) onApprove;
  final Future<void> Function(NaraApproval approval) onReject;

  @override
  State<_ApprovalActionRow> createState() => _ApprovalActionRowState();
}

class _ApprovalActionRowState extends State<_ApprovalActionRow> {
  String? processingAction;

  Future<void> _run(String action) async {
    setState(() => processingAction = action);
    try {
      if (action == 'approve') {
        await widget.onApprove(widget.approval);
      } else {
        await widget.onReject(widget.approval);
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.isIndonesian
                ? 'Persetujuan belum bisa diproses.'
                : 'Could not process this approval.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => processingAction = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final approval = widget.approval;
    final disabled = processingAction != null;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.naraSurfaceRaised,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.naraBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(
                _approvalIcon(approval.actionType),
                size: 18,
                color: _riskColor(approval.riskLevel),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  approval.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: context.naraTextPrimary,
                  ),
                ),
              ),
              Text(
                _timeAgo(approval.createdAt),
                style: TextStyle(
                  fontSize: 11,
                  color: context.naraTextMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: disabled ? null : () => _run('reject'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(36),
                    foregroundColor: NaraColors.danger,
                    side: const BorderSide(color: NaraColors.dangerLight),
                  ),
                  child: processingAction == 'reject'
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(widget.isIndonesian ? 'Tolak' : 'Reject'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton(
                  onPressed: disabled ? null : () => _run('approve'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(36),
                  ),
                  child: processingAction == 'approve'
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(widget.isIndonesian ? 'Setujui' : 'Approve'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

IconData _approvalIcon(String actionType) {
  return switch (actionType) {
    'create_task' => Icons.add_task_outlined,
    'update_task' => Icons.edit_note,
    'delete_task' => Icons.delete_outline,
    'create_reminder' => Icons.notifications_outlined,
    'update_reminder' => Icons.notification_important_outlined,
    'delete_reminder' => Icons.notifications_off_outlined,
    _ => Icons.assignment_turned_in_outlined,
  };
}

Color _riskColor(String riskLevel) {
  return switch (riskLevel) {
    'high' => NaraColors.danger,
    'medium' => NaraColors.warning,
    _ => NaraColors.agent,
  };
}

String _timeAgo(DateTime value) {
  final diff = DateTime.now().difference(value);
  if (diff.inMinutes < 1) return 'now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m';
  if (diff.inHours < 24) return '${diff.inHours}h';
  return '${diff.inDays}d';
}
