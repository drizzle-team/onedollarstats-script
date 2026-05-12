import { useEffect } from 'react';
import { useAnalytics } from 'onedollarstats/expo';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function WithEvent() {
  const { event } = useAnalytics();

  useEffect(() => {
    event('page_load');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Custom Events</Text>
      <Pressable
        style={styles.button}
        onPress={() => event('button_click')}
      >
        <Text style={styles.buttonText} accessibilityRole="button">Fire Plain Event</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => event('signup', { plan: 'pro' })}
      >
        <Text style={styles.buttonText}>Fire Event With Props</Text>
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
