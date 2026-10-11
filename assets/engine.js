// Rap Map phonetic engine (extracted from the Bar Chart prototype).
// Pure functions, no DOM. Pronunciations come from the CMU Pronouncing
// Dictionary (loaded with setDictionary); spelling rules are the fallback for
// slang and made-up words.

let CMUDICT = {};
export function setDictionary(dict) { CMUDICT = dict || {}; }
// Hand-written pronunciations for slang and spoken forms the CMU dictionary lacks
// (finna, bruh, goated...). Keys are lowercase with apostrophes removed. Checked first.
let SLANG = {};
export function setSlang(map) { SLANG = map || {}; }
export function slangSize() { return Object.keys(SLANG).length; }
export function dictionarySize() { return Object.keys(CMUDICT).length; }

const VOWELS = new Set(['a','e','i','o','u']);
function isVowelChar(word, i) {
  const c = word[i];
  if (VOWELS.has(c)) return true;
  if (c === 'y') { const n = word[i+1]; return !(n && VOWELS.has(n)); }
  if (c === 'w') {
    const prev = word[i-1];
    if (prev && 'aeo'.includes(prev)) { const n = word[i+1]; return !n || !VOWELS.has(n); }
    return false;
  }
  return false;
}
function getVowelRuns(word){
  const runs=[]; let i=0;
  while(i<word.length){
    if(isVowelChar(word,i)){ let j=i; while(j<word.length && isVowelChar(word,j)) j++; runs.push([i,j]); i=j; }
    else i++;
  }
  return runs;
}
function syllabify(word){
  const runs = getVowelRuns(word);
  if(runs.length===0) return [{start:0,end:word.length,nucleusStart:0,nucleusEnd:0,openSyllable:false,magicE:false,noVowel:true}];
  const keptCle = runs.length>1 && /[bcdfghjklmnpqrstvwxz]le$/.test(word);
  let stripLast=false;
  if(runs.length>1 && !keptCle){
    const [ls,le]=runs[runs.length-1];
    if(le===word.length && (le-ls)===1 && word[ls]==='e') stripLast=true;
  }
  const nuclei = stripLast ? runs.slice(0,-1) : runs;
  const n = nuclei.length;
  // A kept "-Cle" ending (title, table, cradle) puts its 'l' in the final
  // syllable's onset, not the coda of the syllable before it — so that 'l'
  // shouldn't count toward closing the previous syllable (ti-tle stays open).
  const cleAdjust = (k) => (keptCle && k === n-2) ? 1 : 0;
  const boundaries=[];
  for(let k=0;k<n-1;k++){
    const ne=nuclei[k][1], nns=nuclei[k+1][0], gap=nns-ne-cleAdjust(k);
    boundaries.push(gap<=1 ? ne : ne+Math.ceil(gap/2)+cleAdjust(k));
  }
  const syls=[];
  for(let k=0;k<n;k++){
    const segStart = k===0?0:boundaries[k-1];
    const segEnd = k===n-1?word.length:boundaries[k];
    const [ns,ne]=nuclei[k];
    const openSyllable = k===n-1 ? (stripLast || ne===word.length) : ((nuclei[k+1][0]-ne-cleAdjust(k))<=1 && word[ne]!=='r');
    syls.push({start:segStart,end:segEnd,nucleusStart:ns,nucleusEnd:ne,openSyllable,magicE:stripLast&&k===n-1,noVowel:false});
  }
  return syls;
}
const OO_SHORT=new Set(['book','look','good','foot','wood','hood','stood','took','cook','shook','brook','soot','wool','would','could','should','crook','hook','nook','rook','understood','withstood','foothold','goodness']);
const OU_LONG=new Set(['soup','group','youth','wound','route','troupe','coup','through','you','tour','souvenir']);
const U_SHORT_UH=new Set(['put','full','bull','bush','push','pull','cushion','pudding','sugar','butcher','cuckoo']);
const EA_AS_EY=new Set(['break','great','steak','yea','quay','breakup','breakdown','breakout','heartbreak']);
const EA_AS_EH=new Set(['bread','head','dead','red','said','lead','led','instead','ahead','spread','thread','tread','dread','deaf','death','health','wealth','breath','sweat','sweater','weather','feather','leather','heavy','ready','steady','already','meant']);
const AW_WORDS=new Set(['now','how','cow','wow','pow','bow','vow','allow','plow','plough','brow','prow','chow','endow','avow','disavow','down','town','brown','crown','drown','frown','gown','clown','sundown','downtown','uptown','showdown','breakdown','shutdown','crowd','crowded','powder','shower','flower','tower','power','coward','howl','growl','prowl','scowl','fowl','owl','sow']);
// Closed syllables that are long despite no magic-e (grind, cold, child...).
const I_LONG_CLOSED=new Set(['grind','blind','mind','kind','find','remind','rewind','unwind','behind','wind','bind','rind','child','mild','wild','wildly']);
const O_LONG_CLOSED=new Set(['cold','gold','hold','told','sold','bold','fold','mold','scold','unfold','behold','old','olden','roll','toll','troll','stroll','scroll','enroll','control','most','ghost','host','post','bolt','colt','jolt','revolt']);
// Words where an open-syllable 'e' is genuinely long (fever, not never).
const E_LONG_OPEN=new Set(['even','evening','fever','legal','illegal','regal','secret','decent','recent','decree','degree','agree','female','cedar','meter','metric','zero','hero','heroic','evil','demon','sequel','sequence','legion','region','regional','precedent','zebra','complete','concrete','extreme','supreme','theme','scheme','recede','concede','precede','secede','compete','delete','athlete','evict','event','eve','emcee']);
// Irregular 'a' pronounced as short-e.
const A_AS_EH=new Set(['many','any','anything','anybody','anywhere','anyone','anyway','anymore','anyhow']);
// Multisyllable words where final -y is stressed (AY) rather than the usual trailing -y (IY).

