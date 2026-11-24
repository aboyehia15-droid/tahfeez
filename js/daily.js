/* ===================== المتابعة اليومية ===================== */
const ATT = { p: ['حاضر', 'p'], a: ['غائب', 'a'], l: ['متأخر', 'l'], e: ['مستأذن', 'e'] };
const ERR_TYPES = ['نسيان', 'خطأ في الحركة', 'خطأ في الحرف', 'تجويد', 'تردد', 'تلقين', 'خلط بين الآيات'];
let DAY = { cls: '', date: '' };

function classSubjects(c) { const f = features(); return (c && c.subjects || ['quran', 'noor', 'zad']).filter(s => isCur(s) || f[s]); }
function lastRec(sid, before, key) { const rs = S.data.records.filter(r => r.studentId === sid && r.date < before && r[key] && (key !== 'noor' ? r[key].s1 : r[key].lesson)).sort((a, b) => a.date < b.date ? 1 : -1); return rs[0]; }

function recSummary(r, subj) {
  if (!r) return '<span class="chip gray">لم يُسجَّل</span>';
  if (r.att === 'a') return '<span class="chip red">غائب</span>';
  if (r.att === 'e') return '<span class="chip blue">مستأذن</span>';
  const out = [];
  if (subj.includes('quran') && hasSeg(r.hifz)) out.push(`<span class="chip">📖 ${segText(r.hifz)} · ${num(r.hifz.pages)}و</span>${gradeChip(r.hifz.grade)}`);
  if (subj.includes('quran') && hasSeg(r.review)) out.push(`<span class="chip blue">🔁 ${segText(r.review)} · ${num(r.review.pages)}و</span>${gradeChip(r.review.grade)}`);
  if (subj.includes('quran') && hasSeg(r.far)) out.push(`<span class="chip" style="background:#efe7fb;color:#5b3fb0">🕰️ ${segText(r.far)} · ${num(r.far.pages)}و</span>${gradeChip(r.far.grade)}`);
  subj.filter(isCur).forEach(cid => { const x = (r.cur || {})[cid]; if (x && x.lesson) out.push(curChip(cid, x)); });
  if (subj.includes('noor') && r.noor && r.noor.lesson) out.push(`<span class="chip gold">🔤 ${noorText(r.noor)}</span>${gradeChip(r.noor.grade)}`);
  if (subj.includes('noor') && r.noorRev) out.push(`<span class="chip gold">🔁🔤 مراجعة ${(r.noorRev.lessons || []).length} درس</span>${gradeChip(r.noorRev.grade)}`);
  if (subj.includes('zad') && r.zadRev) out.push(`<span class="chip" style="background:#fbe7ee;color:#a3325a">🔁🌸 مراجعة ${(r.zadRev.items || []).length}</span>`);
  Object.keys(r.curRev || {}).forEach(cid => { const c = curById(cid); if (c && subj.includes(cid)) out.push(`<span class="chip" style="background:${c.color}22;color:${c.color}">🔁${c.icon} مراجعة ${(r.curRev[cid].lessons || []).length}</span>`); });
  if (subj.includes('zad') && r.zad && r.zad.length) out.push(`<span class="chip" style="background:#fbe7ee;color:#a3325a">🌸 ${r.zad.length} من زاد الطفل</span>`);
  if (r.errors && r.errors.length) out.push(`<span class="chip red">✏️ ${r.errors.filter(e => !e.fixed).length}/${r.errors.length} خطأ</span>`);
  if (r.behavior) out.push(stars(r.behavior));
  if (r.note) out.push('<span class="chip gray">📝 ملاحظة</span>');
  return out.join(' ') || '<span class="chip green">حاضر</span>';
}
function dailySummaryText(r) {
  if (!r) return '';
  if (r.att === 'a') return 'غائب';
  const L = [];
  if (r.att === 'l') L.push('⏰ متأخر');
  if (hasSeg(r.hifz)) L.push('📖 الحفظ: ' + segText(r.hifz) + (r.hifz.grade ? ' — ' + gradeLabel(r.hifz.grade) : ''));
  if (hasSeg(r.review)) L.push('🔁 المراجعة: ' + segText(r.review) + (r.review.grade ? ' — ' + gradeLabel(r.review.grade) : ''));
  if (hasSeg(r.far)) L.push('🕰️ المراجعة البعيدة: ' + segText(r.far) + (r.far.grade ? ' — ' + gradeLabel(r.far.grade) : ''));
  Object.keys(r.cur || {}).forEach(cid => { const t = curLine(cid, r.cur[cid]); if (t) L.push(t); });
  if (r.noor && r.noor.lesson) L.push('🔤 النورانية: ' + noorText(r.noor, true) + (r.noor.grade ? ' — ' + gradeLabel(r.noor.grade) : ''));
  if (r.noorRev) L.push('🔁 مراجعة النورانية: ' + noorRevText(r.noorRev) + (r.noorRev.grade ? ' — ' + gradeLabel(r.noorRev.grade) : ''));
  if (r.zadRev) L.push('🔁 مراجعة زاد الطفل: ' + zadRevText(r.zadRev) + (r.zadRev.grade ? ' — ' + gradeLabel(r.zadRev.grade) : ''));
  Object.keys(r.curRev || {}).forEach(cid => { const c = curById(cid); if (c) L.push('🔁 مراجعة ' + c.name + ': ' + curRevText(cid, r.curRev[cid]) + (r.curRev[cid].grade ? ' — ' + gradeLabel(r.curRev[cid].grade) : '')); });
  (r.zad || []).forEach(z => { const c = zadCurriculum().find(c => c.id === z.cat); L.push('🌸 ' + (c ? c.name : '') + ': ' + z.item + (z.grade ? ' — ' + gradeLabel(z.grade) : '')); });
  const errs = (r.errors || []).filter(e => !e.fixed); if (errs.length) L.push('✏️ أخطاء تحتاج مراجعة: ' + errs.length);
  if (r.note) L.push('📝 ' + r.note);
  return L.join('\n');
}

