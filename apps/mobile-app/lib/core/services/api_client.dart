import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

class NaraApiClient {
  NaraApiClient() : serverUrl = defaultServerUrl;

  static const configuredServerUrl = String.fromEnvironment(
    'NARA_API_BASE_URL',
  );

  static String get defaultServerUrl {
    if (configuredServerUrl.isNotEmpty) return configuredServerUrl;
    if (!kReleaseMode && Platform.isAndroid) return 'http://10.0.2.2:4000';
    if (!kReleaseMode) return 'http://127.0.0.1:4000';
    return '';
  }

  String serverUrl;
  String? authToken;
  Map<String, dynamic>? currentUser;

  Uri _uri(String path) {
    if (serverUrl.trim().isEmpty) {
      throw const FormatException('Backend API URL is not configured');
    }
    final base = serverUrl.endsWith('/')
        ? serverUrl.substring(0, serverUrl.length - 1)
        : serverUrl;
    return Uri.parse('$base$path');
  }

  Future<Map<String, dynamic>> getJson(String path) async {
    final request = await HttpClient().getUrl(_uri(path));
    _applyHeaders(request);
    final response = await request.close();
    return _decodeResponse(response);
  }

  Future<Map<String, dynamic>> postJson(
    String path,
    Map<String, dynamic> body,
  ) async {
    final request = await HttpClient().postUrl(_uri(path));
    _applyHeaders(request);
    request.headers.contentType = ContentType.json;
    request.write(jsonEncode(body));
    final response = await request.close();
    return _decodeResponse(response);
  }

  Future<List<dynamic>> getList(String path) async {
    final request = await HttpClient().getUrl(_uri(path));
    _applyHeaders(request);
    final response = await request.close();
    final decoded = await _decodeRaw(response);
    if (decoded is List<dynamic>) return decoded;
    throw const FormatException('Expected list response');
  }

  Future<Map<String, dynamic>> testReadiness() {
    return getJson('/api/readiness');
  }

  Future<String> loginOperator(String username, String password) async {
    final response = await postJson('/api/auth/login', {
      'username': username,
      'password': password,
    });
    final token = response['token'];
    if (token is! String || token.isEmpty) {
      throw const FormatException('Missing operator token');
    }
    authToken = token;
    return token;
  }

  Future<Map<String, dynamic>> registerUser({
    required String displayName,
    required String email,
    required String password,
  }) async {
    final response = await postJson('/api/auth/register', {
      'displayName': displayName,
      'email': email,
      'password': password,
    });
    return _storeUserSession(response);
  }

  Future<Map<String, dynamic>> loginUser({
    required String email,
    required String password,
  }) async {
    final response = await postJson('/api/auth/user-login', {
      'email': email,
      'password': password,
    });
    return _storeUserSession(response);
  }

  Future<Map<String, dynamic>?> loadSession() async {
    if (authToken == null) return null;
    final response = await getJson('/api/auth/me');
    final user = response['user'];
    if (user is Map<String, dynamic>) {
      currentUser = user;
      return user;
    }
    return null;
  }

  void logout() {
    authToken = null;
    currentUser = null;
  }

  Future<List<dynamic>> listTasks() {
    return getList('/api/tasks');
  }

  Future<Map<String, dynamic>> createTask({
    required String title,
    String? description,
  }) {
    return postJson('/api/tasks', {
      'title': title,
      if (description != null && description.trim().isNotEmpty)
        'description': description.trim(),
    });
  }

  Future<Map<String, dynamic>> completeTask(String id) async {
    final request =
        await HttpClient().patchUrl(_uri('/api/tasks/$id/complete'));
    _applyHeaders(request);
    final response = await request.close();
    return _decodeResponse(response);
  }

  void _applyHeaders(HttpClientRequest request) {
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    if (authToken != null) {
      request.headers.set(
        HttpHeaders.authorizationHeader,
        'Bearer $authToken',
      );
    }
  }

  Map<String, dynamic> _storeUserSession(Map<String, dynamic> response) {
    final token = response['token'];
    final user = response['user'];
    if (token is! String || token.isEmpty) {
      throw const FormatException('Missing user token');
    }
    if (user is! Map<String, dynamic>) {
      throw const FormatException('Missing user profile');
    }

    authToken = token;
    currentUser = user;
    return user;
  }

  Future<Map<String, dynamic>> _decodeResponse(
      HttpClientResponse response) async {
    final decoded = await _decodeRaw(response);
    if (decoded is Map<String, dynamic>) return decoded;
    throw const FormatException('Expected object response');
  }

  Future<dynamic> _decodeRaw(HttpClientResponse response) async {
    final raw = await utf8.decodeStream(response);
    final decoded = raw.isEmpty ? null : jsonDecode(raw);
    if (response.statusCode >= 400) {
      final message =
          decoded is Map<String, dynamic> ? decoded['error']?.toString() : null;
      throw HttpException(message ?? 'Request failed');
    }
    return decoded;
  }
}
