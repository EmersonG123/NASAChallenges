import { analyze, exampleDays, mergeDays, parseWearableCsv, WEARABLE_TEMPLATE } from '@/lib/wellbeing/model';
const rows = exampleDays('2026-11-15').flatMap((d, i) => [
  { id: 'c' + i, crew_id: 'X', day: d.day, source: 'checkin' as const, metrics_json: JSON.stringify(d.c), updated_at: i, deleted: 0 },
  { id: 'w' + i, crew_id: 'X', day: d.day, source: 'wearable' as const, metrics_json: JSON.stringify(d.w), updated_at: i, deleted: 0 }]);
const days = mergeDays(rows, 'X');
console.log('days', days.length, '| whole period (recovering):', analyze(days).score, analyze(days).alerts.map((a) => a.key).join(','));
const hard = days; const r = analyze(hard);
console.log('at the end of the hard week: score', r.score, '| alerts:', r.alerts.map((a) => `${a.key}:${a.tone}`).join(', '));
console.log('baseline sleep/hrv:', r.base.sleep, r.base.hrv);
console.log('csv template parse:', JSON.stringify(parseWearableCsv(WEARABLE_TEMPLATE).days[0]), '| bad csv:', parseWearableCsv('a,b\n1,2').error);

