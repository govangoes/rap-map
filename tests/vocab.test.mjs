// Run with: node tests/vocab.test.mjs
import assert from "node:assert/strict";
import { analyzeVocabulary, tokenizeWords } from "../assets/vocab.js";

assert.deepEqual(tokenizeWords("Ain’t no 'cause, ain't it? Y’all"), [
  "ain't", "no", "cause", "ain't", "it", "y'all",
]);

const r = analyzeVocabulary("the cat sat\nthe cat sat\nthe dog ran");
assert.equal(r.total, 9);
assert.equal(r.unique, 5); // the, cat, sat, dog, ran
assert.equal(r.hapax, 2); // dog, ran
assert.equal(r.lineCount, 3);
assert.ok(Math.abs(r.repeatedLineShare - 1 / 3) < 1e-9);
assert.equal(r.uniqueInSample, null, "needs 1000 words for the fair-sample metric");
assert.deepEqual(r.topWords.map(([w]) => w), ["cat", "sat", "dog", "ran"]); // "the" is a stop word

const long = Array.from({ length: 1200 }, (_, i) => "w" + (i % 300).toString().replace(/\d/g, (d) => "abcdefghij"[d])).join(" ");
const big = analyzeVocabulary(long);
assert.equal(big.total, 1200);
assert.equal(big.uniqueInSample, 300);

const empty = analyzeVocabulary("");
assert.equal(empty.total, 0);
assert.equal(empty.typeTokenRatio, 0);

console.log("vocab tests passed");
