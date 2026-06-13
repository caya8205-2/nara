import 'package:flutter/material.dart';

// ── Nara Design Tokens ──────────────────────────────────────────────────────
// Warm off-white base, teal primary accents, calm operational SaaS feel.
// Inspired by: Soft UI Evolution + Minimal Swiss + Micro-interactions
// References: Things 3 (task clarity), Linear (modern polish), Notion (warmth)

/// Semantic color values — used as raw Color constants across all screens.
/// Prefer Theme.of(context).colorScheme in build methods; use these only for
/// static or const contexts (badges, status dots, inline styling).
class NaraColors {
  NaraColors._();

  // ── Primary ──
  static const Color primary = Color(0xFF0D9488); // teal-600
  static const Color primaryLight = Color(0xFFCCFBF1); // teal-100
  static const Color primaryMuted = Color(0xFFF0FDFA); // teal-50

  // ── Semantic accents ──
  static const Color agent =
      Color(0xFF059669); // emerald-600 (healthy/Nara Bot)
  static const Color agentLight = Color(0xFFD1FAE5); // emerald-100
  static const Color agentMuted = Color(0xFFECFDF5); // emerald-50

  static const Color warning = Color(0xFFD97706); // amber-600
  static const Color warningLight = Color(0xFFFEF3C7); // amber-100
  static const Color warningMuted = Color(0xFFFFFBEB); // amber-50

  static const Color danger = Color(0xFFE11D48); // rose-600
  static const Color dangerLight = Color(0xFFFEE2E2); // rose-100

  // ── Surfaces ──
  static const Color background = Color(0xFFFAFAF9); // stone-50
  static const Color surface = Color(0xFFFFFFFF); // white
  static const Color surfaceRaised = Color(0xFFF8FAFC); // slate-50

  // ── Borders ──
  static const Color border = Color(0xFFE2E8F0); // slate-200
  static const Color borderStrong = Color(0xFFCBD5E1); // slate-300

  // ── Text ──
  static const Color textPrimary = Color(0xFF0F172A); // slate-900
  static const Color textSecondary = Color(0xFF475569); // slate-600
  static const Color textMuted = Color(0xFF94A3B8); // slate-400
  static const Color textOnPrimary = Color(0xFFFFFFFF); // white

  // ── Priority indicators ──
  static const Color priorityUrgent = Color(0xFFE11D48); // rose-600
  static const Color priorityHigh = Color(0xFFD97706); // amber-600
  static const Color priorityNormal = Color(0xFF0D9488); // teal-600
  static const Color priorityLow = Color(0xFF94A3B8); // slate-400
}

extension NaraThemeTokens on BuildContext {
  ThemeData get naraTheme => Theme.of(this);
  ColorScheme get naraScheme => naraTheme.colorScheme;
  bool get isNaraDark => naraTheme.brightness == Brightness.dark;

  Color get naraSurface => naraTheme.cardTheme.color ?? naraScheme.surface;
  Color get naraSurfaceRaised => isNaraDark
      ? naraScheme.surfaceContainerHighest
      : NaraColors.surfaceRaised;
  Color get naraBorder =>
      naraTheme.dividerTheme.color ?? naraScheme.outlineVariant;
  Color get naraTextPrimary =>
      naraTheme.textTheme.titleMedium?.color ?? naraScheme.onSurface;
  Color get naraTextSecondary =>
      naraTheme.textTheme.bodyMedium?.color ??
      naraScheme.onSurface.withValues(alpha: 0.72);
  Color get naraTextMuted =>
      naraTheme.textTheme.bodySmall?.color ??
      naraScheme.onSurface.withValues(alpha: 0.56);
  Color get naraTint =>
      naraScheme.primary.withValues(alpha: isNaraDark ? 0.14 : 0.1);
  Color get naraSelectedTint =>
      naraScheme.primary.withValues(alpha: isNaraDark ? 0.2 : 0.12);
}

