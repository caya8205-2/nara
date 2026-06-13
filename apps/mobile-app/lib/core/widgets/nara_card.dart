import 'package:flutter/material.dart';

import '../theme/nara_theme.dart';

/// Standard Nara card: white surface, subtle border, 12px radius, no elevation.
///
/// Use [NaraCard] for grouping related content. Prefer [NaraCard.tappable]
/// when the card responds to tap.
class NaraCard extends StatelessWidget {
  const NaraCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.onTap,
    this.header,
  });

  /// The content inside the card.
  final Widget child;

  /// Internal padding. Defaults to 16px all sides.
  final EdgeInsets padding;

  /// External margin. Typically set by the parent list/column.
  final EdgeInsets? margin;

  /// Optional tap handler. When provided, the card gets a hover/ripple.
  final VoidCallback? onTap;

  /// Optional header row shown above the card content.
  final Widget? header;

  /// Named constructor for tappable cards — calls [onTap] via [InkWell].
  factory NaraCard.tappable({
    Key? key,
    required Widget child,
    EdgeInsets padding = const EdgeInsets.all(16),
    EdgeInsets? margin,
    required VoidCallback onTap,
    Widget? header,
  }) {
    return NaraCard(
      key: key,
      padding: padding,
      margin: margin,
      onTap: onTap,
      header: header,
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    final borderColor = context.naraBorder;

    Widget card = Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: context.naraSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: child,
    );

    if (onTap != null) {
      card = Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          splashColor: context.naraTint,
          highlightColor: context.naraTint.withValues(alpha: 0.6),
          child: card,
        ),
      );
    }

    if (header != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          header!,
          const SizedBox(height: 12),
          card,
        ],
      );
    }

    return card;
  }
}

/// Horizontal row of small metric tiles (today / open / done).
class NaraMetricRow extends StatelessWidget {
  const NaraMetricRow({
    super.key,
    required this.children,
    this.spacing = 10,
  });

  final List<Widget> children;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    final List<Widget> rowChildren = [];
    for (int i = 0; i < children.length; i++) {
      if (i > 0) {
        rowChildren.add(SizedBox(width: spacing));
      }
      rowChildren.add(Expanded(child: children[i]));
    }
    return Row(children: rowChildren);
  }
}
