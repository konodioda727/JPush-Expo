import { ExpoConfig } from 'expo/config';
import { withEntitlementsPlist } from 'expo/config-plugins';
import { ResolvedJPushPluginProps } from '../types';

export function applyIosEntitlements(
  entitlements: Record<string, any>,
  props: ResolvedJPushPluginProps
): Record<string, any> {
  // Only set aps-environment if it has not already been configured — either via
  // app.json `ios.entitlements`, an existing .entitlements file on disk, or
  // another plugin (e.g. expo-notifications) that ran earlier in the chain.
  if (!('aps-environment' in entitlements)) {
    entitlements['aps-environment'] = props.apsForProduction
      ? 'production'
      : 'development';
  }

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
