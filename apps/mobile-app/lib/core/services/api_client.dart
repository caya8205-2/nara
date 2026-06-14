import 'dart:convert';
import 'dart:io';

class NaraApiClient {
  NaraApiClient() : serverUrl = defaultServerUrl;

  static const productionServerUrl = 'https://narabot.web.id';

  static const configuredServerUrl = String.fromEnvironment(
    'NARA_API_BASE_URL',
  );

  static String get defaultServerUrl {
    if (configuredServerUrl.isNotEmpty) return configuredServerUrl;
    return productionServerUrl;
  }

  String serverUrl;
  String? authToken;
  Map<String, dynamic>? currentUser;

  Uri _uri(String path) {
    if (serverUrl.trim().isEmpty) {
      throw const FormatException('Nara API is not configured');
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

  Future<Map<String, dynamic>> putJson(
    String path,
    Map<String, dynamic> body,
  ) async {
    final request = await HttpClient().putUrl(_uri(path));
    _applyHeaders(request);
    request.headers.contentType = ContentType.json;
    request.write(jsonEncode(body));
    final response = await request.close();
    return _decodeResponse(response);
  }

  Future<Map<String, dynamic>> patchJson(
    String path,
    Map<String, dynamic> body,
  ) async {
    final request = await HttpClient().patchUrl(_uri(path));
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

  Future<Map<String, dynamic>> testHealth() {
    return getJson('/health');
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
    DateTime? dueAt,
    String priority = 'normal',
  }) {
    return postJson('/api/tasks', {
      'title': title,
      if (description != null && description.trim().isNotEmpty)
        'description': description.trim(),
      if (dueAt != null) 'dueAt': dueAt.toUtc().toIso8601String(),
      'priority': priority,
    });
  }

  Future<Map<String, dynamic>> completeTask(String id) async {
    final request =
        await HttpClient().patchUrl(_uri('/api/tasks/$id/complete'));
    _applyHeaders(request);
    final response = await request.close();
    return _decodeResponse(response);
  }

  Future<void> deleteTask(String id) async {
    final request = await HttpClient().deleteUrl(_uri('/api/tasks/$id'));
    _applyHeaders(request);
    final response = await request.close();
    await _decodeRaw(response);
  }

  Future<List<dynamic>> listReminders() {
    return getList('/api/reminders');
  }

  Future<Map<String, dynamic>> createReminder({
    required String name,
    required String kind,
    String? description,
    DateTime? scheduledAt,
    String? cronExpr,
  }) {
    return postJson('/api/reminders', {
      'name': name,
      'kind': kind,
      if (description != null && description.trim().isNotEmpty)
        'description': description.trim(),
      if (scheduledAt != null)
        'scheduledAt': scheduledAt.toUtc().toIso8601String(),
      if (cronExpr != null) 'cronExpr': cronExpr,
      'timezone': 'Asia/Jakarta',
    });
  }

  Future<Map<String, dynamic>> updateReminder(
    String id, {
    required bool enabled,
  }) {
    return patchJson('/api/reminders/$id', {'enabled': enabled});
  }

  Future<void> deleteReminder(String id) async {
    final request = await HttpClient().deleteUrl(_uri('/api/reminders/$id'));
    _applyHeaders(request);
    final response = await request.close();
    await _decodeRaw(response);
  }

  Future<List<dynamic>> listUserContacts(String userId) {
    return getList('/api/users/$userId/contacts');
  }

  Future<Map<String, dynamic>> getAssistantProfile(String userId) {
    return getJson('/api/users/$userId/assistant-profile');
  }

  Future<Map<String, dynamic>> updateAssistantProfile({
    required String userId,
    required Map<String, dynamic> preferences,
  }) {
    return putJson('/api/users/$userId/assistant-profile', preferences);
  }

  Future<Map<String, dynamic>> addUserContact({
    required String userId,
    required String type,
    required String value,
    String? label,
  }) {
    return postJson('/api/users/$userId/contacts', {
      'type': type,
      'value': value,
      if (label != null && label.trim().isNotEmpty) 'label': label.trim(),
    });
  }

  Future<Map<String, dynamic>> requestAgentAccess({
    required String userId,
    required String contactId,
    String channelType = 'whatsapp',
  }) {
    return postJson('/api/users/$userId/agent-access', {
      'contactId': contactId,
      'channelType': channelType,
    });
  }

  Future<List<dynamic>> listAgentAccess() {
    return getList('/api/agent-access');
  }

  Future<List<dynamic>> listUserAgentAccess(String userId) {
    return getList('/api/users/$userId/agent-access');
  }

  Future<void> deleteUserAgentAccess({
    required String userId,
    required String accessId,
  }) async {
    final request = await HttpClient()
        .deleteUrl(_uri('/api/users/$userId/agent-access/$accessId'));
    _applyHeaders(request);
    final response = await request.close();
    await _decodeRaw(response);
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
