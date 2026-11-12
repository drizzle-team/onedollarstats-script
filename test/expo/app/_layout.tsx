import { Stack } from 'expo-router';
import { OneDollarStatsProvider, type ExpoAnalyticsConfig } from 'onedollarstats/expo';

// Two builds of this app (see package.json):
// - dist (port 8081): devmode on, /excluded filtered out
// - dist-prod (port 8082): no devmode, only /page-1 tracked automatically
//   (not '/': Expo matches by prefix, so '/' would include every page)
const config: ExpoAnalyticsConfig =
  process.env.EXPO_PUBLIC_TEST_BUILD === 'prod'
    ? { hostname: 'example.com', includePages: ['/page-1'] }
    : { hostname: 'example.com', devmode: true, excludePages: ['/excluded'] };

export default function RootLayout() {
  return (
    <OneDollarStatsProvider config={config}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </OneDollarStatsProvider>
  );
}
