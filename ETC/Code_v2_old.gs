/**
 * Board Game Catalog + Knight Rescue - Backend (Google Apps Script)  [v2]
 * วางโค้ดนี้ใน Extensions > Apps Script ของไฟล์ Google Sheet "Board Game DB" (แทนที่โค้ดเดิมทั้งหมด)
 * 1) รัน setup()    — แคตตาล็อก (ถ้าเคยรันแล้วข้ามได้ ไม่ทับข้อมูลเดิม)
 * 2) รัน krSetup()  — Knight Rescue: สร้างแผ่น MapConfig + ItemCards และเพิ่มเกมลงแคตตาล็อก
 * 3) Deploy > Manage deployments > Edit > New version  (ถ้าเคย Deploy แล้ว URL เดิมใช้ต่อได้)
 */

const SHEET_GAMES = 'BoardGames';
const SHEET_ADMIN = 'AdminUsers';
const SHEET_MAP   = 'MapConfig';
const SHEET_ITEMS = 'ItemCards';
const HEADERS = ['ID', 'Name', 'Category', 'Players', 'Image', 'Status', 'Description'];
const TOKEN_TTL = 6 * 60 * 60; // 6 ชั่วโมง (วินาที)
const KR_NAME = 'Knight Rescue: มหาสงครามอัศวินช่วยเจ้าหญิง';

/* ---------- ติดตั้งแคตตาล็อก ---------- */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let g = ss.getSheetByName(SHEET_GAMES) || ss.insertSheet(SHEET_GAMES);
  if (g.getLastRow() === 0) {
    g.appendRow(HEADERS);
    g.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#e8f0fe');
    g.setFrozenRows(1);
    const samples = [
      ['BG001', 'Avalon', 'บลัฟ', '5-10 คน', '', 'ว่าง', 'เกมซ่อนตัวตน ฝ่ายดีต้องทำภารกิจให้สำเร็จ ส่วนฝ่ายร้ายต้องก่อกวนโดยไม่ให้ใครจับได้'],
      ['BG002', 'Splendor', 'วางแผนกลยุทธ์', '2-4 คน', '', 'ว่าง', 'สะสมอัญมณีเพื่อซื้อการ์ด สร้างเครื่องจักรเศรษฐกิจ และดึงดูดขุนนางให้ได้แต้มชนะ'],
      ['BG003', 'Codenames', 'ปาร์ตี้', '4-8 คน', '', 'ว่าง', 'สองทีมแข่งกันหาคำลับบนโต๊ะ โดยหัวหน้าทีมให้คำใบ้สั้นๆ คำเดียว'],
      ['BG004', 'Catan', 'วางแผนกลยุทธ์', '3-4 คน', '', 'กำลังเล่น', 'ทอยลูกเต๋าเก็บทรัพยากร ค้าขายกับเพื่อน แล้วสร้างถนนและเมืองให้ถึง 10 แต้มก่อน']
    ];
    g.getRange(2, 1, samples.length, HEADERS.length).setValues(samples);
  }

  let a = ss.getSheetByName(SHEET_ADMIN) || ss.insertSheet(SHEET_ADMIN);
  if (a.getLastRow() === 0) {
    a.getRange('A:B').setNumberFormat('@');
    a.appendRow(['Username', 'Password']);
    a.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#fce8e6');
    a.appendRow(['meen', hash_('5340')]); // เก็บเป็น SHA-256 ไม่เก็บรหัสตรงๆ
    a.setFrozenRows(1);
  }

  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('ชีต1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 2) ss.deleteSheet(def);
}

/* ---------- ติดตั้ง Knight Rescue ---------- */
const KR_DESC = {
  BlackHole: 'หลุมดำ! ต้องข้ามตาถัดไป', Horse: 'ม้าศึก! วิ่งไปข้างหน้า', NPC: 'พบ NPC ผู้เดินทาง',
  SpecialNPC: 'NPC พิเศษ! เลือกอัศวินที่จะปั่นป่วน', Danger: 'อันตราย! เสียพลังชีวิต 1 ดวง',
  Treasure: 'พบหีบสมบัติ!', Checkpoint: 'จุดแวะพัก ปลอดภัย'
};

