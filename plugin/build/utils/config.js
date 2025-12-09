"use strict";
/**
 * 全局配置管理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApsForProduction = exports.getChannel = exports.getAppKey = exports.setConfig = void 0;
let JPUSH_APPKEY = 'appKey';
let JPUSH_CHANNEL = 'channel';
let JPUSH_APS_FOR_PRODUCTION = true;
/**
 * 设置 JPush 配置
 * @param appKey - JPush AppKey
 * @param channel - JPush Channel
 * @param apsForProduction - iOS 推送环境（默认为生产环境）
 */
const setConfig = (appKey, channel, apsForProduction = true) => {
    JPUSH_APPKEY = appKey;
    JPUSH_CHANNEL = channel;
    JPUSH_APS_FOR_PRODUCTION = apsForProduction;
};
exports.setConfig = setConfig;
/**
 * 获取 JPush AppKey
 * @returns JPush AppKey
 */
const getAppKey = () => JPUSH_APPKEY;
exports.getAppKey = getAppKey;
/**
 * 获取 JPush Channel
 * @returns JPush Channel
 */
const getChannel = () => JPUSH_CHANNEL;
exports.getChannel = getChannel;
/**
 * 获取 iOS 推送环境配置
 * @returns 是否为生产环境
 */
const getApsForProduction = () => JPUSH_APS_FOR_PRODUCTION;
exports.getApsForProduction = getApsForProduction;
//# sourceMappingURL=config.js.map