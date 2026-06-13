import 'package:flutter/material.dart';

import '../theme/nara_theme.dart';

/// Consistent empty state: icon, title, optional body text, and one CTA action.
class NaraEmptyState extends StatelessWidget {
  const NaraEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.body,
    this.actionLabel,
    this.onActionTap,
  });

  final IconData icon;
  final String title;
  final String? body;
  final String? actionLabel;
  final VoidCallback? onActionTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.naraSurfaceRaised,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: context.naraBorder,
          width: 1,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 8),
          Icon(
            icon,
            size: 40,
            color: context.naraTextMuted,
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: context.naraTextPrimary,
              height: 1.3,
            ),
            textAlign: TextAlign.center,
          ),
          if (body != null) ...[
            const SizedBox(height: 6),
            Text(
              body!,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: context.naraTextSecondary,
                height: 1.45,
              ),
              textAlign: TextAlign.center,
            ),
          ],
          if (actionLabel != null && onActionTap != null) ...[
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onActionTap,
              icon: const Icon(Icons.add, size: 18),
              label: Text(actionLabel!),
            ),
          ],
          if (actionLabel != null || onActionTap != null)
            const SizedBox(height: 4),
        ],
      ),
    );
  }
}
