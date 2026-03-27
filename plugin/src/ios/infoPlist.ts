/**
 * iOS Info.plist 配置
 * 参考: https://juejin.cn/post/7554288083597885467
 */

import { ConfigPlugin, withInfoPlist } from 'expo/config-plugins';
import { getAppKey, getApsForProduction, getChannel } from '../utils/config';

type InfoPlistShape = Record<string, unknown> & {
  JPUSH_APS_FOR_PRODUCTION?: boolean;
  JPUSH_APPKEY?: string;
  JPUSH_CHANNEL?: string;
  UIBackgroundModes?: string[];
};

export function mergeBackgroundModes(existingModes?: string[]): string[] {
  const modes = new Set(existingModes ?? []);
  modes.add('fetch');
  modes.add('remote-notification');
  return Array.from(modes);
}

export function applyIosInfoPlist(infoPlist: InfoPlistShape): InfoPlistShape {
  return {
    ...infoPlist,
    UIBackgroundModes: mergeBackgroundModes(infoPlist.UIBackgroundModes),
    JPUSH_APPKEY: getAppKey(),
    JPUSH_CHANNEL: getChannel(),
    JPUSH_APS_FOR_PRODUCTION: getApsForProduction(),
  };
}

/**
 * 配置 iOS Info.plist
 * 添加推送通知所需的后台模式
 */
export const withIosInfoPlist: ConfigPlugin = (config) =>
  withInfoPlist(config, (config) => {
    config.modResults = applyIosInfoPlist(config.modResults as InfoPlistShape) as typeof config.modResults;
    return config;
  });
