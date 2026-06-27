import 'package:flutter/material.dart';
import '../theme/nara_fonts.dart';

import '../theme/nara_theme.dart';

class NaraEmptyState extends StatelessWidget {
  const NaraEmptyState({
    super.key,
    required this.title,
    this.body,
    this.actionLabel,
    this.onActionTap,
  });

  final String title;
  final String? body;
  final String? actionLabel;
  final VoidCallback? onActionTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            style: GoogleFonts.fraunces(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: context.naraTextPrimary,
              height: 1.3,
            ),
            textAlign: TextAlign.center,
          ),
          if (body != null) ...[
            const SizedBox(height: 6),
            Text(
              body!,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                color: context.naraTextSecondary,
                height: 1.45,
              ),
              textAlign: TextAlign.center,
            ),
          ],
          if (actionLabel != null && onActionTap != null) ...[
            const SizedBox(height: 12),
            TextButton(
              onPressed: onActionTap,
              child: Text(actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}
