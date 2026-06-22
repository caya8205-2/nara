enum NaraConnectionState {
  unknown,
  checking,
  connected,
  attention,
  offline,
}

enum NaraThemePreference {
  system,
  light,
  dark,
}

enum NaraLanguagePreference {
  english,
  indonesia,
}

class NaraTask {
  const NaraTask({
    required this.id,
    required this.title,
    required this.done,
    this.description,
    this.userId,
    this.dueAt,
    this.priority = 'normal',
    this.source = 'manual',
  });

  final String id;
  final String title;
  final String? description;
  final String? userId;
  final bool done;
  final DateTime? dueAt;
  final String priority;
  final String source;

  NaraTask copyWith({
    String? id,
    String? title,
    String? description,
    String? userId,
    bool? done,
    DateTime? dueAt,
    String? priority,
    String? source,
  }) {
    return NaraTask(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      userId: userId ?? this.userId,
      done: done ?? this.done,
      dueAt: dueAt ?? this.dueAt,
      priority: priority ?? this.priority,
      source: source ?? this.source,
    );
  }

  factory NaraTask.fromJson(Map<String, dynamic> json) {
    final dueAtRaw = json['dueAt']?.toString();

    return NaraTask(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled task',
      description: json['description']?.toString(),
      userId: json['userId']?.toString(),
      done: json['done'] == true,
      dueAt: dueAtRaw == null ? null : DateTime.tryParse(dueAtRaw),
      priority: json['priority']?.toString() ?? 'normal',
      source: json['source']?.toString() ?? 'manual',
    );
  }

  bool get isDueToday {
    if (dueAt == null) return false;
    final now = DateTime.now();
    final localDue = dueAt!.toLocal();
    return localDue.year == now.year &&
        localDue.month == now.month &&
        localDue.day == now.day;
  }
}

class NaraTaskDraft {
  const NaraTaskDraft({
    required this.title,
    this.description,
    this.dueAt,
    this.priority = 'normal',
  });

  final String title;
  final String? description;
  final DateTime? dueAt;
  final String priority;
}

class NaraReminder {
  const NaraReminder({
    required this.id,
    required this.name,
    required this.kind,
    required this.enabled,
    required this.timezone,
    required this.source,
    this.description,
    this.scheduledAt,
    this.cronExpr,
    this.nextRunAt,
    this.lastTriggeredAt,
    this.lastTriggerStatus,
    this.lastTriggerMessage,
  });

  final String id;
  final String name;
  final String? description;
  final String kind;
  final DateTime? scheduledAt;
  final String? cronExpr;
  final DateTime? nextRunAt;
  final DateTime? lastTriggeredAt;
  final String? lastTriggerStatus;
  final String? lastTriggerMessage;
  final String timezone;
  final String source;
  final bool enabled;

  factory NaraReminder.fromJson(Map<String, dynamic> json) {
    final scheduledAtRaw = json['scheduledAt']?.toString();
    final nextRunAtRaw = json['nextRunAt']?.toString();
    final lastTriggeredAtRaw = json['lastTriggeredAt']?.toString();
    return NaraReminder(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Untitled reminder',
      description: json['description']?.toString(),
      kind: json['kind']?.toString() ?? 'once',
      scheduledAt:
          scheduledAtRaw == null ? null : DateTime.tryParse(scheduledAtRaw),
      cronExpr: json['cronExpr']?.toString(),
      nextRunAt: nextRunAtRaw == null ? null : DateTime.tryParse(nextRunAtRaw),
      lastTriggeredAt: lastTriggeredAtRaw == null
          ? null
          : DateTime.tryParse(lastTriggeredAtRaw),
      lastTriggerStatus: json['lastTriggerStatus']?.toString(),
      lastTriggerMessage: json['lastTriggerMessage']?.toString(),
      timezone: json['timezone']?.toString() ?? 'Asia/Jakarta',
      source: json['source']?.toString() ?? 'manual',
      enabled: json['enabled'] != false,
    );
  }

