import * as fs from 'fs';
import {
  APP_DELEGATE_PATH,
  compileIosMods,
  createProjectRoot,
  getFixturePath,
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
});
