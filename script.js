const $=s=>document.querySelector(s),app=$('#app');
const sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY);
let user=null,me=null,services=[],cfg={},cart=JSON.parse(sessionStorage.getItem('cart')||'[]');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const usd=n=>'$'+Number(n).toFixed(2),tzs=n=>Math.round(n*(+cfg.tzs_rate||2600)).toLocaleString()+' TZS';
const toast=m=>{const t=$('#toast');t.textContent=m;t.className='on';setTimeout(()=>t.className='',3000)};
const saveCart=()=>{sessionStorage.setItem('cart',JSON.stringify(cart));$('#cc').textContent=cart.length};
async function api(fn,body){const{data:{session}}=await sb.auth.getSession();
 const r=await fetch('/.netlify/functions/'+fn,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(session?.access_token||'')},body:JSON.stringify(body)});
 const j=await r.json();if(!r.ok)throw new Error(j.error||'Request failed');return j}
async function boot(){
 const{data:{session}}=await sb.auth.getSession();user=session?.user||null;
 if(user){const{data}=await sb.from('profiles').select('*').eq('id',user.id).single();me=data}
 const{data:s}=await sb.from('settings').select('*');(s||[]).forEach(x=>cfg[x.key]=x.value);
 const{data:sv}=await sb.from('services').select('*').eq('active',true).order('price_usd');services=sv||[];
 $('#nav-auth').innerHTML=user?`<a href="#dash">Dashboard</a>${me?.role==='owner'?' <a href="#admin">Owner</a>':''} <a href="#" id="lo">Logout</a>`:`<a href="#login">Sign In</a>`;
 const lo=$('#lo');if(lo)lo.onclick=async e=>{e.preventDefault();await sb.auth.signOut();location.hash='home';location.reload()};
 saveCart();route()}
function svcCard(s){return `<div class="card"><span class="tag">${esc(s.department)}</span><h3>${esc(s.name)}</h3><p class="muted">${esc(s.description)}</p>
<p class="muted">Delivery: ${esc(s.delivery)}<br>Needs: ${esc(s.requirements)}</p><div class="price">${usd(s.price_usd)} <span class="muted">≈ ${tzs(s.price_usd)}</span></div>
<button data-add="${s.id}">Order now</button></div>`}
const FAQ=[['How do I pay?','Right now we accept manual Mixx by Yas transfers. Your order unlocks only after the owner verifies the payment in the official wallet.'],['Do you accept cards?','Not yet. Card and other gateway payments will be added only after a payment provider approves our merchant account.'],['How long does verification take?','Usually a few hours during business hours.'],['Do you need my PIN?','Never. We never ask for PINs, OTPs or card details.']];
const LEGAL={terms:'Terms of Service: Services are digital and delivered after verified payment. Delivery times are estimates. Misuse of the platform may lead to account suspension.',privacy:'Privacy Policy: We store your name, email, orders and payment references. We never store PINs, OTPs or card data. We do not sell your data.',refund:'Refund Policy: If we cannot deliver an order, you receive a full refund to the wallet used. Completed digital work is non-refundable unless it fails the agreed requirements.'};
const V={
home(){app.innerHTML=`<section class="hero"><h1>Power Your Ideas. Build Your Digital Future.</h1><p>Discover professional digital services, business tools and creative solutions in one powerful platform.</p>
<div class="row"><a class="btn" href="#services">Explore Services</a><a class="btn alt" href="#${user?'dash':'login'}">Get Started</a>${user?'':'<a class="btn alt" href="#login">Sign In</a>'}</div></section>
<section id="services"><h2>Featured services</h2><div class="grid">${services.map(svcCard).join('')||'<p class="muted">No services yet.</p>'}</div></section>
<section><h2>How it works</h2><div class="grid"><div class="card"><h3>1. Choose</h3><p class="muted">Pick a service and add it to your cart.</p></div><div class="card"><h3>2. Pay</h3><p class="muted">Send via Mixx by Yas and submit your reference.</p></div><div class="card"><h3>3. Receive</h3><p class="muted">Track progress and download your finished work.</p></div></div></section>
<section id="faq"><h2>FAQ</h2>${FAQ.map(f=>`<details class="card"><summary>${f[0]}</summary><p class="muted">${f[1]}</p></details>`).join('')}</section>
<section id="contact"><h2>Contact</h2><p class="muted">Signed-in customers can message support from their dashboard. Customer reviews will appear here once real customers submit them.</p></section>`;
 app.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{if(!cart.includes(b.dataset.add))cart.push(b.dataset.add);saveCart();toast('Added to cart')})},
