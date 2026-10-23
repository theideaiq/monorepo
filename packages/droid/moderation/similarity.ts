/**
 * Jaro-Winkler similarity (0 = nothing in common, 1 = identical), used to
 * catch small misspellings of banned words. Works on code points, so Arabic
 * and Latin strings compare letter by letter.
 */
export const jaroWinkler = (a: string, b: string, prefixScale = 0.1) => {
  const left = Array.from(a);
  const right = Array.from(b);

  if (left.length === 0 || right.length === 0) {
    return left.length === right.length ? 1 : 0;
  }
  if (a === b) {
    return 1;
  }

  const window = Math.max(
    0,
    Math.floor(Math.max(left.length, right.length) / 2) - 1
  );
  const leftMatches = new Array<boolean>(left.length).fill(false);
  const rightMatches = new Array<boolean>(right.length).fill(false);
  let matches = 0;

  for (let i = 0; i < left.length; i++) {
    const start = Math.max(0, i - window);
    const end = Math.min(i + window + 1, right.length);
    for (let j = start; j < end; j++) {
      if (!rightMatches[j] && left[i] === right[j]) {
        leftMatches[i] = true;
        rightMatches[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) {
    return 0;
  }

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < left.length; i++) {
    if (leftMatches[i]) {
      while (!rightMatches[k]) {
        k++;
      }
      if (left[i] !== right[k]) {
        transpositions++;
      }
      k++;
    }
  }

  const jaro =
    (matches / left.length +
      matches / right.length +
      (matches - transpositions / 2) / matches) /
    3;

  let prefix = 0;
  while (
    prefix < Math.min(4, left.length, right.length) &&
    left[prefix] === right[prefix]
  ) {
    prefix++;
  }

  return jaro + prefix * prefixScale * (1 - jaro);
};
