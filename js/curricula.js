/* ===================== المناهج (الحروف، الأرقام، والمناهج المضافة) ===================== */
function curricula() { return (window.CURRICULA_BUILTIN || []).concat(S.settings.curricula || []); }
const curById = id => curricula().find(c => c.id === id);
const isCur = id => !!curById(id);
const curShort = t => String(t || '').replace(/\s*—.*$/, '');

/* تقدم الطالب في منهج: البنود المتقنة في كل درس */
function curProgress(sid, cid, recs) {
  const c = curById(cid); const map = {}; let last = null; const errs = {};
  (recs || allRecsOf(sid)).forEach(r => {
    const x = (r.cur || {})[cid]; if (!x || !x.lesson || r.att === 'a' || r.att === 'e') return;
    (x.extra || []).filter(e => e.lesson).forEach(e => { map[e.lesson] = map[e.lesson] || new Set(); if (x.grade !== 1) (e.items || []).forEach(i => map[e.lesson].add(i)); });
    map[x.lesson] = map[x.lesson] || new Set();
    if (x.grade !== 1) (x.items || []).forEach(i => map[x.lesson].add(i));
    (x.errs || []).forEach(i => { const fx = (r.errors || []).some(e => e.sub === cid && e.lesson == x.lesson && e.item === i && e.fixed); if (fx) delete errs[x.lesson + ':' + i]; else errs[x.lesson + ':' + i] = 1; });
    (x.items || []).forEach(i => { if (x.grade !== 1 && !(x.errs || []).includes(i)) delete errs[x.lesson + ':' + i]; });
    last = Object.assign({ date: r.date }, x);
  });
  if (!c) return { map, last, done: 0, pct: 0, errs: [] };
  let done = 0, sum = 0;
  c.lessons.forEach((L, i) => { const s = map[i + 1]; const k = s ? Math.min(1, s.size / Math.max(1, L.items.length)) : 0; sum += k; if (k >= 1) done++; });
  return { map, last, done, pct: c.lessons.length ? sum / c.lessons.length : 0, errs: Object.keys(errs).map(k => { const [l, i] = k.split(':').map(Number); return { lesson: l, item: i, text: (c.lessons[l - 1] || {}).items ? c.lessons[l - 1].items[i] : '' }; }) };
}
const curSegs = x => x && x.lesson ? [x].concat((x.extra || []).filter(e => e.lesson)) : [];
function curChip(cid, x) {
  const c = curById(cid); if (!c || !x || !x.lesson) return '';
  return `<span class="chip" style="background:${c.color}22;color:${c.color}">${c.icon} ${curSegs(x).map(g => esc(curShort((c.lessons[g.lesson - 1] || {}).t))).join(' + ')}</span>${gradeChip(x.grade)}`;
}
function curRevText(cid, rv) { const c = curById(cid); if (!c || !rv || !(rv.lessons || []).length) return ''; return rv.lessons.map(n => curShort((c.lessons[n - 1] || {}).t)).join('، '); }
function curLine(cid, x) {
  const c = curById(cid); if (!c || !x || !x.lesson) return '';
  const L = c.lessons[x.lesson - 1] || {};
  return `${c.icon} ${c.name}: ${curSegs(x).map(g => (c.lessons[g.lesson - 1] || {}).t || '').join(' + ')}${x.grade ? ' — ' + gradeLabel(x.grade) : ''}`;
}

