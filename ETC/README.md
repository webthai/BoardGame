# Board Game — คลังบอร์ดเกม + Knight Rescue

HTML + Bootstrap 5 + Three.js (เกม 3D) + Google Sheets + Google Apps Script

## ไฟล์ในโฟลเดอร์ Board Game
- `index.html` — แคตตาล็อกบอร์ดเกม (หน้าร้าน + หลังบ้านแอดมิน ปุ่มกุญแจเล็กๆ มุมขวาบน)
- `Board Game DB` — Google Sheet ฐานข้อมูล
- `Knight Rescue/knight-rescue.html` — เกม Knight Rescue (3D, เล่นเครื่องเดียวหรือออนไลน์) · `Knight Rescue/NOTES.md` — บันทึกการออกแบบ/บั๊ก/แผนต่อ (อ่านก่อนแก้โค้ด)
- `ETC/Code.gs` — โค้ด Apps Script (v3) · `ETC/README.md` — ไฟล์นี้

## ติดตั้ง (ครั้งแรก)
1. เปิด Google Sheet **Board Game DB** → **Extensions > Apps Script**
2. คัดลอกโค้ดจาก `ETC/Code.gs` ไปวางแทนที่ทั้งหมด → บันทึก
3. เลือกฟังก์ชัน `setup` กด **Run** (อนุญาตสิทธิ์) — สร้างแผ่น BoardGames + AdminUsers
4. เลือกฟังก์ชัน `krSetup` กด **Run** — สร้างแผ่น MapConfig + ItemCards และเพิ่มเกม Knight Rescue ลงแคตตาล็อก
5. **Deploy > New deployment > Web app** (Execute as: **Me** / Who has access: **Anyone**) → คัดลอก Web app URL
6. ใส่ URL ที่ `const API_URL` ใน `index.html` และ `Knight Rescue/knight-rescue.html` (ตอนนี้ใส่ไว้แล้ว)
7. เปิด `index.html` ในเบราว์เซอร์ หรืออัปขึ้น GitHub Pages (ให้โฟลเดอร์ `Knight Rescue` อยู่ข้าง `index.html`)

**อัปเดตโค้ดภายหลัง:** วาง Code.gs ใหม่ → Deploy > Manage deployments > Edit > **New version** (URL เดิมใช้ต่อได้)

## แคตตาล็อก
- ผู้ใช้ทั่วไป: ดูการ์ดเกม คลิกดูรายละเอียด กด "เลือกเล่นเกมนี้" (เก็บในหน้าเว็บ ไม่แก้ข้อมูล) เกมที่มีลิงก์จะมีปุ่ม "เปิดเกม"
- แอดมิน: กดปุ่มกุญแจ → ล็อกอิน → สลับสถานะ ว่าง/กำลังเล่น, เพิ่ม, แก้ไข, ลบเกม
- รหัสผ่านใน Sheet เก็บเป็น SHA-256 · คำสั่งแก้ไขต้องแนบ Token (หมดอายุ 6 ชั่วโมง)
- เพิ่มลิงก์เปิดเกมอื่น: แก้ `GAME_LINKS` ใน `index.html`

## Knight Rescue
- โหมด: **เล่นเครื่องเดียว** (2-4 คนสลับกันกด) / **สร้างห้องออนไลน์** (ได้รหัส 4 ตัวอักษร) / **เข้าร่วมห้อง** (เครื่องละ 1 อัศวิน 2-4 คน) · รีเฟรชกลางเกมออนไลน์ → กด "กลับเข้าห้อง"
- บอร์ด 100 / 500 / 1,000 ช่อง · สายอาชีพตามสีเกราะ · ปรับแต่งหน้าตาอัศวินได้ · ไอเทม · Knight Duel · NPC พิเศษ · มังกรบุก
- แก้แผนที่และไอเทมได้ในชีต `MapConfig` / `ItemCards` (ผู้เล่นเห็นเมื่อเริ่มเกมใหม่)
- ห้องออนไลน์เก็บในแผ่น `Rooms` และ `R_<รหัส>` — รัน `krCleanup()` (หรือตั้ง Trigger รายวัน) เพื่อลบห้องที่เก่ากว่า 24 ชม.
- ข้อจำกัด: Apps Script มีโควตาเวลารันต่อวัน เล่นออนไลน์ต่อเนื่องหลายชั่วโมงอาจเต็ม · ถ้าผู้เล่นปิดหน้าไปตอนถึงตา เกมจะรอ (ใช้ "กลับเข้าห้อง")

## โครงสร้าง Sheet
- **BoardGames**: ID | Name | Category | Players | Image | Status | Description
- **AdminUsers**: Username | Password (SHA-256)
- **MapConfig**: MapSize | TileID | TileType | Value | Description
- **ItemCards**: ItemID | ItemName | EffectType | Description
- **Rooms**, **R_<รหัส>**: ห้องออนไลน์ (สร้างอัตโนมัติ)
