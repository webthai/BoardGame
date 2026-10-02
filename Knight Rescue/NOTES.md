# Knight Rescue — NOTES (ไฟล์ช่วยจำ)

ก่อนแก้โค้ดทุกครั้ง: (1) อ่านไฟล์นี้ (2) อ่าน `knight-rescue.html` ล่าสุดจาก Drive — ห้ามเขียนจากความจำ แล้วอัปเดต log ท้ายไฟล์หลังจบแต่ละรอบ

## สถานะ: ครบตามแผนทั้ง 7 รอบ + แก้บั๊ก replay แล้ว
งานต่อไป = แก้บั๊ก/ปรับจูนหลังทดสอบเล่นจริง (ดู "บั๊กที่ค้าง / ข้อจำกัด")

## ไฟล์
- `knight-rescue.html` — เกมปัจจุบัน (Three.js r128 + Bootstrap 5 จาก CDN, ไฟล์เดียว) · `knight-rescue_r1..r4`, `_r5a`, `_r5b`, `_r6`, `_r7` — สำรองรอบเก่า (ผู้ใช้ลบเองได้)
- `NOTES.md` — ไฟล์นี้
- หลังบ้าน: `Board Game/ETC/Code.gs` (**v3**) · `Code_v1_old.gs`, `Code_v2_old.gs` = ของเก่า · `ETC/README.md` = คู่มือติดตั้งทั้งโปรเจกต์ (อัปเดตแล้ว)
- `Board Game/index.html` (แคตตาล็อก) มีปุ่ม "เปิดเกม" สำหรับเกมใน `GAME_LINKS` (Knight Rescue → `Knight Rescue/knight-rescue.html` เทียบกับตำแหน่ง index.html) · `index_v1.html` = สำรอง (ผู้ใช้ลบเอง)

## หลังบ้าน
- Web App URL (ตัวเดียวกับแคตตาล็อก) ฝังที่ `API_URL` ทั้งใน index.html และ knight-rescue.html
- **ติดตั้ง/อัปเดต:** วางโค้ด Code.gs ใน Apps Script ของ Sheet "Board Game DB" → รัน `setup()` และ `krSetup()` (ครั้งแรก) → Deploy > Manage deployments > Edit > **New version**
- GET: `kr_map&size=N` · `kr_items` · `kr_poll&room=XXXX&since=N[&cfg=1]` · ไม่มี action = รายการเกมแคตตาล็อก
- POST สาธารณะ (ไม่ใช้ Token): `krStatus`, `krCreate`, `krJoin`, `krStart`, `krAct` — รันภายใน ScriptLock
- MapConfig (MapSize|TileID|TileType|Value|Description) / ItemCards (ItemID|ItemName|EffectType|Description) แก้ในชีตได้ · EffectType ที่เกมรู้จัก: BlockDanger, BoostWarp, FullHeal, ForceSix
- ถ้าเรียก API ไม่ได้: เล่นเครื่องเดียวได้ต่อ (แผนที่สุ่มในเครื่อง + ไอเทมในโค้ด) · ออนไลน์ต้องมี API
- `krCleanup()` ลบห้องเก่ากว่า 24 ชม. (รันเองหรือตั้ง Trigger รายวัน)

