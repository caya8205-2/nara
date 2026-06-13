import 'package:flutter/material.dart';

import '../theme/nara_theme.dart';

/// Compact metric display — value + label, used in stat rows.
///
/// Prefer [NaraMetricRow] in [nara_card.dart] for layout.
class NaraMetricTile extends StatelessWidget {
  const NaraMetricTile({
    super.key,
    required this.label,
    required this.value,
    required this.color,
    this.icon,
    this.bgColor,
  });

  final String label;
  final String value;
  final Color color;
  final IconData? icon;
  final Color? bgColor;

  @override
  Widget build(BuildContext context) {
    final dark = context.isNaraDark;
    final bg = bgColor ?? color.withValues(alpha: 0.08);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: dark ? color.withValues(alpha: 0.12) : bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: color.withValues(alpha: dark ? 0.24 : 0.12),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: color,
                  height: 1.15,
                  letterSpacing: -0.5,
                ),
              ),
              const Spacer(),
              if (icon != null)
                Icon(icon, size: 20, color: color.withValues(alpha: 0.6)),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: context.naraTextSecondary,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}
