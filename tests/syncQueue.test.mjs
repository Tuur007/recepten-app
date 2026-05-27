/**
 * syncQueue.test.mjs — outbox semantiek.
 *
 *  • enqueue() schrijft een rij in sync_queue
 *  • flushQueue() leegt de queue tegen een werkende client
 *  • flushQueue() bewaart de rij + verhoogt attempts bij een falende client
 *  • flushQueue() no-ops zonder familyId, zonder client, of bij re-entry
 *  • flush volgt FIFO-volgorde
 */

import { strict as assert } from 'node:assert';

// enqueue() skipt nu zonder geconfigureerde supabase OF zonder familyId. Zet de
// env vars vóór de import zodat de supabase-client niet-null is; familyId
// zetten we per test via useAuthStore.setState.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

globalThis.window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
};

const { useAuthStore } = await import('../V0.1.2/store/authStore.ts');
const queue = await import('../V0.1.2/services/sync/queue.ts');

const PASS = (s) => console.log(`\x1b[32m✅ ${s}\x1b[0m`);
const FAIL = (s) => console.log(`\x1b[31m❌ ${s}\x1b[0m`);

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    queue.__resetFlushingForTests();
    await fn();
    PASS(name);
    passed++;
  } catch (e) {
    FAIL(`${name} — ${e?.message ?? e}`);
    if (e?.stack) console.log('   ' + e.stack.split('\n').slice(1, 4).join('\n   '));
    failed++;
  }
}

/**
 * In-memory SQLite-shim die alleen de calls ondersteunt die queue.ts doet:
 * INSERT/SELECT/UPDATE/DELETE op sync_queue, inclusief de dead-letter +
 * backoff kolommen (dead, next_retry_at). datetime('now', '+N seconds') wordt
 * gesimuleerd met JS-tijd zodat de backoff-window deterministisch is.
 */
function makeInMemoryDb() {
  const rows = new Map();
  const parseSeconds = (modifier) => {
    const m = /^\+(\d+)\s*seconds?$/.exec(String(modifier).trim());
    return m ? Number(m[1]) : 0;
  };
  const isEligible = (row) => {
    if (row.dead !== 0) return false;
    if (row.next_retry_at == null) return true;
    return new Date(row.next_retry_at).getTime() < Date.now();
  };
  const byCreatedAt = (a, b) => {
    if (a.created_at < b.created_at) return -1;
    if (a.created_at > b.created_at) return 1;
    return a.id < b.id ? -1 : 1;
  };
  return {
    rows,
    async runAsync(sql, params = []) {
      const s = String(sql).trim().replace(/\s+/g, ' ');
      if (/^INSERT INTO sync_queue/i.test(s)) {
        const [id, op, entity, entity_id, payload, created_at] = params;
        rows.set(id, {
          id, op, entity, entity_id, payload,
          created_at, attempts: 0, last_error: null,
          dead: 0, next_retry_at: null,
        });
        return { changes: 1 };
      }
      if (/^DELETE FROM sync_queue WHERE id/i.test(s)) {
        rows.delete(params[0]);
        return { changes: 1 };
      }
      if (/^UPDATE sync_queue SET attempts = \?, last_error = \?, dead = \?, next_retry_at = datetime/i.test(s)) {
        const [attempts, lastError, dead, modifier, id] = params;
        const row = rows.get(id);
        if (row) {
          row.attempts = attempts;
          row.last_error = lastError;
          row.dead = dead;
          row.next_retry_at = new Date(Date.now() + parseSeconds(modifier) * 1000).toISOString();
        }
        return { changes: 1 };
      }
      throw new Error(`mock-db runAsync unmatched: ${s}`);
    },
    async getFirstAsync(sql) {
      const s = String(sql).trim().replace(/\s+/g, ' ');
      if (/SELECT COUNT/i.test(s)) {
        return { count: rows.size };
      }
      if (/SELECT \* FROM sync_queue WHERE dead = 0/i.test(s)) {
        const eligible = [...rows.values()].filter(isEligible).sort(byCreatedAt);
        return eligible[0] ?? null;
      }
      return null;
    },
    async getAllAsync(sql) {
      const s = String(sql).trim().replace(/\s+/g, ' ');
      if (/SELECT \* FROM sync_queue WHERE dead = 1/i.test(s)) {
        return [...rows.values()].filter((r) => r.dead === 1).sort(byCreatedAt);
      }
      return [];
    },
    async execAsync() {},
  };
}

