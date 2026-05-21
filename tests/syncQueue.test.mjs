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
 * INSERT/SELECT/UPDATE/DELETE op sync_queue. Voor andere tabellen is dit
 * niet bedoeld — die zitten in de andere test-suites.
 */
function makeInMemoryDb() {
  const rows = new Map();
  return {
    rows,
    async runAsync(sql, params = []) {
      const s = String(sql).trim();
      if (/^INSERT INTO sync_queue/i.test(s)) {
        const [id, op, entity, entity_id, payload, created_at] = params;
        rows.set(id, {
          id, op, entity, entity_id, payload,
          created_at, attempts: 0, last_error: null,
        });
        return { changes: 1 };
      }
      if (/^DELETE FROM sync_queue WHERE id/i.test(s)) {
        rows.delete(params[0]);
        return { changes: 1 };
      }
      if (/^UPDATE sync_queue SET attempts/i.test(s)) {
        const [err, id] = params;
        const row = rows.get(id);
        if (row) { row.attempts += 1; row.last_error = err; }
        return { changes: 1 };
      }
      throw new Error(`mock-db runAsync unmatched: ${s}`);
    },
    async getFirstAsync(sql) {
      const s = String(sql).trim();
      if (/SELECT COUNT/i.test(s)) {
        return { count: rows.size };
      }
      if (/SELECT \* FROM sync_queue ORDER BY created_at/i.test(s)) {
        const sorted = [...rows.values()].sort((a, b) => {
          if (a.created_at < b.created_at) return -1;
          if (a.created_at > b.created_at) return 1;
          return a.id < b.id ? -1 : 1;
        });
        return sorted[0] ?? null;
      }
      return null;
    },
    async getAllAsync() { return []; },
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
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1', title: 'Soep' });
  assert.equal(db.rows.size, 1);
  const row = [...db.rows.values()][0];
  assert.equal(row.op, 'upsert');
  assert.equal(row.entity, 'recipe');
  assert.equal(row.entity_id, 'r1');
  assert.equal(JSON.parse(row.payload).title, 'Soep');
});

await test('flushQueue zonder familyId no-opt', async () => {
  useAuthStore.setState({ familyId: null });
  const db = makeInMemoryDb();
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1' });
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

await test('flushQueue stopt bij eerste fout (FIFO behouden)', async () => {
  useAuthStore.setState({ familyId: 'fam-1' });
  const db = makeInMemoryDb();
  // Schrijf twee items met onderscheidende timestamps zodat ORDER BY werkt
  const orig = Date.prototype.toISOString;
  let n = 0;
  Date.prototype.toISOString = function() { return `2026-05-01T00:00:${String(n++).padStart(2, '0')}.000Z`; };
  await queue.enqueue(db, 'upsert', 'recipe', 'r1', { id: 'r1', title: 'A' });
  await queue.enqueue(db, 'upsert', 'recipe', 'r2', { id: 'r2', title: 'B' });
  Date.prototype.toISOString = orig;

  let calls = 0;
  const client = makeClient(() => {
    calls++;
    return { error: new Error('boom') };
  });
  await queue.flushQueue(db, client);
  assert.equal(calls, 1, 'tweede rij wordt niet geprobeerd na eerste fout');
  assert.equal(db.rows.size, 2, 'beide rijen blijven staan');
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
