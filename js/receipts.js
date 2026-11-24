/* ===================== 📥 إيصالات السداد: يرفعها ولي الأمر، يقرؤها البرنامج، وتعتمدها الإدارة ===================== */
const RCP_REL = ['ولي الأمر نفسه', 'الأم', 'الأخ', 'العم', 'الخال', 'الجد', 'قريب آخر'];
const rcpStatus = st => st === 'approved' ? '<span class="chip green">✅ معتمد</span>' : st === 'rejected' ? '<span class="chip red">❌ مرفوض</span>' : '<span class="chip gold">⏳ قيد المراجعة</span>';

/* ——— بطاقة بيانات الحساب لولي الأمر ——— */
function bankBoxHTML() {
  const st = S.settings; if (!st.bankIban && !st.bankAccount) return '';
  const row = (l, v, copy) => v ? `<div class="row" style="justify-content:space-between;gap:6px;padding:5px 0;border-bottom:1px dashed #e3e3e3"><span class="small muted">${l}</span><span><b dir="ltr" style="font-size:15.5px">${esc(v)}</b>${copy ? ` <button class="btn sm ghost" style="padding:2px 8px" onclick="copyText('${esc(v)}')">📋</button>` : ''}</span></div>` : '';
  return `<div class="card" style="background:#f4faf8;margin-top:10px"><b>🏦 بيانات السداد</b>
    ${row('المستفيد', st.bankHolder)}${row('البنك', st.bankName)}${row('رقم الحساب', st.bankAccount, 1)}${row('الآيبان', st.bankIban, 1)}
    ${st.payNote ? `<div class="small" style="margin-top:6px">✍️ اكتب في ملاحظات التحويل: <b>${esc(st.payNote)}</b></div>` : ''}</div>`;
}

/* ——— ولي الأمر: رفع إيصال السداد بخطوة واحدة (تصوير فقط، والباقي تلقائي) ——— */
async function parentReceiptDialog(s) {
  const tok = URLQ.get('p') || s.parentToken;
  const cur = S.settings.currency;
  const m = modal({ title: '📤 إيصال سداد — ' + esc(s.name), body: `
    <div id="rcp-box" style="text-align:center">
      <p style="margin-top:0">صوّر إيصال التحويل أو اختر صورته، وسيُسجَّل باسم <b>${esc(s.name)}</b> تلقائياً.</p>
      <label class="btn block" style="padding:18px;font-size:19px"><input type="file" id="rcp-file" accept="image/*,.pdf" hidden>📷 تصوير الإيصال</label>
      <div id="rcp-st" style="margin-top:10px"></div>
    </div>`, foot: false });
  $('#rcp-file', m.el).onchange = async e => {
    const f = e.target.files[0]; if (!f) return; const stl = $('#rcp-st', m.el); const lbl = $('label', m.el);
    lbl.style.display = 'none'; stl.innerHTML = '<div style="font-size:40px">⏳</div>جاري إرسال الإيصال…';
    try {
      const file = await pickReceiptFile(f); if (!file) throw new Error('تعذر قراءة الصورة');
      const mm = String(file.data).match(/^data:([^;]+);base64,(.*)$/);
      const r = await api('parentReceiptRead', { t: tok, mime: mm[1], data: mm[2], name: f.name }); if (!r.ok) throw new Error(r.error);
      const fl = r.fields || {};
      const r2 = await api('parentReceiptSubmit', { t: tok, fileId: r.fileId, hash: r.hash, ai: r.ai, fields: { amount: fl.amount, date: fl.date, payer: fl.payer, fromBank: fl.fromBank, ref: fl.ref, toAccount: fl.toAccount, note: fl.note } });
      if (!r2.ok) throw new Error(r2.error);
      $('#rcp-box', m.el).innerHTML = `<div style="font-size:54px">${r2.status === 'approved' ? '✅' : '📨'}</div><h3 style="margin:6px 0">وصل الإيصال، جزاكم الله خيراً</h3>
        ${+fl.amount ? `<div style="font-size:20px">المبلغ: <b>${num(fl.amount)}</b> ${cur}</div>` : ''}
        <div class="small muted" style="margin-top:6px">${r2.status === 'approved' ? 'تم اعتماده وتسجيله في الرسوم.' : 'سيظهر في الرسوم بعد مراجعة الإدارة.'}</div>
        <button class="btn block" style="margin-top:14px" onclick="location.reload()">تم</button>`;
    } catch (er) { lbl.style.display = ''; stl.innerHTML = '<span style="color:var(--red)">⚠️ ' + esc((er && er.message) || 'تعذر الإرسال') + ' — حاول مرة أخرى</span>'; }
    e.target.value = '';
  };
}
function parentReceiptsList(list) {
  if (!list || !list.length) return '';
  return `<div class="sec-h" style="margin-top:10px">📥 الإيصالات المرفوعة</div>${list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(x => `<div class="list-item" style="gap:8px"><div style="flex:1"><b>${num(x.mine || x.amount)}</b> ${S.settings.currency} <span class="small muted">· ${x.date ? fmtDate(x.date, false) : ''}${x.payer ? ' · ' + esc(x.payer) : ''}</span>${x.status === 'rejected' && x.reason ? `<div class="small" style="color:var(--red)">السبب: ${esc(x.reason)}</div>` : ''}</div>${rcpStatus(x.status)}</div>`).join('')}`;
}