const ARPA_VOWEL_RE = /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)([0-2])$/;
function phonesToCmuSyllables(phonesStr){
  const phones = phonesStr.split(' ');
  const nucleiIdx=[], vowelBase=[], stress=[];
  phones.forEach((p,i)=>{
    const m = ARPA_VOWEL_RE.exec(p);
    if(m){ nucleiIdx.push(i); vowelBase.push(m[1]); stress.push(+m[2]); }
  });
  if(nucleiIdx.length===0) return null;
  const n = nucleiIdx.length;
  const syls=[];
  for(let k=0;k<n;k++){
    const vIdx = nucleiIdx[k];
    const nextVIdx = k===n-1 ? phones.length : nucleiIdx[k+1];
    const interCount = nextVIdx - vIdx - 1;
    let codaCount;
    if(k===n-1) codaCount = phones.length - vIdx - 1; // trailing consonants all belong to the last syllable
    else codaCount = interCount<=1 ? 0 : Math.floor(interCount/2); // single consonant -> next syllable's onset; cluster splits
    const codaPhones = phones.slice(vIdx+1, vIdx+1+codaCount);
    syls.push({vowel:vowelBase[k], stress:stress[k], codaPhones});
  }
  return syls;
}
function cmuCodaClass(codaPhones){
  if(!codaPhones.length) return 'OPEN';
  const c0 = codaPhones[0];
  if(c0==='NG'||c0==='M'||c0==='N') return 'NASAL';
  if(c0==='CH'||c0==='JH') return 'AFFR';
  if(c0==='F'||c0==='V'||c0==='TH'||c0==='DH'||c0==='S'||c0==='Z'||c0==='SH'||c0==='ZH'||c0==='HH') return 'FRIC';
  if(c0==='P'||c0==='B'||c0==='T'||c0==='D'||c0==='K'||c0==='G') return 'STOP';
  if(c0==='L') return 'LIQUID';
  if(c0==='R') return 'R';
  return 'OTHER';
}

