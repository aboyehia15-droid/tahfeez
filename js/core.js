/* ===== النواة: البيانات والتخزين والاتصال بالخادم وأدوات عامة ===== */
const TABLE_NAMES = ['students', 'classes', 'users', 'records', 'payments', 'invites', 'exams', 'results', 'settings', 'outbox', 'receipts'];
const LS = { data: 'tz_data', sess: 'tz_session', server: 'tz_server', queue: 'tz_queue' };

const DEFAULT_SETTINGS = {
  id: 'main',
  year: '1448',
  years: [],
  orgName: 'جمعية تعلم للقرآن وعلومه',
  branchName: 'فرع الخبر والدمام',
  complexName: 'مجمع ابن تيمية القرآني',
  programName: 'برنامج البراعم القرآني',
  supervisor: '',
  logoRight: 'assets/logo-taallam.png',
  logoLeft: 'assets/logo-ibntaymiyah.jpg',
  workDays: [0, 1, 2, 3, 4], // الأحد..الخميس
  gradeLabels: { 5: 'ممتاز', 4: 'جيد جداً', 3: 'جيد', 2: 'مقبول', 1: 'يحتاج متابعة' },
  features: { quran: true, noor: true, zad: true, fees: true, voice: true, leaders: true, behavior: true, parentPage: true },
  parentShowFees: true,
  feeDefault: 0,
  currency: 'ريال',
  bankName: 'مصرف الراجحي', bankHolder: 'جمعية تعلم', bankAccount: '166000010006080500064', bankIban: 'SA6380000166608010500064',
  payNote: 'سداد لصالح حلقات مجمع ابن تيمية', payWhats: '0505890287', receiptOn: true, receiptAuto: false,
  regClosed: false,
  regNote: 'نسعد بتسجيل ابنكم في حلقات تحفيظ القرآن الكريم، يرجى تعبئة البيانات بدقة.',
  waInvite: 'السلام عليكم ورحمة الله وبركاته\nولي أمر الطالب الكريم،\nيسر {complex} دعوتكم لتسجيل ابنكم في {program}.\nرابط التسجيل:\n{link}\nجزاكم الله خيراً.',
  waParent: 'السلام عليكم ورحمة الله\nولي أمر الطالب: {student}\nيمكنكم متابعة مستوى ابنكم يومياً (الحفظ، المراجعة، النورانية، زاد الطفل، الغياب، الملاحظات، الرسوم) عبر الرابط الخاص:\n{link}\n{complex}',
  waAbsent: 'السلام عليكم ورحمة الله\nنفيدكم بغياب الطالب {student} اليوم {date}.\nنأمل الحرص على الحضور.\n{complex}',
  waDaily: 'السلام عليكم ورحمة الله\nتقرير اليوم للطالب {student} — {date}\n{summary}\nللتفاصيل: {link}',
  waFee: 'السلام عليكم ورحمة الله\nولي أمر الطالب {student}\nنذكركم بالمتبقي من الرسوم: {remaining} {currency}.\nجزاكم الله خيراً.\n{complex}',
  zad: null,
  regFields: null,
  directionDefault: 'desc'
};

const S = {
  data: {}, me: null, token: null, server: '', online: navigator.onLine, syncing: false, lastSync: 0,
  get settings() { return Object.assign({}, DEFAULT_SETTINGS, (this.data.settings || []).find(x => x.id === 'main') || {}); }
};

/* ——— تخزين محلي ——— */
function loadLocal() {
  try { S.data = JSON.parse(localStorage.getItem(LS.data) || '{}'); } catch (e) { S.data = {}; }
  TABLE_NAMES.forEach(t => { if (!Array.isArray(S.data[t])) S.data[t] = []; });
  try { const s = JSON.parse(localStorage.getItem(LS.sess) || 'null'); if (s) { S.me = s.me; S.token = s.token; } } catch (e) {}
  // من دخل الوضع المحلي بالخطأ ولا توجد عنده بيانات محلية حقيقية: يرجع تلقائياً إلى خادم المجمع
  if (localStorage.getItem('tz_local') && window.DEFAULT_SERVER && !localStorage.getItem(LS.server) && (!S.data.students.length || (S.token && S.me)) && !/[?&]local=1/.test(location.search) && !/^(localhost|127\.)/.test(location.hostname)) { localStorage.removeItem('tz_local'); if (!S.token) { S.me = null; } }
  S.server = localStorage.getItem(LS.server) || (localStorage.getItem('tz_local') ? '' : (window.DEFAULT_SERVER || ''));
}
let _persistT;
function persist() { clearTimeout(_persistT); _persistT = setTimeout(() => { try { localStorage.setItem(LS.data, JSON.stringify(S.data)); } catch (e) { toast('⚠️ مساحة التخزين ممتلئة'); } }, 150); }
function saveSession() { localStorage.setItem(LS.sess, JSON.stringify({ me: S.me, token: S.token })); }
const isLocal = () => !S.server;

