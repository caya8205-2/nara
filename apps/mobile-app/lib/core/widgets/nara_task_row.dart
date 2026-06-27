import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/nara_fonts.dart';

import '../state/nara_mobile_state.dart';
import '../theme/nara_motion.dart';
import '../theme/nara_theme.dart';

class NaraTaskRow extends StatefulWidget {
  const NaraTaskRow({
    super.key,
    required this.task,
    required this.onToggleComplete,
    this.compact = false,
    this.showSource = false,
  });

  final NaraTask task;
  final Future<void> Function(String id) onToggleComplete;
  final bool compact;
  final bool showSource;

  @override
  State<NaraTaskRow> createState() => _NaraTaskRowState();
}

class _NaraTaskRowState extends State<NaraTaskRow> {
  bool _completing = false;

  Future<void> _toggle() async {
    if (_completing) return;
    setState(() => _completing = true);
    HapticFeedback.lightImpact();
    await widget.onToggleComplete(widget.task.id);
    if (mounted) setState(() => _completing = false);
  }

  @override
  Widget build(BuildContext context) {
    final priorityColor = _priorityColor(widget.task.priority);
    final titleStyle = GoogleFonts.plusJakartaSans(
      fontSize: widget.compact ? 13 : 14,
      fontWeight: FontWeight.w600,
      height: 1.35,
      decoration: widget.task.done ? TextDecoration.lineThrough : null,
      color: widget.task.done
          ? context.naraTextMuted
          : context.naraTextPrimary,
    );

    return Padding(
      padding: EdgeInsets.symmetric(vertical: widget.compact ? 6 : 8),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!widget.task.done)
              Container(
                width: 3,
                margin: const EdgeInsets.only(right: 10, top: 2, bottom: 2),
                decoration: BoxDecoration(
                  color: priorityColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              )
            else
              const SizedBox(width: 13),

            GestureDetector(
              onTap: _toggle,
              behavior: HitTestBehavior.opaque,
              child: AnimatedContainer(
                duration: NaraMotion.fast,
                curve: NaraMotion.easeOut,
                width: 22,
                height: 22,
                margin: const EdgeInsets.only(top: 1),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.task.done ? NaraColors.agent : Colors.transparent,
                  border: Border.all(
                    color: widget.task.done
                        ? NaraColors.agent
                        : NaraColors.borderStrong,
                    width: 1.5,
                  ),
                ),
                child: widget.task.done
                    ? const Icon(Icons.check, size: 14, color: Colors.white)
                    : null,
              ),
            ),
            const SizedBox(width: 12),

            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.task.title,
                    style: titleStyle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (!widget.compact && widget.task.dueAt != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          _dueLabel(widget.task),
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: widget.task.isDueToday && !widget.task.done
                                ? NaraColors.warning
                                : context.naraTextMuted,
                          ),
                        ),
                        if (widget.showSource && widget.task.source != 'manual') ...[
                          const SizedBox(width: 8),
                          _SourceBadge(source: widget.task.source),
                        ],
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _dueLabel(NaraTask task) {
    if (task.dueAt == null) return '';
    final due = task.dueAt!.toLocal();
    final diff = due.difference(DateTime.now());

    if (diff.isNegative && !task.done) {
      final days = diff.inDays.abs();
      if (days == 0) return 'Overdue';
      return '$days days overdue';
    }
    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Tomorrow';
    if (diff.inDays <= 7) return '${diff.inDays}d left';

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${due.day} ${months[due.month - 1]}';
  }

  Color _priorityColor(String priority) {
    return switch (priority) {
      'urgent' => NaraColors.priorityUrgent,
      'high' => NaraColors.priorityHigh,
      'low' => NaraColors.priorityLow,
      _ => NaraColors.priorityNormal,
    };
  }
}

class _SourceBadge extends StatelessWidget {
  const _SourceBadge({required this.source});

  final String source;

  @override
  Widget build(BuildContext context) {
    final label = switch (source) {
      'whatsapp' => 'WA',
      'schedule' => 'Sched',
      'agent' => 'Bot',
      _ => 'App',
    };

    return Text(
      label.toUpperCase(),
      style: GoogleFonts.plusJakartaSans(
        fontSize: 9,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.4,
        color: context.naraTextMuted,
      ),
    );
  }
}
