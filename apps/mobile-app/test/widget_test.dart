import 'package:flutter_test/flutter_test.dart';
import 'package:nara_mobile_app/app.dart';

void main() {
  testWidgets('renders Nara mobile shell', (tester) async {
    await tester.pumpWidget(const NaraMobileApp());

    expect(find.text('Today'), findsOneWidget);
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Tasks'), findsOneWidget);
    expect(find.text('Reminders'), findsOneWidget);
    expect(find.text('Assistant'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
  });
}
