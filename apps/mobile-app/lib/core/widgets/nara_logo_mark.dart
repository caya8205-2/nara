import 'package:flutter/material.dart';

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
    final theme = Theme.of(context);
    final scale = 1 + (pulse * 0.035);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Transform.scale(
          scale: scale,
          child: SizedBox.square(
            dimension: size,
            child: Image.asset(
              'assets/brand/logo.png',
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return _FallbackLogo(size: size);
              },
            ),
          ),
        ),
        if (showWordmark) ...[
          const SizedBox(height: 14),
          Text(
            'Nara',
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w900,
              letterSpacing: 0,
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
    final theme = Theme.of(context);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(size * 0.28),
        border: Border.all(
          color: theme.colorScheme.primary.withValues(alpha: 0.18),
        ),
      ),
      child: Center(
        child: Container(
          width: size * 0.58,
          height: size * 0.58,
          decoration: BoxDecoration(
            color: theme.colorScheme.primary,
            borderRadius: BorderRadius.circular(size * 0.18),
            boxShadow: [
              BoxShadow(
                color: theme.colorScheme.primary.withValues(alpha: 0.22),
                blurRadius: 22,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Center(
            child: Text(
              'N',
              style: TextStyle(
                color: Colors.white,
                fontSize: size * 0.32,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
