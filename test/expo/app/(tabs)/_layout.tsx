import { Tabs } from 'expo-router';

// The (tabs) group isn't part of the URL: screens live at /feed and /inbox
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="feed" options={{ title: 'Feed Tab' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox Tab' }} />
    </Tabs>
  );
}
