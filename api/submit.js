const crypto = require('crypto');
const { mutate, nextQueue } = require('./_store');

function validEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'')); }
function digits(s){ return /^\d+$/.test(String(s||'')); }
function clean(s, max=500){ return String(s ?? '').trim().slice(0,max); }

module.exports = async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  try {
    const b = req.body || {};
    const required = ['student_or_staff_id','name_th','phone'];
    for (const k of required) if (!clean(b[k])) return res.status(400).json({error:`กรุณากรอก ${k}`});
    if (clean(b.email) && !validEmail(b.email)) return res.status(400).json({error:'รูปแบบอีเมลไม่ถูกต้อง'});
    if (!digits(b.phone) || (clean(b.family_phone) && !digits(b.family_phone))) return res.status(400).json({error:'เบอร์โทรต้องเป็นตัวเลขเท่านั้น'});
    if (clean(b.dob) && !/^\d{4}-\d{2}-\d{2}$/.test(b.dob)) return res.status(400).json({error:'วันเกิดไม่ถูกต้อง'});
    if (clean(b.sex) && !['ชาย','หญิง','ไม่ระบุ'].includes(b.sex)) return res.status(400).json({error:'เพศไม่ถูกต้อง'});
    if (clean(b.blood_group) && !['O','A','B','AB'].includes(b.blood_group)) return res.status(400).json({error:'กรุ๊ปเลือดไม่ถูกต้อง'});
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const value = await mutate(async rows => {
      const queue = nextQueue(rows, now);
      const record = {
        id, queue, submitted_at:now,
        person_type: b.person_type === 'บุคลากร' ? 'บุคลากร' : 'นิสิต',
        student_or_staff_id:clean(b.student_or_staff_id,50), email:clean(b.email,120), national_id:clean(b.national_id,50),
        name_th:clean(b.name_th,150), name_en:clean(b.name_en,150), sex:clean(b.sex,20), dob:clean(b.dob,20),
        faculty:clean(b.faculty,150), faculty_other:clean(b.faculty_other,150), weight_kg:clean(b.weight_kg,20), height_cm:clean(b.height_cm,20), phone:clean(b.phone,30),
        family_name:clean(b.family_name,150), family_phone:clean(b.family_phone,30), family_relation:clean(b.family_relation,30), blood_group:clean(b.blood_group,10),
        chronic_disease:clean(b.chronic_disease,500), drug_allergy:clean(b.drug_allergy,500), food_allergy:clean(b.food_allergy,500), allergy_symptoms:clean(b.allergy_symptoms,500),
        address_idcard:clean(b.address_idcard,800), registration_status:'รอเวชระเบียน', triage_status:'รอ Triage'
      };
      rows.push(record);
      return { rows, value:{id,queue,submitted_at:now} };
    }, `registration ${id}`);
    return res.status(200).json(value);
  } catch(e) {
    console.error(e);
    return res.status(500).json({error:'ไม่สามารถบันทึกข้อมูลได้ กรุณาแจ้งเจ้าหน้าที่'});
  }
};
