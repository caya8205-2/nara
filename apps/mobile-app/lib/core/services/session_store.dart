import 'dart:convert';

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

  Future<StoredNaraSession?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final serverUrl = prefs.getString(_serverUrlKey);
    final authToken = prefs.getString(_authTokenKey);
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
    await prefs.setString(_authTokenKey, authToken);
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

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_authTokenKey);
    await prefs.remove(_userKey);
  }
}
