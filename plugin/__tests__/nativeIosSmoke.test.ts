import * as fs from 'fs';
import {
  APP_DELEGATE_PATH,
  compileIosMods,
  createProjectRoot,
  getFixturePath,
  readInfoPlist,
  registerIosFixtureLifecycleHooks,
} from './iosFixture';

registerIosFixtureLifecycleHooks();

describe('native iOS fixture harness', () => {
  it('applies the iOS plugin flow to the fixture project', async () => {
    const projectRoot = createProjectRoot();

    await compileIosMods(projectRoot);

    const appDelegate = fs.readFileSync(
      getFixturePath(projectRoot, APP_DELEGATE_PATH),
      'utf8'
    );
    const infoPlist = readInfoPlist(projectRoot);

    expect(appDelegate).toContain('import UserNotifications');
    expect(appDelegate).toContain('JPUSHService.setup');
    expect(infoPlist.JPUSH_APPKEY).toBe('test-app-key');
    expect(infoPlist.JPUSH_CHANNEL).toBe('test-channel');
    expect(infoPlist.UIBackgroundModes).toEqual(
      expect.arrayContaining(['fetch', 'remote-notification'])
    );
  });
});