/* ——— الإدارة: الإيصالات الواردة ——— */
function receiptsInbox(box) {
  const tab = sessionStorage.getItem('rcpt') || 'pending';
  const all = T('receipts').slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const list = all.filter(x => tab === 'pending' ? x.status === 'pending' : x.status === tab).slice(0, 200);
  const cur = S.settings.currency;
  box.innerHTML = `<div class="tabs p-tabs">${[['pending', '⏳ بانتظار المراجعة'], ['approved', '✅ المعتمدة'], ['rejected', '❌ المرفوضة']].map(([k, t]) => `<button data-rt="${k}" class="${tab === k ? 'on' : ''}">${t} (${all.filter(x => x.status === k).length})</button>`).join('')}</div>
    <div class="row small" style="margin-bottom:8px;gap:10px;flex-wrap:wrap"><label class="row"><input type="checkbox" id="rc-on" ${S.settings.receiptOn !== false ? 'checked' : ''}> زر «رفع إيصال سداد» في صفحة ولي الأمر</label><label class="row"><input type="checkbox" id="rc-auto" ${S.settings.receiptAuto ? 'checked' : ''}> اعتماد تلقائي للإيصال إذا اجتاز كل الفحوص</label><button class="btn sm light" id="rc-bank">🏦 بيانات الحساب</button></div>
    ${list.length ? list.map(x => `<div class="card" style="padding:10px 12px"><div class="row" style="gap:10px;align-items:flex-start;flex-wrap:wrap">
      <button class="btn light" data-img="${x.id}" style="width:86px;height:86px;padding:0;font-size:30px" title="عرض الإيصال">🧾</button>
      <div style="flex:1;min-width:220px"><div><b style="font-size:19px">${+x.amount ? num(x.amount) + '</b> ' + cur : '؟</b> <span class="small" style="color:var(--red)">المبلغ لم يُقرأ</span>'} ${rcpStatus(x.status)} <span class="small muted">${x.date ? fmtDate(x.date, false) : ''} · رُفع ${new Date(x.createdAt || 0).toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
        <div class="small" style="margin-top:3px">👦 ${(x.alloc || []).map(q => `<b>${esc(q.name || (byId('students', q.studentId) || {}).name || '')}</b>${(x.alloc || []).length > 1 ? ' (' + num(q.amount) + ')' : ''}`).join(' · ')} — ولي الأمر: ${esc(x.guardianName || '')}</div>
        <div class="small muted">المحوِّل: <b>${esc(x.payer || '—')}</b>${x.relation ? ' (' + esc(x.relation) + ')' : ''}${x.fromBank ? ' · ' + esc(x.fromBank) : ''}${x.ref ? ' · عملية <span dir="ltr">' + esc(x.ref) + '</span>' : ''}${x.toLast4 ? ' · إلى حساب …' + esc(x.toLast4) : ''}</div>
        ${(x.warnings || []).length ? `<div class="small" style="color:#9b1c1c;margin-top:4px">${x.warnings.map(w => '⚠️ ' + esc(w)).join('<br>')}</div>` : '<div class="small" style="color:var(--green);margin-top:4px">✔️ اجتاز كل الفحوص</div>'}
        ${x.status === 'rejected' ? `<div class="small" style="color:var(--red)">سبب الرفض: ${esc(x.reason || '')}</div>` : ''}${x.status === 'approved' ? `<div class="small muted">اعتمده: ${esc(x.approvedBy || '')}</div>` : ''}</div>
      <div class="row" style="gap:6px;flex-wrap:wrap">${x.status === 'pending' ? `<button class="btn" data-ok="${x.id}">✅ اعتماد</button><button class="btn red" data-no="${x.id}">❌ رفض</button>` : ''}${x.guardianPhone ? `<button class="btn sm wa" data-notify="${x.id}">💬 إشعار</button>` : ''}</div></div></div>`).join('') : `<div class="empty"><span class="e">${tab === 'pending' ? '✅' : '📭'}</span>${tab === 'pending' ? 'لا توجد إيصالات بانتظار المراجعة' : 'لا يوجد'}</div>`}`;
  box.onclick = async e => {
    const t = e.target.closest('[data-rt]'); if (t) { sessionStorage.setItem('rcpt', t.dataset.rt); return receiptsInbox(box); }
    if (e.target.id === 'rc-bank') return bankSettingsDialog();
    const im = e.target.closest('[data-img]'); if (im) return showReceiptImage(byId('receipts', im.dataset.img));
    const ok = e.target.closest('[data-ok]'); if (ok) { const x = byId('receipts', ok.dataset.ok);
      const am = await promptBox('المبلغ المعتمد (' + S.settings.currency + ') — صحّحه إن لزم بعد النظر في الإيصال:', String(x.amount || '')); if (am == null) return;
      const v = +toLatin(am).replace(/[^\d.]/g, ''); if (!v) return toast('اكتب المبلغ');
      if (v !== +x.amount) { x.amount = v; if ((x.alloc || []).length === 1) x.alloc[0].amount = v; }
      if ((x.alloc || []).length === 1 && !(+x.alloc[0].amount)) x.alloc[0].amount = v;
      approveReceipt(x); toast('✔️ اعتُمد وسُجّل في كشف السداد'); return receiptsInbox(box); }
    const no = e.target.closest('[data-no]'); if (no) { const x = byId('receipts', no.dataset.no); const why = await promptBox('سبب رفض الإيصال (يُرسل لولي الأمر):', 'الإيصال غير واضح'); if (why == null) return; x.status = 'rejected'; x.reason = why; x.rejectedBy = S.me ? S.me.name : ''; x.updatedAt = Date.now(); save('receipts', x); notifyReceipt(x); return receiptsInbox(box); }
    const nt = e.target.closest('[data-notify]'); if (nt) notifyReceipt(byId('receipts', nt.dataset.notify));
  };
  box.onchange = e => { if (e.target.id === 'rc-on') saveSettings({ receiptOn: e.target.checked }); if (e.target.id === 'rc-auto') saveSettings({ receiptAuto: e.target.checked }); };
}
function approveReceipt(x) {
  const ids = [];
  (x.alloc || []).forEach(q => { const p = { id: uid('p'), studentId: q.studentId, amount: q.amount, date: x.date || todayISO(), method: 'تحويل بنكي', note: 'إيصال ولي الأمر' + (x.payer ? ' — من ' + x.payer + (x.relation && x.relation !== 'ولي الأمر نفسه' ? ' (' + x.relation + ')' : '') : '') + (x.ref ? ' — عملية ' + x.ref : ''), ref: x.ref || '', payer: x.payer || '', relation: x.relation || '', fromBank: x.fromBank || '', receiptId: x.id, receiptFileId: x.fileId || '', approvedBy: S.me ? S.me.name : '', receipt: T('payments').length + 1 }; save('payments', p); ids.push(p.id); });
  x.status = 'approved'; x.approvedBy = S.me ? S.me.name : ''; x.approvedAt = Date.now(); x.paymentIds = ids; x.updatedAt = Date.now(); save('receipts', x);
}
function notifyReceipt(x) {
  const st = byId('students', x.studentId) || { name: x.studentName };
  const msg = x.status === 'approved'
    ? `السلام عليكم ورحمة الله وبركاته\nولي أمر الطالب: ${(x.alloc || []).map(q => q.name).join('، ') || st.name}\nتم استلام سدادكم بمبلغ ${num(x.amount)} ${S.settings.currency} واعتماده${(x.alloc || []).map(q => { const s2 = byId('students', q.studentId); return s2 ? `\n• ${s2.name}: المتبقي ${num(Math.max(0, feeOf(s2) - paidOf(s2)))} ${S.settings.currency}` : ''; }).join('')}\nجزاكم الله خيراً\n${S.settings.complexName}`
    : x.status === 'rejected' ? `السلام عليكم ورحمة الله وبركاته\nولي أمر الطالب: ${st.name}\nنعتذر، لم يُعتمد الإيصال المرفوع بمبلغ ${num(x.amount)} ${S.settings.currency}.\nالسبب: ${x.reason || ''}\nنرجو رفع إيصال صحيح من صفحة الطالب.\n${S.settings.complexName}`
    : `السلام عليكم\nوصلنا إيصالكم بمبلغ ${num(x.amount)} ${S.settings.currency} وهو قيد المراجعة.\n${S.settings.complexName}`;
  window.open(waLink(x.guardianPhone || st.guardianPhone, msg), '_blank');
}
async function showReceiptImage(x) {
  if (!x || !x.fileId) return toast('لا يوجد ملف');
  const m = modal({ title: '🧾 إيصال ' + esc(x.studentName || ''), wide: true, body: '<div class="empty">⏳ جاري التحميل…</div>' });
  try { const r = await api('receiptFile', { fileId: x.fileId }); if (!r.ok) throw new Error(r.error); const src = `data:${r.mime};base64,${r.data}`;
    m.body.innerHTML = /pdf/.test(r.mime) ? `<iframe src="${src}" style="width:100%;height:70vh;border:0"></iframe>` : `<img src="${src}" style="max-width:100%;border-radius:10px;display:block;margin:auto">`; }
  catch (er) { m.body.innerHTML = '<div class="empty">⚠️ ' + esc(er.message) + '</div>'; }
}
function bankSettingsDialog() {
  const s = S.settings;
  const m = modal({ title: '🏦 بيانات حساب السداد', body: `<div class="grid g2">
    <div class="field"><label>اسم المستفيد</label><input class="inp" id="bk-h" value="${esc(s.bankHolder || '')}"></div>
    <div class="field"><label>البنك</label><input class="inp" id="bk-n" value="${esc(s.bankName || '')}"></div>
    <div class="field"><label>رقم الحساب</label><input class="inp" id="bk-a" dir="ltr" value="${esc(s.bankAccount || '')}"></div>
    <div class="field"><label>الآيبان</label><input class="inp" id="bk-i" dir="ltr" value="${esc(s.bankIban || '')}"></div></div>
    <div class="field"><label>ما يُكتب في ملاحظات التحويل</label><input class="inp" id="bk-note" value="${esc(s.payNote || '')}"></div>
    <div class="small muted">يتحقق البرنامج أن الإيصال محوَّل إلى هذا الحساب (آخر 4 أرقام).</div>`, foot: '<button class="btn" data-ok>💾 حفظ</button>' });
  $('[data-ok]', m.el).onclick = () => { saveSettings({ bankHolder: $('#bk-h', m.el).value.trim(), bankName: $('#bk-n', m.el).value.trim(), bankAccount: $('#bk-a', m.el).value.replace(/\s/g, ''), bankIban: $('#bk-i', m.el).value.replace(/\s/g, '').toUpperCase(), payNote: $('#bk-note', m.el).value.trim() }); m.close(); toast('✔️ حُفظت بيانات الحساب'); render(); };
}

/* نافذة إدخال نص بسيطة */
function promptBox(msg, def) {
  return new Promise(res => {
    let done = false;
    const m = modal({ title: '✍️', body: `<div style="margin-bottom:8px">${esc(msg)}</div><input class="inp" id="pb-v" value="${esc(def || '')}">`, foot: '<button class="btn" data-ok>موافق</button>', onClose: () => { if (!done) res(null); } });
    const go = () => { done = true; const v = $('#pb-v', m.el).value.trim(); m.close(); res(v); };
    $('[data-ok]', m.el).onclick = go; $('#pb-v', m.el).onkeydown = e => e.key === 'Enter' && go(); setTimeout(() => $('#pb-v', m.el).focus(), 50);
  });
}
