/* ===================== شاشات الاختبارات: القائمة، المنشئ، رصد الدرجات، التصحيح الإلكتروني، التقارير ===================== */
const resId = (eid, sid) => eid + '|' + sid;
const getRes = (eid, sid) => byId('results', resId(eid, sid));
function resTotals(ex, r) {
  if (!r) return { total: 0, pct: null, subj: {} };
  const subj = {}; let total = 0;
  (ex.subjects || []).forEach(s => { let v = r.subj && r.subj[s.id] != null && r.subj[s.id] !== '' ? +r.subj[s.id] : null; if (v == null && r.q) { const qs = (s.questions || []).filter(q => r.q[q.id] != null && r.q[q.id] !== ''); if (qs.length) v = qs.reduce((a, q) => a + (+r.q[q.id] || 0), 0); } subj[s.id] = v; if (v != null) total += v; });
  const any = Object.values(subj).some(v => v != null);
  const pct = r.absent ? 0 : any && ex.total ? total / ex.total * 100 : null;
  return { total: r05(total), pct, subj };
}
function examStudents(ex, cid) { return activeStudents().filter(s => (ex.classIds || []).includes(s.classId) && (!cid || s.classId === cid)).sort((a, b) => a.name.localeCompare(b.name, 'ar')); }
function examRank(ex, sid) { const st = activeStudents().filter(s => s.classId === (byId('students', sid) || {}).classId && (ex.classIds || []).includes(s.classId)); const arr = st.map(s => ({ s, t: resTotals(ex, getRes(ex.id, s.id)) })).filter(x => x.t.pct != null).sort((a, b) => b.t.total - a.t.total); const i = arr.findIndex(x => x.s.id === sid); return i >= 0 ? { rank: i + 1, of: arr.length } : null; }
function canEditExams() { return canAdmin() || (S.me && S.me.role === 'teacher'); }

/* ——— قائمة الاختبارات ——— */
function viewExams(v, sub, arg) {
  if (sub === 'edit') return examBuilder(v, arg);
  if (sub === 'grade') return examGrading(v, arg);
  const fk = sessionStorage.getItem('exk') || '';
  const my = myClasses().map(c => c.id);
  const list = T('exams').filter(e => (!fk || e.kind === fk) && (canAdmin() || (e.classIds || []).some(c => my.includes(c)))).sort((a, b) => a.date < b.date ? 1 : -1);
  v.innerHTML = `<div class="page-head"><h2>📝 الاختبارات</h2><span class="sp"></span>${canEditExams() ? '<a class="btn" href="#/exams/edit/new">➕ اختبار جديد</a>' : ''}</div>
    <div class="tabs"><button data-k="" class="${!fk ? 'on' : ''}">الكل (${T('exams').length})</button>${Object.entries(EXAM_KINDS).map(([k, t]) => `<button data-k="${k}" class="${fk === k ? 'on' : ''}">${EXAM_KIND_ICON[k]} ${t.replace('اختبار ', '')}</button>`).join('')}</div>
    ${list.length ? `<div class="grid g2">${list.map(e => { examTotals(e); const studs = examStudents(e); const done = studs.filter(s => resTotals(e, getRes(e.id, s.id)).pct != null).length; const avg = studs.map(s => resTotals(e, getRes(e.id, s.id)).pct).filter(x => x != null); const av = avg.length ? avg.reduce((a, b) => a + b, 0) / avg.length : null; return `<div class="card exam-card">
      <div class="row"><span style="font-size:30px">${EXAM_KIND_ICON[e.kind] || '📝'}</span><div style="flex:1"><b style="font-size:16px">${esc(e.title)}</b><div class="small muted">${EXAM_KINDS[e.kind] || ''} · ${fmtDate(e.date)}</div></div>${av != null ? `<div class="ring-sm" style="--p:${av};--c:${gradeColor(av)}"><b>${Math.round(av)}%</b></div>` : ''}</div>
      <div class="row small" style="margin:8px 0">${(e.subjects || []).map(s => `<span class="chip">${s.icon} ${esc(s.name)} <b>${toAr(s.total)}</b></span>`).join('')}<span class="chip gold">المجموع ${toAr(e.total)}</span></div>
      <div class="small muted">🏫 ${(e.classIds || []).map(id => esc((byId('classes', id) || {}).name || '')).join('، ') || '—'}</div>
      <div class="row small" style="margin-top:6px"><span>رُصد ${done} من ${studs.length}</span><div class="prog" style="flex:1"><i style="width:${studs.length ? done / studs.length * 100 : 0}%"></i></div></div>
      <div class="row" style="margin-top:10px"><a class="btn sm" href="#/exams/grade/${e.id}">📝 رصد الدرجات</a><button class="btn sm light" data-paper="${e.id}">📄 النموذج</button><button class="btn sm light" data-ans="${e.id}">✅ الإجابة</button><button class="btn sm light" data-rep="${e.id}">📊 التقرير</button><button class="btn sm wa" data-wa="${e.id}" title="إرسال النتائج">💬</button>${canEditExams() ? `<a class="btn sm ghost" href="#/exams/edit/${e.id}">✏️</a><button class="btn sm ghost" data-copy="${e.id}" title="نسخ">📋</button>` : ''}${canAdmin() ? `<button class="btn sm ghost" data-del="${e.id}">🗑️</button>` : ''}</div></div>`; }).join('')}</div>` : `<div class="card empty"><span class="e">📝</span>لا توجد اختبارات بعد${canEditExams() ? '<br><br><a class="btn" href="#/exams/edit/new">➕ إنشاء أول اختبار</a>' : ''}</div>`}`;
  $$('.tabs button', v).forEach(b => b.onclick = () => { sessionStorage.setItem('exk', b.dataset.k); render(); });
  v.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return; const ex = byId('exams', t.dataset.paper || t.dataset.ans || t.dataset.rep || t.dataset.copy || t.dataset.del || t.dataset.wa);
    if (ex && t.dataset.wa) return waCompose('exam', examStudents(ex).filter(s => getRes(ex.id, s.id)), { ex });
    if (!ex) return;
    if (t.dataset.paper) showPaper(ex, false);
    if (t.dataset.ans) showPaper(ex, true);
    if (t.dataset.rep) { REP.type = 'exam'; REP.exam = ex.id; location.hash = '#/reports'; }
    if (t.dataset.copy) { const c = JSON.parse(JSON.stringify(ex)); c.id = uid('x'); c.title += ' (نسخة)'; c.date = todayISO(); save('exams', c); location.hash = '#/exams/edit/' + c.id; }
    if (t.dataset.del && await confirmBox('حذف الاختبار «' + ex.title + '» وكل درجاته؟')) { T('results').filter(r => r.examId === ex.id).forEach(r => remove('results', r.id)); remove('exams', ex.id); render(); }
  };
}

