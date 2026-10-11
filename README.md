# Rap Map

See the rhymes in your bars. Rap Map is a free, static web app (no build step, no backend) with two tools:

- **Bar Chart**: paste lyrics and every multisyllabic rhyme family is color-coded, with an end-rhyme mode and PNG export (post, square, story, wide).
- **Vocab Lab**: paste your own lyrics (or two sets to compare) for unique-word counts, one-offs, most-used words, and more.

Everything runs in the browser. Lyrics are never uploaded or stored.

Planned: audio upload with word-synced playback, an artist vocabulary map (starting with MF DOOM, inspired by The Pudding's vocabulary analysis), accounts for artists.

## Run it

ES modules need a server (opening the file directly will not load the dictionary):

```
python3 -m http.server 8000
# then open http://localhost:8000
```

## Tests

```
node tests/engine.test.mjs
node tests/vocab.test.mjs
```

## Layout

- `index.html`, `assets/styles.css`, `assets/app.js`: the page and its wiring
- `assets/engine.js`: phonetic engine (syllables, vowel classes, rhyme families); no DOM
- `assets/vocab.js`: vocabulary stats; no DOM
- `data/cmudict.json`: CMU Pronouncing Dictionary (public domain), ~120k words, loaded lazily. Words missing from it fall back to the slang list, dialect rules, and finally spelling rules in `engine.js`.
- `data/slang.json`: hand-written ARPAbet pronunciations for slang and spoken forms CMU lacks (finna, bruh, goated, th-stopped da/dat/dem...). Keys are lowercase letters only (apostrophes removed); phones use CMU symbols with stress digits. To add a word, add a line and run `node tests/engine.test.mjs`, which validates every entry. Lookup order: slang list, CMU, dialect rules (dropped g: runnin; -a for -er: killa, dolla; stretched spellings: yeahhh), spelling guess.

Image export loads html2canvas from cdnjs on first click.
