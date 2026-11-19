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
    map[x.lesson] = map[x.lesson] || new Set();
    if (x.grade !== 1) (x.items || []).forEach(i => map[x.lesson].add(i));
    (x.errs || []).forEach(i => { errs[x.lesson + ':' + i] = 1; });
    (x.items || []).forEach(i => { if (x.grade !== 1 && !(x.errs || []).includes(i)) delete errs[x.lesson + ':' + i]; });
    last = Object.assign({ date: r.date }, x);
  });
  if (!c) return { map, last, done: 0, pct: 0, errs: [] };
  let done = 0, sum = 0;
  c.lessons.forEach((L, i) => { const s = map[i + 1]; const k = s ? Math.min(1, s.size / Math.max(1, L.items.length)) : 0; sum += k; if (k >= 1) done++; });
  return { map, last, done, pct: c.lessons.length ? sum / c.lessons.length : 0, errs: Object.keys(errs).map(k => { const [l, i] = k.split(':').map(Number); return { lesson: l, item: i, text: (c.lessons[l - 1] || {}).items ? c.lessons[l - 1].items[i] : '' }; }) };
}
function curChip(cid, x) {
  const c = curById(cid); if (!c || !x || !x.lesson) return '';
  const L = c.lessons[x.lesson - 1] || {};
  return `<span class="chip" style="background:${c.color}22;color:${c.color}">${c.icon} ${esc(curShort(L.t))}${x.items && x.items.length ? ' (' + x.items.length + '/' + (L.items || []).length + ')' : ''}</span>${gradeChip(x.grade)}`;
}
function curLine(cid, x) {
  const c = curById(cid); if (!c || !x || !x.lesson) return '';
  const L = c.lessons[x.lesson - 1] || {};
  return `${c.icon} ${c.name}: ${L.t || ''}${x.items && x.items.length ? ' — ' + x.items.map(i => L.items[i]).join('، ') : ''}${x.grade ? ' — ' + gradeLabel(x.grade) : ''}`;
}

/* قسم المنهج في محرر التسجيل اليومي */
function curEditorHTML(cid, x, sid, date) {
  const c = curById(cid); x = x || {};
  const prev = allRecsOf(sid).filter(r => r.date < date && r.cur && r.cur[cid] && r.cur[cid].lesson).pop();
  const L = x.lesson ? c.lessons[x.lesson - 1] : null;
  return `<div class="sec" data-cur="${cid}"><div class="sec-h"><span>${c.icon}</span>${esc(c.name)}<span class="sp"></span>${c.book ? `<span class="small muted">📘 ${esc(c.book.replace('.pdf', ''))}</span>` : ''}</div>
    ${prev ? `<div class="small muted" style="margin-bottom:6px">آخر تسجيل (${fmtDate(prev.date, false)}): <b>${esc((c.lessons[prev.cur[cid].lesson - 1] || {}).t || '')}</b> ${gradeChip(prev.cur[cid].grade)}${!x.lesson ? ` <button type="button" class="btn sm gold" data-csug="${cid}">↩️ متابعة</button>` : ''}</div>` : ''}
    <select class="inp" data-cles="${cid}"><option value="">— اختر الدرس —</option>${c.lessons.map((l, i) => `<option value="${i + 1}" ${x.lesson == i + 1 ? 'selected' : ''}>${i + 1}. ${esc(l.t)}${l.p ? ' (ص ' + l.p + ')' : ''}</option>`).join('')}</select>
    ${L ? `<div class="small muted" style="margin:8px 0 4px">اضغط على ما أتقنه الطالب ✔️ — وضاعف الضغط (أو فعّل وضع الأخطاء) على ما أخطأ فيه ✖️</div>
      <div class="row" style="margin-bottom:6px"><button type="button" class="btn sm ghost" data-call="${cid}">✔️ الكل</button><label class="row small"><input type="checkbox" data-cerr="${cid}"> وضع تحديد الأخطاء</label></div>
      <div class="noor-items">${L.items.map((it, i) => `<button type="button" data-citem="${cid}|${i}" class="${(x.errs || []).includes(i) ? 'err' : (x.items || []).includes(i) ? 'in' : ''}" style="font-family:Tajawal;font-size:14px">${(x.errs || []).includes(i) ? '✖️ ' : (x.items || []).includes(i) ? '✔️ ' : ''}${esc(it)}</button>`).join('')}</div>` : ''}
    <div style="margin-top:8px">${gradeButtons(x.grade, 'cur|' + cid)}</div></div>`;
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
  h += `<div class="rep-sec">خريطة الدروس</div><div class="tbl-wrap"><table class="tbl"><tr><th>الطالب</th>${c.lessons.map((l, i) => `<th title="${esc(l.t)}" style="font-size:10px;padding:4px 2px">${i + 1}</th>`).join('')}</tr>${st.map(s => { const pr = curProgress(s.id, curId); return `<tr><td class="r" style="white-space:nowrap">${esc(s.name.split(' ').slice(0, 2).join(' '))}</td>${c.lessons.map((l, i) => { const k = pr.map[i + 1] ? pr.map[i + 1].size / l.items.length : 0; return `<td style="padding:2px">${k >= 1 ? '✅' : k > 0 ? '🟡' : ''}</td>`; }).join('')}</tr>`; }).join('')}</table></div><div class="small muted">✅ مكتمل — 🟡 بدأ فيه</div>`;
  return h;
}

