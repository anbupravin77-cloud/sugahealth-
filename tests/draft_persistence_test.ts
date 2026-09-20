import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clinicalWorkflowService } from '../src/server/services/clinicalWorkflowService';
import { getSupabaseAdmin } from '../src/server/supabaseAdmin';

// Exercise the active service with a query mock that enforces UPDATE filters.
// These tests prove application behavior, not deployed Postgres/RLS behavior.
const client = getSupabaseAdmin();
const originalFrom = client.from;

function mockDraft(options: { race?: boolean; readError?: boolean } = {}) {
  const row: Record<string, any> = {
    id: 'draft-a', patient_id: 'patient-a', status: 'draft', responses: { saved: true },
  };
  let inserts = 0;
  client.from = (() => {
    const filters: Array<[string, unknown]> = [];
    let operation = 'select';
    let payload: any;
    const query: any = {
      select: () => query,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      order: () => query,
      limit: () => query,
      update: (value: unknown) => {
        operation = 'update'; payload = value;
        if (options.race) row.status = 'submitted';
        return query;
      },
      insert: (value: unknown) => { operation = 'insert'; payload = value; inserts++; return query; },
      maybeSingle: async () => {
        if (options.readError) return { data: null, error: { message: 'database unavailable' } };
        return { data: { ...row }, error: null };
      },
      single: async () => {
        if (operation === 'update' && !filters.every(([key, value]) => row[key] === value)) {
          return { data: null, error: { message: 'No matching draft' } };
        }
        Object.assign(row, payload);
        return { data: { ...row }, error: null };
      },
    };
    return query;
  }) as typeof client.from;
  return { row, inserts: () => inserts };
}

for (const draftId of ['draft-a', undefined]) {
  test(`save rejects concurrent submission (${draftId ? 'explicit ID' : 'recovered draft'})`, async () => {
    const state = mockDraft({ race: true });
    try {
      await assert.rejects(clinicalWorkflowService.saveDraft('patient-a', 'weight', { overwritten: true }, draftId));
      assert.deepEqual(state.row.responses, { saved: true });
      assert.equal(state.row.status, 'submitted');
    } finally { client.from = originalFrom; }
  });

  test(`owned draft saves normally (${draftId ? 'explicit ID' : 'recovered draft'})`, async () => {
    const state = mockDraft();
    try {
      assert.deepEqual(await clinicalWorkflowService.saveDraft('patient-a', 'weight', { updated: true }, draftId), { id: 'draft-a' });
      assert.deepEqual(state.row.responses, { updated: true });
      assert.equal(state.row.status, 'draft');
    } finally { client.from = originalFrom; }
  });
}

test('draft lookup failure must not create a replacement draft', async () => {
  const state = mockDraft({ readError: true });
  try {
    await assert.rejects(clinicalWorkflowService.saveDraft('patient-a', 'weight', {}), /database unavailable/);
    assert.equal(state.inserts(), 0);
  } finally { client.from = originalFrom; }
});

test('draft fetch failure must not be presented as no saved draft', async () => {
  mockDraft({ readError: true });
  try {
    await assert.rejects(clinicalWorkflowService.getDraft('patient-a'), /database unavailable/);
  } finally { client.from = originalFrom; }
});
