const HEADERS = [
  'id','queue','submitted_at','person_type','student_or_staff_id','email','national_id',
  'name_th','name_en','sex','dob','faculty','faculty_other','weight_kg','height_cm','phone',
  'family_name','family_phone','family_relation','blood_group','chronic_disease','drug_allergy',
  'food_allergy','allergy_symptoms','address_idcard','registration_status','triage_status'
];

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function cfg() {
  return {
    token: requiredEnv('GITHUB_TOKEN'),
    owner: requiredEnv('GITHUB_OWNER'),
    repo: requiredEnv('GITHUB_REPO'),
    branch: process.env.GITHUB_BRANCH || 'main',
    path: process.env.GITHUB_CSV_PATH || 'data/registrations.csv'
  };
}

function escapeCsv(value='') {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  const lines = [HEADERS.map(escapeCsv).join(',')];
  for (const r of rows) lines.push(HEADERS.map(h => escapeCsv(r[h] ?? '')).join(','));
  return '\ufeff' + lines.join('\n') + '\n';
}

function parseCsv(text) {
  text = text.replace(/^\ufeff/, '');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i+1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else {
      if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
      else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const hdr = rows.shift();
  return rows.filter(r => r.some(x => x !== '')).map(cols => Object.fromEntries(hdr.map((h,i)=>[h, cols[i] ?? ''])));
}

function activeOnly(rows) {
  const cutoff = Date.now() - 24*60*60*1000;
  return rows.filter(r => {
    const t = Date.parse(r.submitted_at);
    return Number.isFinite(t) && t >= cutoff;
  });
}

async function gh(path, options={}) {
  const c = cfg();
  const url = `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(c.branch)}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Accept':'application/vnd.github+json',
      'Authorization':`Bearer ${c.token}`,
      'X-GitHub-Api-Version':'2022-11-28',
      'User-Agent':'ku-registration-vercel',
      ...(options.headers || {})
    }
  });
  return res;
}

async function readAll() {
  const c = cfg();
  const res = await gh(c.path);
  if (res.status === 404) return { rows: [], sha: null };
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  const text = Buffer.from(body.content || '', 'base64').toString('utf8');
  return { rows: parseCsv(text), sha: body.sha };
}

async function writeAll(rows, sha, message) {
  const c = cfg();
  const content = Buffer.from(toCsv(rows), 'utf8').toString('base64');
  const res = await gh(c.path, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ message, content, branch:c.branch, ...(sha ? {sha} : {}) })
  });
  if (!res.ok) {
    const err = new Error(`GitHub write failed: ${res.status} ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function mutate(mutator, message) {
  let last;
  for (let attempt=0; attempt<4; attempt++) {
    try {
      const {rows, sha} = await readAll();
      const active = activeOnly(rows);
      const result = await mutator(active);
      await writeAll(result.rows, sha, message);
      return result.value;
    } catch (e) {
      last = e;
      if (![409,422].includes(e.status)) throw e;
      await new Promise(r => setTimeout(r, 150*(attempt+1)));
    }
  }
  throw last;
}

function bangkokDate(iso) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date(iso));
}

function nextQueue(rows, nowIso) {
  const day = bangkokDate(nowIso);
  let max = 0;
  for (const r of rows) {
    if (bangkokDate(r.submitted_at) === day) {
      const m = String(r.queue||'').match(/(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  return `Q-${String(max+1).padStart(3,'0')}`;
}

module.exports = { HEADERS, readAll, writeAll, mutate, activeOnly, nextQueue };
