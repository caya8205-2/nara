import 'package:flutter/material.dart';
import '../theme/nara_fonts.dart';

import '../theme/nara_theme.dart';

class NaraLogoMark extends StatelessWidget {
  const NaraLogoMark({
    this.size = 96,
    this.showWordmark = true,
    this.pulse = 0,
    super.key,
  });

  final double size;
  final bool showWordmark;
  final double pulse;

  @override
  Widget build(BuildContext context) {
    final scale = 1 + (pulse * 0.035);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Transform.scale(
          scale: scale,
          child: SizedBox.square(
            dimension: size,
            child: Image.asset(
              'assets/brand/logo-mark.png',
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return _FallbackLogo(size: size);
              },
            ),
          ),
        ),
        if (showWordmark) ...[
          const SizedBox(height: 12),
          Text(
            'Nara',
            style: GoogleFonts.fraunces(
              fontSize: 28,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.3,
              color: context.naraTextPrimary,
            ),
          ),
        ],
      ],
    );
  }
}

class _FallbackLogo extends StatelessWidget {
  const _FallbackLogo({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: NaraColors.primaryMuted,
        borderRadius: BorderRadius.circular(size * 0.22),
        border: Border.all(color: NaraColors.border),
      ),
      child: Center(
        child: Text(
          'N',
          style: GoogleFonts.fraunces(
            color: NaraColors.primary,
            fontSize: size * 0.38,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class NaraAvatarButton extends StatelessWidget {
  const NaraAvatarButton({
    super.key,
    required this.displayName,
    required this.onTap,
  });

  final String displayName;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final initial = displayName.isNotEmpty
        ? displayName.trim()[0].toUpperCase()
        : '?';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(NaraColors.radiusMd),
        child: Ink(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: context.naraSurfaceRaised,
            borderRadius: BorderRadius.circular(NaraColors.radiusMd),
            border: Border.all(color: context.naraBorder),
          ),
          child: Center(
            child: Text(
              initial,
              style: GoogleFonts.fraunces(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: NaraColors.primary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
