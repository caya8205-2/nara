import 'dart:async';

import 'package:flutter/material.dart';

import 'core/services/api_client.dart';
import 'core/services/session_store.dart';
import 'core/state/nara_mobile_state.dart';
import 'core/theme/nara_theme.dart';
import 'core/widgets/nara_logo_mark.dart';
import 'features/approvals/approvals_screen.dart';
import 'features/assistant/assistant_screen.dart';
import 'features/auth/auth_screen.dart';
import 'features/home/home_screen.dart';
import 'features/reminders/reminders_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/tasks/task_detail_sheet.dart';
import 'features/tasks/tasks_screen.dart';

class NaraMobileApp extends StatefulWidget {
  const NaraMobileApp({super.key});

  @override
  State<NaraMobileApp> createState() => _NaraMobileAppState();
}

class _NaraMobileAppState extends State<NaraMobileApp>
    with WidgetsBindingObserver {
  final NaraApiClient apiClient = NaraApiClient();
  final NaraSessionStore sessionStore = NaraSessionStore();
  final NaraMobileState appState = NaraMobileState();
  int selectedIndex = 0;
  int tabDirection = 1;
  Map<String, dynamic>? currentUser;
  bool isGuest = false;
  Timer? connectionTimer;
  bool restoringSession = true;
  bool whatsAppPromptVisible = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    restoreSession();
    connectionTimer = Timer.periodic(const Duration(minutes: 2), (_) {
      if (!isGuest && (currentUser != null || apiClient.currentUser != null)) {
        checkConnection(showChecking: false);
      }
    });
  }

  @override
  void dispose() {
    connectionTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        !isGuest &&
        (currentUser != null || apiClient.currentUser != null)) {
      checkConnection(showChecking: false);
      loadTasks(silent: true);
      loadReminders(silent: true);
      loadAssistantProfile(silent: true);
    }
  }

  Future<void> restoreSession() async {
    final assistantPreferences = await sessionStore.loadAssistantPreferences();
    final themePreference = await sessionStore.loadThemePreference();
    final languagePreference = await sessionStore.loadLanguagePreference();
    final session = await sessionStore.load();
    if (!mounted) return;

    setState(() {
      appState.assistantPreferences = assistantPreferences;
      appState.themePreference = themePreference;
      appState.languagePreference = languagePreference;
    });

    if (session == null) {
      setState(() => restoringSession = false);
      return;
    }

    apiClient.serverUrl = NaraApiClient.defaultServerUrl;
    apiClient.authToken = session.authToken;
    apiClient.currentUser = session.user;
    setState(() {
      currentUser = session.user;
      restoringSession = false;
      appState.connectionMessage = 'Restored session';
    });

    try {
      final user = await apiClient.loadSession();
      if (!mounted) return;
      if (user != null) {
        await sessionStore.save(
          serverUrl: apiClient.serverUrl,
          authToken: apiClient.authToken!,
          user: user,
        );
        setState(() => currentUser = user);
      }
    } catch (_) {
      await sessionStore.clear();
      apiClient.logout();
      if (!mounted) return;
      setState(() {
        currentUser = null;
        appState.connectionMessage = 'Session expired';
      });
      return;
    }

    checkConnection(showChecking: false);
    loadTasks(silent: true);
    loadReminders(silent: true);
    loadAssistantProfile(silent: true);
  }

  void handleAuthenticated(
    Map<String, dynamic> user, {
    required bool isNewUser,
  }) {
    setState(() {
      currentUser = user;
      isGuest = false;
      appState.isGuest = false;
      selectedIndex = 0;
    });
    if (apiClient.authToken != null) {
      sessionStore.save(
        serverUrl: apiClient.serverUrl,
        authToken: apiClient.authToken!,
        user: user,
      );
    }
    checkConnection(showChecking: false);
    loadTasks();
    loadReminders();
    loadAssistantProfile(forceWhatsAppPrompt: isNewUser);
  }

  void handleTryAsGuest() {
    setState(() {
      isGuest = true;
      appState.isGuest = true;
      selectedIndex = 0;
      apiClient.logout();
      currentUser = null;
      appState.tasks = [];
      appState.reminders = [];
      appState.approvals = [];
      appState.activity = [];
      appState.connectionState = NaraConnectionState.unknown;
      appState.connectionMessage = 'Guest mode';
    });
  }

  void handleSignIn() {
    // Go back to auth screen to sign in
    handleLogout(fromGuest: true);
  }

  void handleLogout({bool fromGuest = false}) {
    setState(() {
      apiClient.logout();
      currentUser = null;
      isGuest = false;
      appState.isGuest = false;
      selectedIndex = 0;
      appState.connectionState = NaraConnectionState.unknown;
      appState.connectionMessage = 'Signed out';
      appState.lastConnectionCheck = null;
      appState.tasks = [];
      appState.tasksError = null;
      appState.tasksLoading = false;
      appState.reminders = [];
      appState.remindersError = null;
      appState.remindersLoading = false;
      appState.approvals = [];
      appState.activity = [];
      appState.assistantLoading = false;
      appState.assistantSaving = false;
      appState.assistantError = null;
      appState.assistantMessage = null;
      appState.whatsappContact = null;
      appState.whatsappAccess = null;
    });
    sessionStore.clear();
  }

  Future<void> updateThemePreference(NaraThemePreference preference) async {
    setState(() => appState.themePreference = preference);
    await sessionStore.saveThemePreference(preference);
  }

  Future<void> updateLanguagePreference(
    NaraLanguagePreference preference,
  ) async {
    setState(() => appState.languagePreference = preference);
    await sessionStore.saveLanguagePreference(preference);
  }

  Future<void> checkConnection({bool showChecking = true}) async {
    if (isGuest) return;

    if (showChecking) {
      setState(() {
        appState.connectionState = NaraConnectionState.checking;
        appState.connectionMessage = 'Checking server';
      });
    }

    try {
      final report = await apiClient.testHealth();
      final ok = report['status'] == 'ok';
      setState(() {
        appState.connectionState =
            ok ? NaraConnectionState.connected : NaraConnectionState.attention;
        appState.connectionMessage =
            ok ? 'Nara is ready' : 'Nara needs attention';
        appState.lastConnectionCheck = DateTime.now();
      });
    } catch (error) {
      setState(() {
        appState.connectionState = NaraConnectionState.offline;
        appState.connectionMessage = 'Could not reach Nara';
        appState.lastConnectionCheck = DateTime.now();
      });
    }
  }

  Future<void> loadTasks({bool silent = false}) async {
    if (isGuest) return;

    if (!silent) {
      setState(() {
        appState.tasksLoading = true;
        appState.tasksError = null;
      });
    } else {
      appState.tasksError = null;
    }

    try {
      final result = await apiClient.listTasks();
      final tasks = result
          .whereType<Map<String, dynamic>>()
          .map(NaraTask.fromJson)
          .toList();
      setState(() {
        appState.tasks = tasks;
      });
    } catch (error) {
      setState(() {
        appState.tasksError = 'Could not load tasks';
      });
    } finally {
      if (!silent) {
        setState(() {
          appState.tasksLoading = false;
        });
      }
    }
  }

  Future<void> loadReminders({bool silent = false}) async {
    if (isGuest) return;
    if (!silent) {
      setState(() {
        appState.remindersLoading = true;
        appState.remindersError = null;
      });
    }

    try {
      final result = await apiClient.listReminders();
      final reminders = result
          .whereType<Map<String, dynamic>>()
          .map(NaraReminder.fromJson)
          .toList();
      if (!mounted) return;
      setState(() => appState.reminders = reminders);
    } catch (_) {
      if (!mounted) return;
      setState(() => appState.remindersError = 'Could not load reminders');
    } finally {
      if (!silent && mounted) {
        setState(() => appState.remindersLoading = false);
      }
    }
  }

  Future<void> loadAssistantProfile({
    bool silent = false,
    bool forceWhatsAppPrompt = false,
  }) async {
    if (isGuest) return;
    final userId = activeUserId;
    if (userId == null) return;

    if (!silent) {
      setState(() {
        appState.assistantLoading = true;
        appState.assistantError = null;
      });
    } else {
      appState.assistantError = null;
    }

    try {
      final profile = NaraAssistantPreferences.fromJson(
        await apiClient.getAssistantProfile(userId),
      );
      await sessionStore.saveAssistantPreferences(profile);

      final contactsResult = await apiClient.listUserContacts(userId);
      final contacts = contactsResult
          .whereType<Map<String, dynamic>>()
          .map(NaraContact.fromJson)
          .toList();
      NaraContact? whatsappContact;
      for (final contact in contacts) {
        if (contact.type == 'whatsapp') {
          whatsappContact = contact;
          break;
        }
      }

      NaraAgentAccess? whatsappAccess;
      if (whatsappContact != null) {
        final whatsappContactId = whatsappContact.id;
        final accessResult = await apiClient.listUserAgentAccess(userId);
        final accessList = accessResult
            .whereType<Map<String, dynamic>>()
            .map(NaraAgentAccess.fromJson)
            .where((access) =>
                access.userId == userId &&
                access.contactId == whatsappContactId)
            .toList();
        whatsappAccess = accessList.isEmpty ? null : accessList.first;
      }

      if (!mounted) return;
      setState(() {
        appState.assistantPreferences = profile;
        appState.whatsappContact = whatsappContact;
        appState.whatsappAccess = whatsappAccess;
      });
      await maybeShowWhatsAppPrompt(force: forceWhatsAppPrompt);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        appState.assistantError = 'Could not load assistant setup';
      });
    } finally {
      if (!silent && mounted) {
        setState(() {
          appState.assistantLoading = false;
        });
      }
    }
  }

  Future<void> maybeShowWhatsAppPrompt({bool force = false}) async {
    if (isGuest) return;
    final userId = activeUserId;
    if (!mounted ||
        userId == null ||
        whatsAppPromptVisible ||
        appState.whatsappContact != null) {
      return;
    }

    final hasSeen = await sessionStore.hasSeenWhatsAppPrompt(userId);
    if (!force && hasSeen) return;
    if (!mounted) return;

    whatsAppPromptVisible = true;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _WhatsAppSetupPrompt(
        onLater: () async {
          await sessionStore.markWhatsAppPromptSeen(userId);
          if (!context.mounted) return;
          Navigator.of(context).pop();
        },
        onSetup: () async {
          await sessionStore.markWhatsAppPromptSeen(userId);
          if (!context.mounted) return;
          Navigator.of(context).pop();
          openTab(3);
        },
      ),
    );
    whatsAppPromptVisible = false;
  }

  Future<void> saveAssistantPreferences(
    NaraAssistantPreferences preferences,
  ) async {
    if (isGuest) {
      _showGuestDialog();
      return;
    }
    final userId = activeUserId;
    setState(() {
      appState.assistantPreferences = preferences;
      appState.assistantSaving = true;
      appState.assistantMessage = 'Assistant settings saved';
      appState.assistantError = null;
    });
    await sessionStore.saveAssistantPreferences(preferences);
    if (userId == null) {
      setState(() {
        appState.assistantSaving = false;
      });
      return;
    }

    try {
      final profile = NaraAssistantPreferences.fromJson(
        await apiClient.updateAssistantProfile(
          userId: userId,
          preferences: preferences.toJson(),
        ),
      );
      await sessionStore.saveAssistantPreferences(profile);
      if (!mounted) return;
      setState(() {
        appState.assistantPreferences = profile;
        appState.assistantMessage = 'Assistant settings saved';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        appState.assistantError =
            'Saved on this phone. Nara Bot will sync when the server is reachable.';
      });
    } finally {
      if (mounted) {
        setState(() {
          appState.assistantSaving = false;
        });
      }
    }
  }

  Future<void> requestWhatsAppAccess(String rawNumber) async {
    if (isGuest) {
      _showGuestDialog();
      return;
    }
    final userId = activeUserId;
    final number = rawNumber.trim();
    if (userId == null) {
      setState(() {
        appState.assistantError = 'Please sign in again';
      });
      return;
    }
    if (number.length < 8) {
      setState(() {
        appState.assistantError = 'Enter a valid WhatsApp number';
      });
      return;
    }

    setState(() {
      appState.assistantSaving = true;
      appState.assistantError = null;
      appState.assistantMessage = null;
    });

    try {
      final existing = appState.whatsappContact;
      final contact = existing != null && existing.value == number
          ? existing
          : NaraContact.fromJson(
              await apiClient.addUserContact(
                userId: userId,
                type: 'whatsapp',
                value: number,
                label: 'Primary WhatsApp',
              ),
            );

      final access = NaraAgentAccess.fromJson(
        await apiClient.requestAgentAccess(
          userId: userId,
          contactId: contact.id,
        ),
      );

      if (!mounted) return;
      setState(() {
        appState.whatsappContact = contact;
        appState.whatsappAccess = access;
        appState.assistantMessage = 'WhatsApp access requested';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        appState.assistantError = 'Could not request WhatsApp access';
      });
    } finally {
      if (mounted) {
        setState(() {
          appState.assistantSaving = false;
        });
      }
    }
  }

  Future<void> createTask(NaraTaskDraft draft) async {
    if (isGuest) {
      _showGuestDialog();
      return;
    }
    setState(() {
      appState.tasksError = null;
    });

    try {
      final task = await apiClient.createTask(
        title: draft.title,
        description: draft.description,
        dueAt: draft.dueAt,
        priority: draft.priority,
      );
      setState(() {
        appState.tasks = [NaraTask.fromJson(task), ...appState.tasks];
      });
    } catch (error) {
      setState(() {
        appState.tasksError = 'Could not create task';
      });
      rethrow;
    }
  }

  Future<void> completeTask(String id) async {
    if (isGuest) {
      _showGuestDialog();
      return;
    }
    final previousTasks = List<NaraTask>.from(appState.tasks);
    setState(() {
      appState.tasksError = null;
      appState.tasks = appState.tasks
          .map((task) => task.id == id ? task.copyWith(done: true) : task)
          .toList();
    });

    try {
      final updated = NaraTask.fromJson(await apiClient.completeTask(id));
      setState(() {
        appState.tasks = appState.tasks
            .map((task) => task.id == id ? updated : task)
            .toList();
      });
    } catch (error) {
      setState(() {
        appState.tasks = previousTasks;
        appState.tasksError = 'Could not complete task';
      });
    }
  }

  Future<void> updateTask(NaraTask task) async {
    if (isGuest) {
      _showGuestDialog();
      return;
    }
    final previousTasks = List<NaraTask>.from(appState.tasks);
    setState(() {
      appState.tasksError = null;
      appState.tasks =
          appState.tasks.map((t) => t.id == task.id ? task : t).toList();
    });

    try {
      final updated = NaraTask.fromJson(
        await apiClient.putJson('/api/tasks/${task.id}', {
          'title': task.title,
          if (task.description != null) 'description': task.description,
          'priority': task.priority,
          'done': task.done,
          if (task.dueAt != null)
            'dueAt': task.dueAt!.toUtc().toIso8601String(),
        }),
      );
      setState(() {
        appState.tasks =
            appState.tasks.map((t) => t.id == task.id ? updated : t).toList();
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        appState.tasks = previousTasks;
        appState.tasksError = 'Could not update task';
      });
      rethrow;
    }
  }

  Future<void> deleteTask(String id) async {
    if (isGuest) {
      _showGuestDialog();
      return;
    }
    final previousTasks = List<NaraTask>.from(appState.tasks);
    setState(() {
      appState.tasks = appState.tasks.where((t) => t.id != id).toList();
    });

    try {
      await apiClient.deleteTask(id);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        appState.tasks = previousTasks;
        appState.tasksError = 'Could not delete task';
      });
      rethrow;
    }
  }

  Future<void> createReminder(NaraReminderDraft draft) async {
    if (isGuest) {
      _showGuestDialog();
      return;
    }
    final reminder = NaraReminder.fromJson(await apiClient.createReminder(
      name: draft.name,
      kind: draft.kind,
      description: draft.description,
      scheduledAt: draft.scheduledAt,
      cronExpr: draft.cronExpr,
    ));
    if (!mounted) return;
    setState(() {
      appState.reminders = [reminder, ...appState.reminders];
      appState.remindersError = null;
    });
  }

  Future<void> setReminderEnabled(NaraReminder reminder, bool enabled) async {
    final previous = List<NaraReminder>.from(appState.reminders);
    setState(() {
      appState.reminders = appState.reminders
          .map((item) => item.id == reminder.id
              ? item.copyWith(enabled: enabled)
              : item)
          .toList();
    });
    try {
      final updated = NaraReminder.fromJson(
        await apiClient.updateReminder(reminder.id, enabled: enabled),
      );
      if (!mounted) return;
      setState(() {
        appState.reminders = appState.reminders
            .map((item) => item.id == reminder.id ? updated : item)
            .toList();
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        appState.reminders = previous;
        appState.remindersError = 'Could not update reminder';
      });
    }
  }

  Future<void> deleteReminder(String id) async {
    final previous = List<NaraReminder>.from(appState.reminders);
    setState(() {
      appState.reminders =
          appState.reminders.where((item) => item.id != id).toList();
    });
    try {
      await apiClient.deleteReminder(id);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        appState.reminders = previous;
        appState.remindersError = 'Could not delete reminder';
      });
    }
  }

  Future<void> handleApprove(NaraApproval approval) async {
    // Placeholder — connect to backend endpoint later
    setState(() {
      appState.approvals =
          appState.approvals.where((a) => a.id != approval.id).toList();
    });
  }

  Future<void> handleReject(NaraApproval approval) async {
    // Placeholder — connect to backend endpoint later
    setState(() {
      appState.approvals =
          appState.approvals.where((a) => a.id != approval.id).toList();
    });
  }

  void openTab(int index) {
    if (index == selectedIndex) return;
    setState(() {
      tabDirection = index > selectedIndex ? 1 : -1;
      selectedIndex = index;
    });
  }

  String? get activeUserId {
    final id = (currentUser ?? apiClient.currentUser)?['id']?.toString();
    if (id == null || id.isEmpty) return null;
    return id;
  }

  void _showGuestDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign in to continue'),
        content: const Text(
          'You need an account to use this feature.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              handleSignIn();
            },
            child: const Text('Sign In'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = currentUser ?? apiClient.currentUser;
    final showAsGuest = isGuest && user == null;
    final isIndonesian =
        appState.languagePreference == NaraLanguagePreference.indonesia;

    final screens = [
      // 0 — Home
      HomeScreen(
        state: appState,
        user: user,
        onRefreshConnection: checkConnection,
        onRefreshTasks: loadTasks,
        onRefreshAssistant: loadAssistantProfile,
        onOpenTasks: () => openTab(1),
        onCreateTask: createTask,
        onCompleteTask: completeTask,
        onOpenAssistant: () => openTab(3),
        onRequestWhatsAppAccess: requestWhatsAppAccess,
        onOpenSettings: () => openTab(5),
        onOpenTaskDetail: _showTaskDetail,
        onSignIn: handleSignIn,
      ),
      // 1 — Tasks
      TasksScreen(
        state: appState,
        onRefresh: loadTasks,
        onCreateTask: createTask,
        onCompleteTask: completeTask,
        onOpenTaskDetail: _showTaskDetail,
      ),
      // 2 — Reminders
      RemindersScreen(
        state: appState,
        onRefresh: loadReminders,
        onCreate: createReminder,
        onSetEnabled: setReminderEnabled,
        onDelete: deleteReminder,
      ),
      // 3 — Assistant
      AssistantScreen(
        state: appState,
        onRefresh: loadAssistantProfile,
        onSavePreferences: saveAssistantPreferences,
        onRequestWhatsAppAccess: requestWhatsAppAccess,
      ),
      // 4 — Approvals
      ApprovalsScreen(
        state: appState,
        onApprove: handleApprove,
        onReject: handleReject,
      ),
      // 5 — Settings (hidden tab)
      SettingsScreen(
        state: appState,
        onLogout: handleLogout,
        onOpenAssistant: () => openTab(3),
        onBack: () => openTab(0),
        onThemeChanged: updateThemePreference,
        onLanguageChanged: updateLanguagePreference,
        user: user,
      ),
    ];

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Nara',
      theme: buildNaraTheme(),
      darkTheme: buildNaraDarkTheme(),
      themeMode: _themeMode(appState.themePreference),
      home: AnimatedSwitcher(
        duration: const Duration(milliseconds: 520),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        transitionBuilder: (child, animation) =>
            FadeTransition(opacity: animation, child: child),
        child: restoringSession
            ? const _SessionLoadingScreen(key: ValueKey('session-loading'))
            : user == null && !showAsGuest
                ? AuthScreen(
                    key: const ValueKey('auth'),
                    apiClient: apiClient,
                    onAuthenticated: handleAuthenticated,
                    onTryAsGuest: handleTryAsGuest,
                    language: appState.languagePreference,
                  )
                : Scaffold(
                    key: const ValueKey('app-shell'),
                    body: SafeArea(
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 260),
                        switchInCurve: Curves.easeOutCubic,
                        switchOutCurve: Curves.easeInCubic,
                        transitionBuilder: (child, animation) =>
                            FadeTransition(opacity: animation, child: child),
                        child: KeyedSubtree(
                          key: ValueKey(selectedIndex),
                          child: screens[selectedIndex],
                        ),
                      ),
                    ),
                    bottomNavigationBar: selectedIndex == 5
                        ? null
                        : NavigationBar(
                            selectedIndex: selectedIndex,
                            onDestinationSelected: openTab,
                            destinations: showAsGuest
                                ? [
                                    NavigationDestination(
                                      icon: const Icon(Icons.home_outlined),
                                      selectedIcon: const Icon(Icons.home),
                                      label: isIndonesian ? 'Beranda' : 'Home',
                                    ),
                                    NavigationDestination(
                                      icon:
                                          const Icon(Icons.checklist_outlined),
                                      selectedIcon: const Icon(Icons.checklist),
                                      label: isIndonesian ? 'Tugas' : 'Tasks',
                                    ),
                                    NavigationDestination(
                                      icon: const Icon(
                                          Icons.notifications_outlined),
                                      selectedIcon:
                                          const Icon(Icons.notifications),
                                      label: isIndonesian
                                          ? 'Pengingat'
                                          : 'Reminders',
                                    ),
                                    NavigationDestination(
                                      icon:
                                          const Icon(Icons.smart_toy_outlined),
                                      selectedIcon: const Icon(Icons.smart_toy),
                                      label: 'Nara',
                                    ),
                                  ]
                                : [
                                    NavigationDestination(
                                      icon: const Icon(Icons.home_outlined),
                                      selectedIcon: const Icon(Icons.home),
                                      label: isIndonesian ? 'Beranda' : 'Home',
                                    ),
                                    NavigationDestination(
                                      icon:
                                          const Icon(Icons.checklist_outlined),
                                      selectedIcon: const Icon(Icons.checklist),
                                      label: isIndonesian ? 'Tugas' : 'Tasks',
                                    ),
                                    NavigationDestination(
                                      icon: const Icon(
                                          Icons.notifications_outlined),
                                      selectedIcon:
                                          const Icon(Icons.notifications),
                                      label: isIndonesian
                                          ? 'Pengingat'
                                          : 'Reminders',
                                    ),
                                    NavigationDestination(
                                      icon:
                                          const Icon(Icons.smart_toy_outlined),
                                      selectedIcon: const Icon(Icons.smart_toy),
                                      label: 'Nara',
                                    ),
                                    NavigationDestination(
                                      icon:
                                          const Icon(Icons.checklist_outlined),
                                      selectedIcon: const Icon(
                                          Icons.assignment_turned_in),
                                      label: isIndonesian
                                          ? 'Persetujuan'
                                          : 'Approvals',
                                    ),
                                  ],
                          ),
                  ),
      ),
    );
  }

  Future<void> _showTaskDetail(NaraTask task) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => TaskDetailSheet(
        task: task,
        onSave: (updated) => updateTask(updated),
        onDelete: (id) => deleteTask(id),
      ),
    );
  }

  ThemeMode _themeMode(NaraThemePreference preference) {
    return switch (preference) {
      NaraThemePreference.system => ThemeMode.system,
      NaraThemePreference.light => ThemeMode.light,
      NaraThemePreference.dark => ThemeMode.dark,
    };
  }
}

class _SessionLoadingScreen extends StatelessWidget {
  const _SessionLoadingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              NaraLogoMark(size: 78),
              SizedBox(height: 18),
              CircularProgressIndicator(),
            ],
          ),
        ),
      ),
    );
  }
}

class _WhatsAppSetupPrompt extends StatelessWidget {
  const _WhatsAppSetupPrompt({
    required this.onLater,
    required this.onSetup,
  });

  final Future<void> Function() onLater;
  final Future<void> Function() onSetup;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Dialog(
      insetPadding: const EdgeInsets.all(22),
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0.96, end: 1),
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOutBack,
        builder: (context, value, child) {
          return Transform.scale(scale: value, child: child);
        },
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const NaraLogoMark(size: 72),
              const SizedBox(height: 16),
              Text(
                'Connect WhatsApp to unlock Nara Bot',
                textAlign: TextAlign.center,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Without your WhatsApp number, Nara still works for manual tasks and reminders, but the main bot workflow cannot reach you yet.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 18),
              FilledButton.icon(
                onPressed: () {
                  onSetup();
                },
                icon: const Icon(Icons.chat_outlined),
                label: const Text('Set Up WhatsApp'),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () {
                  onLater();
                },
                child: const Text('Later'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
