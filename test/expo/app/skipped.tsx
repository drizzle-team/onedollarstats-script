import { withAnalyticsPage } from 'onedollarstats/expo';
import { View, Text, StyleSheet } from 'react-native';

function Skipped() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Skipped Page</Text>
      <Text style={styles.body}>
        This page is wrapped with{' '}
        <Text style={styles.code}>withAnalyticsPage(C, {'{'} skip: true {'}'})</Text>. Navigating
        here does NOT fire an auto PageView. Check the dev console — there is no event log for{' '}
        <Text style={styles.code}>/skipped</Text>.
      </Text>
    </View>
  );
}

// `skip: true` excludes this page from auto-PageView and AppState refire.
// Manual useAnalytics().view()/event() calls would still fire — see /skipped-with-event.
export default withAnalyticsPage(Skipped, { skip: true });

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  body: { textAlign: 'center', marginBottom: 12 },
  code: { fontFamily: 'Courier', backgroundColor: '#eee', paddingHorizontal: 4 },
});
