// Shadowrocket: documented advertising fields on exact APIs only.
// Field references: fmz200/wool_scripts@5d5f63fcf98bc69d5f8f1b1bae6f86a01ee4bb97
// Scripts/zhihu/zhihu.js and Scripts/myBlockAds.js;
// app2smile/rules@df6366a7024e0b3f0aa3510c5b791eea6f3cba89/js/tieba-json.js.
// Independent minimal implementation; preserves article/post text, account and paging.
(function () {
  function object(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  try {
    var url = String($request.url || "");
    var tieba = /^https?:\/\/(?:tiebac|c\.tieba)\.baidu\.com(?::(?:80|443))?\/c\/f\/(frs\/(?:page|threadlist|generalTabList)|pb\/(?:picpage|page)|excellent\/personalized)\/?(?:\?.*)?$/.exec(url);
    var zhihu = /^https?:\/\/api\.zhihu\.com(?::(?:80|443))?\/(commercial_api\/app_float_layer|topstory\/(?:recommend|hot-lists\/total)|v2\/topstory\/hot-lists\/everyone-seeing|next-(?:bff|data|render)|questions\/\d+\/(?:answers|feeds))\/?(?:\?.*)?$/.exec(url);
    var mi = /^https?:\/\/api\.m\.mi\.com(?::(?:80|443))?\/v1\/app\/start\/?(?:\?.*)?$/.test(url);
    if ((!tieba && !zhihu && !mi) || typeof $response.body !== "string") return $done({});
    var body = JSON.parse($response.body);
    if (!object(body) || body.error || (has(body, "code") && body.code !== 0 && body.code !== "0") ||
        (has(body, "error_code") && body.error_code !== 0 && body.error_code !== "0")) return $done({});
    var changed = false;
    function clear(o, key) {
      if (object(o) && Array.isArray(o[key]) && o[key].length) { o[key] = []; changed = true; }
    }
    function remove(o, key) {
      if (object(o) && has(o, key)) { delete o[key]; changed = true; }
    }
    function goods(items) {
      if (Array.isArray(items)) items.forEach(function (item) { clear(item, "goods_info"); });
    }
    function filter(o, key, predicate) {
      if (!object(o) || !Array.isArray(o[key])) return;
      var kept = o[key].filter(function (item) { return !object(item) || !predicate(item); });
      if (kept.length !== o[key].length) { o[key] = kept; changed = true; }
    }
    function adType(value) {
      return typeof value === "string" && (/(^|_)ad(?:_|$)/.test(value) ||
        ["advert", "advertisement", "feed_advert"].indexOf(value) !== -1);
    }
    function truthy(o, key) { return object(o) && !!o[key]; }
    function labelledAd(item) {
      var line = item.common_card && item.common_card.footline;
      var text = line && Array.isArray(line.elements) && line.elements[0] && line.elements[0].text;
      return object(text) && typeof text.panel_text === "string" && text.panel_text.indexOf("广告") !== -1;
    }
    if (tieba) {
      var route = tieba[1];
      var banner = object(body.banner_list) ? body.banner_list : null;
      if (route === "frs/page") {
        var head = body.activityhead;
        if (object(head) && [true, 1, "1"].indexOf(head.is_ad) !== -1) { body.activityhead = {}; changed = true; }
        var forumBanner = object(body.forum) && body.forum.banner_list;
        if (object(forumBanner)) goods(forumBanner.app);
      } else if (route === "frs/generalTabList") {
        goods(body.app_list);
      } else if (route === "pb/picpage") {
        // The source identifies this as the picture-viewer live promotion placement.
        clear(body, "recom_live_list");
      } else {
        if (banner) goods(banner.app);
        if (route === "pb/page") {
          if (banner && object(banner.pb_banner_ad)) clear(banner.pb_banner_ad, "goods_info");
          if (Array.isArray(body.post_list)) body.post_list.forEach(function (post) {
            if (object(post) && post.outer_item) { post.outer_item = null; changed = true; }
          });
        } else if (route === "excellent/personalized" && body.live_answer) {
          body.live_answer = null; changed = true;
        }
      }
    } else if (zhihu) {
      var zroute = zhihu[1];
      if (zroute === "commercial_api/app_float_layer") {
        remove(body, "feed_egg");
      } else if (zroute === "topstory/recommend") {
        filter(body, "data", function (item) {
          return item.type === "feed_advert" || !!item.promotion_extra ||
            (item.type === "common_card" && labelledAd(item));
        });
      } else if (zroute === "topstory/hot-lists/total") {
        filter(body, "data", function (item) { return truthy(item, "ad"); });
      } else if (zroute === "v2/topstory/hot-lists/everyone-seeing") {
        filter(body.data, "data", function (item) {
          var area = object(item.target) && item.target.metrics_area;
          return object(area) && typeof area.text === "string" && area.text.indexOf("合作推广") !== -1;
        });
      } else if (zroute === "next-bff") {
        filter(body, "data", function (item) {
          var origin = item.origin_data;
          return object(origin) && (adType(origin.type) || adType(origin.resource_type));
        });
      } else if (zroute === "next-data") {
        filter(body.data, "data", function (item) { return adType(item.type); });
      } else if (zroute === "next-render") {
        filter(body, "data", function (item) { return !!item.adjson || adType(item.type); });
      } else {
        remove(body, "ad_info");
        remove(body.data, "ad_info");
      }
    } else if (object(body.data)) {
      remove(body.data, "splash");
      if (typeof body.data.skip_splash === "boolean" && !body.data.skip_splash) {
        body.data.skip_splash = true; changed = true;
      }
    }
    console.log("[SR-ads-v4] page " + (tieba ? "Tieba" : zhihu ? "Zhihu" : "Xiaomi") + " " + (changed ? "cleaned" : "unchanged"));
    $done(changed ? {body: JSON.stringify(body)} : {});
  } catch (_) { $done({}); }
}());
