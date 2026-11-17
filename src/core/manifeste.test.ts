// Glucodyssée et Hémodyssée partagent le domaine oumarmaiil-oss.github.io : l'identifiant d'application (« id » du
// manifeste, résolu à partir de la racine du domaine) doit rester propre à Glucodyssée, sinon le navigateur confond
// les deux applications installées.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('manifeste : identifiant, portée et départ propres à Glucodyssée', () => {
  const m = JSON.parse(readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(m.id, '/glucodyssee/');
  assert.equal(m.scope, '/glucodyssee/');
  assert.equal(m.start_url, '/glucodyssee/');
  assert.equal(m.short_name, 'Glucodyssée');
});
