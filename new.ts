import Analytics from "onedollarstats";

const analytics = Analytics({
  trackLocalhostAs: "my-app.com",
  collectorUrl: "https://collector.onedollarstats.com/events",
  hashRouting: true,
  autocollect: true,
  excludePages: ["/analytics/*", "/login"],
  includePages: ["/products/*", "/pricing", "/"],
});
