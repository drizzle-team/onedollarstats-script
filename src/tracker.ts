// Entry for the legacy https://assets.onedollarstats.com/tracker.js URL.
// Ships the current stonks.js script, plus the window.trackCustomEvent(name, props)
// global that the old tracker.js exposed, so sites still calling it keep working.
import "./script";

window.trackCustomEvent = (name: string, props?: Record<string, string>) => window.stonks?.event(name, props);
