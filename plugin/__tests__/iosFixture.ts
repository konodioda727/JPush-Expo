import { compileModsAsync } from 'expo/config-plugins';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import withJPush from '../src';

type PlistModule = {
  build: (value: Record<string, unknown>) => string;
  parse: (value: string) => Record<string, unknown>;
};

type XcodeProject = {
  addTarget: (
    name: string,
    type: string,
    subfolder: string,
    bundleId: string
  ) => unknown;
  parseSync: () => XcodeProject;
  pbxNativeTargetSection: () => Record<
    string,
    {
      buildConfigurationList?: string;
      name?: string;
    }
  >;
  pbxTargetByName: (name: string) => {
    buildConfigurationList?: string;
  } | null;
  pbxXCBuildConfigurationSection: () => Record<
    string,
    { buildSettings?: Record<string, string | string[] | undefined> }
  >;
  pbxXCConfigurationList: () => Record<
    string,
    { buildConfigurations?: { value: string }[] }
  >;
  writeSync: () => string;
};

type XcodeModule = {
  project: (filePath: string) => XcodeProject;
};

const expoPackageRoot = path.dirname(require.resolve('expo/package.json'));
const plist = require(
  require.resolve('@expo/plist', { paths: [expoPackageRoot] })
).default as PlistModule;
const xcode = require(
  require.resolve('xcode', { paths: [expoPackageRoot] })
) as XcodeModule;

export const FIXTURE_ROOT = path.join(__dirname, 'fixtures', 'ios-project');
export const APP_DELEGATE_PATH = ['ios', 'app', 'AppDelegate.swift'];
export const APP_INFO_PLIST_PATH = ['ios', 'app', 'Info.plist'];
export const APP_BRIDGING_HEADER_PATH = ['ios', 'app', 'app-Bridging-Header.h'];
export const PBXPROJ_PATH = ['ios', 'app.xcodeproj', 'project.pbxproj'];
export const J_PUSH_IMPORTS = [
  '#import <JPUSHService.h>',
  '#import <RCTJPushModule.h>',
  '#import <RCTJPushEventQueue.h>',
];

const tempProjectRoots: string[] = [];

const unquote = (value: string): string => value.replace(/^"(.*)"$/, '$1');

export function registerIosFixtureLifecycleHooks(): void {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();

    while (tempProjectRoots.length > 0) {
      const projectRoot = tempProjectRoots.pop();
      if (projectRoot) {
        fs.rmSync(projectRoot, { recursive: true, force: true });
      }
    }
  });
}

export function getFixturePath(projectRoot: string, segments: string[]): string {
  return path.join(projectRoot, ...segments);
}

export function createProjectRoot(): string {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mx-jpush-ios-'));
  fs.cpSync(FIXTURE_ROOT, projectRoot, { recursive: true });
  tempProjectRoots.push(projectRoot);
  return projectRoot;
}

export function readInfoPlist(projectRoot: string): Record<string, unknown> {
  return plist.parse(
    fs.readFileSync(getFixturePath(projectRoot, APP_INFO_PLIST_PATH), 'utf8')
  );
}

export function writeInfoPlist(
  projectRoot: string,
  value: Record<string, unknown>
): void {
  fs.writeFileSync(
    getFixturePath(projectRoot, APP_INFO_PLIST_PATH),
    plist.build(value)
  );
}

export function loadXcodeProject(projectRoot: string): XcodeProject {
  const project = xcode.project(getFixturePath(projectRoot, PBXPROJ_PATH));
  project.parseSync();
  return project;
}

export function getTargetBuildSettings(
  project: XcodeProject,
  targetName: string
): Record<string, string | string[] | undefined>[] {
  const target =
    project.pbxTargetByName(targetName) ??
    Object.values(project.pbxNativeTargetSection()).find(
      (candidate) =>
        typeof candidate?.name === 'string' &&
        unquote(candidate.name) === targetName
    ) ??
    null;

  if (!target?.buildConfigurationList) {
    throw new Error(`Target ${targetName} not found in fixture project`);
  }

  const configurationList =
    project.pbxXCConfigurationList()[target.buildConfigurationList];

  return (configurationList?.buildConfigurations ?? []).map(
    ({ value }) =>
      project.pbxXCBuildConfigurationSection()[value]?.buildSettings ?? {}
  );
}

export function removeBridgingHeaderBuildSetting(projectRoot: string): void {
  const pbxprojPath = getFixturePath(projectRoot, PBXPROJ_PATH);
  const nextContents = fs
    .readFileSync(pbxprojPath, 'utf8')
    .replace(
      /\n\s*SWIFT_OBJC_BRIDGING_HEADER = "app\/app-Bridging-Header\.h";/g,
      ''
    );

  fs.writeFileSync(pbxprojPath, nextContents);
}

export async function compileIosMods(projectRoot: string): Promise<void> {
  const config = withJPush(
    {
      name: 'app',
      slug: 'app',
      version: '1.0.0',
    },
    {
      appKey: 'test-app-key',
      channel: 'test-channel',
      packageName: 'com.example.test',
    }
  );

  await compileModsAsync(config, {
    projectRoot,
    platforms: ['ios'],
  });
}
