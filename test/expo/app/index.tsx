import { Link } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Link href="/page-1" style={styles.link} className="link">
        <Text>Go to Page 1</Text>
      </Link>
      <Link href="/page-2" style={styles.link} className="link-2">
        <Text>Go to Page 2</Text>
      </Link>
      <Link href="/with-event" style={styles.link} className="link-with-event">
        <Text>Custom Events</Text>
      </Link>
      <Link href="/manual-view" style={styles.link} className="link-manual-view">
        <Text>Manual View</Text>
      </Link>
      <Link href="/nested/deep" style={styles.link} className="link-deep">
        <Text>Nested Page</Text>
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
