# KU Registration Queue — Vercel prototype

ระบบ 3 หน้าทำงานร่วมกัน

1. `/` — Mobile Registration สำหรับนิสิต/บุคลากร
2. `/records` — Medical Records Dashboard: เรียกดูรายคน, Copy แต่ละ field, Copy ทั้งหมด, เปิด text/plain
3. `/triage` — Triage Dashboard: เรียงตามเวลา Submit และขึ้นแดงเมื่อรอเกิน 30 นาที

## การเก็บข้อมูล

ต้นแบบนี้เก็บข้อมูลใน `data/registrations.csv` ของ GitHub repository และซ่อน/ตัดข้อมูลที่เกิน 24 ชั่วโมงจาก active dataset ในการเขียนครั้งถัดไป

**คำเตือนสำคัญ:** GitHub เก็บ commit history ดังนั้นการเอาแถวออกจาก CSV ไม่ใช่การลบข้อมูลออกจากประวัติ Git ทั้งหมด ห้ามใช้ repository แบบ Public และควรใช้ต้นแบบนี้กับข้อมูลทดสอบก่อน หากใช้ข้อมูลจริงควรย้าย storage ไปฐานข้อมูลที่รองรับ hard-delete/TTL และ audit access ตามนโยบายหน่วยงานและ PDPA

## ติดตั้ง

1. สร้าง GitHub repository ใหม่และตั้งเป็น **Private**
2. Upload โฟลเดอร์นี้ขึ้น repository
3. สร้าง GitHub fine-grained token ที่จำกัดเฉพาะ repository นี้ และให้ Contents read/write เท่าที่จำเป็น
4. Import repository เข้า Vercel
5. ที่ Vercel > Project > Settings > Environment Variables เพิ่มค่าตาม `.env.example`
6. Deploy ใหม่หลังเพิ่มหรือแก้ Environment Variables
7. เปิด `/` เพื่อทดสอบ Submit จากมือถือ
8. เปิด `/records` และ `/triage` ด้วยรหัสที่ตั้งไว้

## Environment Variables

- `GITHUB_TOKEN` — token สำหรับ private repository
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH` — default `main`
- `GITHUB_CSV_PATH` — default `data/registrations.csv`
- `MEDICAL_RECORDS_KEY` — รหัสเข้า Medical Records Dashboard
- `TRIAGE_KEY` — รหัสเข้า Triage Dashboard

อย่าใส่ token หรือ dashboard password ไว้ใน source code

## Queue

เลขคิวเป็น `Q-001`, `Q-002`, ... และเริ่มใหม่ตามวันใน timezone Asia/Bangkok

## 24-hour rule

API แสดงเฉพาะรายการที่ Submit ใน 24 ชั่วโมงล่าสุด และการเขียนครั้งใหม่จะเขียนกลับเฉพาะ active rows อย่างไรก็ตาม commit history ของ GitHub ยังคงเป็นข้อจำกัดด้าน retention

## ก่อนใช้จริง

- ใช้ข้อมูลจำลองทดสอบก่อน
- เพิ่ม authentication ที่ผูกกับบัญชีเจ้าหน้าที่/SSO ถ้ามี
- พิจารณาย้าย storage จาก GitHub CSV ไปฐานข้อมูลที่ทำ hard delete ได้จริง
- กำหนด privacy notice/consent และสิทธิ์เข้าถึงให้ตรงกับนโยบายของมหาวิทยาลัย
- ตรวจสอบว่าการ Copy/Paste เข้าระบบ HIS ไม่ทำให้ format ของวันที่หรือข้อมูลผิดช่อง
