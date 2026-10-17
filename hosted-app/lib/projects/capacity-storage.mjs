import { validateCapacityScenario } from './commitments.mjs';

export const CAPACITY_STORAGE_KEY = 'professional-toolkit-capacity-v1';
export const MAX_DEVICE_CAPACITY_SCENARIOS = 5;
const MAX_WORKSPACE_BYTES = 200000;
const MAX_ACCOUNT_BYTES = 3400000;
const bytes = value => new TextEncoder().encode(value).byteLength;
const record = value => !!value && typeof value === 'object' && !Array.isArray(value);

function workspace(scenarios, selectedId) {
  if (!Array.isArray(scenarios) || scenarios.length > MAX_DEVICE_CAPACITY_SCENARIOS)
    throw Error('Keep at most 5 capacity scenarios on this device. Export a scenario before removing it.');
  const canonical = scenarios.map(validateCapacityScenario);
  const ids = new Set(canonical.map(scenario => scenario.id));
  if (ids.size !== canonical.length) throw Error('Capacity scenarios contain duplicate IDs.');
  if (selectedId !== null && (typeof selectedId !== 'string' || !ids.has(selectedId)))
    throw Error('The selected capacity scenario is missing.');
  const result = {version: 1, scenarios: canonical, selectedId};
  if (bytes(JSON.stringify(result)) > MAX_WORKSPACE_BYTES) throw Error('Capacity device data exceeds the 200 KB limit.');
  return result;
}

/** Unknown fields and computed results are discarded; corrupt data is never silently replaced. */
export function restoreCapacityWorkspace(json) {
  if (json == null) return workspace([], null);
  if (typeof json !== 'string' || bytes(json) > MAX_WORKSPACE_BYTES) throw Error('Capacity device data must be JSON of at most 200 KB.');
  let value;
  try { value = JSON.parse(json); } catch { throw Error('Capacity device data is not valid JSON. Export the original before resetting it.'); }
  if (!record(value) || value.version !== 1) throw Error('Unsupported capacity device data version.');
  return workspace(value.scenarios, value.selectedId);
}

/** Web Storage setItem is atomic on failure. Never remove the old value or report success early. */
export function persistCapacityWorkspace(storage, scenarios, selectedId) {
  const value = workspace(scenarios, selectedId);
  if (!storage || typeof storage.setItem !== 'function') throw Error('Device storage is unavailable. Export this scenario instead.');
  try { storage.setItem(CAPACITY_STORAGE_KEY, JSON.stringify(value)); }
  catch { throw Error('Capacity scenarios could not be saved on this device. Existing data was kept. Export a backup and free storage before retrying.'); }
  return value;
}

/** Account reports are immutable configuration snapshots, never project or evidence copies. */
export function makeCapacityAccountReport(scenario) {
  return validateCapacityScenario(scenario);
}

export function parseCapacityAccountReports(response) {
  if (!record(response) || !Array.isArray(response.reports) || response.reports.length > 50)
    throw Error('Invalid account report response. At most 50 reports are supported.');
  let serialized;
  try { serialized = JSON.stringify(response); } catch { throw Error('Invalid account report response.'); }
  if (bytes(serialized) > MAX_ACCOUNT_BYTES) throw Error('Account reports exceed the supported response size.');
  const snapshots = [], ids = new Set();
  let invalidCount = 0;
  for (const report of response.reports) {
    if (!record(report) || report.kind !== 'capacity-scenario') continue;
    try {
      if (typeof report.cloudId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(report.cloudId) || ids.has(report.cloudId) || !Number.isSafeInteger(report.savedAt) || report.savedAt < 0 || report.savedAt > 8640000000000)
        throw Error('Invalid snapshot metadata.');
      const scenario = makeCapacityAccountReport(report);
      snapshots.push({scenario, cloudId: report.cloudId, savedAt: report.savedAt});
      ids.add(report.cloudId);
    } catch { invalidCount++; }
  }
  return {snapshots, invalidCount};
}