/* ——— معرفات ووقت ——— */
const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const token20 = () => Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 20);
const pad = n => String(n).padStart(2, '0');
const toISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayISO = () => toISO(new Date());
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const dayName = iso => DAY_NAMES[parseISO(iso).getDay()];
function hijri(iso) { try { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(parseISO(iso)); } catch (e) { return ''; } }
function fmtDate(iso, withDay = true) { if (!iso) return ''; const d = parseISO(iso); return (withDay ? dayName(iso) + ' ' : '') + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
function weekStart(iso) { const d = parseISO(iso); d.setDate(d.getDate() - d.getDay()); return toISO(d); } // الأحد
function monthRange(iso) { const d = parseISO(iso); return [toISO(new Date(d.getFullYear(), d.getMonth(), 1)), toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))]; }
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
function ageFrom(iso) { if (!iso) return ''; const b = new Date(iso); if (isNaN(b)) return ''; const n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a >= 0 && a < 30 ? a : ''; }
const num = (v, d = 2) => { const x = Math.round((+v || 0) * Math.pow(10, d)) / Math.pow(10, d); return x.toLocaleString('en-US', { maximumFractionDigits: d }); };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const COLORS = ['#0f5c55', '#c9a227', '#3a6fd8', '#7a5bd6', '#d1495b', '#2c8a4b', '#e8913a', '#137a70', '#8a6d0e', '#5b7083'];
const colorOf = s => COLORS[Math.abs(String(s).split('').reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7)) % COLORS.length];
const initials = n => String(n || '؟').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join(' ');

/* ——— أرقام الجوال ——— */
function normPhone(p) {
  let s = String(p || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d+]/g, '');
  s = s.replace(/^\+/, '').replace(/^00/, '');
  if (/^05\d{8}$/.test(s)) s = '966' + s.slice(1);
  else if (/^5\d{8}$/.test(s)) s = '966' + s;
  return s;
}
function waLink(phone, text) { return 'https://wa.me/' + normPhone(phone) + '?text=' + encodeURIComponent(text || ''); }
function fillTpl(tpl, vars) { const st = S.settings; const all = Object.assign({ complex: st.complexName, program: st.programName, org: st.orgName, currency: st.currency }, vars); return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => all[k] != null ? all[k] : m); }
function appBase() { return location.origin + location.pathname.replace(/index\.html$/, ''); }
const regLink = () => appBase() + '?reg=1' + serverParam();
/* رابط قصير: ?p=الرمز&w=نوع-بنود-من-إلى  (رابط الخادم لا يُضاف إن كان هو خادم المجمع الافتراضي) */
const VIEW_CODES = { hifz: 'h', review: 'r', far: 'b', noor: 'n', zad: 'z', cur: 'c', grade: 'g', errors: 'e', behavior: 's', note: 'm', notes: 'm', media: 'v', att: 'a', surahs: 'q', rank: 'k', level: 'l', exams: 'x', fees: 'f', subjects: 'j', total: 't', pct: 'p', quran: 'u', due: 'd', disc: 'o', paid: 'y', remaining: 'w', pays: 'i' };
const VIEW_KINDS = { daily: 'd', period: 'p', absent: 'a', exam: 'e', fee: 'f' };
const ymd = d => d ? d.replace(/^20/, '').replace(/-/g, '') : '';
function encodeView(v) { const o = [...new Set(String(v.o || '').split(',').map(k => VIEW_CODES[k]).filter(Boolean))].join(''); return [VIEW_KINDS[v.v] || 'p', o, v.x ? '~' + v.x : ymd(v.f), v.x || v.t === v.f ? '' : ymd(v.t)].join('-').replace(/-+$/, ''); }
function decodeView(w) {
  const [k, o, a, b] = String(w).split('-'); const kind = Object.keys(VIEW_KINDS).find(x => VIEW_KINDS[x] === k) || 'period';
  const rev = {}; Object.entries(VIEW_CODES).forEach(([key, c]) => { (rev[c] = rev[c] || []).push(key); });
  const keys = (o || '').split('').flatMap(c => rev[c] || []);
  const dt = s => s && /^\d{6}$/.test(s) ? '20' + s.slice(0, 2) + '-' + s.slice(2, 4) + '-' + s.slice(4, 6) : '';
  return { v: kind, o: keys.join(','), x: a && a[0] === '~' ? a.slice(1) : '', f: a && a[0] !== '~' ? dt(a) : '', t: dt(b) || (a && a[0] !== '~' ? dt(a) : '') };
}
const serverParam = () => S.server && S.server !== window.DEFAULT_SERVER ? '&s=' + encodeURIComponent(S.server) : '';
const parentLink = (st, view) => appBase() + '?p=' + st.parentToken + (view ? '&w=' + encodeView(view) : '') + serverParam();

