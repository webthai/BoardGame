# Board Game Catalog

ระบบคลังบอร์ดเกม — HTML + Bootstrap 5 + Google Sheets + Google Apps Script

## ไฟล์ในโฟลเดอร์ Board Game
- `index.html` — หน้าเว็บ (หน้าร้าน + หลังบ้านแอดมิน)
- `Board Game DB` — Google Sheet ฐานข้อมูล
- `ETC/Code.gs` — โค้ด Apps Script
- `ETC/README.md` — ไฟล์นี้

## วิธีติดตั้ง
1. เปิด Google Sheet **Board Game DB** → เมนู **Extensions > Apps Script**
2. คัดลอกโค้ดจาก `ETC/Code.gs` ไปวางแทนที่โค้ดเดิม แล้วกดบันทึก
3. เลือกฟังก์ชัน `setup` แล้วกด **Run** (อนุญาตสิทธิ์ครั้งแรก) — จะสร้างแผ่นงาน `BoardGames` และ `AdminUsers` พร้อมเกมตัวอย่างและบัญชีแอดมิน
4. **Deploy > New deployment > Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - คัดลอก **Web app URL**
5. เปิด `index.html` แก้บรรทัด `const API_URL = '...'` ใส่ URL ที่ได้
6. เปิด `index.html` ในเบราว์เซอร์ หรืออัปขึ้น GitHub Pages / โฮสต์ใดก็ได้

> ทุกครั้งที่แก้ `Code.gs` ต้อง Deploy > Manage deployments > Edit > New version

## แอดมิน
- กดปุ่มรูปกุญแจเล็กๆ มุมขวาบน แล้วล็อกอิน
- รหัสผ่านใน Sheet เก็บเป็น SHA-256 (ไม่ใช่ข้อความตรงๆ) ถ้าจะเพิ่ม/เปลี่ยนรหัสต้องใส่ค่า hash ลงคอลัมน์ Password
- แอดมินทำได้: สลับสถานะ ว่าง/กำลังเล่น, เพิ่ม, แก้ไข, ลบเกม

## โครงสร้าง Sheet
**BoardGames**: ID | Name | Category | Players | Image | Status | Description
**AdminUsers**: Username | Password (SHA-256)

## ความปลอดภัย
- ผู้ใช้ทั่วไปอ่านข้อมูลได้อย่างเดียว (`doGet`)
- คำสั่งแก้ไขทั้งหมดต้องแนบ Token ที่ได้จากการล็อกอิน (หมดอายุใน 6 ชั่วโมง)
