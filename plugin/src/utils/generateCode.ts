/**
 * Get line indexes for the generated section of a file.
 *
 * @param src
 */
import crypto from 'crypto';

function getGeneratedSectionIndexes(
  src: string,
  tag: string
): { contents: string[]; start: number; end: number } {
  const contents = src.split('\n');
  const start = contents.findIndex((line) => new RegExp(`@generated begin ${tag} -`).test(line));
  const end = contents.findIndex((line) => new RegExp(`@generated end ${tag}$`).test(line));

  return { contents, start, end };
}

export type MergeResults = {
  contents: string;
  didClear: boolean;
  didMerge: boolean;
};

/**
 * Merge the contents of two files together and add a generated header.
 *
 * @param src contents of the original file
 * @param newSrc new contents to merge into the original file
 * @param identifier used to update and remove merges
 * @param anchor regex to where the merge should begin
 * @param offset line offset to start merging at (<1 for behind the anchor)
 * @param comment comment style `//` or `#`
 */
export function mergeContents({
  src,
  newSrc,
  tag,
  anchor,
  offset = 0,
  comment = "//",
}: {
  src: string;
  newSrc: string;
  tag: string;
  anchor: string | RegExp;
  comment?: string;
  offset?: number;
}): MergeResults {
  const header = createGeneratedHeaderComment(newSrc, tag, comment);
  if (!src.includes(header)) {
    // Ensure the old generated contents are removed.
    const sanitizedTarget = removeGeneratedContents(src, tag);
    return {
      contents: addLines(sanitizedTarget ?? src, anchor, offset, [
        header,
        ...newSrc.split('\n'),
        `${comment} @generated end ${tag}`,
      ]),
      didMerge: true,
      didClear: !!sanitizedTarget,
    };
  }
  return { contents: src, didClear: false, didMerge: false };
}

export function mergeContentsAtLine({
  src,
  newSrc,
  tag,
  lineIndex,
  offset = 0,
  comment = '//',
}: {
  src: string;
  newSrc: string;
  tag: string;
  lineIndex: number;
  comment?: string;
  offset?: number;
}): MergeResults {
  const header = createGeneratedHeaderComment(newSrc, tag, comment);
  if (!src.includes(header)) {
    const sanitizedTarget = removeGeneratedContents(src, tag);
    return {
      contents: addLinesAtIndex(sanitizedTarget ?? src, lineIndex, offset, [
        header,
        ...newSrc.split('\n'),
        `${comment} @generated end ${tag}`,
      ]),
      didMerge: true,
      didClear: !!sanitizedTarget,
    };
  }

  return { contents: src, didClear: false, didMerge: false };
}

export function mergeContentsAtEnd({
  src,
  newSrc,
  tag,
  comment = '//',
}: {
  src: string;
  newSrc: string;
  tag: string;
  comment?: string;
}): MergeResults {
  const header = createGeneratedHeaderComment(newSrc, tag, comment);
  if (src.includes(header)) {
    return { contents: src, didClear: false, didMerge: false };
  }

  const sanitizedTarget = removeGeneratedContents(src, tag);
  const target = sanitizedTarget ?? src;
  const normalizedTarget = target.endsWith('\n') ? target : `${target}\n`;
  const needsSpacer = normalizedTarget.trim().length > 0 && !normalizedTarget.endsWith('\n\n');
  const contents = `${normalizedTarget}${needsSpacer ? '\n' : ''}${[
    header,
    ...newSrc.split('\n'),
    `${comment} @generated end ${tag}`,
  ].join('\n')}\n`;

  return {
    contents,
    didMerge: true,
    didClear: !!sanitizedTarget,
  };
}

export function syncGeneratedContents({
  src,
  newSrc,
  tag,
  anchor,
  offset = 0,
  comment = '//',
}: {
  src: string;
  newSrc: string;
  tag: string;
  anchor: string | RegExp;
  comment?: string;
  offset?: number;
}): MergeResults {
  if (!newSrc.trim()) {
    return removeContents({ src, tag });
  }

  return mergeContents({
    src,
    newSrc,
    tag,
    anchor,
    offset,
    comment,
  });
}

