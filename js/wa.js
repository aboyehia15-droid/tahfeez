/* ===================== الإرسال لأولياء الأمور بالاختيار ===================== */
/* كل رسالة: تختار ما يُرسل (بنود)، ومن يُرسل له، وتعاين النص قبل الإرسال — ويُحفظ اختيارك للمرة القادمة */
const WA_KINDS = {
  parent: { title: '🔗 إرسال رابط صفحة الطالب', opts: [['greet', 'التحية والتعريف بالصفحة', 1], ['class', 'اسم الفصل والمعلم', 0], ['link', 'رابط صفحة الطالب', 1], ['sign', 'توقيع المجمع', 1]] },
  daily: { title: '📖 تقرير اليوم', opts: [['att', 'الحضور', 1], ['hifz', 'الحفظ', 1], ['review', 'المراجعة', 1], ['far', 'المراجعة البعيدة', 1], ['noor', 'النورانية', 1], ['zad', 'زاد الطفل', 1], ['cur', 'المناهج (الحروف والأرقام…)', 1], ['grade', 'التقديرات', 1], ['errors', 'الأخطاء والتصويب', 1], ['behavior', 'السلوك', 0], ['note', 'ملاحظة المعلم', 1], ['media', 'روابط التسجيلات المختارة', 1], ['link', 'رابط صفحة الطالب', 1], ['sign', 'توقيع المجمع', 1]] },
  absent: { title: '❌ إشعار الغياب', opts: [['date', 'تاريخ الغياب', 1], ['count', 'عدد أيام الغياب هذا الشهر', 0], ['ask', 'طلب الحرص على الحضور', 1], ['link', 'رابط صفحة الطالب', 0], ['sign', 'توقيع المجمع', 1]] },
  period: { title: '📊 تقرير الفترة', opts: [['hifz', 'الحفظ', 1], ['review', 'المراجعة', 1], ['surahs', 'السور التي حفظها', 0], ['noor', 'النورانية', 0], ['zad', 'زاد الطفل', 0], ['att', 'الحضور والغياب', 1], ['notes', 'ملاحظات المعلم', 1], ['errors', 'الأخطاء والتصويب', 0], ['rank', 'الترتيب في الفصل', 1], ['level', 'المستوى العام', 1], ['cur', 'التقدم في المناهج', 0], ['exams', 'نتائج الاختبارات', 0], ['fees', 'المتبقي من الرسوم', 0], ['link', 'رابط صفحة الطالب', 1], ['sign', 'توقيع المجمع', 1]] },
  exam: { title: '📝 نتيجة الاختبار', opts: [['subjects', 'درجة كل مادة', 1], ['total', 'المجموع', 1], ['pct', 'النسبة', 0], ['grade', 'التقدير', 1], ['rank', 'الترتيب في الفصل', 0], ['notes', 'ملاحظة المعلم', 1], ['quran', 'ملخص أخطاء القرآن', 0], ['media', 'روابط تسجيلات الاختبار المختارة', 0], ['link', 'رابط صفحة الطالب (التفاصيل)', 1], ['sign', 'توقيع المجمع', 1]] },
  fee: { title: '💰 تذكير الرسوم', opts: [['due', 'الرسوم المستحقة', 0], ['disc', 'الخصم أو الإعفاء', 0], ['paid', 'المسدد', 1], ['remaining', 'المتبقي', 1], ['pays', 'تفاصيل الدفعات', 0], ['link', 'رابط صفحة الطالب', 0], ['sign', 'توقيع المجمع', 1]] }
};
function waPrefs(kind) { const d = {}; WA_KINDS[kind].opts.forEach(([k, , v]) => d[k] = v); return Object.assign(d, ((S.settings.waPrefs || {})[kind]) || {}); }
const HELLO = s => `السلام عليكم ورحمة الله وبركاته\nولي أمر الطالب: ${s.name}`;
function ensureToken(s) { if (!s.parentToken) { s.parentToken = token20(); save('students', s); } return s; }

