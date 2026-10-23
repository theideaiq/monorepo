/**
 * Jaro-Winkler similarity (0 = nothing in common, 1 = identical), used to
 * catch small misspellings of banned words. Works on code points, so Arabic
 * and Latin strings compare letter by letter.
 */

/** Marks the letters of `left` and `right` that match within the window. */
const matchLetters = (left: string[], right: string[]) => {
  const window = Math.max(
    0,
    Math.floor(Math.max(left.length, right.length) / 2) - 1
  );
  const leftMatches = left.map(() => false);
  const rightMatches = right.map(() => false);

  left.forEach((letter, i) => {
    const start = Math.max(0, i - window);
    const end = Math.min(i + window + 1, right.length);
    for (let j = start; j < end; j += 1) {
      if (!rightMatches[j] && letter === right[j]) {
        leftMatches[i] = true;
        rightMatches[j] = true;
        return;
      }
    }
  });

  return { leftMatches, rightMatches };
};

/** Matched letters that appear in a different order, counted once per pair. */
const countTranspositions = (
  left: string[],
  right: string[],
  leftMatches: boolean[],
  rightMatches: boolean[]
) => {
  const leftLetters = left.filter((_, i) => leftMatches[i]);
  const rightLetters = right.filter((_, j) => rightMatches[j]);
  return leftLetters.filter((letter, i) => letter !== rightLetters[i]).length;
};

const commonPrefixLength = (left: string[], right: string[]) => {
  const limit = Math.min(4, left.length, right.length);
  let prefix = 0;
  while (prefix < limit && left[prefix] === right[prefix]) {
    prefix += 1;
  }
  return prefix;
};

export const jaroWinkler = (a: string, b: string, prefixScale = 0.1) => {
  const left = Array.from(a);
  const right = Array.from(b);

  if (left.length === 0 || right.length === 0) {
    return left.length === right.length ? 1 : 0;
  }
  if (a === b) {
    return 1;
  }

  const { leftMatches, rightMatches } = matchLetters(left, right);
  const matches = leftMatches.filter(Boolean).length;
  if (matches === 0) {
    return 0;
  }

  const transpositions = countTranspositions(
    left,
    right,
    leftMatches,
    rightMatches
  );
  const jaro =
    (matches / left.length +
      matches / right.length +
      (matches - transpositions / 2) / matches) /
    3;

  return jaro + commonPrefixLength(left, right) * prefixScale * (1 - jaro);
};
