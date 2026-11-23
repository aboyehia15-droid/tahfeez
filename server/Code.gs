/**
 * خادم «منصة متابعة الحلقات» — Google Sheets + Apps Script
 * جمعية تعلم للقرآن وعلومه (فرع الخبر والدمام) — مجمع ابن تيمية القرآني
 *
 * طريقة التركيب (مرة واحدة):
 * 1) أنشئ Google Sheet جديداً (يفضل من حساب المجمع) ثم: الإضافات ← Apps Script
 * 2) الصق هذا الملف كاملاً مكان Code.gs واحفظ
 * 3) شغّل الدالة setup مرة واحدة ووافق على الصلاحيات
 * 4) نشر ← نشر جديد ← تطبيق ويب: التنفيذ بصفتي، الوصول: أي شخص
 * 5) انسخ رابط الويب (ينتهي بـ /exec) والصقه في التطبيق: الإعدادات ← الربط بالخادم
 *
 * عند تحديث هذا الملف لاحقاً: نشر ← إدارة عمليات النشر ← تعديل ← إصدار جديد (حتى لا يتغير الرابط)
 * (أو ضع server/Loader.gs في المحرر بدلاً من هذا الملف ليتحدث الخادم تلقائياً من GitHub كل 10 دقائق)
 */

var TABLES = {
  students: ['id', 'name', 'status', 'classId', 'guardianName', 'guardianPhone', 'updatedAt', 'json'],
  classes:  ['id', 'name', 'teacherId', 'track', 'updatedAt', 'json'],
  users:    ['id', 'name', 'username', 'role', 'active', 'updatedAt', 'json'],
  records:  ['id', 'studentId', 'classId', 'date', 'updatedAt', 'json'],
  payments: ['id', 'studentId', 'date', 'amount', 'updatedAt', 'json'],
  invites:  ['id', 'phone', 'name', 'sentAt', 'updatedAt', 'json'],
  exams:    ['id', 'title', 'kind', 'date', 'updatedAt', 'json'],
  results:  ['id', 'examId', 'studentId', 'classId', 'date', 'updatedAt', 'json'],
  settings: ['id', 'updatedAt', 'json'],
  outbox:   ['id', 'by', 'studentId', 'status', 'createdAt', 'updatedAt', 'json'] // رسائل المعلمين المحوّلة للإدارة لترسلها من واتسابها
};
var SECRET_FIELDS = ['passHash', 'loginKey'];

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABLES).forEach(function (t) { sheet_(t); });
  var s1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('ورقة1');
  if (s1 && ss.getSheets().length > 1) { try { ss.deleteSheet(s1); } catch (e) {} }
  receiptsFolder_(); // لطلب صلاحية Google Drive لحفظ إيصالات الرسوم
  return 'تم التجهيز';
}

function subFolder_(name) {
  var props = PropertiesService.getScriptProperties(); var key = 'FOLDER_' + name;
  var id = props.getProperty(key);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder({ media: 'تسجيلات التسميع والاختبارات', sheets: 'أوراق إجابات الاختبارات' }[name] || name);
  props.setProperty(key, f.getId()); return f;
}

function receiptsFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('RECEIPTS_FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('إيصالات رسوم الحلقات — منصة متابعة الحلقات');
  props.setProperty('RECEIPTS_FOLDER', f.getId());
  return f;
}

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, TABLES[name].length).setValues([TABLES[name]]).setFontWeight('bold').setBackground('#0f5c55').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
  }
  return sh;
}