services(){V.home();setTimeout(()=>$('#services')?.scrollIntoView(),0)},pricing(){V.services()},faq(){V.home()},contact(){V.home()},
cart(){const l=cart.map(id=>services.find(s=>s.id===id)).filter(Boolean),t=l.reduce((a,s)=>a+ +s.price_usd,0);
 app.innerHTML=`<section><h2>Your cart</h2>${l.map(s=>`<div class="card" style="margin-bottom:.6rem">${esc(s.name)} — ${usd(s.price_usd)} <button class="alt" data-rm="${s.id}">Remove</button></div>`).join('')||'<p class="muted">Cart is empty.</p>'}
${l.length?`<p class="price">Total ${usd(t)} <span class="muted">≈ ${tzs(t)} (approximate rate, set by the owner)</span></p><button id="co">Proceed to checkout</button>`:''}</section>`;
 app.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{cart=cart.filter(i=>i!==b.dataset.rm);saveCart();V.cart()});
 const co=$('#co');if(co)co.onclick=async()=>{if(!user){toast('Please sign in first');location.hash='login';return}
  try{const o=await api('create-order',{items:cart.map(id=>({id}))});cart=[];saveCart();location.hash='pay/'+o.id}catch(e){toast(e.message)}}},
async pay(id){const{data:o}=await sb.from('orders').select('*').eq('id',id).single();if(!o){app.innerHTML='<p>Order not found.</p>';return}
 app.innerHTML=`<section class="box"><h2>Pay for ${esc(o.order_code)}</h2><div class="pay"><p><b>Mixx by Yas</b> — Tanzania<br>Recipient: ${esc(cfg.business_name)}</p>
<p>Number: <b id="pn">${esc(cfg.mixx_number)}</b> <button class="alt" id="cp">Copy phone number</button></p>
<p>Amount: <b>${usd(o.total_usd)}</b> (${tzs(o.total_usd)})</p><p>Order ID: <b id="oc">${esc(o.order_code)}</b> <button class="alt" id="co2">Copy Order ID</button></p></div>
<p class="muted">${esc(cfg.instructions)}</p><p class="muted">Personal-wallet transfers follow the provider's rules and may be subject to approval and fees. Your order is delivered only after the owner confirms the money arrived. Do not upload screenshots as proof, and never share your PIN or OTP.</p>
${o.status==='PENDING PAYMENT'?`<label>Transaction reference from your Mixx SMS<input id="ref" placeholder="e.g. MP240101.1234.A56789"></label><button id="sub">Submit payment confirmation</button>`:`<p>Status: <span class="st">${o.status}</span></p>`}</section>`;
 $('#cp').onclick=()=>{navigator.clipboard.writeText(cfg.mixx_number);toast('Number copied')};$('#co2').onclick=()=>{navigator.clipboard.writeText(o.order_code);toast('Order ID copied')};
 const s=$('#sub');if(s)s.onclick=async()=>{try{await api('submit-payment',{order_id:o.id,reference:$('#ref').value});toast('Submitted. Payment is under review.');location.hash='dash'}catch(e){toast(e.message)}}},
login(){app.innerHTML=`<section class="box card"><h2 id="lt">Sign in</h2><input id="nm" placeholder="Full name" style="display:none"><input id="em" type="email" placeholder="Email"><input id="pw" type="password" placeholder="Password (min 8)">
<div class="row"><button id="go">Sign in</button><button class="alt" id="sw">Create account</button><button class="alt" id="fg">Forgot password</button></div></section>`;let reg=false;
 $('#sw').onclick=()=>{reg=!reg;$('#nm').style.display=reg?'block':'none';$('#go').textContent=reg?'Register':'Sign in';$('#lt').textContent=reg?'Create account':'Sign in'};
 $('#go').onclick=async()=>{const em=$('#em').value,pw=$('#pw').value;if(pw.length<8)return toast('Password needs 8+ characters');
  const r=reg?await sb.auth.signUp({email:em,password:pw,options:{data:{full_name:$('#nm').value}}}):await sb.auth.signInWithPassword({email:em,password:pw});
  if(r.error)return toast(r.error.message);if(reg&&!r.data.session)return toast('Check your email to confirm your account');location.hash='dash';location.reload()};
 $('#fg').onclick=async()=>{const{error}=await sb.auth.resetPasswordForEmail($('#em').value,{redirectTo:location.origin});toast(error?error.message:'Reset link sent')}},
