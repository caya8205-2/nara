import 'dart:convert';
import 'dart:io';

class NaraApiClient {
  String serverUrl = 'http://127.0.0.1:4000';
  String? operatorToken;

  Uri _uri(String path) {
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

  Future<String> login(String username, String password) async {
    final response = await postJson('/api/auth/login', {
      'username': username,
      'password': password,
    });
    final token = response['token'];
    if (token is! String || token.isEmpty) {
      throw const FormatException('Missing operator token');
    }
    operatorToken = token;
    return token;
  }

  Future<List<dynamic>> listTasks() {
    return getList('/api/tasks');
  }

  void _applyHeaders(HttpClientRequest request) {
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    if (operatorToken != null) {
      request.headers.set(
        HttpHeaders.authorizationHeader,
        'Bearer $operatorToken',
      );
    }
  }

  Future<Map<String, dynamic>> _decodeResponse(HttpClientResponse response) async {
    final decoded = await _decodeRaw(response);
    if (decoded is Map<String, dynamic>) return decoded;
    throw const FormatException('Expected object response');
  }

  Future<dynamic> _decodeRaw(HttpClientResponse response) async {
    final raw = await utf8.decodeStream(response);
    final decoded = raw.isEmpty ? null : jsonDecode(raw);
    if (response.statusCode >= 400) {
      final message = decoded is Map<String, dynamic>
          ? decoded['error']?.toString()
          : null;
      throw HttpException(message ?? 'Request failed');
    }
    return decoded;
  }
}
