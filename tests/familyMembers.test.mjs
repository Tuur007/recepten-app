/**
 * familyMembers.test.mjs — rowToCloudMember mapping + defaults.
 *
 * De DB-rij kan null/ontbrekende velden hebben (oude rijen vóór de
 * family_member_profiles migratie). De mapping moet veilige defaults geven.
 */

import { strict as assert } from 'node:assert';

// supabase.ts (transitief) leest AsyncStorage; window stubben vóór import.
globalThis.window = {
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
};

const { rowToCloudMember, listFamilyMembers, updateMyProfile } = await import(
  '../V0.1.2/services/familyMembers.ts'
);
const { FAMILY_COLORS } = await import('../V0.1.2/types/family.ts');
const { useAuthStore } = await import('../V0.1.2/store/authStore.ts');

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

// Mock client voor listFamilyMembers: .from().select().eq().order() → {data,error}
function makeListClient(response) {
  const chain = {
    select() { return chain; },
    eq() { return chain; },
    order() { return Promise.resolve(response); },
  };
  return { from() { return chain; } };
}

// Mock client voor updateMyProfile: legt de patch + eq-args vast.
function makeUpdateClient() {
  const calls = [];
  return {
    calls,
    from() {
      return {
        update(patch) {
          return {
            eq(col, val) {
              calls.push({ patch, col, val });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };
}

console.log('\n══════════════════════════════════════════════');
console.log(' rowToCloudMember');
console.log('══════════════════════════════════════════════\n');

test('volledige rij wordt 1-op-1 gemapt', () => {
  const m = rowToCloudMember({
    id: 'm1',
    user_id: 'u1',
    display_name: 'Tuur',
    color: '#123456',
    allergies: ['Gluten', 'Noten'],
    active: true,
    role: 'owner',
  });
  assert.equal(m.id, 'm1');
  assert.equal(m.userId, 'u1');
  assert.equal(m.displayName, 'Tuur');
  assert.equal(m.color, '#123456');
  assert.deepEqual(m.allergies, ['Gluten', 'Noten']);
  assert.equal(m.active, true);
  assert.equal(m.role, 'owner');
});

test('ontbrekende velden krijgen veilige defaults', () => {
  const m = rowToCloudMember({ id: 'm2', user_id: 'u2' });
  assert.equal(m.displayName, '', 'displayName default leeg');
  assert.equal(m.color, FAMILY_COLORS[0], 'color valt terug op eerste palette-kleur');
  assert.deepEqual(m.allergies, [], 'allergies default lege array');
  assert.equal(m.active, true, 'active default true');
  assert.equal(m.role, 'member', 'role default member');
});

test('null color valt terug op palette', () => {
  const m = rowToCloudMember({ id: 'm3', user_id: 'u3', color: null });
  assert.equal(m.color, FAMILY_COLORS[0]);
});

test('active=false blijft false', () => {
  const m = rowToCloudMember({ id: 'm4', user_id: 'u4', active: false });
  assert.equal(m.active, false);
});

test('onbekende role wordt member', () => {
  const m = rowToCloudMember({ id: 'm5', user_id: 'u5', role: 'banaan' });
  assert.equal(m.role, 'member');
});

test('niet-array allergies wordt lege array', () => {
  const m = rowToCloudMember({ id: 'm6', user_id: 'u6', allergies: 'Gluten' });
  assert.deepEqual(m.allergies, []);
});

console.log('\n══════════════════════════════════════════════');
console.log(' listFamilyMembers');
console.log('══════════════════════════════════════════════\n');

await test('happy path → gemapte leden', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const client = makeListClient({
    data: [
      { id: 'm1', user_id: 'u1', display_name: 'Tuur', color: '#111', allergies: ['Gluten'], active: true, role: 'owner' },
    ],
    error: null,
  });
  const members = await listFamilyMembers(client);
  assert.equal(members.length, 1);
  assert.equal(members[0].displayName, 'Tuur');
  assert.equal(members[0].role, 'owner');
});

await test('lege lijst → []', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const members = await listFamilyMembers(makeListClient({ data: [], error: null }));
  assert.deepEqual(members, []);
});

await test('error → []', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const members = await listFamilyMembers(makeListClient({ data: null, error: { message: 'boom' } }));
  assert.deepEqual(members, []);
});

await test('zonder familyId → [] (geen query)', async () => {
  useAuthStore.setState({ familyId: null });
  const members = await listFamilyMembers(makeListClient({ data: [{ id: 'x', user_id: 'y' }], error: null }));
  assert.deepEqual(members, []);
});

console.log('\n══════════════════════════════════════════════');
console.log(' updateMyProfile');
console.log('══════════════════════════════════════════════\n');

await test('stuurt de juiste patch op de eigen rij', async () => {
  useAuthStore.setState({ user: { id: 'u1' } });
  const client = makeUpdateClient();
  await updateMyProfile({ displayName: 'Nieuw', active: false }, client);
  assert.equal(client.calls.length, 1);
  assert.deepEqual(client.calls[0].patch, { display_name: 'Nieuw', active: false });
  assert.equal(client.calls[0].col, 'user_id');
  assert.equal(client.calls[0].val, 'u1');
});

await test('lege update → geen call', async () => {
  useAuthStore.setState({ user: { id: 'u1' } });
  const client = makeUpdateClient();
  await updateMyProfile({}, client);
  assert.equal(client.calls.length, 0);
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
