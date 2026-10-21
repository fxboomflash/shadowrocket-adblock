/*
 * Shadowrocket: local fallback for seven dedicated MTOP advertising operations.
 * Common verified JSON versions are answered by native Map Local in the module.
 * This script handles JSONP, unusual parameter encodings and version variants.
 * APIs: Thelongdarkorg/loon-plugins, fmz200/wool_scripts, zirawell/R-Store.
 * Empty adMap/dspList: the previously reviewed Goofish response schema.
 * Taobao splash_home_base: the published taobao.js / myBlockAds.js schema.
 * Goofish launch report / scene restore: skernelx/SurgeScripts,
 * xianyu/xianyu-ad-block.js at 406d5947e76299206ad0007cfc913f6ad6c95f0d.
 * Protocol envelope: preserves the API/version and a valid JSONP callback.
 * Does not inspect request bodies, credentials, cookies, or persistent data.
 * For H5 JSON only, reads the non-secret Origin header to preserve CORS.
 * No outbound requests, logging, tracking, or third-party forwarding.
 */
(function () {
  "use strict";
  try {
    var request = typeof $request === "object" && $request ? $request : {};
    var method = String(request.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "POST") return $done({});
    var match = /^https?:\/\/(?:acs|g-acs|guide-acs|h5api)\.m\.(?:goofish|taobao)\.com(?::(?:80|443))?\/(?:gw|h5)\/(mtop\.taobao\.idlecommerce\.splash\.(?:async\.)?ads|mtop\.taobao\.wireless\.home\.splash\.awesome\.get|mtop\.idle\.idleadv\.(?:app\.launch\.report|scene\.restore)|mtop\.alibaba\.advertisementservice\.getadv|mtop\.o2o\.ad\.gateway\.get)(?:\/(\d+(?:\.\d+)*))?\/?(?:\?([^#]*))?$/.exec(String(request.url || ""));
    if (!match) return $done({});
    var callbacks = [], formats = [], apiParams = [], versions = [];
    function decode(value) { return decodeURIComponent(value.replace(/\+/g, " ")); }
    if (match[3]) match[3].split("&").forEach(function (part) {
      var pieces = part.split("="), rawKey = pieces.shift();
      var key = decode(rawKey);
      if (key === "callback") callbacks.push(decode(pieces.join("=")));
      if (key === "type" || key === "dataType") formats.push(decode(pieces.join("=")).toLowerCase());
      if (key === "api") apiParams.push(decode(pieces.join("=")));
      if (key === "v") versions.push(decode(pieces.join("=")));
    });
    if (callbacks.length > 1 || formats.some(function (value) { return value !== "json" && value !== "originaljson" && value !== "jsonp"; })) return $done({});
    if (callbacks.length && !/^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(callbacks[0])) return $done({});
    if (!callbacks.length && formats.indexOf("jsonp") !== -1) return $done({});
    if (apiParams.length > 1 || versions.length > 1 || (apiParams.length && apiParams[0] !== match[1]) ||
        (versions.length && !/^\d+(?:\.\d+)*$/.test(versions[0])) ||
        (match[2] && versions.length && versions[0] !== match[2])) return $done({});
    var data;
    if (match[1] === "mtop.taobao.wireless.home.splash.awesome.get") {
      data = {containers: {splash_home_base: {base: {sections: []}}}};
    } else if (match[1] === "mtop.idle.idleadv.app.launch.report") {
      data = {attributeSuccess: "false"};
    } else if (match[1] === "mtop.idle.idleadv.scene.restore") {
      data = {trackParams: {stageMatch: "false"}};
    } else if (match[1] === "mtop.alibaba.advertisementservice.getadv" || match[1] === "mtop.o2o.ad.gateway.get") {
      data = {};
    } else {
      data = {adMap: {}, dspList: []};
    }
    var defaultVersion = match[1] === "mtop.taobao.idlecommerce.splash.ads" ? "2.0" : "1.0";
    var body = JSON.stringify({api: match[1], v: match[2] || versions[0] || defaultVersion, ret: ["SUCCESS::调用成功"], data: data});
    if (callbacks.length) body = callbacks[0] + "(" + body + ");";
    var headers = {
      "Content-Type": callbacks.length ? "application/javascript; charset=utf-8" : "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0"
    };
    var browserRoute = /^https?:\/\/[^/]+\/h5\//.test(String(request.url || "")) ||
      /^https?:\/\/h5api\.m\.(?:goofish|taobao)\.com(?::(?:80|443))?\//.test(String(request.url || ""));
    if (!callbacks.length && browserRoute) {
      var inputHeaders = request.headers || {}, origin = inputHeaders.Origin || inputHeaders.origin;
      if (typeof origin === "string" && /^https?:\/\/(?:[A-Za-z0-9-]+\.)*(?:goofish|taobao|tmall)\.com(?::(?:80|443))?$/.test(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Access-Control-Allow-Credentials"] = "true";
        headers.Vary = "Origin";
      }
    }
    return $done({response: {
      status: 200,
      headers: headers,
      body: body
    }});
  } catch (_) { return $done({}); }
}());
