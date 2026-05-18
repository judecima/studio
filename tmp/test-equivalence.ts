import * as fs from 'fs';
import { passesHardFilters, calculateScoreBreakdown } from '../src/lib/equivalences/engine';
import { Panel } from '../src/lib/types';
const panels: Panel[] = JSON.parse(fs.readFileSync('tmp/post_production_panels_export.json', 'utf8'));
const amberes = panels.find(p => p.id === 'amberes') as any;
const pietra = panels.find(p => p.id === 'egger-f206-st9') as any;

console.log('Amberes -> Pietra (passesHardFilters):', passesHardFilters(amberes, pietra));
if (passesHardFilters(amberes, pietra)) {
  console.log('Amberes -> Pietra breakdown:', calculateScoreBreakdown(amberes, pietra));
}

console.log('Pietra -> Amberes (passesHardFilters):', passesHardFilters(pietra, amberes));
if (passesHardFilters(pietra, amberes)) {
  console.log('Pietra -> Amberes breakdown:', calculateScoreBreakdown(pietra, amberes));
}
