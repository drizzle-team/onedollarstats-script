import { useAnalytics, withAnalyticsPage } from "onedollarstats/expo";
import { Pressable, StyleSheet, Text, View } from "react-native";

function Page() {
  const { event, view } = useAnalytics();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Skipped + Manual</Text>
      <Text style={styles.body}>
        Auto PageView is suppressed (skip: true). The buttons below fire manual
        events that <Text style={styles.bold}>still work</Text> — skip only
        blocks automatic tracking.
      </Text>
      <Pressable
        style={styles.button}
        onPress={() => event("manual_cta_click")}
      >
        <Text style={styles.buttonText}>Fire manual event</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => view()}>
        <Text style={styles.buttonText}>Fire manual view</Text>
      </Pressable>
    </View>
  );
}

export default withAnalyticsPage(Page, {
  skip: true,
  path: "/skipped-with-event",
  props: { section: "skipped" },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  body: { textAlign: "center", marginBottom: 16 },
  bold: { fontWeight: "bold" },
  button: {
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  buttonText: { color: "white" },
});
