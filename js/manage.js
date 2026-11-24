/* ===================== 🗂️ إدارة سجلات المتابعة: حذف يوم كامل أو جزء منه دون المساس بالباقي ===================== */
/* أجزاء التسجيل اليومي التي يمكن حذفها منفردة */
function recParts(r) {
  const P = [];
  const q = (k, t) => { if (hasSeg(r[k])) P.push({ k, t: t + ': ' + qSurahs(r[k]) }); };
  q('hifz', '📖 الحفظ'); q('review', '🔁 المراجعة'); q('far', '🕰️ البعيدة');
  if (r.noor && r.noor.lesson) P.push({ k: 'noor', t: '🔤 النورانية: د' + noorSegs(r.noor).map(x => x.lesson).join('+') });
  if (r.noorRev) P.push({ k: 'noorRev', t: '🔁 مراجعة النورانية' });
  Object.keys(r.cur || {}).forEach(cid => { const c = curById(cid), x = r.cur[cid]; if (c && x && x.lesson) P.push({ k: 'cur:' + cid, t: c.icon + ' ' + c.name }); });
  Object.keys(r.curRev || {}).forEach(cid => { const c = curById(cid); if (c) P.push({ k: 'curRev:' + cid, t: '🔁 مراجعة ' + c.name }); });
  (r.zad || []).forEach((z, i) => P.push({ k: 'zad:' + i, t: '🌸 ' + z.item }));
  if (r.zadRev) P.push({ k: 'zadRev', t: '🔁 مراجعة الزاد' });
  if ((r.errors || []).length) P.push({ k: 'errors', t: '✏️ الأخطاء (' + r.errors.length + ')' });
  if (r.note || r.notes) P.push({ k: 'note', t: '📝 الملاحظة' });
  if (r.behavior) P.push({ k: 'behavior', t: '⭐ السلوك' });
  if ((r.media || []).length) P.push({ k: 'media', t: '🎙️ التسجيلات (' + r.media.length + ')' });
  return P;
}
/* أنواع الأجزاء للحذف الجماعي */
function partKinds() {
  const K = [['hifz', '📖 الحفظ'], ['review', '🔁 المراجعة القريبة'], ['far', '🕰️ المراجعة البعيدة'], ['noor', '🔤 النورانية'], ['noorRev', '🔁 مراجعة النورانية']];
  curricula().filter(c => subjectsOf().includes(c.id)).forEach(c => K.push(['cur:' + c.id, c.icon + ' ' + c.name], ['curRev:' + c.id, '🔁 مراجعة ' + c.name]));
  K.push(['zad', '🌸 زاد الطفل'], ['zadRev', '🔁 مراجعة الزاد'], ['errors', '✏️ الأخطاء والتصويب'], ['note', '📝 ملاحظة المعلم'], ['behavior', '⭐ السلوك'], ['media', '🎙️ التسجيلات']);
  return K;
}
/* حذف جزء من تسجيل اليوم (يرجع true إن تغيّر شيء) */
function delPart(r, k) {
  const before = JSON.stringify(r);
  const dropErr = sub => { r.errors = (r.errors || []).filter(e => e.sub !== sub); };
  const dropMedia = sub => { r.media = (r.media || []).filter(x => (x.sub || '') !== sub); };
  if (['hifz', 'review', 'far'].includes(k)) { delete r[k]; dropErr(k); dropMedia(k); }
  else if (k === 'noor') { delete r.noor; dropErr('noor'); dropMedia('noor'); }
  else if (k === 'noorRev') delete r.noorRev;
  else if (k.startsWith('cur:')) { const id = k.slice(4); if (r.cur) delete r.cur[id]; dropErr(id); dropMedia(id); }
  else if (k.startsWith('curRev:')) { if (r.curRev) delete r.curRev[k.slice(7)]; }
  else if (k === 'zad') { r.zad = []; dropErr('zad'); dropMedia('zad'); }
  else if (k.startsWith('zad:')) { const i = +k.slice(4), z = (r.zad || [])[i]; if (z) { r.zad.splice(i, 1); r.errors = (r.errors || []).filter(e => !(e.sub === 'zad' && e.word === z.item)); } }
  else if (k === 'zadRev') delete r.zadRev;
  else if (k === 'errors') r.errors = [];
  else if (k === 'note') { delete r.note; delete r.notes; }
  else if (k === 'behavior') delete r.behavior;
  else if (k === 'media') r.media = [];
  if (JSON.stringify(r) === before) return false;
  r.updatedAt = Date.now(); save('records', r); return true;
}

