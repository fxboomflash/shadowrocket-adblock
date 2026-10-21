/* Strict, bounded UTF-8 / Base64 codec for local response processing.
 * Does not require Node, atob/btoa, TextEncoder, network or persistent storage. */
var LocalCodec = (function () {
  var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function utf8(text) {
    var binary = unescape(encodeURIComponent(text)), out = [];
    for (var i = 0; i < binary.length; i++) out.push(binary.charCodeAt(i));
    return out;
  }
  function text(bytes) {
    var chunks = [];
    for (var i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode.apply(null, bytes.slice(i, i + 8192)));
    return decodeURIComponent(escape(chunks.join("")));
  }
  function encode(value, style) {
    var bytes = utf8(value), out = [];
    for (var i = 0; i < bytes.length; i += 3) {
      var a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
      out.push(alphabet[a >> 2] + alphabet[((a & 3) << 4) | ((b === undefined ? 0 : b) >> 4)] +
        (b === undefined ? "=" : alphabet[((b & 15) << 2) | ((c === undefined ? 0 : c) >> 6)]) +
        (c === undefined ? "=" : alphabet[c & 63]));
    }
    var result = out.join("");
    if (style && style.url) result = result.replace(/\+/g, "-").replace(/\//g, "_");
    if (style && style.unpadded) result = result.replace(/=+$/, "");
    return result;
  }
  function decode(value, limit) {
    if (typeof value !== "string" || value.length > limit) return null;
    var raw = value.replace(/[ \t\r\n]/g, "");
    if (!raw.length || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(raw) || raw.length % 4 === 1 ||
        (/[-_]/.test(raw) && /[+/]/.test(raw))) return null;
    var style = {url:/[-_]/.test(raw), unpadded:raw.indexOf("=") === -1};
    var standard = raw.replace(/-/g, "+").replace(/_/g, "/"), content = standard.replace(/=+$/, "");
    var padding = (4 - content.length % 4) % 4;
    if (padding === 3 || (standard.indexOf("=") !== -1 && (standard.length % 4 || standard.length - content.length !== padding))) return null;
    var bytes = [], bits = 0, pending = 0;
    for (var i = 0; i < content.length; i++) {
      pending = (pending << 6) | alphabet.indexOf(content[i]); bits += 6;
      if (bits >= 8) { bits -= 8; bytes.push((pending >> bits) & 255); pending &= (1 << bits) - 1; }
    }
    if (pending !== 0) return null;
    try {
      var decoded = text(bytes);
      if (encode(decoded, style) !== raw) return null;
      return {text:decoded, style:style};
    } catch (_) { return null; }
  }
  function requestText(value, limit) {
    if (typeof value === "string") return value.length <= limit ? value : null;
    var bytes;
    if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) bytes = Array.prototype.slice.call(new Uint8Array(value));
    else if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) bytes = Array.prototype.slice.call(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
    else if (Array.isArray(value) && value.every(function (v) { return typeof v === "number" && v >= 0 && v <= 255 && v % 1 === 0; })) bytes = value;
    else return null;
    if (bytes.length > limit) return null;
    try { return text(bytes); } catch (_) { return null; }
  }
  return {encode:encode, decode:decode, requestText:requestText};
}());