/* قسم المنهج في محرر التسجيل اليومي */
function curEditorHTML(cid, x, sid, date) {
  const c = curById(cid); x = x || {};
  const prev = allRecsOf(sid).filter(r => r.date < date && r.cur && r.cur[cid] && r.cur[cid].lesson).pop();
  const L = x.lesson ? c.lessons[x.lesson - 1] : null;
  return `<div class="sec" data-cur="${cid}"><div class="sec-h"><span>${c.icon}</span>${esc(c.name)}<span class="sp"></span>${recButtons(cid)}${c.book ? `<span class="small muted">📘 ${esc(c.book.replace('.pdf', ''))}</span>` : ''}</div>
    ${prev ? `<div class="small muted" style="margin-bottom:6px">آخر تسجيل (${fmtDate(prev.date, false)}): <b>${esc((c.lessons[prev.cur[cid].lesson - 1] || {}).t || '')}</b> ${gradeChip(prev.cur[cid].grade)}${!x.lesson ? ` <button type="button" class="btn sm gold" data-csug="${cid}">↩️ متابعة</button>` : ''}</div>` : ''}
    <select class="inp" data-cles="${cid}"><option value="">— اختر الدرس —</option>${c.lessons.map((l, i) => `<option value="${i + 1}" ${x.lesson == i + 1 ? 'selected' : ''}>${i + 1}. ${esc(l.t)}${l.p ? ' (ص ' + l.p + ')' : ''}</option>`).join('')}</select>
    ${L ? `<div class="small muted" style="margin:8px 0 4px">اضغط على ما أتقنه الطالب ✔️ — وضاعف الضغط (أو فعّل وضع الأخطاء) على ما أخطأ فيه ✖️</div>
      <div class="row" style="margin-bottom:6px"><button type="button" class="btn sm ghost" data-call="${cid}">✔️ الكل</button><label class="row small"><input type="checkbox" data-cerr="${cid}"> وضع تحديد الأخطاء</label></div>
      <div class="noor-items">${L.items.map((it, i) => `<button type="button" data-citem="${cid}|${i}" class="${(x.errs || []).includes(i) ? 'err' : (x.items || []).includes(i) ? 'in' : ''}" style="font-family:Tajawal;font-size:16px">${(x.errs || []).includes(i) ? '✖️ ' : (x.items || []).includes(i) ? '✔️ ' : ''}${esc(it)}</button>`).join('')}</div>` : ''}
    ${(x.extra || []).map((e, i) => { const EL = e.lesson ? c.lessons[e.lesson - 1] : null; return `<div class="seg-box"><div class="row small"><b>➕ درس ${i + 2}</b><span style="flex:1"></span><button type="button" class="btn sm ghost" data-cxr="${cid}|${i}">✕ حذف</button></div>
      <select class="inp" data-cxl="${cid}|${i}"><option value="">— اختر الدرس —</option>${c.lessons.map((l, j) => `<option value="${j + 1}" ${e.lesson == j + 1 ? 'selected' : ''}>${j + 1}. ${esc(l.t)}</option>`).join('')}</select>
      ${EL ? `<div class="noor-items" style="margin-top:6px">${EL.items.map((it, j) => `<button type="button" data-cxi="${cid}|${i}|${j}" class="${(e.items || []).includes(j) ? 'in' : ''}" style="font-family:Tajawal;font-size:15px">${(e.items || []).includes(j) ? '✔️ ' : ''}${esc(it)}</button>`).join('')}</div>` : ''}</div>`; }).join('')}
    <div style="margin-top:6px"><button type="button" class="btn sm light" data-cxadd="${cid}">➕ إضافة درس آخر</button></div>
    <div style="margin-top:8px">${gradeButtons(x.grade, 'cur|' + cid)}</div>
    <div class="sub-errbox" data-eb="${cid}"></div>
    <div class="seg-box" style="background:#f6f9ff;border-color:#c9d6f0"><div class="small"><b>🔁 مراجعة دروس ${esc(c.name)}</b> <span class="muted">— اختر الدروس التي راجعها</span></div><div data-mrev="${cid}" style="margin-top:4px"></div><div style="margin-top:6px">${gradeButtons(((typeof DAILY_REV !== 'undefined' && DAILY_REV && DAILY_REV[cid]) || {}).grade, 'crev|' + cid)}</div></div>${typeof DAILY_MEDIA !== 'undefined' && DAILY_MEDIA ? `<div data-mlist="${cid}">${mediaListHTML(DAILY_MEDIA, true, cid)}</div>` : ''}</div>`;
}
function curSuggest(sid, date, cid) {
  const c = curById(cid); const pr = curProgress(sid, cid, allRecsOf(sid).filter(r => r.date < date));
  if (!pr.last) return { lesson: 1, items: [], errs: [] };
  const l = pr.last.lesson; const s = pr.map[l]; const L = c.lessons[l - 1];
  if (s && s.size >= L.items.length && l < c.lessons.length) return { lesson: l + 1, items: [], errs: [] };
  return { lesson: l, items: [], errs: [] };
}

