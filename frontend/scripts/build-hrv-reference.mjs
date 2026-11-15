// Builds data/hrv_reference.json: real heart rate and HRV of healthy adults from a public dataset.
// Source: Irurzun et al. (2021) "RR interval time series from healthy subjects" v1.0.0, PhysioNet, CC BY 4.0.
// https://doi.org/10.13026/51yd-d219 · 24-hour Holter recordings, RR intervals in ms, artifacts removed.
// NASA publishes no heart rate / HRV for the Inspiration4 crew, so ASTRA shows this as a labelled human
// reference (REAL, not crew data). Run: node scripts/build-hrv-reference.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://physionet-open.s3.amazonaws.com/rr-interval-healthy-subjects/1.0.0';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'hrv_reference.json');

const text = async (path) => { const r = await fetch(`${BASE}/${path}`); if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.text(); };

const info = (await text('patient-info.csv')).trim().split(/\r?\n/).slice(1).map((l) => {
  const [file, age, sex] = l.split(',').map((s) => s.trim());
  return { id: file.padStart(3, '0'), age: Number(age), sex };
}).filter((p) => p.age >= 18 && (p.sex === 'M' || p.sex === 'F'));

const r1 = (v) => Math.round(v * 10) / 10;
const subjects = [];
for (const p of info) {
  let raw;
  try { raw = await text(`${p.id}.txt`); } catch { console.log(`${p.id} listed in patient-info.csv but not in the dataset: skipped`); continue; }
  const rr = raw.split(/\s+/).map(Number).filter((v) => v >= 300 && v <= 2000);
  // segments were concatenated after artifact removal: skip jumps that are not physiological beat-to-beat changes
  const diffs = [];
  for (let i = 1; i < rr.length; i++) { const d = rr[i] - rr[i - 1]; if (Math.abs(d) < 200) diffs.push(d); }
  const mean = rr.reduce((a, b) => a + b, 0) / rr.length;
  const sdnn = Math.sqrt(rr.reduce((a, b) => a + (b - mean) ** 2, 0) / rr.length);
  const rmssd = Math.sqrt(diffs.reduce((a, b) => a + b * b, 0) / diffs.length);
  const hours = rr.reduce((a, b) => a + b, 0) / 3_600_000;
  subjects.push({ id: p.id, age: p.age, sex: p.sex, hr: r1(60000 / mean), rmssd: r1(rmssd), sdnn: r1(sdnn), hours: r1(hours), beats: rr.length });
  console.log(`${p.id} ${p.sex} ${p.age}y  HR ${r1(60000 / mean)} bpm  RMSSD ${r1(rmssd)} ms  SDNN ${r1(sdnn)} ms  ${r1(hours)} h`);
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const group = (sex) => {
  const g = subjects.filter((s) => s.sex === sex);
  return { n: g.length, ages: [Math.min(...g.map((s) => s.age)), Math.max(...g.map((s) => s.age))],
    hr: r1(median(g.map((s) => s.hr))), rmssd: r1(median(g.map((s) => s.rmssd))), sdnn: r1(median(g.map((s) => s.sdnn))),
    hrRange: [Math.min(...g.map((s) => s.hr)), Math.max(...g.map((s) => s.hr))], rmssdRange: [Math.min(...g.map((s) => s.rmssd)), Math.max(...g.map((s) => s.rmssd))] };
};

writeFileSync(OUT, JSON.stringify({
  source: 'PhysioNet · RR interval time series from healthy subjects v1.0.0 (Irurzun et al., 2021)',
  doi: 'https://doi.org/10.13026/51yd-d219', license: 'CC BY 4.0',
  method: '24 h Holter, RR 300–2000 ms; RMSSD over successive differences < 200 ms (segments were concatenated after artifact removal); median per sex.',
  generated: new Date().toISOString().slice(0, 10),
  F: group('F'), M: group('M'), subjects,
}, null, 2) + '\n');
console.log(`wrote ${OUT}`);
