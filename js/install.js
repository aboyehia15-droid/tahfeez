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
    icons: [{ src: base + 'assets/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: base + 'assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }] };
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
  bar.innerHTML = `<img src="assets/icon-192.png" alt=""><div class="t"><b>${parent ? 'ثبّت صفحة ابنك على جوالك' : 'ثبّت التطبيق على جهازك'}</b><span>${parent ? 'تفتحها بلمسة واحدة دون البحث عن الرابط' : 'يفتح أسرع بلمسة واحدة ويعمل بدون إنترنت'}</span></div><button class="btn sm" data-inst>📲 تثبيت</button><button class="x" data-later title="لاحقاً">✕</button>`;
  document.body.appendChild(bar);
  bar.querySelector('[data-inst]').onclick = installNow;
  bar.querySelector('[data-later]').onclick = () => { localStorage.setItem('tz_inst_later', Date.now() + 3 * 864e5); hideInstallBar(); };
}
/* زر دائم في القائمة الجانبية */
const installNavItem = () => isStandalone() ? '' : `<a href="#" id="inst-nav" onclick="event.preventDefault();installNow()"><span class="ic">📲</span>تثبيت التطبيق</a>`;

/* عند الدخول: أظهر الشريط بعد لحظة (في آيفون لا يوجد حدث تثبيت، فيظهر الشرح) */
if (IQ.get('p')) parentManifest(); // مبكراً قبل أن يقرأ المتصفح ملف التطبيق
setTimeout(() => { if (IQ.get('p')) parentManifest(); showInstallBar(); }, 2500);
