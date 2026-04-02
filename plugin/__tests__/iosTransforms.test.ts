import fs from 'fs';
import os from 'os';
import path from 'path';
import { applyIosAppDelegate } from '../src/ios/appDelegate';
import {
  applyBridgingHeaderBuildSettings,
  getBridgingHeaderFilePath,
  syncBridgingHeaderFile,
  upsertBridgingHeaderImports,
} from '../src/ios/bridgingHeader';
import { applyIosInfoPlist, mergeBackgroundModes } from '../src/ios/infoPlist';
import { setConfig } from '../src/utils/config';

const readFixture = (fixturePath: string): string =>
  fs.readFileSync(path.join(__dirname, 'fixtures', fixturePath), 'utf8');

function createMockXcodeProject() {
  const buildConfigurations = {
    DEBUG_CONFIG: {
      buildSettings: {} as Record<string, string>,
    },
    RELEASE_CONFIG: {
      buildSettings: {} as Record<string, string>,
    },
    WIDGET_CONFIG: {
      buildSettings: {} as Record<string, string>,
    },
  };

  return {
    getTarget: (productType: string) => {
      if (productType !== 'com.apple.product-type.application') {
        return null;
      }

      return {
        uuid: 'TARGET_APP',
        target: {
          name: '"app"',
          buildConfigurationList: 'CONFIG_LIST_APP',
        },
      };
    },
    pbxXCConfigurationList: () => ({
      CONFIG_LIST_APP: {
        buildConfigurations: [{ value: 'DEBUG_CONFIG' }, { value: 'RELEASE_CONFIG' }],
      },
      CONFIG_LIST_WIDGET: {
        buildConfigurations: [{ value: 'WIDGET_CONFIG' }],
      },
    }),
    pbxXCBuildConfigurationSection: () => buildConfigurations,
  };
}

describe('iOS transforms', () => {
  beforeEach(() => {
    setConfig('demo-app-key', 'demo-channel', 'com.demo.app', true, undefined);
  });

  it('should merge Info.plist background modes without overwriting existing values', () => {
    expect(mergeBackgroundModes(['processing', 'fetch'])).toEqual([
      'processing',
      'fetch',
      'remote-notification',
    ]);
    expect(mergeBackgroundModes('processing')).toEqual([
      'processing',
      'fetch',
      'remote-notification',
    ]);

    const infoPlist = applyIosInfoPlist(
      {
        UIBackgroundModes: ['processing'],
        CFBundleDisplayName: 'Demo',
      },
      { appKey: 'demo-app-key', channel: 'demo-channel', packageName: 'com.demo.app', apsForProduction: true }
    );

    expect(infoPlist.UIBackgroundModes).toEqual([
      'processing',
      'fetch',
      'remote-notification',
    ]);
    expect(infoPlist.JPUSH_APPKEY).toBe('demo-app-key');
    expect(infoPlist.JPUSH_APS_FOR_PRODUCTION).toBe(true);
  });

  it('should inject AppDelegate code and remain idempotent', () => {
    const fixture = readFixture('ios/AppDelegate.swift.fixture');
    const transformed = applyIosAppDelegate(fixture);
    const repeated = applyIosAppDelegate(transformed);

    expect(transformed).toContain('import UserNotifications');
    expect(transformed).toContain('JPUSHService.setup(withOption: launchOptions');
    expect(transformed).toContain('didRegisterForRemoteNotificationsWithDeviceToken');
    expect(transformed).toContain('extension AppDelegate: JPUSHRegisterDelegate');
    expect(repeated).toBe(transformed);
  });

  it('should insert AppDelegate remote notification methods before the class closing brace without relying on open url anchor', () => {
    const fixture = [
      'import Expo',
      'import React',
      '',
      'public class AppDelegate: ExpoAppDelegate {',
      '  public override func application(',
      '    _ application: UIApplication,',
      '    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil',
      '  ) -> Bool {',
      '    return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
      '  }',
      '}',
      '',
      'class ReactNativeDelegate: NSObject {}',
    ].join('\n');

    const transformed = applyIosAppDelegate(fixture);
    const classCloseIndex = transformed.indexOf('\n}\n\nclass ReactNativeDelegate');
    const remoteMethodIndex = transformed.indexOf('didRegisterForRemoteNotificationsWithDeviceToken');

    expect(remoteMethodIndex).toBeGreaterThan(-1);
    expect(remoteMethodIndex).toBeLessThan(classCloseIndex);
  });

  it('should update only application target bridging header settings', () => {
    const xcodeProject = createMockXcodeProject();
    const targetName = applyBridgingHeaderBuildSettings(
      xcodeProject,
      '"app/app-Bridging-Header.h"'
    );

    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    expect(targetName).toBe('app');
    expect(configurations.DEBUG_CONFIG.buildSettings?.SWIFT_OBJC_BRIDGING_HEADER).toBe(
      '"app/app-Bridging-Header.h"'
    );
    expect(configurations.RELEASE_CONFIG.buildSettings?.SWIFT_OBJC_BRIDGING_HEADER).toBe(
      '"app/app-Bridging-Header.h"'
    );
    expect(configurations.WIDGET_CONFIG.buildSettings?.SWIFT_OBJC_BRIDGING_HEADER).toBeUndefined();
  });

  it('should create and update the bridging header file idempotently', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mx-jpush-expo-'));
    const bridgingHeaderPath = getBridgingHeaderFilePath(
      tempRoot,
      'app/app-Bridging-Header.h'
    );

    syncBridgingHeaderFile(bridgingHeaderPath);
    syncBridgingHeaderFile(bridgingHeaderPath);

    const contents = fs.readFileSync(bridgingHeaderPath, 'utf8');
    expect(contents).toContain('#import <JPUSHService.h>');
    expect(contents.match(/#import <JPUSHService.h>/g)).toHaveLength(1);
    expect(contents).toContain('#import <RCTJPushModule.h>');
    expect(contents).toContain('#import <RCTJPushEventQueue.h>');
  });

  it('should append only missing bridging header imports', () => {
    const contents = upsertBridgingHeaderImports(`#import <JPUSHService.h>\n`);

    expect(contents).toContain('#import <JPUSHService.h>');
    expect(contents).toContain('#import <RCTJPushModule.h>');
    expect(contents).toContain('#import <RCTJPushEventQueue.h>');
    expect(contents.match(/#import <JPUSHService.h>/g)).toHaveLength(1);
  });
});
