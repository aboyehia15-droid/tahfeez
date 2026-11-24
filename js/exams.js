/* ===================== الاختبارات: الكتب، أنواع الأسئلة، التوليد، النماذج ===================== */
const EXAM_KINDS = { level: 'اختبار تقييم مستوى', monthly: 'اختبار شهري', term1: 'اختبار الفصل الدراسي الأول', term2: 'اختبار الفصل الدراسي الثاني' };
const EXAM_KIND_ICON = { level: '🧭', monthly: '🗓️', term1: '📘', term2: '📗' };
const DEFAULT_SCALE = [{ min: 90, label: 'ممتاز' }, { min: 80, label: 'جيد جداً' }, { min: 65, label: 'جيد' }, { min: 50, label: 'مقبول' }, { min: 0, label: 'يحتاج متابعة' }];
const REPORT_SHOW = [['mark', 'الدرجة'], ['pct', 'النسبة'], ['grade', 'التقدير'], ['rank', 'الترتيب'], ['notes', 'الملاحظات'], ['qdetail', 'درجات الأسئلة'], ['quran', 'أخطاء القرآن'], ['media', 'التسجيلات وأوراق الإجابة'], ['paper', 'نموذج الاختبار']];
const examScale = () => (S.settings.examScale && S.settings.examScale.length ? S.settings.examScale : DEFAULT_SCALE).slice().sort((a, b) => b.min - a.min);
function examGrade(pct) { if (pct == null || isNaN(pct)) return ''; return (examScale().find(x => pct >= x.min) || {}).label || ''; }
function gradeColor(pct) { return pct >= 90 ? '#2c8a4b' : pct >= 80 ? '#4aa35c' : pct >= 65 ? '#d9a21b' : pct >= 50 ? '#e8913a' : '#d1495b'; }
const AR_D = '٠١٢٣٤٥٦٧٨٩';
const toAr = n => String(n).replace(/\d/g, d => AR_D[d]);
const fromAr = s => +String(s).replace(/[٠-٩]/g, d => AR_D.indexOf(d));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const sample = (a, n) => shuffle(a).slice(0, n);
const r05 = x => Math.round(x * 2) / 2;

/* ——— الكتب المتاحة للاختبار ——— */
function examBooks(cids) {
  const f = features(); const B = []; const allow = cids === undefined ? null : new Set(subjectsOf(cids));
  if (f.quran) B.push({ id: 'quran', name: 'القرآن الكريم', icon: '📖', kind: 'quran', groups: JUZ_LIST.map(j => ({ name: j.name, lessons: j.surahs.map(n => ({ key: 's' + n, t: 'سورة ' + Q.names[n - 1], s: n })) })) });
  if (f.noor) B.push({ id: 'noor', name: 'القاعدة النورانية', icon: '🔤', kind: 'noor', groups: [{ name: '', lessons: NOORANIA.map((l, i) => ({ key: 'n' + (i + 1), t: l.title, items: l.items })) }] });
  if (f.zad) B.push({ id: 'zad', name: 'زاد الطفل المسلم', icon: '🌸', kind: 'zad', groups: zadCurriculum().map(c => ({ name: c.icon + ' ' + c.name, lessons: c.items.map((it, i) => ({ key: c.id + '_' + i, t: it, cat: c.id })) })) });
  curricula().forEach(c => {
    const kind = c.lessons.some(l => /^حرف\s/.test(l.t)) ? 'letters' : c.lessons.some(l => /^الرقم\s/.test(l.t)) ? 'numbers' : 'custom';
    B.push({ id: c.id, name: c.name, icon: c.icon, kind, groups: [{ name: '', lessons: c.lessons.map((l, i) => ({ key: 'l' + (i + 1), t: l.t, items: l.items, p: l.p })) }] });
  });
  return allow ? B.filter(b => allow.has(b.id)) : B;
}
const bookById = id => examBooks().find(b => b.id === id);
const bookLessons = b => b.groups.flatMap(g => g.lessons);

