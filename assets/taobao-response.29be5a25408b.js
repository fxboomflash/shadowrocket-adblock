/*
 * Shadowrocket: scoped Taobao startup advertising response cleanup.
 * Routes: guide-acs cloudvideo; known MTOP gateway aliases for shared startup
 * configs; PopLayer JSON templates. The cloudvideo scope is NOT broadened.
 * Schema references: pinned fmz200/wool_scripts, zirawell/R-Store, Keywos/rule.
 * Mixed MTOP responses: ONLY the published splash_home_base -> taobao-splash
 * placement is emptied; ordinary home sections and unknown fields are retained.
 * PopLayer is a general UI framework: ONLY templates with an explicit advertising
 * pageName are disabled. The fetched NPS survey template must remain untouched.
 * JSON / validated JSONP only. Unknown schemas, API errors and HTTP failures pass.
 * No network, storage, logging, request-body or credential-header access.
 * Local tests cannot establish iPhone request interception or rendering behavior.
 */
(function () {
  "use strict";
  function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  try {
    var request = typeof $request === "object" && $request ? $request : {};
    var response = typeof $response === "object" && $response ? $response : {};
    var method = String(request.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "POST") return $done({});
    var url = String(request.url || "");
    var mtop = /^https?:\/\/(?:acs|g-acs|guide-acs|h5api)\.m\.(?:goofish|taobao)\.com(?::(?:80|443))?\/(?:gw|h5)\/(mtop\.taobao\.(?:cloudvideo\.video\.query|wireless\.home\.newface\.awesome\.get|volvo\.secondfloor\.getconfig))(?:\/(\d+(?:\.\d+)*))?\/?(?:\?([^#]*))?$/.exec(url);
    if (mtop && mtop[1] === "mtop.taobao.cloudvideo.video.query" && !/^https?:\/\/guide-acs\.m\.taobao\.com(?::(?:80|443))?\/gw\//.test(url)) return $done({});
    var template = /^https?:\/\/poplayer\.template\.alibaba\.com(?::(?:80|443))?\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.json(?:\?([^#]*))?$/.exec(url);
    if ((!mtop && !template) || typeof response.body !== "string" || !response.body.length) return $done({});
    var status = response.statusCode === undefined ? response.status : response.statusCode;
    if (status !== undefined && String(status) !== "200" && !/^HTTP\/\S+ 200(?: |$)/.test(String(status))) return $done({});
    var query = mtop ? mtop[3] : template[1];
    var callbacks = [], formats = [], apiParams = [], versions = [];
    function decode(value) { return decodeURIComponent(value.replace(/\+/g, " ")); }
    if (query) query.split("&").forEach(function (part) {
      var pieces = part.split("="), key = decode(pieces.shift());
      if (key === "callback") callbacks.push(decode(pieces.join("=")));
      if (key === "type" || key === "dataType") formats.push(decode(pieces.join("=")).toLowerCase());
      if (key === "api") apiParams.push(decode(pieces.join("=")));
      if (key === "v") versions.push(decode(pieces.join("=")));
    });
    if (callbacks.length > 1 || formats.some(function (v) { return v !== "json" && v !== "originaljson" && v !== "jsonp"; })) return $done({});
    if (mtop && (apiParams.length > 1 || versions.length > 1 || (apiParams.length && apiParams[0] !== mtop[1]) ||
        (versions.length && !/^\d+(?:\.\d+)*$/.test(versions[0])) || (mtop[2] && versions.length && versions[0] !== mtop[2]))) return $done({});
    if (callbacks.length && !/^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(callbacks[0])) return $done({});
    var raw = response.body, prefix = "", suffix = "";
    if (callbacks.length || formats.indexOf("jsonp") !== -1) {
      if (!callbacks.length) return $done({});
      var wrapper = /^(\s*([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)\s*\()([\s\S]*)(\)\s*;?\s*)$/.exec(raw);
      if (!wrapper || wrapper[2] !== callbacks[0]) return $done({});
      prefix = wrapper[1]; raw = wrapper[3]; suffix = wrapper[4];
    }
    var body = JSON.parse(raw), changed = false;
    if (!object(body)) return $done({});
    function emptyArray(parent, key) {
      if (object(parent) && Array.isArray(parent[key]) && parent[key].length) {
        parent[key] = []; changed = true;
      }
    }
    // Decode only known structural nodes. Re-encode each modified string node
    // so other consumers keep exactly the same object-versus-string type.
    function editNode(parent, key, edit) {
      if (!object(parent)) return;
      var node = parent[key], encoded = typeof node === "string";
      if (encoded) { try { node = JSON.parse(node); } catch (_) { return; } }
      if (!object(node)) return;
      var before = JSON.stringify(node);
      edit(node);
      if (JSON.stringify(node) !== before) {
        if (encoded) parent[key] = JSON.stringify(node);
        changed = true;
      }
    }
    if (mtop) {
      var data = body.data, encodedData = typeof data === "string";
      if (encodedData) { try { data = JSON.parse(data); } catch (_) { return $done({}); } }
      if (body.api !== mtop[1] || !object(data) || !Array.isArray(body.ret) || !body.ret.length ||
          !body.ret.every(function (v) { return typeof v === "string" && v.indexOf("SUCCESS::") === 0; })) return $done({});
      if (own(body, "v") && (typeof body.v !== "string" || (mtop[2] && body.v !== mtop[2]))) return $done({});
      if (mtop[1] === "mtop.taobao.cloudvideo.video.query") {
        // Keep this legacy video handler confined to the published guide-acs host.
        if ((typeof data.duration === "number" || typeof data.duration === "string") && isFinite(Number(data.duration)) && Number(data.duration) > 0) {
          data.duration = typeof data.duration === "string" ? "0" : 0; changed = true;
        }
        emptyArray(data, "resources"); emptyArray(data, "caches");
        if (typeof data.respTimeInMs === "number" || typeof data.respTimeInMs === "string") {
          var future = typeof data.respTimeInMs === "string" ? "3818332800000" : 3818332800000;
          if (data.respTimeInMs !== future) { data.respTimeInMs = future; changed = true; }
        }
      } else {
        editNode(data,"containers",function (containers) {
          editNode(containers,"splash_home_base",function (container) {
            editNode(container,"base",function (base) {
              var sections = base.sections, encodedSections = typeof sections === "string";
              if (encodedSections) { try { sections = JSON.parse(sections); } catch (_) { return; } }
              if (!Array.isArray(sections)) return;
              var beforeSections = JSON.stringify(sections);
              sections.forEach(function (section) {
                editNode(section,"bizData",function (bizData) {
                  editNode(bizData,"taobao-splash",function (slot) {
                    if (typeof slot.data === "string") {
                      var entries;
                      try { entries = JSON.parse(slot.data); } catch (_) { return; }
                      if (Array.isArray(entries) && entries.length) { slot.data = "[]"; changed = true; }
                    } else emptyArray(slot,"data");
                  });
                });
              });
              if (encodedSections && JSON.stringify(sections) !== beforeSections) base.sections = JSON.stringify(sections);
            });
          });
        });
      }
    } else {
      // Never infer advertising merely from a full-screen image, URL, or UI shape.
      // In particular, NPS surveys / privacy / update dialogs have no ad marker.
      if (typeof body.pageName !== "string" || !/(?:广告|商业推广|开屏|(?:^|[\s_-])(?:advertisement|splash(?:[_-]?ads?)?)(?:$|[\s_-]))/i.test(body.pageName)) return $done({});
      if (/(?:无广告|没有广告|去广告|隐私|权限|更新|调研|登录|支付|订单|验证码|实名|风控|survey|consent|privacy|permission|login|payment)/i.test(body.pageName)) return $done({});
      var config = object(body.configData) && body.configData;
      if (!config || !(Array.isArray(config.component) || Array.isArray(config.pages))) return $done({});
      if (own(body, "enable") && body.enable !== true && body.enable !== false) return $done({});
      if (body.enable !== false) { body.enable = false; changed = true; }
      emptyArray(config, "component"); emptyArray(config, "pages");
      emptyArray(body.res, "images"); emptyArray(body.res, "videos");
      emptyArray(body.mainRes, "images");
    }
    if (changed && mtop && encodedData) body.data = JSON.stringify(data);
    return changed ? $done({body: prefix + JSON.stringify(body) + suffix}) : $done({});
  } catch (_) { return $done({}); }
}());
