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
    this.dueAt,
  });

  final String id;
  final String title;
  final String? description;
  final bool done;
  final DateTime? dueAt;

  factory NaraTask.fromJson(Map<String, dynamic> json) {
    final dueAtRaw = json['dueAt']?.toString();

    return NaraTask(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled task',
      description: json['description']?.toString(),
      done: json['done'] == true,
      dueAt: dueAtRaw == null ? null : DateTime.tryParse(dueAtRaw),
    );
  }
}

class NaraMobileState {
  NaraConnectionState connectionState = NaraConnectionState.unknown;
  String connectionMessage = 'Not checked yet';
  DateTime? lastConnectionCheck;

  bool tasksLoading = false;
  String? tasksError;
  List<NaraTask> tasks = [];

  int get pendingTaskCount => tasks.where((task) => !task.done).length;

  List<NaraTask> get latestTasks => tasks.take(3).toList();
}