/* ——— تقرير منهج لفصل ——— */
function curReport(cid, curId, from, to, lbl) {
  const cls = byId('classes', cid); const c = curById(curId); if (!cls || !c) return '<div class="empty">اختر الفصل والمنهج</div>';
  const st = studentsOfClass(cid);
  let h = repHeader('تقرير منهج: ' + c.name, lbl) + `<div class="rep-meta"><span>الفصل: <b>${esc(cls.name)}</b></span><span>المعلم: <b>${esc((teacherOf(cls) || {}).name || '')}</b></span><span>عدد الدروس: <b>${c.lessons.length}</b></span></div>`;
  h += `<table class="tbl"><tr><th>م</th><th>الطالب</th><th>الدرس الحالي</th><th>دروس مكتملة</th><th>تسجيلات الفترة</th><th>متوسط التقدير</th><th>يحتاج متابعة في</th><th>التقدم</th></tr>${st.map((s, i) => {
    const pr = curProgress(s.id, curId); const per = recsOf(s.id, from, to).filter(r => r.cur && r.cur[curId] && r.cur[curId].lesson);
    const g = per.filter(r => r.cur[curId].grade); const avg = g.length ? g.reduce((a, r) => a + r.cur[curId].grade, 0) / g.length : 0;
    return `<tr><td>${i + 1}</td><td class="r"><b>${esc(s.name)}</b></td><td class="r">${pr.last ? esc(c.lessons[pr.last.lesson - 1].t) : '—'}</td><td>${pr.done} / ${c.lessons.length}</td><td>${per.length}</td><td>${avg ? gradeLabel(Math.round(avg)) : ''}</td><td class="small r">${pr.errs.slice(0, 4).map(e => esc(curShort(c.lessons[e.lesson - 1].t)) + ': ' + esc(e.text)).join('<br>')}</td><td><div class="prog" style="min-width:80px"><i style="width:${Math.round(pr.pct * 100)}%"></i></div><small>${Math.round(pr.pct * 100)}%</small></td></tr>`; }).join('')}</table>`;
  h += `<div class="rep-sec">خريطة الدروس</div><div class="tbl-wrap"><table class="tbl"><tr><th>الطالب</th>${c.lessons.map((l, i) => `<th title="${esc(l.t)}" style="font-size:11.5px;padding:4px 2px">${i + 1}</th>`).join('')}</tr>${st.map(s => { const pr = curProgress(s.id, curId); return `<tr><td class="r" style="white-space:nowrap">${esc(s.name.split(' ').slice(0, 2).join(' '))}</td>${c.lessons.map((l, i) => { const k = pr.map[i + 1] ? pr.map[i + 1].size / l.items.length : 0; return `<td style="padding:2px">${k >= 1 ? '✅' : k > 0 ? '🟡' : ''}</td>`; }).join('')}</tr>`; }).join('')}</table></div><div class="small muted">✅ مكتمل — 🟡 بدأ فيه</div>`;
  return h;
}

/* ——— قسم المنهج في تقرير الطالب ——— */
function curStudentSection(s, cid, rs) {
  const c = curById(cid); const rows = rs.filter(r => (r.cur && r.cur[cid] && r.cur[cid].lesson) || (r.curRev && r.curRev[cid])); const pr = curProgress(s.id, cid);
  let h = `<div class="rep-sec">${c.icon} ${esc(c.name)} <span class="small muted">— مكتمل ${pr.done} من ${c.lessons.length} درساً (${Math.round(pr.pct * 100)}%)</span></div>`;
  h += rows.length ? `<table class="tbl"><tr><th>التاريخ</th><th>الدرس</th><th>ما أتقنه</th><th>يحتاج متابعة</th><th>التقدير</th><th>مراجعة الدروس</th></tr>${rows.map(r => { const x = (r.cur || {})[cid] || {}; const L = c.lessons[(x.lesson || 0) - 1] || { items: [] }; return `<tr><td>${fmtDate(r.date)}</td><td class="r">${curSegs(x).map(g => esc((c.lessons[g.lesson - 1] || {}).t || '')).join('<br>')}</td><td class="r small">${(x.items || []).map(i => esc(L.items[i])).join('، ')}</td><td class="r small" style="color:var(--red)">${(x.errs || []).map(i => esc(L.items[i])).join('، ')}</td><td>${gradeLabel(x.grade)}</td><td class="r small">${esc(curRevText(cid, (r.curRev || {})[cid]))}${(r.curRev || {})[cid] && r.curRev[cid].grade ? ' — ' + gradeLabel(r.curRev[cid].grade) : ''}</td></tr>`; }).join('')}</table>` : '<div class="muted small">لا توجد تسجيلات في هذه الفترة</div>';
  return h;
}

