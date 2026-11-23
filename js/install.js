/* ===================== 📲 تثبيت التطبيق على الجوال أو الكمبيوتر ===================== */
/* يظهر عند الدخول: زر تثبيت مباشر في أندرويد وكروم وإيدج، وشرح بالخطوات في آيفون (سفاري) */
const INST = { prompt: null };
const IQ = new URLSearchParams(location.search);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installSnoozed = () => +(localStorage.getItem('tz_inst_later') || 0) > Date.now();

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INST.prompt = e; showInstallBar(); });
window.addEventListener('appinstalled', () => { INST.prompt = null; hideInstallBar(); localStorage.setItem('tz_installed', '1'); toast('✔️ تم تثبيت التطبيق — تجده على الشاشة الرئيسية'); });

/* صفحة ولي الأمر: يُثبَّت التطبيق باسم الطالب ويفتح صفحته مباشرة */
function parentManifest() {
  const p = IQ.get('p'); if (!p) return;
  const base = location.origin + location.pathname.replace(/index\.html$/, '');
  const name = (document.title || '').replace(/^متابعة الطالب:\s*/, '') || 'متابعة ابني';
  const man = { name: 'متابعة ' + name, short_name: name.split(' ')[0] || 'متابعة', start_url: base + 'index.html?p=' + p + (IQ.get('s') ? '&s=' + encodeURIComponent(IQ.get('s')) : ''), scope: base, display: 'standalone', dir: 'rtl', lang: 'ar', background_color: '#f7f4ec', theme_color: '#0f5c55',
    icons: [{ src: base + 'assets/icon-192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: base + 'assets/icon-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: base + 'assets/icon-maskable-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
  const l = document.querySelector('link[rel=manifest]'); if (l) l.href = 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(JSON.stringify(man));
}

function installNow() {
  if (INST.prompt) { INST.prompt.prompt(); INST.prompt.userChoice.then(c => { if (c.outcome === 'accepted') hideInstallBar(); INST.prompt = null; }); return; }
  if (IQ.get('p') && IQ.get('w')) history.replaceState(null, '', location.pathname + '?p=' + IQ.get('p') + (IQ.get('s') ? '&s=' + encodeURIComponent(IQ.get('s')) : '')); // الأيقونة تفتح صفحة الطالب كاملة
  const ios = isIOS();
  modal({ title: '📲 تثبيت التطبيق', body: ios ? `
    <div class="inst-steps">
      <div><b>1</b><span>افتح هذه الصفحة في متصفح <b>Safari</b> (إن كنت داخل الواتساب: اضغط ⋯ ثم «فتح في Safari»)</span></div>
      <div><b>2</b><span>اضغط زر المشاركة <span class="ios-ic">⬆️</span> أسفل الشاشة</span></div>
      <div><b>3</b><span>اختر <b>«إضافة إلى الشاشة الرئيسية»</b> ➕</span></div>
      <div><b>4</b><span>اضغط <b>«إضافة»</b> — تظهر أيقونة التطبيق على شاشتك ✅</span></div></div>` : `
    <div class="inst-steps">
      <div><b>1</b><span>افتح هذه الصفحة في متصفح <b>Chrome</b> (إن كنت داخل الواتساب: اضغط ⋮ ثم «فتح في Chrome»)</span></div>
      <div><b>2</b><span>اضغط القائمة <b>⋮</b> أعلى المتصفح</span></div>
      <div><b>3</b><span>اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b></span></div>
      <div><b>4</b><span>اضغط <b>«تثبيت»</b> — تظهر أيقونة التطبيق على شاشتك ✅</span></div></div>` });
}
function hideInstallBar() { const b = document.getElementById('inst-bar'); if (b) b.remove(); }
function showInstallBar(force) {
  if (isStandalone() || IQ.get('reg') || location.hash.startsWith('#/tv')) return;
  if (!force && installSnoozed()) return;
  if (!INST.prompt && !isIOS() && !force) return; // متصفح لا يدعم التثبيت المباشر: يبقى الزر في القائمة فقط
  if (document.getElementById('inst-bar')) return;
  const parent = !!IQ.get('p');
  const bar = document.createElement('div'); bar.id = 'inst-bar'; bar.className = 'inst-bar no-print';
  bar.innerHTML = `<img src="assets/icon-192.png?v=2" alt=""><div class="t"><b>${parent ? 'ثبّت صفحة ابنك على جوالك' : 'ثبّت التطبيق على جهازك'}</b><span>${parent ? 'تفتحها بلمسة واحدة دون البحث عن الرابط' : 'يفتح أسرع بلمسة واحدة ويعمل بدون إنترنت'}</span></div><button class="btn sm" data-inst>📲 تثبيت</button><button class="x" data-later title="لاحقاً">✕</button>`;
  document.body.appendChild(bar);
  bar.querySelector('[data-inst]').onclick = installNow;
  bar.querySelector('[data-later]').onclick = () => { localStorage.setItem('tz_inst_later', Date.now() + 3 * 864e5); hideInstallBar(); };
}
/* أزرار دائمة في القائمة الجانبية: تثبيت التطبيق، وتحديث التطبيق / الأيقونة */
const installNavItem = () => (isStandalone() ? '' : `<a href="#" id="inst-nav" onclick="event.preventDefault();installNow()"><span class="ic">📲</span>تثبيت التطبيق</a>`) + `<a href="#" id="upd-nav" onclick="event.preventDefault();updateDialog()"><span class="ic">🔄</span>تحديث التطبيق والأيقونة</a>`;

/* تحديث التطبيق: يجلب أحدث نسخة من الشاشات والأيقونة دون المساس بالبيانات أو تسجيل الدخول */
async function appRefresh() {
  toast('⏳ جاري تحديث التطبيق…', 4000);
  try { if (typeof flush === 'function' && S.token && !isLocal()) await flush(); } catch (e) {}
  try { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); } catch (e) {}
  try { const ks = await caches.keys(); await Promise.all(ks.filter(k => k.startsWith('tahfeez-')).map(k => caches.delete(k))); } catch (e) {}
  sessionStorage.setItem('tz_updated', '1');
  location.replace(location.pathname + location.search + location.hash); location.reload();
}
if (sessionStorage.getItem('tz_updated')) { sessionStorage.removeItem('tz_updated'); setTimeout(() => toast('✔️ تم تحديث التطبيق إلى آخر نسخة — بياناتك كما هي', 3500), 800); }

function updateDialog() {
  const ios = isIOS(), inst = isStandalone();
  const canLink = S.server && S.token && S.me && !IQ.get('p');
  const m = modal({ title: '🔄 تحديث التطبيق والأيقونة', body: `
    <div class="card" style="background:#eef8f5"><b>⚡ تحديث التطبيق</b><div class="small" style="margin:4px 0 10px">يجلب أحدث نسخة من الشاشات والخصائص فوراً. <b>لا يحذف أي بيانات ولا يخرجك من حسابك.</b></div>
      <button class="btn block" data-upd>⚡ تحديث الآن</button></div>
    <div class="card"><b>🖼️ تغيير أيقونة التطبيق المثبّت على الجوال</b>
      <div class="small muted" style="margin:4px 0 8px">الجوال لا يسمح لأي تطبيق بتغيير أيقونته بنفسه، لذلك:</div>
      ${ios ? `<div class="inst-steps">
        <div><b>1</b><span>${canLink ? 'اضغط «📋 نسخ رابط دخولي» بالأسفل (لتدخل بعدها بلمسة دون كلمة مرور)' : 'تأكد أنك تعرف اسم المستخدم وكلمة المرور أو عندك رابط الدخول المباشر'}</span></div>
        <div><b>2</b><span>اضغط مطولاً على أيقونة التطبيق في الشاشة الرئيسية ← «حذف التطبيق» ← «حذف من الشاشة الرئيسية». <b>بياناتك محفوظة في الخادم ولا تُحذف.</b></span></div>
        <div><b>3</b><span>افتح الرابط في Safari ← زر المشاركة ⬆️ ← «إضافة إلى الشاشة الرئيسية» فتظهر الأيقونة الجديدة</span></div>
        <div><b>4</b><span>افتح التطبيق والصق رابط دخولك أو سجّل الدخول</span></div></div>` : `<div class="inst-steps">
        <div><b>1</b><span>اضغط «⚡ تحديث الآن» بالأعلى، ثم أغلق التطبيق وافتحه — يتحقق أندرويد من الأيقونة ويغيّرها تلقائياً خلال يوم، وقد يسألك «تحديث أيقونة التطبيق؟» فاضغط <b>تحديث</b></span></div>
        <div><b>2</b><span>للتغيير فوراً: اضغط مطولاً على الأيقونة ← «إلغاء التثبيت» أو «إزالة»، ثم افتح الرابط في Chrome واضغط «📲 تثبيت التطبيق». <b>بياناتك ودخولك تبقى كما هي.</b></span></div></div>`}
      ${canLink ? '<button class="btn light block" data-mylink style="margin-top:8px">📋 نسخ رابط دخولي المباشر</button>' : ''}
      ${!inst ? '<button class="btn light block" data-inst2 style="margin-top:8px">📲 تثبيت التطبيق</button>' : ''}</div>` });
  $('[data-upd]', m.el).onclick = () => { m.close(); appRefresh(); };
  const ml = $('[data-mylink]', m.el); if (ml) ml.onclick = async () => { try { toast('⏳ جاري تجهيز الرابط…'); const r = await api('makeKey', { id: S.me.id }); if (!r.ok) throw new Error(r.error); copyText(appBase() + '?k=' + r.key + serverParam()); toast('✔️ نُسخ رابط دخولك — احفظه في الملاحظات أو أرسله لنفسك', 4000); } catch (e) { toast('⚠️ ' + e.message); } };
  const i2 = $('[data-inst2]', m.el); if (i2) i2.onclick = () => { m.close(); installNow(); };
}

/* عند الدخول: أظهر الشريط بعد لحظة (في آيفون لا يوجد حدث تثبيت، فيظهر الشرح) */
if (IQ.get('p')) parentManifest(); // مبكراً قبل أن يقرأ المتصفح ملف التطبيق
setTimeout(() => { if (IQ.get('p')) parentManifest(); showInstallBar(); }, 2500);
