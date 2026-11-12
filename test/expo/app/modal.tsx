import { router } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';

// Presented as a modal by the root Stack
export default function Modal() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modal</Text>
      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Close Modal</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  button: { marginTop: 10, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#007AFF', borderRadius: 8 },
  buttonText: { color: 'white' },
});