function waBuild(kind, s, ctx, o) {
  const st = S.settings; const L = [];
  if (kind === 'parent') {
    L.push(HELLO(s));
    if (o.greet) L.push(`يسعدنا أن نقدم لكم صفحة خاصة بابنكم في ${st.programName}، تتابعون فيها يومياً: الحفظ والمراجعة، القاعدة النورانية، زاد الطفل، الحضور والغياب، ملاحظات المعلم، الاختبارات${features().fees && st.parentShowFees !== false ? ' والرسوم' : ''}.`);
    if (o.class) { const c = classOf(s); if (c) L.push(`🏫 الفصل: ${c.name}${teacherOf(c) ? ' — المعلم: ' + teacherOf(c).name : ''}`); }
  }
  if (kind === 'daily') {
    const r = getRec(s.id, ctx.date) || {}; const g = x => o.grade && x && x.grade ? ' — ' + gradeLabel(x.grade) : '';
    L.push(HELLO(s)); L.push(`📅 تقرير يوم ${fmtDate(ctx.date)}`);
    if (o.att && r.att) L.push('✅ الحضور: ' + (ATT[r.att] || [''])[0]);
    if (o.hifz && hasSeg(r.hifz)) L.push('📖 الحفظ: ' + segText(r.hifz) + g(r.hifz));
    if (o.review && hasSeg(r.review)) L.push('🔁 المراجعة: ' + segText(r.review) + g(r.review));
    if (o.far && hasSeg(r.far)) L.push('🕰️ المراجعة البعيدة: ' + segText(r.far) + g(r.far));
    if (o.noor && r.noor && r.noor.lesson) L.push('🔤 النورانية: ' + noorText(r.noor, true) + g(r.noor));
    if (o.noor && r.noorRev) L.push('🔁 مراجعة النورانية: ' + noorRevText(r.noorRev) + g(r.noorRev));
    if (o.zad && r.zadRev) L.push('🔁 مراجعة زاد الطفل: ' + zadRevText(r.zadRev) + g(r.zadRev));
    if (o.cur) Object.keys(r.curRev || {}).forEach(cid => { const c = curById(cid); if (c) L.push('🔁 مراجعة ' + c.name + ': ' + curRevText(cid, r.curRev[cid]) + g(r.curRev[cid])); });
    if (o.zad) (r.zad || []).forEach(z => { const c = zadCurriculum().find(c => c.id === z.cat); L.push('🌸 ' + (c ? c.name : '') + ': ' + z.item + g(z)); });
    if (o.cur) Object.keys(r.cur || {}).forEach(cid => { const c = curById(cid); const x = r.cur[cid]; if (c && x && x.lesson) L.push(c.icon + ' ' + c.name + ': ' + c.lessons[x.lesson - 1].t + g(x)); });
    if (o.errors) { const e = (r.errors || []); if (e.length) L.push(`✏️ الأخطاء: ${e.length}${e.filter(x => x.fixed).length ? ' (صُوّب منها ' + e.filter(x => x.fixed).length + ')' : ''}` + (e.filter(x => !x.fixed && x.word).length ? ' — يحتاج مراجعة: ' + e.filter(x => !x.fixed && x.word).map(x => x.word).slice(0, 5).join('، ') : '')); }
    if (o.behavior && r.behavior) L.push('⭐ السلوك: ' + '★'.repeat(r.behavior) + '☆'.repeat(5 - r.behavior));
    if (o.note && r.note) L.push('📝 ملاحظة المعلم: ' + r.note);
    if (o.media) (r.media || []).filter(x => x.share).forEach(x => L.push((x.type === 'video' ? '🎥 ' : '🎙️ ') + (x.label || 'تسجيل') + ':\n' + x.url));
  }
  if (kind === 'absent') {
    L.push(HELLO(s));
    L.push(`نفيدكم بغياب ابنكم${o.date ? ' يوم ' + fmtDate(ctx.date) : ''}.`);
    if (o.count) { const [m1, m2] = monthRange(ctx.date); const n = recsOf(s.id, m1, m2).filter(r => r.att === 'a').length; L.push(`عدد أيام الغياب هذا الشهر: ${n}`); }
    if (o.ask) L.push('نأمل الحرص على الحضور، فالانتظام سبب في الحفظ والإتقان.');
  }
  if (kind === 'period') {
    const x = statsOf(s.id, ctx.from, ctx.to); L.push(HELLO(s)); L.push('📊 تقرير ' + ctx.label);
    if (o.hifz) L.push(`📖 الحفظ: ${num(x.hifz)} وجه`);
    if (o.review) L.push(`🔁 المراجعة: ${num(x.reviewAll)} وجه`);
    if (o.surahs) { const pr = surahProgress(memorizedSet(allRecsOf(s.id))); const d = pr.map((p, i) => p >= 1 ? Q.names[i] : '').filter(Boolean); if (d.length) L.push('🕌 السور المحفوظة: ' + d.join('، ')); }
    if (o.att) L.push(`📅 الحضور: ${x.p + x.l} من ${x.days}${x.a ? ' — الغياب: ' + x.a : ''}`);
    if (o.noor) { const ln = x.recs.filter(r => r.noor && r.noor.lesson).pop(); if (ln) L.push('🔤 النورانية: ' + NOORANIA[ln.noor.lesson - 1].title); }
    if (o.zad && x.zad) L.push(`🌸 زاد الطفل: ${x.zad} بنداً`);
    if (o.errors && x.errors) L.push(`✏️ الأخطاء: ${x.errors} (صُوّب ${x.fixed})`);
    if (o.rank) { const c = classOf(s); const rk = c ? rankClass(c.id, ctx.from, ctx.to).find(y => y.s.id === s.id) : null; if (rk) L.push(`🏆 الترتيب: ${rk.rank} من ${studentsOfClass(c.id).length}`); }
    if (o.level) L.push('🎖️ المستوى: ' + levelOf(x).replace(/^\S+\s/, ''));
    if (o.cur) classSubjects(classOf(s)).filter(isCur).forEach(cid => { const c = curById(cid); const p = curProgress(s.id, cid); if (p.last) L.push(`${c.icon} ${c.name}: ${c.lessons[p.last.lesson - 1].t} (${Math.round(p.pct * 100)}%)`); });
    if (o.exams) studentExamRows(s.id, ctx.from, ctx.to).forEach(({ r, ex }) => { const t = resTotals(ex, r); L.push(`📝 ${ex.title}: ${r.absent ? 'غائب' : t.pct != null ? t.total + ' من ' + ex.total + ' — ' + examGrade(t.pct) : '—'}`); });
    if (o.fees && features().fees) { const rem = Math.max(0, feeOf(s) - paidOf(s)); if (rem) L.push(`💰 المتبقي من الرسوم: ${num(rem)} ${st.currency}`); }
  }
  if (kind === 'exam') {
    const ex = ctx.ex; const r = getRes(ex.id, s.id) || {}; const t = resTotals(ex, r);
    L.push(HELLO(s)); L.push(`📝 نتيجة ${ex.title} (${fmtDate(ex.date, false)})`);
    if (r.absent) L.push('❌ غائب عن الاختبار');
    else {
      if (o.subjects) ex.subjects.forEach(sb => { const v = t.subj[sb.id]; const p = v != null && sb.total ? v / sb.total * 100 : null; L.push(`${sb.icon} ${sb.name}: ${v != null ? v : '—'} من ${sb.total}${o.grade && p != null ? ' (' + examGrade(p) + ')' : ''}`); });
      if (o.total && t.pct != null) L.push(`✳️ المجموع: ${t.total} من ${ex.total}`);
      if (o.pct && t.pct != null) L.push(`📈 النسبة: ${Math.round(t.pct)}%`);
      if (o.grade && t.pct != null) L.push('🎖️ التقدير العام: ' + examGrade(t.pct));
      if (o.rank) { const rk = examRank(ex, s.id); if (rk) L.push(`🏆 الترتيب: ${rk.rank} من ${rk.of}`); }
      if (o.quran && r.quran) { const ok = Object.values(r.quran.checks || {}).filter(v => v === 'ok').length, ag = Object.values(r.quran.checks || {}).filter(v => v === 'again').length + (r.quran.newErrs || []).length; L.push(`📖 أتقن من أخطائه السابقة: ${ok} — يحتاج مراجعة: ${ag}`); }
    }
    if (o.notes && r.notes) L.push('📝 ملاحظة المعلم: ' + r.notes);
    if (o.media) (r.media || []).filter(x => x.share).forEach(x => L.push((x.type === 'video' ? '🎥 ' : '🎙️ ') + (x.label || 'تسجيل') + ':\n' + x.url));
  }
  if (kind === 'fee') {
    const d = discountsOf(s), f = feeOf(s), p = paidOf(s);
    L.push(HELLO(s)); L.push('💰 بيان الرسوم الدراسية');
    if (o.due) L.push(`الرسوم المستحقة: ${num(f)} ${st.currency}`);
    if (o.disc && d.total) L.push(s.feeExempt ? 'الطالب معفى من الرسوم' : `الخصم: ${num(d.total)} ${st.currency}${d.sib ? ' (خصم أخوة)' : ''}${d.spec ? ' (خصم خاص)' : ''}`);
    if (o.paid) L.push(`المسدد: ${num(p)} ${st.currency}`);
    if (o.pays) T('payments').filter(x => x.studentId === s.id).forEach(x => L.push(`• ${fmtDate(x.date, false)}: ${num(x.amount)} ${st.currency}`));
    if (o.remaining) L.push(`المتبقي: ${num(Math.max(0, f - p))} ${st.currency}`);
  }
  if (o.extra) L.push(o.extra);
  if (o.link && features().parentPage) {
    const sel = Object.keys(o).filter(k => o[k] && !['link', 'sign', 'greet', 'extra', 'class'].includes(k)).join(',');
    const view = kind === 'parent' ? null : kind === 'daily' ? { v: 'daily', o: sel, f: ctx.date, t: ctx.date } : kind === 'absent' ? { v: 'absent', o: sel, f: monthRange(ctx.date)[0], t: monthRange(ctx.date)[1] } : kind === 'period' ? { v: 'period', o: sel, f: ctx.from, t: ctx.to } : kind === 'exam' ? { v: 'exam', o: sel, x: ctx.ex.id } : { v: 'fee', o: sel };
    L.push((kind === 'parent' ? '🔗 رابط صفحة ابنكم:\n' : '📄 التفاصيل:\n') + parentLink(ensureToken(s), view));
  }
  if (o.sign) L.push(`جزاكم الله خيراً\n${st.complexName}`);
  return L.filter(Boolean).join('\n');
}

