import 'dart:io';

import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../state/nara_mobile_state.dart';

class LocalReminderNotificationService {
  LocalReminderNotificationService();

  static const _channel = MethodChannel('nara/local_notifications');
  static const _notifiedKeys = 'nara.localReminderNotificationKeys';
  bool _initialized = false;

  Future<void> initialize() async {
    if (!Platform.isAndroid || _initialized) return;
    await _channel.invokeMethod<void>('initialize');
    _initialized = true;
  }

  Future<void> reconcile({
    required List<NaraReminder> reminders,
    required bool hasWhatsAppAccess,
  }) async {
    if (!Platform.isAndroid) return;
    await initialize();

    final prefs = await SharedPreferences.getInstance();
    final seen = prefs.getStringList(_notifiedKeys)?.toSet() ?? <String>{};
    final additions = <String>{};
    final now = DateTime.now();

    for (final reminder in reminders) {
      final dueAt = reminder.nextRunAt ?? reminder.scheduledAt;
      final lastTriggeredAt = reminder.lastTriggeredAt;
      final status = reminder.lastTriggerStatus;
      final deliveryFailed =
          status == 'delivery_failed' || status == 'delivery_skipped';

      if (deliveryFailed && lastTriggeredAt != null) {
        final key =
            'triggered:${reminder.id}:${lastTriggeredAt.toIso8601String()}';
        if (seen.add(key)) {
          final shown = await showReminder(reminder);
          if (shown) {
            additions.add(key);
          } else {
            seen.remove(key);
          }
        }
        continue;
      }

      if (!hasWhatsAppAccess &&
          reminder.enabled &&
          dueAt != null &&
          !dueAt.toLocal().isAfter(now)) {
        final key = 'due:${reminder.id}:${dueAt.toIso8601String()}';
        if (seen.add(key)) {
          final shown = await showReminder(reminder);
          if (shown) {
            additions.add(key);
          } else {
            seen.remove(key);
          }
        }
      }
    }

    if (additions.isNotEmpty) {
      await prefs.setStringList(_notifiedKeys, seen.take(250).toList());
    }
  }

  Future<bool> showReminder(NaraReminder reminder) async {
    if (!Platform.isAndroid) return false;
    await initialize();
    final granted = await _channel.invokeMethod<bool>('requestPermission');
    if (granted != true) return false;
    await _channel.invokeMethod<void>('show', {
      'id': reminder.id.hashCode.abs(),
      'title': 'Nara reminder',
      'body': reminder.description == null || reminder.description!.isEmpty
          ? reminder.name
          : '${reminder.name}\n${reminder.description}',
    });
    return true;
  }

  Future<void> clearHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_notifiedKeys);
  }
}
