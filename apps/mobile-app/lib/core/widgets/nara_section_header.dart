import 'package:flutter/material.dart';
import '../theme/nara_fonts.dart';

import '../theme/nara_theme.dart';

class NaraSectionHeader extends StatelessWidget {
  const NaraSectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onActionTap,
    this.subtitle,
    this.showDivider = true,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onActionTap;
  final String? subtitle;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.fraunces(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: context.naraTextPrimary,
                      height: 1.25,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        color: context.naraTextMuted,
                        height: 1.3,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (actionLabel != null && onActionTap != null)
              TextButton(
                onPressed: onActionTap,
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(actionLabel!),
              ),
          ],
        ),
        if (showDivider) ...[
          const SizedBox(height: 10),
          Divider(height: 1, color: context.naraBorder),
          const SizedBox(height: 10),
        ] else
          const SizedBox(height: 8),
      ],
    );
  }
}