async dash(){if(!user)return location.hash='login';
 const[{data:o},{data:n}]=await Promise.all([sb.from('orders').select('*').order('created_at',{ascending:false}),sb.from('notifications').select('*').order('created_at',{ascending:false}).limit(5)]);
 app.innerHTML=`<section><h2>Hello, ${esc(me?.full_name||user.email)}</h2><h3>Orders</h3><div class="tbl"><table><tr><th>Order</th><th>Total</th><th>Status</th><th></th></tr>${(o||[]).map(x=>`<tr><td>${esc(x.order_code)}<br><span class="muted">${esc(x.items.map(i=>i.name).join(', '))}</span></td><td>${usd(x.total_usd)}</td><td><span class="st">${x.status}</span></td>
<td>${x.status==='PENDING PAYMENT'?`<a href="#pay/${x.id}">Pay</a>`:x.delivered_url&&['COMPLETED'].includes(x.status)?`<a href="${esc(x.delivered_url)}" target="_blank" rel="noopener">Download</a>`:''}</td></tr>`).join('')||'<tr><td colspan=4 class="muted">No orders yet. Browse services to get started.</td></tr>'}</table></div>
<h3>Notifications</h3>${(n||[]).map(x=>`<p class="muted">${esc(x.message)}</p>`).join('')||'<p class="muted">Nothing new.</p>'}
<h3>Support</h3><textarea id="sm" rows="3" placeholder="How can we help?"></textarea><button id="ss">Send message</button></section>`;
 $('#ss').onclick=async()=>{const m=$('#sm').value.trim();if(!m)return;const{error}=await sb.from('support').insert({user_id:user.id,message:m});toast(error?error.message:'Message sent');$('#sm').value=''}},
