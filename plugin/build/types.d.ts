/**
 * JPush Config Plugin Types
 */
/**
 * JPush 插件配置参数
 */
export interface JPushPluginProps {
    /**
     * 极光推送 AppKey（必填）
     */
    appKey: string;
    /**
     * 极光推送 Channel（必填）
     */
    channel: string;
    /**
     * iOS 推送环境（可选）
     * @default true - 生产环境
     */
    apsForProduction?: boolean;
}
/**
 * 验证插件参数
 * @throws {Error} 当参数无效时抛出错误
 */
export declare function validateProps(props: JPushPluginProps | undefined): asserts props is JPushPluginProps;
//# sourceMappingURL=types.d.ts.map