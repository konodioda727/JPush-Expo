/**
 * 全局配置管理
 */

let JPUSH_APPKEY = 'appKey';
let JPUSH_CHANNEL = 'channel';
let JPUSH_APS_FOR_PRODUCTION = true;

/**
 * 设置 JPush 配置
 * @param appKey - JPush AppKey
 * @param channel - JPush Channel
 * @param apsForProduction - iOS 推送环境（默认为生产环境）
 */
export const setConfig = (
  appKey: string,
  channel: string,
  apsForProduction: boolean = true
): void => {
  JPUSH_APPKEY = appKey;
  JPUSH_CHANNEL = channel;
  JPUSH_APS_FOR_PRODUCTION = apsForProduction;
};

/**
 * 获取 JPush AppKey
 * @returns JPush AppKey
 */
export const getAppKey = (): string => JPUSH_APPKEY;

/**
 * 获取 JPush Channel
 * @returns JPush Channel
 */
export const getChannel = (): string => JPUSH_CHANNEL;

/**
 * 获取 iOS 推送环境配置
 * @returns 是否为生产环境
 */
export const getApsForProduction = (): boolean => JPUSH_APS_FOR_PRODUCTION;