/* ——— قسم المنهج في صفحة ولي الأمر ——— */
function curParentCard(s, cid) {
  const c = curById(cid); const pr = curProgress(s.id, cid);
  return `<div class="card"><h3>${c.icon} ${esc(c.name)}</h3>${pr.last ? `<div style="margin-bottom:8px">الدرس الحالي: <b>${esc(c.lessons[pr.last.lesson - 1].t)}</b> ${gradeChip(pr.last.grade)}</div>` : '<div class="muted small">لم يبدأ بعد</div>'}
    <div class="row small" style="margin-bottom:6px"><span>أنجز ${pr.done} من ${c.lessons.length} درساً</span><div class="prog" style="flex:1"><i style="width:${Math.max(1, pr.pct * 100)}%"></i></div><b>${Math.round(pr.pct * 100)}%</b></div>
    <div class="noor-path">${c.lessons.map((l, i) => { const k = pr.map[i + 1] ? pr.map[i + 1].size / l.items.length : 0; return `<span class="${k >= 1 ? 'done' : pr.last && pr.last.lesson === i + 1 ? 'cur' : ''}" title="${esc(l.t)}" style="${k > 0 && k < 1 && !(pr.last && pr.last.lesson === i + 1) ? 'background:#fff1dd;color:#a8600f' : ''}">${esc(curShort(l.t).replace(/^(حرف|الرقم)\s*/, '').replace(/\s*\(.*\)/, '').slice(0, 3))}</span>`; }).join('')}</div>
    ${pr.errs.length ? `<div class="small" style="margin-top:8px;color:var(--red)">📌 يحتاج تدريباً في البيت: ${pr.errs.slice(0, 6).map(e => esc(curShort(c.lessons[e.lesson - 1].t)) + ' — ' + esc(e.text)).join('، ')}</div>` : ''}</div>`;
}