## ออนไลน์ — ออกแบบอย่างไร
- **Action log replay:** ทุกเครื่องเล่น action ชุดเดียวกันตามลำดับเดียวกัน → สถานะตรงกัน เพราะค่าสุ่มทั้งหมดอยู่ใน action
- แผ่น `Rooms` (Code|Status lobby/playing|Config JSON|Players JSON|Created) + แผ่น `R_<CODE>` ต่อห้อง (แถวละ 1 action: A=ลำดับ, B=JSON) · `krAct` ต่อท้ายได้เมื่อ `idx` = จำนวน action ปัจจุบัน ไม่งั้น `stale`
- Config ห้อง = {size, seed, mapSrc, items, map แบบย่อ {n:[type,value]}} (ไม่เก็บ desc)
- ฝั่งเกม: `Q` คิว action + `take(...types)` · `emit(a)` · `pollLoop` (lobby 2 วิ, ตาคนอื่น 1.5 วิ, ตาเรา 4 วิ) · `beginGame(cfg, plist)` → `orderPhase()` → `gameLoop()`
- Action: `orderRoll {i,v}`, `roll {value,r,q,k}`, `useItem {id}`, `duelRoll {s:'a'|'d', v}`, `special {t,d,v}` · UI อนุญาตเฉพาะผู้เล่นของเครื่องนั้น (`mine(i)`) · 1 เครื่อง = 1 อัศวิน (2-4 คน) · เจ้าของห้อง = slot 0
- **Rejoin:** จำ `{room, slot}` ใน localStorage (`kr_room`) → ปุ่ม "กลับเข้าห้อง" → poll `since=0&cfg=1` ได้ config + ล็อกทั้งหมด → ใส่ action เข้าคิว **ก่อน** `beginGame` (สำคัญ: ไม่งั้น `take()` เห็นคิวว่างแล้วปิด `replaying`) → replay เร็ว (`replaying` = true ข้าม sleep/เสียง จนคิวหมด) · ล้างค่าเมื่อมีผู้ชนะ/ห้องหาย
- `krStatus('กำลังเล่น')` ตอนเจ้าของห้องเริ่ม, `'ว่าง'` ตอนมีผู้ชนะ/ปิดหน้า — ผูกกับเกมทั้งเกม ไม่ใช่รายห้อง

## เสียง/ภาพ
- เสียงสังเคราะห์ WebAudio (`beep`, `SFX.*`) ปุ่ม 🔊/🔇 · ต้องมีการคลิกก่อนถึงจะมีเสียง (ข้อจำกัดเบราว์เซอร์)
- เต๋าหมุน (`tumble`), อัศวินกะพริบแดงตอนเสีย HP (`flash`), กล้องสั่นตอนมังกร (`shake`), confetti ตอนชนะ
- ฉาก: ต้นไม้ (`decorate`), เมฆลอย, เจ้าหญิง + มังกรที่ช่องสุดท้าย (`buildGoal`)
- เอฟเฟกต์ภาพ/เสียงสุ่มได้เพราะไม่กระทบสถานะ · ตรรกะเกมห้ามสุ่ม

## บั๊กที่ค้าง / ข้อจำกัด
1. **ยังไม่ได้ทดสอบในเบราว์เซอร์จริงเลยตั้งแต่รอบ 2** (เล่นเครื่องเดียว, ออนไลน์, rejoin, บอร์ด 1000 ช่อง, InstancedMesh `setColorAt` ใน three r128, CORS ของ Apps Script, เสียง) — เริ่มแก้จากอาการที่ผู้ใช้รายงาน
2. โควตา Apps Script: poll ทุก 1.5-4 วิ ต่อเครื่อง — บัญชีทั่วไปมีเวลารันรวมประมาณ 90 นาที/วัน อาจหมดถ้าเล่นหลายชั่วโมง → เพิ่มช่วง poll ได้
3. ถ้าผู้เล่นคนใดปิดหน้าไปตอนถึงตาเขา เกมค้างรอ (แก้ได้ด้วย "กลับเข้าห้อง") · ยังไม่มีระบบตัดผู้เล่น/หมดเวลา
4. สถานะแคตตาล็อก "กำลังเล่น" ผูกทั้งเกม หลายห้องพร้อมกันจะทับกัน
5. โหมดเครื่องเดียว: ปุ่ม "เริ่มเกม" ค้างเป็น "กำลังเชื่อมต่อ..." หลังเริ่ม (ซ่อนอยู่หลังหน้าเกม ไม่กระทบการเล่น)