const QTYPES = {
  quran: [['recite', 'تسميع من موضع', 'oral'], ['complete', 'أكمل الآية', 'written'], ['next', 'اذكر الآية التالية', 'oral'], ['which', 'اختر اسم السورة', 'written'], ['order', 'رتّب السور حسب المصحف', 'written'], ['ayat', 'كم عدد آيات السورة؟', 'written']],
  noor: [['read', 'اقرأ ما يلي', 'oral'], ['circle', 'ضع دائرة حول ما يُطلب', 'written'], ['dictate', 'إملاء: اكتب ما تسمع', 'written']],
  zad: [['oral', 'أجب / سمّع شفهياً', 'oral'], ['mcq', 'اختر الإجابة الصحيحة', 'written'], ['tf', 'ضع ✓ أو ✗', 'written']],
  letters: [['first', 'اكتب الحرف الأول من الكلمة', 'written'], ['circle', 'ضع دائرة حول الحرف', 'written'], ['match', 'صِل الحرف بالكلمة', 'written'], ['dictate', 'اكتب الحرف الذي تسمعه', 'written'], ['say', 'انطق الحرف بالحركات', 'oral']],
  numbers: [['count', 'عُدّ واكتب العدد', 'written'], ['write', 'اكتب الرقم', 'written'], ['match', 'صِل الرقم بالكمية', 'written'], ['seq', 'أكمل التسلسل', 'written'], ['big', 'ضع دائرة حول العدد الأكبر', 'written'], ['say', 'اقرأ الرقم', 'oral']],
  custom: [['oral', 'سؤال شفهي', 'oral'], ['written', 'سؤال تحريري', 'written'], ['tf', 'ضع ✓ أو ✗', 'written']]
};
const qtypeInfo = (kind, t) => (QTYPES[kind] || []).find(x => x[0] === t) || [t, t, 'written'];
const EMO = ['⭐', '🍎', '🌙', '🐟', '🌸', '⚽', '🎈', '🍌'];

