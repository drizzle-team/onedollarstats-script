import { Link } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function NestedDeep() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nested / Deep</Text>
      <Link href="/" style={styles.link} className="link-back">
        <Text>Go Home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  link: { marginTop: 10, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#007AFF', borderRadius: 8 },
});