async admin(tab='orders'){if(me?.role!=='owner'){app.innerHTML='<p>Owner access only.</p>';return}
 const tabs=['overview','orders','services','customers','settings'];
 let h=`<section><h2>Owner dashboard</h2><div class="tabs">${tabs.map(t=>`<button class="${t===tab?'':'alt'}" data-t="${t}">${t}</button>`).join('')}</div>`;
 const{data:o}=await sb.from('orders').select('*,payments(*),profiles(email)').order('created_at',{ascending:false});
 if(tab==='overview'){const{data:p}=await sb.from('payments').select('*');const ap=(p||[]).filter(x=>x.status==='APPROVED'),d=Date.now(),sum=ms=>ap.filter(x=>d-new Date(x.reviewed_at)<ms).reduce((a,x)=>a+ +x.amount_usd,0);
  h+=`<div class="grid"><div class="card">Total revenue<div class="price">${usd(ap.reduce((a,x)=>a+ +x.amount_usd,0))}</div></div><div class="card">Last 24h<div class="price">${usd(sum(864e5))}</div></div><div class="card">Last 7 days<div class="price">${usd(sum(6048e5))}</div></div><div class="card">Last 30 days<div class="price">${usd(sum(2592e6))}</div></div>
<div class="card">Orders<div class="price">${o.length}</div></div><div class="card">Awaiting review<div class="price">${(p||[]).filter(x=>x.status==='UNDER REVIEW').length}</div></div><div class="card">Rejected<div class="price">${(p||[]).filter(x=>x.status==='REJECTED').length}</div></div></div>`}
 if(tab==='orders')h+=`<div class="tbl"><table><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Status / delivery</th></tr>${o.map(x=>{const p=x.payments.find(q=>q.status==='UNDER REVIEW')||x.payments[0];return `<tr><td>${esc(x.order_code)}<br>${usd(x.total_usd)}</td><td>${esc(x.profiles?.email)}</td>
<td>${p?`Ref: <b>${esc(p.reference)}</b> <span class="st">${p.status}</span>${p.status==='UNDER REVIEW'?`<br><button class="ok" data-ap="${p.id}">Approve (money received)</button> <button class="bad" data-rj="${p.id}">Reject</button>`:''}`:'<span class="muted">none</span>'}</td>
<td><select data-st="${x.id}">${['PENDING PAYMENT','PAYMENT UNDER REVIEW','PAID','PROCESSING','COMPLETED','CANCELLED','REFUNDED'].map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select><input data-url="${x.id}" placeholder="Delivery link (https://…)" value="${esc(x.delivered_url||'')}"><button data-sv="${x.id}">Save</button></td></tr>`}).join('')}</table></div>`;
 if(tab==='services'){const{data:all}=await sb.from('services').select('*').order('name');
  h+=`<div class="tbl"><table><tr><th>Name</th><th>Dept</th><th>Price USD</th><th>Active</th><th></th></tr>${all.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.department)}</td><td><input data-pr="${s.id}" type="number" step="0.5" value="${s.price_usd}"></td><td><input data-ac="${s.id}" type="checkbox" ${s.active?'checked':''}></td><td><button data-us="${s.id}">Save</button> <button class="bad" data-ds="${s.id}">Delete</button></td></tr>`).join('')}</table></div>
<h3>Add service</h3><input id="n1" placeholder="Name"><input id="n2" placeholder="Department"><input id="n3" placeholder="Description"><input id="n4" type="number" placeholder="Price USD"><input id="n5" placeholder="Delivery time"><input id="n6" placeholder="Requirements"><button id="addsv">Add service</button>`}
 if(tab==='customers'){const{data:c}=await sb.from('profiles').select('*');const{data:sp}=await sb.from('support').select('*').order('created_at',{ascending:false});
  h+=`<div class="tbl"><table><tr><th>Name</th><th>Email</th><th>Orders</th></tr>${c.map(x=>`<tr><td>${esc(x.full_name)}</td><td>${esc(x.email)}</td><td>${o.filter(y=>y.user_id===x.id).length}</td></tr>`).join('')}</table></div><h3>Support requests</h3>${sp.map(x=>`<p class="muted">${new Date(x.created_at).toLocaleString()}: ${esc(x.message)}</p>`).join('')||'<p class="muted">None.</p>'}`}
 if(tab==='settings')h+=`${['business_name','mixx_number','tzs_rate','instructions'].map(k=>`<label>${k}<input data-cf="${k}" value="${esc(cfg[k])}"></label>`).join('')}<button id="svcf">Save settings</button>`;
 app.innerHTML=h+'</section>';
 app.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>V.admin(b.dataset.t));
 const act=async(b)=>{try{await api('admin-action',b);toast('Done');V.admin(tab)}catch(e){toast(e.message)}};
 app.querySelectorAll('[data-ap]').forEach(b=>b.onclick=()=>confirm('Confirm the money is in your Mixx wallet?')&&act({action:'approve_payment',payment_id:b.dataset.ap}));
 app.querySelectorAll('[data-rj]').forEach(b=>b.onclick=()=>act({action:'reject_payment',payment_id:b.dataset.rj}));
 app.querySelectorAll('[data-sv]').forEach(b=>b.onclick=()=>act({action:'set_status',order_id:b.dataset.sv,status:$(`[data-st="${b.dataset.sv}"]`).value,delivered_url:$(`[data-url="${b.dataset.sv}"]`).value}));
 app.querySelectorAll('[data-us]').forEach(b=>b.onclick=async()=>{const i=b.dataset.us,{error}=await sb.from('services').update({price_usd:+$(`[data-pr="${i}"]`).value,active:$(`[data-ac="${i}"]`).checked}).eq('id',i);toast(error?error.message:'Saved')});
 app.querySelectorAll('[data-ds]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete service?'))return;await sb.from('services').delete().eq('id',b.dataset.ds);V.admin(tab)});
 const a=$('#addsv');if(a)a.onclick=async()=>{const{error}=await sb.from('services').insert({name:$('#n1').value,department:$('#n2').value,description:$('#n3').value,price_usd:+$('#n4').value,delivery:$('#n5').value,requirements:$('#n6').value});toast(error?error.message:'Added');V.admin(tab)};
 const sc=$('#svcf');if(sc)sc.onclick=async()=>{for(const i of app.querySelectorAll('[data-cf]'))await sb.from('settings').upsert({key:i.dataset.cf,value:i.value});toast('Settings saved')}},
legal(k){app.innerHTML=`<section class="box"><h2>${k[0].toUpperCase()+k.slice(1)}</h2><p>${LEGAL[k]}</p></section>`}};
function route(){const[h,a]=(location.hash.slice(1)||'home').split('/');window.scrollTo(0,0);
 if(LEGAL[h])return V.legal(h);(V[h]||V.home)(a)}
window.addEventListener('hashchange',route);
if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js');
boot();
