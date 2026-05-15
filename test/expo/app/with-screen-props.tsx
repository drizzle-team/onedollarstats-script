import { useAnalyticsProps, useAnalytics } from 'onedollarstats/expo';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function WithScreenProps() {
  useAnalyticsProps({ section: 'admin' });
  const { event } = useAnalytics();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Screen Props</Text>
      <Pressable style={styles.button} onPress={() => event('cta_click', { extra: 'x' })}>
        <Text style={styles.buttonText} accessibilityRole="button">Fire Event</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  button: {
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  buttonText: { color: 'white' },
});
