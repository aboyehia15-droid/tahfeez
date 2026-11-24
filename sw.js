// سريع كالبرق: ملفات البرنامج (المرقّمة بـ ?v=) تُقرأ من ذاكرة الجهاز فوراً دون انتظار الإنترنت.
// الصفحة الرئيسية تُطلب من الشبكة أولاً (بمهلة قصيرة) حتى يصل أي تحديث يُرفع على GitHub،
// ورقم الإصدار الجديد في index.html يجلب الملفات الجديدة تلقائياً. وبدون إنترنت يعمل من النسخة المخزنة.
const CACHE = 'tahfeez-v27';
const SHELL = ['./', 'index.html', 'manifest.json?v=2', 'assets/icon-192.png?v=2', 'assets/logo-ibntaymiyah.jpg'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  self.skipWaiting();
  // تخزين الصفحة وكل ملفاتها المرقمة مسبقاً حتى يفتح البرنامج فوراً من أول مرة بعد التحديث
  e.waitUntil(caches.open(CACHE).then(async ca => {
    await Promise.all(SHELL.map(u => ca.add(u).catch(() => {})));
    try {
      const html = await (await fetch('index.html', { cache: 'no-store' })).text();
      const urls = [...html.matchAll(/(?:src|href)="([^"]+\?v=[^"]+)"/g)].map(m => m[1]);
      await Promise.all(urls.map(u => ca.add(u).catch(() => {})));
    } catch (err) {}
  }));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tahfeez-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); } return res; };
const timeout = (p, ms) => new Promise((ok, no) => { const t = setTimeout(() => no(new Error('timeout')), ms); p.then(r => { clearTimeout(t); ok(r); }, er => { clearTimeout(t); no(er); }); });

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  // الخطوط: من الذاكرة فوراً وتُحدَّث في الخلفية
  if (FONT_HOSTS.includes(u.hostname)) {
    e.respondWith(caches.match(req).then(hit => { const net = fetch(req).then(r => put(req, r)).catch(() => hit); return hit || net; }));
    return;
  }
  if (u.origin !== location.origin) return;
  // الصفحة الرئيسية: الشبكة أولاً بمهلة ثانيتين، وإلا النسخة المخزنة
  if (req.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname)) {
    const net = fetch(req, { cache: 'no-store' }).then(r => { if (r.ok) caches.open(CACHE).then(ca => ca.put('index.html', r.clone())); return r; });
    e.respondWith(timeout(net, 2000).catch(() => caches.match('index.html').then(hit => hit || net)));
    return;
  }
  // الملفات المرقمة بالإصدار: من الذاكرة فوراً (لا تتغير إلا برقم إصدار جديد)
  if (u.searchParams.has('v')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(req, r))));
    return;
  }
  // باقي الملفات (الصور والشعارات): من الذاكرة فوراً وتُحدَّث في الخلفية
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => { const net = fetch(req).then(r => put(req, r)).catch(() => hit); return hit || net; }));
});