/* ——— قسم المنهج في تقرير الطالب ——— */
function curStudentSection(s, cid, rs) {
  const c = curById(cid); const rows = rs.filter(r => r.cur && r.cur[cid] && r.cur[cid].lesson); const pr = curProgress(s.id, cid);
  let h = `<div class="rep-sec">${c.icon} ${esc(c.name)} <span class="small muted">— مكتمل ${pr.done} من ${c.lessons.length} درساً (${Math.round(pr.pct * 100)}%)</span></div>`;
  h += rows.length ? `<table class="tbl"><tr><th>التاريخ</th><th>الدرس</th><th>ما أتقنه</th><th>يحتاج متابعة</th><th>التقدير</th></tr>${rows.map(r => { const x = r.cur[cid]; const L = c.lessons[x.lesson - 1] || { items: [] }; return `<tr><td>${fmtDate(r.date)}</td><td class="r">${esc(L.t || '')}</td><td class="r small">${(x.items || []).map(i => esc(L.items[i])).join('، ')}</td><td class="r small" style="color:var(--red)">${(x.errs || []).map(i => esc(L.items[i])).join('، ')}</td><td>${gradeLabel(x.grade)}</td></tr>`; }).join('')}</table>` : '<div class="muted small">لا توجد تسجيلات في هذه الفترة</div>';
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
  box.innerHTML = `<div class="card"><h3>📚 المناهج</h3><p class="small muted">كل منهج مقسم إلى دروس، ولكل درس بنود (مهارات) يسجل المعلم ما أتقنه الطالب منها يومياً. لتفعيل منهج في فصل: الفصول والمعلمون ← تعديل الفصل ← المواد.</p>
    ${curricula().map(c => { const b = !(S.settings.curricula || []).some(x => x.id === c.id); return `<div class="list-item"><span style="font-size:26px">${c.icon}</span><div style="flex:1"><b>${esc(c.name)}</b><div class="small muted">${c.lessons.length} درساً${c.book ? ' · 📘 ' + esc(c.book.replace('.pdf', '')) : ''}${b ? ' · منهج أساسي' : ' · منهج مضاف'} · مفعّل في ${T('classes').filter(x => (x.subjects || []).includes(c.id)).length} فصل</div></div><button class="btn sm light" data-cv="${c.id}">👁️ الدروس</button>${b ? '' : `<button class="btn sm light" data-ce="${c.id}">✏️</button>`}</div>`; }).join('')}
    <div class="row" style="margin-top:12px"><button class="btn" id="cadd">➕ إضافة منهج جديد</button><button class="btn gold" id="callon">✅ تفعيل جميع المناهج في جميع الفصول</button></div></div>`;
  box.onclick = e => {
    const v = e.target.closest('[data-cv]'); if (v) { const c = curById(v.dataset.cv); modal({ title: c.icon + ' ' + esc(c.name), body: `<table class="tbl"><tr><th>م</th><th>الدرس</th><th>الصفحة</th><th>البنود</th></tr>${c.lessons.map((l, i) => `<tr><td>${i + 1}</td><td class="r"><b>${esc(l.t)}</b></td><td>${esc(l.p || '')}</td><td class="r small">${l.items.map(esc).join('، ')}</td></tr>`).join('')}</table>`, foot: false, wide: true }); }
    const ed = e.target.closest('[data-ce]'); if (ed) curForm(custom.find(x => x.id === ed.dataset.ce));
    if (e.target.id === 'cadd') curForm();
    if (e.target.id === 'callon') { enableAllCurricula(); render(); }
  };
}
function curForm(c) {
  c = c || { icon: '📗', color: '#2c8a4b', lessons: [] };
  const txt = c.lessons.map(l => l.t + (l.p ? ' [' + l.p + ']' : '') + ' : ' + l.items.join('، ')).join('\n');
  const m = modal({ title: c.id ? 'تعديل المنهج' : 'منهج جديد', wide: true, body: `<div class="grid g3"><div class="field"><label class="req">اسم المنهج</label><input class="inp" id="cn" value="${esc(c.name || '')}" placeholder="مثال: التربية الإسلامية"></div><div class="field"><label>رمز (إيموجي)</label><input class="inp" id="ci" value="${esc(c.icon)}"></div><div class="field"><label>اللون</label><input class="inp" type="color" id="cc" value="${c.color}"></div></div>
    <div class="field"><label>اسم الكتاب (اختياري)</label><input class="inp" id="cb" value="${esc(c.book || '')}"></div>
    <div class="field"><label>الدروس — درس في كل سطر، وبعد النقطتين بنود الدرس مفصولة بفاصلة. ويمكن كتابة الصفحة بين قوسين [ ]</label><textarea class="inp" id="cl" rows="12" placeholder="الدرس الأول: الوضوء [5] : معرفة الفرائض، تطبيق عملي، الدعاء بعده&#10;الدرس الثاني: الصلاة : عدد الركعات، الحركات، الأذكار">${esc(txt)}</textarea></div>
    <div class="small muted">إن لم تكتب بنوداً لدرس يُعتبر بنداً واحداً «الدرس كاملاً».</div>`, foot: `<button class="btn" data-ok>💾 حفظ المنهج</button>${c.id ? '<button class="btn red" data-del>🗑️ حذف</button>' : ''}` });
  $('[data-ok]', m.el).onclick = () => {
    const name = $('#cn', m.el).value.trim(); if (!name) return toast('اكتب اسم المنهج');
    const lessons = $('#cl', m.el).value.split('\n').map(x => x.trim()).filter(Boolean).map(line => {
      const parts = line.split(/\s:\s|:(?=[^:]*$)/); let t = parts[0].trim(); let p = ''; const pm = t.match(/\[([^\]]+)\]/); if (pm) { p = pm[1]; t = t.replace(pm[0], '').trim(); }
      const items = (parts[1] || '').split(/[،,]/).map(x => x.trim()).filter(Boolean);
      return { t, p, items: items.length ? items : ['الدرس كاملاً'] };
    });
    if (!lessons.length) return toast('اكتب درساً واحداً على الأقل');
    const list = (S.settings.curricula || []).slice(); const obj = Object.assign({}, c, { name, icon: $('#ci', m.el).value || '📗', color: $('#cc', m.el).value, book: $('#cb', m.el).value.trim(), lessons });
    if (!obj.id) { obj.id = 'cur_' + uid(); list.push(obj); } else list[list.findIndex(x => x.id === obj.id)] = obj;
    saveSettings({ curricula: list }); m.close(); toast('✔️ حُفظ المنهج'); render();
  };
  const d = $('[data-del]', m.el); if (d) d.onclick = async () => { if (await confirmBox('حذف المنهج «' + c.name + '»؟ (تبقى تسجيلات الطلاب السابقة محفوظة)')) { saveSettings({ curricula: (S.settings.curricula || []).filter(x => x.id !== c.id) }); m.close(); render(); } };
}

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