/* ——— توليد الأسئلة ——— */
function letterInfo(l) { const m = String(l.t).match(/^حرف\s+(\S+)\s*\((.+?)\)\s*—\s*(.+)$/); return m ? { name: m[1], letter: m[2], word: m[3].trim() } : null; }
function numberInfo(l) { const m = String(l.t).match(/^الرقم\s+(\S+)\s*—\s*(.+)$/); return m ? { n: fromAr(m[1]), ar: m[1], word: m[2].trim() } : null; }
function zadQA(it) { const i = it.indexOf('؟'); return i > 0 ? { q: it.slice(0, i + 1).trim(), a: it.slice(i + 1).trim() } : null; }
function genQuestions(sub) {
  const b = bookById(sub.book); if (!b) return [];
  const L = bookLessons(b).filter(l => (sub.lessons || []).includes(l.key));
  if (!L.length) return [];
  const out = []; const used = new Set();
  const uniq = (fn, tries = 12) => { for (let i = 0; i < tries; i++) { const q = fn(); if (q && !used.has(q.text + (q.answer || ''))) { used.add(q.text + (q.answer || '')); return q; } } return fn(); };
  Object.entries(sub.types || {}).forEach(([type, cfg]) => {
    for (let i = 0; i < (+cfg.count || 0); i++) {
      const q = uniq(() => genOne(b, type, L));
      if (q) out.push(Object.assign({ id: uid('q'), type, mode: qtypeInfo(b.kind, type)[2], mark: +cfg.mark || 1 }, q));
    }
  });
  return out;
}
function genOne(b, type, L) {
  const k = b.kind;
  if (k === 'quran') {
    const surs = L.map(l => l.s);
    const s = pick(surs); const c = Q.count(s); const txt = ayahTextAvailable(s);
    if (type === 'recite') { const a = 1 + Math.floor(Math.random() * Math.max(1, c - 2)); const a2 = Math.min(c, a + Math.max(2, Math.min(5, Math.round(c / 3)))); return { text: `سمّع من قوله تعالى: ﴿${txt ? txt[a - 1].split(' ').slice(0, 4).join(' ') : ''}…﴾ (سورة ${Q.names[s - 1]} آية ${toAr(a)})`, answer: `سورة ${Q.names[s - 1]} من آية ${toAr(a)} إلى ${toAr(a2)}`, s, a1: a, a2 }; }
    if (type === 'complete' && txt) { let a = 1 + Math.floor(Math.random() * c); const w = txt[a - 1].split(' '); if (w.length < 4 && c > 1) { a = a < c ? a + 1 : a - 1; } const ww = txt[a - 1].split(' '); const cut = Math.max(2, Math.ceil(ww.length / 2)); return { text: `أكمل قوله تعالى: ﴿${ww.slice(0, cut).join(' ')} …………………﴾`, answer: ww.slice(cut).join(' ') || '—', s, a1: a, quranText: true }; }
    if (type === 'next' && txt && c > 1) { const a = 1 + Math.floor(Math.random() * (c - 1)); return { text: `ما الآية التي تلي قوله تعالى: ﴿${txt[a - 1]}﴾؟`, answer: txt[a], s, a1: a + 1, quranText: true }; }
    if (type === 'which' && txt) { const a = 1 + Math.floor(Math.random() * c); const others = sample(surs.filter(x => x !== s).concat(JUZ_LIST[1].surahs.filter(x => x !== s && !surs.includes(x))), 2); return { text: `في أي سورة وردت هذه الآية: ﴿${txt[a - 1].split(' ').slice(0, 6).join(' ')}…﴾؟`, opts: shuffle([Q.names[s - 1]].concat(others.map(o => Q.names[o - 1]))), answer: Q.names[s - 1], s, a1: a }; }
    if (type === 'order') { const set = sample(surs.length >= 3 ? surs : surs.concat(JUZ_LIST[1].surahs.filter(x => !surs.includes(x))), Math.min(4, Math.max(3, surs.length))); const order = set.slice().sort((a, b2) => a - b2); return { text: 'رتّب السور التالية حسب ترتيبها في المصحف (اكتب ١، ٢، ٣…):', items: shuffle(set.map(x => Q.names[x - 1])), answer: order.map(x => Q.names[x - 1]).join(' ← ') }; }
    if (type === 'ayat') { const opts = shuffle([c, c + 2, Math.max(3, c - 3)].filter((v, i, a) => a.indexOf(v) === i)).map(toAr); return { text: `كم عدد آيات سورة ${Q.names[s - 1]}؟`, opts, answer: toAr(c) }; }
    return { text: `سمّع سورة ${Q.names[s - 1]}`, answer: `سورة ${Q.names[s - 1]} كاملة`, s, mode: 'oral' };
  }
  if (k === 'noor') {
    const l = pick(L); const items = l.items.filter(x => x && x.length <= 12);
    if (type === 'read') { const n = Math.min(6, items.length); const set = sample(items, n); return { text: `اقرأ (${l.t.replace(/^الدرس\s*\S+\s*-?\s*/, '')}):`, big: set, answer: set.join(' — ') }; }
    if (type === 'circle') { const t = pick(items); const opts = shuffle([t].concat(sample(items.filter(x => x !== t), 3))); return { text: `ضع دائرة حول: «${t}»`, opts, answer: t, bigOpts: true }; }
    const t = pick(items); return { text: 'اكتب ما يمليه عليك المعلم:', answer: t, dictate: t, lines: 1 };
  }
  if (k === 'zad') {
    const l = pick(L); const cat = zadCurriculum().find(c => c.id === l.cat) || {}; const qa = zadQA(l.t);
    const allQA = bookLessons(bookById('zad')).map(x => zadQA(x.t)).filter(Boolean);
    if (type === 'mcq' && qa) { const others = sample(allQA.filter(x => x.a !== qa.a).map(x => x.a), 2); return { text: qa.q, opts: shuffle([qa.a].concat(others)), answer: qa.a }; }
    if (type === 'tf' && qa) { const right = Math.random() < .5; const other = pick(allQA.filter(x => x.a !== qa.a)); return { text: qa.q + ' ' + (right || !other ? qa.a : other.a), answer: right || !other ? '✓' : '✗', tf: true }; }
    if (type === 'tf') { return { text: `${l.t} من ${cat.name || 'زاد الطفل'}`, answer: '✓', tf: true }; }
    if (type === 'mcq') { const others = sample(bookLessons(bookById('zad')).filter(x => x.cat !== l.cat).map(x => x.t), 2); return { text: `أيّ مما يلي من «${cat.name}»؟`, opts: shuffle([l.t].concat(others)), answer: l.t }; }
    if (qa) return { text: qa.q, answer: qa.a };
    const verb = { azkar: 'سمّع', hadith: 'سمّع الحديث:', adab: 'تحدّث عن', aqeedah: 'اذكر', fiqh: 'تحدّث عن' }[l.cat] || 'تحدّث عن';
    return { text: `${verb} ${l.t}`, answer: l.t };
  }
  if (k === 'letters') {
    const infos = L.map(letterInfo).filter(Boolean); if (!infos.length) return null; const x = pick(infos);
    const all = bookLessons(b).map(letterInfo).filter(Boolean);
    if (type === 'first') return { text: `اكتب الحرف الأول من كلمة: «${x.word}»`, answer: x.letter, box: true };
    if (type === 'circle') return { text: `ضع دائرة حول حرف ${x.name}:`, opts: shuffle([x.letter].concat(sample(all.filter(y => y.letter !== x.letter).map(y => y.letter), 3))), answer: x.letter, bigOpts: true };
    if (type === 'match') { const set = sample(infos.length >= 3 ? infos : all, Math.min(4, Math.max(3, infos.length))); return { text: 'صِل الحرف بالكلمة التي تبدأ به:', pairs: set.map(y => [y.letter, y.word]), right: shuffle(set.map(y => y.word)), answer: set.map(y => y.letter + ' ← ' + y.word).join('، ') }; }
    if (type === 'dictate') return { text: 'اكتب الحرف الذي يمليه المعلم:', dictate: 'حرف ' + x.name, answer: x.letter, box: true };
    return { text: `انطق: ${x.letter}َ  ${x.letter}ُ  ${x.letter}ِ`, answer: `${x.letter} بالفتح والضم والكسر` };
  }
  if (k === 'numbers') {
    const infos = L.map(numberInfo).filter(Boolean); if (!infos.length) return null; const x = pick(infos); const n = x.n;
    if (type === 'count') { const e = pick(EMO); return { text: 'عُدّ واكتب العدد:', emo: e.repeat(n), answer: toAr(n), box: true }; }
    if (type === 'write') return { text: `اكتب الرقم: (${x.word})`, answer: toAr(n), box: true };
    if (type === 'match') { const set = sample(infos.length >= 3 ? infos : bookLessons(b).map(numberInfo).filter(y => y && y.n <= 10), Math.min(4, Math.max(3, infos.length))); const e = pick(EMO); return { text: 'صِل الرقم بالكمية المناسبة:', pairs: set.map(y => [toAr(y.n), e.repeat(y.n)]), right: shuffle(set.map(y => e.repeat(y.n))), answer: set.map(y => toAr(y.n)).join('، ') }; }
    if (type === 'seq') { const st = Math.max(1, n - 1 - Math.floor(Math.random() * 2)); const arr = [st, st + 1, st + 2, st + 3]; const hole = arr.indexOf(n) >= 0 ? arr.indexOf(n) : 2; return { text: 'أكمل التسلسل:', seq: arr.map((v, i) => i === hole ? null : toAr(v)), answer: toAr(arr[hole]) }; }
    if (type === 'big') { const o = sample(infos.map(y => y.n).concat([1, 2, 3, 4, 5, 6, 7, 8, 9]).filter((v, i, a) => a.indexOf(v) === i && v !== n), 2).concat([n]); return { text: 'ضع دائرة حول العدد الأكبر:', opts: shuffle(o.map(toAr)), answer: toAr(Math.max(...o)), bigOpts: true }; }
    return { text: `اقرأ الرقم: ${toAr(n)}`, answer: x.word, bigText: toAr(n) };
  }
  // منهج مضاف
  const l = pick(L); const it = pick(l.items || [l.t]);
  if (type === 'tf') return { text: `${it} (${l.t})`, answer: '✓', tf: true };
  if (type === 'written') return { text: `اكتب عن: ${it} — ${l.t}`, answer: it, lines: 2 };
  return { text: `${l.t}: ${it}`, answer: it };
}

