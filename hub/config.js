/* Deployment settings for the Kiln hub.
 * analyticsEndpoint: a URL that accepts POSTed JSON batches of play events
 * ({ app, v, events: [...] }). Leave empty to keep all data on the device.
 * Events are only sent when this is set AND the player turns on "Share anonymous play stats". */
window.KILN_CONFIG = {
  analyticsEndpoint: '',
};
