import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../state/nara_mobile_state.dart';

class StoredNaraSession {
  const StoredNaraSession({
    required this.serverUrl,
    required this.authToken,
    required this.user,
  });

  final String serverUrl;
  final String authToken;
  final Map<String, dynamic> user;
}

class NaraSessionStore {
  static const _serverUrlKey = 'nara.serverUrl';
  static const _authTokenKey = 'nara.authToken';
  static const _userKey = 'nara.user';
  static const _assistantPreferencesKey = 'nara.assistantPreferences';
  static const _themePreferenceKey = 'nara.themePreference';
  static const _languagePreferenceKey = 'nara.languagePreference';
  static const _whatsAppPromptPrefix = 'nara.whatsAppPromptSeen.';
  final _secureTokenStore = const NaraSecureTokenStore();

  Future<StoredNaraSession?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final serverUrl = prefs.getString(_serverUrlKey);
    final authToken = await _readAuthToken(prefs);
    final userRaw = prefs.getString(_userKey);

    if (serverUrl == null || authToken == null || userRaw == null) {
      return null;
    }

    final decoded = jsonDecode(userRaw);
    if (decoded is! Map<String, dynamic>) return null;

    return StoredNaraSession(
      serverUrl: serverUrl,
      authToken: authToken,
      user: decoded,
    );
  }

  Future<void> save({
    required String serverUrl,
    required String authToken,
    required Map<String, dynamic> user,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_serverUrlKey, serverUrl);
    await _secureTokenStore.write(_authTokenKey, authToken);
    await prefs.remove(_authTokenKey);
    await prefs.setString(_userKey, jsonEncode(user));
  }

  Future<void> saveServerUrl(String serverUrl) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_serverUrlKey, serverUrl);
  }

  Future<NaraAssistantPreferences> loadAssistantPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_assistantPreferencesKey);
    if (raw == null) return const NaraAssistantPreferences();

    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) {
      return const NaraAssistantPreferences();
    }

    return NaraAssistantPreferences.fromJson(decoded);
  }

  Future<void> saveAssistantPreferences(
    NaraAssistantPreferences preferences,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _assistantPreferencesKey,
      jsonEncode(preferences.toJson()),
    );
  }

  Future<NaraThemePreference> loadThemePreference() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_themePreferenceKey);
    return NaraThemePreference.values.firstWhere(
      (value) => value.name == raw,
      orElse: () => NaraThemePreference.light,
    );
  }

  Future<void> saveThemePreference(NaraThemePreference preference) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themePreferenceKey, preference.name);
  }

  Future<NaraLanguagePreference> loadLanguagePreference() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_languagePreferenceKey);
    return NaraLanguagePreference.values.firstWhere(
      (value) => value.name == raw,
      orElse: () => NaraLanguagePreference.english,
    );
  }

  Future<void> saveLanguagePreference(NaraLanguagePreference preference) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_languagePreferenceKey, preference.name);
  }

  Future<bool> hasSeenWhatsAppPrompt(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('$_whatsAppPromptPrefix$userId') ?? false;
  }

  Future<void> markWhatsAppPromptSeen(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('$_whatsAppPromptPrefix$userId', true);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_authTokenKey);
    await prefs.remove(_userKey);
    await _secureTokenStore.delete(_authTokenKey);
  }

  Future<String?> _readAuthToken(SharedPreferences prefs) async {
    final secureToken = await _secureTokenStore.read(_authTokenKey);
    if (secureToken != null && secureToken.isNotEmpty) return secureToken;

    final legacyToken = prefs.getString(_authTokenKey);
    if (legacyToken == null || legacyToken.isEmpty) return null;

    await _secureTokenStore.write(_authTokenKey, legacyToken);
    await prefs.remove(_authTokenKey);
    return legacyToken;
  }
}

class NaraSecureTokenStore {
  const NaraSecureTokenStore();

  static const _channel = MethodChannel('nara/secure_store');

  Future<String?> read(String key) async {
    if (!Platform.isAndroid) return null;
    return _channel.invokeMethod<String>('read', {'key': key});
  }

  Future<void> write(String key, String value) async {
    if (!Platform.isAndroid) return;
    await _channel.invokeMethod<void>('write', {
      'key': key,
      'value': value,
    });
  }

  Future<void> delete(String key) async {
    if (!Platform.isAndroid) return;
    await _channel.invokeMethod<void>('delete', {'key': key});
  }
}
