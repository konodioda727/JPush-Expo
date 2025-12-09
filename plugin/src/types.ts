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
export function validateProps(props: JPushPluginProps | undefined): asserts props is JPushPluginProps {
  if (!props) {
    throw new Error('[MX_JPush_Expo] 插件配置不能为空');
  }

  if (!props.appKey || typeof props.appKey !== 'string') {
    throw new Error('[MX_JPush_Expo] appKey 是必填项，且必须是字符串');
  }

  if (!props.channel || typeof props.channel !== 'string') {
    throw new Error('[MX_JPush_Expo] channel 是必填项，且必须是字符串');
  }

  if (props.apsForProduction !== undefined && typeof props.apsForProduction !== 'boolean') {
    throw new Error('[MX_JPush_Expo] apsForProduction 必须是布尔值');
  }
}
