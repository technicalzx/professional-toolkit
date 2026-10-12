function number(value, name, minimum = 0) {
  if (value === null || value === undefined || String(value).trim() === '') throw Error(name + ' is required');
  const n = Number(value);
  if (!Number.isFinite(n) || n < minimum) throw Error(name + ' must be finite and at least ' + minimum);
  return n;
}
function round(value, decimals) { return Number(value.toFixed(decimals)); }
function calculate(kind, data) {
  if (kind === 'pricing') {
    const income = number(data.income, 'Target income'), costs = number(data.costs, 'Monthly costs'),
      hours = number(data.hours, 'Billable hours', 0.01), fee = number(data.fee, 'Platform fee');
    if (fee >= 100) throw Error('Platform fee must be below 100%');
    const rate = (income + costs) / hours / (1 - fee / 100);
    if (!Number.isFinite(rate)) throw Error('Result exceeds the supported numeric range');
    return {'Hourly rate': round(rate, 2), Explanation: '(Target income + monthly costs) / billable hours / (1 - fee%). Tax and non-billable time are not included.'};
  }
  if (kind === 'percentage') {
    const earned = number(data.earned, 'Earned marks'), total = number(data.total, 'Total marks', 0.01);
    if (earned > total) throw Error('Earned marks cannot exceed total marks');
    return {Percentage: round(earned / total * 100, 2), Explanation: 'Earned marks / total marks × 100.'};
  }
  if (kind === 'gpa') {
    const scale = number(data.scale, 'GPA scale', 0.01);
    if (!Array.isArray(data.courses) || !data.courses.length) throw Error('Add at least one course');
    let points = 0, credits = 0;
    for (const row of data.courses) {
      const grade = number(row.grade, 'Grade point'), credit = number(row.credits, 'Course credits', 0.01);
      if (grade > scale) throw Error('Grade point exceeds the selected scale');
      points += grade * credit; credits += credit;
    }
    if (!Number.isFinite(points) || !Number.isFinite(credits)) throw Error('Result exceeds the supported numeric range');
    return {GPA: round(points / credits, 3), Explanation: "Sum of grade points × credits / total credits. Use your institution's grade-point mapping."};
  }
  throw Error('Unknown calculator');
}
function audit(data) {
  if (!['LinkedIn','Upwork','Fiverr'].includes(data.platform)) throw Error('Choose LinkedIn, Upwork or Fiverr');
  const fields = {headline:20, summary:25, services:20, evidence:25, cta:10};
  const present = Object.keys(fields).filter(k=>String(data[k] || '').trim());
  if (!present.length) throw Error('Enter profile information');
  const missing = Object.keys(fields).filter(k=>!present.includes(k));
  return {Platform:data.platform, 'Data source':'User-provided', 'Completeness score':present.reduce((n,k)=>n+fields[k],0), Criteria:fields,
    Explanation:'Presence-only rubric; this does not measure quality, ranking, platform performance or ATS compatibility.',
    Strengths:present.map(k=>k[0].toUpperCase()+k.slice(1)+' supplied'),
    'Recommended next steps':missing.map(k=>'Add '+k+': include specific, truthful details relevant to your target clients.')};
}
if (typeof module !== 'undefined') module.exports = {calculate, audit};
