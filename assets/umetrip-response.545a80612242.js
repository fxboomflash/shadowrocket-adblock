/*
 * Umetrip response cleanup adapted for Shadowrocket 2.2.92.
 * 2026-10-11: warm-start markers and explicit splash JSON inside field 7.
 * Protobuf schema/handlers: ddgksf2013, UmetripAds.conf 2026-10-05 V1.0.3
 * https://ddgksf2013.top/scripts/umetrip.ads.js
 * Source SHA256: f1a37c300126b1bd64451261207a9166ee2aad77a3e79705a0f5c24229aef46e
 * Legacy ad rpid set: zirawell/R-Store and fmz200/wool_scripts.
 * Adaptation: binary-body-mode/body API, JSON entry point, strict URL and ID
 * boundaries, duplicate-ID conflicts, malformed/error-response passthrough,
 * preservation of ordinary travel guides/coupons. No network, storage or logs.
 */
(function () {
const EMPTY_RPIDS=new Set(["1000019","1420002","1120000","1430064","1120002","1130016"]),HOME_RPID="1000002",WATERFALL_RPID="1000029",TRIP_BANNER_RPID="1370126",FAMILY_RPID="1370279",HISTORY_RPID="1011058",MINE_RPID="1100001",FLIGHT_RPID="1060060",EMPTY_PAYLOAD=new Uint8Array([10,0,16,0,32,0]),MINE_PROMOTION_NAMES=["我的页面-会员卡片V3","我的页-腰部banner第四帧",],MINE_PROMOTION_GROUP_IDS=new Set([111402,111403,111404]);function readVarint(bytes, pos) {
  var value = 0, safe = true;
  for (var i = 0; i < 10 && pos < bytes.length; i += 1) {
    var byte = bytes[pos++];
    if (i === 9 && byte > 1) return null;
    value += (byte & 127) * Math.pow(2, i * 7);
    if (!Number.isSafeInteger(value)) safe = false;
    if (!(byte & 128)) return {value: value, pos: pos, safe: safe};
  }
  return null;
}
function encodeVarint(e){let t=[],r=e;for(;r>=128;)t.push(r%128|128),r=Math.floor(r/128);return t.push(r),new Uint8Array(t)}function concatBytes(e){let t=0;for(let r of e)t+=r.length;let n=new Uint8Array(t),o=0;for(let i of e)n.set(i,o),o+=i.length;return n}function parseMessage(e){try{let t=0,r=[];for(;t<e.length;){let n=t,o=readVarint(e,t);if(!o||!o.safe)return null;let i=o.value;t=o.pos;let a=Math.floor(i/8),s=7&i;if(0===a||a>536870911||![0,1,2,5].includes(s))return null;if(0===s){let l=readVarint(e,t);if(!l)return null;t=l.pos,r.push({field:a,wire:s,raw:e.slice(n,t)});continue}if(1===s){if(t+8>e.length)return null;t+=8,r.push({field:a,wire:s,raw:e.slice(n,t)});continue}if(5===s){if(t+4>e.length)return null;t+=4,r.push({field:a,wire:s,raw:e.slice(n,t)});continue}let c=readVarint(e,t);if(!c||!c.safe)return null;let u=c.value;if(t=c.pos,u<0||t+u>e.length)return null;let d=e.slice(t,t+u);t+=u,r.push({field:a,wire:s,raw:e.slice(n,t),data:d,dirty:!1})}return r}catch(f){return null}}function encodeMessage(e){let t=[];for(let r of e)2===r.wire&&r.dirty?(t.push(encodeVarint(8*r.field+2)),t.push(encodeVarint(r.data.length)),t.push(r.data)):t.push(r.raw);return concatBytes(t)}function utf8Bytes(e){let t=[];for(let r=0;r<e.length;r++){let n=e.charCodeAt(r);n<128?t.push(n):n<2048?(t.push(192|n>>6),t.push(128|63&n)):n>=55296&&n<=56319&&r+1<e.length?(n=65536+(n-55296<<10)+(e.charCodeAt(++r)-56320),t.push(240|n>>18),t.push(128|n>>12&63),t.push(128|n>>6&63),t.push(128|63&n)):(t.push(224|n>>12),t.push(128|n>>6&63),t.push(128|63&n))}return new Uint8Array(t)}function bytesContains(e,t){let r="string"==typeof t?utf8Bytes(t):t;if(!r.length||r.length>e.length)return!1;outer:for(let n=0;n<=e.length-r.length;n++){for(let o=0;o<r.length;o++)if(e[n+o]!==r[o])continue outer;return!0}return!1}function containsAny(e,t){for(let r of t)if(bytesContains(e,r))return!0;return!1}function bytesEqualAscii(e,t){if(!e||e.length!==t.length)return!1;for(let r=0;r<t.length;r++)if(e[r]!==t.charCodeAt(r))return!1;return!0}function directFieldEqualsAscii(e,t,r){return!!e&&e.some(e=>e.field===t&&2===e.wire&&bytesEqualAscii(e.data,r))}function directFieldAscii(e,t){if(!e)return null;for(let r of e){if(r.field!==t||2!==r.wire)continue;let n="";for(let o of r.data){if(o<32||o>126)return null;n+=String.fromCharCode(o)}return n}return null}function bytesToUtf8(bytes) {
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
function replaceTopField7(e,t){let r=parseMessage(e);if(!r)return{bytes:e,count:0};let n=!1;for(let o of r)7===o.field&&2===o.wire&&(o.data=t,o.dirty=!0,n=!0);return{bytes:n?encodeMessage(r):e,count:n?1:0}}function removeMatchingNodes(e,t,r=0){if(r>12)return{bytes:e,count:0};let n=parseMessage(e);if(!n)return{bytes:e,count:0};let o=[],i=0,a=!1;for(let s of n){let l=s;if(2===l.wire){let c=parseMessage(l.data);if(t(l.field,l.data,c)){i++,a=!0;continue}if(c){let u=removeMatchingNodes(l.data,t,r+1);u.count>0&&(l={...l,data:u.bytes,dirty:!0},i+=u.count,a=!0)}}o.push(l)}return{bytes:a?encodeMessage(o):e,count:i}}function transformTopField7(e,t){let r=parseMessage(e);if(!r)return{bytes:e,count:0};let n=!1,o=0;for(let i of r){if(7!==i.field||2!==i.wire)continue;let a=t(i.data);(a.count>0||a.bytes!==i.data)&&(i.data=a.bytes,i.dirty=!0,o+=a.count,n=!0)}return{bytes:n?encodeMessage(r):e,count:o}}function jsonFromBytes(e){let t=bytesToUtf8(e);if(!t||"{"!==t[0]&&"["!==t[0])return null;try{return JSON.parse(t)}catch(r){return null}}function directCardNameMatches(e,t){if(!e)return!1;for(let r of e){if(8!==r.field||2!==r.wire)continue;let n=parseMessage(r.data);if(n)for(let o of n){if(3!==o.field||2!==o.wire)continue;let i=bytesToUtf8(o.data);if(i&&-1!==t.indexOf(i))return!0}}return!1}function directCardJsonMatches(e,t){if(!e)return!1;for(let r of e){if(8!==r.field||2!==r.wire)continue;let n=parseMessage(r.data);if(n)for(let o of n){if(7!==o.field||2!==o.wire)continue;let i=jsonFromBytes(o.data);if(i&&t(i))return!0}}return!1}function isHomePromotionCard(e){if(!e||"object"!=typeof e)return!1;let t=String(e.serviceTrack||""),r=String(e.serviceName||""),n="";try{n=JSON.stringify(e)}catch(o){}return/^advert_/i.test(t)||/\/fs\/advert\//i.test(n)||/"advertId"\s*:/i.test(n)||r.includes("广告位-")||r.includes("娱乐运营活动")}function isHomePromotionGroup(e){if(!e||"object"!=typeof e)return!1;let t=Number(e.groupStyle),r=String(e.dataSource||"").toUpperCase(),n=String(e.groupTitle||e.title||"");return"ADVERT"===r||1009===t||"中秋国庆活动"===n}function cleanHomeJsonObject(e){let t=!1;if(Array.isArray(e)){for(let r of e)t=cleanHomeJsonObject(r)||t;return t}if(!e||"object"!=typeof e)return!1;if(Array.isArray(e.groupList)){let n=e.groupList.length;e.groupList=e.groupList.filter(e=>!isHomePromotionGroup(e)),t=e.groupList.length!==n||t}if(Array.isArray(e.cardList)){let o=e.cardList.length;e.cardList=e.cardList.filter(e=>!isHomePromotionCard(e)),t=e.cardList.length!==o||t}for(let i of Object.keys(e))t=cleanHomeJsonObject(e[i])||t;return t}function rewriteJsonFields(e,t,r=0){if(r>12)return{bytes:e,count:0};let n=parseMessage(e);if(!n)return{bytes:e,count:0};let o=!1,i=0;for(let a of n){if(2!==a.wire)continue;let s=!1;if(a.data.length>=2&&(123===a.data[0]||91===a.data[0])){let l=bytesToUtf8(a.data);if(l)try{let c=JSON.parse(l);t(c)&&(a.data=utf8Bytes(JSON.stringify(c)),a.dirty=!0,o=!0,i++,s=!0)}catch(u){}}if(!s&&parseMessage(a.data)){let d=rewriteJsonFields(a.data,t,r+1);d.count>0&&(a.data=d.bytes,a.dirty=!0,o=!0,i+=d.count)}}return{bytes:o?encodeMessage(n):e,count:i}}function cleanHomePayload(e){let t=["机上闭门购虚拟卡片","机上内购-weex包更新虚拟卡片","无行程机票直销卡片8.4.7","中秋国庆活动","回归礼包_无行程首页底部条",],r=removeMatchingNodes(e,(e,r,n)=>5===e&&!!n&&(!!(directFieldEqualsAscii(n,37,"ADVERT")||directCardNameMatches(n,t))||directCardJsonMatches(n,e=>e&&-1!==[111450,111353].indexOf(Number(e.groupId))))),n=rewriteJsonFields(r.bytes,cleanHomeJsonObject);return{bytes:n.bytes,count:r.count+n.count}}function cleanWaterfallPayload(e){let t=["瀑布流_特价机票","瀑布流_酒店","瀑布流_租车卡片","瀑布流_权益",];return removeMatchingNodes(e,(e,r)=>8===e&&containsAny(r,t))}function cleanTripBannerPayload(e){return removeMatchingNodes(e,(e,t)=>8===e&&(bytesContains(t,"付费会员")||bytesContains(t,"更早历史行程待解锁")))}function cleanHistoryPayload(e){return removeMatchingNodes(e,(e,t)=>11===e&&bytesContains(t,"历史行程容量剩余")&&bytesContains(t,"付费会员"))}function cleanFlightPayload(e){return removeMatchingNodes(e,(e,t)=>12===e&&bytesContains(t,"付费会员"))}function cleanFamilyMessage(e,t=0){if(t>12)return{bytes:e,count:0};let r=parseMessage(e);if(!r)return{bytes:e,count:0};let n=r.some(e=>1===e.field&&2===e.wire&&bytesContains(e.data,"可免费试用30天")&&bytesContains(e.data,"payMember")),o=r.some(e=>2===e.field&&2===e.wire&&bytesContains(e.data,"添加家人并开启守护")&&bytesContains(e.data,"payMember"));if(n&&o){let i=[],a=0;for(let s of r){let l=1===s.field&&2===s.wire&&bytesContains(s.data,"可免费试用30天")&&bytesContains(s.data,"payMember"),c=2===s.field&&2===s.wire&&bytesContains(s.data,"添加家人并开启守护")&&bytesContains(s.data,"payMember");if(l||c){a++;continue}i.push(s)}return{bytes:encodeMessage(i),count:a}}let u=!1,d=0;for(let f of r){if(2!==f.wire||!parseMessage(f.data))continue;let p=cleanFamilyMessage(f.data,t+1);p.count>0&&(f.data=p.bytes,f.dirty=!0,d+=p.count,u=!0)}return{bytes:u?encodeMessage(r):e,count:d}}function refreshChildrenIndex(e){if(!e||!Array.isArray(e.children)||!e.childrenIndex)return;let t={};e.children.forEach((e,r)=>{e&&void 0!==e.cardId&&null!==e.cardId&&(t[String(e.cardId)]=r)}),e.childrenIndex=t}function cleanMineJsonObject(e){let t=!1;if(Array.isArray(e)){for(let r of e)cleanMineJsonObject(r)&&(t=!0);return t}if(!e||"object"!=typeof e)return!1;if(111402===e.groupId&&Array.isArray(e.children)){let n=e.children.length;e.children=e.children.filter(e=>{if(!e||"object"!=typeof e)return!0;let t=e.sensorParam&&"object"==typeof e.sensorParam?e.sensorParam:{},r=String(e.title||""),n=String(t.service_name||""),o=String(t.service_label||"");return!(r.includes("会员月卡")||o.includes("会员月卡")||/^商品\d+$/.test(n))}),e.children.length!==n&&(refreshChildrenIndex(e),t=!0)}if(111403===e.groupId&&Array.isArray(e.children)){let o=e.children.length;e.children=e.children.filter(e=>!e||"object"!=typeof e||"PRODUCT"!==String(e.cardType||"")),e.children.length!==o&&(refreshChildrenIndex(e),t=!0)}if(111404===e.groupId&&Array.isArray(e.children))for(let i of e.children){if(!i||!Array.isArray(i.medias))continue;let a=i.medias.length;i.medias=i.medias.filter(e=>{if(!e||"object"!=typeof e)return!0;let t=String(e.caption||""),r=String(e.subCaption||"");return!("买三送一"===t||"全民推荐官"===t||r.includes("视频会员")||r.includes("返现"))}),i.medias.length!==a&&(t=!0)}for(let s of Object.keys(e))cleanMineJsonObject(e[s])&&(t=!0);return t}function rewriteMineJsonFields(e,t=0){if(t>12)return{bytes:e,count:0};let r=parseMessage(e);if(!r)return{bytes:e,count:0};let n=!1,o=0;for(let i of r){if(2!==i.wire)continue;let a=!1;if(i.data.length>=2&&(123===i.data[0]||91===i.data[0])){let s=bytesToUtf8(i.data);if(s)try{let l=JSON.parse(s);cleanMineJsonObject(l)&&(i.data=utf8Bytes(JSON.stringify(l)),i.dirty=!0,n=!0,o++,a=!0)}catch(c){}}if(!a&&parseMessage(i.data)){let u=rewriteMineJsonFields(i.data,t+1);u.count>0&&(i.data=u.bytes,i.dirty=!0,n=!0,o+=u.count)}}return{bytes:n?encodeMessage(r):e,count:o}}function isMinePromotionGroup(e){return!!e&&(!!directCardNameMatches(e,MINE_PROMOTION_NAMES)||directCardJsonMatches(e,e=>{if(!e||"object"!=typeof e)return!1;let t=Number(e.groupId);return"advert"===String((e.trackParam&&"object"==typeof e.trackParam?e.trackParam:{}).department||"").toLowerCase()}))}function cleanMinePayload(e){return removeMatchingNodes(e,(e,t,r)=>5===e&&isMinePromotionGroup(r))}function getHeader(e){let t=$request&&$request.headers||{},r=e.toLowerCase();for(let n of Object.keys(t))if(n.toLowerCase()===r)return String(t[n]);return null}function getRpid(e){return getHeader("rpid")||directFieldAscii(parseMessage(e),5)}
  var gateway = /^https?:\/\/(?:(?:bkclient|umerp|home|ume1|startup|discardrp)\.umetrip\.com(?:\.cn)?|(?:sns|appmsg|umehome|opactivity|activity|flightstatus|umeflightstatus|umestartup|user|umeuser|event)\.umetrip\.com|114\.115\.217\.129)(?::\d+)?\/gateway\/api\/umetrip\/native\/?(?:\?[^#]*)?$/;
  var req = typeof $request === "object" && $request ? $request : {};
  var res = typeof $response === "object" && $response ? $response : {};
  var MAX_BYTES = 2 * 1024 * 1024;

  function headerValues(headers, name) {
    var values = [];
    Object.keys(headers || {}).forEach(function (key) {
      if (key.toLowerCase() !== name) return;
      var value = headers[key];
      values.push(typeof value === "string" || typeof value === "number" ? String(value).trim() : "");
    });
    return values;
  }
  function sameValue(values) {
    return !values.length || values.every(function (value) { return value === values[0]; });
  }
  function bytesOf(value) {
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (Array.isArray(value) && value.every(function (v) { return Number.isInteger(v) && v >= 0 && v <= 255; })) return new Uint8Array(value);
    return null;
  }
  function rpidFromMessage(message) {
    var values = [];
    (message || []).forEach(function (item) {
      if (item.field === 5 && item.wire === 2) values.push(bytesToUtf8(item.data));
    });
    if (!sameValue(values) || values.some(function (v) { return typeof v !== "string" || !/^\d+$/.test(v); })) return false;
    return values.length ? values[0] : "";
  }
  function object(value) { return value && typeof value === "object" && !Array.isArray(value); }
  function codeSuccess(value) { return value === 0 || value === "0" || value === 200 || value === "200"; }
  function jsonError(document) {
    if (!object(document)) return true;
    var candidates = [document, document.presp, document.bstatus, document.s2cRspBodyWrapPB];
    for (var i = 0; i < candidates.length; i += 1) {
      var part = candidates[i];
      if (!object(part)) continue;
      for (var j = 0; j < 3; j += 1) {
        var key = ["code", "perrcode", "errcode"][j];
        if (Object.prototype.hasOwnProperty.call(part, key) && !codeSuccess(part[key])) return true;
      }
      if (part.success === false) return true;
    }
    return false;
  }
  function promotionCard(card, id) {
    if (!object(card)) return false;
    if (isHomePromotionCard(card)) return true;
    var payload = card.cardResult;
    if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch (_) { return false; } }
    if (!object(payload)) return false;
    if (isHomePromotionCard(payload) || Object.prototype.hasOwnProperty.call(payload, "advertiser")) return true;
    var publicAdKeys = ["adBannerImg", "adTopImg", "impressionUrlList", "clickUrlList"];
    if (publicAdKeys.some(function (key) { return Object.prototype.hasOwnProperty.call(payload, key); })) return true;
    // The source's generic commonModal marker is limited to known marketing
    // operations here, so unrelated permission/travel alerts keep working.
    if (["1000002", "1420002", "1120000"].indexOf(id) !== -1) {
      var text = JSON.stringify(payload);
      return /\/commonModal\/|"weexName"\s*:\s*"commonModal"|\/payMember\/|"weexName"\s*:\s*"payMember"/.test(text);
    }
    return false;
  }
  function cleanGroups(list, stats, depth, id) {
    if (!Array.isArray(list) || depth > 12) return list;
    return list.filter(function (group) {
      if (!object(group)) return true;
      var type = String(group.businessType || "");
      var sourceMarketingStyle = ["1000002", "1420002", "1120000"].indexOf(id) !== -1 &&
        [1040, 1077, 3021].indexOf(Number(group.groupStyle)) !== -1;
      if (isHomePromotionGroup(group) || sourceMarketingStyle || /^(advert|advertising|marketing|promotion)$/i.test(type)) { stats.changes += 1; return false; }
      if (Array.isArray(group.subGroupList)) group.subGroupList = cleanGroups(group.subGroupList, stats, depth + 1, id);
      if (Array.isArray(group.cardList)) group.cardList = group.cardList.filter(function (card) {
        if (promotionCard(card, id)) { stats.changes += 1; return false; }
        return true;
      });
      return true;
    });
  }
  // The upstream distinguishes warm-start layouts by advertTotalTimeout /
  // warmStartInterval even when advertPageInfo is absent. Clear whole groups
  // only for its documented advertising-only operations; unknown operations
  // need the explicit advertPageInfo array, as in the previous implementation.
  function clearOpenAdvert(body, stats, id, preserveMixedPage) {
    if (!object(body)) return false;
    var listed = Array.isArray(body.advertPageInfo);
    var dedicatedWarm = EMPTY_RPIDS.has(id) &&
      (Object.prototype.hasOwnProperty.call(body, "advertTotalTimeout") ||
       Object.prototype.hasOwnProperty.call(body, "warmStartInterval"));
    var splash = listed || dedicatedWarm;
    if (!splash) return false;
    if (listed && body.advertPageInfo.length) { body.advertPageInfo = []; stats.changes += 1; }
    if (typeof body.advertTotalTimeout === "number" && body.advertTotalTimeout !== 0) {
      body.advertTotalTimeout = 0; stats.changes += 1;
    }
    if ((!preserveMixedPage || EMPTY_RPIDS.has(id)) && object(body.page) &&
        Array.isArray(body.page.groupList) && body.page.groupList.length) {
      body.page.groupList = []; stats.changes += 1;
    }
    return true;
  }
  function cleanSplashJson(document, id) {
    if (jsonError(document)) return false;
    var bodies = [document], wrap = document.s2cRspBodyWrapPB;
    if (object(wrap)) bodies.push(wrap.responsebody, wrap.responseBody);
    if (object(document.presp)) bodies.push(document.presp.pdata);
    bodies.push(document.responsebody, document.responseBody);
    var stats = {changes: 0};
    bodies.forEach(function (body) { clearOpenAdvert(body, stats, id, true); });
    return stats.changes > 0;
  }
  function cleanJsonBody(body, stats, id) {
    if (!object(body)) return;
    var splash = clearOpenAdvert(body, stats, id);
    ["advertDataList", "advertList"].forEach(function (key) {
      if (Array.isArray(body[key]) && body[key].length) { body[key] = []; stats.changes += 1; }
    });
    if (object(body.templateService) && Array.isArray(body.templateService.groupList)) body.templateService.groupList = cleanGroups(body.templateService.groupList, stats, 0, id);
    var before = stats.changes;
    if (object(body.page) && Array.isArray(body.page.groupList)) body.page.groupList = cleanGroups(body.page.groupList, stats, 0, id);
    // Do not hide login, permission or operational notices merely named "pop".
    if (Object.prototype.hasOwnProperty.call(body, "isShowPop") && body.isShowPop !== 0 &&
        (stats.changes > before || splash || ((id === "1420002" || id === "1120000") && object(body.page)))) {
      body.isShowPop = 0; stats.changes += 1;
    }
  }
  function cleanJson(document, id) {
    if (jsonError(document)) return false;
    var bodies = [document], wrap = document.s2cRspBodyWrapPB;
    if (object(wrap)) { bodies.push(wrap.responsebody, wrap.responseBody); }
    if (object(document.presp)) bodies.push(document.presp.pdata);
    bodies.push(document.responsebody, document.responseBody);
    var stats = {changes: 0};
    bodies.forEach(function (body) { cleanJsonBody(body, stats, id); });
    return stats.changes > 0;
  }
  function emitBytes(bytes) {
    // Shadowrocket/Surge use body in binary-body-mode. Accept the bodyBytes
    // alias as input, but never return the Quantumult X-only output envelope.
    return $done({body: bytes});
  }

  try {
    if (!gateway.test(String(req.url || ""))) return $done({});
    var status = res.statusCode !== undefined ? res.statusCode : res.status;
    if (typeof status === "string") { var match = status.match(/^(?:HTTP\/\d(?:\.\d)?\s+)?(\d{3})(?:\s|$)/); status = match ? Number(match[1]) : NaN; }
    if (!Number.isInteger(status) || status < 200 || status >= 300) return $done({});
    var headers = headerValues(req.headers, "rpid");
    if (!sameValue(headers) || headers.some(function (id) { return !/^\d+$/.test(id); })) return $done({});
    var id = headers.length ? headers[0] : "";
    var body = res.body, usedBodyBytes = body === undefined && res.bodyBytes !== undefined;
    if (usedBodyBytes) body = res.bodyBytes;
    if (typeof body === "string") {
      if (!body || body.length > MAX_BYTES) return $done({});
      var document = JSON.parse(body);
      if (!cleanJson(document, id)) return $done({});
      return $done({body: JSON.stringify(document)});
    }
    var bytes = bytesOf(body);
    if (!bytes || !bytes.length || bytes.length > MAX_BYTES) return $done({});
    var text = bytesToUtf8(bytes);
    if (text && /^\s*[\[{]/.test(text)) {
      var json = JSON.parse(text);
      if (!cleanJson(json, id)) return $done({});
      return emitBytes(utf8Bytes(JSON.stringify(json)), usedBodyBytes);
    }
    var message = parseMessage(bytes);
    if (!message) return $done({});
    var embeddedId = rpidFromMessage(message);
    if (embeddedId === false || (id && embeddedId && id !== embeddedId)) return $done({});
    id = id || embeddedId;
    var result = {bytes: bytes, count: 0};
    if (EMPTY_RPIDS.has(id)) result = replaceTopField7(bytes, EMPTY_PAYLOAD);
    else if (id === HOME_RPID) result = transformTopField7(bytes, cleanHomePayload);
    else if (id === WATERFALL_RPID) result = transformTopField7(bytes, cleanWaterfallPayload);
    else if (id === TRIP_BANNER_RPID) result = transformTopField7(bytes, cleanTripBannerPayload);
    else if (id === FAMILY_RPID) result = transformTopField7(bytes, cleanFamilyMessage);
    else if (id === HISTORY_RPID) result = transformTopField7(bytes, cleanHistoryPayload);
    else if (id === MINE_RPID) result = transformTopField7(bytes, cleanMinePayload);
    else if (id === FLIGHT_RPID) result = transformTopField7(bytes, cleanFlightPayload);
    // JSON is also carried inside the schema's field-7 payload. Restrict
    // this additional pass to explicit splash fields, keeping ordinary
    // protobuf fields and mixed page groups intact for unknown operations.
    var splashResult = transformTopField7(result.bytes, function (payload) {
      return rewriteJsonFields(payload, function (document) { return cleanSplashJson(document, id); });
    });
    if (splashResult.count > 0) result = {bytes: splashResult.bytes, count: result.count + splashResult.count};
    if (!result.count || result.bytes === bytes) return $done({});
    return emitBytes(result.bytes, usedBodyBytes);
  } catch (_) {
    return $done({});
  }

}());