function classifyVowel(word, syl){
  if(syl.noVowel) return null;
  const nucleus = word.slice(syl.nucleusStart, syl.nucleusEnd);
  let coda = word.slice(syl.nucleusEnd, syl.end);
  if(syl.magicE && coda.endsWith('e')) coda = coda.slice(0,-1);
  const long = syl.openSyllable || syl.magicE;
  const c0 = coda[0] || '';
  const rColored = c0 === 'r';

  if(rColored){
    switch(nucleus){
      case 'a': return 'AA_R';
      case 'e': return 'ER';
      case 'i': return 'ER';
      case 'u': return 'ER';
      case 'o': return (word[syl.nucleusStart-1]==='w') ? 'ER' : 'AO_R';
      case 'oa': case 'oar': case 'our': return 'AO_R';
      case 'ee': case 'ie': return 'IH_R';
      case 'oo': return 'UW_R';
      default: break;
    }
    if(syl.magicE && nucleus==='a') return 'EH_R';
    if(syl.magicE && nucleus==='i') return 'AY_R';
    if(syl.magicE && nucleus==='o') return 'AO_R';
    if(syl.magicE && nucleus==='u') return 'YUW_R';
    if(nucleus==='ai') return 'EH_R';
    if(nucleus==='ea') return 'IH_R';
    return 'ER';
  }

  switch(nucleus){
    case 'a':
      if(/^(l|ll|lk|lt|lm)/.test(coda)) return 'AO';
      if(A_AS_EH.has(word)) return 'EH'; // many, any — irregular
      return long ? 'EY' : 'AE';
    case 'ai': case 'ay': case 'ey': case 'eigh': return 'EY';
    case 'au': case 'aw': return 'AO';
    case 'e':
      if(!long) return 'EH';
      // Open-syllable 'e' is inconsistent in English (fever vs. never) —
      // short is the far more common case in everyday/rap vocabulary, so
      // that's the default; only a curated list of real long-E words flips it.
      return E_LONG_OPEN.has(word) ? 'IY' : 'EH';
    case 'ee': return 'IY';
    case 'ea':
      if(EA_AS_EY.has(word)) return 'EY';
      if(EA_AS_EH.has(word)) return 'EH';
      return 'IY';
    case 'ei': return 'IY';
    case 'ie': return coda==='' ? 'AY' : 'IY';
    case 'i':
      if(I_LONG_CLOSED.has(word)) return 'AY';
      if(long) return I_SHORT_OPEN.has(word) ? 'IH' : 'AY';
      return 'IH';
    case 'igh': return 'AY';
    case 'ua': return 'AA';
    case 'y':
      if(syl.start === 0) return long ? 'AY' : 'IH'; // word's own first/only syllable: sky, gym, style
      // trailing unstressed -y on a longer word is almost always a long-E sound
      // (happy, many, city) — except the smaller set of stressed final-y verbs
      // (the "-fy" suffix is reliably stressed: satisfy, classify, qualify...).
      if(word.endsWith('fy') || AY_FINAL_WORDS.has(word)) return 'AY';
      return 'IY';
    case 'o': return (long || O_LONG_CLOSED.has(word)) ? 'OW' : 'AA';
    case 'oa': case 'oe': return 'OW';
    case 'ow': return AW_WORDS.has(word) ? 'AW' : 'OW';
    case 'ou': return OU_LONG.has(word) ? 'UW' : 'AW';
    case 'ough': return 'OUGH';
    case 'oo': return OO_SHORT.has(word) ? 'UH' : 'UW';
    case 'oi': case 'oy': return 'OY';
    case 'u':
      if(U_SHORT_UH.has(word)) return 'UH';
      return long ? 'UW' : 'AH';
    case 'ue': case 'ew': return 'UW';
    default: return long ? 'IY' : 'EH';
  }
}
const NASAL=new Set(['m','n']);
const STOP=new Set(['p','b','t','d','k','g','q']);
function codaClass(word, syl){
  let coda = word.slice(syl.nucleusEnd, syl.end);
  if(syl.magicE && coda.endsWith('e')) coda = coda.slice(0,-1);
  coda = coda.replace(/^r/,'');
  if(!coda) return 'OPEN';
  if(/^(ng)/.test(coda)) return 'NASAL';
  if(/^(ck)/.test(coda)) return 'STOP';
  if(/^(ch|dge|ge|j)/.test(coda)) return 'AFFR';
  if(/^(sh|th|zh)/.test(coda)) return 'FRIC';
  const c0=coda[0];
  if(NASAL.has(c0)) return 'NASAL';
  if(STOP.has(c0)) return 'STOP';
  if(c0==='l') return 'LIQUID';
  if('fvszx'.includes(c0)) return 'FRIC';
  return 'OTHER';
}
// Spoken-English rules for words that are in neither list. Each tries to reach a
// known word's pronunciation, so it only fires when the target really exists.
function collapseRepeats(w){ return w.replace(/(.)\1{2,}/g, '$1'); } // yeahhhh -> yeah
function swapLastPhone(phones, from, to){
  const parts = phones.split(' ');
  const last = parts[parts.length-1];
  if(!from.test(last)) return null;
  parts[parts.length-1] = to(last);
  return parts.join(' ');
}
function lookupPronunciation(word){
  const forms = [word];
  const squeezed = collapseRepeats(word);
  if(squeezed !== word) forms.push(squeezed);
  for(const w of forms){
    if(SLANG[w]) return {phones:SLANG[w], source:'slang'};
    if(CMUDICT[w]) return {phones:CMUDICT[w], source:'cmu'};
  }
  for(const w of forms){
    // Dropped g: runnin -> running, with the final NG read as N.
    if(w.length > 3 && w.endsWith('in') && CMUDICT[w+'g']){
      const ph = swapLastPhone(CMUDICT[w+'g'], /^NG$/, () => 'N');
      if(ph) return {phones:ph, source:'rule'};
    }
    // Non-rhotic -a / -ah for -er/-ar/-or: killa, dolla, brotha, sista.
    for(const suffix of ['ah','a']){
      if(w.length > suffix.length + 2 && w.endsWith(suffix)){
        for(const ending of ['er','ar','or']){
          const base = w.slice(0, -suffix.length) + ending;
          const known = CMUDICT[base] || SLANG[base];
          const ph = known && swapLastPhone(known, /^ER[0-2]$/, (p) => 'AH' + p.slice(2));
          if(ph) return {phones:ph, source:'rule'};
        }
      }
    }
  }
  return null;
}
// Spread syllables over a word's letters when the pronunciation and the spelling
// disagree on how many syllables there are (slang spellings often do).
function spreadSyllables(word, cmuSyls){
  const n = cmuSyls.length, len = word.length;
  return cmuSyls.map((c,k) => {
    let start = Math.round(k*len/n), end = Math.round((k+1)*len/n);
    if(start >= len) start = len-1;
    if(end <= start) end = start+1;
    return {
      start, end, nucleusStart:start, nucleusEnd:end, openSyllable:false, magicE:false, noVowel:false,
      vowel:c.vowel, coda:cmuCodaClass(c.codaPhones), stress:c.stress,
    };
  });
}
function analyzeWord(rawWord){
  const word = rawWord.toLowerCase();
  const orthoSyls = syllabify(word);
  const found = lookupPronunciation(word);
  if(found){
    const cmuSyls = phonesToCmuSyllables(found.phones);
    if(cmuSyls){
      if(!orthoSyls[0].noVowel && cmuSyls.length === orthoSyls.length){
        // Real pronunciation, positioned at the spelling-based char ranges.
        return orthoSyls.map((s,k) => ({
          ...s,
          vowel: cmuSyls[k].vowel,
          coda: cmuCodaClass(cmuSyls[k].codaPhones),
          stress: cmuSyls[k].stress,
        }));
      }
      if(found.source !== 'cmu') return spreadSyllables(word, cmuSyls);
    }
  }
  // Out-of-dictionary word (ad-libs, proper nouns) or a rare syllable-count
  // mismatch between spelling and a CMU pronunciation: fall back to the spelling guess.
  return orthoSyls.map(s => ({...s, vowel: classifyVowel(word,s), coda: codaClass(word,s)}));
}

