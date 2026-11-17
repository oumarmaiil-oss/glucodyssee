import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choisirVoix, noterVoix, textePrononcable } from './voix.ts';

test('voix off : unités, chiffres et abréviations prononçables', () => {
  assert.equal(textePrononcable('Glycémie 1.42 g/L'), 'Glycémie 1,42 grammes par litre');
  assert.equal(textePrononcable('HbA1c 7.6 % → 6.8 %'), 'hémoglobine glyquée 7,6 pour cent, puis 6,8 pour cent');
  assert.equal(textePrononcable('Risque ×1.6'), 'Risque multiplié par 1,6');
  assert.equal(textePrononcable('iSGLT2 et iDPP-4'), 'gliflozine et gliptine');
  assert.equal(textePrononcable('Glargine 20 U'), 'Glargine 20 unités');
  assert.equal(textePrononcable('DFG 38 · −52 %'), 'débit de filtration 38. moins 52 pour cent');
});

test('voix off : préfère une voix française naturelle', () => {
  const v = (name: string, lang: string) => ({ name, lang, localService: true, default: false, voiceURI: name }) as SpeechSynthesisVoice;
  const liste = [v('Samantha', 'en-US'), v('Thomas', 'fr-FR'), v('Microsoft Denise Online (Natural) - French (France)', 'fr-FR'), v('Amélie', 'fr-CA')];
  assert.equal(choisirVoix(liste)?.name, 'Microsoft Denise Online (Natural) - French (France)');
  assert.ok(noterVoix(v('Samantha', 'en-US')) < 0);
  assert.equal(choisirVoix([v('Samantha', 'en-US')]), null);
});
