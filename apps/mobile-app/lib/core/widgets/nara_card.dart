import 'package:flutter/material.dart';

import '../theme/nara_theme.dart';

/// Thin panel surface — list grouping without heavy card chrome.
class NaraPanel extends StatelessWidget {
  const NaraPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
    this.margin,
  });

  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets? margin;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: context.naraSurface,
        borderRadius: BorderRadius.circular(NaraColors.radiusMd),
        border: Border.all(color: context.naraBorder),
      ),
      child: child,
    );
  }
}

/// Standard Nara card — use sparingly; prefer [NaraPanel] for lists.
class NaraCard extends StatelessWidget {
  const NaraCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.margin,
    this.onTap,
    this.header,
  });

  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets? margin;
  final VoidCallback? onTap;
  final Widget? header;

  factory NaraCard.tappable({
    Key? key,
    required Widget child,
    EdgeInsets padding = const EdgeInsets.all(14),
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
    Widget card = Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: context.naraSurface,
        borderRadius: BorderRadius.circular(NaraColors.radiusMd),
        border: Border.all(color: context.naraBorder),
      ),
      child: child,
    );

    if (onTap != null) {
      card = Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(NaraColors.radiusMd),
          splashColor: context.naraTint,
          highlightColor: context.naraTint.withValues(alpha: 0.5),
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
          const SizedBox(height: 10),
          card,
        ],
      );
    }

    return card;
  }
}

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
      if (i > 0) rowChildren.add(SizedBox(width: spacing));
      rowChildren.add(Expanded(child: children[i]));
    }
    return Row(children: rowChildren);
  }
}