function mulberry_(a) {  // ตัวสุ่มแบบ seed (ชุดเดียวกับฝั่งเกม)
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function krSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1) เพิ่มเกมลงแคตตาล็อก (ถ้ายังไม่มี)
  const g = ss.getSheetByName(SHEET_GAMES);
  if (!readGames_().some(x => x.name === KR_NAME)) {
    let max = 0;
    readGames_().forEach(x => { const n = parseInt(x.id.replace(/\D/g, ''), 10); if (n > max) max = n; });
    g.appendRow(['BG' + ('000' + (max + 1)).slice(-3), KR_NAME, 'Casual Adventure - Roll & Move', '4 คน', '', 'ว่าง',
      'บอร์ดเกม 3D ทอยเต๋าพาอัศวินฝ่าด่านช่วยเจ้าหญิง เลือกบอร์ด 100 / 500 / 1,000 ช่อง']);
  }

  // 2) MapConfig — ไม่ทับถ้ามีข้อมูลแล้ว (แก้ในชีตได้เอง)
  let m = ss.getSheetByName(SHEET_MAP) || ss.insertSheet(SHEET_MAP);
  if (m.getLastRow() === 0) {
    const rows = [['MapSize', 'TileID', 'TileType', 'Value', 'Description']];
    [[100, 1001], [500, 5001], [1000, 10001]].forEach(([size, seed]) => {
      const r = mulberry_(seed);
      for (let n = 2; n < size; n++) {
        if (n % 10 === 0) { rows.push([size, n, 'Checkpoint', '', KR_DESC.Checkpoint]); continue; }
        const x = r();
        const ty = x < .05 ? 'BlackHole' : x < .12 ? 'Horse' : x < .20 ? 'NPC' : x < .23 ? 'SpecialNPC' : x < .35 ? 'Danger' : x < .41 ? 'Treasure' : null;
        if (!ty) continue;
        const val = ty === 'Horse' ? Math.min(size - 1, n + 4 + Math.floor(r() * 6)) : '';
        rows.push([size, n, ty, val, KR_DESC[ty]]);
      }
    });
    m.getRange(1, 1, rows.length, 5).setValues(rows);
    m.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#e6f4ea');
    m.setFrozenRows(1);
  }

  // 3) ItemCards
  let it = ss.getSheetByName(SHEET_ITEMS) || ss.insertSheet(SHEET_ITEMS);
  if (it.getLastRow() === 0) {
    it.getRange(1, 1, 5, 4).setValues([
      ['ItemID', 'ItemName', 'EffectType', 'Description'],
      ['IT001', 'โล่ศักดิ์สิทธิ์', 'BlockDanger', 'กันความเสียหายจากช่องอันตราย 1 ครั้ง'],
      ['IT002', 'แครอทวิเศษ', 'BoostWarp', 'ทอยครั้งถัดไปเดินเพิ่ม +3 ช่อง'],
      ['IT003', 'ยาเพิ่มพลัง', 'FullHeal', 'ฟื้น HP เต็ม'],
      ['IT004', 'เต๋าทอง', 'ForceSix', 'ทอยครั้งถัดไปได้ 6 แน่นอน']
    ]);
    it.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#fff4e5');
    it.setFrozenRows(1);
  }
}

