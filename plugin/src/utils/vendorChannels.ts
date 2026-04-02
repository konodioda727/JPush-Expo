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
export function getProjectVendorFlags(vendorChannels?: VendorChannelConfig): Record<string, boolean> {
  const channels = vendorChannels || getVendorChannels();
  if (!channels) return {};
  return Object.fromEntries(
    Object.entries(channels).map(([key, value]) => [key, Boolean(value?.enabled || value?.appId || value?.appKey)])
  );
}

/**
 * 旧版本生成标签列表，用于清理旧配置
 */
export const LEGACY_PROJECT_BUILD_TAGS = [
  'jpush-buildscript-repositories',
  'jpush-buildscript-classpaths',
  'jpush-allprojects-repositories',
  'jpush-huawei-maven-buildscript',
  'jpush-honor-maven-buildscript',
  'jpush-vendor-classpaths',
  'jpush-huawei-maven-allprojects',
  'jpush-honor-maven-allprojects',
];

/**
 * 获取buildscript需要添加的maven仓库配置
 */
export function getBuildscriptRepositories(vendorChannels?: VendorChannelConfig): string {
  const flags = getProjectVendorFlags(vendorChannels);
  const repos: string[] = [];
  if (flags.huawei) {
    repos.push(`maven { url 'https://developer.huawei.com/repo/' }`);
  }
  if (flags.honor) {
    repos.push(`maven { url 'https://developer.hihonor.com/repo' }`);
  }
  return repos.join('\n        ');
}