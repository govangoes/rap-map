import { setDictionary, dictionarySize, findFamilies } from "./engine.js";
import { analyzeVocabulary } from "./vocab.js";

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---------------- Tabs ---------------- */
const tabs = [$("tab-bars"), $("tab-vocab")];
const panels = { "tab-bars": $("panel-bars"), "tab-vocab": $("panel-vocab") };

function selectTab(tab, { focus = false, updateHash = true } = {}) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    panels[t.id].hidden = !on;
  });
  if (focus) tab.focus();
  if (updateHash) history.replaceState(null, "", tab.id === "tab-vocab" ? "#vocab" : "#bars");
  if (tab.id === "tab-bars") fitCard();
}
tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") selectTab(tabs[(i + 1) % tabs.length], { focus: true });
    if (e.key === "ArrowLeft") selectTab(tabs[(i - 1 + tabs.length) % tabs.length], { focus: true });
  });
});

/* ---------------- Bar Chart ---------------- */
const SEED = "Apex, say yes, play test\nGray dress, Amex, break neck\nPayless, state press";
const MAX_COLORS = 8;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LYRICS_MAX_PX = 16;
const LYRICS_MIN_PX = 10;

const lyricsBox = $("lyrics");
const card = $("card");
let mode = "multi";
let debounceTimer = null;

function fitCard() {
  const el = $("cardLyrics");
  if (!el.offsetParent) return; // hidden tab
  el.style.fontSize = LYRICS_MAX_PX + "px";
  let size = LYRICS_MAX_PX;
  while (el.scrollHeight > el.clientHeight + 1 && size > LYRICS_MIN_PX) {
    size -= 1;
    el.style.fontSize = size + "px";
  }
}

function renderCard() {
  const text = lyricsBox.value;
  const lyricsEl = $("cardLyrics");
  const legendEl = $("cardLegend");
  $("cardModeLabel").textContent = mode === "end" ? "END RHYME" : "MULTISYLLABIC";

  if (!text.trim()) {
    lyricsEl.innerHTML = '<div class="lyrics-inner"><span style="opacity:.4">Paste bars above to see the chart.</span></div>';
    legendEl.innerHTML = "";
    return;
  }

  const result = findFamilies(text, mode === "end" ? { lineFinalOnly: true } : { minWindow: 2 });
  const lines = text.split("\n");
  const familyLetter = new Map();
  result.families.forEach((f, i) => {
    if (i < MAX_COLORS) familyLetter.set(f.rank, LETTERS[i]);
  });

  let html = "";
  lines.forEach((line, li) => {
    let pos = 0;
    let lineHtml = "";
    for (const c of result.lines[li]) {
      lineHtml += escapeHtml(line.slice(pos, c.absStart));
      const seg = escapeHtml(line.slice(c.absStart, c.absEnd));
      if (c.familyRank < MAX_COLORS) {
        const cls = "fam" + (c.tight ? " tight" : "") + (c.tier === "slant" ? " slant" : "");
        lineHtml +=
          `<span class="${cls}" style="color:var(--fam-${c.familyRank + 1})">` +
          `<span class="badge">${familyLetter.get(c.familyRank)}</span>${seg}</span>`;
      } else {
        lineHtml += `<span class="fam-other">${seg}</span>`;
      }
      pos = c.absEnd;
    }
    lineHtml += escapeHtml(line.slice(pos));
    html += (lineHtml || "&nbsp;") + "\n";
  });
  lyricsEl.innerHTML = '<div class="lyrics-inner">' + html + "</div>";
  fitCard();

  const shown = result.families.slice(0, MAX_COLORS);
  const overflow = result.families.length - shown.length;
  let legend = shown
    .map((f, i) => {
      const sample = f.instances[0];
      const claim = result.lines[sample.lineIdx].find((c) => c.familyRank === f.rank);
      const label = claim ? lines[sample.lineIdx].slice(claim.absStart, claim.absEnd) : f.sig;
      return (
        `<span class="legend-chip"><span class="legend-swatch" style="background:var(--fam-${i + 1})"></span>` +
        `${LETTERS[i]} &middot; ${escapeHtml(label)}</span>`
      );
    })
    .join("");
  if (overflow > 0) legend += `<span class="legend-chip" style="opacity:.6">+${overflow} more (fewer matches)</span>`;
  if (shown.length === 0) {
    legend = '<span class="legend-chip" style="opacity:.5">No repeating patterns found yet. Keep writing.</span>';
  }
  legendEl.innerHTML = legend;
}

lyricsBox.value = SEED;
lyricsBox.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(renderCard, 220);
});

function setMode(next) {
  mode = next;
  $("modeMulti").setAttribute("aria-pressed", String(next === "multi"));
  $("modeEnd").setAttribute("aria-pressed", String(next === "end"));
  renderCard();
}
$("modeMulti").addEventListener("click", () => setMode("multi"));
$("modeEnd").addEventListener("click", () => setMode("end"));