/// Builds the Nara Material 3 theme.
///
/// Light mode only for now — dark mode scaffolding is included via
/// [buildNaraDarkTheme] for future implementation.
ThemeData buildNaraTheme() {
  const Color primary = NaraColors.primary;

  final ColorScheme colorScheme = ColorScheme.fromSeed(
    seedColor: primary,
    brightness: Brightness.light,
    // Override defaults from seed to match our warm palette.
    surface: NaraColors.surface,
    onSurface: NaraColors.textPrimary,
    outline: NaraColors.border,
    outlineVariant: NaraColors.border,
    error: NaraColors.danger,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: NaraColors.background,

    // ── Typography ──
    // Compact, readable, Swiss-inspired. Uses Material 3 default family
    // (system default on each platform) with tightened sizing for mobile.
    textTheme: const TextTheme(
      // Screen titles: 24px mobile, 28px for larger screens
      headlineMedium: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.3,
        height: 1.2,
        color: NaraColors.textPrimary,
      ),
      // Section headers inside cards: 16px
      titleLarge: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
        height: 1.3,
        color: NaraColors.textPrimary,
      ),
      // Card titles / list primary text: 14px
      titleMedium: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.1,
        height: 1.35,
      ),
      // Supporting body: 13px
      bodyMedium: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        height: 1.5,
      ),
      // Metadata, captions, secondary labels: 12px
      bodySmall: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        height: 1.4,
      ),
      // Metric values: 28px
      displaySmall: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
        height: 1.1,
      ),
    ),

    // ── App Bar ──
    // Transparent background so scaffold color shows through.
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: NaraColors.textPrimary,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: NaraColors.textPrimary,
        letterSpacing: -0.2,
      ),
    ),

    // ── Cards ──
    // White surface, subtle border, soft 12px radius. No elevation.
    cardTheme: CardThemeData(
      color: NaraColors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: NaraColors.border, width: 1),
      ),
    ),

    // ── Filled Buttons ──
    // Primary CTAs — 44px height for touch targets.
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, 44),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.1,
        ),
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      ),
    ),

    // ── Outlined Buttons ──
    // Secondary actions — same dimensions as filled.
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 44),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        side: const BorderSide(color: NaraColors.border),
        textStyle: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.1,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      ),
    ),

    // ── Text Buttons ──
    // For inline actions like "All tasks" or "Edit".
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        textStyle: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.1,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
    ),

    // ── Input Fields ──
    // Clean bordered inputs with teal focus ring.
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: NaraColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: NaraColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: NaraColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: NaraColors.danger),
      ),
      labelStyle: const TextStyle(
        fontSize: 13,
        color: NaraColors.textSecondary,
      ),
      hintStyle: const TextStyle(
        fontSize: 13,
        color: NaraColors.textMuted,
      ),
    ),

    // ── Bottom Navigation ──
    // Clean bar with active teal indicator.
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: NaraColors.surface,
      indicatorColor: NaraColors.primaryMuted,
      elevation: 0,
      height: 64,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const IconThemeData(color: NaraColors.primary, size: 24);
        }
        return const IconThemeData(
          color: NaraColors.textMuted,
          size: 24,
        );
      }),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: NaraColors.primary,
            height: 1.2,
          );
        }
        return const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: NaraColors.textMuted,
          height: 1.2,
        );
      }),
    ),

    // ── Bottom Sheets ──
    bottomSheetTheme: const BottomSheetThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      backgroundColor: NaraColors.surface,
    ),

    // ── Snackbar ──
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      contentTextStyle: const TextStyle(
        fontSize: 13,
        color: NaraColors.textOnPrimary,
      ),
    ),

    // ── Dividers ──
    dividerTheme: const DividerThemeData(
      color: NaraColors.border,
      thickness: 1,
      space: 1,
    ),

    // ── Checkboxes / Switches ──
    // Uses Material 3 defaults, tinted by colorScheme.

    // ── Floating Action Button ──
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: primary,
      foregroundColor: NaraColors.textOnPrimary,
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      extendedTextStyle: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
      ),
    ),

    // ── Icon theme default ──
    iconTheme: const IconThemeData(
      color: NaraColors.textSecondary,
      size: 22,
    ),

    // ── Chip theme ──
    chipTheme: ChipThemeData(
      backgroundColor: NaraColors.surfaceRaised,
      selectedColor: NaraColors.primaryMuted,
      labelStyle: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: NaraColors.textPrimary,
      ),
      secondaryLabelStyle: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: NaraColors.primary,
      ),
      side: const BorderSide(color: NaraColors.border),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    ),
  );
}

