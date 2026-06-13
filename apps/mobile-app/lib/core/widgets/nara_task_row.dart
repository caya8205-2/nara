import 'package:flutter/material.dart';

import '../state/nara_mobile_state.dart';
import '../theme/nara_theme.dart';

/// Consistent task row for Home and Tasks screens.
///
/// Shows: completion checkbox → title + metadata → priority dot.
class NaraTaskRow extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveTitleStyle = compact
        ? TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: theme.textTheme.titleMedium?.color,
            height: 1.35,
          )
        : TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: theme.textTheme.titleMedium?.color,
            height: 1.35,
          );

    final textDecoration = task.done ? TextDecoration.lineThrough : null;
    final textColor = task.done
        ? theme.textTheme.bodySmall?.color
        : theme.textTheme.titleMedium?.color;

    return Padding(
      padding: EdgeInsets.symmetric(vertical: compact ? 4 : 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Checkbox
          GestureDetector(
            onTap: () => onToggleComplete(task.id),
            behavior: HitTestBehavior.opaque,
            child: Container(
              width: 22,
              height: 22,
              margin: EdgeInsets.only(top: compact ? 0 : 1),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: task.done ? NaraColors.agent : Colors.transparent,
                border: Border.all(
                  color: task.done
                      ? NaraColors.agent
                      : (theme.dividerTheme.color ?? NaraColors.borderStrong),
                  width: 1.5,
                ),
              ),
              child: task.done
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
          ),
          const SizedBox(width: 12),

          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  task.title,
                  style: effectiveTitleStyle.copyWith(
                    decoration: textDecoration,
                    color: textColor,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (!compact) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (task.dueAt != null) ...[
                        Icon(
                          task.isDueToday && !task.done
                              ? Icons.schedule
                              : Icons.calendar_today_outlined,
                          size: 12,
                          color: task.isDueToday && !task.done
                              ? NaraColors.warning
                              : theme.textTheme.bodySmall?.color,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _dueLabel(task),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: task.isDueToday && !task.done
                                ? NaraColors.warning
                                : theme.textTheme.bodySmall?.color,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(width: 10),
                      ],
                      // Source badge
                      if (showSource && task.source != 'manual')
                        _SourceBadge(source: task.source),
                    ],
                  ),
                ],
              ],
            ),
          ),

          // Priority indicator
          if (!task.done)
            Container(
              width: 8,
              height: 8,
              margin: EdgeInsets.only(top: compact ? 4 : 6),
              decoration: BoxDecoration(
                color: _priorityColor(task.priority),
                shape: BoxShape.circle,
              ),
            ),
        ],
      ),
    );
  }

  String _dueLabel(NaraTask task) {
    if (task.dueAt == null) return '';
    final due = task.dueAt!.toLocal();
    final now = DateTime.now();
    final diff = due.difference(now);

    if (diff.isNegative && !task.done) {
      final days = diff.inDays.abs();
      if (days == 0) return 'Overdue';
      return '$days days overdue';
    }
    if (diff.inDays == 0) {
      return 'Today';
    }
    if (diff.inDays == 1) return 'Tomorrow';
    if (diff.inDays <= 7) return '${diff.inDays}d left';

    final months = [
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
      'Dec'
    ];
    return '${due.day} ${months[due.month - 1]}';
  }

  Color _priorityColor(String priority) {
    return switch (priority) {
      'urgent' => NaraColors.priorityUrgent,
      'high' => NaraColors.priorityHigh,
      'low' => NaraColors.priorityLow,
      _ => NaraColors.primary,
    };
  }
}

/// Tiny source badge for task origin (app, WhatsApp, schedule, agent).
class _SourceBadge extends StatelessWidget {
  const _SourceBadge({required this.source});

  final String source;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (IconData icon, String label) = switch (source) {
      'whatsapp' => (Icons.message_outlined, 'WhatsApp'),
      'schedule' => (Icons.schedule, 'Schedule'),
      'agent' => (Icons.smart_toy_outlined, 'Nara Bot'),
      _ => (Icons.edit_note, 'App'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: theme.dividerTheme.color ?? NaraColors.border,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: theme.textTheme.bodySmall?.color),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: theme.textTheme.bodySmall?.color,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}