/* ——— الوصول للبيانات ——— */
/* ——— الأعوام الدراسية: كل عام يغطي فترة تواريخ، والأعوام المغلقة تُعرض للاطلاع فقط ——— */
const curYear = () => String(S.settings.year || '1448');
const allYears = () => (S.settings.years || []).map(y => y.name).concat([curYear()]);
const viewingArchive = () => !!(S.viewYear && S.viewYear !== curYear());
function yearRange(name) {
  const ys = S.settings.years || [];
  if (!name || name === curYear()) { const last = ys[ys.length - 1]; return [last ? addDays(last.to, 1) : '', '']; }
  const i = ys.findIndex(y => y.name === name); if (i < 0) return ['', ''];
  return [i > 0 ? addDays(ys[i - 1].to, 1) : '', ys[i].to];
}
const T = t => {
  const a = S.data[t];
  if (t === 'records' || t === 'payments' || t === 'exams' || t === 'results') { const [f, to] = yearRange(S.viewYear); if (!f && !to) return a; return a.filter(x => (!f || x.date >= f) && (!to || x.date <= to)); }
  if (viewingArchive()) {
    const y = S.viewYear;
    if (t === 'students') return a.filter(s => s.history && s.history[y]).map(s => Object.assign({}, s, s.history[y], { status: 'active' }));
    if (t === 'classes') { const m = {}; a.forEach(s => {}); S.data.students.forEach(s => { const h = s.history && s.history[y]; if (h && h.classId && !m[h.classId]) { const c = S.data.classes.find(c => c.id === h.classId); m[h.classId] = Object.assign({ subjects: ['quran', 'noor', 'zad'] }, c || {}, { id: h.classId, name: h.className || (c || {}).name || '', teacherId: h.teacherId || (c || {}).teacherId }); } }); return Object.values(m); }
  }
  return a;
};
const byId = (t, id) => (viewingArchive() && (t === 'students' || t === 'classes') ? T(t) : S.data[t]).find(x => x.id === id);
const allRecsOf = sid => S.data.records.filter(r => r.studentId === sid).sort((a, b) => a.date < b.date ? -1 : 1);
const activeStudents = () => T('students').filter(s => s.status === 'active');
const classOf = st => st && byId('classes', st.classId);
const teacherOf = cls => cls && byId('users', cls.teacherId);
function myClasses() {
  const all = T('classes').slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  if (!S.me || S.me.role !== 'teacher') return all;
  return all.filter(c => c.teacherId === S.me.id || (c.teacherIds || []).includes(S.me.id));
}
const canAdmin = () => isLocal() || (S.me && (S.me.role === 'admin' || S.me.role === 'supervisor'));
const isAdmin = () => isLocal() || (S.me && S.me.role === 'admin');
const studentsOfClass = cid => activeStudents().filter(s => s.classId === cid).sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name, 'ar'));
const recId = (sid, date) => sid + '|' + date;
const getRec = (sid, date) => byId('records', recId(sid, date));
function recsOf(sid, from, to) { return T('records').filter(r => r.studentId === sid && (!from || r.date >= from) && (!to || r.date <= to)).sort((a, b) => a.date < b.date ? -1 : 1); }

/* ——— الحفظ والمزامنة ——— */
function queue() { try { return JSON.parse(localStorage.getItem(LS.queue) || '[]'); } catch (e) { return []; } }
function setQueue(q) { localStorage.setItem(LS.queue, JSON.stringify(q)); updateSyncBadge(); }
function save(table, obj, silent) {
  if (viewingArchive() && !obj._force) { toast('🔒 العام ' + S.viewYear + ' مغلق — للعرض فقط'); return obj; }
  delete obj._force;
  obj.updatedAt = Date.now();
  if (S.me) obj.by = S.me.name;
  const arr = S.data[table]; const i = arr.findIndex(x => x.id === obj.id);
  if (i >= 0) arr[i] = obj; else arr.push(obj);
  persist();
  if (!isLocal()) { const q = queue(); const j = q.findIndex(x => x.op === 'save' && x.table === table && x.row.id === obj.id); const it = { op: 'save', table, row: obj }; if (j >= 0) q[j] = it; else q.push(it); setQueue(q); flushSoon(); }
  return obj;
}
function saveMany(table, rows) { rows.forEach(r => save(table, r, true)); }
function remove(table, id) {
  if (viewingArchive()) { toast('🔒 العام ' + S.viewYear + ' مغلق — للعرض فقط'); return; }
  S.data[table] = S.data[table].filter(x => x.id !== id); persist();
  if (!isLocal()) { const q = queue().filter(x => !(x.op === 'save' && x.table === table && x.row.id === id)); q.push({ op: 'del', table, id }); setQueue(q); flushSoon(); }
}
function saveSettings(patch) { const cur = (S.data.settings || []).find(x => x.id === 'main') || { id: 'main' }; save('settings', Object.assign({}, cur, patch)); }

