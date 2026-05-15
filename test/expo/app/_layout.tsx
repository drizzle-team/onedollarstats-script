import { Stack } from 'expo-router';
import { OneDollarStatsProvider } from 'onedollarstats/expo';

export default function RootLayout() {
  return (
    <OneDollarStatsProvider config={{ hostname: 'example.com', devmode: true }}>
      <Stack screenOptions={{ headerShown: false }} />
    </OneDollarStatsProvider>
  );
}