/* نافذة إدارة السجلات لطالب أو مجموعة طلاب */
function recordsManager(students, from, to, title) {
  students = (students || []).filter(Boolean); if (!students.length) return toast('لا يوجد طلاب');
  if (viewingArchive()) return toast('لا يمكن التعديل في أرشيف عام سابق');
  const multi = students.length > 1; let selD = new Set();
  const F = { from: from || '', to: to || '', stu: '' };
  const m = modal({ title: '🗂️ ' + (title || 'سجلات المتابعة') + (multi ? '' : ' — ' + esc(students[0].name)), wide: true, body: `
    <div class="small muted" style="margin-bottom:8px">اضغط ✕ بجانب أي بند لحذفه وحده، أو 🗑️ لحذف اليوم كاملاً. باقي المعلومات لا تتغير.</div>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">
      ${multi ? `<select class="inp" id="rm-stu" style="width:auto;max-width:220px"><option value="">كل الطلاب (${students.length})</option>${students.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>` : ''}
      <label class="small">من <input class="inp" type="date" id="rm-from" value="${F.from}" style="width:auto"></label>
      <label class="small">إلى <input class="inp" type="date" id="rm-to" value="${F.to}" style="width:auto"></label>
    </div>
    <div class="card" style="padding:8px 10px;background:#fff7f7;margin-bottom:8px"><div class="row" style="gap:6px;flex-wrap:wrap">
      <label class="row small"><input type="checkbox" id="rm-all"> تحديد الكل</label><span class="chip" id="rm-cnt">0</span>
      <span style="flex:1"></span>
      <select class="inp" id="rm-kind" style="width:auto;font-size:14px"><option value="">— حذف بند من الأيام المحددة —</option>${partKinds().map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select>
      <button class="btn sm light" id="rm-part">✂️ حذف البند</button>
      <button class="btn sm red" id="rm-days">🗑️ حذف الأيام المحددة</button></div></div>
    <div id="rm-list" style="max-height:55vh;overflow:auto"></div>` });
  const ids = new Set(students.map(s => s.id));
  const listRecs = () => T('records').filter(r => ids.has(r.studentId) && (!F.stu || r.studentId === F.stu) && (!F.from || r.date >= F.from) && (!F.to || r.date <= F.to)).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (byId('students', a.studentId) || {}).name > (byId('students', b.studentId) || {}).name ? 1 : -1);
  const draw = () => {
    const rs = listRecs(); selD = new Set([...selD].filter(id => rs.some(r => r.id === id)));
    $('#rm-cnt', m.el).textContent = selD.size + ' محدد من ' + rs.length;
    $('#rm-list', m.el).innerHTML = rs.length ? rs.map(r => { const st = byId('students', r.studentId) || {}; const P = recParts(r);
      return `<div class="list-item" style="align-items:flex-start;gap:8px"><input type="checkbox" class="rm-sel" data-id="${r.id}" ${selD.has(r.id) ? 'checked' : ''} style="margin-top:6px;width:18px;height:18px">
        <div style="flex:1;min-width:0"><div><b>${fmtDate(r.date)}</b>${multi ? ` · <span style="color:var(--teal)">${esc(st.name || '')}</span>` : ''} ${r.att === 'a' ? '<span class="chip red">غائب</span>' : r.att === 'e' ? '<span class="chip blue">مستأذن</span>' : r.att === 'l' ? '<span class="chip gold">متأخر</span>' : ''}</div>
        <div class="row" style="gap:5px;margin-top:5px;flex-wrap:wrap">${P.length ? P.map(p => `<span class="chip" style="padding:4px 4px 4px 10px">${esc(p.t)} <button class="x-del" data-r="${r.id}" data-k="${p.k}" title="حذف هذا البند فقط">✕</button></span>`).join('') : '<span class="small muted">حضور فقط</span>'}</div></div>
        <button class="btn sm ghost" data-dday="${r.id}" title="حذف اليوم كاملاً">🗑️</button></div>`; }).join('') : '<div class="empty"><span class="e">📭</span>لا توجد سجلات في هذه الفترة</div>';
    $('#rm-all', m.el).checked = rs.length && selD.size === rs.length;
  };
  m.el.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'rm-from') { F.from = t.value; draw(); } if (t.id === 'rm-to') { F.to = t.value; draw(); } if (t.id === 'rm-stu') { F.stu = t.value; draw(); }
    if (t.classList.contains('rm-sel')) { t.checked ? selD.add(t.dataset.id) : selD.delete(t.dataset.id); draw(); }
    if (t.id === 'rm-all') { selD = t.checked ? new Set(listRecs().map(r => r.id)) : new Set(); draw(); }
  });
  m.el.addEventListener('click', async e => {
    const x = e.target.closest('.x-del'); if (x) { const r = byId('records', x.dataset.r); if (r && delPart(r, x.dataset.k)) { toast('✔️ حُذف البند'); draw(); render(); } return; }
    const d = e.target.closest('[data-dday]'); if (d) { const r = byId('records', d.dataset.dday); if (r && await confirmBox(`حذف تسجيل يوم ${fmtDate(r.date)} كاملاً${multi ? ' للطالب ' + ((byId('students', r.studentId) || {}).name || '') : ''}؟`)) { remove('records', r.id); toast('✔️ حُذف اليوم'); draw(); render(); } return; }
    if (e.target.id === 'rm-days') { if (!selD.size) return toast('حدد أياماً أولاً'); if (await confirmBox(`حذف ${selD.size} يوم من سجلات المتابعة نهائياً؟ لا يمكن التراجع.`)) { [...selD].forEach(id => remove('records', id)); toast('✔️ حُذف ' + selD.size + ' يوم'); selD.clear(); draw(); render(); } return; }
    if (e.target.id === 'rm-part') {
      const k = $('#rm-kind', m.el).value; if (!k) return toast('اختر البند الذي تريد حذفه'); if (!selD.size) return toast('حدد الأيام أولاً');
      const lbl = (partKinds().find(p => p[0] === k) || [, k])[1];
      if (!(await confirmBox(`حذف «${lbl}» من ${selD.size} يوم؟ باقي التسجيل يبقى كما هو.`))) return;
      let n = 0; [...selD].forEach(id => { const r = byId('records', id); if (r && delPart(r, k)) n++; });
      toast(n ? `✔️ حُذف «${lbl}» من ${n} يوم` : 'لا يوجد هذا البند في الأيام المحددة'); draw(); render();
    }
  });
  draw();
}