function readAll_(name) {
  var sh = sheet_(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var cols = TABLES[name];
  var ji = cols.indexOf('json');
  var vals = sh.getRange(2, 1, last - 1, cols.length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var raw = vals[i][ji];
    if (!raw) continue;
    try { var o = JSON.parse(raw); o._row = i + 2; out.push(o); } catch (e) {}
  }
  return out;
}

function upsert_(name, rows) {
  var sh = sheet_(name);
  var cols = TABLES[name];
  var last = sh.getLastRow();
  var ids = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  var appends = [];
  rows.forEach(function (o) {
    if (!o || !o.id) return;
    delete o._row;
    if (!o.updatedAt) o.updatedAt = Date.now();
    var line = cols.map(function (c) {
      if (c === 'json') return JSON.stringify(o);
      var v = o[c];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    });
    var idx = ids.indexOf(String(o.id));
    if (idx >= 0) sh.getRange(idx + 2, 1, 1, cols.length).setValues([line]);
    else { appends.push(line); ids.push(String(o.id)); }
  });
  if (appends.length) sh.getRange(sh.getLastRow() + 1, 1, appends.length, cols.length).setValues(appends);
}

function stripSecrets_(list) {
  return list.map(function (o) {
    var c = {}; for (var k in o) if (SECRET_FIELDS.indexOf(k) < 0 && k !== '_row') c[k] = o[k]; return c;
  });
}

function pwNorm_(v) { return String(v == null ? '' : v).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/\s+/g, '').toLowerCase(); }
function hash_(s) {
  var salt = PropertiesService.getScriptProperties().getProperty('SALT');
  if (!salt) { salt = Utilities.getUuid(); PropertiesService.getScriptProperties().setProperty('SALT', salt); }
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + s, Utilities.Charset.UTF_8);
  return b.map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join('');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var sheetOk = false, err = '';
  try { var ss = SpreadsheetApp.getActiveSpreadsheet(); sheetOk = !!ss; if (!ss) err = 'الكود ليس داخل الجدول: افتحه من الجدول ← الإضافات ← Apps Script'; }
  catch (x) { err = 'لم تُمنح الصلاحيات: شغّل الدالة setup ووافق على الصلاحيات ثم انشر إصداراً جديداً'; }
  return json_({ ok: true, app: 'tahfeez', sheet: sheetOk, error: err, time: Date.now() });
}

function doPost(e) {
  var req = {};
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'طلب غير صالح' }); }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    return json_(route_(req));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function settings_() {
  var s = readAll_('settings').filter(function (x) { return x.id === 'main'; })[0];
  return s || { id: 'main' };
}

function session_(token) {
  if (!token) return null;
  var uid = PropertiesService.getScriptProperties().getProperty('S_' + token);
  if (!uid) return null;
  var u = readAll_('users').filter(function (x) { return x.id === uid && x.active !== false; })[0];
  return u || null;
}