/// Dark mode scaffolding — returns a matching dark theme.
/// Not wired yet; ready when dark mode feature is requested.
ThemeData buildNaraDarkTheme() {
  const darkBackground = Color(0xFF111C1B);
  const darkSurface = Color(0xFF182725);
  const darkSurfaceRaised = Color(0xFF203431);
  const darkBorder = Color(0xFF34504C);
  const darkTextPrimary = Color(0xFFF1F7F5);
  const darkTextSecondary = Color(0xFFC5D6D2);
  const darkTextMuted = Color(0xFF91AAA5);
  const darkPrimary = Color(0xFF5EEAD4);

  final ColorScheme colorScheme = ColorScheme.fromSeed(
    seedColor: darkPrimary,
    brightness: Brightness.dark,
    surface: darkSurface,
    onSurface: darkTextPrimary,
    outline: darkBorder,
    outlineVariant: darkBorder,
    primary: darkPrimary,
    error: const Color(0xFFFB7185),
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: darkBackground,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: darkTextPrimary,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: darkTextPrimary,
        letterSpacing: -0.2,
      ),
    ),
    cardTheme: CardThemeData(
      color: darkSurface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: darkBorder, width: 1),
      ),
    ),
    textTheme: const TextTheme(
      headlineMedium: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.3,
        height: 1.2,
        color: darkTextPrimary,
      ),
      titleLarge: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
        height: 1.3,
        color: darkTextPrimary,
      ),
      titleMedium: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.1,
        height: 1.35,
        color: darkTextPrimary,
      ),
      bodyMedium: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        height: 1.5,
        color: darkTextSecondary,
      ),
      bodySmall: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        height: 1.4,
        color: darkTextMuted,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: darkPrimary,
        foregroundColor: const Color(0xFF063F3A),
        minimumSize: const Size(0, 44),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: darkPrimary,
        minimumSize: const Size(0, 44),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        side: const BorderSide(color: darkBorder),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: darkSurfaceRaised,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: darkBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: darkBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: darkPrimary, width: 1.5),
      ),
      labelStyle: const TextStyle(fontSize: 13, color: darkTextSecondary),
      hintStyle: const TextStyle(fontSize: 13, color: darkTextMuted),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: darkSurface,
      indicatorColor: const Color(0xFF254C47),
      elevation: 0,
      height: 64,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const IconThemeData(color: darkPrimary, size: 24);
        }
        return const IconThemeData(color: darkTextMuted, size: 24);
      }),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: darkPrimary,
            height: 1.2,
          );
        }
        return const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: darkTextMuted,
          height: 1.2,
        );
      }),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: darkSurface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: darkBorder,
      thickness: 1,
      space: 1,
    ),
    iconTheme: const IconThemeData(color: darkTextSecondary, size: 22),
    chipTheme: ChipThemeData(
      backgroundColor: darkSurfaceRaised,
      selectedColor: const Color(0xFF254C47),
      labelStyle: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: darkTextPrimary,
      ),
      secondaryLabelStyle: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: darkPrimary,
      ),
      side: const BorderSide(color: darkBorder),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: darkPrimary,
      foregroundColor: const Color(0xFF063F3A),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
  );
}
