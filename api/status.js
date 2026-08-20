const { mutate } = require('./_store');
module.exports = async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const {id,role,status}=req.body||{};
  const expected = role==='triage' ? process.env.TRIAGE_KEY : process.env.MEDICAL_RECORDS_KEY;
  if(!req.headers['x-dashboard-key'] || req.headers['x-dashboard-key']!==expected) return res.status(401).json({error:'Unauthorized'});
  try {
    const value=await mutate(async rows=>{
      const r=rows.find(x=>x.id===id); if(!r) throw Object.assign(new Error('Not found'),{statusCode:404});
      if(role==='triage') r.triage_status=String(status||'Triage แล้ว').slice(0,50);
      else r.registration_status=String(status||'บันทึกเวชระเบียนแล้ว').slice(0,50);
      return {rows,value:r};
    },`status ${id}`);
    return res.json(value);
  } catch(e){ if(e.statusCode===404)return res.status(404).json({error:'Not found'}); console.error(e); return res.status(500).json({error:'Update failed'}); }
};
