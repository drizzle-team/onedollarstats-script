import { useLocalSearchParams } from 'expo-router';
import { View } from 'onedollarstats/expo';
import { View, Text, StyleSheet } from 'react-native';

export default function Profile() {
  useAnalyticsPath('/profile/[id]');
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text className="profile-id">Viewing profile: {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});
