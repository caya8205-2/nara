import 'package:flutter/material.dart';
import 'nara_fonts.dart';

// Warm Editorial Office — parchment base, pine accent, editorial typography.

class NaraColors {
  NaraColors._();

  static const Color primary = Color(0xFF2D4A46);
  static const Color primaryLight = Color(0xFFD8E4E1);
  static const Color primaryMuted = Color(0xFFE8EFED);

  static const Color agent = Color(0xFF4A7C59);
  static const Color agentLight = Color(0xFFDCE8DF);
  static const Color agentMuted = Color(0xFFEDF4EF);

  static const Color warning = Color(0xFFB45309);
  static const Color warningLight = Color(0xFFF5E6CC);
  static const Color warningMuted = Color(0xFFFBF4E8);

  static const Color danger = Color(0xFF9F1239);
  static const Color dangerLight = Color(0xFFFCE7EC);

  static const Color background = Color(0xFFF6F1E8);
  static const Color surface = Color(0xFFFFFCF7);
  static const Color surfaceRaised = Color(0xFFF0EBE2);

  static const Color border = Color(0xFFD9D0C4);
  static const Color borderStrong = Color(0xFFC4B8A8);

  static const Color textPrimary = Color(0xFF1F1A17);
  static const Color textSecondary = Color(0xFF5C534A);
  static const Color textMuted = Color(0xFF8A8178);
  static const Color textOnPrimary = Color(0xFFFFFCF7);

  static const Color priorityUrgent = Color(0xFF9F1239);
  static const Color priorityHigh = Color(0xFFB45309);
  static const Color priorityNormal = Color(0xFF2D4A46);
  static const Color priorityLow = Color(0xFF8A8178);

  static const double radiusSm = 6;
  static const double radiusMd = 8;
  static const double radiusLg = 12;
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
      naraScheme.primary.withValues(alpha: isNaraDark ? 0.14 : 0.08);
  Color get naraSelectedTint =>
      naraScheme.primary.withValues(alpha: isNaraDark ? 0.2 : 0.12);
}

TextTheme _buildNaraTextTheme({
  required Color textPrimary,
  required Color textSecondary,
  required Color textMuted,
}) {
  final TextStyle bodyBase = GoogleFonts.plusJakartaSans(
    color: textSecondary,
    height: 1.5,
  );

  return TextTheme(
    headlineMedium: GoogleFonts.fraunces(
      fontSize: 26,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.4,
      height: 1.15,
      color: textPrimary,
    ),
    titleLarge: GoogleFonts.fraunces(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.2,
      height: 1.25,
      color: textPrimary,
    ),
    titleMedium: GoogleFonts.plusJakartaSans(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.05,
      height: 1.35,
      color: textPrimary,
    ),
    bodyMedium: bodyBase.copyWith(fontSize: 13),
    bodySmall: GoogleFonts.plusJakartaSans(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      height: 1.4,
      color: textMuted,
    ),
    displaySmall: GoogleFonts.fraunces(
      fontSize: 28,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.5,
      height: 1.1,
      color: textPrimary,
    ),
    labelLarge: GoogleFonts.plusJakartaSans(
      fontSize: 13,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.2,
      color: textSecondary,
    ),
  );
}

