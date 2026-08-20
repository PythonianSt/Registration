const { readAll, activeOnly } = require('./_store');
function allowed(req, role){
  const key = req.headers['x-dashboard-key'];
  return key && key === (role==='records' ? process.env.MEDICAL_RECORDS_KEY : process.env.TRIAGE_KEY);
}
module.exports = async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  const role = req.query.role === 'triage' ? 'triage' : 'records';
  if (!allowed(req,role)) return res.status(401).json({error:'Unauthorized'});
  try {
    const {rows}=await readAll();
    const out=activeOnly(rows).sort((a,b)=>Date.parse(a.submitted_at)-Date.parse(b.submitted_at));
    return res.json(out);
  } catch(e){ console.error(e); return res.status(500).json({error:'Read failed'}); }
};
