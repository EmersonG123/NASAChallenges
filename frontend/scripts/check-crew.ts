// Sanity check for the "add crew member" flow: run with `bun scripts/check-crew.ts`.
import { exampleValues, parseCsv, templateCsv } from '@/lib/bay/csv';
import { applyCustomCrew, baselineMode, CREW, globalScore, sysScore } from '@/lib/bay/model';

const tpl = templateCsv();
console.log('template rows:', tpl.split('\n').length - 1, '| header:', tpl.split('\n')[0]);

// 1) simulated example: full schedule -> personal baseline
applyCustomCrew([{ id: 'NEX1', name: 'Example', sex: 'F', source: 'example', values: exampleValues(42) }]);
console.log('crew:', CREW.join(','), '| mode:', baselineMode('NEX1'));
console.log('global by checkpoint:', [0, 1, 2, 3, 4, 5, 6].map((i) => globalScore('NEX1', i)).join(' '));

// 2) user CSV with semicolons + decimal comma, only post-flight values -> provisional baseline
const csv = 'marker;name;unit;before_3m;before_6w;before_3d;after_1d;after_6w;after_3m;after_6m\nCRP;;mg/L;;;;3,4;1,2;;\nGLUCOSE;;mg/dL;;;;118;96;;\nFOO;;;;;;1;;;';
const p = parseCsv(csv);
console.log('parsed:', p.markers, 'markers,', p.checkpoints, 'checks, pre-flight', p.preFlight, '| unknown:', p.unknown.join(','), '| error:', p.error ?? 'none');
applyCustomCrew([{ id: 'NUP1', name: 'Upload', sex: 'M', source: 'upload', values: p.values }]);
console.log('mode:', baselineMode('NUP1'), '| inflammation 1 day after:', sysScore('inflamacion', 'NUP1', 3), '| metabolism:', sysScore('metabolismo', 'NUP1', 3), '| before (no data):', globalScore('NUP1', 0));
console.log('crew after replace:', CREW.join(','));