ThemeData _buildSharedTheme({
  required Brightness brightness,
  required ColorScheme colorScheme,
  required Color scaffoldBackground,
  required TextTheme textTheme,
  required Color border,
  required Color surfaceRaised,
}) {
  final Color primary = colorScheme.primary;

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: scaffoldBackground,
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: textTheme.titleMedium?.color,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.plusJakartaSans(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        color: textTheme.titleMedium?.color,
        letterSpacing: -0.1,
      ),
    ),
    cardTheme: CardThemeData(
      color: colorScheme.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(NaraColors.radiusMd),
        side: BorderSide(color: border, width: 1),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: brightness == Brightness.light
            ? NaraColors.textOnPrimary
            : const Color(0xFF141A18),
        minimumSize: const Size(0, 44),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NaraColors.radiusMd),
        ),
        textStyle: GoogleFonts.plusJakartaSans(
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primary,
        minimumSize: const Size(0, 44),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NaraColors.radiusMd),
        ),
        side: BorderSide(color: border),
        textStyle: GoogleFonts.plusJakartaSans(
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primary,
        textStyle: GoogleFonts.plusJakartaSans(
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: brightness == Brightness.light
          ? NaraColors.surface
          : surfaceRaised,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(NaraColors.radiusSm),
        borderSide: BorderSide(color: border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(NaraColors.radiusSm),
        borderSide: BorderSide(color: border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(NaraColors.radiusSm),
        borderSide: BorderSide(color: primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(NaraColors.radiusSm),
        borderSide: BorderSide(color: colorScheme.error),
      ),
      labelStyle: GoogleFonts.plusJakartaSans(
        fontSize: 13,
        color: textTheme.bodyMedium?.color,
      ),
      hintStyle: GoogleFonts.plusJakartaSans(
        fontSize: 13,
        color: textTheme.bodySmall?.color,
      ),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: NaraColors.textPrimary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(NaraColors.radiusSm),
      ),
      contentTextStyle: GoogleFonts.plusJakartaSans(
        fontSize: 13,
        color: NaraColors.textOnPrimary,
      ),
    ),
    dividerTheme: DividerThemeData(
      color: border,
      thickness: 1,
      space: 1,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return brightness == Brightness.light
              ? NaraColors.textOnPrimary
              : const Color(0xFF141A18);
        }
        return brightness == Brightness.light
            ? NaraColors.surface
            : surfaceRaised;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return primary;
        }
        return brightness == Brightness.light
            ? NaraColors.borderStrong
            : border;
      }),
      trackOutlineColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return Colors.transparent;
        }
        return border;
      }),
      splashRadius: 0,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: primary,
      foregroundColor: brightness == Brightness.light
          ? NaraColors.textOnPrimary
          : const Color(0xFF141A18),
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(NaraColors.radiusMd),
      ),
    ),
    iconTheme: IconThemeData(
      color: textTheme.bodyMedium?.color,
      size: 22,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: surfaceRaised,
      selectedColor: colorScheme.primaryContainer,
      labelStyle: GoogleFonts.plusJakartaSans(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: textTheme.titleMedium?.color,
      ),
      secondaryLabelStyle: GoogleFonts.plusJakartaSans(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: primary,
      ),
      side: BorderSide(color: border),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(NaraColors.radiusSm),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    ),
  );
}

ThemeData buildNaraTheme() {
  const ColorScheme colorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: NaraColors.primary,
    onPrimary: NaraColors.textOnPrimary,
    primaryContainer: NaraColors.primaryMuted,
    onPrimaryContainer: NaraColors.primary,
    secondary: NaraColors.agent,
    onSecondary: NaraColors.textOnPrimary,
    secondaryContainer: NaraColors.agentMuted,
    onSecondaryContainer: NaraColors.agent,
    surface: NaraColors.surface,
    onSurface: NaraColors.textPrimary,
    surfaceContainerHighest: NaraColors.surfaceRaised,
    outline: NaraColors.border,
    outlineVariant: NaraColors.border,
    error: NaraColors.danger,
    onError: NaraColors.textOnPrimary,
  );

  return _buildSharedTheme(
    brightness: Brightness.light,
    colorScheme: colorScheme,
    scaffoldBackground: NaraColors.background,
    border: NaraColors.border,
    surfaceRaised: NaraColors.surfaceRaised,
    textTheme: _buildNaraTextTheme(
      textPrimary: NaraColors.textPrimary,
      textSecondary: NaraColors.textSecondary,
      textMuted: NaraColors.textMuted,
    ),
  );
}

ThemeData buildNaraDarkTheme() {
  const darkBackground = Color(0xFF141A18);
  const darkSurface = Color(0xFF1C2421);
  const darkSurfaceRaised = Color(0xFF24302C);
  const darkBorder = Color(0xFF3A4A45);
  const darkTextPrimary = Color(0xFFF4EFE6);
  const darkTextSecondary = Color(0xFFC9C0B4);
  const darkTextMuted = Color(0xFF8E877E);
  const darkPrimary = Color(0xFF8FB5AE);

  const ColorScheme colorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: darkPrimary,
    onPrimary: darkBackground,
    primaryContainer: Color(0xFF2A3F3A),
    onPrimaryContainer: darkPrimary,
    secondary: Color(0xFF7FA889),
    onSecondary: darkBackground,
    secondaryContainer: Color(0xFF2A3A2E),
    onSecondaryContainer: Color(0xFF7FA889),
    surface: darkSurface,
    onSurface: darkTextPrimary,
    surfaceContainerHighest: darkSurfaceRaised,
    outline: darkBorder,
    outlineVariant: darkBorder,
    error: Color(0xFFFB7185),
    onError: darkBackground,
  );

  return _buildSharedTheme(
    brightness: Brightness.dark,
    colorScheme: colorScheme,
    scaffoldBackground: darkBackground,
    border: darkBorder,
    surfaceRaised: darkSurfaceRaised,
    textTheme: _buildNaraTextTheme(
      textPrimary: darkTextPrimary,
      textSecondary: darkTextSecondary,
      textMuted: darkTextMuted,
    ),
  );
}
