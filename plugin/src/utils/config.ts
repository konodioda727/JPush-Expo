
/**
 * 配置管理工具
 */
import { VendorChannelConfig } from '../types';

declare global {
  var __JPUSH_CONFIG__: {
    appKey: string;
    channel: string;
    packageName: string;
    apsForProduction: boolean;
    vendorChannels?: VendorChannelConfig;
  } | undefined;
}

/**
 * 设置全局配置
 */
export function setConfig(
  appKey: string,
  channel: string,
  packageName: string,
  apsForProduction: boolean,
  vendorChannels?: VendorChannelConfig
): void {
  globalThis.__JPUSH_CONFIG__ = {
    appKey,
    channel,
    packageName,
    apsForProduction,
    vendorChannels,
  };

  // 同时设置厂商通道配置（保持向后兼容）
  globalThis.__JPUSH_VENDOR_CHANNELS__ = vendorChannels;
}

/**
 * 获取全局配置
 */
export function getConfig(): {
  appKey: string;
  channel: string;
  packageName: string;
  apsForProduction: boolean;
  vendorChannels?: VendorChannelConfig;
} | undefined {
  return globalThis.__JPUSH_CONFIG__;
}
