import 'package:flutter/material.dart';

import '../state/nara_mobile_state.dart';
import '../theme/nara_theme.dart';

/// Compact status indicator for connection state or dependency health.
///
/// Variants: [NaraConnectionChip] for app-level connection,
/// [NaraAgentChip] for WhatsApp/Nara Bot status.
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
    final dark = Theme.of(context).brightness == Brightness.dark;
    final effectiveBackground =
        dark ? color.withValues(alpha: 0.14) : backgroundColor;
    return Container(
      height: 28,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: effectiveBackground,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: color.withValues(alpha: dark ? 0.42 : 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: dotColor ?? color,
              shape: BoxShape.circle,
            ),
          ),
          if (icon != null) ...[
            const SizedBox(width: 4),
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 4),
          ] else
            const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
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

/// Connection status chip used in app bar / home screen.
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
          null
        ),
      NaraConnectionState.checking => (
          NaraColors.warning,
          NaraColors.warningMuted,
          isIndonesian ? 'Mengecek' : 'Checking',
          Icons.sync
        ),
      NaraConnectionState.attention => (
          NaraColors.warning,
          NaraColors.warningMuted,
          isIndonesian ? 'Perlu dicek' : 'Needs attention',
          Icons.warning_amber_rounded
        ),
      NaraConnectionState.offline => (
          NaraColors.danger,
          NaraColors.dangerLight,
          'Offline',
          Icons.cloud_off
        ),
      NaraConnectionState.unknown => (
          NaraColors.textMuted,
          NaraColors.surfaceRaised,
          isIndonesian ? 'Belum dicek' : 'Unknown',
          Icons.help_outline
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

/// WhatsApp / Nara Bot access status chip.
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
          isIndonesian ? 'Nara Bot aktif' : 'Nara Bot active'
        ),
      'blocked' => (
          NaraColors.danger,
          NaraColors.dangerLight,
          isIndonesian ? 'Bot diblokir' : 'Bot blocked'
        ),
      'sync_failed' => (
          NaraColors.warning,
          NaraColors.warningMuted,
          isIndonesian ? 'Sinkron gagal' : 'Sync failed'
        ),
      'pending_verification' => (
          NaraColors.warning,
          NaraColors.warningMuted,
          isIndonesian ? 'Verifikasi' : 'Verifying'
        ),
      'pending_allowlist' => (
          NaraColors.warning,
          NaraColors.warningMuted,
          isIndonesian ? 'Menunggu izin' : 'Awaiting approval'
        ),
      _ => (
          NaraColors.textMuted,
          NaraColors.surfaceRaised,
          isIndonesian ? 'Pending' : 'Pending'
        ),
    };

    return NaraStatusChip(
      label: label,
      color: color,
      backgroundColor: bg,
      icon: Icons.smart_toy_outlined,
    );
  }
}
