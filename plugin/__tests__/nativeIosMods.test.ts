import * as fs from 'fs';
import {
  APP_BRIDGING_HEADER_PATH,
  J_PUSH_IMPORTS,
  PBXPROJ_PATH,
  compileIosMods,
  createProjectRoot,
  getFixturePath,
  getTargetBuildSettings,
  loadXcodeProject,
  readInfoPlist,
  registerIosFixtureLifecycleHooks,
  removeBridgingHeaderBuildSetting,
  writeInfoPlist,
} from './iosFixture';

registerIosFixtureLifecycleHooks();

describe('native iOS config mods', () => {
  it('merges host background modes instead of overwriting them', async () => {
    const projectRoot = createProjectRoot();
    const infoPlist = readInfoPlist(projectRoot);

    infoPlist.UIBackgroundModes = ['location', 'fetch'];
    writeInfoPlist(projectRoot, infoPlist);

    await compileIosMods(projectRoot);

    const nextInfoPlist = readInfoPlist(projectRoot);
    const backgroundModes = nextInfoPlist.UIBackgroundModes as string[];

    expect(backgroundModes).toEqual([
      'location',
      'fetch',
      'remote-notification',
    ]);
  });

  it('creates and rewires the Bridging Header when the file is missing', async () => {
    const projectRoot = createProjectRoot();
    const headerPath = getFixturePath(projectRoot, APP_BRIDGING_HEADER_PATH);

    fs.rmSync(headerPath);
    removeBridgingHeaderBuildSetting(projectRoot);

    await compileIosMods(projectRoot);

    const headerContents = fs.readFileSync(headerPath, 'utf8');
    const appBuildSettings = getTargetBuildSettings(
      loadXcodeProject(projectRoot),
      'app'
    );

    for (const importLine of J_PUSH_IMPORTS) {
      expect(headerContents).toContain(importLine);
    }

    expect(
      appBuildSettings.every(
        (buildSettings) =>
          buildSettings.SWIFT_OBJC_BRIDGING_HEADER ===
          '"app/app-Bridging-Header.h"'
      )
    ).toBe(true);
  });

  it('keeps Bridging Header imports idempotent across repeated compiles', async () => {
    const projectRoot = createProjectRoot();
    const headerPath = getFixturePath(projectRoot, APP_BRIDGING_HEADER_PATH);

    fs.writeFileSync(headerPath, `${J_PUSH_IMPORTS.join('\n')}\n`, 'utf8');

    await compileIosMods(projectRoot);
    const onceCompiled = fs.readFileSync(headerPath, 'utf8');

    await compileIosMods(projectRoot);
    const twiceCompiled = fs.readFileSync(headerPath, 'utf8');

    expect(twiceCompiled).toBe(onceCompiled);

    for (const importLine of J_PUSH_IMPORTS) {
      const matches =
        twiceCompiled.match(
          new RegExp(importLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        ) ?? [];
      expect(matches).toHaveLength(1);
    }
  });

  it('does not write the Bridging Header setting to extension targets', async () => {
    const projectRoot = createProjectRoot();
    const pbxprojPath = getFixturePath(projectRoot, PBXPROJ_PATH);
    const project = loadXcodeProject(projectRoot);

    project.addTarget(
      'appWidget',
      'app_extension',
      'appWidget',
      'com.example.widget'
    );
    fs.writeFileSync(pbxprojPath, project.writeSync(), 'utf8');

    await compileIosMods(projectRoot);

    const compiledProject = loadXcodeProject(projectRoot);
    const appBuildSettings = getTargetBuildSettings(compiledProject, 'app');
    const widgetBuildSettings = getTargetBuildSettings(compiledProject, 'appWidget');

    expect(
      appBuildSettings.every(
        (buildSettings) =>
          buildSettings.SWIFT_OBJC_BRIDGING_HEADER ===
          '"app/app-Bridging-Header.h"'
      )
    ).toBe(true);

    expect(
      widgetBuildSettings.every(
        (buildSettings) =>
          !Object.prototype.hasOwnProperty.call(
            buildSettings,
            'SWIFT_OBJC_BRIDGING_HEADER'
          )
      )
    ).toBe(true);
  });
});
