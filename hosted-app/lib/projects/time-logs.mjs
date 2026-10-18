/** Project-local time records. No network, timer, provider SDK or raw CSV retention. */
export const MAX_TIME_ENTRIES = 200;
export const MAX_TIME_CSV_BYTES = 200_000;
const maxColumns = 40;
const units = ['hours', 'minutes', 'hms'];
const fail = message => { throw new Error(message); };
const round = value => Math.round(value * 100) / 100;
function text(value, label, max, optional = false) {
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) fail(`${label} must be ${optional ? '' : 'nonempty '}text of at most ${max} characters.`);
  return value.trim();
}
function id(value, label) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(value)) fail(`${label} must use 1–40 letters, numbers, underscores or hyphens.`);
  return value;
}
function object(value, label) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`); }
export function timeLogTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail('Time-log timestamp must be canonical ISO UTC.');
  return value;
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) fail('Work date must be a real YYYY-MM-DD source date. Locale dates and time-zone conversion are not inferred.');
  return value;
}
function entry(value) {
  object(value, 'Time entry');
  if (!Number.isInteger(value.durationSeconds) || value.durationSeconds < 1 || value.durationSeconds > 86400) fail('Time duration must be an integer from 1 to 86400 seconds.');
  return {id:id(value.id, 'Time-entry ID'), taskId:id(value.taskId, 'Time-entry task ID'), taskTitle:text(value.taskTitle, 'Time-entry task title', 200), workDate:date(value.workDate), durationSeconds:value.durationSeconds, note:text(value.note, 'Time note', 400, true), sourceLabel:text(value.sourceLabel, 'Time source label', 80), externalId:text(value.externalId === undefined ? '' : value.externalId, 'External entry ID', 100, true), importedAt:timeLogTimestamp(value.importedAt)};
}
const fingerprint = value => JSON.stringify([value.taskId, value.workDate, value.durationSeconds, value.note]);
const externalKey = value => value.externalId ? JSON.stringify([value.sourceLabel, value.externalId]) : null;

export function validateTimeEntries(value = []) {
  if (!Array.isArray(value) || value.length > MAX_TIME_ENTRIES) fail(`A project supports at most ${MAX_TIME_ENTRIES} time entries.`);
  const entries = value.map(entry);
  if (new Set(entries.map(value => value.id)).size !== entries.length) fail('Time-entry IDs contain duplicates.');
  const keys = entries.map(externalKey).filter(Boolean);
  if (new Set(keys).size !== keys.length) fail('External time-entry IDs must be unique within their source label.');
  return entries;
}

/** Strict comma-separated CSV with quoted fields, escaped quotes and physical row numbers. */
export function parseTimeLogCsv(csv) {
  if (typeof csv !== 'string' || csv.length > MAX_TIME_CSV_BYTES || new TextEncoder().encode(csv).length > MAX_TIME_CSV_BYTES) fail('Choose time-log CSV text smaller than 200 KB.');
  csv = csv.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (csv.includes('\0')) fail('CSV contains an unsupported null character.');
  const records = [];
  let values = [], field = '', quoted = false, closed = false, line = 1, startLine = 1;
  const finishField = () => { values.push(field); field = ''; closed = false; if (values.length > maxColumns) fail('CSV supports at most 40 columns.'); };
  const finishRecord = () => { finishField(); if (values.some(value => value.trim())) records.push({rowNumber:startLine, values}); values = []; if (records.length > MAX_TIME_ENTRIES + 1) fail('CSV supports at most 200 data rows.'); };
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) {
      if (char === '"') { if (csv[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } }
      else { field += char; if (char === '\n') line++; }
    } else if (char === ',') finishField();
    else if (char === '\n') { finishRecord(); line++; startLine = line; }
    else if (closed) fail(`Unexpected text after a closing quote on CSV line ${line}.`);
    else if (char === '"') { if (field) fail(`Unexpected quote on CSV line ${line}.`); quoted = true; }
    else field += char;
    if (field.length > 2000) fail(`CSV field on line ${startLine} exceeds 2000 characters.`);
  }
  if (quoted) fail(`Unclosed quoted field starting on CSV line ${startLine}.`);
  if (field || values.length || closed) finishRecord();
  if (!records.length) fail('CSV needs a header row.');
  const headers = records.shift().values.map(value => text(value, 'CSV header', 80));
  if (new Set(headers.map(value => value.toLowerCase())).size !== headers.length) fail('CSV headers must be unique, including letter case.');
  return {headers, rows:records};
}

function duration(value, unit) {
  value = value.trim();
  let seconds;
  if (unit === 'hms') {
    const parts = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/.exec(value);
    if (!parts) fail('Duration must use H:mm:ss, with minutes and seconds from 00 to 59.');
    seconds = Number(parts[1]) * 3600 + Number(parts[2]) * 60 + Number(parts[3]);
  } else {
    if (!/^\d+(?:\.\d{1,6})?$/.test(value)) fail('Duration must use a positive decimal number with a dot and at most six decimal places.');
    seconds = Math.round(Number(value) * (unit === 'hours' ? 3600 : 60));
  }
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 86400) fail('Duration must round to 1–86400 seconds.');
  return seconds;
}

function classify(candidate, existing) {
  const key = externalKey(candidate);
  if (key) {
    const previous = existing.find(value => externalKey(value) === key);
    if (previous) return fingerprint(previous) === fingerprint(candidate) ? {status:'duplicate', message:'This source label and external entry ID already have the same recorded content.'} : {status:'conflict', message:'This external entry ID already has different task, date, duration or note content. Resolve the existing entry before importing.'};
  } else if (existing.some(value => fingerprint(value) === fingerprint(candidate))) return {status:'possible-duplicate', message:'The task, date, duration and note match another record. This may be a separate legitimate session; review before including.'};
  return {status:'ready', message:'Ready to import after review.'};
}
function counts(rows) {
  return {ready:rows.filter(row => row.status === 'ready').length, duplicate:rows.filter(row => row.status === 'duplicate').length, possibleDuplicate:rows.filter(row => row.status === 'possible-duplicate').length, conflict:rows.filter(row => row.status === 'conflict').length, invalid:rows.filter(row => row.status === 'invalid').length};
}

/** Requires a normalized project; explicit mapped headers are never guessed from provider names. */
export function prepareTimeImport(project, csv, options, now) {
  object(options, 'Time import options'); object(options.mapping, 'CSV column mapping');
  if (!units.includes(options.durationUnit)) fail('Choose hours, minutes or hms as the duration unit.');
  const sourceLabel = text(options.sourceLabel, 'Time source label', 80), importedAt = timeLogTimestamp(now);
  const parsed = parseTimeLogCsv(csv), mapping = {};
  for (const key of ['taskId', 'date', 'duration', 'note', 'externalId']) {
    const selected = options.mapping[key];
    if ((key === 'note' || key === 'externalId') && (selected === undefined || selected === '')) { mapping[key] = -1; continue; }
    const name = text(selected, `${key} column`, 80);
    mapping[key] = parsed.headers.indexOf(name);
    if (mapping[key] < 0) fail(`CSV column ${name} was not found.`);
  }
  const selected = Object.values(mapping).filter(index => index >= 0);
  if (new Set(selected).size !== selected.length) fail('Map each selected column to only one time-entry field.');
  if (options.taskMap !== undefined) object(options.taskMap, 'Task mapping');
  const seen = [...project.timeEntries], usedIds = new Set([...project.timeEntries, ...project.tasks, ...project.requirements, ...project.deliverables, ...project.sources].map(value => value.id));
  const rows = parsed.rows.map(row => {
    try {
      if (row.values.length !== parsed.headers.length) fail(`Expected ${parsed.headers.length} columns, received ${row.values.length}.`);
      const get = key => mapping[key] < 0 ? '' : row.values[mapping[key]];
      const taskValue = get('taskId').trim();
      const taskId = options.taskMap && Object.hasOwn(options.taskMap, taskValue) ? options.taskMap[taskValue] : taskValue;
      const task = project.tasks.find(value => value.id === taskId);
      if (!task) fail(`Task “${taskValue.slice(0, 200)}” is not mapped to a current project task. Use an exact task ID or an explicit task mapping.`);
      let identifier; do { identifier = `l-${globalThis.crypto.randomUUID()}`; } while (usedIds.has(identifier)); usedIds.add(identifier);
      const candidate = entry({id:identifier, taskId:task.id, taskTitle:task.title, workDate:get('date').trim(), durationSeconds:duration(get('duration'), options.durationUnit), note:get('note'), sourceLabel, externalId:get('externalId'), importedAt});
      const result = classify(candidate, seen);
      if (result.status !== 'conflict' && result.status !== 'duplicate') seen.push(candidate);
      return {rowNumber:row.rowNumber, ...result, entry:candidate};
    } catch (error) { return {rowNumber:row.rowNumber, status:'invalid', message:error instanceof Error ? error.message : 'This row could not be read.'}; }
  });
  return {kind:'project-time-log-import', projectId:project.id, preparedAt:importedAt, headers:parsed.headers, sourceLabel, durationUnit:options.durationUnit, rows, counts:counts(rows), methodology:'User-mapped source dates are preserved as supplied dates; no time-zone conversion is inferred. Decimal hours/minutes round to the nearest whole second. Previewing does not change the project. Repeated external IDs are checked within the exact source label; ID-less matches require duplicate review.'};
}

/** Reclassify every candidate against current records so an old preview cannot overwrite newer work. */
export function applyTimeImport(project, preview, options = {}) {
  object(preview, 'Time import preview'); object(options, 'Time import options');
  if (preview.kind !== 'project-time-log-import' || preview.projectId !== project.id || !Array.isArray(preview.rows) || preview.rows.length > MAX_TIME_ENTRIES) fail('Prepare a bounded time-log preview for this project first.');
  if (options.includePossibleDuplicates !== undefined && typeof options.includePossibleDuplicates !== 'boolean') fail('Duplicate inclusion must be an explicit true or false choice.');
  const entries = [...project.timeEntries], usedIds = new Set([...project.timeEntries, ...project.tasks, ...project.requirements, ...project.deliverables, ...project.sources].map(value => value.id));
  let addedCount = 0, skippedCount = 0;
  for (const row of preview.rows) {
    object(row, 'Time import row');
    if (!['ready','duplicate','possible-duplicate'].includes(row.status)) fail('Resolve every invalid or conflicting CSV row and prepare the import again. Nothing has been imported.');
    const candidate = entry(row.entry), task = project.tasks.find(value => value.id === candidate.taskId);
    if (!task) fail('A mapped task was removed after this preview. Prepare the import again. Nothing has been imported.');
    candidate.taskTitle = task.title;
    const result = classify(candidate, entries);
    if (result.status === 'conflict') fail(result.message + ' Nothing has been imported.');
    if (result.status === 'duplicate' || (result.status === 'possible-duplicate' && !options.includePossibleDuplicates)) { skippedCount++; continue; }
    if (usedIds.has(candidate.id)) fail('A time-entry ID changed or collided after preview. Prepare the import again.');
    usedIds.add(candidate.id); entries.push(candidate); addedCount++;
  }
  if (entries.length > MAX_TIME_ENTRIES) fail(`This import would exceed the ${MAX_TIME_ENTRIES}-entry project limit. Nothing has been imported.`);
  return {timeEntries:validateTimeEntries(entries), addedCount, skippedCount};
}

export function summarizeTime(project) {
  const entries = project.timeEntries, currentIds = new Set(project.tasks.map(task => task.id));
  const tasks = project.tasks.map(task => {
    const logs = entries.filter(value => value.taskId === task.id), loggedSeconds = logs.reduce((total, value) => total + value.durationSeconds, 0);
    return {taskId:task.id, taskTitle:task.title, estimatedHours:task.hours, loggedSeconds, loggedHours:round(loggedSeconds / 3600), entryCount:logs.length, status:task.status, varianceHours:logs.length ? round(loggedSeconds / 3600 - task.hours) : null, coverage:!logs.length ? 'no-records' : task.status === 'done' ? 'task-marked-done' : 'partial'};
  });
  const orphaned = entries.filter(value => !currentIds.has(value.taskId));
  const loggedSeconds = entries.reduce((total, value) => total + value.durationSeconds, 0), orphanedSeconds = orphaned.reduce((total, value) => total + value.durationSeconds, 0);
  const dates = entries.map(value => value.workDate).sort();
  return {loggedSeconds, loggedHours:round(loggedSeconds / 3600), entryCount:entries.length, orphanedSeconds, orphanedHours:round(orphanedSeconds / 3600), orphanedEntryCount:orphaned.length, tasks, dateRange:dates.length ? {first:dates[0], last:dates.at(-1)} : null,
    orphanedEntries:orphaned.map(({id,taskId,taskTitle,workDate,durationSeconds,sourceLabel}) => ({id,taskId,taskTitle,workDate,durationSeconds,sourceLabel})),
    methodology:'Logged durations are user-supplied records, not verified attendance, approval or billable time. Work dates are supplied source dates without time-zone conversion. Missing logs do not prove zero effort; variance is logged hours minus the current estimate, not a final forecast. Task completion is manual. Remaining planned effort is reported separately and is not reduced by logged time.'};
}

/** Spreadsheet-safe CSV is a presentation export; JSON preserves the exact original strings. */
export function exportTimeCsv(project) {
  const cell = value => { let safe = String(value); if (/^\s*[=+\-@]/.test(safe) || /^[\t\r\n]/.test(safe)) safe = "'" + safe; return '"' + safe.replace(/"/g, '""') + '"'; };
  const headers = ['id','taskId','taskTitle','workDate','duration','note','sourceLabel','externalId','importedAt'];
  return [headers, ...project.timeEntries.map(value => {const seconds = value.durationSeconds, duration = `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds % 3600 / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;return [value.id,value.taskId,value.taskTitle,value.workDate,duration,value.note,value.sourceLabel,value.externalId,value.importedAt];})].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
