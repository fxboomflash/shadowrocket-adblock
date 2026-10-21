/*
 * Shadowrocket: Goofish advertising MTOP responses only.
 * Based on fmz200/wool_scripts, ddgksf2013/Rewrite, zirawell/R-Store,
 * LazingLuo/LazingLuo_Loon-Rules and VME98/jinx-rules.
 * Frozen reference URLs and hashes: references/download-manifest.json.
 * Preserves failure responses, ordinary API calls and functional BIZ_ strategies.
 * Local behavior checks do not constitute an iPhone runtime test.
 */
(function () {
  function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
  var families = {
    "mtop.taobao.idlecommerce.splash.ads": "splash",
    "mtop.taobao.idlecommerce.splash.async.ads": "splash",
    "mtop.taobao.idle.user.strategy.list": "strategy",
    "mtop.taobao.idle.live.home.ads.material.get": "dedicated",
    "mtop.taobao.idle.group.myself.banner": "banner",
    "mtop.taobao.idle.circle.myself.banner": "banner",
    "mtop.taobao.idle.home.welcome": "dedicated"
  };
  try {
    var request = typeof $request === "object" && $request ? $request : {};
    var response = typeof $response === "object" && $response ? $response : {};
    var match = /^https?:\/\/(?:acs|g-acs|guide-acs)\.m\.(?:goofish|taobao)\.com(?::(?:80|443))?\/gw\/([a-z0-9.]+)\/(\d+(?:\.\d+)*)\/?(?:\?.*)?$/.exec(String(request.url || ""));
    if (!match || !Object.prototype.hasOwnProperty.call(families, match[1]) || typeof response.body !== "string") return $done({});
    var status = response.statusCode === undefined ? response.status : response.statusCode;
    if (status !== undefined && String(status) !== "200" && !/^HTTP\/\S+ 200(?: |$)/.test(String(status))) return $done({});
    var body = JSON.parse(response.body);
    if (!object(body) || body.api !== match[1] || !Array.isArray(body.ret) || body.ret.length === 0 ||
        !body.ret.every(function (value) { return typeof value === "string" && value.indexOf("SUCCESS::") === 0; }) || !object(body.data)) return $done({});
    if (body.v !== undefined && (typeof body.v !== "string" || body.v !== match[2])) return $done({});
    var changed = false;
    switch (families[match[1]]) {
      case "splash":
        if (object(body.data.adMap) && Object.keys(body.data.adMap).length) { body.data.adMap = {}; changed = true; }
        if (Array.isArray(body.data.dspList) && body.data.dspList.length) { body.data.dspList = []; changed = true; }
        break;
      case "strategy":
        // Only the four published commercial placement types are removed.
        // BIZ_ entries, unknown types, and untyped future metadata are preserved.
        // Reference: skernelx/SurgeScripts, xianyu/xianyu-ad-block.js.
        if (Array.isArray(body.data.strategies) && body.data.strategies.every(object)) {
          var adTypes = ["FLOAT_LAYER", "POPUP", "MODAL", "BANNER"];
          var kept = body.data.strategies.filter(function (entry) { return adTypes.indexOf(entry.type) === -1; });
          if (kept.length !== body.data.strategies.length) { body.data.strategies = kept; changed = true; }
        }
        break;
      case "banner":
        if (Array.isArray(body.data.bannerList) && body.data.bannerList.length) { body.data.bannerList = []; changed = true; }
        break;
      case "dedicated":
        if (Object.keys(body.data).length) { body.data = {}; changed = true; }
        break;
    }
    return changed ? $done({body: JSON.stringify(body)}) : $done({});
  } catch (_) { return $done({}); }
}());