/* ——— ورقة الاختبار ——— */
function examTotals(ex) { (ex.subjects || []).forEach(s => s.total = r05((s.questions || []).reduce((a, q) => a + (+q.mark || 0), 0))); ex.total = r05((ex.subjects || []).reduce((a, s) => a + s.total, 0)); return ex.total; }
function qHTML(q, n, ans, b) {
  const A = v => ans ? `<span class="ans">${esc(v)}</span>` : '';
  const mk = `<span class="qmark">(${toAr(q.mark)} ${q.mark > 2 || q.mark < 1 ? 'درجات' : 'درجة'})</span>`;
  let body = '';
  if (q.big) body += `<div class="qbig">${q.big.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
  if (q.bigText) body += `<div class="qbig"><span style="font-size:40px">${esc(q.bigText)}</span></div>`;
  if (q.emo) body += `<div class="qemo">${q.emo}</div>`;
  if (q.opts) body += `<div class="qopts ${q.bigOpts ? 'big' : ''}">${q.opts.map(o => `<span class="${ans && o === q.answer ? 'ok' : ''}">${esc(o)}</span>`).join('')}</div>`;
  if (q.items) body += `<div class="qorder">${q.items.map(o => `<span><i class="obox">${ans ? toAr(q.answer.split(' ← ').indexOf(o) + 1) : ''}</i> ${esc(o)}</span>`).join('')}</div>`;
  if (q.pairs) body += `<table class="qmatch"><tr>${'<td></td>'.repeat(0)}</tr>${q.pairs.map((p, i) => `<tr><td class="l">${esc(p[0])} <i class="dot"></i></td><td class="gap">${ans ? '← ' + esc(p[1]) : ''}</td><td class="rr"><i class="dot"></i> ${esc(q.right[i])}</td></tr>`).join('')}</table>`;
  if (q.seq) body += `<div class="qseq">${q.seq.map(v => v == null ? `<i class="obox big">${ans ? esc(q.answer) : ''}</i>` : `<span>${esc(v)}</span>`).join('<b>،</b>')}</div>`;
  if (q.tf) body += `<div class="qopts"><span class="${ans && q.answer === '✓' ? 'ok' : ''}">✓</span><span class="${ans && q.answer === '✗' ? 'ok' : ''}">✗</span></div>`;
  if (q.box) body += `<i class="obox big">${ans ? esc(q.answer) : ''}</i>`;
  if (q.lines || (q.mode === 'written' && !q.opts && !q.items && !q.pairs && !q.seq && !q.tf && !q.box)) body += ans ? `<div>${A(q.answer)}</div>` : '<div class="qlines">' + '<div></div>'.repeat(q.lines || 1) + '</div>';
  if (q.mode === 'oral') body += `<div class="qoral"><span>🗣️ شفهي</span>${ans ? A(q.answer) : '<span class="tick">☐ أتقن</span><span class="tick">☐ أتقن جزئياً</span><span class="tick">☐ يحتاج متابعة</span>'}</div>`;
  if (q.dictate && ans) body += `<div class="small">يُملى: <b>${esc(q.dictate)}</b></div>`;
  if (ans && (q.opts || q.tf) && !q.items) body += `<div>${A('الإجابة: ' + q.answer)}</div>`;
  return `<div class="q"><div class="qh"><b class="qn">${toAr(n)}</b><span class="qt ${q.quranText ? 'qq' : ''}">${esc(q.text)}</span>${mk}</div>${body}</div>`;
}
function examPaperHTML(ex, opt = {}) {
  examTotals(ex); const st = S.settings; const ans = !!opt.answers;
  const cls = (ex.classIds || []).map(id => (byId('classes', id) || {}).name).filter(Boolean).join('، ');
  let n = 0;
  return `<div class="paper">
    <div class="rep-head"><img src="${logoR()}" alt=""><div class="c"><h2>${esc(ex.title)}${ans ? ' — نموذج الإجابة' : ''}</h2><div>${esc(st.complexName)} — ${esc(st.programName)}</div><div>${EXAM_KINDS[ex.kind] || ''} · ${fmtDate(ex.date)} · ${hijri(ex.date)}</div></div><img src="${logoL()}" alt=""></div>
    <div class="pinfo"><div>اسم الطالب: <span class="line">${opt.student ? esc(opt.student.name) : ''}</span></div><div>الفصل: <span class="line">${opt.student ? esc((classOf(opt.student) || {}).name || '') : esc(cls)}</span></div><div>الدرجة: <span class="score">${ans ? toAr(ex.total) : ''}</span> / ${toAr(ex.total)}</div></div>
    ${ex.note ? `<div class="pnote">${esc(ex.note)}</div>` : ''}
    ${(ex.subjects || []).map(s => `<div class="psec"><div class="psh"><span>${s.icon} ${esc(s.name)}</span><span class="pst">${toAr(s.total)} ${s.total > 2 ? 'درجات' : 'درجة'}</span></div>${(s.questions || []).map(q => qHTML(q, ++n, ans, s)).join('')}</div>`).join('')}
    <div class="rep-foot"><span>المعلم: ....................</span><span>المصحح: ....................</span><span>المشرف: ${esc(st.supervisor || '....................')}</span></div>
  </div>`;
}
const PAPER_CSS = `.paper{font-family:Tajawal,Arial,sans-serif;direction:rtl;color:#1f2a2a;background:#fff;padding:6px}
.paper .rep-head{display:flex;align-items:center;justify-content:space-between;border-bottom:3px double #c9a227;padding-bottom:8px;margin-bottom:10px}.paper .rep-head img{height:70px;max-width:140px;object-fit:contain}.paper .rep-head .c{text-align:center;flex:1}.paper .rep-head h2{margin:0;color:#0f5c55;font-size:20px}.paper .rep-head .c div{font-size:12px;color:#555}
.pinfo{display:flex;gap:14px;flex-wrap:wrap;border:1.5px solid #0f5c55;border-radius:12px;padding:8px 12px;margin-bottom:10px;font-size:14px}.pinfo>div{flex:1;min-width:160px}.pinfo .line{display:inline-block;min-width:150px;border-bottom:1px dotted #999}.pinfo .score{display:inline-block;min-width:40px;border:1.5px solid #c9a227;border-radius:8px;text-align:center}
.pnote{background:#fff8e1;border-radius:10px;padding:6px 10px;font-size:13px;margin-bottom:8px}
.psec{margin-bottom:12px;page-break-inside:auto}.psh{display:flex;justify-content:space-between;background:#0f5c55;color:#fff;border-radius:10px;padding:6px 12px;font-weight:800;font-size:15px}.pst{background:#c9a227;color:#3b2d00;border-radius:20px;padding:0 10px;font-size:13px}
.q{border-bottom:1px dashed #ddd;padding:8px 4px;page-break-inside:avoid}.qh{display:flex;gap:8px;align-items:flex-start}.qn{background:#e3f1ee;color:#0f5c55;border-radius:50%;min-width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;font-size:13px}.qt{flex:1;font-size:15px;line-height:1.9}.qt.qq{font-family:'Amiri Quran',Amiri,serif;font-size:19px}.qmark{font-size:11px;color:#8a6d0e;white-space:nowrap}
.qopts{display:flex;gap:14px;flex-wrap:wrap;margin:6px 34px 0 0}.qopts span{border:1.5px solid #bbb;border-radius:30px;padding:3px 16px;font-size:15px}.qopts.big span{font-size:26px;font-family:'Amiri Quran',Amiri,serif;padding:0 18px}.qopts span.ok{border-color:#2c8a4b;background:#e3f4e1;color:#2c7a28;font-weight:800;box-shadow:0 0 0 3px #2c8a4b33}
.qbig{display:flex;gap:12px;flex-wrap:wrap;margin:6px 34px 0 0}.qbig span{font-family:'Amiri Quran',Amiri,serif;font-size:28px;border:1px solid #e6e1d4;border-radius:10px;padding:0 12px;background:#fffdf5}
.qemo{font-size:30px;letter-spacing:4px;margin:6px 34px 0 0}
.obox{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:1.5px solid #777;border-radius:8px;font-style:normal;vertical-align:middle;color:#2c7a28;font-weight:800}.obox.big{width:56px;height:56px;font-size:28px;margin:6px 34px 0 0}
.qorder{display:flex;gap:16px;flex-wrap:wrap;margin:6px 34px 0 0;font-size:16px}
.qmatch{margin:6px 34px 0 0;border-collapse:collapse}.qmatch td{padding:6px 10px;font-size:20px}.qmatch .gap{width:160px;color:#2c7a28;font-size:15px;text-align:center}.qmatch .dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#333;vertical-align:middle}
.qseq{display:flex;gap:8px;align-items:center;margin:6px 34px 0 0;font-size:28px}
.qlines{margin:6px 34px 0 0}.qlines div{border-bottom:1px dotted #999;height:30px}
.qoral{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:6px 34px 0 0;font-size:13px}.qoral span{background:#f3f0e8;border-radius:8px;padding:2px 8px}.qoral .tick{background:none}
.ans{color:#2c7a28;font-weight:800;background:#e3f4e1;border-radius:8px;padding:1px 8px;display:inline-block;margin-top:4px}
.rep-foot{display:flex;justify-content:space-between;margin-top:20px;font-size:13px;color:#555}`;
(function () { const st = document.createElement('style'); st.textContent = PAPER_CSS + '\n@media print{.paper{padding:0}}'; document.head.appendChild(st); })();

/* ——— تصدير ——— */
function absolutize(html) { return html.replace(/src="(?!data:|http)/g, 'src="' + appBase()); }
function openPrint(html, title, landscape) {
  const w = window.open('', '_blank');
  w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>${esc(title || 'طباعة')}</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&family=Amiri+Quran&display=swap" rel="stylesheet"><link rel="stylesheet" href="${new URL('css/style.css', location.href)}"><style>${PAPER_CSS}body{background:#fff;padding:10px}@page{size:A4 ${landscape ? 'landscape' : ''};margin:10mm}.page-break{page-break-after:always}</style></head><body>${absolutize(html)}</body></html>`);
  w.document.close(); setTimeout(() => w.print(), 1100);
}
function downloadWord(html, name) {
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(name)}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]--><style>@page Section1{size:21cm 29.7cm;margin:1.5cm}div.Section1{page:Section1}body{direction:rtl;font-family:Arial}${PAPER_CSS}</style></head><body dir="rtl"><div class="Section1">${absolutize(html)}</div></body></html>`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿', doc], { type: 'application/msword' })); a.download = name + '.doc'; a.click();
}
async function downloadPDF(html, name, landscape) {
  toast('⏳ جاري إنشاء ملف PDF…', 4000);
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js');
    const holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + (landscape ? '1100px' : '780px') + ';background:#fff';
    holder.innerHTML = html; document.body.appendChild(holder);
    await new Promise(r => setTimeout(r, 400));
    await html2pdf().set({ margin: 8, filename: name + '.pdf', image: { type: 'jpeg', quality: .95 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' }, pagebreak: { mode: ['css', 'legacy'], avoid: '.q' } }).from(holder).save();
    holder.remove();
  } catch (e) { toast('تعذر إنشاء PDF — استخدم «طباعة» ثم «حفظ كـ PDF»'); }
}
function exportBar(getHTML, name, landscape) {
  const el = document.createElement('div'); el.className = 'row no-print';
  el.innerHTML = `<button class="btn" data-x="print">🖨️ طباعة</button><button class="btn light" data-x="pdf">📕 PDF</button><button class="btn light" data-x="word">📘 Word</button>`;
  el.onclick = e => { const b = e.target.closest('[data-x]'); if (!b) return; const h = getHTML(); if (b.dataset.x === 'print') openPrint(h, name, landscape); if (b.dataset.x === 'pdf') downloadPDF(h, name, landscape); if (b.dataset.x === 'word') downloadWord(h, name); };
  return el;
}
function showPaper(ex, answers) {
  const name = ex.title + (answers ? ' - نموذج الإجابة' : '');
  const m = modal({ title: (answers ? '✅ نموذج الإجابة' : '📄 نموذج الاختبار') + ' — ' + esc(ex.title), body: `<div style="background:#fff;border-radius:12px;padding:10px">${examPaperHTML(ex, { answers })}</div>`, wide: true, foot: exportBar(() => examPaperHTML(ex, { answers }), name) });
  return m;
}

/* ——— قائمة منسدلة متعددة الاختيار ——— */
function multiDrop(groups, selected, label, onChange) {
  const el = document.createElement('details'); el.className = 'mdrop';
  const sel = new Set(selected || []);
  const all = groups.flatMap(g => g.items.map(i => i.key));
  const sumTxt = () => sel.size ? `✔️ ${label}: ${sel.size === all.length ? 'الكل' : sel.size}` : `— اختر ${label} —`;
  el.innerHTML = `<summary class="inp">${sumTxt()}</summary><div class="mpanel"><div class="row" style="margin-bottom:6px"><input class="inp grow" placeholder="بحث" data-ms><button type="button" class="btn sm light" data-mall>تحديد الكل</button><button type="button" class="btn sm ghost" data-mnone>إلغاء</button></div>
    ${groups.map((g, gi) => `<div class="mgrp" data-g="${gi}">${g.name ? `<div class="mgh"><label><input type="checkbox" data-gall="${gi}"> <b>${esc(g.name)}</b></label></div>` : ''}${g.items.map(i => `<label class="mit" data-n="${esc(Q.norm(i.t))}"><input type="checkbox" value="${esc(i.key)}" ${sel.has(i.key) ? 'checked' : ''}> ${esc(i.t)}</label>`).join('')}</div>`).join('')}
    <button type="button" class="btn sm block" data-mok style="margin-top:6px">✔️ تم</button></div>`;
  const sync = () => { $$('.mit input', el).forEach(c => c.checked = sel.has(c.value)); $$('[data-gall]', el).forEach(c => { const g = groups[+c.dataset.gall]; c.checked = g.items.every(i => sel.has(i.key)); }); $('summary', el).textContent = sumTxt(); onChange([...sel]); };
  el.addEventListener('change', e => { const t = e.target; if (t.dataset.gall != null) groups[+t.dataset.gall].items.forEach(i => t.checked ? sel.add(i.key) : sel.delete(i.key)); else if (t.value && t.type === 'checkbox') t.checked ? sel.add(t.value) : sel.delete(t.value); sync(); });
  el.addEventListener('click', e => { if (e.target.closest('[data-mall]')) { all.forEach(k => sel.add(k)); sync(); } if (e.target.closest('[data-mnone]')) { sel.clear(); sync(); } if (e.target.closest('[data-mok]')) el.open = false; });
  $('[data-ms]', el).oninput = e => { const q = Q.norm(e.target.value); $$('.mit', el).forEach(l => l.style.display = l.dataset.n.includes(q) ? '' : 'none'); };
  sync();
  return el;
}
document.addEventListener('click', e => { $$('details.mdrop[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; }); });
