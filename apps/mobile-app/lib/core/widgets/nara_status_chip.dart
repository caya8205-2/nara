import 'package:flutter/material.dart';
import '../theme/nara_fonts.dart';

import '../state/nara_mobile_state.dart';
import '../theme/nara_theme.dart';

class NaraStatusChip extends StatelessWidget {
  const NaraStatusChip({
    super.key,
    required this.label,
    required this.color,
    required this.backgroundColor,
    this.icon,
    this.dotColor,
  });

  final String label;
  final Color color;
  final Color backgroundColor;
  final IconData? icon;
  final Color? dotColor;

  @override
  Widget build(BuildContext context) {
    final effectiveBackground = context.isNaraDark
        ? color.withValues(alpha: 0.14)
        : backgroundColor;

    return Container(
      height: 26,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: effectiveBackground,
        borderRadius: BorderRadius.circular(NaraColors.radiusSm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 5,
            height: 5,
            decoration: BoxDecoration(
              color: dotColor ?? color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          if (icon != null) ...[
            Icon(icon, size: 11, color: color),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              label.toUpperCase(),
              style: GoogleFonts.plusJakartaSans(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.4,
                color: color,
                height: 1.2,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class NaraConnectionChip extends StatelessWidget {
  const NaraConnectionChip({super.key, required this.state});

  final NaraMobileState state;

  @override
  Widget build(BuildContext context) {
    final isIndonesian =
        state.languagePreference == NaraLanguagePreference.indonesia;
    final (Color color, Color bg, String label, IconData? icon) =
        switch (state.connectionState) {
      NaraConnectionState.connected => (
          NaraColors.agent,
          NaraColors.agentMuted,
          isIndonesian ? 'Terhubung' : 'Connected',
          null,
        ),
      NaraConnectionState.checking => (
          NaraColors.warning,
          NaraColors.warningMuted,
          isIndonesian ? 'Mengecek' : 'Checking',
          Icons.sync,
        ),
      NaraConnectionState.attention => (
          NaraColors.warning,
          NaraColors.warningMuted,
          isIndonesian ? 'Perlu dicek' : 'Needs attention',
          Icons.warning_amber_rounded,
        ),
      NaraConnectionState.offline => (
          NaraColors.danger,
          NaraColors.dangerLight,
          'Offline',
          Icons.cloud_off,
        ),
      NaraConnectionState.unknown => (
          NaraColors.textMuted,
          NaraColors.surfaceRaised,
          isIndonesian ? 'Belum dicek' : 'Unknown',
          Icons.help_outline,
        ),
    };

    return NaraStatusChip(
      label: label,
      color: color,
      backgroundColor: bg,
      icon: icon,
    );
  }
}

class NaraAgentChip extends StatelessWidget {
  const NaraAgentChip({super.key, required this.state});

  final NaraMobileState state;

  @override
  Widget build(BuildContext context) {
    final isIndonesian =
        state.languagePreference == NaraLanguagePreference.indonesia;
    if (state.whatsappContact == null) {
      return NaraStatusChip(
        label: isIndonesian ? 'Atur WhatsApp' : 'Set up WhatsApp',
        color: NaraColors.textMuted,
        backgroundColor: NaraColors.surfaceRaised,
        icon: Icons.add_link,
      );
    }

    final (Color color, Color bg, String label) =
        switch (state.whatsappAccess?.status) {
      'allowed' => (
          NaraColors.agent,
          NaraColors.agentMuted,
          isIndonesian ? 'Nara Bot aktif' : 'Nara Bot active',
        ),
      'blocked' => (
          NaraColors.danger,
          NaraColors.dangerLight,
          isIndonesian ? 'Bot diblokir' : 'Bot blocked',
        ),
      'sync_failed' => (
          NaraColors.warning,
          NaraColors.warningMuted,
          isIndonesian ? 'Sinkron gagal' : 'Sync failed',
        ),
      'pending_verification' => (
          NaraColors.warning,
          NaraColors.warningMuted,
          isIndonesian ? 'Verifikasi' : 'Verifying',
        ),
      'pending_allowlist' => (
          NaraColors.warning,
          NaraColors.warningMuted,
          isIndonesian ? 'Menunggu izin' : 'Awaiting approval',
        ),
      _ => (
          NaraColors.textMuted,
          NaraColors.surfaceRaised,
          isIndonesian ? 'Pending' : 'Pending',
        ),
    };

    return NaraStatusChip(
      label: label,
      color: color,
      backgroundColor: bg,
    );
  }
}

/// Full-width approval alert strip for Home.
class NaraApprovalAlertStrip extends StatelessWidget {
  const NaraApprovalAlertStrip({
    super.key,
    required this.count,
    required this.isIndonesian,
    required this.onTap,
  });

  final int count;
  final bool isIndonesian;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(NaraColors.radiusMd),
        child: Ink(
          decoration: BoxDecoration(
            color: NaraColors.warningMuted,
            borderRadius: BorderRadius.circular(NaraColors.radiusMd),
            border: Border.all(
              color: NaraColors.warning.withValues(alpha: 0.25),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Icon(Icons.gavel_outlined, size: 18, color: NaraColors.warning),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    isIndonesian
                        ? '$count persetujuan menunggu'
                        : '$count approval${count == 1 ? '' : 's'} waiting',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: context.naraTextPrimary,
                    ),
                  ),
                ),
                Icon(Icons.chevron_right, size: 18, color: NaraColors.warning),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
