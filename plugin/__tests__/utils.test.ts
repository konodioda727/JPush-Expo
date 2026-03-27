import {
  createHash,
  mergeContents,
  removeContents,
  replaceGeneratedContentsAtLine,
  syncGeneratedContentsAtEnd,
  syncGeneratedContentsAtLine,
} from '../src/utils/generateCode';
import { Validator } from '../src/utils/codeValidator';
import {
  ensureNestedBlock,
  ensureTopLevelBlock,
  findBlockRange,
  findLastLineIndex,
  findLineIndex,
  normalizeQuotedName,
} from '../src/utils/sourceCode';

describe('generateCode utils', () => {
  it('should merge contents after an anchor and remove them when disabled', () => {
    const src = ['alpha', 'beta', 'gamma'].join('\n');

    const merged = mergeContents({
      src,
      newSrc: 'inserted-line',
      tag: 'demo',
      anchor: /beta/,
      offset: 1,
      comment: '//',
    }).contents;

    expect(merged).toContain('inserted-line');
    expect(merged).toContain('@generated begin demo');

    const removed = removeContents({ src: merged, tag: 'demo' }).contents;
    expect(removed).toBe(src);
  });

  it('should replace generated contents after recalculating the insertion line', () => {
    const src = ['import Expo', 'import React', '', 'class AppDelegate {', '  func boot() {}', '}'].join(
      '\n'
    );

    const first = replaceGeneratedContentsAtLine({
      src,
      newSrc: 'import UserNotifications',
      tag: 'swift-imports',
      getLineIndex: (contents) => findLastLineIndex(contents, /^import\s+/),
      offset: 1,
      comment: '//',
    }).contents;

    const second = replaceGeneratedContentsAtLine({
      src: first,
      newSrc: 'import UserNotifications',
      tag: 'swift-imports',
      getLineIndex: (contents) => findLastLineIndex(contents, /^import\s+/),
      offset: 1,
      comment: '//',
    }).contents;

    expect(second.match(/import UserNotifications/g)).toHaveLength(1);
  });

  it('should sync generated contents by line and at file end', () => {
    const src = ['dependencies {', '}'].join('\n');

    const mergedLine = syncGeneratedContentsAtLine({
      src,
      newSrc: "implementation 'demo'",
      tag: 'deps',
      lineIndex: 0,
      offset: 1,
      comment: '//',
    }).contents;

    expect(mergedLine).toContain("implementation 'demo'");

    const mergedEnd = syncGeneratedContentsAtEnd({
      src: mergedLine,
      newSrc: "apply plugin: 'demo'",
      tag: 'plugins',
      comment: '//',
    }).contents;

    expect(mergedEnd).toContain("apply plugin: 'demo'");

    const removedEnd = syncGeneratedContentsAtEnd({
      src: mergedEnd,
      newSrc: '',
      tag: 'plugins',
      comment: '//',
    }).contents;

    expect(removedEnd).not.toContain("apply plugin: 'demo'");
  });

  it('should clamp generated insertion indexes to file boundaries', () => {
    const src = ['alpha', 'beta'].join('\n');

    const insertedAtStart = syncGeneratedContentsAtLine({
      src,
      newSrc: 'inserted-start',
      tag: 'start',
      lineIndex: 0,
      offset: -10,
      comment: '//',
    }).contents;
    const insertedAtEnd = syncGeneratedContentsAtLine({
      src,
      newSrc: 'inserted-end',
      tag: 'end',
      lineIndex: 1,
      offset: 10,
      comment: '//',
    }).contents;

    expect(insertedAtStart.startsWith('// @generated begin start')).toBe(true);
    expect(insertedAtStart).toContain('\nalpha\nbeta');
    expect(insertedAtEnd.trimEnd().endsWith('// @generated end end')).toBe(true);
  });

  it('should create stable hashes for generated sections', () => {
    expect(createHash('same-content')).toBe(createHash('same-content'));
    expect(createHash('same-content')).not.toBe(createHash('other-content'));
  });
});

describe('sourceCode utils', () => {
  it('should locate lines and blocks, and create missing blocks', () => {
    const src = ['android {', '    compileSdkVersion 34', '}', ''].join('\n');

    const withDefaultConfig = ensureNestedBlock(src, /^\s*android\s*\{/, 'defaultConfig');
    expect(withDefaultConfig).toContain('defaultConfig {');

    const withDependencies = ensureTopLevelBlock(withDefaultConfig, 'dependencies');
    expect(withDependencies).toContain('dependencies {');

    expect(findLineIndex(withDependencies, /^\s*dependencies\s*\{/)).toBeGreaterThan(-1);
    expect(findLastLineIndex(withDependencies, /^\s*}\s*$/)).toBeGreaterThan(-1);

    const blockRange = findBlockRange(withDependencies, /^\s*android\s*\{/);
    expect(blockRange).not.toBeNull();
    expect(blockRange?.endLine).toBeGreaterThan(blockRange?.startLine ?? 0);
  });

  it('should normalize quoted xcode target names', () => {
    expect(normalizeQuotedName('"app"')).toBe('app');
    expect(normalizeQuotedName('app')).toBe('app');
  });
});

describe('Validator', () => {
  it('should run processors in registration order', () => {
    const validator = new Validator('alpha');
    validator.register('append-beta', (src) => ({
      contents: `${src}-beta`,
      didClear: false,
      didMerge: true,
    }));
    validator.register('append-gamma', (src) => ({
      contents: `${src}-gamma`,
      didClear: false,
      didMerge: true,
    }));

    expect(validator.invoke()).toBe('alpha-beta-gamma');
  });
});