## หลักการออกแบบ (ห้ามลืม)
1. **สถานะทั้งหมดอยู่ใน `S`** (JSON ล้วน): `turn, over, dragon, size, seed, mapSrc, map, busy, players[]` (i = ช่องผู้เล่น/ตำแหน่งออฟเซ็ต, name, color, look, pos, hp, maxHp, freeze, items[], shield, boost, six) · ส่วน Three.js (`mesh, target, hop`) เป็นแค่ตัวแสดงผล
2. **ห้ามสุ่มใน dispatch/orderPhase/askDuel/askSpecial** — ค่าสุ่มทุกตัวต้องมากับ action
3. ตรรกะเกมแยกจากแอนิเมชัน (`place()`, `walk()`, `jump()`, render loop) · popup (`showPop`) แสดงอย่างเดียว ผลมาจาก action ในคิว
4. กระดาน: `SIZE`/`ZONE` เป็น `let` ตั้งใน `beginGame` · `buildBoard()` InstancedMesh · `tilePos(n)` งูเลื้อย 10 ช่อง/แถว · Checkpoint = n % 10 === 0
5. อัศวิน: `makeKnight(color, look)` · `look` = {skin, hat, weap, shield, cape} (ดัชนีใน `OPTS`) · สีเกราะ = สีสายอาชีพ
6. `hurt(q)` = เสีย HP 1 จุดเดียว (Danger, Duel, มังกร) · HP หมด → `floor(pos/10)*10`, HP = `maxHp`
7. `ITEMS`/`ITEM_IDS` เป็น `let` (โหลดจาก Sheet ได้) · ออนไลน์ใช้ `ITEM_IDS` ตาม config ของห้อง

## กติกาที่ทำแล้ว
- ช่อง: BlackHole ข้าม 1 ตา · Horse วาร์ปไป `value` · NPC `r<.5` ทอยฟรี ไม่งั้นถอยตามแต้มเต๋า · SpecialNPC เลือกเป้า+ทิศแล้วทอยเต๋าพิเศษ (ไม่ส่งใครเกิน SIZE-1) · Danger HP-1 · Treasure ไอเทมสุ่ม (กระเป๋า 3)
- สายอาชีพ: แดง HP 5 · น้ำเงิน ม้า +3 · เขียว NPC ทอยฟรีเสมอ · เหลือง เลขคู่ 20% ฟื้น HP 1
- ไอเทม: โล่ (กัน Danger 1 ครั้ง) · แครอท (ทอยถัดไป +3) · ยา (HP เต็ม) · เต๋าทอง (ทอยถัดไป = 6)
- Duel: หยุดช่องเดียวกับคนอื่น (ไม่ใช่ Checkpoint) · โจมตีชนะ: ผู้ตั้งรับถอย 3 + HP-1 · ผู้ตั้งรับชนะ/เสมอ: ผู้โจมตีถอย 1
- มังกรบุก: มีใครถึง ≥ 80% ของบอร์ด → ทอยหลักได้ 1 → ทุกคนในโซนเสีย HP 1 ก่อนเดิน
- ตัวปรับแต่ง: ผิว 5 · หมวก 4 · อาวุธ 3 · โล่ 2 · ผ้าคลุม 6 · พรีวิว 3D

## Log รอบ
- รอบ 1-4: กระดาน/ทอย/เดิน → ช่องเอฟเฟกต์/HP/Checkpoint → สายอาชีพ/ไอเทม → Duel/NPC พิเศษ/มังกร
- รอบ 5ก: ตัวปรับแต่งอัศวิน + บอร์ด 100/500/1000 · 5ข: Code.gs v2 (MapConfig, ItemCards, krStatus)
- รอบ 6: โหมดออนไลน์ (สร้าง/เข้าร่วมห้อง, lobby, action log), คิว action + `take()`, Code.gs v3, ปุ่ม "เปิดเกม" ใน index.html
- รอบ 7: เสียง, เต๋าหมุน, flash/shake/confetti, ฉาก, rejoin, แก้ `askSpecial` (`arguments.callee`)
- รอบ 7.1: แก้ replay ตอน rejoin (push action ก่อน beginGame), เขียน `ETC/README.md` ใหม่ทั้งหมด

## วิธีแก้ไฟล์ย้อนหลัง
Drive แก้เนื้อหาไฟล์เดิมไม่ได้ → สร้างไฟล์ใหม่ชื่อเดิม แล้วเปลี่ยนชื่อ/ลบไฟล์เก่า
