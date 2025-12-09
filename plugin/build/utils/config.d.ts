/**
 * 全局配置管理
 */
/**
 * 设置 JPush 配置
 * @param appKey - JPush AppKey
 * @param channel - JPush Channel
 * @param apsForProduction - iOS 推送环境（默认为生产环境）
 */
export declare const setConfig: (appKey: string, channel: string, apsForProduction?: boolean) => void;
/**
 * 获取 JPush AppKey
 * @returns JPush AppKey
 */
export declare const getAppKey: () => string;
/**
 * 获取 JPush Channel
 * @returns JPush Channel
 */
export declare const getChannel: () => string;
/**
 * 获取 iOS 推送环境配置
 * @returns 是否为生产环境
 */
export declare const getApsForProduction: () => boolean;
//# sourceMappingURL=config.d.ts.map