/* ——— شاشة إعداد المناهج ——— */
function curriculaSettings(box) {
  const custom = S.settings.curricula || [];
  box.innerHTML = `<div class="card"><h3>📚 المناهج</h3><p class="small muted">كل منهج مقسم إلى دروس، ولكل درس بنود (مهارات) يسجل المعلم ما أتقنه الطالب منها يومياً. يمكن رفع المنهج من ملف (Excel أو Word أو PDF أو صورة). ويختار كل معلم مناهج فصله من «📚 مناهج فصلي» في المتابعة اليومية.</p>
    ${curricula().map(c => { const b = !(S.settings.curricula || []).some(x => x.id === c.id); return `<div class="list-item"><span style="font-size:30px">${c.icon}</span><div style="flex:1"><b>${esc(c.name)}</b><div class="small muted">${c.lessons.length} درساً${c.book ? ' · 📘 ' + esc(c.book.replace('.pdf', '')) : ''}${b ? ' · منهج أساسي' : ' · منهج مضاف' + (c.byName ? ' (أضافه ' + esc(c.byName) + ')' : '')} · مفعّل في ${T('classes').filter(x => (x.subjects || []).includes(c.id)).length} فصل</div></div><button class="btn sm light" data-cv="${c.id}">👁️ الدروس</button>${b ? '' : `<button class="btn sm light" data-ce="${c.id}">✏️</button>`}</div>`; }).join('')}
    <div class="row" style="margin-top:12px"><button class="btn" id="cadd">➕ إضافة منهج جديد</button><button class="btn gold" id="callon">✅ تفعيل جميع المناهج في جميع الفصول</button></div></div>`;
  box.onclick = e => {
    const v = e.target.closest('[data-cv]'); if (v) { const c = curById(v.dataset.cv); modal({ title: c.icon + ' ' + esc(c.name), body: `<table class="tbl"><tr><th>م</th><th>الدرس</th><th>الصفحة</th><th>البنود</th></tr>${c.lessons.map((l, i) => `<tr><td>${i + 1}</td><td class="r"><b>${esc(l.t)}</b></td><td>${esc(l.p || '')}</td><td class="r small">${l.items.map(esc).join('، ')}</td></tr>`).join('')}</table>`, foot: false, wide: true }); }
    const ed = e.target.closest('[data-ce]'); if (ed) curForm(custom.find(x => x.id === ed.dataset.ce));
    if (e.target.id === 'cadd') curForm();
    if (e.target.id === 'callon') { enableAllCurricula(); render(); }
  };
}
function curForm(c, onSaved) {
  c = c || { icon: '📗', color: '#2c8a4b', lessons: [] };
  const mine = !c.id || canAdmin() || (S.me && c.by === S.me.id);
  const txt = c.lessons.map(l => l.t + (l.p ? ' [' + l.p + ']' : '') + ' : ' + l.items.join('، ')).join('\n');
  const m = modal({ title: c.id ? 'تعديل المنهج' : '📚 منهج جديد', wide: true, body: `
    ${mine ? `<div class="card" style="background:#eef8f5;padding:10px 12px"><div class="row" style="gap:8px;flex-wrap:wrap"><b style="flex:1;min-width:200px">📤 رفع ملف المنهج <span class="small muted" style="font-weight:400">— Excel أو Word أو PDF أو صورة أو نص، فتُستخرج الدروس والبنود تلقائياً لتراجعها قبل الحفظ</span></b>
      <label class="btn"><input type="file" id="cfile" accept=".xlsx,.xls,.csv,.txt,.docx,.pdf,image/*" hidden>📤 اختيار الملف</label></div><div class="small" id="cfst" style="margin-top:6px"></div></div>` : ''}
    <div class="grid g3"><div class="field"><label class="req">اسم المنهج</label><input class="inp" id="cn" value="${esc(c.name || '')}" placeholder="مثال: التربية الإسلامية"></div><div class="field"><label>رمز (إيموجي)</label><input class="inp" id="ci" value="${esc(c.icon || '📗')}"></div><div class="field"><label>اللون</label><input class="inp" type="color" id="cc" value="${c.color || '#2c8a4b'}"></div></div>
    <div class="field"><label>اسم الكتاب (اختياري)</label><input class="inp" id="cb" value="${esc(c.book || '')}"></div>
    <div class="field"><label>الدروس — درس في كل سطر، وبعد النقطتين بنود الدرس مفصولة بفاصلة. ويمكن كتابة الصفحة بين قوسين [ ]</label><textarea class="inp" id="cl" rows="12" placeholder="الدرس الأول: الوضوء [5] : معرفة الفرائض، تطبيق عملي، الدعاء بعده&#10;الدرس الثاني: الصلاة [9] : الأركان، الواجبات">${esc(txt)}</textarea></div>
    <div class="small muted">إن لم تكتب بنوداً لدرس يُعتبر بنداً واحداً «الدرس كاملاً». <span id="ccount"></span></div>`,
    foot: mine ? `<button class="btn" data-ok>💾 حفظ المنهج</button>${c.id ? '<button class="btn red" data-del>🗑️ حذف</button>' : ''}` : '<span class="small muted">هذا المنهج أضافه غيرك — يعدّله صاحبه أو الإدارة</span>' });
  const cnt = () => { const n = $('#cl', m.el).value.split('\n').filter(x => x.trim()).length; $('#ccount', m.el).textContent = n ? '— عدد الدروس: ' + n : ''; };
  $('#cl', m.el).oninput = cnt; cnt();
  const fi = $('#cfile', m.el); if (fi) fi.onchange = async e => {
    const f = e.target.files[0]; if (!f) return; const st = $('#cfst', m.el);
    st.innerHTML = '⏳ جاري قراءة «' + esc(f.name) + '»…';
    try {
      const r = await importCurFile(f, msg => st.innerHTML = '⏳ ' + msg);
      if (!r.lessons.length) throw new Error('لم أجد دروساً في الملف');
      if (r.name && !$('#cn', m.el).value.trim()) $('#cn', m.el).value = r.name;
      if (!$('#cb', m.el).value.trim()) $('#cb', m.el).value = f.name.replace(/\.[^.]+$/, '');
      $('#cl', m.el).value = r.lessons.map(l => l.t + (l.p ? ' [' + l.p + ']' : '') + ' : ' + (l.items || []).join('، ')).join('\n'); cnt();
      st.innerHTML = `✔️ استُخرج <b>${r.lessons.length}</b> ${r.lessons.length >= 3 && r.lessons.length <= 10 ? 'دروس' : 'درساً'} — راجعها وعدّل ما تريد ثم اضغط «💾 حفظ المنهج»`;
    } catch (er) { st.innerHTML = '<span style="color:var(--red)">⚠️ ' + esc((er && er.message) || 'تعذر قراءة الملف') + '</span>'; }
    e.target.value = '';
  };
  const ok = $('[data-ok]', m.el); if (ok) ok.onclick = async () => {
    const name = $('#cn', m.el).value.trim(); if (!name) return toast('اكتب اسم المنهج');
    const lessons = parseCurLines($('#cl', m.el).value);
    if (!lessons.length) return toast('اكتب درساً واحداً على الأقل');
    const obj = Object.assign({}, c, { name, icon: $('#ci', m.el).value || '📗', color: $('#cc', m.el).value, book: $('#cb', m.el).value.trim(), lessons });
    ok.disabled = true;
    try { const id = await saveCurriculum(obj); m.close(); toast('✔️ حُفظ المنهج «' + name + '» وانضم إلى قائمة المناهج'); if (onSaved) onSaved(id); render(); }
    catch (er) { toast('⚠️ ' + er.message); ok.disabled = false; }
  };
  const d = $('[data-del]', m.el); if (d) d.onclick = async () => { if (await confirmBox('حذف المنهج «' + c.name + '»؟ (تبقى تسجيلات الطلاب السابقة محفوظة)')) { try { await saveCurriculum(c, true); m.close(); render(); } catch (er) { toast('⚠️ ' + er.message); } } };
}
/* تحويل نص الدروس إلى دروس وبنود */
function parseCurLines(text) {
  return String(text || '').split('\n').map(x => x.trim()).filter(Boolean).map(line => {
    const parts = line.split(/\s:\s|:(?=[^:]*$)/); let t = parts[0].trim(); let p = ''; const pm = t.match(/\[([^\]]+)\]/); if (pm) { p = pm[1]; t = t.replace(pm[0], '').trim(); }
    const items = (parts[1] || '').split(/[،,]/).map(x => x.trim()).filter(Boolean);
    return { t, p, items: items.length ? items : ['الدرس كاملاً'] };
  }).filter(l => l.t);
}
/* حفظ المنهج: الإدارة مباشرة، والمعلم عبر الخادم (يضيف مناهج جديدة ويعدّل ما أضافه) */
async function saveCurriculum(obj, remove) {
  const list = (S.settings.curricula || []).slice();
  if (canAdmin() && (isLocal() || !S.server)) {
    if (remove) saveSettings({ curricula: list.filter(x => x.id !== obj.id) });
    else { if (!obj.id) { obj.id = 'cur_' + uid(); obj.by = S.me ? S.me.id : ''; list.push(obj); } else list[list.findIndex(x => x.id === obj.id)] = obj; saveSettings({ curricula: list }); }
    return obj.id;
  }
  const r = await api('saveCur', { cur: obj, remove: !!remove }); if (!r.ok) throw new Error(r.error || 'تعذر الحفظ');
  const main = (S.data.settings || []).find(x => x.id === 'main'); if (main) { main.curricula = r.curricula; } else S.data.settings = [{ id: 'main', curricula: r.curricula }];
  persist(); return r.id;
}
/* قراءة ملف المنهج: Excel/CSV/نص محلياً، وWord نصاً، وPDF والصور بالذكاء الاصطناعي */
async function importCurFile(f, status) {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    status('قراءة الجدول…'); try { await loadXLSX(); } catch (e) { throw new Error('تعذر تحميل أداة قراءة Excel — تحقق من الإنترنت وأعد المحاولة'); }
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]];
    let rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).map(r => r.map(x => String(x).trim())).filter(r => r.some(Boolean));
    if (rows.length && /درس|الدرس|العنوان|lesson/i.test(rows[0].join(' ')) && !/^\d/.test(rows[0][0])) rows = rows.slice(1);
    const lessons = rows.map(r => { const cells = r.filter(Boolean); if (!cells.length) return null; let t = cells[0], p = '', rest = cells.slice(1);
      if (/^\d+$/.test(t) && cells.length > 1) { t = cells[1]; rest = cells.slice(2); } // عمود الترقيم
      if (rest.length && /^\d+(\s*[-–]\s*\d+)?$/.test(rest[0])) { p = rest[0]; rest = rest.slice(1); } // عمود الصفحة
      const items = rest.length === 1 ? rest[0].split(/[،,]/).map(x => x.trim()).filter(Boolean) : rest;
      return { t, p, items: items.length ? items : ['الدرس كاملاً'] }; }).filter(Boolean);
    return { name: wb.SheetNames[0] && !/^sheet\d*$/i.test(wb.SheetNames[0]) ? wb.SheetNames[0] : '', lessons };
  }
  let text = '';
  if (ext === 'txt') text = await f.text();
  else if (ext === 'docx') { status('قراءة ملف Word…'); try { await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js'); } catch (e) { throw new Error('تعذر تحميل أداة قراءة Word — تحقق من الإنترنت وأعد المحاولة'); } text = (await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value; }
  // نص منسّق مسبقاً (درس : بنود) يُقرأ مباشرة
  if (text && text.split('\n').filter(l => /:/.test(l)).length >= 3) return { name: '', lessons: parseCurLines(text) };
  if (isLocal()) { if (text) return { name: '', lessons: parseCurLines(text) }; throw new Error('قراءة PDF والصور تحتاج الربط بالخادم ومفتاح الذكاء الاصطناعي — أو ارفع ملف Excel/Word'); }
  status('🤖 يقرأ الذكاء الاصطناعي الملف ويستخرج الدروس… (قد يستغرق دقيقة)');
  const payload = { prompt: CUR_AI_PROMPT + (text ? '\n\nنص الكتاب:\n' + text.slice(0, 60000) : ''), maxTokens: 12000 };
  if (!text) {
    if (f.size > 25 * 1024 * 1024) throw new Error('الملف أكبر من 25 ميجا — قسّمه أو ارفع فهرس الكتاب فقط');
    const b64 = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = no; fr.readAsDataURL(f); });
    if (ext === 'pdf') payload.docs = [{ mime: 'application/pdf', data: b64 }]; else payload.images = [{ mime: f.type || 'image/jpeg', data: b64 }];
  }
  const r = await api('aiGrade', payload); if (!r.ok) throw new Error(r.error);
  const j = String(r.text || '').match(/\{[\s\S]*\}/); if (!j) throw new Error('لم أستطع قراءة الدروس من الملف');
  const o = JSON.parse(j[0]);
  return { name: o.name || '', lessons: (o.lessons || []).map(l => ({ t: String(l.t || l.title || '').trim(), p: String(l.p || l.page || '').trim(), items: (l.items || []).map(x => String(x).trim()).filter(Boolean) })).filter(l => l.t).map(l => (l.items.length || (l.items = ['الدرس كاملاً']), l)) };
}
const CUR_AI_PROMPT = `هذا كتاب أو منهج تعليمي للأطفال. استخرج منه قائمة الدروس بالترتيب، ولكل درس بنوده (المهارات أو الأهداف أو الفقرات التي يُقيَّم فيها الطفل، من 1 إلى 8 بنود قصيرة)، ورقم الصفحة إن وُجد.
أجب بـ JSON فقط دون أي شرح، بهذا الشكل:
{"name":"اسم المنهج أو الكتاب","lessons":[{"t":"عنوان الدرس","p":"رقم الصفحة","items":["بند 1","بند 2"]}]}`;

