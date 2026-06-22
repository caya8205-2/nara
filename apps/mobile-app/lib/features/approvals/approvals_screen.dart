import 'package:flutter/material.dart';

import '../../core/state/nara_mobile_state.dart';
import '../../core/theme/nara_theme.dart';
import '../../core/widgets/nara_card.dart';
import '../../core/widgets/nara_empty_state.dart';

class ApprovalsScreen extends StatelessWidget {
  const ApprovalsScreen({
    required this.state,
    required this.onRefresh,
    required this.onApprove,
    required this.onReject,
    this.onBack,
    super.key,
  });

  final NaraMobileState state;
  final Future<void> Function({bool silent}) onRefresh;
  final Future<void> Function(NaraApproval approval) onApprove;
  final Future<void> Function(NaraApproval approval) onReject;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final approvals = state.approvals;

    return RefreshIndicator(
      onRefresh: () => onRefresh(silent: false),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
        children: [
          // Header
          Row(
            children: [
              if (onBack != null) ...[
                IconButton(
                  onPressed: onBack,
                  icon: const Icon(Icons.arrow_back),
                  tooltip: 'Back',
                ),
                const SizedBox(width: 4),
              ],
              Expanded(
                child: Text(
                  'Approvals',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            approvals.isEmpty
                ? 'Actions that need your review will appear here.'
                : '${approvals.length} pending action${approvals.length == 1 ? '' : 's'} need your review.',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w400,
              color: NaraColors.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 18),

          if (state.approvalsLoading)
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: LinearProgressIndicator(minHeight: 2),
            ),

          if (state.approvalsError != null) ...[
            Text(
              state.approvalsError!,
              style: const TextStyle(
                fontSize: 12,
                color: NaraColors.danger,
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Empty state
          if (approvals.isEmpty)
            const NaraCard(
              child: NaraEmptyState(
                icon: Icons.checklist_outlined,
                title: 'No pending approvals',
                body:
                    'Actions that need your review will appear here — like tasks from WhatsApp or bot suggestions.',
              ),
            ),

          // Approval list
          if (approvals.isNotEmpty)
            NaraCard(
              padding: EdgeInsets.zero,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (int i = 0; i < approvals.length; i++) ...[
                    if (i > 0)
                      const Divider(height: 1, indent: 52, endIndent: 16),
                    _ApprovalTile(
                      approval: approvals[i],
                      onTap: () => _showApprovalDetail(
                        context,
                        approvals[i],
                        onApprove,
                        onReject,
                      ),
                    ),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }

  void _showApprovalDetail(
    BuildContext context,
    NaraApproval approval,
    Future<void> Function(NaraApproval) onApprove,
    Future<void> Function(NaraApproval) onReject,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _ApprovalDetailSheet(
        approval: approval,
        onApprove: () => onApprove(approval),
        onReject: () => onReject(approval),
      ),
    );
  }
}

class _ApprovalTile extends StatelessWidget {
  const _ApprovalTile({required this.approval, required this.onTap});
  final NaraApproval approval;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, Color iconColor, Color iconBg) =
        _actionTypeVisual(approval.actionType);
    final (Color riskColor, String riskLabel) = _riskVisual(approval.riskLevel);

    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: iconBg,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 18, color: iconColor),
      ),
      title: Text(
        approval.title,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: NaraColors.textPrimary,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Row(
        children: [
          _SourceChip(source: approval.source),
          const SizedBox(width: 8),
          Text(
            _timeAgo(approval.createdAt),
            style: const TextStyle(
              fontSize: 11,
              color: NaraColors.textMuted,
            ),
          ),
        ],
      ),
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: riskColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          riskLabel,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: riskColor,
          ),
        ),
      ),
    );
  }
}

class _ApprovalDetailSheet extends StatefulWidget {
  const _ApprovalDetailSheet({
    required this.approval,
    required this.onApprove,
    required this.onReject,
  });

  final NaraApproval approval;
  final Future<void> Function() onApprove;
  final Future<void> Function() onReject;

  @override
  State<_ApprovalDetailSheet> createState() => _ApprovalDetailSheetState();
}