  NaraReminder copyWith({bool? enabled}) {
    return NaraReminder(
      id: id,
      name: name,
      description: description,
      kind: kind,
      scheduledAt: scheduledAt,
      cronExpr: cronExpr,
      nextRunAt: nextRunAt,
      lastTriggeredAt: lastTriggeredAt,
      lastTriggerStatus: lastTriggerStatus,
      lastTriggerMessage: lastTriggerMessage,
      timezone: timezone,
      source: source,
      enabled: enabled ?? this.enabled,
    );
  }
}

class NaraReminderDraft {
  const NaraReminderDraft({
    required this.name,
    required this.kind,
    this.description,
    this.scheduledAt,
    this.cronExpr,
  });

  final String name;
  final String? description;
  final String kind;
  final DateTime? scheduledAt;
  final String? cronExpr;
}

class NaraContact {
  const NaraContact({
    required this.id,
    required this.type,
    required this.value,
    this.label,
  });

  final String id;
  final String type;
  final String value;
  final String? label;

  factory NaraContact.fromJson(Map<String, dynamic> json) {
    return NaraContact(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
      value: json['value']?.toString() ?? '',
      label: json['label']?.toString(),
    );
  }
}

class NaraAgentAccess {
  const NaraAgentAccess({
    required this.id,
    required this.userId,
    required this.contactId,
    required this.status,
    this.syncError,
    this.lastSyncAt,
  });

  final String id;
  final String userId;
  final String contactId;
  final String status;
  final String? syncError;
  final DateTime? lastSyncAt;

  factory NaraAgentAccess.fromJson(Map<String, dynamic> json) {
    final lastSyncRaw = json['lastSyncAt']?.toString();

    return NaraAgentAccess(
      id: json['id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      contactId: json['contactId']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending_allowlist',
      syncError: json['syncError']?.toString(),
      lastSyncAt: lastSyncRaw == null ? null : DateTime.tryParse(lastSyncRaw),
    );
  }
}

class NaraAssistantPreferences {
  const NaraAssistantPreferences({
    this.tone = 'Balanced',
    this.autonomy = 'Confirm',
    this.customPersonality = '',
    this.allowTaskCreation = true,
    this.allowReminderDrafts = true,
    this.allowSensitiveActions = false,
  });

  final String tone;
  final String autonomy;
  final String customPersonality;
  final bool allowTaskCreation;
  final bool allowReminderDrafts;
  final bool allowSensitiveActions;

  NaraAssistantPreferences copyWith({
    String? tone,
    String? autonomy,
    String? customPersonality,
    bool? allowTaskCreation,
    bool? allowReminderDrafts,
    bool? allowSensitiveActions,
  }) {
    return NaraAssistantPreferences(
      tone: tone ?? this.tone,
      autonomy: autonomy ?? this.autonomy,
      customPersonality: customPersonality ?? this.customPersonality,
      allowTaskCreation: allowTaskCreation ?? this.allowTaskCreation,
      allowReminderDrafts: allowReminderDrafts ?? this.allowReminderDrafts,
      allowSensitiveActions:
          allowSensitiveActions ?? this.allowSensitiveActions,
    );
  }

  factory NaraAssistantPreferences.fromJson(Map<String, dynamic> json) {
    return NaraAssistantPreferences(
      tone: json['tone']?.toString() ?? 'Balanced',
      autonomy: json['autonomy']?.toString() ?? 'Confirm',
      customPersonality: json['customPersonality']?.toString() ?? '',
      allowTaskCreation: json['allowTaskCreation'] != false,
      allowReminderDrafts: json['allowReminderDrafts'] != false,
      allowSensitiveActions: json['allowSensitiveActions'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'tone': tone,
      'autonomy': autonomy,
      'customPersonality': customPersonality,
      'allowTaskCreation': allowTaskCreation,
      'allowReminderDrafts': allowReminderDrafts,
      'allowSensitiveActions': allowSensitiveActions,
    };
  }
}

class NaraApproval {
  const NaraApproval({
    required this.id,
    required this.title,
    required this.actionType,
    required this.source,
    required this.riskLevel,
    required this.createdAt,
    this.payload,
  });

  final String id;
  final String title;
  final String actionType;
  final String source;
  final String riskLevel;
  final DateTime createdAt;
  final Map<String, dynamic>? payload;