/* تفعيل كل المناهج في كل الفصول (مرة واحدة تلقائياً عند فتح المدير للتطبيق، ومتاح بزر في الإعدادات) */
function enableAllCurricula(silent) {
  const ids = ['quran', 'noor', 'zad'].concat(curricula().map(c => c.id)); let n = 0;
  S.data.classes.forEach(c => { const cur = c.subjects || ['quran', 'noor', 'zad']; const add = ids.filter(i => !cur.includes(i)); if (add.length) { c.subjects = cur.concat(add); save('classes', c); n++; } });
  if (!silent) toast('✔️ فُعّلت جميع المناهج في ' + T('classes').length + ' فصل');
  return n;
}
function autoEnableCurricula() {
  if (!canAdmin() || viewingArchive() || S.settings.curAllOn) return;
  if (!S.data.classes.length) return;
  enableAllCurricula(true); saveSettings({ curAllOn: 1 }); render();
}

/* ——— نصوص دروس النورانية الإضافية والمراجعات ——— */
const noorSegs = n => n && n.lesson ? [n].concat((n.extra || []).filter(e => e.lesson)) : [];
function noorText(n, long) { return noorSegs(n).map(g => (long ? NOORANIA[g.lesson - 1].title : 'د' + g.lesson) + (g.from ? ' (' + g.from + '–' + g.to + ')' : '')).join(' + '); }
function noorRevText(rv) { return rv && (rv.lessons || []).length ? rv.lessons.map(n => 'الدرس ' + n).join('، ') : ''; }
function zadRevText(rv) { return rv && (rv.items || []).length ? rv.items.map(k => k.split('|').slice(1).join('|')).join('، ') : ''; }

