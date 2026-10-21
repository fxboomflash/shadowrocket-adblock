/* Tieba ad-only response guard. Derived from the existing tieba-json.js.
 * No request, response or account data is logged or sent elsewhere.
 * Unknown, malformed and error responses are left unchanged.
 */
(function () {
    let result = {};
    try {
        const match = String($request.url || '').match(
            /^https?:\/\/(?:c\.tieba\.baidu\.com|tiebac\.baidu\.com)(?::(?:80|443))?\/([^?#]*)/i
        );
        const path = match && match[1].replace(/\/$/, '');
        const knownPath = ['c/s/sync', 'c/f/ad/getSplashAd', 'tiebaads/commonbatch'].includes(path);
        if (knownPath && successfulHttp($response) && typeof $response.body === 'string') {
            const body = JSON.parse($response.body);
            if (isObject(body) && (!('error_code' in body) || body.error_code === 0 || body.error_code === '0')) {
                const before = JSON.stringify(body);
                if (path === 'c/f/ad/getSplashAd' && (body.error_code === 0 || body.error_code === '0')) {
                    body.error_code = 2230209;
                    body.data = null;
                } else if (path === 'tiebaads/commonbatch' && String($request.method || '').toUpperCase() === 'POST') {
                    if ((body.error_code === 0 || body.error_code === '0') && isObject(body.res) && Array.isArray(body.res.ad)) {
                        body.res.ad = [];
                    }
                } else if (path === 'c/s/sync') {
                    stripSyncAds(body);
                }
                const after = JSON.stringify(body);
                if (after !== before) result = { body: after };
            }
        }
    } catch (_) {
        // Any parsing, shape or serialization failure rolls back to the original response.
        result = {};
    }
    $done(result);

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function successfulHttp(response) {
        const hasCode = 'statusCode' in response;
        const hasStatus = 'status' in response;
        if (!hasCode && !hasStatus) return false;
        const status = parseStatus(hasCode ? response.statusCode : response.status);
        if (status === null || status < 200 || status >= 300) return false;
        // Preserve the original response when the two explicit status fields disagree.
        return !(hasCode && hasStatus) || parseStatus(response.status) === status;
    }

    function parseStatus(value) {
        if (typeof value === 'number') {
            return Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
        }
        if (typeof value !== 'string') return null;
        const text = value.trim();
        const match = text.match(/^(\d{3})$/) || text.match(/^HTTP\/\d+(?:\.\d+)?\s+(\d{3})(?:\s|$)/i);
        if (!match) return null;
        const code = Number(match[1]);
        return code >= 100 && code <= 599 ? code : null;
    }

    function stripSyncAds(body) {
        if (isObject(body.floating_icon)) body.floating_icon = null;
        if (isObject(body.advertisement_config) && body.advertisement_config.advertisement_str) {
            body.advertisement_config = null;
        }
        const adSwitches = [
            'platform_csj_init', 'platform_ks_init', 'platform_gdt_init',
            'platform_baidu_bqt_init', 'platform_jy_init', 'platform_ubix_init',
            'platform_hw_init', 'ad_baichuan_open'
        ];
        if (isObject(body.config) && Array.isArray(body.config.switch)) {
            for (const item of body.config.switch) {
                if (isObject(item) && adSwitches.includes(item.name) && 'type' in item) item.type = '0';
            }
        }
        if (isObject(body.screen_fill_data_result)) {
            for (const name of [
                'screen_fill_advertisement_bear_switch',
                'screen_fill_advertisement_plj_cpc_switch',
                'screen_fill_advertisement_plj_switch'
            ]) {
                if (body.screen_fill_data_result[name] === '1') body.screen_fill_data_result[name] = '0';
            }
        }
        if (body.ad_stlog_switch === '1') body.ad_stlog_switch = '0';
    }
})();