function route_(r) {
  var a = r.action;

  // ——— عام (بدون دخول) ———
  if (a === 'ping') return { ok: true, hasUsers: readAll_('users').length > 0 };

  if (a === 'bootstrap') { // إنشاء أول مدير ونقل البيانات المحلية
    if (readAll_('users').length > 0) return { ok: false, error: 'يوجد مستخدمون مسبقاً، سجّل الدخول' };
    var admin = r.admin;
    admin.passHash = hash_(admin.password); delete admin.password;
    admin.role = 'admin'; admin.active = true;
    upsert_('users', [admin]);
    if (r.data) Object.keys(r.data).forEach(function (t) {
      if (TABLES[t] && t !== 'users' && r.data[t] && r.data[t].length) upsert_(t, r.data[t]);
    });
    var tok = Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty('S_' + tok, admin.id);
    return { ok: true, token: tok, user: stripSecrets_([admin])[0] };
  }

  if (a === 'login') {
    // يقبل الأرقام العربية (٠١٢) والفارسية، والمسافات، والأحرف الكبيرة والصغيرة، ورقم الجوال بصيغة 966 أو +966
    var nd = function (v) { return String(v == null ? '' : v).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/\s+/g, '').toLowerCase(); };
    var nu = function (v) { v = nd(v); if (/^\+?9665\d{8}$/.test(v)) v = '0' + v.replace(/^\+?966/, ''); if (/^5\d{8}$/.test(v)) v = '0' + v; return v; };
    var want = nu(r.username);
    var users = readAll_('users').filter(function (x) { return x.active !== false && x.username; });
    var u = users.filter(function (x) { return nu(x.username) === want; })[0];
    if (!u) return { ok: false, error: 'اسم المستخدم غير موجود — تأكد منه أو اطلبه من الإدارة' };
    var pw = String(r.password == null ? '' : r.password);
    if (u.passHash !== hash_(pw) && u.passHash !== hash_(nd(pw)) && u.passHash !== hash_(pw.trim())) return { ok: false, error: 'كلمة المرور غير صحيحة' };
    var t = Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty('S_' + t, u.id);
    return { ok: true, token: t, user: stripSecrets_([u])[0] };
  }

  if (a === 'keyLogin') { // الدخول المباشر برابط شخصي للمعلم
    var k = String(r.k || '').trim();
    var uk = k.length >= 16 ? readAll_('users').filter(function (x) { return x.loginKey && x.loginKey === k && x.active !== false; })[0] : null;
    if (!uk) return { ok: false, error: 'رابط الدخول غير صالح أو تم تجديده — اطلب رابطاً جديداً من الإدارة' };
    var tk2 = Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty('S_' + tk2, uk.id);
    return { ok: true, token: tk2, user: stripSecrets_([uk])[0] };
  }

  if (a === 'regInfo') {
    var st = settings_();
    return { ok: true, settings: publicSettings_(st), classes: readAll_('classes').map(function (c) { return { id: c.id, name: c.name, track: c.track }; }) };
  }

  if (a === 'register') {
    var st2 = settings_();
    if (st2.regClosed) return { ok: false, error: 'التسجيل مغلق حالياً' };
    var f = r.student || {};
    if (!f.name || !f.guardianPhone) return { ok: false, error: 'الاسم وجوال ولي الأمر مطلوبان' };
    var REQ = { name: 'اسم الطالب', idNumber: 'السجل المدني', nationality: 'الجنسية', birthDate: 'تاريخ الميلاد', guardianName: 'اسم ولي الأمر', guardianId: 'هوية ولي الأمر', guardianPhone: 'جوال ولي الأمر', phone2: 'الجوال الآخر', relation: 'صلة القرابة', work: 'جهة العمل', background: 'الخلفية السابقة', health: 'الحالة الصحية' };
    for (var rk in REQ) if (!String(f[rk] == null ? '' : f[rk]).trim()) return { ok: false, error: 'الخانة مطلوبة: ' + REQ[rk] };
    var dup = readAll_('students').filter(function (x) { return x.idNumber && f.idNumber && String(x.idNumber) === String(f.idNumber); })[0];
    if (dup) return { ok: false, error: 'هذا الطالب مسجل مسبقاً (رقم السجل مكرر)' };
    f.id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    f.status = 'pending';
    f.source = 'form';
    f.parentToken = Utilities.getUuid().replace(/-/g, '').slice(0, 20);
    f.createdAt = Date.now(); f.updatedAt = Date.now();
    upsert_('students', [f]);
    return { ok: true, id: f.id };
  }

  if (a === 'parent') { // صفحة الطالب لولي الأمر
    var stu = readAll_('students').filter(function (x) { return x.parentToken && x.parentToken === r.t; })[0];
    if (!stu) return { ok: false, error: 'الرابط غير صحيح أو منتهي' };
    var cls = readAll_('classes').filter(function (c) { return c.id === stu.classId; })[0] || null;
    var users = readAll_('users');
    var teacher = cls ? users.filter(function (u) { return u.id === cls.teacherId; })[0] : null;
    var allRecs = readAll_('records');
    var recs = allRecs.filter(function (x) { return x.studentId === stu.id; });
    var mates = readAll_('students').filter(function (x) { return x.classId === stu.classId && x.status === 'active'; }).map(function (x) { return { id: x.id, name: x.name }; });
    var mateRecs = allRecs.filter(function (x) { return x.classId === stu.classId; }).map(function (x) { return { studentId: x.studentId, date: x.date, hifz: x.hifz ? { pages: x.hifz.pages, grade: x.hifz.grade } : null, review: x.review ? { pages: x.review.pages, grade: x.review.grade } : null, att: x.att, noor: x.noor ? { grade: x.noor.grade } : null, zad: x.zad ? x.zad.map(function (z) { return { grade: z.grade }; }) : null }; });
    var st3 = settings_();
    var pays = st3.parentShowFees === false ? [] : readAll_('payments').filter(function (p) { return p.studentId === stu.id; });
    var safe = {}; for (var k in stu) if (['idNumber', 'guardianId', 'parentToken', '_row'].indexOf(k) < 0) safe[k] = stu[k];
    var myRes = st3.parentShowExams === false ? [] : readAll_('results').filter(function (x) { return x.studentId === stu.id && x.published !== false; });
    var exIds = myRes.map(function (x) { return x.examId; });
    var myExams = readAll_('exams').filter(function (e) { return exIds.indexOf(e.id) >= 0; }).map(function (e) {
      return { id: e.id, title: e.title, kind: e.kind, date: e.date, total: e.total, subjects: (e.subjects || []).map(function (s) { return { id: s.id, book: s.book, name: s.name, icon: s.icon, total: s.total, questions: (s.questions || []).map(function (q) { return { id: q.id, mark: q.mark }; }) }; }) };
    });
    return { ok: true, student: safe, cls: cls, teacher: teacher ? { name: teacher.name, phone: teacher.phone } : null, results: myRes, exams: myExams,
      records: recs, payments: pays, mates: mates, mateRecords: mateRecs, settings: publicSettings_(st3) };
  }

  // ——— يتطلب دخولاً ———
  var me = session_(r.token);
  if (!me) return { ok: false, error: 'انتهت الجلسة، سجّل الدخول من جديد', auth: false };

  if (a === 'sync') {
    var data = {};
    Object.keys(TABLES).forEach(function (t) { data[t] = stripSecrets_(readAll_(t)); });
    if (me.role === 'teacher') { // المعلم يرى فصوله فقط
      var my = data.classes.filter(function (c) { return c.teacherId === me.id || (c.teacherIds || []).indexOf(me.id) >= 0; }).map(function (c) { return c.id; });
      data.students = data.students.filter(function (s) { return my.indexOf(s.classId) >= 0; });
      data.records = data.records.filter(function (x) { return my.indexOf(x.classId) >= 0; });
      data.results = data.results.filter(function (x) { return my.indexOf(x.classId) >= 0; });
      data.exams = data.exams.filter(function (e) { return (e.classIds || []).some(function (c) { return my.indexOf(c) >= 0; }); });
      data.outbox = data.outbox.filter(function (x) { return x.by === me.id; });
      data.payments = []; data.invites = [];
      data.users = data.users.map(function (u) { return { id: u.id, name: u.name, role: u.role }; });
      data.settings = data.settings.map(function (x) { var c = {}; for (var k in x) if (k !== 'waToken' && k !== 'waInstance') c[k] = x[k]; return c; });
    }
    return { ok: true, data: data, me: stripSecrets_([me])[0], time: Date.now() };
  }

  if (a === 'save') {
    if (!TABLES[r.table]) return { ok: false, error: 'جدول غير معروف' };
    if (me.role === 'teacher' && ['records', 'students', 'results', 'exams', 'outbox'].indexOf(r.table) < 0) return { ok: false, error: 'لا تملك الصلاحية' };
    var rows = r.rows || [];
    if (r.table === 'outbox' && me.role === 'teacher') rows.forEach(function (x) { x.by = me.id; x.byName = me.name; });
    if (r.table === 'users') {
      if (me.role !== 'admin') return { ok: false, error: 'للمدير فقط' };
      var old = readAll_('users');
      rows.forEach(function (u) {
        var o = old.filter(function (x) { return x.id === u.id; })[0];
        if (u.password) { u.passHash = hash_(pwNorm_(u.password)); delete u.password; } // تُحفظ موحّدة: أرقام إنجليزية، بلا مسافات، أحرف صغيرة
        else if (o) u.passHash = o.passHash;
        if (o && o.loginKey && !u.loginKey) u.loginKey = o.loginKey; // رابط الدخول المباشر يبقى كما هو
      });
    }
    upsert_(r.table, rows);
    return { ok: true, time: Date.now() };
  }

  if (a === 'del') {
    if (me.role === 'teacher' && ['records', 'results', 'exams', 'outbox'].indexOf(r.table) < 0) return { ok: false, error: 'لا تملك الصلاحية' };
    var sh = sheet_(r.table);
    var last = sh.getLastRow();
    if (last >= 2) {
      var ids = sh.getRange(2, 1, last - 1, 1).getValues().map(function (x) { return String(x[0]); });
      for (var i = ids.length - 1; i >= 0; i--) if ((r.ids || []).indexOf(ids[i]) >= 0) sh.deleteRow(i + 2);
    }
    return { ok: true };
  }

  if (a === 'upload') { // رفع ملف (إيصال، ورقة إجابة، تسجيل صوت/فيديو) إلى Google Drive
    var blob = Utilities.newBlob(Utilities.base64Decode(r.data), r.mime || 'application/octet-stream', r.name || 'إيصال');
    var file = (r.folder ? subFolder_(r.folder) : receiptsFolder_()).createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    return { ok: true, url: 'https://drive.google.com/file/d/' + file.getId() + '/view', id: file.getId() };
  }

  if (a === 'makeKey') { // إنشاء/تجديد رابط الدخول المباشر لمستخدم (للمدير والمشرف)
    if (me.role !== 'admin' && me.role !== 'supervisor' && r.id !== me.id) return { ok: false, error: 'للإدارة فقط' }; // كل مستخدم يستطيع أخذ رابط دخوله هو
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      var all = readAll_('users'); var tu = all.filter(function (x) { return x.id === r.id; })[0];
      if (!tu) return { ok: false, error: 'المستخدم غير موجود' };
      if (tu.role === 'admin' && me.role !== 'admin') return { ok: false, error: 'للمدير فقط' };
      if (r.id === me.id && me.role !== 'admin' && me.role !== 'supervisor') r.renew = false; // المعلم لا يجدد رابطه بنفسه
      if (!tu.loginKey || r.renew) { tu.loginKey = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 32); tu.updatedAt = Date.now(); upsert_('users', [tu]); }
      return { ok: true, key: tu.loginKey };
    } finally { lock.releaseLock(); }
  }

  if (a === 'setSecret') { // حفظ مفتاح Claude API في خصائص السكربت (لا يظهر لأي مستخدم)
    if (me.role !== 'admin') return { ok: false, error: 'للمدير فقط' };
    PropertiesService.getScriptProperties().setProperty('ANTHROPIC_KEY', String(r.value || '').trim());
    return { ok: true, has: !!r.value };
  }
  if (a === 'hasSecret') return { ok: true, has: !!PropertiesService.getScriptProperties().getProperty('ANTHROPIC_KEY') };

  if (a === 'aiGrade') { // قراءة ورقة إجابة الطالب وتصحيحها بالذكاء الاصطناعي
    var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_KEY');
    if (!key) return { ok: false, error: 'لم يُضف مفتاح Claude API — الإعدادات ← الاختبارات' };
    var content = (r.images || []).map(function (im) { return { type: 'image', source: { type: 'base64', media_type: im.mime, data: im.data } }; });
    content.push({ type: 'text', text: r.prompt });
    var resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({ model: r.model || 'claude-sonnet-5-5', max_tokens: 4000, messages: [{ role: 'user', content: content }] })
    });
    var code = resp.getResponseCode(); var body = resp.getContentText();
    if (code !== 200) return { ok: false, error: 'خطأ من خدمة التصحيح (' + code + '): ' + body.slice(0, 300) };
    var j = JSON.parse(body); var txt = (j.content || []).map(function (c) { return c.text || ''; }).join('');
    return { ok: true, text: txt };
  }

  if (a === 'shorten') { // اختصار الروابط (اختياري) عبر is.gd
    var out = {};
    (r.urls || []).slice(0, 60).forEach(function (u) {
      try { var res = UrlFetchApp.fetch('https://is.gd/create.php?format=simple&url=' + encodeURIComponent(u), { muteHttpExceptions: true }); var t = res.getContentText().trim(); if (res.getResponseCode() === 200 && /^https?:\/\//.test(t)) out[u] = t; } catch (e) {}
    });
    return { ok: true, map: out };
  }

  if (a === 'sendWA') { // إرسال تلقائي عبر مزود واتساب (اختياري)
    var st4 = settings_();
    var inst = PropertiesService.getScriptProperties().getProperty('WA_INSTANCE') || st4.waInstance;
    var tk = PropertiesService.getScriptProperties().getProperty('WA_TOKEN') || st4.waToken;
    if (!inst || !tk) return { ok: false, error: 'لم يتم إعداد مزود الواتساب' };
    var results = [];
    (r.messages || []).forEach(function (m) {
      try {
        var resp = UrlFetchApp.fetch('https://api.ultramsg.com/' + inst + '/messages/chat', {
          method: 'post', muteHttpExceptions: true,
          payload: { token: tk, to: m.to, body: m.body }
        });
        results.push({ to: m.to, ok: resp.getResponseCode() === 200, res: resp.getContentText().slice(0, 200) });
        Utilities.sleep(6000 + Math.floor(Math.random() * 7000)); // مهلة عشوائية بين الرسائل حتى لا يُحظر الرقم
      } catch (err) { results.push({ to: m.to, ok: false, res: String(err) }); }
    });
    return { ok: true, results: results };
  }

  return { ok: false, error: 'إجراء غير معروف' };
}

function publicSettings_(s) {
  var keys = ['orgName', 'branchName', 'complexName', 'programName', 'supervisor', 'logoRight', 'logoLeft', 'regClosed', 'regNote',
    'gradeLabels', 'workDays', 'year', 'years', 'zad', 'features', 'parentShowFees', 'parentShowDisc', 'parentShowRank', 'parentShowExams', 'parentShowMedia', 'examScale', 'examReportShow', 'curricula', 'feeDefault', 'currency', 'phone', 'regFields'];
  var o = {}; keys.forEach(function (k) { if (s[k] !== undefined) o[k] = s[k]; });
  return o;
}
/*CORE-END*/
