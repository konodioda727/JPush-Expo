import * as fs from 'fs';
import {
  APP_DELEGATE_PATH,
  APP_BRIDGING_HEADER_PATH,
  compileIosMods,
  createProjectRoot,
  getFixturePath,
  J_PUSH_IMPORTS,
  readEntitlementsPlist,
  readInfoPlist,
  registerIosFixtureLifecycleHooks,
} from './iosFixture';

registerIosFixtureLifecycleHooks();

const countOccurrences = (source: string, needle: string): number =>
  source.split(needle).length - 1;

describe('native iOS AppDelegate mod', () => {
  it('injects JPush registration, APNs callbacks, and delegate handlers', async () => {
    const projectRoot = createProjectRoot();

    await compileIosMods(projectRoot);

    const appDelegate = fs.readFileSync(
      getFixturePath(projectRoot, APP_DELEGATE_PATH),
      'utf8'
    );

    expect(appDelegate).toContain('import UserNotifications');
    expect(appDelegate).toContain(
      'JPUSHService.register(forRemoteNotificationConfig: entity, delegate: self)'
    );
    expect(appDelegate).toContain('#if DEBUG');
    expect(appDelegate).toContain('JPUSHService.setDebugMode()');
    expect(appDelegate).toContain('JPUSHService.setup(withOption: launchOptions,');
    expect(appDelegate).toContain(
      'didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data'
    );
    expect(appDelegate).toContain(
      'didFailToRegisterForRemoteNotificationsWithError error: Error'
    );
    expect(appDelegate).toContain('extension AppDelegate: JPUSHRegisterDelegate');
    expect(appDelegate).toContain(
      'name: NSNotification.Name("J_APNS_NOTIFICATION_ARRIVED_EVENT")'
    );
    expect(appDelegate).toContain(
      'name: NSNotification.Name("J_CUSTOM_NOTIFICATION_EVENT")'
    );
  });

  it('keeps AppDelegate injection idempotent across repeated compiles', async () => {
    const projectRoot = createProjectRoot();

    await compileIosMods(projectRoot);
    const onceCompiled = fs.readFileSync(
      getFixturePath(projectRoot, APP_DELEGATE_PATH),
      'utf8'
    );

    await compileIosMods(projectRoot);
    const twiceCompiled = fs.readFileSync(
      getFixturePath(projectRoot, APP_DELEGATE_PATH),
      'utf8'
    );

    expect(twiceCompiled).toBe(onceCompiled);
    expect(countOccurrences(twiceCompiled, 'import UserNotifications')).toBe(1);
    expect(
      countOccurrences(
        twiceCompiled,
        'JPUSHService.register(forRemoteNotificationConfig: entity, delegate: self)'
      )
    ).toBe(1);
    expect(countOccurrences(twiceCompiled, '#if DEBUG')).toBeGreaterThan(0);
    expect(
      countOccurrences(
        twiceCompiled,
        'didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data'
      )
    ).toBe(1);
    expect(
      countOccurrences(
        twiceCompiled,
        'extension AppDelegate: JPUSHRegisterDelegate'
      )
    ).toBe(1);
  });

  it('preserves native iOS support while deferring launch registration', async () => {
    const projectRoot = createProjectRoot();

    await compileIosMods(projectRoot, {
      autoRegisterOnLaunch: false,
    });

    const appDelegate = fs.readFileSync(
      getFixturePath(projectRoot, APP_DELEGATE_PATH),
      'utf8'
    );
    const bridgingHeader = fs.readFileSync(
      getFixturePath(projectRoot, APP_BRIDGING_HEADER_PATH),
      'utf8'
    );
    const infoPlist = readInfoPlist(projectRoot);
    const entitlements = readEntitlementsPlist(projectRoot);

    expect(appDelegate).toContain('import UserNotifications');
    expect(appDelegate).toContain(
      'didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data'
    );
    expect(appDelegate).toContain(
      'didFailToRegisterForRemoteNotificationsWithError error: Error'
    );
    expect(appDelegate).toContain('extension AppDelegate: JPUSHRegisterDelegate');
    expect(appDelegate).not.toContain(
      'JPUSHService.register(forRemoteNotificationConfig: entity, delegate: self)'
    );
    expect(appDelegate).not.toContain('JPUSHService.setDebugMode()');
    expect(appDelegate).not.toContain(
      'JPUSHService.setup(withOption: launchOptions,'
    );
    expect(appDelegate).not.toContain(
      'NotificationCenter.default.addObserver('
    );
    expect(infoPlist.JPUSH_APPKEY).toBe('tp-key');
    expect(infoPlist.JPUSH_CHANNEL).toBe('tp-chan');
    expect(infoPlist.UIBackgroundModes).toEqual(
      expect.arrayContaining(['fetch', 'remote-notification'])
    );
    expect(entitlements['aps-environment']).toBe('development');
    for (const importLine of J_PUSH_IMPORTS) {
      expect(bridgingHeader).toContain(importLine);
    }
  });

  it('switches launch registration in both directions without duplicates', async () => {
    const projectRoot = createProjectRoot();
    const appDelegatePath = getFixturePath(projectRoot, APP_DELEGATE_PATH);

    await compileIosMods(projectRoot, { autoRegisterOnLaunch: true });
    await compileIosMods(projectRoot, { autoRegisterOnLaunch: false });
    const deferred = fs.readFileSync(appDelegatePath, 'utf8');

    expect(deferred).not.toContain(
      '@generated begin jpush-swift-initialization'
    );
    expect(deferred).toContain('import UserNotifications');
    expect(deferred).toContain('extension AppDelegate: JPUSHRegisterDelegate');

    await compileIosMods(projectRoot, { autoRegisterOnLaunch: false });
    expect(fs.readFileSync(appDelegatePath, 'utf8')).toBe(deferred);

    await compileIosMods(projectRoot, { autoRegisterOnLaunch: true });
    const restored = fs.readFileSync(appDelegatePath, 'utf8');

    expect(countOccurrences(restored, 'JPUSHService.setup(withOption:')).toBe(1);
    expect(
      countOccurrences(
        restored,
        'JPUSHService.register(forRemoteNotificationConfig: entity, delegate: self)'
      )
    ).toBe(1);
    expect(
      countOccurrences(restored, '@generated begin jpush-swift-initialization')
    ).toBe(1);

    await compileIosMods(projectRoot, { autoRegisterOnLaunch: true });
    expect(fs.readFileSync(appDelegatePath, 'utf8')).toBe(restored);
  });
});
