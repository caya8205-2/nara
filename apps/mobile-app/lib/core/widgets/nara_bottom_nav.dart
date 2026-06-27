import 'dart:ui';

import 'package:flutter/material.dart';
import '../theme/nara_fonts.dart';

import '../theme/nara_theme.dart';

class NaraBottomNav extends StatelessWidget {
  const NaraBottomNav({
    super.key,
    required this.selectedIndex,
    required this.onDestinationSelected,
    required this.isIndonesian,
    required this.showAsGuest,
    this.approvalBadgeCount = 0,
  });

  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final bool isIndonesian;
  final bool showAsGuest;
  final int approvalBadgeCount;

  @override
  Widget build(BuildContext context) {
    final surface = context.naraSurface;
    final border = context.naraBorder;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(NaraColors.radiusLg),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: surface.withValues(alpha: context.isNaraDark ? 0.92 : 0.94),
              borderRadius: BorderRadius.circular(NaraColors.radiusLg),
              border: Border.all(color: border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                child: Row(
                  children: [
                    _NavItem(
                      index: 0,
                      selectedIndex: selectedIndex,
                      icon: Icons.home_outlined,
                      selectedIcon: Icons.home,
                      label: isIndonesian ? 'Beranda' : 'Home',
                      onTap: onDestinationSelected,
                      badgeCount: approvalBadgeCount,
                    ),
                    _NavItem(
                      index: 1,
                      selectedIndex: selectedIndex,
                      icon: Icons.checklist_outlined,
                      selectedIcon: Icons.checklist,
                      label: isIndonesian ? 'Tugas' : 'Tasks',
                      onTap: onDestinationSelected,
                    ),
                    _CenterNavItem(
                      index: 3,
                      selectedIndex: selectedIndex,
                      label: 'Nara',
                      onTap: onDestinationSelected,
                    ),
                    _NavItem(
                      index: 2,
                      selectedIndex: selectedIndex,
                      icon: Icons.notifications_outlined,
                      selectedIcon: Icons.notifications,
                      label: isIndonesian ? 'Pengingat' : 'Reminders',
                      onTap: onDestinationSelected,
                    ),
                    if (!showAsGuest)
                      _NavItem(
                        index: 5,
                        selectedIndex: selectedIndex,
                        icon: Icons.person_outline,
                        selectedIcon: Icons.person,
                        label: isIndonesian ? 'Saya' : 'Me',
                        onTap: onDestinationSelected,
                      )
                    else
                      const Expanded(child: SizedBox()),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.index,
    required this.selectedIndex,
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.onTap,
    this.badgeCount = 0,
  });

  final int index;
  final int selectedIndex;
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final ValueChanged<int> onTap;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    final selected = selectedIndex == index;
    final color = selected ? NaraColors.primary : context.naraTextMuted;

    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => onTap(index),
          borderRadius: BorderRadius.circular(NaraColors.radiusMd),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Icon(
                      selected ? selectedIcon : icon,
                      size: 22,
                      color: color,
                    ),
                    if (badgeCount > 0)
                      Positioned(
                        right: -6,
                        top: -4,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 1,
                          ),
                          decoration: BoxDecoration(
                            color: NaraColors.warning,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            badgeCount > 9 ? '9+' : '$badgeCount',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 10,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    color: color,
                    height: 1.1,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CenterNavItem extends StatelessWidget {
  const _CenterNavItem({
    required this.index,
    required this.selectedIndex,
    required this.label,
    required this.onTap,
  });

  final int index;
  final int selectedIndex;
  final String label;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final selected = selectedIndex == index;

    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(index),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: selected ? NaraColors.primary : context.naraSurfaceRaised,
                borderRadius: BorderRadius.circular(NaraColors.radiusMd),
                border: Border.all(
                  color: selected ? NaraColors.primary : context.naraBorder,
                ),
              ),
              child: Icon(
                Icons.auto_awesome_outlined,
                size: 22,
                color: selected ? NaraColors.textOnPrimary : NaraColors.primary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 10,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                color: selected ? NaraColors.primary : context.naraTextSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
