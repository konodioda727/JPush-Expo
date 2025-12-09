"use strict";
/**
 * iOS 配置集成
 * 参考: https://juejin.cn/post/7554288083597885467
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withIOSConfig = void 0;
const infoPlist_1 = require("./infoPlist");
const appDelegateInterface_1 = require("./appDelegateInterface");
const appDelegate_1 = require("./appDelegate");
const bridgingHeader_1 = require("./bridgingHeader");
const podfile_1 = require("./podfile");
/**
 * 应用所有 iOS 配置
 * @param config - Expo config
 * @returns Modified config
 */
const withIOSConfig = (config) => {
    config = (0, infoPlist_1.withIosInfoPlist)(config);
    config = (0, appDelegateInterface_1.withIosAppDelegateInterface)(config);
    config = (0, appDelegate_1.withIosAppDelegate)(config);
    config = (0, bridgingHeader_1.withIosBridgingHeader)(config);
    config = (0, podfile_1.withIosPodfile)(config);
    return config;
};
exports.withIOSConfig = withIOSConfig;
//# sourceMappingURL=index.js.map