/* ——— الأخطاء والتصويب: كل خطأ مرتبط بمادته ——— */
/* يجمع أخطاء التسجيل ومعها أخطاء المناهج المحددة بالضغط على البنود (للسجلات القديمة أيضاً) */
function recErrs(r) {
  const out = (r.errors || []).slice();
  Object.keys(r.cur || {}).forEach(cid => {
    const x = r.cur[cid], c = curById(cid); if (!c || !x || !x.lesson) return;
    const L = c.lessons[x.lesson - 1] || { items: [] };
    (x.errs || []).forEach(i => { if (!out.some(e => e.sub === cid && e.lesson == x.lesson && e.item === i)) out.push({ sub: cid, lesson: x.lesson, item: i, word: L.items[i], type: 'يحتاج تدريباً', note: '' }); });
  });
  return out;
}
function errSubName(sub) {
  const M = { hifz: 'الحفظ', review: 'المراجعة', far: 'المراجعة البعيدة', noor: 'النورانية', zad: 'زاد الطفل' };
  return M[sub] || (curById(sub) ? curById(sub).name : '');
}
/* موضع الخطأ داخل مادته (بدون اسم المادة) */
function errPlace(e) {
  if (['hifz', 'review', 'far'].includes(e.sub)) return (e.s ? (Q.names[e.s - 1] || '') + ' ' + (e.a || '') : '') + (e.word ? ' «' + esc(e.word) + '»' : '');
  if (e.sub === 'noor') return (e.lesson ? 'د' + e.lesson + ' ' : '') + (e.word ? '«' + esc(e.word) + '»' : '');
  if (curById(e.sub)) { const c = curById(e.sub); return (e.lesson ? esc(curShort((c.lessons[e.lesson - 1] || {}).t || '')) : '') + (e.word ? ' — «' + esc(e.word) + '»' : ''); }
  return e.word ? '«' + esc(e.word) + '»' : '';
}
function errLine(e, withSub) {
  const p = errPlace(e).trim();
  return `${e.fixed ? '✅' : '❌'} ${withSub ? '<b>' + esc(errSubName(e.sub)) + ':</b> ' : ''}${p}${p && (e.type || e.note) ? ' — ' : ''}${esc(e.type || '')}${e.note ? ': ' + esc(e.note) : ''}${e.fixed ? ' <span class="muted">(صُوِّب)</span>' : ''}`;
}