async function uploadFile(dataURL, name, folder) {
  if (isLocal()) throw new Error('الرفع يحتاج الربط بالخادم');
  const m = String(dataURL).match(/^data:([^;]+);base64,(.*)$/); if (!m) throw new Error('ملف غير صالح');
  const r = await api('upload', { name, mime: m[1].split(';')[0], data: m[2], folder });
  if (!r.ok) throw new Error(r.error || 'تعذر الرفع'); return r.url;
}
const drivePreview = u => String(u || '').replace(/\/view(\?.*)?$/, '/preview');
async function api(action, payload = {}, server) {
  const url = server || S.server;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action, token: S.token }, payload)), redirect: 'follow' });
  const j = await res.json();
  if (j && j.auth === false) { S.me = null; S.token = null; saveSession(); toast('انتهت الجلسة'); render(); }
  return j;
}
let _flushT;
function flushSoon() { clearTimeout(_flushT); _flushT = setTimeout(flush, 800); }
async function flush() {
  if (isLocal() || !S.token || S.syncing) return;
  let q = queue(); if (!q.length) return;
  S.syncing = true; updateSyncBadge();
  try {
    const saves = {}; const dels = {};
    q.forEach(x => { if (x.op === 'save') (saves[x.table] = saves[x.table] || []).push(x.row); else (dels[x.table] = dels[x.table] || []).push(x.id); });
    for (const t in saves) { const r = await api('save', { table: t, rows: saves[t] }); if (!r.ok) throw new Error(r.error); }
    for (const t in dels) { const r = await api('del', { table: t, ids: dels[t] }); if (!r.ok) throw new Error(r.error); }
    const sent = q.length; q = queue().slice(sent); setQueue(q);
  } catch (e) { console.warn('sync', e); }
  S.syncing = false; updateSyncBadge();
}
async function pull(quiet) {
  if (isLocal() || !S.token) return;
  await flush();
  try {
    const r = await api('sync');
    if (r.ok) {
      const pend = queue();
      TABLE_NAMES.forEach(t => { S.data[t] = r.data[t] || []; });
      // إعادة تطبيق ما لم يُرفع بعد
      pend.forEach(x => { if (x.op === 'save') { const a = S.data[x.table]; const i = a.findIndex(y => y.id === x.row.id); if (i >= 0) a[i] = x.row; else a.push(x.row); } else S.data[x.table] = S.data[x.table].filter(y => y.id !== x.id); });
      if (r.me) { S.me = r.me; saveSession(); }
      S.lastSync = Date.now(); persist();
      if (!quiet) toast('✔️ تم تحديث البيانات');
      return true;
    } else if (!quiet) toast('⚠️ ' + r.error);
  } catch (e) { if (!quiet) toast('⚠️ تعذر الاتصال بالخادم'); }
}
function updateSyncBadge() {
  const el = $('#sync-st'); if (!el) return;
  if (isLocal()) { el.textContent = '💾 محلي'; return; }
  const n = queue().length;
  el.textContent = S.syncing ? '🔄 مزامنة…' : n ? '⏳ ' + n + ' بانتظار الرفع' : '☁️ متزامن';
}
window.addEventListener('online', () => { S.online = true; flush(); });
window.addEventListener('offline', () => { S.online = false; updateSyncBadge(); });

