import 'dart:async';

import 'package:flutter/material.dart';

import 'core/services/api_client.dart';
import 'core/services/session_store.dart';
import 'core/state/nara_mobile_state.dart';
import 'core/theme/nara_theme.dart';
import 'features/assistant/assistant_screen.dart';
import 'features/auth/auth_screen.dart';
import 'features/home/home_screen.dart';
import 'features/reminders/reminders_screen.dart';
import 'features/settings/settings_screen.dart';
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
  Map<String, dynamic>? currentUser;
  Timer? connectionTimer;
  bool restoringSession = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    restoreSession();
    connectionTimer = Timer.periodic(const Duration(minutes: 2), (_) {
      if (currentUser != null || apiClient.currentUser != null) {
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
        (currentUser != null || apiClient.currentUser != null)) {
      checkConnection(showChecking: false);
      loadTasks(silent: true);
      loadAssistantProfile(silent: true);
    }
  }

  Future<void> restoreSession() async {
    final assistantPreferences = await sessionStore.loadAssistantPreferences();
    final session = await sessionStore.load();
    if (!mounted) return;

    setState(() {
      appState.assistantPreferences = assistantPreferences;
    });

    if (session == null) {
      setState(() => restoringSession = false);
      return;
    }

    apiClient.serverUrl = session.serverUrl;
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
    loadAssistantProfile(silent: true);
  }

  void updateServerUrl(String value) {
    setState(() {
      apiClient.serverUrl = value;
      appState.connectionState = NaraConnectionState.unknown;
      appState.connectionMessage = 'Connection needs to be checked';
      appState.lastConnectionCheck = null;
    });
    sessionStore.saveServerUrl(value);
  }

  void updateAuthToken(String? token) {
    setState(() {
      apiClient.authToken = token;
    });
  }

  void handleAuthenticated(Map<String, dynamic> user) {
    setState(() {
      currentUser = user;
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
    loadAssistantProfile();
  }

  void handleLogout() {
    setState(() {
      apiClient.logout();
      currentUser = null;
      selectedIndex = 0;
      appState.connectionState = NaraConnectionState.unknown;
      appState.connectionMessage = 'Signed out';
      appState.lastConnectionCheck = null;
      appState.tasks = [];
      appState.tasksError = null;
      appState.tasksLoading = false;
      appState.assistantLoading = false;
      appState.assistantSaving = false;
      appState.assistantError = null;
      appState.assistantMessage = null;
      appState.whatsappContact = null;
      appState.whatsappAccess = null;
    });
    sessionStore.clear();
  }

  Future<void> checkConnection({bool showChecking = true}) async {
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
        appState.connectionMessage = ok
            ? 'Connected to Nara server'
            : 'Server is reachable but needs attention';
        appState.lastConnectionCheck = DateTime.now();
      });
    } catch (error) {
      setState(() {
        appState.connectionState = NaraConnectionState.offline;
        appState.connectionMessage = 'Could not reach Nara server';
        appState.lastConnectionCheck = DateTime.now();
      });
    }
  }

  Future<void> loadTasks({bool silent = false}) async {
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

  Future<void> loadAssistantProfile({bool silent = false}) async {
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
            .where(
              (access) =>
                  access.userId == userId &&
                  access.contactId == whatsappContactId,
            )
            .toList();
        whatsappAccess = accessList.isEmpty ? null : accessList.first;
      }

      if (!mounted) return;
      setState(() {
        appState.whatsappContact = whatsappContact;
        appState.whatsappAccess = whatsappAccess;
      });
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

  Future<void> saveAssistantPreferences(
    NaraAssistantPreferences preferences,
  ) async {
    setState(() {
      appState.assistantPreferences = preferences;
      appState.assistantMessage = 'Assistant settings saved';
    });
    await sessionStore.saveAssistantPreferences(preferences);
  }

  Future<void> requestWhatsAppAccess(String rawNumber) async {
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

  Future<void> createTask(String title, String? description) async {
    setState(() {
      appState.tasksLoading = true;
      appState.tasksError = null;
    });

    try {
      final task = await apiClient.createTask(
        title: title,
        description: description,
      );
      setState(() {
        appState.tasks = [NaraTask.fromJson(task), ...appState.tasks];
      });
    } catch (error) {
      setState(() {
        appState.tasksError = 'Could not create task';
      });
      rethrow;
    } finally {
      setState(() {
        appState.tasksLoading = false;
      });
    }
  }

  Future<void> completeTask(String id) async {
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

  void openTab(int index) {
    setState(() => selectedIndex = index);
  }

  String? get activeUserId {
    final id = (currentUser ?? apiClient.currentUser)?['id']?.toString();
    if (id == null || id.isEmpty) return null;
    return id;
  }

  @override
  Widget build(BuildContext context) {
    final user = currentUser ?? apiClient.currentUser;
    final screens = [
      HomeScreen(
        state: appState,
        user: user,
        onRefreshConnection: checkConnection,
        onRefreshTasks: loadTasks,
        onRefreshAssistant: loadAssistantProfile,
        onOpenTasks: () => openTab(1),
        onAddTask: () => openTab(1),
        onOpenAssistant: () => openTab(3),
        onOpenSettings: () => openTab(4),
      ),
      TasksScreen(
        state: appState,
        onRefresh: loadTasks,
        onCreateTask: createTask,
        onCompleteTask: completeTask,
      ),
      RemindersScreen(apiClient: apiClient),
      AssistantScreen(
        state: appState,
        onRefresh: loadAssistantProfile,
        onSavePreferences: saveAssistantPreferences,
        onRequestWhatsAppAccess: requestWhatsAppAccess,
      ),
      SettingsScreen(
        apiClient: apiClient,
        state: appState,
        onServerUrlChanged: updateServerUrl,
        onTestConnection: checkConnection,
        onAuthTokenChanged: updateAuthToken,
        onLogout: handleLogout,
        user: user,
      ),
    ];

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Nara',
      theme: buildNaraTheme(),
      home: restoringSession
          ? const _SessionLoadingScreen()
          : user == null
              ? AuthScreen(
                  apiClient: apiClient,
                  onAuthenticated: handleAuthenticated,
                )
              : Scaffold(
                  body: SafeArea(child: screens[selectedIndex]),
                  bottomNavigationBar: NavigationBar(
                    selectedIndex: selectedIndex,
                    onDestinationSelected: (index) {
                      setState(() => selectedIndex = index);
                    },
                    destinations: const [
                      NavigationDestination(
                        icon: Icon(Icons.home_outlined),
                        selectedIcon: Icon(Icons.home),
                        label: 'Home',
                      ),
                      NavigationDestination(
                        icon: Icon(Icons.checklist_outlined),
                        selectedIcon: Icon(Icons.checklist),
                        label: 'Tasks',
                      ),
                      NavigationDestination(
                        icon: Icon(Icons.notifications_outlined),
                        selectedIcon: Icon(Icons.notifications),
                        label: 'Reminders',
                      ),
                      NavigationDestination(
                        icon: Icon(Icons.smart_toy_outlined),
                        selectedIcon: Icon(Icons.smart_toy),
                        label: 'Assistant',
                      ),
                      NavigationDestination(
                        icon: Icon(Icons.settings_outlined),
                        selectedIcon: Icon(Icons.settings),
                        label: 'Settings',
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _SessionLoadingScreen extends StatelessWidget {
  const _SessionLoadingScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Center(child: CircularProgressIndicator()),
      ),
    );
  }
}
