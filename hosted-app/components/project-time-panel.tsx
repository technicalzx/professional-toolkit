'use client';

import {useEffect, useRef, useState} from 'react';
import {validateProject, parseTimeLogCsv, prepareTimeLogImport, applyTimeLogImport, summarizeProjectTime, exportProjectTimeCsv, removeProjectTimeEntry, clearProjectTimeEntries} from '../lib/projects/engine.mjs';
import {normalizeProjectBaseline} from '../lib/projects/workspace-evidence.mjs';
import './project-time-panel.css';

type Unit = 'hours' | 'minutes' | 'hms';
type Mapping = {taskId: string; date: string; duration: string; externalId: string; note: string};
type Entry = {id: string; taskId: string; taskTitle: string; workDate: string; durationSeconds: number; note: string; sourceLabel: string; externalId: string; importedAt: string};
type Project = {id: string; tasks: {id: string; title: string; hours: number}[]; timeEntries: Entry[]};
type Parsed = {headers: string[]; rows: {rowNumber: number; values: string[]}[]};
type Row = {rowNumber: number; status: 'ready' | 'duplicate' | 'possible-duplicate' | 'conflict' | 'invalid'; message: string; entry?: Entry};
type Preview = {projectId: string; preparedAt: string; rows: Row[]; counts: {ready: number; duplicate: number; possibleDuplicate: number; conflict: number; invalid: number}};
type Summary = {loggedSeconds: number; loggedHours: number; entryCount: number; orphanedSeconds: number; orphanedEntryCount: number; tasks: {taskId: string; taskTitle: string; estimatedHours: number; loggedHours: number; entryCount: number; status: string; varianceHours: number | null}[]; methodology: string};
type Props = {project: unknown; baseline?: unknown; revision?: number; onChange: (project: unknown) => boolean | void};
const emptyMapping: Mapping = {taskId: '', date: '', duration: '', externalId: '', note: ''};
const MAX_BYTES = 200_000;
const errorMessage = (failure: unknown) => failure instanceof Error ? failure.message : 'Time records could not be updated. Your saved project is retained.';
const numeric = (value: number) => new Intl.NumberFormat('en', {maximumFractionDigits: 3}).format(value);
function duration(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor(seconds % 3600 / 60); return `${hours}:${String(minutes).padStart(2, '0')}:${String(Math.round(seconds % 60)).padStart(2, '0')}`; }
const statuses: Record<Row['status'], string> = {ready: 'Ready', duplicate: 'Exact duplicate: skipped', 'possible-duplicate': 'Possible duplicate', conflict: 'External ID conflict', invalid: 'Invalid row'};

