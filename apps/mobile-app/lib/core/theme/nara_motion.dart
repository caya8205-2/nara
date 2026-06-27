import 'package:flutter/material.dart';

/// Shared motion tokens for consistent animations across Nara mobile.
class NaraMotion {
  NaraMotion._();

  static const Duration fast = Duration(milliseconds: 180);
  static const Duration normal = Duration(milliseconds: 260);
  static const Duration slow = Duration(milliseconds: 420);
  static const Duration page = Duration(milliseconds: 320);

  static const Curve easeOut = Curves.easeOutCubic;
  static const Curve easeIn = Curves.easeInCubic;
  static const Curve spring = Curves.easeOutBack;

  static const double listStaggerStep = 0.04;
}