  factory NaraApproval.fromJson(Map<String, dynamic> json) {
    final createdAtRaw = json['createdAt']?.toString();
    return NaraApproval(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled action',
      actionType: json['actionType']?.toString() ?? 'unknown',
      source: json['source']?.toString() ?? 'nara',
      riskLevel: json['riskLevel']?.toString() ?? 'low',
      createdAt: createdAtRaw == null
          ? DateTime.now()
          : DateTime.tryParse(createdAtRaw) ?? DateTime.now(),
      payload: json['payload'] is Map<String, dynamic>
          ? json['payload'] as Map<String, dynamic>
          : null,
    );
  }
}

class NaraActivity {
  const NaraActivity({
    required this.id,
    required this.type,
    required this.title,
    required this.timestamp,
  });

  final String id;
  final String type;
  final String title;
  final DateTime timestamp;

  factory NaraActivity.fromJson(Map<String, dynamic> json) {
    final tsRaw = json['timestamp']?.toString();
    return NaraActivity(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'unknown',
      title: json['title']?.toString() ?? '',
      timestamp: tsRaw == null
          ? DateTime.now()
          : DateTime.tryParse(tsRaw) ?? DateTime.now(),
    );
  }
}

class NaraMobileState {
  NaraConnectionState connectionState = NaraConnectionState.unknown;
  String connectionMessage = 'Not checked yet';
  DateTime? lastConnectionCheck;

  bool isGuest = false;
  NaraThemePreference themePreference = NaraThemePreference.light;
  NaraLanguagePreference languagePreference = NaraLanguagePreference.english;

  bool tasksLoading = false;
  String? tasksError;
  List<NaraTask> tasks = [];

  bool remindersLoading = false;
  String? remindersError;
  List<NaraReminder> reminders = [];

  List<NaraApproval> approvals = [];
  bool approvalsLoading = false;
  String? approvalsError;
  List<NaraActivity> activity = [];

  NaraAssistantPreferences assistantPreferences =
      const NaraAssistantPreferences();
  bool assistantLoading = false;
  bool assistantSaving = false;
  String? assistantError;
  String? assistantMessage;
  NaraContact? whatsappContact;
  NaraAgentAccess? whatsappAccess;

  int get pendingTaskCount => tasks.where((task) => !task.done).length;

  int get completedTaskCount => tasks.where((task) => task.done).length;

  List<NaraTask> get todayTasks =>
      tasks.where((task) => !task.done && task.isDueToday).toList();

  List<NaraTask> get openTasks =>
      tasks.where((task) => !task.done && !task.isDueToday).toList();

  List<NaraTask> get completedTasks =>
      tasks.where((task) => task.done).toList();

  List<NaraTask> get latestTasks => tasks.take(3).toList();

  List<NaraApproval> get pendingApprovals => approvals;

  List<NaraReminder> get upcomingReminders => reminders
      .where((reminder) => reminder.enabled && reminder.kind == 'once')
      .toList()
    ..sort((a, b) {
      final aDue = a.nextRunAt ?? a.scheduledAt;
      final bDue = b.nextRunAt ?? b.scheduledAt;
      if (aDue == null) return 1;
      if (bDue == null) return -1;
      return aDue.compareTo(bDue);
    });

  List<NaraReminder> get recurringReminders => reminders
      .where((reminder) => reminder.enabled && reminder.kind == 'recurring')
      .toList();

  List<NaraReminder> get pausedReminders =>
      reminders.where((reminder) => !reminder.enabled).toList();

  String get whatsappStatusLabel {
    if (assistantLoading) return 'Checking';
    if (whatsappContact == null) return 'Not connected';

    return switch (whatsappAccess?.status) {
      'allowed' => 'Allowed',
      'blocked' => 'Blocked',
      'sync_failed' => 'Sync failed',
      'pending_verification' => 'Needs verification',
      'pending_allowlist' => 'Waiting approval',
      _ => 'Waiting approval',
    };
  }

  bool get hasWhatsAppAccess => whatsappAccess?.status == 'allowed';
}
