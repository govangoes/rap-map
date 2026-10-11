// Run with: node tests/engine.test.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { setDictionary, analyzeWord, findFamilies, dictionarySize } from "../assets/engine.js";

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

console.log("engine tests passed");
