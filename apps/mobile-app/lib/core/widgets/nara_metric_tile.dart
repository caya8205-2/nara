import 'package:flutter/material.dart';
import '../theme/nara_fonts.dart';

import '../state/nara_mobile_state.dart';
import '../theme/nara_theme.dart';

/// Horizontal today summary band — replaces the three-tile metric row.
class NaraTodayBand extends StatelessWidget {
  const NaraTodayBand({
    super.key,
    required this.todayCount,
    required this.openCount,
    this.nextReminderLabel,
    required this.isIndonesian,
  });

  final int todayCount;
  final int openCount;
  final String? nextReminderLabel;
  final bool isIndonesian;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: context.naraSurface,
        borderRadius: BorderRadius.circular(NaraColors.radiusMd),
        border: Border.all(color: context.naraBorder),
      ),
      child: Row(
        children: [
          _BandStat(
            value: todayCount.toString(),
            label: isIndonesian ? 'Hari ini' : 'Today',
            accent: NaraColors.warning,
          ),
          _BandDivider(color: context.naraBorder),
          _BandStat(
            value: openCount.toString(),
            label: isIndonesian ? 'Terbuka' : 'Open',
            accent: NaraColors.primary,
          ),
          if (nextReminderLabel != null) ...[
            _BandDivider(color: context.naraBorder),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isIndonesian ? 'Berikutnya' : 'Next',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.6,
                      color: context.naraTextMuted,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    nextReminderLabel!,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: context.naraTextPrimary,
                      height: 1.25,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _BandStat extends StatelessWidget {
  const _BandStat({
    required this.value,
    required this.label,
    required this.accent,
  });

  final String value;
  final String label;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 64,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: GoogleFonts.fraunces(
              fontSize: 24,
              fontWeight: FontWeight.w600,
              color: accent,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label.toUpperCase(),
            style: GoogleFonts.plusJakartaSans(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
              color: context.naraTextMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _BandDivider extends StatelessWidget {
  const _BandDivider({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 36,
      margin: const EdgeInsets.symmetric(horizontal: 14),
      color: color,
    );
  }
}

/// Legacy metric tile — kept for Tasks screen summary row.
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
    final bg = bgColor ?? color.withValues(alpha: context.isNaraDark ? 0.12 : 0.08);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(NaraColors.radiusSm),
        border: Border.all(color: color.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: GoogleFonts.fraunces(
              fontSize: 22,
              fontWeight: FontWeight.w600,
              color: color,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label.toUpperCase(),
            style: GoogleFonts.plusJakartaSans(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
              color: context.naraTextSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

String? formatNextReminderLabel(List<NaraReminder> reminders, bool isIndonesian) {
  final upcoming = reminders
      .where((r) => r.enabled && r.nextRunAt != null)
      .toList()
    ..sort((a, b) => a.nextRunAt!.compareTo(b.nextRunAt!));

  if (upcoming.isEmpty) {
    return isIndonesian ? 'Tidak ada' : 'None';
  }

  final next = upcoming.first;
  final at = next.nextRunAt!.toLocal();
  final diff = at.difference(DateTime.now());

  if (diff.inMinutes < 60 && diff.inMinutes >= 0) {
    return isIndonesian ? '${diff.inMinutes} mnt' : '${diff.inMinutes}m';
  }
  if (diff.inHours < 24 && diff.inHours >= 0) {
    return isIndonesian ? '${diff.inHours} jam' : '${diff.inHours}h';
  }

  return next.name;
}