/* ——— واجهة: إشعار ونوافذ ——— */
let _toastT;
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(_toastT); _toastT = setTimeout(() => t.classList.remove('show'), ms); }
function modal({ title, body, foot, wide, onClose }) {
  const root = $('#modal-root');
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" style="${wide ? 'max-width:1000px' : ''}"><div class="modal-h"><h3>${title || ''}</h3><button class="x" data-close>✕</button></div><div class="modal-b"></div>${foot !== false ? '<div class="modal-f"></div>' : ''}</div>`;
  root.appendChild(bg);
  const m = { el: bg, body: $('.modal-b', bg), foot: $('.modal-f', bg), close() { bg.remove(); onClose && onClose(); } };
  if (typeof body === 'string') m.body.innerHTML = body; else if (body) m.body.appendChild(body);
  if (foot && m.foot) { if (typeof foot === 'string') m.foot.innerHTML = foot; else m.foot.appendChild(foot); }
  $('[data-close]', bg).onclick = () => m.close();
  bg.addEventListener('mousedown', e => { if (e.target === bg) m.close(); });
  return m;
}
function confirmBox(msg, okText = 'تأكيد', danger = true) {
  return new Promise(res => {
    const m = modal({ title: 'تأكيد', body: `<p style="font-size:18.5px">${msg}</p>`, foot: `<button class="btn ${danger ? 'red' : ''}" data-ok>${okText}</button><button class="btn ghost" data-no>إلغاء</button>`, onClose: () => res(false) });
    $('[data-ok]', m.el).onclick = () => { m.el.remove(); res(true); };
    $('[data-no]', m.el).onclick = () => m.close();
  });
}
function copyText(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('📋 تم النسخ')).catch(() => { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); toast('📋 تم النسخ'); }); }
function loadScript(src) { return new Promise((res, rej) => { if ($(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
const loadXLSX = () => loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
const loadQR = () => loadScript('https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js');
function gradeLabel(g) { if (!g) return ''; const l = (S.settings.gradeLabels || {})[g] || DEFAULT_SETTINGS.gradeLabels[g] || ''; return /^يُ?عاد$/.test(l.trim()) ? 'يحتاج متابعة' : l; }
function gradeChip(g) { if (!g) return ''; const c = g >= 4 ? 'green' : g == 3 ? 'gold' : 'red'; return `<span class="chip ${c}">${gradeLabel(g)}</span>`; }
const stars = n => n ? '<span class="stars">' + '★'.repeat(n) + '<span style="opacity:.25">' + '★'.repeat(5 - n) + '</span></span>' : '';
function gradeButtons(cur, name) { return `<div class="grades" data-grade="${name}">${[5, 4, 3, 2, 1].map(g => `<button type="button" class="g${g} ${cur == g ? 'on' : ''}" data-g="${g}">${gradeLabel(g)}</button>`).join('')}</div>`; }
function bindGrades(root, cb) { $$('.grades', root).forEach(gr => gr.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const was = b.classList.contains('on'); $$('button', gr).forEach(x => x.classList.remove('on')); if (!was) b.classList.add('on'); cb(gr.dataset.grade, was ? 0 : +b.dataset.g); })); }
function zadCurriculum() { return S.settings.zad || window.ZAD_DEFAULT; }
function features() { return Object.assign({}, DEFAULT_SETTINGS.features, S.settings.features || {}); }
function logoR() { return S.settings.logoRight || DEFAULT_SETTINGS.logoRight; }
function logoL() { return S.settings.logoLeft || DEFAULT_SETTINGS.logoLeft; }
function repHeader(title, sub) {
  const st = S.settings;
  return `<div class="rep-head"><img src="${logoR()}" alt=""><div class="c"><h2>${esc(title)}</h2><div>${esc(st.complexName)} — ${esc(st.programName)}</div>${sub ? `<div>${sub}</div>` : ''}</div><img src="${logoL()}" alt=""></div>`;
}
function resizeImage(file, max = 260) {
  return new Promise(res => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .85)); }; im.src = r.result; }; r.readAsDataURL(file); });
}

/* ——— حجم الخط على هذا الجهاز (عادي / كبير / كبير جداً) ——— */
const FS_LEVELS = [1, 1.12, 1.25];
function fsLevel() { const n = +(localStorage.getItem('tz_fs') || 0); return FS_LEVELS[n] ? n : 0; }
function applyFS() { document.body.style.zoom = FS_LEVELS[fsLevel()]; document.querySelectorAll('[data-fs]').forEach(b => b.textContent = ['أ', 'أ+', 'أ++'][fsLevel()]); }
const fsBtn = () => `<button type="button" class="fs-btn" data-fs title="تكبير الخط">${['أ', 'أ+', 'أ++'][fsLevel()]}</button>`;
document.addEventListener('click', e => { if (!e.target.closest('[data-fs]')) return; localStorage.setItem('tz_fs', (fsLevel() + 1) % FS_LEVELS.length); applyFS(); toast(['حجم الخط: عادي', 'حجم الخط: كبير', 'حجم الخط: كبير جداً'][fsLevel()]); });
document.addEventListener('DOMContentLoaded', applyFS); if (document.body) applyFS();
