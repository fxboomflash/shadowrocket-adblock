// Shadowrocket: known Cainiao ad APIs only; preserves parcels, pickup and account metadata.
// Schema references: fmz200/wool_scripts@5d5f63fcf98bc69d5f8f1b1bae6f86a01ee4bb97,
// Scripts/cainiao/cainiao.js; ForestofTime/Surge@716d498496b57796e7a2b8845666e58477ea20ab,
// JS/CainiaoMiniProgram.js (field evidence only; no HTTPDNS or transport changes copied).
(function () {
  function object(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
  function commercial(item) {
    if (!object(item) || !object(item.materialContentMapper)) return false;
    var m = item.materialContentMapper;
    if (m.adItemDetail || ["common_header_banner", "entertainment", "interests", "kuaishou_banner"].indexOf(m.group_id) !== -1) return true;
    var keys = Object.keys(m).map(function (k) { return k.toLowerCase(); });
    return keys.some(function (k) { return k.indexOf("floatview") === 0; }) ||
      (keys.indexOf("image") !== -1 && keys.indexOf("link") !== -1) ||
      (keys.indexOf("mainpic") !== -1 && keys.indexOf("btnpic") !== -1 && keys.indexOf("link") !== -1);
  }
  try {
    var route = /^https?:\/\/(?:cn-acs\.m\.cainiao\.com|netflow-(?:reply-)?mtop\.cainiao\.com|(?:guide-acs|acs|acs4miniapp-inner|guide-acs4miniapp-inner)\.m\.taobao\.com)(?::(?:80|443))?\/gw\/(mtop\.cainiao\.guoguo\.nbnetflow\.ads\.(mshow(?:\.cn)?|show(?:\.(?:cn|login))?|batch\.show(?:\.v2)?(?:\.cn)?))(?:\/|\?|$)/.exec(String($request.url || ""));
    if (!route || typeof $response.body !== "string") return $done({});
    var body = JSON.parse($response.body);
    if (!object(body) || !object(body.data)) return $done({});
    if (typeof body.api === "string" && body.api.toLowerCase() !== route[1].toLowerCase()) return $done({});
    if (Array.isArray(body.ret) && !body.ret.some(function (v) { return typeof v === "string" && v.indexOf("SUCCESS::") === 0; })) return $done({});
    var data = body.data;
    var changed = false;
    function filterAds(array) {
      var kept = array.filter(function (item) { return !commercial(item); });
      if (kept.length !== array.length) changed = true;
      return kept;
    }
    if (route[2].indexOf("mshow") === 0) {
      // Only the explicitly documented advertising/product-promotion placements.
      ["10", "498", "1316", "1638"].forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(data, key)) { delete data[key]; changed = true; }
      });
      Object.keys(data).forEach(function (key) {
        if (/^\d+$/.test(key) && Array.isArray(data[key])) data[key] = filterAds(data[key]);
      });
    } else if (route[2].indexOf("batch.show") === 0) {
      Object.keys(data).forEach(function (key) {
        if (/^\d+$/.test(key) && Array.isArray(data[key]) && data[key].length) { data[key] = []; changed = true; }
      });
    } else if (Array.isArray(data.result)) {
      data.result = filterAds(data.result);
    }
    console.log("[SR-ads-v3] Cainiao " + route[2] + " " + (changed ? "cleaned" : "unchanged"));
    $done(changed ? {body: JSON.stringify(body)} : {});
  } catch (_) { $done({}); }
}());
