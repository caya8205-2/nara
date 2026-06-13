enum NaraConnectionState {
  unknown,
  checking,
  connected,
  attention,
  offline,
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

class NaraMobileState {
  NaraConnectionState connectionState = NaraConnectionState.unknown;
  String connectionMessage = 'Not checked yet';
  DateTime? lastConnectionCheck;

  bool tasksLoading = false;
  String? tasksError;
  List<NaraTask> tasks = [];

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
