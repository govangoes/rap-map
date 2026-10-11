// Rap Map vocabulary stats. Pure functions, no DOM.

// Common function words. Used only to build the "top content words" list;
// every other number counts all words.
const STOP_WORDS = new Set(
  (
    "a an and are as at be but by for from had has have he her him his i i'm i'ma i'll i've i'd if in into is it it's its me my " +
    "no not of on or our she so than that that's the their them then there they this to too up us was we were what when which who " +
    "will with would you your you're yeah uh oh ay aye huh got get gon gonna da dat ya yo"
  ).split(/\s+/),
);

export function tokenizeWords(text) {
  const normalized = text.toLowerCase().replace(/[‘’ʼ]/g, "'");
  const matches = normalized.match(/[a-z]+(?:'[a-z]+)*/g) || [];
  return matches;
}

function countBy(words) {
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
  return counts;
}

export function analyzeVocabulary(text, { sampleSize = 1000 } = {}) {
  const words = tokenizeWords(text);
  const total = words.length;
  const counts = countBy(words);
  const unique = counts.size;

  let hapax = 0;
  for (const n of counts.values()) if (n === 1) hapax++;

  const lines = text
    .split("\n")
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
  const lineCounts = countBy(lines);
  let repeatedLineExtras = 0;
  for (const n of lineCounts.values()) if (n > 1) repeatedLineExtras += n - 1;

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const topWords = ranked.filter(([w]) => !STOP_WORDS.has(w)).slice(0, 15);

  const longest = [...counts.keys()]
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .slice(0, 10);

  const totalLetters = words.reduce((sum, w) => sum + w.replace(/'/g, "").length, 0);

  // Fair comparison across different lyric lengths: unique words in the first N words.
  const sample =
    total >= sampleSize ? new Set(words.slice(0, sampleSize)).size : null;

  return {
    total,
    unique,
    typeTokenRatio: total ? unique / total : 0,
    hapax,
    hapaxShare: unique ? hapax / unique : 0,
    avgWordLength: total ? totalLetters / total : 0,
    lineCount: lines.length,
    repeatedLineShare: lines.length ? repeatedLineExtras / lines.length : 0,
    topWords,
    longest,
    sampleSize,
    uniqueInSample: sample,
  };
}
