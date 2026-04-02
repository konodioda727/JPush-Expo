import * as fs from 'fs';
import * as path from 'path';
import { compileModsAsync } from 'expo/config-plugins';
import withJPush from '../src';
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
import { createExpoConfig, createPluginProps } from './testProps';
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

  it('reuses an existing custom Bridging Header path when the app target already defines one', async () => {
    const projectRoot = createProjectRoot();
    const pbxprojPath = getFixturePath(projectRoot, PBXPROJ_PATH);
    const customRelativePath = 'app/Supporting/Shared-Bridging-Header.h';
    const customHeaderPath = path.join(projectRoot, 'ios', customRelativePath);

    fs.writeFileSync(
      pbxprojPath,
      fs
        .readFileSync(pbxprojPath, 'utf8')
        .replace(/app\/app-Bridging-Header\.h/g, customRelativePath),
      'utf8'
    );
    fs.rmSync(customHeaderPath, { force: true });

    await compileIosMods(projectRoot);

    const headerContents = fs.readFileSync(customHeaderPath, 'utf8');
    const appBuildSettings = getTargetBuildSettings(
      loadXcodeProject(projectRoot),
      'app'
    );

    expect(
      appBuildSettings.every(
        (buildSettings) =>
          buildSettings.SWIFT_OBJC_BRIDGING_HEADER === `"${customRelativePath}"`
      )
    ).toBe(true);

    for (const importLine of J_PUSH_IMPORTS) {
      expect(headerContents).toContain(importLine);
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

  it('keeps iOS Info.plist values isolated across independently configured plugin instances', async () => {
    const projectRootA = createProjectRoot();
    const projectRootB = createProjectRoot();
    const configA = withJPush(
      createExpoConfig(),
      createPluginProps({ appKey: 'ios-a', channel: 'chan-a' })
    );
    const configB = withJPush(
      createExpoConfig(),
      createPluginProps({ appKey: 'ios-b', channel: 'chan-b' })
    );

    await compileModsAsync(configA, {
      projectRoot: projectRootA,
      platforms: ['ios'],
    });
    await compileModsAsync(configB, {
      projectRoot: projectRootB,
      platforms: ['ios'],
    });

    const infoPlistA = readInfoPlist(projectRootA);
    const infoPlistB = readInfoPlist(projectRootB);

    expect(infoPlistA.JPUSH_APPKEY).toBe('ios-a');
    expect(infoPlistA.JPUSH_CHANNEL).toBe('chan-a');
    expect(infoPlistB.JPUSH_APPKEY).toBe('ios-b');
    expect(infoPlistB.JPUSH_CHANNEL).toBe('chan-b');
  });
});