export function syncGeneratedContentsAtLine({
  src,
  newSrc,
  tag,
  lineIndex,
  offset = 0,
  comment = '//',
}: {
  src: string;
  newSrc: string;
  tag: string;
  lineIndex: number;
  comment?: string;
  offset?: number;
}): MergeResults {
  if (!newSrc.trim()) {
    return removeContents({ src, tag });
  }

  return mergeContentsAtLine({
    src,
    newSrc,
    tag,
    lineIndex,
    offset,
    comment,
  });
}

export function syncGeneratedContentsAtEnd({
  src,
  newSrc,
  tag,
  comment = '//',
}: {
  src: string;
  newSrc: string;
  tag: string;
  comment?: string;
}): MergeResults {
  if (!newSrc.trim()) {
    return removeContents({ src, tag });
  }

  return mergeContentsAtEnd({
    src,
    newSrc,
    tag,
    comment,
  });
}

export function replaceGeneratedContentsAtLine({
  src,
  newSrc,
  tag,
  getLineIndex,
  offset = 0,
  comment = '//',
}: {
  src: string;
  newSrc: string;
  tag: string;
  getLineIndex: (src: string) => number;
  comment?: string;
  offset?: number;
}): MergeResults {
  if (!newSrc.trim()) {
    return removeContents({ src, tag });
  }

  const sanitizedTarget = removeGeneratedContents(src, tag) ?? src;
  const lineIndex = getLineIndex(sanitizedTarget);

  return mergeContentsAtLine({
    src: sanitizedTarget,
    newSrc,
    tag,
    lineIndex,
    offset,
    comment,
  });
}

export function removeContents({ src, tag }: { src: string; tag: string }): MergeResults {
  // Ensure the old generated contents are removed.
  const sanitizedTarget = removeGeneratedContents(src, tag);
  return {
    contents: sanitizedTarget ?? src,
    didMerge: false,
    didClear: !!sanitizedTarget,
  };
}

function addLines(content: string, find: string | RegExp, offset: number, toAdd: string[]) {
  const lines = content.split('\n');

  let lineIndex = lines.findIndex((line) => line.match(find));
  if (lineIndex < 0) {
    const error = new Error(`Failed to match "${find}" in contents:\n${content}`) as Error & {
      code?: string;
    };
    error.code = 'ERR_NO_MATCH';
    throw error;
  }

  return addLinesAtIndex(content, lineIndex, offset, toAdd);
}

function addLinesAtIndex(content: string, lineIndex: number, offset: number, toAdd: string[]) {
  const lines = content.split('\n');

  if (lineIndex < 0 || lineIndex >= lines.length) {
    throw new Error(`Failed to insert contents at invalid line index: ${lineIndex}`);
  }

  let insertionIndex = lineIndex + offset;
  if (insertionIndex < 0) {
    insertionIndex = 0;
  } else if (insertionIndex > lines.length) {
    insertionIndex = lines.length;
  }

  for (const newLine of toAdd) {
    lines.splice(insertionIndex, 0, newLine);
    insertionIndex += 1;
  }

  return lines.join('\n');
}

/**
 * Removes the generated section from a file, returns null when nothing can be removed.
 * This sways heavily towards not removing lines unless it's certain that modifications were not made manually.
 *
 * @param src
 */
export function removeGeneratedContents(src: string, tag: string): string | null {
  const { contents, start, end } = getGeneratedSectionIndexes(src, tag);
  if (start > -1 && end > -1 && start < end) {
    contents.splice(start, end - start + 1);
    // TODO: We could in theory check that the contents we're removing match the hash used in the header,
    // this would ensure that we don't accidentally remove lines that someone added or removed from the generated section.
    return contents.join('\n');
  }
  return null;
}

export function createGeneratedHeaderComment(
  contents: string,
  tag: string,
  comment: string
): string {
  const hashKey = createHash(contents);

  // Everything after the `${tag} ` is unversioned and can be freely modified without breaking changes.
  return `${comment} @generated begin ${tag} - expo prebuild (DO NOT MODIFY) ${hashKey}`;
}

export function createHash(src: string): string {
  // this doesn't need to be secure, the shorter the better.
  const hash = crypto.createHash('sha1').update(src).digest('hex');
  return `sync-${hash}`;
}
