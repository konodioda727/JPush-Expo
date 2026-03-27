export type BlockRange = {
  startLine: number;
  endLine: number;
  startIndex: number;
  endIndex: number;
};

export function getLineIndent(line: string): string {
  const match = line.match(/^\s*/);
  return match?.[0] ?? '';
}

export function findLineIndex(
  src: string,
  pattern: RegExp,
  fromLine = 0,
  toLine?: number
): number {
  const lines = src.split('\n');
  const end = toLine ?? lines.length;

  for (let index = fromLine; index < end; index += 1) {
    if (pattern.test(lines[index])) {
      return index;
    }
  }

  return -1;
}

export function findLastLineIndex(src: string, pattern: RegExp): number {
  const lines = src.split('\n');

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (pattern.test(lines[index])) {
      return index;
    }
  }

  return -1;
}

export function findBlockRange(src: string, pattern: RegExp): BlockRange | null {
  const startLine = findLineIndex(src, pattern);
  if (startLine < 0) {
    return null;
  }

  return getBlockRangeFromLine(src, startLine);
}

export function findNestedBlockRange(
  src: string,
  parentPattern: RegExp,
  childPattern: RegExp
): BlockRange | null {
  const parentRange = findBlockRange(src, parentPattern);
  if (!parentRange) {
    return null;
  }

  const childLine = findLineIndex(src, childPattern, parentRange.startLine + 1, parentRange.endLine);
  if (childLine < 0) {
    return null;
  }

  return getBlockRangeFromLine(src, childLine);
}

export function ensureTopLevelBlock(src: string, blockName: string): string {
  if (findBlockRange(src, new RegExp(`^\\s*${blockName}\\s*\\{`))) {
    return src;
  }

  const lines = src.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] !== '') {
    lines.push('');
  }
  lines.push(`${blockName} {`, '}');
  return lines.join('\n');
}

export function ensureNestedBlock(src: string, parentPattern: RegExp, blockName: string): string {
  const existing = findNestedBlockRange(
    src,
    parentPattern,
    new RegExp(`^\\s*${blockName}\\s*\\{`)
  );
  if (existing) {
    return src;
  }

  const parentRange = findBlockRange(src, parentPattern);
  if (!parentRange) {
    throw new Error(`Failed to find parent block for "${blockName}"`);
  }

  const lines = src.split('\n');
  const parentIndent = getLineIndent(lines[parentRange.startLine]);
  const childIndent = `${parentIndent}    `;

  lines.splice(
    parentRange.startLine + 1,
    0,
    `${childIndent}${blockName} {`,
    `${childIndent}}`
  );

  return lines.join('\n');
}

export function normalizeQuotedName(value: string | undefined): string {
  return (value ?? '').replace(/^"+|"+$/g, '');
}

function getBlockRangeFromLine(src: string, startLine: number): BlockRange {
  const lines = src.split('\n');
  const startIndex = lines.slice(0, startLine).join('\n').length + (startLine > 0 ? 1 : 0);
  const braceIndex = src.indexOf('{', startIndex);

  if (braceIndex < 0) {
    throw new Error(`Failed to find opening brace for block starting on line ${startLine + 1}`);
  }
  let depth = 0;

  for (let index = braceIndex; index < src.length; index += 1) {
    const char = src[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const endLine = src.slice(0, index).split('\n').length - 1;
        return {
          startLine,
          endLine,
          startIndex,
          endIndex: index,
        };
      }
    }
  }

  throw new Error(`Failed to find closing brace for block starting on line ${startLine + 1}`);
}
