const C='isaka-v1',A=['/','/index.html','/style.css','/script.js','/config.js','/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||e.request.url.includes('supabase.co')||e.request.url.includes('/.netlify/'))return;
e.respondWith(fetch(e.request).then(r=>{const k=r.clone();caches.open(C).then(c=>c.put(e.request,k));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/'))))});
