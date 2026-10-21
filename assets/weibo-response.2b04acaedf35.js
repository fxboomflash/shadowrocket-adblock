// Splash-only schema reference: zmqcherish/proxy-script
// @ 1d9f51bc9a0077d81998bb503ee6158ca83faa73, weibo_launch.js.
// Independently scoped cleanup, with malformed-response pass-through.
(function () {
  "use strict";
  var url = $request && $request.url || "";
  var sdk = /^https?:\/\/(?:sdk|wb)app\.uve\.weibo\.com\/interface\/sdk\/sdkad\.php(?:\?|$)/;
  var pull = /^https?:\/\/(?:sdk|wb)app\.uve\.weibo\.com\/wbapplua\/wbpullad\.lua(?:\?|$)/;
  function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
  try {
    var text = $response.body;
    if (typeof text !== "string" || (!sdk.test(url) && !pull.test(url))) return $done({});
    var match = sdk.test(url) ? text.match(/\{[\s\S]*\}/) : null;
    if (sdk.test(url) && !match) return $done({});
    var body = JSON.parse(match ? match[0] : text);
    if (!object(body)) return $done({});
    if (sdk.test(url)) {
      if (Array.isArray(body.ads)) body.ads = [];
      if (typeof body.background_delay_display_time === "number") body.background_delay_display_time = 86400000;
      if (typeof body.background_delay_display_time === "string") body.background_delay_display_time = "86400000";
      if (Object.prototype.hasOwnProperty.call(body, "show_push_splash_ad")) body.show_push_splash_ad = false;
      $done({body: JSON.stringify(body) + "OK"});
    } else {
      if (object(body.cached_ad) && Array.isArray(body.cached_ad.ads)) body.cached_ad.ads = [];
      $done({body: JSON.stringify(body)});
    }
  } catch (_) { $done({}); }
})();