function viewDaily(v, sub) {
  const classes = myClasses();
  if (sub && byId('classes', sub)) DAY.cls = sub;
  if (!DAY.cls || !classes.some(c => c.id === DAY.cls)) DAY.cls = (classes[0] || {}).id || '';
  if (!DAY.date) DAY.date = todayISO();
  if (!classes.length) { v.innerHTML = `<div class="card empty"><span class="e">🏫</span>${canAdmin() ? 'أنشئ فصلاً ووزّع الطلاب عليه أولاً<br><br><a class="btn" href="#/classes">🏫 الفصول</a>' : 'لم يُسند إليك فصل بعد — راجع إدارة المجمع'}</div>`; return; }
  const c = byId('classes', DAY.cls); const subj = classSubjects(c);
  const list = studentsOfClass(DAY.cls);
  const recs = list.map(s => getRec(s.id, DAY.date));
  const pres = recs.filter(r => r && (r.att === 'p' || r.att === 'l')).length, abs = recs.filter(r => r && r.att === 'a').length;
  const pages = recs.reduce((a, r) => a + (r ? (+(r.hifz || {}).pages || 0) + (+(r.review || {}).pages || 0) + (+(r.far || {}).pages || 0) : 0), 0);
  const isWork = (S.settings.workDays || []).includes(parseISO(DAY.date).getDay());
  v.innerHTML = `
    <div class="daybar">
      <select class="inp" id="dcls" style="width:auto;font-weight:700">${classes.map(x => `<option value="${x.id}" ${x.id === DAY.cls ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
      <button class="btn sm light" id="dprev">▶</button><input type="date" class="inp" id="ddate" value="${DAY.date}" style="width:auto"><button class="btn sm light" id="dnext">◀</button>
      <span class="small muted">${dayName(DAY.date)} · ${hijri(DAY.date)}</span>${DAY.date !== todayISO() ? '<button class="btn sm ghost" id="dtoday">اليوم</button>' : ''}
      ${canEditClassSubjects(c) ? `<button class="btn sm light" id="dsubj" title="اختر المناهج التي تدرّسها في هذا الفصل">📚 مناهج فصلي <span class="chip" style="padding:0 7px">${subj.length}</span></button>` : ''}
      <span style="flex:1"></span><span class="chip green">حاضر ${pres}</span><span class="chip red">غائب ${abs}</span><span class="chip">${num(pages, 1)} وجه</span>
    </div>
    ${c && !c.subjSet && canEditClassSubjects(c) && S.me && S.me.role === 'teacher' ? `<div class="card" style="background:#eef8f5;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="font-size:26px">📚</span><div style="flex:1;min-width:200px"><b>اختر مناهج فصلك</b><div class="small muted">حدد المواد والمناهج التي تدرّسها في «${esc(c.name)}» لتظهر وحدها في المتابعة والتقارير والاختبارات وصفحة ولي الأمر.</div></div><button class="btn" id="dsubjhint">📚 اختيار المناهج</button></div>` : ''}
    ${!isWork ? '<div class="card small" style="background:#fff8e1">ℹ️ هذا اليوم ليس من أيام الدراسة المحددة في الإعدادات — يمكنك التسجيل مع ذلك.</div>' : ''}
    <div class="row" style="margin-bottom:10px"><button class="btn sm" id="allp">✅ الكل حاضر</button><button class="btn sm light" id="absWa">💬 إشعار الغائبين</button><button class="btn sm light" id="dailyWa">📤 إرسال تقارير اليوم</button><a class="btn sm light" href="#/reports/week/${DAY.cls}">🗓️ جدول الأسبوع</a></div>
    <div id="dlist">${list.map((s, i) => { const r = recs[i]; return `<div class="stu-card ${r && r.att === 'a' ? 'absent' : ''}" data-id="${s.id}">
      <div class="top"><div class="avatar" style="background:${colorOf(s.name)};width:38px;height:38px;font-size:16px">${initials(s.name)}</div><div class="nm" data-open>${esc(s.name)}</div>
      <div class="att">${Object.entries(ATT).map(([k, [t, cl]]) => `<button class="${cl} ${r && r.att === k ? 'on' : ''}" data-att="${k}">${t}</button>`).join('')}</div></div>
      <div class="sum" data-open>${recSummary(r, subj)} <button class="btn sm light" style="margin-inline-start:auto">✏️ تسجيل</button></div></div>`; }).join('') || '<div class="card empty"><span class="e">👦</span>لا يوجد طلاب في هذا الفصل<br><br>' + (canAdmin() ? '<a class="btn" href="#/classes">إضافة طلاب للفصل</a>' : '') + '</div>'}</div>`;
  $('#dcls').onchange = e => { DAY.cls = e.target.value; render(); };
  const dsb = $('#dsubj'); if (dsb) dsb.onclick = () => classSubjectsDialog(DAY.cls);
  const dsh = $('#dsubjhint'); if (dsh) dsh.onclick = () => classSubjectsDialog(DAY.cls);
  $('#ddate').onchange = e => { DAY.date = e.target.value || todayISO(); render(); };
  const step = d => { let x = DAY.date; for (let k = 0; k < 7; k++) { x = addDays(x, d); if ((S.settings.workDays || []).includes(parseISO(x).getDay())) break; } DAY.date = x; render(); };
  $('#dprev').onclick = () => step(-1); $('#dnext').onclick = () => step(1);
  const dt = $('#dtoday'); if (dt) dt.onclick = () => { DAY.date = todayISO(); render(); };
  $('#allp').onclick = () => { list.forEach(s => { const r = getRec(s.id, DAY.date) || newRec(s); if (!r.att) { r.att = 'p'; save('records', r); } }); render(); };
  $('#dlist').onclick = e => {
    const card = e.target.closest('.stu-card'); if (!card) return; const s = byId('students', card.dataset.id);
    const ab = e.target.closest('[data-att]');
    if (ab) { const r = getRec(s.id, DAY.date) || newRec(s); r.att = r.att === ab.dataset.att ? '' : ab.dataset.att; save('records', r); render(); return; }
    if (e.target.closest('[data-open]')) recordEditor(s, DAY.date);
  };
  $('#absWa').onclick = () => waCompose('absent', list.filter(s => (getRec(s.id, DAY.date) || {}).att === 'a'), { date: DAY.date });
  $('#dailyWa').onclick = () => waCompose('daily', list.filter(s => { const r = getRec(s.id, DAY.date); return r && r.att && r.att !== 'a'; }), { date: DAY.date }, '📤 تقارير يوم ' + fmtDate(DAY.date));
}
function newRec(s, date) { return { id: recId(s.id, date || DAY.date), studentId: s.id, classId: s.classId, date: date || DAY.date }; }

/* ——— محرر سجل الطالب اليومي ——— */
function recordEditor(s, date) {
  const c = classOf(s); const subj = classSubjects(c); const f = features();
  const orig = getRec(s.id, date);
  const r = JSON.parse(JSON.stringify(orig || newRec(s, date)));
  r.classId = s.classId; r.errors = r.errors || []; r.zad = r.zad || []; r.cur = r.cur || {}; r.media = r.media || []; r.curRev = r.curRev || {};
  if (!r.att) r.att = 'p';
  const body = document.createElement('div');
  const list = studentsOfClass(s.classId); const idx = list.findIndex(x => x.id === s.id); const next = list[idx + 1];
  const m = modal({ title: `${esc(s.name)} <span class="small muted">— ${fmtDate(date)}</span>`, body, wide: true,
    foot: `<button class="btn" data-save>💾 حفظ</button>${next ? `<button class="btn gold" data-next>💾 حفظ والتالي ◀</button>` : ''}<button class="btn wa" data-wa title="إرسال تقرير اليوم">💬</button><span style="flex:1"></span>${orig ? '<button class="btn ghost" data-del>🗑️</button>' : ''}` });

  const RECSUBS = ['hifz', 'review', 'far', 'noor', 'zad'];
  const sec = (id, title, inner, mic) => `<div class="sec" id="sec-${id}"><div class="sec-h">${title}<span class="sp"></span>${RECSUBS.includes(id) ? recButtons(id) : ''}${mic && f.voice && speechSupported() ? `<button type="button" class="mic" data-mic="${id}" title="إدخال صوتي">🎤</button>` : ''}</div>${inner}${RECSUBS.includes(id) ? `<div class="sub-errbox" data-eb="${id}"></div>` : ''}${RECSUBS.includes(id) ? `<div data-mlist="${id}">${mediaListHTML(r.media, true, id)}</div>` : ''}</div>`;
  body.innerHTML = `
    <div class="sec"><div class="sec-h">الحضور</div><div class="att" id="eatt" style="flex-wrap:wrap">${Object.entries(ATT).map(([k, [t, cl]]) => `<button class="${cl} ${r.att === k ? 'on' : ''}" data-att="${k}" style="padding:8px 16px;font-size:16px">${t}</button>`).join('')}</div></div>
    <div id="eb"></div>`;
  const eb = $('#eb', body);
  const drawBody = () => {
    syncCurErrs();
    if (r.att === 'a' || r.att === 'e') { eb.innerHTML = `<div class="sec">${r.att === 'a' ? '❌ الطالب غائب' : 'ℹ️ الطالب مستأذن'} — <span class="muted">لا يُسجَّل له حفظ أو مراجعة.</span><div class="field" style="margin-top:8px"><label>ملاحظة (اختياري)</label><textarea class="inp" id="enote">${esc(r.note || '')}</textarea></div></div>`; $('#enote', eb).oninput = e => r.note = e.target.value; return; }
    let h = '';
    if (subj.includes('quran')) {
      const lh = lastRec(s.id, date, 'hifz'), lr = lastRec(s.id, date, 'review'), lf = lastRec(s.id, date, 'far');
      const sugH = lh ? suggestNext(lastSeg(lh.hifz), s.direction || S.settings.directionDefault) : null;
      const memo = memorizedSet(allRecsOf(s.id).filter(x => x.date < date)); const prog = surahProgress(memo);
      const memChips = k => { const done = JUZ_LIST.flatMap(j => j.surahs).filter(n => prog[n - 1] > 0); return done.length ? `<div class="small" style="margin:6px 0"><span class="muted">${k === 'hifz' ? 'السور المحفوظة سابقاً:' : 'اختر من محفوظه:'}</span> ${done.map(n => `<button type="button" class="chip ${prog[n - 1] >= 1 ? '' : 'gold'}" style="border:0;cursor:pointer;margin:2px" data-msur="${k}|${n}" title="${Math.round(prog[n - 1] * 100)}%">${Q.names[n - 1]}${prog[n - 1] < 1 ? ' ½' : ''}</button>`).join('')}</div>` : ''; };
      h += sec('hifz', '📖 الحفظ الجديد', `${lh ? `<div class="small muted" style="margin-bottom:6px">آخر حفظ (${fmtDate(lh.date, false)}): <b>${segText(lh.hifz)}</b> ${gradeChip(lh.hifz.grade)}${sugH && !(hasSeg(r.hifz)) ? ` <button class="btn sm gold" data-sug="hifz">↩️ متابعة: ${Q.rangeText(sugH)}</button>` : ''}</div>` : ''}<div data-rp="hifz"></div>${memChips('hifz')}<div class="voice-text" data-vt="hifz" hidden></div><div style="margin-top:8px">${gradeButtons((r.hifz || {}).grade, 'hifz')}</div><div data-ab="hifz"></div>`, true);
      h += sec('review', '🔁 المراجعة القريبة', `${lr ? `<div class="small muted" style="margin-bottom:6px">آخر مراجعة (${fmtDate(lr.date, false)}): <b>${segText(lr.review)}</b>${!(hasSeg(r.review)) ? ` <button class="btn sm light" data-sug="review">↩️ نفس المقطع</button>` : ''}${lh && !(hasSeg(r.review)) ? ` <button class="btn sm light" data-sug="review-h">📖 مراجعة آخر حفظ</button>` : ''}</div>` : ''}<div data-rp="review"></div>${memChips('review')}<div class="voice-text" data-vt="review" hidden></div><div style="margin-top:8px">${gradeButtons((r.review || {}).grade, 'review')}</div><div data-ab="review"></div>`, true);
      h += sec('far', '🕰️ المراجعة البعيدة', `${lf ? `<div class="small muted" style="margin-bottom:6px">آخر مراجعة بعيدة (${fmtDate(lf.date, false)}): <b>${segText(lf.far)}</b>${!(hasSeg(r.far)) ? ` <button class="btn sm light" data-sug="far">↩️ ما بعدها</button>` : ''}</div>` : ''}<div data-rp="far"></div>${memChips('far')}<div class="voice-text" data-vt="far" hidden></div><div style="margin-top:8px">${gradeButtons((r.far || {}).grade, 'far')}</div><div data-ab="far"></div>`, true);
    }
    if (subj.includes('noor')) {
      const ln = lastRec(s.id, date, 'noor'); r.noor = r.noor || {};
      h += sec('noor', '🔤 القاعدة النورانية', `${ln ? `<div class="small muted" style="margin-bottom:6px">آخر تسجيل: <b>الدرس ${ln.noor.lesson}</b> ${ln.noor.from ? '(' + ln.noor.from + '–' + ln.noor.to + ')' : ''} ${gradeChip(ln.noor.grade)}${!r.noor.lesson ? ` <button class="btn sm gold" data-sug="noor">↩️ متابعة</button>` : ''}</div>` : ''}
        <select class="inp" id="nles"><option value="">— اختر الدرس —</option>${NOORANIA.map((l, i) => `<option value="${i + 1}" ${r.noor.lesson == i + 1 ? 'selected' : ''}>${i + 1}. ${esc(l.title.replace(/^الدرس\s*\S+\s*-?\s*/, ''))}</option>`).join('')}</select>
        <div class="voice-text" data-vt="noor" hidden></div><div id="nitems" style="margin-top:8px"></div>${noorExtrasHTML(r.noor)}<div style="margin-top:8px">${gradeButtons(r.noor.grade, 'noor')}</div>`, true);
      r.noorRev = r.noorRev || { lessons: [] };
      h += sec('noorRev', '🔁 مراجعة دروس النورانية', `<div class="small muted" style="margin-bottom:6px">اختر الدروس التي راجعها الطالب اليوم</div><div data-mrev="noor"></div><div style="margin-top:8px">${gradeButtons(r.noorRev.grade, 'noorRev')}</div>`);
    }
    if (subj.includes('zad')) {
      h += sec('zad', '🌸 زاد الطفل المسلم', zadCurriculum().map(cat => { const cur = r.zad.filter(z => z.cat === cat.id); return `<div class="zad-cat"><div class="t"><span>${cat.icon}</span>${esc(cat.name)}<span style="flex:1"></span><select class="inp" data-zadd="${cat.id}" style="width:auto;max-width:60%;font-size:15px"><option value="">➕ إضافة بند…</option>${cat.items.map(it => `<option>${esc(it)}</option>`).join('')}</select></div>${cur.map(z => `<div class="row" style="margin:4px 0"><span style="flex:1;min-width:120px">• ${esc(z.item)}</span>${gradeButtons(z.grade, 'zad|' + cat.id + '|' + z.item).replace('class="grades"', 'class="grades" style="flex:2"')}<button class="btn sm ghost" data-zdel="${cat.id}|${esc(z.item)}">✕</button></div>`).join('')}</div>`; }).join(''));
      r.zadRev = r.zadRev || { items: [] };
      h += sec('zadRev', '🔁 مراجعة زاد الطفل', `<div class="small muted" style="margin-bottom:6px">اختر ما راجعه الطالب من الآداب والأذكار والأحاديث…</div><div data-mrev="zad"></div><div style="margin-top:8px">${gradeButtons(r.zadRev.grade, 'zadRev')}</div>`);
    }
    window.DAILY_MEDIA = r.media; window.DAILY_REV = r.curRev; subj.filter(isCur).forEach(cid => { h += curEditorHTML(cid, r.cur[cid], s.id, date); });
    h += `<div class="sec"><div class="sec-h">🎙️ تسجيل عام<span class="sp"></span>${recButtons('')}</div><div id="emedia">${mediaListHTML(r.media, true, '') || '<div class="small muted">لكل مادة زرّا 🎙️ و🎥 في رأسها لتسجيل تسميعها، وهنا تسجيل عام لليوم. اختر «إرسال لولي الأمر» ليظهر في صفحة ابنه تحت المادة.</div>'}</div></div>`;
    h += sec('note', '📝 ملاحظات المعلم', `${f.behavior ? `<div class="row" style="margin-bottom:8px"><span>السلوك والانضباط:</span><span id="beh">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-b="${n}" style="border:0;background:none;font-size:30px;cursor:pointer;color:${(r.behavior || 0) >= n ? '#e2b93b' : '#ddd'}">★</button>`).join('')}</span></div>` : ''}<textarea class="inp" id="enote" placeholder="ملاحظة تظهر لولي الأمر في صفحة الطالب">${esc(r.note || '')}</textarea>
      <div class="row small" style="margin-top:6px">${['أحسنت، ممتاز 👏', 'يحتاج مراجعة في البيت', 'تحسن ملحوظ', 'يحتاج تركيزاً أكثر', 'نرجو الحرص على الحضور مبكراً'].map(t => `<button type="button" class="chip" data-qn="${t}" style="border:0;cursor:pointer">${t}</button>`).join('')}</div>`);
    eb.innerHTML = h;
    // مكونات اختيار المقطع
    ['hifz', 'review', 'far'].forEach(k => {
      const host = $(`[data-rp="${k}"]`, eb); if (!host) return;
      r[k] = r[k] || {};
      const rp = rangePicker(r[k], rr => { r[k] = Object.assign(r[k], rr); drawAyahs(k); updTotal(k); });
      host.appendChild(rp); host._rp = rp;
      const ex = document.createElement('div'); ex.dataset.extra = k; host.after(ex); drawExtras(k); drawAyahs(k);
    });
    drawNoor(); drawErrs();
    const mR = (key, groups, cur, onCh) => { const hh = $(`[data-mrev="${key}"]`, eb); if (hh) hh.appendChild(multiDrop(groups, cur, 'الدروس', onCh)); };
    if (r.noorRev) mR('noor', [{ name: '', items: NOORANIA.map((l, i) => ({ key: String(i + 1), t: (i + 1) + '. ' + l.title.replace(/^الدرس\s*\S+\s*-?\s*/, '') })) }], (r.noorRev.lessons || []).map(String), k => r.noorRev.lessons = k.map(Number));
    if (r.zadRev) mR('zad', zadCurriculum().map(c => ({ name: c.icon + ' ' + c.name, items: c.items.map(it => ({ key: c.id + '|' + it, t: it })) })), r.zadRev.items || [], k => r.zadRev.items = k);
    subj.filter(isCur).forEach(cid => { r.curRev[cid] = r.curRev[cid] || { lessons: [] }; mR(cid, [{ name: '', items: curById(cid).lessons.map((l, i) => ({ key: String(i + 1), t: (i + 1) + '. ' + l.t })) }], (r.curRev[cid].lessons || []).map(String), k => r.curRev[cid].lessons = k.map(Number)); });
    bindGrades(eb, (name, g) => {
      if (name === 'noorRev') { r.noorRev.grade = g; return; }
      if (name === 'zadRev') { r.zadRev.grade = g; return; }
      if (name.startsWith('crev|')) { const cid = name.slice(5); r.curRev[cid] = r.curRev[cid] || { lessons: [] }; r.curRev[cid].grade = g; return; }
      if (name === 'hifz' || name === 'review' || name === 'far') { r[name] = r[name] || {}; r[name].grade = g; }
      else if (name.startsWith('cur|')) { const cid = name.slice(4); r.cur[cid] = r.cur[cid] || {}; r.cur[cid].grade = g; }
      else if (name === 'noor') r.noor.grade = g;
      else if (name.startsWith('zad|')) { const [, cat, item] = name.split('|'); const z = r.zad.find(z => z.cat === cat && z.item === item); if (z) z.grade = g; }
    });
  };
  function updTotal(k) { const el = $(`[data-segtot="${k}"]`, eb); if (el) { const n = segs(r[k]).length; el.innerHTML = n > 1 ? `<span class="pages-badge">المجموع: ${num(segPages(r[k]))} وجه</span> <span class="small muted">${esc(segText(r[k]))}</span>` : ''; } }
  function drawExtras(k) {
    const host = $(`[data-extra="${k}"]`, eb); if (!host) return; host.innerHTML = '';
    r[k].extra = r[k].extra || [];
    r[k].extra.forEach((seg, i) => {
      const box = document.createElement('div'); box.className = 'seg-box';
      box.innerHTML = `<div class="row small" style="margin-bottom:4px"><b>➕ مقطع ${i + 2}</b><span style="flex:1"></span><button type="button" class="btn sm ghost" data-rmseg="${i}">✕ حذف المقطع</button></div>`;
      box.appendChild(rangePicker(seg, rr => { Object.assign(seg, rr); drawAyahs(k); updTotal(k); }));
      $('[data-rmseg]', box).onclick = () => { r[k].extra.splice(i, 1); drawExtras(k); drawAyahs(k); updTotal(k); };
      host.appendChild(box);
    });
    const add = document.createElement('div'); add.className = 'row'; add.style.margin = '6px 0';
    add.innerHTML = `<button type="button" class="btn sm light">➕ إضافة سورة / مقطع آخر</button><span data-segtot="${k}"></span>`;
    $('button', add).onclick = () => { r[k].extra.push({}); drawExtras(k); };
    host.appendChild(add); updTotal(k);
  }
  function drawAyahs(k) {
    const host = $(`[data-ab="${k}"]`, eb); if (!host) return;
    const errs = r.errors.filter(e => e.sub === k);
    host.innerHTML = segAyahBoxes(r[k], errs);
    $$('.ayah-box', host).forEach(box => box.onclick = e => { const w = e.target.closest('.w'); if (!w) return; const s1 = +w.dataset.s, a1 = +w.dataset.a, wi = +w.dataset.w; const ex = r.errors.find(x => x.sub === k && x.s == s1 && x.a == a1 && x.w == wi); if (ex) { if (!ex.fixed) ex.fixed = true; else r.errors = r.errors.filter(x => x !== ex); } else r.errors.push({ id: uid('e'), sub: k, s: s1, a: a1, w: wi, word: wordOf(s1, a1, wi), type: 'نسيان', note: '' }); drawAyahs(k); drawErrs(); });
  }
  function drawNoor() {
    const host = $('#nitems', eb); if (!host) return;
    const L = r.noor.lesson ? NOORANIA[r.noor.lesson - 1] : null;
    if (!L) { host.innerHTML = '<span class="small muted">اختر الدرس ثم اضغط على أول بند وآخر بند قرأه الطالب، واضغط مطولاً (أو مرتين) على البند الذي أخطأ فيه.</span>'; return; }
    const from = r.noor.from || 0, to = r.noor.to || 0; const errs = r.errors.filter(e => e.sub === 'noor' && e.lesson == r.noor.lesson);
    host.innerHTML = `<div class="row small" style="margin-bottom:6px"><span class="chip gold">${esc(L.title)}</span>${from ? `<span class="chip">من ${from} إلى ${to} (${Math.abs(to - from) + 1} بند)</span>` : '<span class="muted">اضغط أول بند ثم آخر بند</span>'}<button type="button" class="btn sm ghost" id="nall">الدرس كاملاً</button><label class="row"><input type="checkbox" id="nerrmode" ${host._errMode ? 'checked' : ''}> وضع تحديد الأخطاء</label></div>
      <div class="noor-items">${L.items.map((it, i) => { const n = i + 1; const inR = from && n >= Math.min(from, to) && n <= Math.max(from, to); const er = errs.find(e => e.item === n); return `<button type="button" data-n="${n}" class="${er ? 'err' : inR ? 'in' : ''}" title="${n}">${esc(it)}</button>`; }).join('')}</div>`;
    $('#nall', host).onclick = () => { r.noor.from = 1; r.noor.to = L.items.length; drawNoor(); };
    $('#nerrmode', host).onchange = e => { host._errMode = e.target.checked; };
    let pressT;
    const toggleErr = n => { const ex = r.errors.find(e => e.sub === 'noor' && e.lesson == r.noor.lesson && e.item === n); if (ex) r.errors = r.errors.filter(e => e !== ex); else r.errors.push({ id: uid('e'), sub: 'noor', lesson: r.noor.lesson, item: n, word: L.items[n - 1], type: 'خطأ في الحرف', note: '' }); drawNoor(); drawErrs(); };
    $('.noor-items', host).onclick = e => { const b = e.target.closest('button'); if (!b) return; const n = +b.dataset.n; if (host._errMode || b._long) { b._long = false; if (host._errMode) toggleErr(n); return; } if (!r.noor.from || (r.noor.from && r.noor.to && r.noor._picked)) { r.noor.from = n; r.noor.to = n; r.noor._picked = false; } else { r.noor.to = n; r.noor._picked = true; } drawNoor(); };
    $('.noor-items', host).ondblclick = e => { const b = e.target.closest('button'); if (b) toggleErr(+b.dataset.n); };
    $$('.noor-items button', host).forEach(b => { b.addEventListener('touchstart', () => { pressT = setTimeout(() => { b._long = true; toggleErr(+b.dataset.n); }, 550); }, { passive: true }); b.addEventListener('touchend', () => clearTimeout(pressT)); });
  }
  function syncCurErrs() {
    r.errors = r.errors || [];
    Object.keys(r.cur || {}).forEach(cid => {
      const x = r.cur[cid], c = curById(cid); if (!c) return; const L = x && x.lesson ? c.lessons[x.lesson - 1] : null;
      r.errors = r.errors.filter(e => !(e.sub === cid && e.item != null && !(L && e.lesson == x.lesson && (x.errs || []).includes(e.item))));
      if (L) (x.errs || []).forEach(i => { if (!r.errors.some(e => e.sub === cid && e.lesson == x.lesson && e.item === i)) r.errors.push({ id: uid('e'), sub: cid, lesson: x.lesson, item: i, word: L.items[i], type: 'يحتاج تدريباً', note: '' }); });
    });
    r.errors = r.errors.filter(e => !(isCur(e.sub) && e.item != null && !(r.cur[e.sub] && r.cur[e.sub].lesson)));
  }
  const typesFor = sub => ['hifz', 'review', 'far'].includes(sub) ? ERR_TYPES : sub === 'noor' ? ['خطأ في الحرف', 'خطأ في الحركة', 'خطأ في المد', 'نسيان', 'تردد', 'تلقين'] : ['يحتاج تدريباً', 'نسيان', 'خطأ في النطق', 'خطأ في الكتابة', 'خطأ في الحفظ', 'تردد', 'تلقين'];
  const HINT = { hifz: 'اضغط على الكلمة الخاطئة في نص الآيات أعلاه، أو أضف الخطأ يدوياً.', review: 'اضغط على الكلمة الخاطئة في نص الآيات أعلاه، أو أضف الخطأ يدوياً.', far: 'اضغط على الكلمة الخاطئة في نص الآيات أعلاه، أو أضف الخطأ يدوياً.', noor: 'اضغط مرتين على البند الخاطئ (أو فعّل وضع تحديد الأخطاء)، أو أضف الخطأ يدوياً.' };
  function drawErrs() {
    $$('[data-eb]', eb).forEach(host => {
      const sub = host.dataset.eb; const list = r.errors.map((e, i) => [e, i]).filter(([e]) => e.sub === sub);
      const T = typesFor(sub);
      host.innerHTML = `<div class="sub-errs-ed"><div class="row small" style="margin-bottom:4px"><b style="color:#b4232f">✏️ الأخطاء والتصويب${list.length ? ` (${list.filter(([e]) => !e.fixed).length}/${list.length})` : ''}</b><span style="flex:1"></span><button type="button" class="btn sm light" data-eadd="${sub}">➕ إضافة خطأ</button></div>
        ${list.length ? `<div class="err-list">${list.map(([e, i]) => `<div class="e ${e.fixed ? 'fixed' : ''}"><div style="flex:1"><div class="small"><b>${errPlace(e) || '—'}</b></div><div class="row" style="margin-top:4px"><select class="inp" data-et="${i}" style="width:auto;font-size:14px;padding:5px">${(T.includes(e.type) || !e.type ? T : [e.type].concat(T)).map(t => `<option ${e.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select><input class="inp grow" data-en="${i}" placeholder="التصويب / ملاحظة" value="${esc(e.note || '')}" style="font-size:15px;padding:6px"></div></div><label class="small row" style="white-space:nowrap"><input type="checkbox" data-ef="${i}" ${e.fixed ? 'checked' : ''}> صُوِّب</label><button type="button" class="btn sm ghost" data-ed="${i}">✕</button></div>`).join('')}</div>` : `<div class="small muted">${HINT[sub] || (isCur(sub) ? 'اضغط مرتين على البند الذي أخطأ فيه (أو فعّل وضع تحديد الأخطاء)، أو أضف الخطأ يدوياً.' : 'لا توجد أخطاء — أضف الخطأ يدوياً إن وُجد.')}</div>`}</div>`;
      host.oninput = e => { const t = e.target; if (t.dataset.et) r.errors[+t.dataset.et].type = t.value; if (t.dataset.en) r.errors[+t.dataset.en].note = t.value; };
      host.onchange = e => { const t = e.target; if (t.dataset.ef) { r.errors[+t.dataset.ef].fixed = t.checked; redrawErrs(); } };
      host.onclick = e => {
        const d = e.target.closest('[data-ed]'); if (d) { const er = r.errors[+d.dataset.ed]; if (isCur(er.sub) && er.item != null && r.cur[er.sub]) r.cur[er.sub].errs = (r.cur[er.sub].errs || []).filter(v => v !== er.item); r.errors.splice(+d.dataset.ed, 1); if (isCur(er.sub)) drawBody(); else redrawErrs(); return; }
        const ad = e.target.closest('[data-eadd]'); if (ad) addErrorManual(ad.dataset.eadd);
      };
    });
  }
  function redrawErrs() { drawErrs(); ['hifz', 'review', 'far'].forEach(drawAyahs); drawNoor(); }
  function addErrorManual(k) {
    let pick = '';
    if (['hifz', 'review', 'far'].includes(k) && hasSeg(r[k])) { const set = segAyahs(r[k]); pick = `<div class="field"><label>الآية</label><select class="inp" id="xa">${set.map(kk => { const [ss, aa] = Q.absToSA(kk); return `<option value="${ss}|${aa}">${Q.names[ss - 1]} ${aa}</option>`; }).join('')}</select></div>`; }
    else if (k === 'noor' && r.noor && r.noor.lesson) { const segsN = noorSegs(r.noor); pick = `<div class="field"><label>البند</label><select class="inp" id="xi"><option value="">— عام —</option>${segsN.map(g => { const N = NOORANIA[g.lesson - 1]; return N.items.map((it, j) => `<option value="${g.lesson}|${j + 1}">د${g.lesson}: ${esc(it)}</option>`).join(''); }).join('')}</select></div>`; }
    else if (k === 'zad' && (r.zad || []).length) pick = `<div class="field"><label>البند</label><select class="inp" id="xz">${r.zad.map(z => `<option>${esc(z.item)}</option>`).join('')}</select></div>`;
    else if (isCur(k) && r.cur[k] && r.cur[k].lesson) { const c = curById(k); const ls = curSegs(r.cur[k]); pick = `<div class="field"><label>البند</label><select class="inp" id="xc"><option value="">— عام —</option>${ls.map(g => { const L = c.lessons[g.lesson - 1] || { items: [] }; return L.items.map((it, j) => `<option value="${g.lesson}|${j}">${esc(curShort(L.t))}: ${esc(it)}</option>`).join(''); }).join('')}</select></div>`; }
    const T = typesFor(k);
    const mm = modal({ title: '✏️ إضافة خطأ — ' + esc(errSubName(k)), body: `${pick}<div class="field"><label>نوع الخطأ</label><select class="inp" id="xt">${T.map(t => `<option>${t}</option>`).join('')}</select></div><div class="field"><label>الخطأ والتصويب</label><input class="inp" id="xn" placeholder="${['hifz', 'review', 'far'].includes(k) ? 'مثال: قرأ «الرحيم» بدل «الرحمن»' : 'مثال: نطق الحرف خطأ، والصواب…'}"></div>`, foot: '<button class="btn" data-ok>إضافة</button>' });
    $('[data-ok]', mm.el).onclick = () => {
      const e = { id: uid('e'), sub: k, type: $('#xt', mm.el).value, note: $('#xn', mm.el).value };
      const xa = $('#xa', mm.el); if (xa) { const [ss, aa] = xa.value.split('|').map(Number); e.s = ss; e.a = aa; }
      const xi = $('#xi', mm.el); if (k === 'noor') { e.lesson = r.noor.lesson; if (xi && xi.value) { const [l, n] = xi.value.split('|').map(Number); e.lesson = l; e.item = n; e.word = NOORANIA[l - 1].items[n - 1]; } }
      const xz = $('#xz', mm.el); if (xz) e.word = xz.value;
      const xc = $('#xc', mm.el); if (isCur(k) && r.cur[k]) { e.lesson = r.cur[k].lesson; if (xc && xc.value) { const [l, j] = xc.value.split('|').map(Number); e.lesson = l; e.word = curById(k).lessons[l - 1].items[j]; if (l == r.cur[k].lesson) { const x = r.cur[k]; x.errs = (x.errs || []).filter(v => v !== j).concat([j]); x.items = (x.items || []).filter(v => v !== j); e.item = j; } } }
      r.errors.push(e); mm.close(); if (isCur(k)) drawBody(); else redrawErrs();
    };
  }
  drawBody();
  // أحداث
  $('#eatt', body).onclick = e => { const b = e.target.closest('[data-att]'); if (!b) return; r.att = b.dataset.att; $$('#eatt button', body).forEach(x => x.classList.toggle('on', x === b)); drawBody(); };
  eb.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.nxl != null) { const e = r.noor.extra[+t.dataset.nxl]; e.lesson = +t.value || null; const L = e.lesson ? NOORANIA[e.lesson - 1] : null; e.from = L ? 1 : null; e.to = L ? L.items.length : null; drawBody(); return; }
    if (t.dataset.nxf != null) { r.noor.extra[+t.dataset.nxf].from = +t.value; return; }
    if (t.dataset.nxt != null) { r.noor.extra[+t.dataset.nxt].to = +t.value; return; }
    if (t.dataset.cxl) { const [cid, i] = t.dataset.cxl.split('|'); const e = r.cur[cid].extra[+i]; e.lesson = +t.value || null; e.items = e.lesson ? curById(cid).lessons[e.lesson - 1].items.map((_, j) => j) : []; drawBody(); return; }
    if (t.id === 'nles') { r.noor = { lesson: +t.value || null, grade: r.noor.grade }; drawNoor(); }
    if (t.dataset.cles) { r.cur[t.dataset.cles] = { lesson: +t.value || null, items: [], errs: [], grade: (r.cur[t.dataset.cles] || {}).grade }; drawBody(); }
    if (t.dataset.zadd) { if (t.value && !r.zad.some(z => z.cat === t.dataset.zadd && z.item === t.value)) r.zad.push({ cat: t.dataset.zadd, item: t.value, grade: 0 }); drawBody(); }
  });
  eb.addEventListener('input', e => { if (e.target.id === 'enote') r.note = e.target.value; });
  eb.addEventListener('click', e => {
    const t = e.target;
    const sg = t.closest('[data-sug]');
    if (sg) {
      const k = sg.dataset.sug;
      if (k === 'hifz') { const lh = lastRec(s.id, date, 'hifz'); const sug = suggestNext(lastSeg(lh.hifz), s.direction || S.settings.directionDefault); if (sug) $('[data-rp="hifz"]', eb)._rp.set(sug); sg.remove(); }
      if (k === 'review') { const lr = lastRec(s.id, date, 'review'); $('[data-rp="review"]', eb)._rp.set({ s1: lr.review.s1, a1: lr.review.a1, s2: lr.review.s2, a2: lr.review.a2 }); sg.remove(); }
      if (k === 'far') { const lf = lastRec(s.id, date, 'far'); const nx = suggestNext(lastSeg(lf.far), s.direction || S.settings.directionDefault); if (nx) $('[data-rp="far"]', eb)._rp.set(nx); sg.remove(); }
      if (k === 'review-h') { const lh = lastRec(s.id, date, 'hifz'); $('[data-rp="review"]', eb)._rp.set({ s1: lh.hifz.s1, a1: lh.hifz.a1, s2: lh.hifz.s2, a2: lh.hifz.a2 }); sg.remove(); }
      if (k === 'noor') { const ln = lastRec(s.id, date, 'noor'); const L = NOORANIA[ln.noor.lesson - 1]; let les = ln.noor.lesson, fr = (Math.max(ln.noor.from || 0, ln.noor.to || 0)) + 1; if (fr > L.items.length) { les = Math.min(NOORANIA.length, les + 1); fr = 1; } const len = Math.max(5, Math.abs((ln.noor.to || 0) - (ln.noor.from || 0)) + 1); r.noor = { lesson: les, from: fr, to: Math.min(NOORANIA[les - 1].items.length, fr + len - 1), grade: 0 }; drawBody(); }
      return;
    }
    const mic = t.closest('[data-mic]');
    if (mic) {
      const k = mic.dataset.mic; const vt = $(`[data-vt="${k}"]`, eb);
      listen(mic, (txt, fin) => {
        vt.hidden = false; vt.textContent = '🎤 ' + txt;
        if (!fin) return;
        if (k === 'noor') { const p = parseNoorSpeech(txt); if (!p) { vt.textContent += ' — لم أفهم الدرس، قل مثلاً: «الدرس الرابع من ١ إلى ٢٠»'; return; } r.noor = Object.assign(r.noor || {}, p); if (p.lesson && !p.from) { r.noor.from = 1; r.noor.to = NOORANIA[p.lesson - 1].items.length; } drawBody(); const v2 = $(`[data-vt="noor"]`, eb); v2.hidden = false; v2.textContent = '✔️ ' + txt; return; }
        const p = parseQuranSpeech(txt);
        if (!p) { vt.textContent += ' — لم أتعرف على اسم السورة، أعد المحاولة'; return; }
        const target = p.kind && p.kind !== k ? p.kind : k;
        $(`[data-rp="${target}"]`, eb)._rp.set(p);
        vt.textContent = '✔️ ' + txt + ' ← ' + Q.rangeText(p);
      });
      return;
    }
    const rb = t.closest('[data-rec]'); if (rb) { const sub = rb.dataset.rsub || ''; const NM = { hifz: 'حفظ', review: 'مراجعة', far: 'مراجعة بعيدة', noor: 'النورانية', zad: 'زاد الطفل' }; const rngs = { hifz: r.hifz, review: r.review, far: r.far }; let what = NM[sub] || (curById(sub) ? curById(sub).name : 'تسميع'); if (hasSeg(rngs[sub])) what += ' ' + segText(rngs[sub]); if (sub === 'noor' && r.noor && r.noor.lesson) what += ' — الدرس ' + r.noor.lesson; if (curById(sub) && r.cur[sub] && r.cur[sub].lesson) what += ' — ' + curShort(curById(sub).lessons[r.cur[sub].lesson - 1].t); recordMedia(rb.dataset.rec, s.name.split(' ')[0] + ': ' + what + ' (' + fmtDate(date, false) + ')').then(x => { if (x) { x.sub = sub; r.media.push(x); save('records', Object.assign({}, r)); drawBody(); } }); return; }
    const msh = t.closest('[data-mshare]'), mdl = t.closest('[data-mdel]'); if (msh || mdl) { if (msh) r.media[+msh.dataset.mshare].share = !r.media[+msh.dataset.mshare].share; else r.media.splice(+mdl.dataset.mdel, 1); drawBody(); return; }
    if (t.closest('[data-nxadd]')) { r.noor.extra = r.noor.extra || []; r.noor.extra.push({}); drawBody(); return; }
    const nxr = t.closest('[data-nxr]'); if (nxr) { r.noor.extra.splice(+nxr.dataset.nxr, 1); drawBody(); return; }
    const cxa = t.closest('[data-cxadd]'); if (cxa) { const x = r.cur[cxa.dataset.cxadd] = r.cur[cxa.dataset.cxadd] || {}; x.extra = x.extra || []; x.extra.push({ items: [] }); drawBody(); return; }
    const cxr = t.closest('[data-cxr]'); if (cxr) { const [cid, i] = cxr.dataset.cxr.split('|'); r.cur[cid].extra.splice(+i, 1); drawBody(); return; }
    const cxi = t.closest('[data-cxi]'); if (cxi) { const [cid, i, j] = cxi.dataset.cxi.split('|'); const e = r.cur[cid].extra[+i]; const jj = +j; e.items = e.items.includes(jj) ? e.items.filter(v => v !== jj) : e.items.concat([jj]); drawBody(); return; }
    const ms = t.closest('[data-msur]'); if (ms) { const [k, n] = ms.dataset.msur.split('|'); const sn = +n; $(`[data-rp="${k}"]`, eb)._rp.set({ s1: sn, a1: 1, s2: sn, a2: Q.count(sn) }); return; }
    const cs = t.closest('[data-csug]'); if (cs) { r.cur[cs.dataset.csug] = curSuggest(s.id, date, cs.dataset.csug); drawBody(); return; }
    const ca = t.closest('[data-call]'); if (ca) { const cid = ca.dataset.call; const x = r.cur[cid]; x.items = curById(cid).lessons[x.lesson - 1].items.map((_, i) => i); x.errs = []; drawBody(); return; }
    const ci = t.closest('[data-citem]'); if (ci) { const [cid, i] = ci.dataset.citem.split('|'); const idx = +i; const x = r.cur[cid]; x.items = x.items || []; x.errs = x.errs || []; const errMode = $(`[data-cerr="${cid}"]`, eb) && $(`[data-cerr="${cid}"]`, eb).checked; const now = Date.now(); const dbl = ci._t && now - ci._t < 400;
      if (errMode || dbl) { x.items = x.items.filter(v => v !== idx); x.errs = x.errs.includes(idx) && !dbl ? x.errs.filter(v => v !== idx) : x.errs.filter(v => v !== idx).concat([idx]); }
      else if (x.errs.includes(idx)) x.errs = x.errs.filter(v => v !== idx);
      else x.items = x.items.includes(idx) ? x.items.filter(v => v !== idx) : x.items.concat([idx]);
      const keepErr = errMode; drawBody(); const nb = $(`[data-citem="${cid}|${idx}"]`, eb); if (nb) nb._t = dbl ? 0 : now; if (keepErr) $(`[data-cerr="${cid}"]`, eb).checked = true; return; }
    const zd = t.closest('[data-zdel]'); if (zd) { const [cat, ...it] = zd.dataset.zdel.split('|'); r.zad = r.zad.filter(z => !(z.cat === cat && z.item === it.join('|'))); drawBody(); return; }
    const bh = t.closest('[data-b]'); if (bh) { r.behavior = r.behavior == +bh.dataset.b ? 0 : +bh.dataset.b; $$('#beh button', eb).forEach(b => b.style.color = (r.behavior || 0) >= +b.dataset.b ? '#e2b93b' : '#ddd'); return; }
    const qn = t.closest('[data-qn]'); if (qn) { r.note = (r.note ? r.note + ' — ' : '') + qn.dataset.qn; $('#enote', eb).value = r.note; return; }
    
  });
  const doSave = () => {
    syncCurErrs();
    ['hifz', 'review', 'far'].forEach(k => { const x = r[k]; if (!x) return; x.extra = (x.extra || []).filter(g => g && g.s1); x.extra.forEach(g => { g.s2 = g.s2 || g.s1; g.pages = +Q.pagesBetween(g.s1, g.a1, g.s2, g.a2).toFixed(3); }); if (!x.s1 && x.extra.length) { const f0 = x.extra.shift(); Object.assign(x, { s1: f0.s1, a1: f0.a1, s2: f0.s2, a2: f0.a2 }); } if (!x.extra.length) delete x.extra; if (hasSeg(x)) { x.s2 = x.s2 || x.s1; x.pages = +segPages(x).toFixed(3); } else delete r[k]; });
    if (r.noor) { r.noor.extra = (r.noor.extra || []).filter(e => e.lesson); if (!r.noor.lesson && r.noor.extra.length) Object.assign(r.noor, r.noor.extra.shift()); if (!r.noor.extra.length) delete r.noor.extra; }
    if (r.noor && !r.noor.lesson) delete r.noor; if (r.noor) delete r.noor._picked;
    if (r.noorRev && !(r.noorRev.lessons || []).length) delete r.noorRev;
    if (r.zadRev && !(r.zadRev.items || []).length) delete r.zadRev;
    Object.keys(r.curRev || {}).forEach(k => { if (!(r.curRev[k].lessons || []).length) delete r.curRev[k]; }); if (r.curRev && !Object.keys(r.curRev).length) delete r.curRev;
    Object.values(r.cur || {}).forEach(x => { if (x && x.extra) { x.extra = x.extra.filter(e => e.lesson); if (!x.lesson && x.extra.length) Object.assign(x, x.extra.shift()); if (!x.extra.length) delete x.extra; } });
    if (r.att === 'a' || r.att === 'e') { delete r.hifz; delete r.review; delete r.far; delete r.noor; delete r.noorRev; delete r.zadRev; delete r.curRev; r.zad = []; r.cur = {}; }
    Object.keys(r.cur || {}).forEach(k => { if (!r.cur[k] || !r.cur[k].lesson) delete r.cur[k]; });
    save('records', r); toast('✔️ تم الحفظ');
  };
  $('[data-save]', m.el).onclick = () => { doSave(); m.close(); render(); };
  const nx = $('[data-next]', m.el); if (nx) nx.onclick = () => { doSave(); m.close(); render(); recordEditor(next, date); };
  $('[data-wa]', m.el).onclick = () => { doSave(); waCompose(r.att === 'a' ? 'absent' : 'daily', [s], { date }); };
  const dl = $('[data-del]', m.el); if (dl) dl.onclick = async () => { if (await confirmBox('حذف تسجيل هذا اليوم للطالب؟')) { remove('records', r.id); m.close(); render(); } };
}

/* ——— دروس إضافية للنورانية ——— */
function noorExtrasHTML(n) {
  const ex = (n && n.extra) || [];
  return `<div style="margin-top:6px">${ex.map((e, i) => { const L = e.lesson ? NOORANIA[e.lesson - 1] : null; return `<div class="seg-box"><div class="row small"><b>➕ درس ${i + 2}</b><span style="flex:1"></span><button type="button" class="btn sm ghost" data-nxr="${i}">✕ حذف</button></div>
    <select class="inp" data-nxl="${i}"><option value="">— اختر الدرس —</option>${NOORANIA.map((l, j) => `<option value="${j + 1}" ${e.lesson == j + 1 ? 'selected' : ''}>${j + 1}. ${esc(l.title.replace(/^الدرس\s*\S+\s*-?\s*/, ''))}</option>`).join('')}</select>
    ${L ? `<div class="row" style="margin-top:6px"><span class="small">من</span><select class="inp" data-nxf="${i}" style="width:auto;font-family:var(--quran)">${L.items.map((it, j) => `<option value="${j + 1}" ${e.from == j + 1 ? 'selected' : ''}>${j + 1}. ${esc(it)}</option>`).join('')}</select><span class="small">إلى</span><select class="inp" data-nxt="${i}" style="width:auto;font-family:var(--quran)">${L.items.map((it, j) => `<option value="${j + 1}" ${e.to == j + 1 ? 'selected' : ''}>${j + 1}. ${esc(it)}</option>`).join('')}</select></div>` : ''}</div>`; }).join('')}
    <button type="button" class="btn sm light" data-nxadd>➕ إضافة درس آخر</button></div>`;
}
