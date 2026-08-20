const { readAll, activeOnly, HEADERS } = require('./_store');
const LABELS={id:'ID',queue:'เลขคิว',submitted_at:'เวลาส่ง',person_type:'ประเภท',student_or_staff_id:'รหัสนิสิต/บุคลากร',email:'อีเมลติดต่อ',national_id:'เลขบัตรประชาชน',name_th:'ชื่อ-นามสกุล',name_en:'ชื่อ-นามสกุลภาษาอังกฤษ',sex:'เพศ',dob:'วันเดือนปีเกิด',faculty:'คณะ',faculty_other:'คณะอื่นๆ',weight_kg:'น้ำหนัก (กก.)',height_cm:'ส่วนสูง (ซม.)',phone:'เบอร์โทร',family_name:'ชื่อผู้ปกครอง/คนในครอบครัว',family_phone:'เบอร์โทรผู้ปกครอง/คนในครอบครัว',family_relation:'ความสัมพันธ์',blood_group:'กรุ๊ปเลือด',chronic_disease:'โรคประจำตัว',drug_allergy:'แพ้ยา',food_allergy:'แพ้อาหาร',allergy_symptoms:'อาการแพ้',address_idcard:'ที่อยู่ตามบัตรประชาชน',registration_status:'สถานะเวชระเบียน',triage_status:'สถานะ Triage'};
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const key=req.query.key||req.headers['x-dashboard-key'];
  if(!key || key!==process.env.MEDICAL_RECORDS_KEY) return res.status(401).send('Unauthorized');
  try{
    const {rows}=await readAll(); const r=activeOnly(rows).find(x=>x.id===req.query.id); if(!r)return res.status(404).send('Not found');
    const text=HEADERS.filter(h=>!['id'].includes(h)).map(h=>`${LABELS[h]||h}: ${r[h]||'-'}`).join('\n');
    res.setHeader('Content-Type','text/plain; charset=utf-8');
    res.setHeader('Content-Disposition',`inline; filename="${r.queue || 'record'}.txt"`);
    return res.send(text);
  }catch(e){console.error(e);return res.status(500).send('Read failed');}
};
