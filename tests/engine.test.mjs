// Run with: node tests/engine.test.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { setDictionary, setSlang, analyzeWord, lookupPronunciation, flattenLine, findFamilies, dictionarySize } from "../assets/engine.js";

setDictionary(JSON.parse(readFileSync(new URL("../data/cmudict.json", import.meta.url), "utf8")));
assert.ok(dictionarySize() > 100000, "dictionary should load");

const vowels = (w) => analyzeWord(w).map((s) => s.vowel).join(".");

// Reported bugs from real-bar testing: these must come from the dictionary.
assert.equal(vowels("pepper"), "EH.ER");
assert.equal(vowels("mayo"), "EY.OW");
assert.equal(vowels("mango"), "AE.OW");
assert.equal(vowels("never"), "EH.ER");
assert.equal(vowels("city"), "IH.IY");

// mayo / mango / egg roll should land in one family in multisyllabic mode.
const bars = "I put mayo on my egg roll\nShe ate mango with a pepper\nTwo shows at the coast, no ghost";
const res = findFamilies(bars, { minWindow: 2 });
assert.ok(res.families.length > 0, "should find at least one family");

// Seed from the prototype still groups.
const seed = "Apex, say yes, play test\nGray dress, Amex, break neck\nPayless, state press";
const seedRes = findFamilies(seed, { minWindow: 2 });
assert.ok(seedRes.families.some((f) => f.count >= 3), "seed should have a 3+ instance family");

// End-rhyme mode only claims line-final syllables.
const endRes = findFamilies("I like the cat\nHe wore a hat\nWe went home", { lineFinalOnly: true });
assert.equal(endRes.families.length, 1);
assert.equal(endRes.families[0].count, 2);

// Slang not in the dictionary falls back to rules without throwing.
assert.ok(analyzeWord("govangoes").length >= 3);

// ---- Slang / dialect layer ----
const slang = JSON.parse(readFileSync(new URL("../data/slang.json", import.meta.url), "utf8"));
const ARPA = /^((AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)[0-2]|B|CH|D|DH|F|G|HH|JH|K|L|M|N|NG|P|R|S|SH|T|TH|V|W|Y|Z|ZH)$/;
for (const [w, ph] of Object.entries(slang)) {
  assert.match(w, /^[a-z]+$/, `slang key ${w} must be lowercase letters only`);
  assert.ok(ph.split(" ").every((p) => ARPA.test(p)), `bad phones for ${w}`);
}
assert.ok(Object.keys(slang).length > 100);

// Without the overlay, slang falls back to spelling; with it, it gets real vowels.
assert.equal(lookupPronunciation("finna"), null);
setSlang(slang);
assert.equal(vowels("finna"), "IH.AH");
assert.equal(vowels("tryna"), "AY.AH");
assert.equal(vowels("bruh"), "AH");
assert.equal(vowels("goated"), "OW.IH");
assert.equal(vowels("dat"), "AE");

// Slang rhymes with the standard word it sounds like.
const slangRes = findFamilies("I'm finna spin\nShe tryna win\nGet in", { minWindow: 1 });
assert.ok(slangRes.families.length > 0);

// Dialect rules reach known words: dropped g, non-rhotic -a, stretched spelling.
assert.equal(lookupPronunciation("stoppin").source, "rule");
assert.equal(vowels("stoppin"), "AA.IH");
assert.ok(!lookupPronunciation("stoppin").phones.endsWith("NG"));
assert.equal(lookupPronunciation("dolla").source, "rule");
assert.equal(vowels("dolla"), "AA.AH");
assert.equal(vowels("killa"), "IH.AH");
assert.equal(vowels("yeahhhhh"), vowels("yeah"));
assert.equal(lookupPronunciation("gonna").source, "cmu", "CMU still wins when it has the word");

// Syllable-count mismatch (spelling vs pronunciation) still yields positioned syllables.
const sp = analyzeWord("frfr");
assert.equal(sp.length, 4);
assert.ok(sp.every((s) => s.end > s.start && s.vowel));

// Apostrophes don't shift highlight positions.
const flat = flattenLine("ain't no");
assert.equal(flat[0].absStart, 0);
assert.equal(flat[0].absEnd, 5, "ain't highlights through the t");
assert.equal(flat[1].absStart, 6);
assert.equal(flattenLine("ain\u2019t no")[0].absEnd, 5, "curly apostrophe too");

console.log("engine tests passed");
