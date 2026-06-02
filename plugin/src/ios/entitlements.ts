import { ExpoConfig } from 'expo/config';
import { withEntitlementsPlist } from 'expo/config-plugins';
import { ResolvedJPushPluginProps } from '../types';

export function applyIosEntitlements(
  entitlements: Record<string, any>,
  props: ResolvedJPushPluginProps
): Record<string, any> {
  entitlements['aps-environment'] = props.apsForProduction
    ? 'production'
    : 'development';

  return entitlements;
}

export function withIosEntitlements(
  config: ExpoConfig,
  props: ResolvedJPushPluginProps
): ExpoConfig {
  return withEntitlementsPlist(config, (nextConfig) => {
    nextConfig.modResults = applyIosEntitlements(nextConfig.modResults, props);
    return nextConfig;
  });
}