class _ApprovalDetailSheetState extends State<_ApprovalDetailSheet> {
  bool _processing = false;
  String? _action;

  Future<void> _handle(String action) async {
    setState(() {
      _processing = true;
      _action = action;
    });
    try {
      if (action == 'approve') {
        await widget.onApprove();
      } else {
        await widget.onReject();
      }
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _processing = false;
        _action = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not process this action. Try again.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.approval;
    final (IconData icon, Color iconColor, Color iconBg) =
        _actionTypeVisual(a.actionType);
    final (Color riskColor, String riskLabel) = _riskVisual(a.riskLevel);

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: NaraColors.borderStrong,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Action type header
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 22, color: iconColor),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      a.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: NaraColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        _SourceChip(source: a.source),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: riskColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Risk: $riskLabel',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: riskColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Timestamp
          Text(
            'Requested ${_timeAgo(a.createdAt)}',
            style: const TextStyle(
              fontSize: 12,
              color: NaraColors.textMuted,
            ),
          ),
          const SizedBox(height: 14),

          // Payload preview
          if (a.payload != null && a.payload!.isNotEmpty) ...[
            const Text(
              'Payload',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: NaraColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: NaraColors.surfaceRaised,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: NaraColors.border),
              ),
              child: Text(
                _formatJson(a.payload!),
                style: const TextStyle(
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: NaraColors.textSecondary,
                  height: 1.5,
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Action buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _processing ? null : () => _handle('reject'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(44),
                    foregroundColor: NaraColors.danger,
                    side: const BorderSide(color: NaraColors.dangerLight),
                  ),
                  child: _processing && _action == 'reject'
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: NaraColors.danger,
                          ),
                        )
                      : const Text('Reject'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: _processing ? null : () => _handle('approve'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(44),
                  ),
                  child: _processing && _action == 'approve'
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Approve'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  String _formatJson(Map<String, dynamic> json) {
    final buffer = StringBuffer();
    for (final entry in json.entries) {
      buffer.writeln('"${entry.key}": ${entry.value}');
    }
    return buffer.toString().trim();
  }
}

// ── Shared helpers ─────────────────────────────────────────────────────

(IconData, Color, Color) _actionTypeVisual(String type) {
  return switch (type) {
    'create_task' => (
        Icons.add_task_outlined,
        NaraColors.primary,
        NaraColors.primaryMuted,
      ),
    'update_task' => (
        Icons.edit_note,
        NaraColors.primary,
        NaraColors.primaryMuted,
      ),
    'delete_task' => (
        Icons.delete_outline,
        NaraColors.danger,
        NaraColors.dangerLight,
      ),
    'create_reminder' => (
        Icons.notifications_outlined,
        NaraColors.agent,
        NaraColors.agentMuted,
      ),
    'send_message' => (
        Icons.message_outlined,
        NaraColors.agent,
        NaraColors.agentMuted,
      ),
    'config_change' => (
        Icons.settings_outlined,
        NaraColors.warning,
        NaraColors.warningMuted,
      ),
    _ => (
        Icons.help_outline,
        NaraColors.textMuted,
        NaraColors.surfaceRaised,
      ),
  };
}

(Color, String) _riskVisual(String risk) {
  return switch (risk) {
    'high' => (NaraColors.danger, 'High'),
    'medium' => (NaraColors.warning, 'Med'),
    _ => (NaraColors.agent, 'Low'),
  };
}

String _timeAgo(DateTime dt) {
  final diff = DateTime.now().difference(dt);
  if (diff.inMinutes < 1) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return '${dt.day}/${dt.month}/${dt.year}';
}

class _SourceChip extends StatelessWidget {
  const _SourceChip({required this.source});
  final String source;

  @override
  Widget build(BuildContext context) {
    final (String label, Color color) = switch (source) {
      'whatsapp' => ('WhatsApp', NaraColors.agent),
      'nara_bot' => ('Nara Bot', NaraColors.agent),
      'schedule' => ('Schedule', NaraColors.warning),
      _ => ('Nara', NaraColors.primary),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
