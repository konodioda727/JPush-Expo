/**
 * 厂商通道配置工具
 */
import { VendorChannelConfig } from '../types';

declare global {
  var __JPUSH_VENDOR_CHANNELS__: VendorChannelConfig | undefined;
}

/**
 * 获取当前配置的厂商通道列表
 */
export function getVendorChannels(): VendorChannelConfig | undefined {
  return globalThis.__JPUSH_VENDOR_CHANNELS__;
}

/**
 * 获取厂商通道开启状态标记
 */
export function getProjectVendorFlags(): Record<string, boolean> {
  const channels = getVendorChannels();
  if (!channels) return {};
  return Object.fromEntries(
    Object.entries(channels).map(([key, value]) => [key, Boolean(value?.enabled)])
  );
}

/**
 * 旧版本生成标签列表，用于清理旧配置
 */
export const LEGACY_PROJECT_BUILD_TAGS = [
  'jpush-buildscript-repositories',
  'jpush-buildscript-classpaths',
  'jpush-allprojects-repositories',
];

/**
 * 获取buildscript需要添加的maven仓库配置
 */
export function getBuildscriptRepositories(): string {
  const flags = getProjectVendorFlags();
  const repos: string[] = [];
  if (flags.huawei) {
    repos.push(`maven { url 'https://developer.huawei.com/repo/' }`);
  }
  if (flags.honor) {
    repos.push(`maven { url 'https://developer.hihonor.com/repo' }`);
  }
  return repos.join('\n        ');
}