function makeClient(behavior) {
  // behavior: (table, op, payload|id) => { error: Error|null }
  const calls = [];
  const table = (name) => ({
    _name: name,
    _pending: null,
    upsert(payload) {
      this._pending = { op: 'upsert', payload };
      const res = behavior(name, 'upsert', payload);
      calls.push({ table: name, op: 'upsert', payload });
      return Promise.resolve(res);
    },
    update(patch) {
      // .update().eq('id', x) — return chainable
      const chain = {
        eq(_col, id) {
          const res = behavior(name, 'delete', id);
          calls.push({ table: name, op: 'delete', id, patch });
          return Promise.resolve(res);
        },
      };
      return chain;
    },
  });
  return {
    calls,
    from(name) { return table(name); },
  };
}

console.log('\n══════════════════════════════════════════════');
console.log(' enqueue + flushQueue');
console.log('══════════════════════════════════════════════\n');

await test('enqueue zet een rij in sync_queue', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1', title: 'Soep' });
  assert.equal(db.rows.size, 1);
  const row = [...db.rows.values()][0];
  assert.equal(row.op, 'upsert');
  assert.equal(row.entity, 'recipe');
  assert.equal(row.entity_id, 'r1');
  assert.equal(JSON.parse(row.payload).title, 'Soep');
});

await test('enqueue skipt de INSERT zonder familyId', async () => {
  useAuthStore.setState({ familyId: null });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1' });
  assert.equal(db.rows.size, 0, 'geen rij gequeued zonder gekoppeld gezin');
});

await test('flushQueue zonder familyId no-opt', async () => {
  // Eerst met familyId queuen zodat er een rij bestaat, dan familyId weghalen.
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1' });
  useAuthStore.setState({ familyId: null });
  const client = makeClient(() => ({ error: null }));
  const result = await queue.flushQueue(db, client);
  assert.equal(result.processed, 0);
  assert.equal(db.rows.size, 1, 'rij blijft staan');
  assert.equal(client.calls.length, 0, 'geen remote calls');
});

await test('flushQueue zonder client no-opt', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1' });
  const result = await queue.flushQueue(db, null);
  assert.equal(result.processed, 0);
  assert.equal(db.rows.size, 1);
});

await test('flushQueue stuurt recipe upsert + verwijdert de rij', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', {
    id: 'r1', title: 'Tomatensoep', ingredients: [], steps: [],
    category: 'Soep', isFavorite: false, allergens: [],
    createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
  });
  const client = makeClient(() => ({ error: null }));
  const result = await queue.flushQueue(db, client);
  assert.equal(result.processed, 1);
  assert.equal(db.rows.size, 0, 'rij is opgeruimd');
  assert.equal(client.calls[0].table, 'recipes');
  assert.equal(client.calls[0].op, 'upsert');
  assert.equal(client.calls[0].payload.family_id, 'fam-1');
});

await test('flushQueue stuurt grocery delete via soft-delete update', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'delete', 'grocery', 'g1', null);
  const client = makeClient(() => ({ error: null }));
  const result = await queue.flushQueue(db, client);
  assert.equal(result.processed, 1);
  assert.equal(client.calls[0].table, 'grocery_items');
  assert.equal(client.calls[0].op, 'delete');
  assert.equal(client.calls[0].id, 'g1');
  assert.ok(client.calls[0].patch.deleted_at, 'soft-delete via deleted_at');
});

await test('flushQueue stuurt weekplan upsert met onConflict', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'weekplan', '2026-W21', {
    weekKey: '2026-W21',
    plan: { MON: { breakfast: null, lunch: 'r1', dinner: null } },
  });
  const client = makeClient(() => ({ error: null }));
  await queue.flushQueue(db, client);
  assert.equal(client.calls[0].table, 'week_plans');
  assert.equal(client.calls[0].payload.week_key, '2026-W21');
  assert.equal(client.calls[0].payload.plan_data.MON.lunch, 'r1');
});

await test('flushQueue houdt rij + verhoogt attempts bij netwerkfout', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1', title: 'X' });
  const client = makeClient(() => ({ error: new Error('NetworkError') }));
  const result = await queue.flushQueue(db, client);
  assert.equal(result.processed, 0);
  assert.equal(db.rows.size, 1, 'rij blijft in queue voor retry');
  const row = [...db.rows.values()][0];
  assert.equal(row.attempts, 1);
  assert.equal(row.last_error, 'NetworkError');
  assert.equal(result.failedAt?.id, row.id);
});

