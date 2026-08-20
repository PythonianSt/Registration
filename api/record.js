const { readAll, activeOnly } = require('./_store');
module.exports = async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  const key=req.headers['x-dashboard-key'];
  if (!key || key !== process.env.MEDICAL_RECORDS_KEY) return res.status(401).json({error:'Unauthorized'});
  try {
    const {rows}=await readAll();
    const r=activeOnly(rows).find(x=>x.id===req.query.id);
    if(!r) return res.status(404).json({error:'Not found'});
    return res.json(r);
  } catch(e){ console.error(e); return res.status(500).json({error:'Read failed'}); }
};