/* نافذة الإرسال بالاختيار */
function waCompose(kind, students, ctx = {}, title) {
  students = (students || []).filter(Boolean);
  if (!students.length) return toast('لا يوجد طلاب للإرسال');
  const K = WA_KINDS[kind]; const o = waPrefs(kind); o.extra = '';
  let sel = students.filter(s => s.guardianPhone).map(s => s.id);
  const m = modal({ title: (title || K.title) + (students.length === 1 ? ' — ' + esc(students[0].name) : ''), wide: true, body: `
    <div class="grid g2">
      <div><div class="sec"><div class="sec-h">☑️ ماذا يُرسل؟</div><div class="row">${K.opts.filter(([k]) => k !== 'disc' || S.settings.parentShowDisc).map(([k, t]) => `<label class="chip" style="padding:6px 11px"><input type="checkbox" data-o="${k}" ${o[k] ? 'checked' : ''}> ${t}</label>`).join('')}</div>
        <div class="field" style="margin-top:8px"><label>نص إضافي (اختياري)</label><textarea class="inp" id="wx" rows="2" placeholder="مثال: نذكركم بموعد الحفل يوم الخميس…"></textarea></div></div>
        ${students.length > 1 ? `<div class="sec"><div class="sec-h">👥 إلى من؟ <span class="sp"></span><span class="chip" id="wcount"></span></div><div id="wto"></div>${students.some(s => !s.guardianPhone) ? `<div class="small" style="color:var(--red);margin-top:6px">⚠️ بدون رقم جوال: ${students.filter(s => !s.guardianPhone).map(s => esc(s.name)).join('، ')}</div>` : ''}</div>` : ''}</div>
      <div class="sec"><div class="sec-h">👁️ معاينة الرسالة<span class="sp"></span>${students.length > 1 ? '<select class="inp" id="wprev" style="width:auto;max-width:60%;font-size:13px"></select>' : ''}</div><div id="wpv" style="white-space:pre-wrap;background:#e7fbe0;border-radius:14px 14px 4px 14px;padding:12px;font-size:14px;line-height:1.8;max-height:50vh;overflow:auto;box-shadow:0 1px 2px rgba(0,0,0,.1)"></div></div>
    </div>`, foot: `<button class="btn wa" data-go>📤 متابعة للإرسال</button><label class="row small" style="align-self:center"><input type="checkbox" id="wsave" checked> حفظ اختياري للمرة القادمة</label>` });
  const draw = () => {
    const pv = $('#wprev', m.el); const cur = pv ? byId('students', pv.value) || students[0] : students[0];
    $('#wpv', m.el).textContent = waBuild(kind, cur, ctx, o);
    const c = $('#wcount', m.el); if (c) c.textContent = sel.length + ' ولي أمر';
    $('[data-go]', m.el).textContent = '📤 متابعة للإرسال (' + sel.length + ')';
  };
  if (students.length > 1) {
    $('#wto', m.el).appendChild(multiDrop([{ name: '', items: students.filter(s => s.guardianPhone).map(s => ({ key: s.id, t: s.name })) }], sel, 'المستلمون', k => { sel = k; const pv = $('#wprev', m.el); if (pv) { const keep = pv.value; pv.innerHTML = sel.map(id => `<option value="${id}">${esc(byId('students', id).name)}</option>`).join(''); if (sel.includes(keep)) pv.value = keep; } draw(); }));
    $('#wprev', m.el).onchange = draw;
  }
  m.body.addEventListener('change', e => { if (e.target.dataset.o) { o[e.target.dataset.o] = e.target.checked ? 1 : 0; draw(); } });
  $('#wx', m.el).oninput = e => { o.extra = e.target.value.trim(); draw(); };
  draw();
  $('[data-go]', m.el).onclick = () => {
    const list = students.length > 1 ? students.filter(s => sel.includes(s.id)) : students.filter(s => s.guardianPhone);
    if (!list.length) return toast(students.length === 1 ? 'لا يوجد رقم جوال لولي الأمر' : 'اختر المستلمين');
    if ($('#wsave', m.el).checked) { const p = Object.assign({}, S.settings.waPrefs || {}); const c = Object.assign({}, o); delete c.extra; p[kind] = c; if (!viewingArchive()) saveSettings({ waPrefs: p }); }
    m.close();
    const items = list.map(s => ({ name: s.name, phone: s.guardianPhone, text: waBuild(kind, s, ctx, o), onSent: () => { if (kind === 'parent') { s.linkSentAt = Date.now(); save('students', s); } } }));
    const go = () => { if (items.length === 1) { window.open(waLink(items[0].phone, items[0].text), '_blank'); items[0].onSent(); } else waQueueDialog(items, title || K.title); };
    if (S.settings.shortLinks && !isLocal() && o.link) {
      const urls = [...new Set(items.flatMap(it => it.text.match(/https?:\/\/\S*\?p=\S+/g) || []))];
      toast('⏳ جاري اختصار الروابط…', 5000);
      api('shorten', { urls }).then(r => { if (r.ok) items.forEach(it => Object.entries(r.map || {}).forEach(([u, sh]) => { it.text = it.text.split(u).join(sh); })); }).catch(() => {}).finally(go);
    } else go();
  };
}