await test('flushQueue laat een gefaalde rij de andere niet blokkeren', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  // Twee items met onderscheidende timestamps: r1 vóór r2.
  const orig = Date.prototype.toISOString;
  let n = 0;
  Date.prototype.toISOString = function() { return `2026-05-01T00:00:${String(n++).padStart(2, '0')}.000Z`; };
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1', title: 'A' });
  await queue.enqueue(db, 'upsert', 'recipe', 'r2', { id: 'r2', title: 'B' });
  Date.prototype.toISOString = orig;

  // r1 faalt altijd, r2 slaagt.
  const client = makeClient((table, op, payloadOrId) => {
    const id = op === 'upsert' ? payloadOrId.id : payloadOrId;
    return id === 'r1' ? { error: new Error('boom') } : { error: null };
  });

  const result = await queue.flushQueue(db, client);
  assert.equal(result.processed, 1, 'r2 wordt verwerkt ondanks falende r1');
  assert.equal(db.rows.size, 1, 'enkel r1 blijft in de queue');
  const remaining = [...db.rows.values()][0];
  assert.equal(remaining.entity_id, 'r1');
  assert.equal(remaining.attempts, 1);
  assert.ok(remaining.next_retry_at, 'r1 krijgt een backoff next_retry_at');
});

await test('flushQueue houdt rij + zet next_retry_at + dead=0 bij netwerkfout', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1', title: 'X' });
  const client = makeClient(() => ({ error: new Error('NetworkError') }));
  await queue.flushQueue(db, client);
  const row = [...db.rows.values()][0];
  assert.equal(row.attempts, 1);
  assert.equal(row.dead, 0);
  assert.equal(row.last_error, 'NetworkError');
  assert.ok(row.next_retry_at, 'next_retry_at gezet voor backoff');
});

await test('rij die 5 keer faalt → dead = 1', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1', title: 'X' });
  const client = makeClient(() => ({ error: new Error('boom') }));

  for (let i = 0; i < 5; i++) {
    await queue.flushQueue(db, client);
    // Simuleer dat de backoff-window verstreken is voor de volgende poging.
    const row = [...db.rows.values()][0];
    if (row) row.next_retry_at = null;
  }

  const row = [...db.rows.values()][0];
  assert.equal(row.attempts, 5);
  assert.equal(row.dead, 1, 'na MAX_ATTEMPTS is de rij dead-letter');
});

await test('dead rij wordt overgeslagen, andere rijen flushen door', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  const orig = Date.prototype.toISOString;
  let n = 0;
  Date.prototype.toISOString = function() { return `2026-05-01T00:00:${String(n++).padStart(2, '0')}.000Z`; };
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1', title: 'A' });
  await queue.enqueue(db, 'upsert', 'recipe', 'r2', { id: 'r2', title: 'B' });
  Date.prototype.toISOString = orig;

  // Markeer r1 als dead-letter.
  [...db.rows.values()].find((r) => r.entity_id === 'r1').dead = 1;

  let calls = 0;
  const client = makeClient(() => { calls++; return { error: null }; });
  const result = await queue.flushQueue(db, client);

  assert.equal(calls, 1, 'enkel de levende rij wordt geprobeerd');
  assert.equal(result.processed, 1);
  assert.equal(db.rows.size, 1, 'de dode rij blijft staan');
  assert.equal([...db.rows.values()][0].entity_id, 'r1');
});

await test('backoff: net gefaalde rij wordt niet binnen de window opnieuw geprobeerd', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1', title: 'X' });
  let calls = 0;
  const client = makeClient(() => { calls++; return { error: new Error('NetworkError') }; });

  await queue.flushQueue(db, client);
  assert.equal(calls, 1);
  assert.equal([...db.rows.values()][0].attempts, 1);

  // Tweede flush meteen: next_retry_at ligt in de toekomst → overslaan.
  const result = await queue.flushQueue(db, client);
  assert.equal(calls, 1, 'rij niet opnieuw geprobeerd binnen backoff-window');
  assert.equal(result.processed, 0);
  assert.equal([...db.rows.values()][0].attempts, 1);
});

await test('getDeadRows geeft enkel de dode rijen terug', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1', title: 'A' });
  await queue.enqueue(db, 'upsert', 'recipe', 'r2', { id: 'r2', title: 'B' });
  [...db.rows.values()].find((r) => r.entity_id === 'r1').dead = 1;

  const dead = await queue.getDeadRows(db);
  assert.equal(dead.length, 1);
  assert.equal(dead[0].entity_id, 'r1');
});

await test('flushQueue is re-entrancy safe', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1', title: 'X' });

  let inFlight = 0;
  let maxConcurrent = 0;
  const client = makeClient(() => {
    inFlight++;
    maxConcurrent = Math.max(maxConcurrent, inFlight);
    inFlight--;
    return { error: null };
  });

  // Twee parallele flushes — slechts één moet daadwerkelijk de rij verwerken
  const [a, b] = await Promise.all([
    queue.flushQueue(db, client),
    queue.flushQueue(db, client),
  ]);
  assert.equal(maxConcurrent, 1);
  // Exact één van de twee processed de rij; de andere ziet 0
  const total = a.processed + b.processed;
  assert.equal(total, 1);
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