// Frozen original successful-response transformations for six legacy APIs.
function runLegacyJD(operation,payload) {
  var result = null;
  var $request = {url:"https://api.m.jd.com/client.action?functionId="+operation};
  var $response = {status:200,body:JSON.stringify(payload)};
  var $done = function (value) { result = value || {}; };
// v8 query-dispatch and error-handling wrapper around pinned fmz200/wool_scripts jingdong.js.
// Upstream commit: 5d5f63fcf98bc69d5f8f1b1bae6f86a01ee4bb97.
// Original successful-response transformations are unchanged.
(function () {
  try {
    var request = typeof $request !== "undefined" && $request || {};
    var response = typeof $response !== "undefined" && $response || {};
    var route = /^https:\/\/api\.m\.jd\.com(?::443)?\/client\.action\?(?:[^#]*&)?functionId=(deliverLayer|getTabHomeInfo|myOrderInfo|orderTrackBusiness|personinfoBusiness|start|welcomeHome)(?:&|$)/;
    var routeMatch = route.exec(String(request.url || ""));
    if (!routeMatch || typeof response.body !== "string" || !response.body.trim()) return $done({});
    var status = response.statusCode === undefined ? response.status : response.statusCode;
    if (status !== undefined && String(status) !== "200" && !/^HTTP\/\S+ 200(?: |$)/.test(String(status))) return $done({});
    // 2024-04-18 17:45
    
    // Dispatch by the matched functionId parameter, never text inside other values.
    const url = "functionId=" + routeMatch[1];
    let obj = JSON.parse($response.body);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return $done({});
    
    if (url.includes("functionId=deliverLayer") || url.includes("functionId=orderTrackBusiness")) {
      // 物流页面
      if (obj?.bannerInfo) {
        // 收货时寄快递享八折 享受条件苛刻 故移除
        delete obj.bannerInfo;
      }
      if (obj?.floors?.length > 0) {
        // 运费八折
        obj.floors = obj.floors.filter((i) => !["banner", "jdDeliveryBanner"]?.includes(i?.mId));
      }
    } else if (url.includes("functionId=getTabHomeInfo")) {
      // 新品页面
      if (obj?.result?.iconInfo) {
        // 新品页 悬浮动图
        delete obj.result.iconInfo;
      }
      if (obj?.result?.roofTop) {
        // 新品页 下拉二楼
        delete obj.result.roofTop;
      }
    } else if (url.includes("functionId=myOrderInfo")) {
      // 订单页面
      if (obj?.floors?.length > 0) {
        let newFloors = [];
        for (let floor of obj.floors) {
          if (["bannerFloor", "bpDynamicFloor", "plusFloor"]?.includes(floor?.mId)) {
            // bannerFloor满意度评分 bpDynamicFloor专属权益 plusFloor开通会员
            continue;
          } else {
            if (floor?.mId === "virtualServiceCenter") {
              // 服务中心
              if (floor?.data?.virtualServiceCenters?.length > 0) {
                let newItems = [];
                for (let item of floor.data.virtualServiceCenters) {
                  if (item?.serviceList?.length > 0) {
                    let newCards = [];
                    for (let card of item.serviceList) {
                      if (card?.serviceTitle === "精选特惠") {
                        continue;
                      }
                      newCards.push(card);
                    }
                    item.serviceList = newCards;
                  }
                  newItems.push(item);
                }
                floor.data.virtualServiceCenters = newItems;
              }
            }
            if (floor?.mId === "customerServiceFloor") {
              // 客户服务
              if (floor?.data?.moreText) {
                // 点此获得更多服务
                delete floor.data.moreIcon;
                delete floor.data.moreIcon_dark;
                floor.data.moreText = " ";
              }
            }
            newFloors.push(floor);
          }
        }
        obj.floors = newFloors;
      }
    } else if (url.includes("functionId=personinfoBusiness")) {
      // 个人页面
      if (obj?.floors?.length > 0) {
        let newFloors = [];
        for (let floor of obj.floors) {
          const items = [
            "bigSaleFloor", // 双十一
            "buyOften", // 常买常逛
            // "iconToolFloor", // 底部工具栏
            // "keyToolsFloor", // 浏览记录
            "newAttentionCard", // 关注的频道
            "newBigSaleFloor", // 双十一
            "newStyleAttentionCard", // 新版关注的频道
            // "newWalletIdFloor", // 我的钱包
            "newsFloor", // 京东快讯
            "noticeFloor", // 顶部横幅
            // "orderIdFloor", // 我的订单
            "recommendfloor" // 我的推荐
          ];
          if (items?.includes(floor?.mId)) {
            continue;
          } else {
            if (floor?.mId === "basefloorinfo") {
              // 弹窗
              if (floor?.data?.commonPopup) {
                delete floor.data.commonPopup;
              }
              // 弹窗
              if (floor?.data?.commonPopup_dynamic) {
                delete floor.data.commonPopup_dynamic;
              }
              // 底部会员续费横幅
              if (floor?.data?.commonTips?.length > 0) {
                floor.data.commonTips = [];
              }
              // 弹窗
              if (floor?.data?.commonWindows?.length > 0) {
                floor.data.commonWindows = [];
              }
              // 右下角动图
              if (floor?.data?.floatLayer) {
                delete floor.data.floatLayer;
              }
            } else if (floor?.mId === "iconToolFloor") {
              /*
              // 底部工具栏
              if (floor?.data?.nodes?.length > 0) {
                const sortLists = [
                  "applezhushou", // apple助手 1-1-1
                  "lingjindouxin", // 签到领豆 1-1-2
                  "dongdongnongchangxin", // 京东农场 1-1-3
                  "chongwangwang", // 宠汪汪 1-1-4
                  "kehufuwu", // 客户服务 1-2-1
                  "xianzhiguanjia", // 闲置换钱 1-2-2
                  "wenyisheng", // 问医生 1-2-3
                  "jijianfuwu", // 寄件服务 1-2-5
                  "zhuanzuanhongbao", // 天天赚红包 2-2-1
                  "huanletaojin" // 欢乐淘金 2-2-2
                ];
                let node = floor.data.nodes;
                if (node?.[0]?.length > 0) {
                  // 第一组十个
                  node[0] = node[0]
                    .filter((i) => sortLists?.includes(i?.functionId))
                    .sort((a, b) => sortLists.indexOf(a?.functionId) - sortLists.indexOf(b?.functionId));
                }
                if (node?.[1]?.length > 0) {
                  // 第二组四个
                  node[1] = node[1]
                    .filter((i) => sortLists?.includes(i?.functionId))
                    .sort((a, b) => sortLists.indexOf(a?.functionId) - sortLists.indexOf(b?.functionId));
                }
              }
              */
            } else if (floor?.mId === "orderIdFloor") {
              if (floor?.data?.commentRemindInfo?.infos?.length > 0) {
                // 发布评价的提醒
                floor.data.commentRemindInfo.infos = [];
              }
            } else if (floor?.mId === "userinfo") {
              // 个人页 顶部背景图
              // if (floor?.data?.bgImgInfo?.bgImg) {
              //   delete floor.data.bgImgInfo.bgImg;
              // }
              // 开通plus会员卡片
              if (floor?.data?.newPlusBlackCard) {
                delete floor.data.newPlusBlackCard;
              }
            }
            newFloors.push(floor);
          }
        }
        obj.floors = newFloors;
      }
      if (obj?.others?.floors?.length > 0) {
        // 个人页面 2024-04-18 12.6.2新版本更改路径
        let newFloors = [];
        for (let floor of obj.others.floors) {
          const items = [
            "bigSaleFloor", // 双十一
            "buyOften", // 常买常逛
            // "iconToolFloor", // 底部工具栏
            // "keyToolsFloor", // 浏览记录
            "newAttentionCard", // 关注的频道
            "newBigSaleFloor", // 双十一
            "newStyleAttentionCard", // 新版关注的频道
            // "newWalletIdFloor", // 我的钱包
            "newsFloor", // 京东快讯
            "noticeFloor", // 顶部横幅
            // "orderIdFloor", // 我的订单
            "recommendfloor" // 我的推荐
            // "userinfo", // 用户信息
          ];
          if (items?.includes(floor?.mId)) {
            continue;
          } else {
            if (floor?.mId === "basefloorinfo") {
              // 弹窗
              if (floor?.data?.commonPopup) {
                delete floor.data.commonPopup;
              }
              // 弹窗
              if (floor?.data?.commonPopup_dynamic) {
                delete floor.data.commonPopup_dynamic;
              }
              // 底部会员续费横幅
              if (floor?.data?.commonTips?.length > 0) {
                floor.data.commonTips = [];
              }
              // 弹窗
              if (floor?.data?.commonWindows?.length > 0) {
                floor.data.commonWindows = [];
              }
              // 右下角动图
              if (floor?.data?.floatLayer) {
                delete floor.data.floatLayer;
              }
            } else if (floor?.mId === "iconToolFloor") {
              /*
              // 底部工具栏
              if (floor?.data?.nodes?.length > 0) {
                const sortLists = [
                  "applezhushou", // apple助手 1-1-1
                  "lingjindouxin", // 签到领豆 1-1-2
                  "dongdongnongchangxin", // 京东农场 1-1-3
                  "chongwangwang", // 宠汪汪 1-1-4
                  "kehufuwu", // 客户服务 1-2-1
                  "xianzhiguanjia", // 闲置换钱 1-2-2
                  "wenyisheng", // 问医生 1-2-3
                  "jijianfuwu", // 寄件服务 1-2-5
                  "zhuanzuanhongbao", // 天天赚红包 2-2-1
                  "huanletaojin" // 欢乐淘金 2-2-2
                ];
                let node = floor.data.nodes;
                if (node?.[0]?.length > 0) {
                  // 第一组十个
                  node[0] = node[0]
                    .filter((i) => sortLists?.includes(i?.functionId))
                    .sort((a, b) => sortLists.indexOf(a?.functionId) - sortLists.indexOf(b?.functionId));
                }
                if (node?.[1]?.length > 0) {
                  // 第二组四个
                  node[1] = node[1]
                    .filter((i) => sortLists?.includes(i?.functionId))
                    .sort((a, b) => sortLists.indexOf(a?.functionId) - sortLists.indexOf(b?.functionId));
                }
              }
              */
            } else if (floor?.mId === "orderIdFloor") {
              if (floor?.data?.commentRemindInfo?.infos?.length > 0) {
                // 发布评价的提醒
                floor.data.commentRemindInfo.infos = [];
              }
            } else if (floor?.mId === "userinfo") {
              // 个人页 顶部背景图
              // if (floor?.data?.bgImgInfo?.bgImg) {
              //   delete floor.data.bgImgInfo.bgImg;
              // }
              // 开通plus会员卡片
              if (floor?.data?.newPlusBlackCard) {
                delete floor.data.newPlusBlackCard;
              }
            }
            newFloors.push(floor);
          }
        }
        obj.others.floors = newFloors;
      }
    } else if (url.includes("functionId=start")) {
      // 开屏广告
      if (obj?.images?.length > 0) {
        obj.images = [];
      }
      if (obj?.showTimesDaily) {
        obj.showTimesDaily = 0;
      }
    } else if (url.includes("functionId=welcomeHome")) {
      // 首页配置
      if (obj?.floorList?.length > 0) {
        const delItems = [
          "bottomXview", // 底部悬浮通栏推广
          "float", // 悬浮推广小圆图
          "photoCeiling", // 顶部通栏动图推广
          // "recommend", // 为你推荐
          "ruleFloat", // 资质与规则
          "searchIcon", // 右上角消费券
          "topRotate", // 左上角logo
          "tabBarAtmosphere" // 底部悬浮通栏推广
        ];
        // 首页 图层列表
        obj.floorList = obj.floorList.filter((i) => !delItems?.includes(i?.type));
      }
      // 首页 顶部背景图
      // if (obj?.topBgImgBig) {
      //   delete obj.topBgImgBig;
      // }
      // 首页 下拉二楼
      if (obj?.webViewFloorList?.length > 0) {
        obj.webViewFloorList = [];
      }
    }
    
    $done({ body: JSON.stringify(obj) });
  } catch (_) {
    $done({});
  }
}());

  return result;
}
/*
 * JD startup protocol repair for Shadowrocket. Generated bundle includes the
 * previously delivered, reviewed legacy cleaner for its original seven APIs.
 * Protocol reference: zbsdsb/loon-adblock-plugins @ 890f64953efc870d4ca6cc5ec19b048c88ec73bb.
 * Splash schema/dates: blackmatrix7 startup.js and LazingLuo jd-splash.js.
 * Unlike broad source cleaners, explicit ordinary API calls are passed unchanged;
 * unknown operations require BOTH images and showTimesDaily splash fields.
 * No logging, storage, notification, credential headers or outbound requests.
 */
(function () {
  "use strict";
  function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function success(value) {
    if (!object(value)) return false;
    if (own(value,"code") && value.code !== 0 && value.code !== "0") return false;
    if (own(value,"retcode") && value.retcode !== 0 && value.retcode !== "0") return false;
    if (own(value,"success") && value.success === false) return false;
    return true;
  }
  try {
    var request = typeof $request === "object" && $request ? $request : {};
    var response = typeof $response === "object" && $response ? $response : {};
    var route = /^https?:\/\/api\.m\.jd\.com(?::(?:80|443))?\/(?:client\.action|api)\/?(?:\?([^#]*))?$/.exec(String(request.url || ""));
    var method = String(request.method || "GET").toUpperCase();
    if (!route || (method !== "GET" && method !== "POST") || typeof response.body !== "string" || !response.body.length || response.body.length > 4194304) return $done({});
    var status = response.statusCode === undefined ? response.status : response.statusCode;
    if (status !== undefined && String(status) !== "200" && !/^HTTP\/\S+ 200(?: |$)/.test(String(status))) return $done({});
    var operations = [], invalid = false;
    function form(text) {
      var values = [], bodyWrappers = [];
      text.split("&").forEach(function (part) {
        if (!part) return;
        var pieces = part.split("="), key = decodeURIComponent(pieces.shift().replace(/\+/g," "));
        if (key === "functionId" || key === "body") {
          var value = decodeURIComponent(pieces.join("=").replace(/\+/g," "));
          if (key === "functionId") values.push(value); else bodyWrappers.push(value);
        }
      });
      if (values.length > 1) invalid = true;
      return {values:values, bodyWrappers:bodyWrappers};
    }
    if (route[1]) operations = operations.concat(form(route[1]).values);
    function requestOperation(raw, depth) {
      if (!raw || depth > 2) return;
      var parsed;
      try { parsed = JSON.parse(raw); } catch (_) {}
      if (object(parsed)) {
        if (own(parsed,"functionId")) {
          if (typeof parsed.functionId === "string") operations.push(parsed.functionId); else invalid = true;
        } else if (!operations.length && typeof parsed.body === "string") requestOperation(parsed.body,depth+1);
        return;
      }
      var decoded = LocalCodec.decode(raw,262144);
      if (decoded) { requestOperation(decoded.text,depth+1); return; }
      if (raw.indexOf("=") !== -1 && /^[^\r\n]+$/.test(raw)) {
        var fields = form(raw);
        operations = operations.concat(fields.values);
        if (!operations.length && !fields.values.length && fields.bodyWrappers.length === 1) requestOperation(fields.bodyWrappers[0],depth+1);
      }
    }
    if (method === "POST") {
      var rawRequest = request.body;
      if (rawRequest === undefined) rawRequest = request.bodyBytes;
      var requestBody = LocalCodec.requestText(rawRequest,262144);
      if (requestBody !== null) requestOperation(requestBody,0);
    }
    if (invalid || operations.some(function (op) { return !/^[A-Za-z][A-Za-z0-9_]*$/.test(op); }) ||
        operations.some(function (op) { return op !== operations[0]; })) return $done({});
    var operation = operations.length ? operations[0] : null;
    var legacyApis = ["deliverLayer","getTabHomeInfo","myOrderInfo","orderTrackBusiness","personinfoBusiness","welcomeHome"];
    var adOnlyApis = ["queryMaterialAdverts","home_launchConfig","lite_advertising"];
    if (operation && operation !== "start" && operation !== "startup" && adOnlyApis.indexOf(operation) === -1 && legacyApis.indexOf(operation) === -1) return $done({});
    var trimmed = response.body.trim(), envelope, encoding = null;
    try { envelope = JSON.parse(trimmed); } catch (_) {
      encoding = LocalCodec.decode(trimmed,4194304);
      if (!encoding) return $done({});
      envelope = JSON.parse(encoding.text);
    }
    if (!success(envelope)) return $done({});
    var relevantKeys = operation === "start" || operation === "startup" || !operation ? ["images","showTimesDaily"] :
      operation === "welcomeHome" ? ["floorList","webViewFloorList"] :
      operation === "getTabHomeInfo" ? ["result"] : ["bannerInfo","floors","others"];
    var rootHasPayload = relevantKeys.some(function (key) { return own(envelope,key); });
    var payload = !rootHasPayload && object(envelope.data) ? envelope.data : envelope;
    if (!success(payload)) return $done({});
    var before = JSON.stringify(envelope), changed = false;
    var dailyValue = payload.showTimesDaily;
    var numericDaily = typeof dailyValue === "number" ? isFinite(dailyValue) && dailyValue >= 0 && dailyValue % 1 === 0 :
      typeof dailyValue === "string" && /^\d+$/.test(dailyValue);
    var splash = Array.isArray(payload.images) && own(payload,"showTimesDaily") && numericDaily;
    if (adOnlyApis.indexOf(operation) !== -1) {
      // Dedicated ad operations: existing URL rules / public modules return empty.
      // This also covers the same operations hidden in POST/Base64 envelopes.
      envelope = {}; changed = before !== "{}";
    } else if (operation === "start" || operation === "startup" || (!operation && splash)) {
      if (Array.isArray(payload.images)) {
        // Keep valid inventory when the known schedule fields exist, but make it
        // ineligible for current display. Unknown old inventory is emptied.
        function postpone(node, depth) {
          if (depth > 8) return false;
          var scheduled = false;
          if (Array.isArray(node)) {
            node.forEach(function (item) { if (postpone(item,depth+1)) scheduled = true; });
            return scheduled;
          }
          if (!object(node)) return false;
          var dates = {onlineTime:"2099-01-01 00:00:00", referralsTime:"2099-12-31 23:59:59",
            startTimeStamp:4070880000000, endTimeStamp:4102415999000};
          Object.keys(dates).forEach(function (key) {
            if (own(node,key) && (typeof node[key] === "string" || (typeof node[key] === "number" && typeof dates[key] === "number"))) {
              var value = typeof node[key] === "string" ? String(dates[key]) : dates[key];
              if (node[key] !== value) { node[key] = value; changed = true; }
              scheduled = true;
            }
          });
          ["showTimes","time"].forEach(function (key) {
            if (typeof node[key] === "number" || typeof node[key] === "string") {
              var zero = typeof node[key] === "string" ? "0" : 0;
              if (node[key] !== zero) { node[key] = zero; changed = true; }
            }
          });
          Object.keys(node).forEach(function (key) {
            if ((object(node[key]) || Array.isArray(node[key])) && postpone(node[key],depth+1)) scheduled = true;
          });
          return scheduled;
        }
        function inventory(items) {
          var kept = [];
          items.forEach(function (item) {
            if (Array.isArray(item)) {
              var group = inventory(item);
              if (group.length) kept.push(group);
            } else if (object(item) && postpone(item,0)) kept.push(item);
          });
          return kept;
        }
        var originalInventory = JSON.stringify(payload.images), cleanedInventory = inventory(payload.images);
        if (JSON.stringify(cleanedInventory) !== originalInventory) { payload.images = cleanedInventory; changed = true; }
      }
      if (typeof payload.showTimesDaily === "number" || typeof payload.showTimesDaily === "string") {
        var daily = typeof payload.showTimesDaily === "string" ? "0" : 0;
        if (payload.showTimesDaily !== daily) { payload.showTimesDaily = daily; changed = true; }
      }
    } else if (legacyApis.indexOf(operation) !== -1) {
      var legacyResult = runLegacyJD(operation,payload);
      if (legacyResult && legacyResult.body) {
        var cleaned = JSON.parse(legacyResult.body);
        if (JSON.stringify(cleaned) !== JSON.stringify(payload)) {
          if (payload === envelope) envelope = cleaned; else envelope.data = cleaned;
          changed = true;
        }
      }
    }
    if (!changed) return $done({});
    var output = JSON.stringify(envelope);
    if (encoding) output = LocalCodec.encode(output,encoding.style);
    return $done({body:output});
  } catch (_) { return $done({}); }
}());