$("ratioSelect").addEventListener("change", (e) => {
  card.classList.remove("ratio-square", "ratio-story", "ratio-wide");
  if (e.target.value !== "post") card.classList.add("ratio-" + e.target.value);
  fitCard();
});
$("themeSelect").addEventListener("change", (e) => {
  card.classList.toggle("theme-light", e.target.value === "light");
  fitCard();
});

const saveStatus = $("saveStatus");
function flash(msg, ms = 2500) {
  saveStatus.textContent = msg;
  if (ms) setTimeout(() => { if (saveStatus.textContent === msg) saveStatus.textContent = ""; }, ms);
}

$("copyBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(lyricsBox.value);
    flash("Copied.");
  } catch {
    flash("Could not copy. Select the text and copy it yourself.");
  }
});

let html2canvasPromise = null;
function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (!html2canvasPromise) {
    html2canvasPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      s.onload = () => resolve(window.html2canvas);
      s.onerror = () => {
        html2canvasPromise = null;
        reject(new Error("load failed"));
      };
      document.head.appendChild(s);
    });
  }
  return html2canvasPromise;
}

$("saveBtn").addEventListener("click", async () => {
  const btn = $("saveBtn");
  btn.disabled = true;
  flash("Rendering…", 0);
  try {
    const h2c = await loadHtml2Canvas();
    const canvas = await h2c(card, { backgroundColor: null, scale: 2, useCORS: true });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("no blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rap-map-bar-chart.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    flash("Saved.");
  } catch {
    flash("Could not make the image. Try a screenshot of the card instead.", 4000);
  } finally {
    btn.disabled = false;
  }
});

/* ---------------- Vocab Lab ---------------- */
const pct = (x) => (x * 100).toFixed(1) + "%";

function statCard(title, r) {
  const sample =
    r.uniqueInSample === null
      ? `<span class="stat-sub">needs ${r.sampleSize.toLocaleString()}+ words</span>`
      : r.uniqueInSample.toLocaleString();
  const maxCount = r.topWords.length ? r.topWords[0][1] : 1;
  const top = r.topWords
    .map(
      ([w, n]) =>
        `<li><span>${escapeHtml(w)}</span><span class="bar" style="width:${Math.max(2, (n / maxCount) * 100)}%"></span>` +
        `<span class="n">${n}</span></li>`,
    )
    .join("");
  return `
    <article class="stat-card">
      <h3>${escapeHtml(title)}</h3>
      <dl class="stat-grid">
        <div><dt>Total words</dt><dd>${r.total.toLocaleString()}</dd></div>
        <div><dt>Unique words</dt><dd>${r.unique.toLocaleString()}</dd></div>
        <div><dt>Unique share</dt><dd>${pct(r.typeTokenRatio)}</dd></div>
        <div><dt>Unique in first ${r.sampleSize.toLocaleString()}</dt><dd>${sample}</dd></div>
        <div><dt>One-offs</dt><dd>${r.hapax.toLocaleString()} <span class="stat-sub">${pct(r.hapaxShare)} of unique</span></dd></div>
        <div><dt>Avg word length</dt><dd>${r.avgWordLength.toFixed(1)}</dd></div>
        <div><dt>Lines</dt><dd>${r.lineCount.toLocaleString()}</dd></div>
        <div><dt>Repeated lines</dt><dd>${pct(r.repeatedLineShare)}</dd></div>
      </dl>
      ${top ? `<h3 style="margin-top:18px">Most-used words</h3><ul class="top-words">${top}</ul>` : ""}
      ${r.longest.length ? `<p class="long-words"><strong>Longest words:</strong> ${r.longest.map(escapeHtml).join(", ")}</p>` : ""}
    </article>`;
}

function renderVocab() {
  const a = $("vocabA").value;
  const b = $("vocabB").value;
  const out = $("vocabResults");
  const ra = analyzeVocabulary(a);
  const rb = analyzeVocabulary(b);
  if (!ra.total && !rb.total) {
    out.innerHTML = '<p class="empty">Paste some lyrics to see the numbers.</p>';
    return;
  }
  let html = "";
  if (ra.total) html += statCard(rb.total ? "Lyrics A" : "Your lyrics", ra);
  if (rb.total) html += statCard(ra.total ? "Lyrics B" : "Your lyrics", rb);
  out.innerHTML = html;
}
let vocabTimer = null;
["vocabA", "vocabB"].forEach((id) =>
  $(id).addEventListener("input", () => {
    clearTimeout(vocabTimer);
    vocabTimer = setTimeout(renderVocab, 250);
  }),
);
renderVocab();

/* ---------------- Boot ---------------- */
renderCard(); // works immediately with spelling rules, improves once the dictionary arrives
selectTab(location.hash === "#vocab" ? tabs[1] : tabs[0], { updateHash: false });

fetch("data/cmudict.json")
  .then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  })
  .then((dict) => {
    setDictionary(dict);
    $("dictStatus").textContent = `Dictionary loaded (${dictionarySize().toLocaleString()} words).`;
    renderCard();
  })
  .catch(() => {
    $("dictStatus").textContent = "Dictionary unavailable. Using spelling-based guesses only.";
  });

// Fonts load after first paint and change line wrapping; refit when ready.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCard);
