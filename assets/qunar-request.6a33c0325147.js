/*
 * Shadowrocket request guard for publicly documented Qunar advertising qrt:
 * p_splashAd (fmz200/wool_scripts and zirawell/R-Store), home_notice_banner
 * (zirawell/R-Store). Preserve the supplied baseline's p_splash_ad alias.
 * Existing client/slugger transports plus the user's observed diplomat gateway
 * use the same exact-ID guard; the latter is compatibility coverage, unverified.
 * 2026-10-11: accept bounded UTF-8 binary/bodyBytes request bodies in JSC.
 * Only top-level operation identifiers are used; conflicting IDs or unknown
 * encodings pass through. No logs, network requests, cookies or persistence.
 */
(function () {
  var request = typeof $request === "object" && $request ? $request : {};
  var target = /^https?:\/\/(?:client|slugger|diplomat)\.qunar\.com(?::\d+)?\/(?:pitcher-proxy|slugger-proxy|fca)\/?(?:\?[^#]*)?$/;
  var url = String(request.url || "");
  var allowed = ["p_splashAd", "p_splash_ad", "home_notice_banner"];
  var ids = [];
  var invalid = false;
  function decode(value) { return decodeURIComponent(value.replace(/\+/g, " ")); }
  function parameters(text) {
    if (!text) return;
    text.split("&").forEach(function (item) {
      var parts = item.split("="), key = decode(parts.shift());
      if (key === "qrt") ids.push(decode(parts.join("=")));
    });
  }
  function identifier(document) {
    if (!document || typeof document !== "object" || Array.isArray(document)) return;
    if (Object.prototype.hasOwnProperty.call(document, "qrt")) {
      if (typeof document.qrt !== "string") invalid = true;
      else ids.push(document.qrt);
    }
  }
function bytesToUtf8(bytes) {
  var out = "";
  for (var i = 0; i < bytes.length;) {
    var first = bytes[i++], code, need, minimum;
    if (first < 128) { out += String.fromCharCode(first); continue; }
    if (first >= 194 && first <= 223) { code = first & 31; need = 1; minimum = 128; }
    else if (first >= 224 && first <= 239) { code = first & 15; need = 2; minimum = 2048; }
    else if (first >= 240 && first <= 244) { code = first & 7; need = 3; minimum = 65536; }
    else return null;
    if (i + need > bytes.length) return null;
    for (var j = 0; j < need; j += 1) {
      var next = bytes[i++];
      if ((next & 192) !== 128) return null;
      code = code * 64 + (next & 63);
    }
    if (code < minimum || code > 1114111 || (code >= 55296 && code <= 57343)) return null;
    if (code < 65536) out += String.fromCharCode(code);
    else { code -= 65536; out += String.fromCharCode(55296 + (code >> 10), 56320 + (code & 1023)); }
  }
  return out;
}
  function requestText(request) {
    var value = request.body === undefined ? request.bodyBytes : request.body;
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value.length <= 1024 * 1024 ? value : null;
    var bytes;
    if (value instanceof ArrayBuffer) bytes = new Uint8Array(value);
    else if (ArrayBuffer.isView(value)) bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    else if (Array.isArray(value) && value.every(function (v) { return Number.isInteger(v) && v >= 0 && v <= 255; })) bytes = new Uint8Array(value);
    else return null;
    if (bytes.length > 1024 * 1024) return null;
    return bytesToUtf8(bytes);
  }
  function topLevelQrtKeys(text) {
    var tokens = /"(?:\\.|[^"\\])*"|[{}\[\]:]/g;
    var depth = 0, count = 0, match;
    while ((match = tokens.exec(text))) {
      var token = match[0];
      if (token === "{" || token === "[") depth += 1;
      else if (token === "}" || token === "]") depth -= 1;
      else if (token.charAt(0) === '"' && depth === 1 && /^\s*:/.test(text.slice(tokens.lastIndex))) {
        if (JSON.parse(token) === "qrt") count += 1;
      }
    }
    return count;
  }
  try {
    if (!target.test(url)) return $done({});
    var query = url.indexOf("?");
    if (query !== -1) parameters(url.slice(query + 1));
    var body = requestText(request);
    if (body === null) return $done({});
    if (typeof body === "string" && body.trim()) {
      if (body.length > 1024 * 1024) return $done({});
      var trimmed = body.trim();
      if (/^[\[{]/.test(trimmed)) {
        // Duplicate JSON keys are ambiguous. Leave these requests unchanged.
        var keyCount = topLevelQrtKeys(trimmed);
        if (keyCount > 1) return $done({});
        var document = JSON.parse(trimmed);
        if (Array.isArray(document)) return $done({});
        identifier(document);
      } else if (!trimmed.startsWith("<")) parameters(trimmed);
      else return $done({});
    } else if (body && typeof body !== "string") return $done({});
    if (invalid || !ids.length || !ids.every(function (id) { return id === ids[0]; }) || allowed.indexOf(ids[0]) === -1) return $done({});
    if (ids[0] === "home_notice_banner") {
      // This advertising-only operation is rejected in the referenced module.
      return $done({response: {status: 404, headers: {"Content-Type": "text/plain; charset=utf-8"}, body: ""}});
    }
    return $done({response: {status: 200, headers: {"Content-Type": "application/json; charset=utf-8"},
      body: '{"bstatus":{"code":0,"des":"success"},"data":null}'}});
  } catch (_) { return $done({}); }
}());
