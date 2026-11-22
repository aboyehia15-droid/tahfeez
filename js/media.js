/* ===================== التسجيل الصوتي والمرئي (التسميع والاختبارات) ===================== */
function mediaSupported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
const blobToDataURL = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });

/* يفتح نافذة تسجيل، ويعيد { url, type, label, share, date, dur } بعد الرفع إلى Drive */
function recordMedia(kind, label, opts = {}) {
  return new Promise(resolve => {
    if (!mediaSupported()) { toast('المتصفح لا يدعم التسجيل — استخدم Chrome'); return resolve(null); }
    const isVid = kind === 'video';
    let stream = null, rec = null, chunks = [], blob = null, t0 = 0, timer = null, done = false;
    const m = modal({ title: (isVid ? '🎥 تسجيل فيديو' : '🎙️ تسجيل صوتي') + ' — ' + esc(label || ''), body: `
      <div style="text-align:center">
        ${isVid ? '<video id="mv" playsinline muted style="width:100%;max-height:52vh;background:#000;border-radius:14px"></video>' : '<div id="ma" style="font-size:80px;line-height:1.4">🎙️</div>'}
        <div id="mt" style="font-size:28px;font-weight:800;color:var(--teal);margin:8px 0">00:00</div>
        <div id="mp"></div>
        <div class="row" style="justify-content:center;margin-top:8px"><button class="btn red" id="mrec">⏺️ ابدأ التسجيل</button><button class="btn light" id="mstop" hidden>⏹️ إيقاف</button><button class="btn ghost" id="mre" hidden>🔁 إعادة</button></div>
        <label class="row small" style="justify-content:center;margin-top:12px"><input type="checkbox" id="mshare" ${opts.share !== false ? 'checked' : ''}> إرسال التسجيل لولي الأمر (يظهر في صفحة الطالب)</label>
        <p class="small muted">الحد الأقصى ${isVid ? '٣ دقائق' : '١٠ دقائق'} — يُحفظ في Google Drive الخاص بالمجمع</p>
      </div>`, foot: '<button class="btn" id="msave" disabled>💾 حفظ التسجيل</button>', onClose: () => { stop(true); if (!done) resolve(null); } });
    const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    const max = isVid ? 180 : 600;
    function stop(release) { clearInterval(timer); if (rec && rec.state !== 'inactive') rec.stop(); if (release && stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }
    async function start() {
      try {
        if (!stream) stream = await navigator.mediaDevices.getUserMedia(isVid ? { audio: true, video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } } : { audio: true });
      } catch (e) { toast('اسمح للمتصفح باستخدام ' + (isVid ? 'الكاميرا والميكروفون' : 'الميكروفون')); return; }
      if (isVid) { const v = $('#mv', m.el); v.srcObject = stream; v.muted = true; v.controls = false; v.play(); }
      const mime = isVid ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/mp4') : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/mp4');
      rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 48000, videoBitsPerSecond: isVid ? 450000 : undefined });
      chunks = []; blob = null;
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        blob = new Blob(chunks, { type: mime.split(';')[0] });
        const url = URL.createObjectURL(blob);
        $('#mp', m.el).innerHTML = isVid ? '' : `<audio controls src="${url}" style="width:100%"></audio>`;
        if (isVid) { const v = $('#mv', m.el); v.srcObject = null; v.src = url; v.muted = false; v.controls = true; }
        $('#msave', m.el).disabled = false; $('#mre', m.el).hidden = false; $('#mstop', m.el).hidden = true; $('#mrec', m.el).hidden = true;
      };
      rec.start(1000); t0 = Date.now();
      $('#mrec', m.el).hidden = true; $('#mstop', m.el).hidden = false; $('#mre', m.el).hidden = true; $('#msave', m.el).disabled = true; $('#mp', m.el).innerHTML = '';
      const ma = $('#ma', m.el); if (ma) ma.style.animation = 'pulse 1s infinite';
      timer = setInterval(() => { const s = (Date.now() - t0) / 1000; $('#mt', m.el).textContent = fmt(s); if (s >= max) { stop(); toast('انتهى الحد الأقصى للتسجيل'); } }, 250);
    }
    $('#mrec', m.el).onclick = start;
    $('#mstop', m.el).onclick = () => { stop(); const ma = $('#ma', m.el); if (ma) ma.style.animation = ''; };
    $('#mre', m.el).onclick = start;
    $('#msave', m.el).onclick = async () => {
      if (!blob) return;
      const b = $('#msave', m.el); b.disabled = true; b.textContent = '⏳ جاري الرفع…';
      try {
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        const url = await uploadFile(await blobToDataURL(blob), (label || 'تسجيل') + ' — ' + todayISO() + '.' + ext, 'media');
        done = true; const item = { id: uid('m'), url, type: kind, label: label || '', share: $('#mshare', m.el).checked, date: todayISO(), dur: Math.round((Date.now() - t0) / 1000), by: S.me ? S.me.name : '' };
        stop(true); m.el.remove(); toast('✔️ حُفظ التسجيل'); resolve(item);
      } catch (e) { toast('⚠️ ' + e.message); b.disabled = false; b.textContent = '💾 حفظ التسجيل'; }
    };
  });
}

/* عرض قائمة تسجيلات مع تشغيل/حذف/مشاركة */
function mediaListHTML(list, editable) {
  list = list || []; if (!list.length) return '';
  return `<div class="media-list">${list.map((x, i) => `<div class="row small" style="padding:6px;border:1px solid var(--line);border-radius:10px;margin:4px 0;background:#fff">
    <span>${x.type === 'video' ? '🎥' : '🎙️'}</span><b style="flex:1">${esc(x.label || 'تسجيل')}</b><span class="muted">${x.dur ? Math.floor(x.dur / 60) + ':' + String(x.dur % 60).padStart(2, '0') : ''}</span>
    ${x.share ? '<span class="chip green">مُرسل لولي الأمر</span>' : '<span class="chip gray">للمعلم فقط</span>'}
    <a class="btn sm light" href="${esc(x.url)}" target="_blank">▶️ تشغيل</a>${editable ? `<button type="button" class="btn sm ghost" data-mshare="${i}">${x.share ? '🔒 إخفاء' : '📤 مشاركة'}</button><button type="button" class="btn sm ghost" data-mdel="${i}">✕</button>` : ''}</div>`).join('')}</div>`;
}
function bindMediaList(root, list, onChange) {
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-mshare]'); if (s) { const x = list[+s.dataset.mshare]; x.share = !x.share; onChange(); }
    const d = e.target.closest('[data-mdel]'); if (d) { list.splice(+d.dataset.mdel, 1); onChange(); }
  });
}
/* مشغل مضمّن لصفحة ولي الأمر */
function mediaPlayers(list) {
  list = (list || []).filter(x => x.share); if (!list.length) return '';
  return list.map(x => `<div style="margin:6px 0"><div class="small"><b>${x.type === 'video' ? '🎥' : '🎙️'} ${esc(x.label || '')}</b></div><iframe src="${esc(drivePreview(x.url))}" style="width:100%;height:${x.type === 'video' ? 240 : 70}px;border:0;border-radius:12px;background:#f3f0e8" allow="autoplay" loading="lazy"></iframe></div>`).join('');
}