export default function ProjectTimePanel({project, baseline, revision = 0, onChange}: Props) {
  const [csv, setCsv] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Mapping>(emptyMapping);
  const [unit, setUnit] = useState<Unit>('hours');
  const [sourceLabel, setSourceLabel] = useState('');
  const [taskMap, setTaskMap] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [includePossible, setIncludePossible] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  let model: Project | null = null;
  let summary: Summary | null = null;
  let validationError = '';
  try { model = validateProject(project) as unknown as Project; summary = summarizeProjectTime(project) as unknown as Summary; } catch (failure) { validationError = errorMessage(failure); }
  const currentRef = useRef({project, model}); currentRef.current = {project, model};
  useEffect(() => { setPreview(null); }, [project]);
  const entries = model?.timeEntries || [];
  const taskIds = new Set(model?.tasks.map(task => task.id) || []);
  const orphaned = entries.filter(entry => !taskIds.has(entry.taskId));
  const taskColumn = parsed?.headers.indexOf(mapping.taskId) ?? -1;
  const csvTasks = [...new Set((parsed?.rows || []).map(row => row.values[taskColumn]?.trim() || '').filter(Boolean))];
  const totalEstimate = model?.tasks.reduce((sum, task) => sum + task.hours, 0) || 0;
  const dates = entries.map(entry => entry.workDate).sort();
  let accountBytes: number | null = null;
  let candidateError = '';
  if (model) try {
    const candidate = preview && !preview.counts.invalid && !preview.counts.conflict ? applyTimeLogImport(project, preview, {includePossibleDuplicates: includePossible}).project : project;
    const envelope = {kind: 'project-workspace', revision: Math.max(1, revision + 1), project: candidate, baseline: normalizeProjectBaseline(candidate, baseline)};
    accountBytes = new TextEncoder().encode(JSON.stringify(envelope)).byteLength;
  } catch (failure) { candidateError = errorMessage(failure); }

  function resetPreview() { setPreview(null); setError(''); setNotice(''); }
  function parseInput(value: string) {
    if (new TextEncoder().encode(value).byteLength > MAX_BYTES) throw new Error('Use a CSV file or paste smaller than 200 KB.');
    return parseTimeLogCsv(value) as unknown as Parsed;
  }
  function readColumns(value = csv) {
    resetPreview();
    try {
      const next = parseInput(value);
      setParsed(next); setTaskMap({}); setMapping(emptyMapping);
      setNotice(`Read ${next.rows.length} data rows. Select the columns and map each supplied task before previewing.`);
    } catch (failure) { setParsed(null); setError(errorMessage(failure)); }
  }
  async function importFile(file?: File) {
    if (!file || !model) return;
    const selectedProjectId = model.id; setReading(true); resetPreview();
    try {
      if (file.size > MAX_BYTES) throw new Error('Choose a CSV file smaller than 200 KB.');
      const text = await file.text();
      if (currentRef.current.model?.id !== selectedProjectId) throw new Error('The selected project changed. Choose the CSV file again.');
      setCsv(text); readColumns(text);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setReading(false); if (fileRef.current) fileRef.current.value = ''; }
  }
  function selectColumn(key: keyof Mapping, value: string) { setMapping(previous => ({...previous, [key]: value})); if (key === 'taskId') setTaskMap({}); resetPreview(); }
  function prepare(event: React.FormEvent) {
    event.preventDefault(); resetPreview();
    try {
      if (!parsed) throw new Error('Read the CSV columns first.');
      const result = prepareTimeLogImport(project, csv, {mapping, durationUnit: unit, sourceLabel, taskMap}) as unknown as Preview;
      setPreview(result); setIncludePossible(false);
      setNotice('Preview only. No time records have been changed. Resolve every invalid row and external ID conflict before importing.');
    } catch (failure) { setError(errorMessage(failure)); }
  }
  function persist(next: unknown) { if (onChange(next) === false) throw new Error('Device storage did not accept this update. Your saved time records are unchanged; export a backup and retry.'); }
  function apply() {
    setError(''); setNotice('');
    try {
      if (!preview) throw new Error('Preview this import first.');
      const result = applyTimeLogImport(project, preview, {includePossibleDuplicates: includePossible});
      if (result.addedCount > 0) persist(result.project);
      setPreview(null); setNotice(`${result.addedCount} time entries added; ${result.skippedCount} rows skipped. Estimates and task completion states were not changed.`);
    } catch (failure) { setError(errorMessage(failure)); }
  }
  function remove(entry: Entry) {
    setError(''); setNotice('');
    if (!window.confirm('Remove this recorded time entry? Its original CSV and already exported copies are unchanged.')) return;
    try { persist(removeProjectTimeEntry(project, entry.id)); setPreview(null); setNotice('Time entry removed from this device project. Save to account to update the account copy.'); }
    catch (failure) { setError(errorMessage(failure)); }
  }
  function clear() {
    setError(''); setNotice('');
    if (!window.confirm('Clear all time entries from this project? Task estimates and progress stay unchanged. Previously exported copies are not deleted.')) return;
    try { persist(clearProjectTimeEntries(project)); setPreview(null); setNotice('Time logs cleared from this device project. Save to account to update the account copy.'); }
    catch (failure) { setError(errorMessage(failure)); }
  }
  function downloadCsv() {
    setError('');
    try {
      const text = exportProjectTimeCsv(project); const url = URL.createObjectURL(new Blob([text], {type: 'text/csv;charset=utf-8'}));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${model?.id || 'project'}-time.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { setError(errorMessage(failure)); }
  }
  function column(key: keyof Mapping, label: string, optional = false) {
    return <label className="pwt-field"><span>{label}</span><select value={mapping[key]} required={!optional} onChange={event => selectColumn(key, event.target.value)}><option value="">{optional ? 'Not supplied' : 'Choose a column'}</option>{parsed?.headers.map(header => <option key={header} value={header}>{header}</option>)}</select></label>;
  }

  return <section className="pwt-panel" aria-labelledby="pwt-heading">
    <div className="pw-section-head"><div><h2 id="pwt-heading">Time & actuals</h2><p>Bring recorded effort into the same project as your estimates and delivery evidence.</p></div><span className="pwt-note">{entries.length}/200 recorded entries</span></div>
    {validationError && <p role="alert" className="pw-alert">Fix the project before editing time logs: {validationError}</p>}
    {error && <p role="alert" className="pw-alert">{error}</p>}{notice && <p role="status" className="pw-notice">{notice}</p>}
    {summary && <section className="pwt-metrics" aria-label="Time summary"><div><span>Estimated scope</span><strong>{numeric(totalEstimate)} h</strong></div><div><span>Recorded time</span><strong>{duration(summary.loggedSeconds)}</strong><small>H:mm:ss · {numeric(summary.loggedHours)} hours</small></div><div><span>Logged minus estimate</span><strong>{summary.entryCount ? `${summary.loggedHours - totalEstimate > 0 ? '+' : ''}${numeric(summary.loggedHours - totalEstimate)} h` : 'Unknown'}</strong><small>{summary.entryCount ? 'Includes any orphaned entries; missing logs remain unknown' : 'No time logs supplied'}</small></div><div><span>Recorded entries</span><strong>{summary.entryCount}</strong><small>{dates.length ? `${dates[0]} – ${dates.at(-1)}` : 'No supplied work dates yet'}</small></div></section>}
    <section className="pw-panel pwt-import"><h3>Import recorded time</h3><p>Upload or paste a header-based CSV. Map columns and task names, inspect the preview, then confirm the import. Dates must be supplied as YYYY-MM-DD; no timezone conversion is applied.</p>
      <label className="pwt-field"><span>Time CSV file</span><input ref={fileRef} type="file" accept=".csv,text/csv" disabled={reading || !model} onChange={event => { void importFile(event.target.files?.[0]); }}/></label>
      <label className="pwt-field"><span>Paste time CSV</span><textarea rows={6} maxLength={200000} value={csv} disabled={reading || !model} onChange={event => { setCsv(event.target.value); setParsed(null); resetPreview(); }} placeholder={'task,work_date,hours,entry_id,note\nDiscovery,2026-10-17,1.5,entry-001,Reviewed requirements'}/></label>
      <div className="pw-actions"><button type="button" className="pw-button" disabled={!csv || reading || !model} onClick={() => readColumns()}>Read CSV columns</button><span className="pwt-note">Up to 200 KB, 200 data rows and 40 columns. Import drafts stay in this tab until you leave it.</span></div>
      {parsed && <form className="pwt-mapping" onSubmit={prepare}>
        <label className="pwt-field"><span>Time source label</span><input required maxLength={80} value={sourceLabel} onChange={event => { setSourceLabel(event.target.value); resetPreview(); }} placeholder="e.g. my-toggl-account"/></label>
        <p className="pwt-note">Use one stable, case-sensitive provider/account namespace across repeated exports, not a filename. External IDs are compared within this label. Changing it creates a separate import source.</p>
        <div className="pwt-columns">{column('taskId', 'CSV task column')}{column('date', 'CSV date column')}{column('duration', 'CSV duration column')}{column('externalId', 'CSV external ID column', true)}{column('note', 'CSV note column', true)}<label className="pwt-field"><span>Duration unit</span><select value={unit} onChange={event => { setUnit(event.target.value as Unit); resetPreview(); }}><option value="hours">Decimal hours</option><option value="minutes">Decimal minutes</option><option value="hms">H:mm:ss</option></select></label></div>
        <p className="pwt-note">Decimal hours and minutes round to the nearest whole second. Each entry must be positive and at most 24 hours. A supplied date identifies its work day without inferring start/end timestamps.</p>
        {mapping.taskId && <section className="pwt-task-mapping" aria-label="Map supplied tasks"><h4>Match CSV tasks to this project</h4>{csvTasks.map(value => <label className="pwt-field" key={value}><span>Map CSV task {value}</span><select value={taskMap[value] || (taskIds.has(value) ? value : '')} onChange={event => { setTaskMap(previous => ({...previous, [value]: event.target.value})); resetPreview(); }}><option value="">Choose a project task</option>{model?.tasks.map(task => <option key={task.id} value={task.id}>{task.id}: {task.title}</option>)}</select></label>)}{!csvTasks.length && <p>No nonblank task values were found in this column. Correct the CSV or choose another column.</p>}</section>}
        <button type="submit" className="pw-primary" disabled={!mapping.taskId || !mapping.date || !mapping.duration || !sourceLabel.trim()}>Preview time import</button>
      </form>}
    </section>
    {preview && <section className="pw-panel pwt-preview" aria-labelledby="pwt-preview-heading"><h3 id="pwt-preview-heading">Review time import</h3><dl className="pwt-counts"><div><dt>Ready</dt><dd>{preview.counts.ready}</dd></div><div><dt>Exact duplicates</dt><dd>{preview.counts.duplicate}</dd></div><div><dt>Possible duplicates</dt><dd>{preview.counts.possibleDuplicate}</dd></div><div><dt>ID conflicts</dt><dd>{preview.counts.conflict}</dd></div><div><dt>Invalid rows</dt><dd>{preview.counts.invalid}</dd></div></dl>
      <p>Exact duplicates are always skipped. Without an external ID, matching task, work date and duration may represent repeated work or a duplicate; the application cannot establish which. These possible duplicates are skipped unless you explicitly include them.</p>
      <label className="pwt-check"><input type="checkbox" checked={includePossible} onChange={event => setIncludePossible(event.target.checked)}/><span>Include possible duplicates without external IDs after reviewing their source records</span></label>
      <div className="pwt-table-wrap"><table><caption>CSV row validation and import decisions</caption><thead><tr><th>CSV row</th><th>Decision</th><th>Mapped record</th><th>Review or remedy</th></tr></thead><tbody>{preview.rows.map(row => <tr key={row.rowNumber}><th scope="row">{row.rowNumber}</th><td><span className={`pwt-badge pwt-${row.status}`}>{statuses[row.status]}</span></td><td>{row.entry ? <>{row.entry.taskTitle || row.entry.taskId}<br/>{row.entry.workDate} · {duration(row.entry.durationSeconds)}</> : 'Not accepted'}</td><td>{row.message}{row.status === 'invalid' && <p>Correct this row or its column/task mapping, then preview again.</p>}{row.status === 'conflict' && <p>Verify the source export and existing entry. A changed external ID is never overwritten automatically; remove an incorrect saved entry explicitly before importing its correction.</p>}</td></tr>)}</tbody></table></div>
      {(preview.counts.invalid > 0 || preview.counts.conflict > 0) && <p className="pwt-warning">Nothing will be imported until every invalid row and external ID conflict is resolved.</p>}
      {accountBytes !== null && <p className={accountBytes > 60_000 ? 'pwt-warning' : 'pwt-note'}>Estimated account document after import: {accountBytes.toLocaleString('en')} / 60,000 bytes, including the scope baseline. {accountBytes > 60_000 ? 'Device import remains available, but account save will reject this document. Export a JSON backup or reduce recorded detail before syncing.' : 'This is a preflight estimate; the account API validates the final document.'}</p>}
      {candidateError && <p role="alert" className="pwt-warning">{candidateError} Reduce the import or resolve the project issue before continuing.</p>}
      <button type="button" className="pw-primary" disabled={!preview.rows.length || preview.counts.invalid > 0 || preview.counts.conflict > 0 || !!candidateError} onClick={apply}>Import reviewed time</button>
    </section>}
    {summary && <section className="pw-panel pwt-summary"><h3>Task estimates and recorded effort</h3><p>Variance means logged hours minus the supplied estimate. Missing logs do not establish that no work occurred; completed work and time recording are independent.</p><div className="pwt-table-wrap"><table><caption>Current task effort comparison</caption><thead><tr><th>Task</th><th>Estimate</th><th>Logged</th><th>Variance</th><th>Entries / progress</th></tr></thead><tbody>{summary.tasks.map(task => <tr key={task.taskId}><th scope="row">{task.taskTitle}<span className="pwt-id">{task.taskId}</span></th><td>{numeric(task.estimatedHours)} h</td><td>{task.entryCount ? `${numeric(task.loggedHours)} h` : 'No records'}</td><td>{task.varianceHours === null ? 'Unknown (no logs)' : `${task.varianceHours > 0 ? '+' : ''}${numeric(task.varianceHours)} h`}</td><td>{task.entryCount ? `${task.entryCount} entries` : 'No time logs'} · {task.status}</td></tr>)}</tbody></table></div>{orphaned.length > 0 && <p className="pwt-warning">{summary.orphanedEntryCount} entries ({duration(summary.orphanedSeconds)}) refer to tasks no longer in the current scope. They remain in totals and exports. Review their recorded task names before removing them.</p>}<p className="pwt-note">{summary.methodology}</p></section>}
    <section className="pw-panel pwt-log"><div className="pw-section-head"><div><h3>Recorded entries</h3><p>JSON project exports and account saves include these records. Time CSV export neutralizes spreadsheet formulas.</p></div><div className="pw-actions"><button type="button" className="pw-button" disabled={!model || !entries.length} onClick={downloadCsv}>Download time CSV</button><button type="button" className="pw-danger" disabled={!model || !entries.length} onClick={clear}>Clear time logs</button></div></div>{entries.length ? <div className="pwt-table-wrap"><table><caption>Supplied work dates and durations</caption><thead><tr><th>Date / task</th><th>Duration</th><th>Source / external ID</th><th>Recorded note</th><th>Action</th></tr></thead><tbody>{entries.map((entry, index) => <tr key={entry.id}><th scope="row">{entry.workDate}<span className="pwt-id">{entry.taskTitle} · {entry.taskId}</span>{!taskIds.has(entry.taskId) && <span className="pwt-badge pwt-conflict">Task removed from scope</span>}</th><td>{duration(entry.durationSeconds)}</td><td>{entry.sourceLabel}<span className="pwt-id">{entry.externalId || 'No external ID'}</span></td><td>{entry.note || 'No note supplied'}</td><td><button type="button" className="pw-danger" onClick={() => remove(entry)} aria-label={`Remove time entry ${index + 1}`}>Remove entry</button></td></tr>)}</tbody></table></div> : <p>No time entries recorded. Import a reviewed CSV to compare recorded effort with your task estimates.</p>}</section>
    <p className="pwt-note">Recorded time is user-supplied evidence, not a timer, attendance record, invoice or independent verification. No provider connection or calendar interpretation is inferred. Export before deleting or clearing records you need to keep.</p>
  </section>;
}