/* ——— مناهج الفصل: كل معلم يختار ما يدرّسه في فصله فلا تظهر عنده مناهج أخرى ——— */
/* مواد فصل أو مجموعة فصول (اتحاد) */
function subjectsOf(cids) {
  const cs = (cids && cids.length ? cids.map(id => byId('classes', id)) : (canAdmin() ? T('classes') : myClasses())).filter(Boolean);
  if (!cs.length) return ['quran', 'noor', 'zad'].concat(curricula().map(c => c.id));
  const set = new Set(); cs.forEach(c => classSubjects(c).forEach(x => set.add(x))); return [...set];
}
function canEditClassSubjects(c) { return c && (canAdmin() || (S.me && (c.teacherId === S.me.id || (c.teacherIds || []).includes(S.me.id)))); }
function classSubjectsDialog(cid) {
  const c = byId('classes', cid); if (!c) return toast('اختر فصلاً');
  if (!canEditClassSubjects(c)) return toast('هذا الفصل ليس فصلك');
  const f = features(); const cur = c.subjects || ['quran', 'noor', 'zad'];
  const base = [['quran', '📖 القرآن الكريم (حفظ ومراجعة)'], ['noor', '🔤 القاعدة النورانية'], ['zad', '🌸 زاد الطفل المسلم']].filter(([k]) => f[k]);
  const chip = (k, t, sub) => `<label class="list-item" style="cursor:pointer;gap:10px"><input type="checkbox" class="cs" value="${k}" ${cur.includes(k) ? 'checked' : ''} style="width:20px;height:20px"><div style="flex:1"><b>${t}</b>${sub ? `<div class="small muted">${sub}</div>` : ''}</div></label>`;
  const m = modal({ title: '📚 مناهج ' + esc(c.name), body: `
    <p class="small muted" style="margin-top:0">اختر ما تدرّسه في هذا الفصل فقط. تظهر المواد المختارة في المتابعة اليومية والتقارير والاختبارات وصفحة ولي الأمر، ولا تظهر غيرها. التسجيلات السابقة لا تُحذف.</p>
    <div class="sec-h">المواد الأساسية</div>${base.map(([k, t]) => chip(k, t)).join('')}
    <div class="sec-h" style="margin-top:10px">المناهج</div>${curricula().map(cu => chip(cu.id, cu.icon + ' ' + esc(cu.name), cu.lessons.length + ' درساً' + (cu.byName ? ' · أضافه ' + esc(cu.byName) : ''))).join('') || '<div class="small muted">لا توجد مناهج</div>'}
    <button class="btn light block" id="cs-add" style="margin-top:10px">➕ إضافة منهج جديد أو رفع ملف منهج</button>`,
    foot: '<button class="btn" data-ok>💾 حفظ مناهج الفصل</button>' });
  $('#cs-add', m.el).onclick = () => {
    const keep = $$('.cs:checked', m.el).map(x => x.value); m.close();
    curForm(null, id => { // المنهج الجديد يُضاف لفصلك مباشرة مع ما اخترته
      const hidden = (c.subjects || []).filter(k => !isCur(k) && !f[k]);
      c.subjects = hidden.concat(keep.filter(k => k !== id), [id]); c.subjSet = 1; c.updatedAt = Date.now(); save('classes', c);
      setTimeout(() => classSubjectsDialog(cid), 300);
    });
  };
  $('[data-ok]', m.el).onclick = () => {
    const sel = $$('.cs:checked', m.el).map(x => x.value);
    if (!sel.length) return toast('اختر مادة واحدة على الأقل');
    // يُحفظ ترتيب المواد كما في القائمة، مع إبقاء المواد غير الظاهرة (المعطّلة في الخصائص) كما كانت
    const hidden = cur.filter(k => !isCur(k) && !f[k]);
    c.subjects = hidden.concat(sel); c.subjSet = 1; c.updatedAt = Date.now(); save('classes', c);
    m.close(); toast('✔️ حُفظت مناهج ' + c.name); render();
  };
}
