import { useAnalytics } from 'onedollarstats/expo';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function ManualView() {
  const { view } = useAnalytics();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manual View</Text>
      <Pressable
        style={styles.button}
        onPress={() => view('/custom-path')}
      >
        <Text style={styles.buttonText} accessibilityRole="button">Send Custom Path</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => view(undefined, { campaign: 'spring' })}
      >
        <Text style={styles.buttonText}>Send View With Props</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => view('/landing', { campaign: 'summer' })}
      >
        <Text style={styles.buttonText}>Send Path And Props</Text>
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
