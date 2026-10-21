# 来源与许可

本次 GitHub 发布使用 2026-10-18 的冻结交付内容。第三方贡献归原作者；表中的项目包含规则来源和接口/字段参考，列为参考不代表整份脚本被复制。

## 域名与关键词规则

- [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)：原 Advertising_Domain.list 与 Advertising.list；保留其 GPL-2.0 许可及派生说明。
- [privacy-protection-tools/anti-AD](https://github.com/privacy-protection-tools/anti-AD)：广告域名参考，许可证见原项目及本仓库副本。
- [TG-Twilight/AWAvenue-Ads-Rule](https://github.com/TG-Twilight/AWAvenue-Ads-Rule)、[Cats-Team/AdRules](https://github.com/Cats-Team/AdRules)、[hagezi/dns-blocklists](https://github.com/hagezi/dns-blocklists)、[blocklistproject/Lists](https://github.com/blocklistproject/Lists)：历史融合的公开域名来源。来源声明及内容修改记录保留在资源文件和模块注释中。

公开许可文本副本存放在 `licenses/`；不同组件按各自上游条款使用，不将混合内容统一改许可。已修改资源保留原作者声明。规则表对部分共享正常业务主机做过排除，模块对部分普通配置/错误响应保留透传。

## 2026-10-18 核对的固定来源

- [zbsdsb/loon-adblock-plugins](https://github.com/zbsdsb/loon-adblock-plugins/tree/890f64953efc870d4ca6cc5ec19b048c88ec73bb)
- [Thelongdarkorg/loon-plugins](https://github.com/Thelongdarkorg/loon-plugins/tree/84f82bb8b1b67a23fc02d49a94aea768173e9ce8)
- [LazingLuo/LazingLuo_Loon-Rules](https://github.com/LazingLuo/LazingLuo_Loon-Rules/tree/e34ac6af00c40689ece787291d4b1f9f1bb8193a)
- [zirawell/R-Store](https://github.com/zirawell/R-Store/tree/4256954d7832f9a2ae2184566f377f16797fd03e)
- [fmz200/wool_scripts](https://github.com/fmz200/wool_scripts/tree/5d5f63fcf98bc69d5f8f1b1bae6f86a01ee4bb97)
- [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script/tree/7dd06b44f5093dd5404e1e5f3bca5452d97146ef)
- [skernelx/SurgeScripts](https://github.com/skernelx/SurgeScripts/tree/406d5947e76299206ad0007cfc913f6ad6c95f0d)
- [gauss2014/Gauss-AdClean](https://github.com/gauss2014/Gauss-AdClean/tree/87f7a2bf9ba0168abb4da46cfc3765eef3640796)
- [letswish/Shadowrocket-Module](https://github.com/letswish/Shadowrocket-Module/tree/f693a8c83c254ac9937f4b78e96180ef82869328)
- [VME98/jinx-rules](https://github.com/VME98/jinx-rules/tree/f9c2edb01783d33769731fc5f1dadb9b41b388ba)
- [ddgksf2013/Rewrite](https://github.com/ddgksf2013/Rewrite/tree/dc3ea2c1fb2db870676b26da24006083eb1d44d3)

- [阿里公开 MTOP SDK 2.6.1](https://g.alicdn.com/mtb/lib-mtop/2.6.1/mtop.js)：H5/JSONP 与带凭据跨域语义参考，未打包 SDK。
- [Usagi-org/ai-goofish-monitor 固定参考](https://github.com/Usagi-org/ai-goofish-monitor/blob/77f8d75869acd65f9dba72731b95c7c49ea67bdf/src/config.py)：H5 网关名称参考，未导入其账号/监控代码。

## 继承模块中的来源声明

- 开屏接口参考：https://github.com/Thelongdarkorg/loon-plugins/tree/b35c812d9b6c33ad60335d2b2c02185c94ac9634
- 航旅结构参考：https://ddgksf2013.top/rewrite/UmetripAds.conf（2026-10-05 V1.0.3）
- 酷狗广告路径及功能域名参考：https://github.com/Thelongdarkorg/loon-plugins/blob/f89736efda21bde4850e99900ce8c7899c3cb099/kugou_splash_ad_block.plugin
- 酷狗路径交叉依据：https://github.com/zirawell/R-Store/tree/dea5018c844e3486df872d6fb2207e3652e3d82b/Rule/Surge/Adblock/App/K
- 闲鱼广告策略类型参考：https://github.com/skernelx/SurgeScripts/blob/406d5947e76299206ad0007cfc913f6ad6c95f0d/xianyu/xianyu-ad-block.js
- 闲鱼搜索明确广告标记参考：https://github.com/gauss2014/Gauss-AdClean/blob/87f7a2bf9ba0168abb4da46cfc3765eef3640796/components/Gauss-AdClean-Advanced.sgmodule
- 字段参考：https://github.com/Biliverse/ADBlock/blob/bd321966ca3736a46dce1c8d9d6be6735d40c06c/src/class/ADBlock.mjs
- 接口参考：https://github.com/Biliverse/ADBlock/blob/main/src/process/Response.mjs
- 网页真实响应：https://github.com/pskdje/bilibili-API-collect/blob/main/docs/video/recommend.md
- 参考：https://github.com/gys619/surge-tools/blob/main/modules/Bilibili_remove_ads.sgmodule
- 接口及素材样例：https://github.com/pskdje/bilibili-API-collect/blob/master/docs/APP_widget/splash.md
- https://github.com/zirawell/R-Store/blob/dea5018c844e3486df872d6fb2207e3652e3d82b/Rule/Surge/Adblock/App/W/完美世界电竞/wmpvp.sgmodule

## 发布对应关系

`verification/migration.json` 记录基线哈希、资源原地址及迁移后的路径与哈希。12 份资源逐字节保留，生效配置在还原资源 URL 后与基线相同。SHA256 校验清单见 `checksums.json`。不公开工作目录、私有回执、账户信息或真实抓包。
