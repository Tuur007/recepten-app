/**
 * imageUpload.test.mjs — pad-conventie + upload-resultaat.
 *
 * We injecteren een mock Supabase-client en een mock JPEG-prep (zodat de
 * native expo-image-manipulator + fetch niet draaien). Geen netwerk.
 */

import { strict as assert } from 'node:assert';

globalThis.window = {
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
};

const { useAuthStore } = await import('../V0.1.2/store/authStore.ts');
const { uploadRecipeImage, isLocalImageUri, recipeImagePath } = await import(
  '../V0.1.2/services/imageUpload.ts'
);

const PASS = (s) => console.log(`\x1b[32m✅ ${s}\x1b[0m`);
const FAIL = (s) => console.log(`\x1b[31m❌ ${s}\x1b[0m`);

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    PASS(name);
    passed++;
  } catch (e) {
    FAIL(`${name} — ${e?.message ?? e}`);
    if (e?.stack) console.log('   ' + e.stack.split('\n').slice(1, 4).join('\n   '));
    failed++;
  }
}

function makeClient(uploadResult, publicUrl = 'https://cdn/fam-1/r1.jpg') {
  const calls = [];
  return {
    calls,
    storage: {
      from(bucket) {
        return {
          upload(path, body, opts) {
            calls.push({ bucket, path, opts, body });
            return Promise.resolve(uploadResult);
          },
          getPublicUrl(path) {
            return { data: { publicUrl: `${publicUrl}?p=${path}` } };
          },
        };
      },
    },
  };
}

const fakePrepare = async () => new ArrayBuffer(8);

console.log('\n══════════════════════════════════════════════');
console.log(' imageUpload');
console.log('══════════════════════════════════════════════\n');

await test('isLocalImageUri herkent lokale vs cloud paden', () => {
  assert.equal(isLocalImageUri('file:///x.jpg'), true);
  assert.equal(isLocalImageUri('/var/mobile/x.jpg'), true);
  assert.equal(isLocalImageUri('content://media/1'), true);
  assert.equal(isLocalImageUri('https://cdn/x.jpg'), false);
  assert.equal(isLocalImageUri('HTTP://cdn/x.jpg'), false);
  assert.equal(isLocalImageUri(''), false);
});

await test('recipeImagePath = {familyId}/{recipeId}.jpg', () => {
  assert.equal(recipeImagePath('fam-1', 'r1'), 'fam-1/r1.jpg');
});

await test('upload gebruikt de pad-conventie en returnt publicUrl', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const client = makeClient({ error: null });
  const url = await uploadRecipeImage('file:///x.jpg', 'r1', client, fakePrepare);
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].bucket, 'recipe-images');
  assert.equal(client.calls[0].path, 'fam-1/r1.jpg');
  assert.equal(client.calls[0].opts.upsert, true);
  assert.ok(url && url.includes('fam-1/r1.jpg'), `verwachtte publicUrl, kreeg ${url}`);
});

await test('upload returnt null bij een storage-fout', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const client = makeClient({ error: { message: 'boom' } });
  const url = await uploadRecipeImage('file:///x.jpg', 'r1', client, fakePrepare);
  assert.equal(url, null);
});

await test('upload returnt null zonder familyId', async () => {
  useAuthStore.setState({ familyId: null });
  const client = makeClient({ error: null });
  const url = await uploadRecipeImage('file:///x.jpg', 'r1', client, fakePrepare);
  assert.equal(url, null);
  assert.equal(client.calls.length, 0, 'geen upload zonder familyId');
});

await test('upload returnt null zonder client', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const url = await uploadRecipeImage('file:///x.jpg', 'r1', null, fakePrepare);
  assert.equal(url, null);
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
