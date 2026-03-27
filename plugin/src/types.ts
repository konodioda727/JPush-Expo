/**
 * JPush Config Plugin Types
 */

/**
 * 厂商通道配置
 */
export interface VendorChannelConfig {
  /**
   * 华为推送配置
   */
  huawei?: {
    enabled: boolean;
  };

  /**
   * FCM 推送配置
   */
  fcm?: {
    enabled: boolean;
  };

  /**
   * 魅族推送配置
   */
  meizu?: {
    appKey: string;
    appId: string;
  };

  /**
   * 小米推送配置
   */
  xiaomi?: {
    appId: string;
    appKey: string;
  };

  /**
   * OPPO 推送配置
   */
  oppo?: {
    appKey: string;
    appId: string;
    appSecret: string;
  };

  /**
   * VIVO 推送配置
   */
  vivo?: {
    appKey: string;
    appId: string;
  };

  /**
   * 荣耀推送配置
   */
  honor?: {
    appId: string;
  };

  /**
   * 蔚来推送配置
   */
  nio?: {
    appId: string;
  };
}

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
   * Android 包名（必填）
   * 需要与极光推送控制台注册的包名一致
   */
  packageName: string;

  /**
   * iOS 推送环境（可选）
   * @default false - 开发环境
   */
  apsForProduction?: boolean;

  /**
   * 厂商通道配置（可选）
   */
  vendorChannels?: VendorChannelConfig;
}

/**
 * 插件内部使用的已归一化配置
 */
export interface ResolvedJPushPluginProps extends JPushPluginProps {
  apsForProduction: boolean;
}

function validateBooleanVendorChannel(
  vendorChannels: VendorChannelConfig | undefined,
  key: 'huawei' | 'fcm',
  label: string
): void {
  const channel = vendorChannels?.[key];

  if (!channel) {
    return;
  }

  if (typeof channel.enabled !== 'boolean') {
    throw new Error(
      `[MX_JPush_Expo] vendorChannels.${label}.enabled 必须存在且为布尔值`
    );
  }
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

  if (!props.packageName || typeof props.packageName !== 'string') {
    throw new Error('[MX_JPush_Expo] packageName 是必填项，且必须是字符串');
  }

  if (props.apsForProduction !== undefined && typeof props.apsForProduction !== 'boolean') {
    throw new Error('[MX_JPush_Expo] apsForProduction 必须是布尔值');
  }

  validateBooleanVendorChannel(props.vendorChannels, 'huawei', 'huawei');
  validateBooleanVendorChannel(props.vendorChannels, 'fcm', 'fcm');
}

/**
 * 归一化插件参数，补齐内部默认值
 */
export function resolveProps(
  props: JPushPluginProps
): ResolvedJPushPluginProps {
  return {
    ...props,
    apsForProduction: props.apsForProduction ?? false,
  };
}
