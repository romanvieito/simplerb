import mixpanel from "mixpanel-browser";

mixpanel.init("e770f3c726867ca8465d4c839e8a1236", {
  debug: true,
  track_pageview: false,
  persistence: "localStorage",
});

export default mixpanel;