/* ---------------- Line tokenizing + matching ---------------- */
function tokenizeLine(line){
  const tokens=[]; const re=/[a-zA-Z'’]+|[^a-zA-Z'’]+/g; let m;
  while((m=re.exec(line))){ tokens.push({text:m[0],start:m.index,end:m.index+m[0].length,isWord:/[a-zA-Z]/.test(m[0])}); }
  return tokens;
}
function flattenLine(line){
  const tokens=tokenizeLine(line); const flat=[];
  let wordIdx=0;
  for(const tok of tokens){
    if(!tok.isWord) continue;
    const clean = tok.text.replace(/['’]/g,'');
    if(!clean) continue;
    // Map letters of the apostrophe-free word back to positions in the original text.
    const at = []; [...tok.text].forEach((ch,i) => { if(ch !== "'" && ch !== '’') at.push(i); });
    const syls = analyzeWord(clean).filter(s=>!s.noVowel && s.vowel);
    syls.forEach((s,i) => {
      flat.push({
        absStart:tok.start+at[s.start], absEnd:tok.start+at[s.end-1]+1, vowel:s.vowel, coda:s.coda,
        wordIdx, firstOfWord: i===0, lastOfWord: i===syls.length-1,
      });
    });
    if(syls.length) wordIdx++;
  }
  return flat;
}
const MAX_WINDOW=4;
// Vowel classes that rap commonly slant-rhymes across (kit/fleece, dress/trap,
// lot/strut/thought, foot/goose). Used only as a second-pass fallback once
// exact-vowel matches are claimed, so real recall doesn't depend on the
// classifier getting every vowel perfectly — a very common failure mode for
// spelling-only phonetics.
const SLANT_GROUPS = [['IY','IH'],['EY','EH','AE'],['AA','AH','AO'],['UH','UW']];
const SLANT_MAP = new Map();
SLANT_GROUPS.forEach((grp,gi) => grp.forEach(v => SLANT_MAP.set(v, 'G'+gi)));
function familyVowel(v){ return SLANT_MAP.get(v) || v; }

function runPass(flatLines, claimed, sigFn, minWindow, lineFinalOnly, tier){
  const sigMap = new Map();
  for(let li=0; li<flatLines.length; li++){
    const flat = flatLines[li];
    if(lineFinalOnly){
      if(flat.length===0) continue;
      const idx = flat.length-1;
      if(claimed[li][idx]) continue;
      const sig = sigFn(flat[idx]);
      if(!sigMap.has(sig)) sigMap.set(sig,[]);
      sigMap.get(sig).push({lineIdx:li,startIdx:idx,endIdx:flat.length,wlen:1});
      continue;
    }
    for(let wlen=MAX_WINDOW; wlen>=minWindow; wlen--){
      for(let i=0;i+wlen<=flat.length;i++){
        if(!flat[i].firstOfWord || !flat[i+wlen-1].lastOfWord) continue; // never split a word
        let alreadyClaimed=false;
        for(let k=i;k<i+wlen;k++) if(claimed[li][k]){ alreadyClaimed=true; break; }
        if(alreadyClaimed) continue;
        const sig = flat.slice(i,i+wlen).map(sigFn).join('.');
        if(!sigMap.has(sig)) sigMap.set(sig,[]);
        sigMap.get(sig).push({lineIdx:li,startIdx:i,endIdx:i+wlen,wlen});
      }
    }
  }

  const instances = [];
  const sigEntries = [...sigMap.entries()].filter(([sig,arr])=>arr.length>=2);
  sigEntries.sort((a,b)=>b[1][0].wlen - a[1][0].wlen);

  for(const [sig,arr] of sigEntries){
    const usable=[];
    for(const u of arr){
      let free=true;
      for(let k=u.startIdx;k<u.endIdx;k++) if(claimed[u.lineIdx][k]){ free=false; break; }
      if(!free) continue;
      for(let k=u.startIdx;k<u.endIdx;k++) claimed[u.lineIdx][k]=true;
      usable.push(u);
    }
    if(usable.length<2){
      for(const u of usable) for(let k=u.startIdx;k<u.endIdx;k++) claimed[u.lineIdx][k]=false;
      continue;
    }
    for(const u of usable) instances.push({sig, tier, ...u});
  }
  return instances;
}

function findFamilies(text, opts){
  opts = opts || {};
  const minWindow = opts.minWindow || 2;
  const lineFinalOnly = !!opts.lineFinalOnly;
  const lines = text.split('\n');
  const flatLines = lines.map(flattenLine);
  const claimed = flatLines.map(f=>new Array(f.length).fill(false));

  // Pass 1: exact vowel-class match (highest confidence).
  const exact = runPass(flatLines, claimed, s=>s.vowel, minWindow, lineFinalOnly, 'exact');
  // Pass 2 (multisyllabic only): coarser vowel-family match on what's left —
  // catches real slant rhymes the strict pass misses.
  const slant = lineFinalOnly ? [] : runPass(flatLines, claimed, s=>familyVowel(s.vowel), minWindow, lineFinalOnly, 'slant');
  const instances = exact.concat(slant);

  const bySig = new Map();
  for(const inst of instances){ const key=inst.tier+':'+inst.sig; if(!bySig.has(key)) bySig.set(key,[]); bySig.get(key).push(inst); }
  const families = [...bySig.entries()].map(([key,insts])=>({sig:key, tier:insts[0].tier, wlen:insts[0].wlen, count:insts.length, instances:insts}));
  // Exact multisyllabic patterns first, then by length/count; slant patterns fill in after.
  families.sort((a,b)=> (a.tier===b.tier?0:(a.tier==='exact'?-1:1)) || (b.wlen-a.wlen) || (b.count-a.count));
  families.forEach((f,i)=>f.rank=i);

  const lineClaims = lines.map(()=>[]);
  for(const fam of families){
    let refCoda = null;
    for(const inst of fam.instances){
      const flat = flatLines[inst.lineIdx];
      const first = flat[inst.startIdx];
      const last = flat[inst.endIdx-1];
      const codaSig = flat.slice(inst.startIdx, inst.endIdx).map(s=>s.coda).join('.');
      if(refCoda===null) refCoda = codaSig;
      lineClaims[inst.lineIdx].push({
        absStart:first.absStart, absEnd:last.absEnd, familyRank:fam.rank, wlen:fam.wlen,
        tier:fam.tier, tight: fam.tier==='exact' && codaSig===refCoda,
      });
    }
  }
  lineClaims.forEach(arr=>arr.sort((a,b)=>a.absStart-b.absStart));
  return {lines:lineClaims, families};
}

export { analyzeWord, lookupPronunciation, findFamilies, flattenLine, tokenizeLine, syllabify };
