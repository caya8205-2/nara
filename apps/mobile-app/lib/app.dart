import 'package:flutter/material.dart';

import 'core/services/api_client.dart';
import 'core/theme/nara_theme.dart';
import 'features/assistant/assistant_screen.dart';
import 'features/home/home_screen.dart';
import 'features/reminders/reminders_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/tasks/tasks_screen.dart';

class NaraMobileApp extends StatefulWidget {
  const NaraMobileApp({super.key});

  @override
  State<NaraMobileApp> createState() => _NaraMobileAppState();
}

class _NaraMobileAppState extends State<NaraMobileApp> {
  final NaraApiClient apiClient = NaraApiClient();
  int selectedIndex = 0;

  void updateServerUrl(String value) {
    setState(() {
      apiClient.serverUrl = value;
    });
  }

  void updateOperatorToken(String? token) {
    setState(() {
      apiClient.operatorToken = token;
    });
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeScreen(apiClient: apiClient),
      TasksScreen(apiClient: apiClient),
      RemindersScreen(apiClient: apiClient),
      AssistantScreen(apiClient: apiClient),
      SettingsScreen(
        apiClient: apiClient,
        onServerUrlChanged: updateServerUrl,
        onOperatorTokenChanged: updateOperatorToken,
      ),
    ];

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Nara',
      theme: buildNaraTheme(),
      home: Scaffold(
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