/* ——— منشئ الاختبار ——— */
let EXD = null;
function examBuilder(v, id) {
  if (!EXD || EXD._for !== id) {
    const ex = id && id !== 'new' ? byId('exams', id) : null;
    EXD = ex ? JSON.parse(JSON.stringify(ex)) : { id: '', kind: 'monthly', title: '', date: todayISO(), classIds: myClasses().map(c => c.id), subjects: [], total: 100, note: '' };
    EXD._for = id; EXD._target = EXD._target || EXD.total || 100;
  }
  const ex = EXD;
  const autoTitle = () => (EXAM_KINDS[ex.kind] || 'اختبار') + (ex.kind === 'monthly' ? ' — ' + hijri(ex.date).replace(/^\S+\s/, '') : ' — ' + curYear() + 'هـ');
  if (!ex.title) ex.title = autoTitle();
  examTotals(ex);
  v.innerHTML = `<div class="page-head"><h2>${ex.id ? '✏️ تعديل اختبار' : '➕ اختبار جديد'}</h2><span class="sp"></span><a class="btn ghost" href="#/exams" id="xback">↩️ رجوع</a></div>
    <div class="card"><h3>📋 بيانات الاختبار</h3><div class="grid g3">
      <div class="field"><label>نوع الاختبار</label><select class="inp" id="xk">${Object.entries(EXAM_KINDS).map(([k, t]) => `<option value="${k}" ${ex.kind === k ? 'selected' : ''}>${EXAM_KIND_ICON[k]} ${t}</option>`).join('')}</select></div>
      <div class="field"><label>عنوان الاختبار</label><input class="inp" id="xt" value="${esc(ex.title)}"></div>
      <div class="field"><label>التاريخ</label><input class="inp" type="date" id="xd" value="${ex.date}"></div>
      <div class="field"><label>الفصول</label><div id="xcls"></div></div>
      <div class="field"><label>تعليمات تظهر في ورقة الاختبار (اختياري)</label><input class="inp" id="xn" value="${esc(ex.note || '')}" placeholder="مثال: اقرأ السؤال جيداً…"></div>
      <div class="field"><label>الدرجة الكلية وتوزيعها</label><div class="row"><input class="inp" type="number" id="xtot" value="${ex._target}" style="width:90px"><select class="inp" id="xdist" style="width:auto"><option value="q">بالتساوي على الأسئلة</option><option value="s">بالتساوي على المواد</option></select><button class="btn sm gold" id="xdo">⚖️ توزيع</button></div></div>
    </div></div>
    <div id="xsubs"></div>
    <div class="card" style="text-align:center"><div class="row" style="justify-content:center"><select class="inp" id="xaddb" style="width:auto"><option value="">➕ إضافة مادة / كتاب…</option>${examBooks().map(b => `<option value="${b.id}">${b.icon} ${esc(b.name)}</option>`).join('')}</select></div></div>
    <div class="card xbar"><div class="row"><b>مجموع درجات الأسئلة: <span id="xsum" style="color:var(--teal);font-size:18px">${toAr(ex.total)}</span></b><span class="muted small" id="xsumnote"></span><span style="flex:1"></span>
      <button class="btn light" id="xp">📄 نموذج الاختبار</button><button class="btn light" id="xa">✅ نموذج الإجابة</button><button class="btn" id="xs">💾 حفظ الاختبار</button></div></div>`;
  const cg = [{ name: '', items: T('classes').filter(c => canAdmin() || myClasses().some(m => m.id === c.id)).map(c => ({ key: c.id, t: c.name })) }];
  $('#xcls').appendChild(multiDrop(cg, ex.classIds, 'الفصول', k => ex.classIds = k));
  $('#xk').onchange = e => { const was = ex.title === autoTitle(); ex.kind = e.target.value; if (was || !ex.title) { ex.title = autoTitle(); $('#xt').value = ex.title; } };
  $('#xt').oninput = e => ex.title = e.target.value; $('#xn').oninput = e => ex.note = e.target.value;
  $('#xd').onchange = e => { ex.date = e.target.value; };
  $('#xtot').oninput = e => ex._target = +e.target.value || 0;
  const updSum = () => { examTotals(ex); $('#xsum').textContent = toAr(ex.total); $('#xsumnote').textContent = ex._target && Math.abs(ex._target - ex.total) > .01 ? `(الدرجة الكلية المطلوبة ${ex._target} — اضغط ⚖️ توزيع)` : ''; ex.subjects.forEach(s => { const el = $(`[data-stot="${s.id}"]`); if (el) el.textContent = toAr(s.total); }); };
  $('#xdo').onclick = () => {
    const T0 = +$('#xtot').value || 0; const qs = ex.subjects.flatMap(s => s.questions || []); if (!qs.length) return toast('ولّد الأسئلة أولاً');
    const dist = (list, amount) => { if (!list.length) return; const each = r05(amount / list.length) || .5; list.forEach(q => q.mark = each); const diff = r05(amount - each * list.length); if (diff) list[list.length - 1].mark = Math.max(.5, r05(list[list.length - 1].mark + diff)); };
    if ($('#xdist').value === 's') { const subs = ex.subjects.filter(s => (s.questions || []).length); subs.forEach(s => dist(s.questions, T0 / subs.length)); } else dist(qs, T0);
    drawSubs(); updSum(); toast('✔️ وُزعت ' + T0 + ' درجة');
  };
  $('#xaddb').onchange = e => { const b = bookById(e.target.value); if (!b) return; const types = {}; (QTYPES[b.kind] || []).slice(0, 2).forEach(([t]) => types[t] = { count: 2, mark: 2 }); ex.subjects.push({ id: uid('sb'), book: b.id, name: b.name, icon: b.icon, lessons: [], types, questions: [] }); e.target.value = ''; drawSubs(); updSum(); };
  function drawSubs() {
    const box = $('#xsubs'); box.innerHTML = '';
    ex.subjects.forEach((s, si) => {
      const b = bookById(s.book); if (!b) return;
      const card = document.createElement('div'); card.className = 'card xsub';
      card.innerHTML = `<div class="row" style="margin-bottom:8px"><span style="font-size:26px">${s.icon}</span><b style="font-size:17px;flex:1">${esc(s.name)}</b><span class="chip gold">الدرجة: <b data-stot="${s.id}">${toAr(s.total || 0)}</b></span><button class="btn sm ghost" data-rm>✕ حذف المادة</button></div>
        <div class="grid g2"><div class="field"><label>الدروس / السور المشمولة</label><div data-ld></div></div>
        <div class="field"><label>أنواع الأسئلة وعددها ودرجة السؤال</label><table class="tbl xtypes"><tr><th>النوع</th><th>العدد</th><th>درجة السؤال</th></tr>${(QTYPES[b.kind] || []).map(([t, nm, mode]) => { const c = s.types[t] || {}; return `<tr><td class="r">${nm} <span class="chip ${mode === 'oral' ? 'blue' : 'gray'}" style="font-size:10px">${mode === 'oral' ? '🗣️ شفهي' : '✍️ تحريري'}</span></td><td><select class="inp" data-tc="${t}" style="width:70px;padding:4px">${[0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(n => `<option ${+(c.count || 0) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></td><td><select class="inp" data-tm="${t}" style="width:70px;padding:4px">${[.5, 1, 1.5, 2, 2.5, 3, 4, 5, 10].map(n => `<option value="${n}" ${+(c.mark || 1) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></td></tr>`; }).join('')}</table></div></div>
        <div class="row"><button class="btn gold" data-gen>⚡ توليد الأسئلة</button><span class="small muted">${(s.questions || []).length ? (s.questions.length + ' سؤالاً — يمكنك تعديل أي سؤال أو إجابته أو درجته مباشرة') : 'اختر الدروس وأنواع الأسئلة ثم اضغط توليد'}</span></div>
        <div data-ql style="margin-top:8px"></div>`;
      $('[data-ld]', card).appendChild(multiDrop(b.groups.map(g => ({ name: g.name, items: g.lessons.map(l => ({ key: l.key, t: l.t + (l.p ? ' (ص ' + l.p + ')' : '') })) })), s.lessons, 'الدروس', k => s.lessons = k));
      $('[data-rm]', card).onclick = async () => { if (await confirmBox('حذف مادة «' + s.name + '» من الاختبار؟')) { ex.subjects.splice(si, 1); drawSubs(); updSum(); } };
      card.addEventListener('change', e => { const t = e.target; if (t.dataset.tc) { s.types[t.dataset.tc] = s.types[t.dataset.tc] || { mark: 1 }; s.types[t.dataset.tc].count = +t.value; } if (t.dataset.tm) { s.types[t.dataset.tm] = s.types[t.dataset.tm] || { count: 0 }; s.types[t.dataset.tm].mark = +t.value; } });
      $('[data-gen]', card).onclick = () => { if (!s.lessons.length) return toast('اختر الدروس أولاً'); if (!Object.values(s.types).some(t => +t.count)) return toast('حدد عدد الأسئلة'); s.questions = genQuestions(s); if (!s.questions.length) toast('لم يتمكن من توليد أسئلة لهذه الدروس — جرّب نوعاً آخر'); drawSubs(); updSum(); };
      drawQs(s, $('[data-ql]', card), b);
      box.appendChild(card);
    });
  }
  function drawQs(s, host, b) {
    host.innerHTML = (s.questions || []).map((q, i) => `<div class="xq" data-i="${i}"><b class="qn">${toAr(i + 1)}</b><div style="flex:1;min-width:0"><div class="row small" style="margin-bottom:3px"><span class="chip ${q.mode === 'oral' ? 'blue' : 'gray'}">${qtypeInfo(b.kind, q.type)[1]}</span></div>
      <textarea class="inp" data-f="text" rows="1" style="font-size:14px">${esc(q.text)}</textarea>
      ${q.opts ? `<input class="inp small" data-f="opts" value="${esc(q.opts.join('، '))}" title="الخيارات مفصولة بفاصلة" style="margin-top:4px">` : ''}
      ${q.big ? `<input class="inp small" data-f="big" value="${esc(q.big.join('، '))}" style="margin-top:4px">` : ''}
      ${q.items ? `<input class="inp small" data-f="items" value="${esc(q.items.join('، '))}" style="margin-top:4px">` : ''}
      ${q.pairs ? `<div class="small muted" style="margin-top:4px">${q.pairs.map(p => esc(p[0]) + ' ↔ ' + esc(p[1])).join(' | ')}</div>` : ''}
      <div class="row" style="margin-top:4px"><span class="small" style="color:#2c7a28">✅ الإجابة:</span><input class="inp grow small" data-f="answer" value="${esc(q.answer || '')}"></div></div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:center"><input class="inp" type="number" step=".5" min="0" data-f="mark" value="${q.mark}" style="width:64px;text-align:center;padding:5px" title="درجة السؤال"><div class="row" style="gap:2px"><button type="button" class="btn sm ghost" data-re title="سؤال آخر">🔄</button><button type="button" class="btn sm ghost" data-dq title="حذف">✕</button></div></div></div>`).join('');
    host.oninput = e => { const t = e.target; const q = s.questions[+t.closest('.xq').dataset.i]; const f = t.dataset.f; if (!f) return; if (['opts', 'big', 'items'].includes(f)) q[f] = t.value.split(/[،,]/).map(x => x.trim()).filter(Boolean); else if (f === 'mark') { q.mark = +t.value || 0; updSum(); } else q[f] = t.value; };
    host.onclick = e => { const row = e.target.closest('.xq'); if (!row) return; const i = +row.dataset.i; if (e.target.closest('[data-dq]')) { s.questions.splice(i, 1); drawQs(s, host, b); updSum(); } if (e.target.closest('[data-re]')) { const old = s.questions[i]; const L = bookLessons(b).filter(l => s.lessons.includes(l.key)); const n = genOne(b, old.type, L); if (n) s.questions[i] = Object.assign({ id: old.id, type: old.type, mode: qtypeInfo(b.kind, old.type)[2], mark: old.mark }, n); drawQs(s, host, b); } };
  }
  drawSubs(); updSum();
  const clean = () => { const o = JSON.parse(JSON.stringify(ex)); delete o._for; delete o._target; examTotals(o); return o; };
  $('#xp').onclick = () => showPaper(clean(), false);
  $('#xa').onclick = () => showPaper(clean(), true);
  $('#xs').onclick = () => {
    if (!ex.title.trim()) return toast('اكتب عنوان الاختبار'); if (!ex.classIds.length) return toast('اختر الفصول'); if (!ex.subjects.length) return toast('أضف مادة واحدة على الأقل');
    const o = clean(); if (!o.id) o.id = uid('x'); o.year = curYear(); o.createdBy = o.createdBy || (S.me ? S.me.name : '');
    save('exams', o); EXD = null; toast('✔️ حُفظ الاختبار'); location.hash = '#/exams';
  };
  $('#xback').onclick = () => { EXD = null; };
}

/* ——— رصد الدرجات ——— */
let GRADE_CLS = '';
function examGrading(v, id) {
  const ex = byId('exams', id); if (!ex) { v.innerHTML = '<div class="card empty">الاختبار غير موجود</div>'; return; }
  examTotals(ex);
  const classes = (ex.classIds || []).map(c => byId('classes', c)).filter(c => c && (canAdmin() || myClasses().some(m => m.id === c.id)));
  if (!classes.some(c => c.id === GRADE_CLS)) GRADE_CLS = (classes[0] || {}).id || '';
  const studs = examStudents(ex, GRADE_CLS);
  const hasQuran = ex.subjects.some(s => s.book === 'quran');
  v.innerHTML = `<div class="page-head"><h2>📝 رصد درجات: ${esc(ex.title)}</h2><span class="sp"></span><a class="btn ghost" href="#/exams">↩️ الاختبارات</a></div>
    <div class="daybar"><select class="inp" id="gcls" style="width:auto;font-weight:700">${classes.map(c => `<option value="${c.id}" ${c.id === GRADE_CLS ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      <span class="chip">${EXAM_KINDS[ex.kind]}</span><span class="chip">${fmtDate(ex.date)}</span><span class="chip gold">من ${toAr(ex.total)}</span><span style="flex:1"></span>
      <button class="btn sm light" id="gpaper">📄 النموذج</button><button class="btn sm light" id="gans">✅ الإجابة</button><button class="btn sm" id="grep">📊 تقرير الدرجات</button><button class="btn sm wa" id="gwa">💬 إرسال النتائج</button></div>
    <div class="card small" style="background:#f3faf8">💡 اكتب درجة كل مادة مباشرة، أو اضغط <b>📝</b> للتصحيح سؤالاً سؤالاً، أو <b>📷</b> لرفع ورقة الإجابة وتصحيحها إلكترونياً${hasQuran ? '، أو <b>📖</b> لاختبار القرآن مع مواضع أخطائه السابقة' : ''}. تُحفظ الدرجات تلقائياً.</div>
    <div class="tbl-wrap"><table class="tbl" id="gt"><tr><th>م</th><th>الطالب</th>${ex.subjects.map(s => `<th>${s.icon} ${esc(s.name)}<br><small>من ${toAr(s.total)}</small></th>`).join('')}<th>المجموع<br><small>من ${toAr(ex.total)}</small></th><th>التقدير</th><th>غائب</th><th>ملاحظات</th><th>أدوات</th></tr>
    ${studs.map((st, i) => { const r = getRes(ex.id, st.id) || {}; const t = resTotals(ex, r); return `<tr data-sid="${st.id}"><td>${i + 1}</td><td class="r" style="white-space:nowrap"><b>${esc(st.name)}</b></td>
      ${ex.subjects.map(s => `<td><input class="inp gin" type="number" step=".5" min="0" max="${s.total}" data-sub="${s.id}" value="${t.subj[s.id] != null ? t.subj[s.id] : ''}" ${r.absent ? 'disabled' : ''} style="width:70px;text-align:center;padding:5px"></td>`).join('')}
      <td><b data-tt>${t.pct != null ? toAr(t.total) : '—'}</b></td><td data-gr>${t.pct != null ? `<span class="chip" style="background:${gradeColor(t.pct)}22;color:${gradeColor(t.pct)}">${examGrade(t.pct)} ${Math.round(t.pct)}%</span>` : ''}</td>
      <td><input type="checkbox" data-abs ${r.absent ? 'checked' : ''}></td><td><input class="inp" data-note value="${esc(r.notes || '')}" style="min-width:140px;padding:5px" placeholder="ملاحظة"></td>
      <td style="white-space:nowrap"><button class="btn sm light" data-detail title="تصحيح تفصيلي">📝</button><button class="btn sm light" data-sheet title="ورقة الإجابة والتصحيح الإلكتروني">📷${(r.sheets || []).length ? '<sup>' + r.sheets.length + '</sup>' : ''}</button>${hasQuran ? '<button class="btn sm light" data-qcheck title="اختبار القرآن وأخطاؤه السابقة">📖</button>' : ''}<button class="btn sm light" data-rec="audio" title="تسجيل صوتي">🎙️</button><button class="btn sm light" data-rec="video" title="تسجيل فيديو">🎥</button>${(r.media || []).length ? `<button class="btn sm ghost" data-media>▶️${r.media.length}</button>` : ''}</td></tr>`; }).join('') || `<tr><td colspan="9" class="empty">لا يوجد طلاب في هذا الفصل</td></tr>`}</table></div>`;
  $('#gcls').onchange = e => { GRADE_CLS = e.target.value; render(); };
  $('#gpaper').onclick = () => showPaper(ex, false); $('#gans').onclick = () => showPaper(ex, true);
  $('#gwa').onclick = () => waCompose('exam', studs.filter(s => getRes(ex.id, s.id)), { ex });
  $('#grep').onclick = () => { REP.type = 'exam'; REP.exam = ex.id; REP.cls = GRADE_CLS; location.hash = '#/reports'; };
  const getR = sid => { const st = byId('students', sid); return getRes(ex.id, sid) || { id: resId(ex.id, sid), examId: ex.id, studentId: sid, classId: st.classId, date: ex.date, subj: {}, q: {} }; };
  const refreshRow = (tr, r) => { const t = resTotals(ex, r); $('[data-tt]', tr).textContent = t.pct != null ? toAr(t.total) : '—'; $('[data-gr]', tr).innerHTML = t.pct != null ? `<span class="chip" style="background:${gradeColor(t.pct)}22;color:${gradeColor(t.pct)}">${examGrade(t.pct)} ${Math.round(t.pct)}%</span>` : ''; };
  const persistR = r => { r.classId = (byId('students', r.studentId) || {}).classId || r.classId; r.date = ex.date; const t = resTotals(ex, r); r.total = t.total; r.pct = t.pct; r.grade = t.pct != null ? examGrade(t.pct) : ''; save('results', r); };
  const gt = $('#gt');
  gt.addEventListener('change', e => {
    const tr = e.target.closest('tr[data-sid]'); if (!tr) return; const r = getR(tr.dataset.sid); r.subj = r.subj || {};
    if (e.target.dataset.sub) { const s = ex.subjects.find(x => x.id === e.target.dataset.sub); let val = e.target.value === '' ? '' : Math.min(s.total, Math.max(0, +e.target.value)); e.target.value = val; r.subj[s.id] = val; }
    if (e.target.dataset.abs != null) { r.absent = e.target.checked; $$('.gin', tr).forEach(i => i.disabled = r.absent); }
    if (e.target.dataset.note != null) r.notes = e.target.value;
    persistR(r); refreshRow(tr, r);
  });
  gt.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-sid]'); if (!tr) return; const st = byId('students', tr.dataset.sid); const r = getR(st.id);
    if (e.target.closest('[data-detail]')) detailGrade(ex, st, r, () => { persistR(r); render(); });
    if (e.target.closest('[data-sheet]')) sheetDialog(ex, st, r, () => { persistR(r); render(); });
    if (e.target.closest('[data-qcheck]')) quranCheckDialog(ex, st, r, () => { persistR(r); render(); });
    const rc = e.target.closest('[data-rec]'); if (rc) recordMedia(rc.dataset.rec, st.name.split(' ')[0] + ' — ' + ex.title).then(x => { if (x) { r.media = (r.media || []).concat([x]); persistR(r); render(); } });
    if (e.target.closest('[data-media]')) { const m = modal({ title: '🎬 تسجيلات ' + esc(st.name), body: `<div id="ml">${mediaListHTML(r.media, true)}</div>`, foot: false, onClose: () => { persistR(r); render(); } }); bindMediaList($('#ml', m.el), r.media, () => { $('#ml', m.el).innerHTML = mediaListHTML(r.media, true); }); }
  });
}
function detailGrade(ex, st, r, after) {
  r.q = r.q || {}; let n = 0;
  const m = modal({ title: '📝 تصحيح تفصيلي — ' + esc(st.name), wide: true, body: ex.subjects.map(s => `<div class="sec"><div class="sec-h">${s.icon} ${esc(s.name)}<span class="sp"></span><span class="chip gold">من ${toAr(s.total)}</span></div>${(s.questions || []).map(q => `<div class="xq" style="align-items:center"><b class="qn">${toAr(++n)}</b><div style="flex:1"><div class="small">${esc(q.text)}</div><div class="small" style="color:#2c7a28">✅ ${esc(q.answer || '')}</div>${r.ai && r.ai[q.id] ? `<div class="small" style="color:var(--blue)">🤖 قرأ: «${esc(r.ai[q.id].read || '')}» ${r.ai[q.id].note ? '— ' + esc(r.ai[q.id].note) : ''}</div>` : ''}</div>
    <div class="row" style="gap:3px"><button type="button" class="btn sm light" data-full="${q.id}" data-v="${q.mark}">✔️</button><button type="button" class="btn sm light" data-full="${q.id}" data-v="${q.mark / 2}">½</button><button type="button" class="btn sm light" data-full="${q.id}" data-v="0">✖️</button><input class="inp" type="number" step=".5" min="0" max="${q.mark}" data-q="${q.id}" value="${r.q[q.id] != null ? r.q[q.id] : ''}" style="width:64px;text-align:center;padding:5px"><span class="small muted">/ ${q.mark}</span></div></div>`).join('')}</div>`).join(''),
    foot: '<button class="btn" data-ok>💾 حفظ الدرجات</button><button class="btn light" data-allfull>✔️ الدرجة الكاملة للجميع</button>' });
  m.body.onclick = e => { const b = e.target.closest('[data-full]'); if (b) $(`[data-q="${b.dataset.full}"]`, m.el).value = b.dataset.v; };
  $('[data-allfull]', m.el).onclick = () => ex.subjects.forEach(s => s.questions.forEach(q => $(`[data-q="${q.id}"]`, m.el).value = q.mark));
  $('[data-ok]', m.el).onclick = () => {
    r.subj = r.subj || {};
    ex.subjects.forEach(s => { let any = false, sum = 0; s.questions.forEach(q => { const val = $(`[data-q="${q.id}"]`, m.el).value; if (val !== '') { any = true; r.q[q.id] = Math.min(q.mark, Math.max(0, +val)); sum += r.q[q.id]; } else delete r.q[q.id]; }); if (any) r.subj[s.id] = r05(sum); });
    m.close(); after();
  };
}

/* ——— ورقة الإجابة والتصحيح الإلكتروني ——— */
function sheetDialog(ex, st, r, after) {
  r.sheets = r.sheets || []; let picked = [];
  const written = ex.subjects.flatMap(s => s.questions.filter(q => q.mode !== 'oral').map(q => ({ s, q })));
  const m = modal({ title: '📷 ورقة إجابة: ' + esc(st.name), wide: true, body: `
    <p class="small muted">صوّر ورقة إجابة الطالب (صفحة أو أكثر) أو ارفعها من الجهاز. تُحفظ في Drive، ويمكن قراءتها وتصحيحها إلكترونياً بمقارنتها بنموذج الإجابة (${written.length} سؤالاً تحريرياً)، ثم تراجع الدرجات وتعدلها قبل الحفظ.</p>
    <div class="row"><label class="btn gold">📷 تصوير / اختيار الصور<input type="file" accept="image/*" capture="environment" multiple hidden id="sf"></label><span id="sfn" class="small muted"></span></div>
    <div id="sthumbs" class="row" style="margin:8px 0"></div>
    ${r.sheets.length ? `<div class="small"><b>الأوراق المحفوظة:</b> ${r.sheets.map((x, i) => `<a class="btn sm light" href="${esc(x.url)}" target="_blank">📄 ورقة ${i + 1}</a>`).join(' ')}</div>` : ''}
    <div id="sai"></div>`, foot: `<button class="btn" id="sup" disabled>☁️ حفظ الأوراق</button><button class="btn gold" id="sgo" disabled>🤖 حفظ وتصحيح إلكتروني</button>` });
  $('#sf', m.el).onchange = async e => {
    picked = []; for (const f of e.target.files) picked.push(await resizeImage(f, 1600));
    $('#sthumbs', m.el).innerHTML = picked.map(d => `<img src="${d}" style="height:120px;border-radius:10px;border:1px solid var(--line)">`).join('');
    $('#sfn', m.el).textContent = picked.length + ' صورة'; $('#sup', m.el).disabled = $('#sgo', m.el).disabled = !picked.length;
  };
  const uploadAll = async () => { for (let i = 0; i < picked.length; i++) { const url = await uploadFile(picked[i], st.name + ' — ' + ex.title + ' — ورقة ' + (r.sheets.length + 1) + '.jpg', 'sheets'); r.sheets.push({ url, date: todayISO() }); } };
  $('#sup', m.el).onclick = async () => { const b = $('#sup', m.el); b.disabled = true; b.textContent = '⏳'; try { await uploadAll(); toast('✔️ حُفظت الأوراق'); m.close(); after(); } catch (er) { toast('⚠️ ' + er.message); b.disabled = false; b.textContent = '☁️ حفظ الأوراق'; } };
  $('#sgo', m.el).onclick = async () => {
    const b = $('#sgo', m.el); b.disabled = true; b.textContent = '⏳ جاري القراءة والتصحيح…';
    try {
      if (isLocal()) throw new Error('التصحيح الإلكتروني يحتاج الربط بالخادم');
      const key = written.map(({ s, q }, i) => ({ id: q.id, no: i + 1, subject: s.name, question: q.text, options: q.opts || q.items || (q.pairs ? q.pairs.map(p => p[0] + ' - ' + p[1]) : undefined), correct: q.answer, max: q.mark }));
      const prompt = `أنت مصحح اختبارات لأطفال (٤–٧ سنوات) في حلقات تحفيظ القرآن. الصور المرفقة هي ورقة إجابة الطالب «${st.name}» لاختبار «${ex.title}». خط الأطفال قد يكون غير متقن، فاقبل الإجابة إذا كانت مقروءة وصحيحة المعنى، وفي أسئلة «ضع دائرة» تحقق من الخيار المحاط بدائرة، وفي «صِل» تحقق من الخطوط.
هذه أسئلة الاختبار التحريرية مع الإجابة الصحيحة والدرجة القصوى (JSON):
${JSON.stringify(key)}
أعد فقط مصفوفة JSON بدون أي نص آخر، عنصر لكل سؤال: {"id": "...", "read": "ما كتبه الطالب كما قرأته", "mark": الدرجة المستحقة (من 0 إلى max، ويجوز نصف درجة), "note": "ملاحظة قصيرة إن وُجد خطأ"}. إن لم تجد إجابة للسؤال فاجعل read فارغاً و mark صفراً.`;
      const res = await api('aiGrade', { images: picked.map(d => ({ mime: 'image/jpeg', data: d.split(',')[1] })), prompt, model: S.settings.aiModel || 'claude-sonnet-5-5' });
      if (!res.ok) throw new Error(res.error);
      const mt = res.text.match(/\[[\s\S]*\]/); if (!mt) throw new Error('لم أتمكن من فهم نتيجة التصحيح');
      const arr = JSON.parse(mt[0]);
      await uploadAll();
      r.ai = r.ai || {}; r.q = r.q || {};
      arr.forEach(x => { const w = written.find(y => y.q.id === x.id); if (!w) return; r.ai[x.id] = { read: x.read, note: x.note, mark: +x.mark }; r.q[x.id] = Math.min(w.q.mark, Math.max(0, r05(+x.mark || 0))); });
      r.aiAt = Date.now();
      toast('✔️ تم التصحيح — راجع الدرجات'); m.close();
      detailGrade(ex, st, r, after);
    } catch (er) { toast('⚠️ ' + er.message, 5000); b.disabled = false; b.textContent = '🤖 حفظ وتصحيح إلكتروني'; }
  };
}

/* ——— اختبار القرآن مع مواضع الأخطاء السابقة ——— */
function quranCheckDialog(ex, st, r, after) {
  const qsub = ex.subjects.find(s => s.book === 'quran'); const surahs = (qsub.lessons || []).map(k => +k.slice(1));
  r.quran = r.quran || { checks: {}, newErrs: [] };
  const prev = [];
  S.data.records.filter(x => x.studentId === st.id && x.date <= ex.date).forEach(rec => (rec.errors || []).forEach(e => { if (['hifz', 'review', 'far'].includes(e.sub) && surahs.includes(+e.s)) prev.push({ rec, e }); }));
  prev.sort((a, b) => a.e.s - b.e.s || a.e.a - b.e.a);
  let cur = surahs[0];
  const m = modal({ title: '📖 اختبار القرآن — ' + esc(st.name), wide: true, body: '<div id="qc"></div>', foot: `<label class="row small" style="flex:1"><input type="checkbox" id="qlink" checked> ربط النتيجة بسجل التسميع (تحديث الأخطاء السابقة وإضافة الجديدة)</label><button class="btn" data-ok>💾 حفظ</button>` });
  const draw = () => {
    const errsHere = prev.filter(p => p.e.s == cur);
    const marks = errsHere.filter(p => p.e.w != null).map(p => ({ s: p.e.s, a: p.e.a, w: p.e.w, fixed: r.quran.checks[p.e.id] === 'ok' })).concat(r.quran.newErrs.filter(x => x.s == cur));
    $('#qc', m.el).innerHTML = `
      <div class="sec"><div class="sec-h">🔎 مواضع أخطاء الطالب السابقة في سور الاختبار (${prev.length})</div>
      ${prev.length ? prev.map(p => { const c = r.quran.checks[p.e.id]; return `<div class="e-prev row small" style="padding:6px;border-bottom:1px dashed var(--line)"><span style="flex:1">📍 <b>${Q.names[p.e.s - 1]} ${toAr(p.e.a)}</b>${p.e.word ? ' «<span style="font-family:var(--quran);font-size:17px">' + esc(p.e.word) + '</span>»' : ''} — ${esc(p.e.type || '')} <span class="muted">(${fmtDate(p.rec.date, false)}${p.e.fixed ? '، صُوّب سابقاً' : ''})</span></span>
        <button type="button" class="btn sm ${c === 'ok' ? '' : 'light'}" data-ck="${p.e.id}" data-v="ok">✔️ أتقنه</button><button type="button" class="btn sm ${c === 'again' ? 'red' : 'light'}" data-ck="${p.e.id}" data-v="again">❌ تكرر الخطأ</button></div>`; }).join('') : '<div class="small muted">لا توجد أخطاء سابقة مسجلة في هذه السور ✨</div>'}</div>
      <div class="sec"><div class="sec-h">🎧 تسميع الاختبار — اضغط على الكلمة التي أخطأ فيها<span class="sp"></span><select class="inp" id="qs" style="width:auto">${surahs.map(n => `<option value="${n}" ${n == cur ? 'selected' : ''}>${Q.names[n - 1]} ${prev.some(p => p.e.s == n) ? '📍' : ''}</option>`).join('')}</select></div>
      <div class="small muted" style="margin-bottom:6px">🟥 خطأ جديد في الاختبار — 🟩 خطأ سابق أتقنه — المواضع السابقة مظللة لتنبيه المعلم</div>
      ${ayahBoxHTML({ s1: cur, a1: 1, s2: cur, a2: Q.count(cur) }, marks).replace('class="ayah-box"', 'class="ayah-box" style="max-height:340px"') || '<div class="small muted">نص هذه السورة غير متوفر</div>'}
      <div class="small" style="margin-top:6px">أخطاء جديدة: <b>${r.quran.newErrs.length}</b> — تكرر من السابق: <b style="color:var(--red)">${Object.values(r.quran.checks).filter(v => v === 'again').length}</b> — أتقن من السابق: <b style="color:var(--green)">${Object.values(r.quran.checks).filter(v => v === 'ok').length}</b></div></div>`;
    // تظليل المواضع السابقة غير المحسومة
    errsHere.forEach(p => { if (p.e.w == null || r.quran.checks[p.e.id]) return; const w = $(`.ayah-box .w[data-s="${p.e.s}"][data-a="${p.e.a}"][data-w="${p.e.w}"]`, m.el); if (w) { w.style.background = '#ffe8c2'; w.title = 'خطأ سابق'; } });
  };
  m.body.addEventListener('click', e => {
    const ck = e.target.closest('[data-ck]'); if (ck) { r.quran.checks[ck.dataset.ck] = r.quran.checks[ck.dataset.ck] === ck.dataset.v ? undefined : ck.dataset.v; draw(); return; }
    const w = e.target.closest('.ayah-box .w'); if (w) {
      const s = +w.dataset.s, a = +w.dataset.a, wi = +w.dataset.w;
      const p = prev.find(x => x.e.s == s && x.e.a == a && x.e.w == wi); if (p) { r.quran.checks[p.e.id] = r.quran.checks[p.e.id] === 'again' ? 'ok' : 'again'; draw(); return; }
      const i = r.quran.newErrs.findIndex(x => x.s == s && x.a == a && x.w == wi);
      if (i >= 0) r.quran.newErrs.splice(i, 1); else r.quran.newErrs.push({ id: uid('e'), sub: 'review', s, a, w: wi, word: wordOf(s, a, wi), type: 'نسيان', note: 'من ' + ex.title });
      draw();
    }
  });
  m.body.addEventListener('change', e => { if (e.target.id === 'qs') { cur = +e.target.value; draw(); } });
  $('[data-ok]', m.el).onclick = () => {
    Object.keys(r.quran.checks).forEach(k => { if (!r.quran.checks[k]) delete r.quran.checks[k]; });
    if ($('#qlink', m.el).checked) {
      const touched = new Set();
      prev.forEach(p => { const c = r.quran.checks[p.e.id]; if (!c) return; p.e.fixed = c === 'ok'; p.e.examNote = (c === 'ok' ? 'أتقنه في ' : 'تكرر في ') + ex.title; touched.add(p.rec); });
      touched.forEach(rec => save('records', rec));
      if (r.quran.newErrs.length) { const rid = recId(st.id, ex.date); const rec = byId('records', rid) || { id: rid, studentId: st.id, classId: st.classId, date: ex.date, att: 'p', errors: [] }; rec.errors = (rec.errors || []).filter(x => !String(x.note || '').includes(ex.title)).concat(r.quran.newErrs); save('records', rec); }
    }
    m.close(); after();
  };
  draw();
}

/* ——— تقرير درجات الاختبار ——— */
function examShowOpts() { return Object.assign({ mark: 1, pct: 1, grade: 1, rank: 1, notes: 1, qdetail: 0, quran: 1, media: 1, paper: 0 }, S.settings.examReportShow || {}); }
function examStudentBlock(ex, st, show) {
  const r = getRes(ex.id, st.id) || {}; const t = resTotals(ex, r); const c = classOf(st); const rk = show.rank ? examRank(ex, st.id) : null;
  let h = repHeader('تقرير درجات ' + ex.title, `${EXAM_KINDS[ex.kind] || ''} — ${fmtDate(ex.date)} — ${hijri(ex.date)}`);
  h += `<div class="rep-meta"><span>الطالب: <b>${esc(st.name)}</b></span><span>الفصل: <b>${esc(c ? c.name : '')}</b></span><span>المعلم: <b>${esc((teacherOf(c) || {}).name || '')}</b></span>${rk ? `<span>الترتيب: <b>${toAr(rk.rank)} من ${toAr(rk.of)}</b></span>` : ''}</div>`;
  if (r.absent) h += '<div class="card" style="background:#fde4e7;text-align:center;font-weight:800;color:var(--red)">غائب عن الاختبار</div>';
  h += `<table class="tbl"><tr><th>المادة</th>${show.mark ? '<th>الدرجة</th><th>من</th>' : ''}${show.pct ? '<th>النسبة</th>' : ''}${show.grade ? '<th>التقدير</th>' : ''}</tr>${ex.subjects.map(s => { const v = t.subj[s.id]; const p = v != null && s.total ? v / s.total * 100 : null; return `<tr><td class="r"><b>${s.icon} ${esc(s.name)}</b></td>${show.mark ? `<td><b>${v != null ? toAr(v) : '—'}</b></td><td>${toAr(s.total)}</td>` : ''}${show.pct ? `<td>${p != null ? toAr(Math.round(p)) + '٪' : ''}</td>` : ''}${show.grade ? `<td>${p != null ? `<span style="color:${gradeColor(p)};font-weight:800">${examGrade(p)}</span>` : ''}</td>` : ''}</tr>`; }).join('')}
    <tr style="font-weight:800;background:#f3faf8"><td>المجموع الكلي</td>${show.mark ? `<td style="font-size:16px">${t.pct != null ? toAr(t.total) : '—'}</td><td>${toAr(ex.total)}</td>` : ''}${show.pct ? `<td>${t.pct != null ? toAr(Math.round(t.pct)) + '٪' : ''}</td>` : ''}${show.grade ? `<td style="color:${gradeColor(t.pct || 0)}">${t.pct != null ? examGrade(t.pct) : ''}</td>` : ''}</tr></table>`;
  if (show.grade && t.pct != null) h += `<div style="text-align:center;margin:10px 0"><span style="display:inline-block;border:3px solid ${gradeColor(t.pct)};color:${gradeColor(t.pct)};border-radius:16px;padding:6px 26px;font-size:22px;font-weight:800">التقدير العام: ${examGrade(t.pct)}</span></div>`;
  if (show.qdetail && r.q && Object.keys(r.q).length) { let n = 0; h += `<div class="rep-sec">📝 درجات الأسئلة</div><table class="tbl"><tr><th>م</th><th>السؤال</th><th>الدرجة</th></tr>${ex.subjects.flatMap(s => s.questions.map(q => `<tr><td>${toAr(++n)}</td><td class="r small">${s.icon} ${esc(q.text)}</td><td>${r.q[q.id] != null ? toAr(r.q[q.id]) : '—'} / ${toAr(q.mark)}</td></tr>`)).join('')}</table>`; }
  if (show.quran && r.quran && (r.quran.newErrs.length || Object.keys(r.quran.checks).length)) { const ok = Object.values(r.quran.checks).filter(v => v === 'ok').length, again = Object.values(r.quran.checks).filter(v => v === 'again').length; h += `<div class="rep-sec">📖 اختبار القرآن ومواضع الأخطاء</div><div class="small">أخطاء سابقة أتقنها: <b style="color:var(--green)">${toAr(ok)}</b> — تكررت: <b style="color:var(--red)">${toAr(again)}</b> — أخطاء جديدة: <b>${toAr(r.quran.newErrs.length)}</b>${r.quran.newErrs.length ? '<br>' + r.quran.newErrs.map(e => `${Q.names[e.s - 1]} ${toAr(e.a)}: «${esc(e.word || '')}»`).join('، ') : ''}</div>`; }
  if (show.notes && r.notes) h += `<div class="rep-sec">📝 ملاحظات المعلم</div><div style="background:#fffbea;border-radius:10px;padding:8px 12px">${esc(r.notes)}</div>`;
  if (show.media && ((r.media || []).length || (r.sheets || []).length)) h += `<div class="rep-sec">🎬 المرفقات</div><div class="small">${(r.sheets || []).map((x, i) => `<a href="${esc(x.url)}" target="_blank">📄 ورقة الإجابة ${toAr(i + 1)}</a>`).join(' — ')} ${(r.media || []).map(x => `<a href="${esc(x.url)}" target="_blank">${x.type === 'video' ? '🎥' : '🎙️'} ${esc(x.label || 'تسجيل')}</a>`).join(' — ')}</div>`;
  h += `<div class="rep-foot"><span>المعلم: ${esc((teacherOf(c) || {}).name || '')}</span><span>المشرف: ${esc(S.settings.supervisor || '')}</span><span>ولي الأمر: ..................</span></div>`;
  if (show.paper) h += `<div class="page-break"></div>${examPaperHTML(ex, { student: st })}`;
  return h;
}
function examClassSheet(ex, cid, show) {
  const cls = byId('classes', cid); const st = examStudents(ex, cid);
  const rows = st.map(s => ({ s, r: getRes(ex.id, s.id) || {}, t: resTotals(ex, getRes(ex.id, s.id)) }));
  const ranked = rows.filter(x => x.t.pct != null).sort((a, b) => b.t.total - a.t.total); ranked.forEach((x, i) => x.rank = i + 1);
  const pcts = ranked.map(x => x.t.pct); const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
  let h = repHeader('كشف درجات ' + ex.title, `${esc(cls ? cls.name : '')} — ${fmtDate(ex.date)}`);
  h += kpis([[toAr(st.length), 'عدد الطلاب'], [toAr(ranked.length), 'المختبَرون'], [toAr(rows.filter(x => x.r.absent).length), 'الغائبون'], [toAr(Math.round(avg)) + '٪', 'متوسط الفصل'], [ranked[0] ? esc(ranked[0].s.name.split(' ').slice(0, 2).join(' ')) : '—', '🥇 الأول']]);
  const dist = {}; examScale().forEach(x => dist[x.label] = 0); ranked.forEach(x => dist[examGrade(x.t.pct)]++);
  h += `<div class="row small" style="margin-bottom:8px">${Object.entries(dist).map(([k, n]) => `<span class="chip">${esc(k)}: <b>${toAr(n)}</b></span>`).join('')}</div>`;
  h += `<table class="tbl"><tr><th>م</th><th>الطالب</th>${ex.subjects.map(s => `<th>${s.icon} ${esc(s.name)}<br><small>${toAr(s.total)}</small></th>`).join('')}<th>المجموع<br><small>${toAr(ex.total)}</small></th>${show.pct ? '<th>النسبة</th>' : ''}${show.grade ? '<th>التقدير</th>' : ''}${show.rank ? '<th>الترتيب</th>' : ''}${show.notes ? '<th>ملاحظات</th>' : ''}</tr>${rows.map((x, i) => `<tr><td>${toAr(i + 1)}</td><td class="r"><b>${esc(x.s.name)}</b></td>${x.r.absent ? `<td colspan="${ex.subjects.length + 1}" style="color:var(--red);font-weight:700">غائب</td>` : ex.subjects.map(s => `<td>${x.t.subj[s.id] != null ? toAr(x.t.subj[s.id]) : '—'}</td>`).join('') + `<td><b>${x.t.pct != null ? toAr(x.t.total) : '—'}</b></td>`}${show.pct ? `<td>${x.t.pct != null && !x.r.absent ? toAr(Math.round(x.t.pct)) + '٪' : ''}</td>` : ''}${show.grade ? `<td style="color:${gradeColor(x.t.pct || 0)};font-weight:800">${x.t.pct != null && !x.r.absent ? examGrade(x.t.pct) : ''}</td>` : ''}${show.rank ? `<td>${x.rank ? (x.rank <= 3 ? ['🥇', '🥈', '🥉'][x.rank - 1] : toAr(x.rank)) : ''}</td>` : ''}${show.notes ? `<td class="r small">${esc(x.r.notes || '')}</td>` : ''}</tr>`).join('')}</table>`;
  h += `<div class="rep-foot"><span>المعلم: ${esc((teacherOf(cls) || {}).name || '')}</span><span>المشرف: ${esc(S.settings.supervisor || '')}</span></div>`;
  return h;
}
/* قسم الاختبارات في تقرير الطالب وصفحة ولي الأمر */
function studentExamRows(sid, from, to) {
  return T('results').filter(r => r.studentId === sid && (!from || r.date >= from) && (!to || r.date <= to)).map(r => ({ r, ex: byId('exams', r.examId) })).filter(x => x.ex).sort((a, b) => a.r.date < b.r.date ? 1 : -1);
}
function studentExamsSection(s, from, to) {
  const rows = studentExamRows(s.id, from, to); if (!rows.length) return '';
  return `<div class="rep-sec">📝 الاختبارات</div><table class="tbl"><tr><th>الاختبار</th><th>التاريخ</th>${'<th>المواد</th>'}<th>المجموع</th><th>التقدير</th></tr>${rows.map(({ r, ex }) => { const t = resTotals(ex, r); return `<tr><td class="r"><b>${EXAM_KIND_ICON[ex.kind] || ''} ${esc(ex.title)}</b></td><td>${fmtDate(r.date, false)}</td><td class="small r">${r.absent ? 'غائب' : ex.subjects.map(sb => `${sb.icon} ${t.subj[sb.id] != null ? toAr(t.subj[sb.id]) : '—'}/${toAr(sb.total)}`).join(' · ')}</td><td><b>${t.pct != null ? toAr(t.total) + ' / ' + toAr(ex.total) : '—'}</b></td><td style="color:${gradeColor(t.pct || 0)};font-weight:800">${t.pct != null ? examGrade(t.pct) : ''}</td></tr>`; }).join('')}</table>`;
}
function parentExamsCard(s) {
  const rows = studentExamRows(s.id); if (!rows.length) return '';
  return `<div class="card"><h3>📝 نتائج الاختبارات</h3>${rows.map(({ r, ex }) => { const t = resTotals(ex, r); return `<details class="pexam"><summary><span style="font-size:22px">${EXAM_KIND_ICON[ex.kind] || '📝'}</span><span style="flex:1"><b>${esc(ex.title)}</b><br><small class="muted">${fmtDate(r.date)}</small></span>${r.absent ? '<span class="chip red">غائب</span>' : t.pct != null ? `<span class="ring-sm" style="--p:${t.pct};--c:${gradeColor(t.pct)}"><b>${Math.round(t.pct)}%</b></span><b style="color:${gradeColor(t.pct)}">${examGrade(t.pct)}</b>` : ''}</summary>
    <table class="tbl" style="margin-top:8px"><tr><th>المادة</th><th>الدرجة</th><th>التقدير</th></tr>${(ex.subjects || []).map(sb => { const v = t.subj[sb.id]; const p = v != null && sb.total ? v / sb.total * 100 : null; return `<tr><td class="r">${sb.icon} ${esc(sb.name)}</td><td><b>${v != null ? toAr(v) : '—'}</b> / ${toAr(sb.total)}</td><td style="color:${gradeColor(p || 0)}">${p != null ? examGrade(p) : ''}</td></tr>`; }).join('')}<tr style="font-weight:800"><td>المجموع</td><td>${t.pct != null ? toAr(t.total) : '—'} / ${toAr(ex.total)}</td><td>${t.pct != null ? examGrade(t.pct) : ''}</td></tr></table>
    ${r.quran && (r.quran.newErrs || []).length + Object.keys(r.quran.checks || {}).length ? `<div class="small" style="margin-top:6px">📖 أتقن من أخطائه السابقة: <b style="color:var(--green)">${Object.values(r.quran.checks || {}).filter(v => v === 'ok').length}</b> — يحتاج مراجعة: <b style="color:var(--red)">${Object.values(r.quran.checks || {}).filter(v => v === 'again').length + (r.quran.newErrs || []).length}</b></div>` : ''}
    ${r.notes ? `<div style="background:#fffbea;border-radius:10px;padding:6px 10px;margin-top:6px">📝 ${esc(r.notes)}</div>` : ''}
    ${S.settings.parentShowMedia !== false ? mediaPlayers(r.media) : ''}</details>`; }).join('')}</div>`;
}

/* ——— إعدادات الاختبارات ——— */
function examSettings(box) {
  const sc = examScale(); const show = examShowOpts();
  box.innerHTML = `<div class="card"><h3>🎖️ سلم التقديرات (بالنسبة المئوية)</h3><div class="grid g4" id="scl">${sc.map((x, i) => `<div class="row"><input class="inp" data-sl="${i}" value="${esc(x.label)}" style="flex:2"><span>من</span><input class="inp" type="number" data-sm="${i}" value="${x.min}" style="width:70px">%</div>`).join('')}</div></div>
    <div class="card"><h3>📊 ما يظهر في تقارير الاختبارات افتراضياً</h3><p class="small muted">يمكن تغييره عند كل تقرير، وهذا هو الاختيار الافتراضي.</p><div class="row">${REPORT_SHOW.map(([k, t]) => `<label class="chip" style="padding:7px 12px"><input type="checkbox" data-rs="${k}" ${show[k] ? 'checked' : ''}> ${t}</label>`).join('')}</div>
      <div class="toggle-row"><span>إظهار نتائج الاختبارات لولي الأمر في صفحة الطالب</span><label class="switch"><input type="checkbox" id="pse" ${S.settings.parentShowExams !== false ? 'checked' : ''}><span></span></label></div>
      <div class="toggle-row"><span>إظهار التسجيلات الصوتية والمرئية المختارة لولي الأمر</span><label class="switch"><input type="checkbox" id="psm" ${S.settings.parentShowMedia !== false ? 'checked' : ''}><span></span></label></div></div>
    <div class="card"><h3>🤖 التصحيح الإلكتروني لأوراق الإجابة</h3><p class="small">يقرأ صور أوراق إجابات الطلاب ويقارنها بنموذج الإجابة ويقترح الدرجات، ثم يراجعها المعلم. يحتاج مفتاح <b>Claude API</b> (من console.anthropic.com) ويُحفظ في الخادم فقط ولا يراه أحد.</p>
      ${isLocal() ? '<div class="small" style="color:var(--red)">يحتاج الربط بالخادم أولاً</div>' : `<div class="row"><input class="inp grow" id="aik" type="password" dir="ltr" placeholder="sk-ant-..."><button class="btn" id="aisave">💾 حفظ المفتاح</button><span id="aist" class="small"></span></div>`}
      <div class="field" style="margin-top:8px"><label>النموذج</label><input class="inp" id="aim" dir="ltr" value="${esc(S.settings.aiModel || 'claude-sonnet-5-5')}" style="max-width:260px"></div></div>
    <button class="btn" id="exsave">💾 حفظ إعدادات الاختبارات</button>`;
  if (!isLocal()) { api('hasSecret').then(r => { if (r.ok) $('#aist').innerHTML = r.has ? '<span class="chip green">✔️ المفتاح محفوظ</span>' : '<span class="chip gray">لم يُضف بعد</span>'; }).catch(() => {}); $('#aisave').onclick = async () => { const r = await api('setSecret', { value: $('#aik').value }); toast(r.ok ? '✔️ حُفظ المفتاح' : '⚠️ ' + r.error); if (r.ok) { $('#aik').value = ''; $('#aist').innerHTML = '<span class="chip green">✔️ المفتاح محفوظ</span>'; } }; }
  $('#exsave').onclick = () => { const scale = sc.map((x, i) => ({ label: $(`[data-sl="${i}"]`, box).value.trim(), min: +$(`[data-sm="${i}"]`, box).value || 0 })); const rs = {}; $$('[data-rs]', box).forEach(c => rs[c.dataset.rs] = c.checked ? 1 : 0); saveSettings({ examScale: scale, examReportShow: rs, parentShowExams: $('#pse').checked, parentShowMedia: $('#psm').checked, aiModel: $('#aim').value.trim() }); toast('✔️ حُفظ'); };
}