/* ---------- Public API (อ่านอย่างเดียว) ---------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'kr_map')   return json_(krMap_(parseInt(p.size, 10)));
  if (p.action === 'kr_items') return json_(krItems_());
  return json_({ ok: true, games: readGames_() });
}

function krMap_(size) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MAP);
  if (!sh || sh.getLastRow() < 2) return { ok: false, error: 'no_map' };
  const map = {};
  sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().forEach(r => {
    if (Number(r[0]) !== size || r[2] === 'Checkpoint' || r[2] === 'Normal' || !r[2]) return;
    map[Number(r[1])] = { type: String(r[2]), value: Number(r[3]) || 0, desc: String(r[4] || '') };
  });
  return { ok: true, size: size, map: map };
}

function krItems_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ITEMS);
  if (!sh || sh.getLastRow() < 2) return { ok: false, error: 'no_items' };
  const items = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues()
    .filter(r => r[0] !== '').map(r => ({ id: String(r[0]), name: String(r[1]), effect: String(r[2]), desc: String(r[3]) }));
  return { ok: true, items: items };
}

/* ---------- API ที่เขียนข้อมูล ---------- */
function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }

  if (req.action === 'login') return login_(req);
  if (req.action === 'krStatus') return json_(krStatus_(req.status)); // เกมเปลี่ยนสถานะห้องของตัวเองได้ (ไม่ต้องใช้ Token)

  // ต่อจากนี้ต้องมี Token แอดมินเท่านั้น
  const cache = CacheService.getScriptCache();
  if (!req.token || !cache.get('tok_' + req.token)) return json_({ ok: false, error: 'unauthorized' });

  if (req.action === 'logout') { cache.remove('tok_' + req.token); return json_({ ok: true }); }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    switch (req.action) {
      case 'setStatus': return json_(setStatus_(req.id, req.status));
      case 'save':      return json_(saveGame_(req.game));
      case 'delete':    return json_(deleteGame_(req.id));
      default:          return json_({ ok: false, error: 'unknown_action' });
    }
  } finally {
    lock.releaseLock();
  }
}

// สาธารณะ แต่แก้ได้เฉพาะแถวของ Knight Rescue และเฉพาะค่า ว่าง/กำลังเล่น
function krStatus_(status) {
  const kr = readGames_().filter(x => x.name === KR_NAME)[0];
  if (!kr) return { ok: false, error: 'not_found' };
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return setStatus_(kr.id, status); } finally { lock.releaseLock(); }
}

/* ---------- Auth ---------- */
function login_(req) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ADMIN);
  const rows = sh.getDataRange().getValues().slice(1);
  const h = hash_(String(req.password || ''));
  const found = rows.some(r => String(r[0]) === String(req.username) && String(r[1]) === h);
  if (!found) return json_({ ok: false, error: 'invalid' });
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('tok_' + token, '1', TOKEN_TTL);
  return json_({ ok: true, token: token });
}

function hash_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

/* ---------- Data ---------- */
function gamesSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_GAMES);
}

function readGames_() {
  const sh = gamesSheet_();
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues()
    .filter(r => r[0] !== '')
    .map(r => ({
      id: String(r[0]), name: String(r[1]), category: String(r[2]), players: String(r[3]),
      image: String(r[4]), status: String(r[5]) || 'ว่าง', description: String(r[6])
    }));
}

function findRow_(id) {
  const sh = gamesSheet_();
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => String(r[0]));
  const i = ids.indexOf(String(id));
  return i < 1 ? -1 : i + 1; // เลขแถวใน Sheet (ข้ามหัวตาราง)
}

function setStatus_(id, status) {
  if (status !== 'ว่าง' && status !== 'กำลังเล่น') return { ok: false, error: 'bad_status' };
  const row = findRow_(id);
  if (row < 0) return { ok: false, error: 'not_found' };
  gamesSheet_().getRange(row, 6).setValue(status);
  return { ok: true };
}

function saveGame_(g) {
  if (!g || !String(g.name || '').trim()) return { ok: false, error: 'name_required' };
  const sh = gamesSheet_();
  const status = g.status === 'กำลังเล่น' ? 'กำลังเล่น' : 'ว่าง';
  const values = [String(g.name).trim(), g.category || '', g.players || '', g.image || '', status, g.description || ''];

  if (g.id) {
    const row = findRow_(g.id);
    if (row < 0) return { ok: false, error: 'not_found' };
    sh.getRange(row, 2, 1, 6).setValues([values]);
    return { ok: true, id: g.id };
  }
  let max = 0;
  readGames_().forEach(x => { const n = parseInt(x.id.replace(/\D/g, ''), 10); if (n > max) max = n; });
  const newId = 'BG' + ('000' + (max + 1)).slice(-3);
  sh.appendRow([newId].concat(values));
  return { ok: true, id: newId };
}

function deleteGame_(id) {
  const row = findRow_(id);
  if (row < 0) return { ok: false, error: 'not_found' };
  gamesSheet_().deleteRow(row);
  return { ok: true };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
