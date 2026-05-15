import { Link } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function Page2() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page 2</Text>
      <Link href="/" style={styles.link} className="link-back">
        <Text>Go Home</Text>
      </Link>
      <Link href="/page-1" style={styles.link} className="link-1">
        <Text>Go to Page 1</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  link: {
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
});
