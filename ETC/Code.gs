/**
 * Board Game Catalog - Backend (Google Apps Script)
 * วางโค้ดนี้ใน Extensions > Apps Script ของไฟล์ Google Sheet "Board Game DB"
 * 1) รันฟังก์ชัน setup() ครั้งแรกครั้งเดียว (สร้างแผ่นงาน + แอดมิน)
 * 2) Deploy > New deployment > Web app (Execute as: Me / Who has access: Anyone)
 */

const SHEET_GAMES = 'BoardGames';
const SHEET_ADMIN = 'AdminUsers';
const HEADERS = ['ID', 'Name', 'Category', 'Players', 'Image', 'Status', 'Description'];
const TOKEN_TTL = 6 * 60 * 60; // 6 ชั่วโมง (วินาที)

/* ---------- ติดตั้งครั้งแรก ---------- */
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

/* ---------- Public API (อ่านอย่างเดียว) ---------- */
function doGet() {
  return json_({ ok: true, games: readGames_() });
}

/* ---------- Admin API ---------- */
function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }

  if (req.action === 'login') return login_(req);

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
