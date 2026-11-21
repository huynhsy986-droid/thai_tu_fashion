/* Thai Tu Fashion: Trang thai (localStorage), tien ich, toast/modal, thong bao, gio hang */
const KEY='thaitu-fashion-v4';
let S;try{const raw=localStorage.getItem(KEY);S=raw?JSON.parse(raw):null;if(S&&S.v!==4)S=null}catch(e){S=null}
if(!S)S=seedState();
let saveT;function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}},120)}
/* Them san pham / danh muc moi vao du lieu da luu ma khong xoa gio hang, don hang cua nguoi dung */
(()=>{let ch=false;const add=seedProducts().filter(p=>!S.products.some(x=>x.id===p.id));if(add.length){S.products.push(...add);S.reviews.push(...seedReviews(add).map(r=>({...r,id:'m'+r.pid+r.id})));ch=true}
 CATS0.forEach(c=>{if(!S.categories.some(x=>x.id===c.id)){S.categories.push({...c});ch=true}});if(ch)save()})();
function commit(){save();badges()}
const $=(q,r=document)=>r.querySelector(q);const $$=(q,r=document)=>[...r.querySelectorAll(q)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vnd=n=>Math.round(n).toLocaleString('vi-VN')+'₫';
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d');
const P=id=>S.products.find(p=>p.id===id);
const pr=p=>p.sale&&p.sale<p.price?p.sale:p.price;
const live=()=>S.products.filter(p=>p.status==='active');
const colorName=c=>(COLORS[c]||[c])[0];const colorHex=c=>(COLORS[c]||[,'#ccc'])[1];
function img(p,c,k='a'){const col=p.baseColors.includes(c)?c:p.baseColors[0];return`img/${p.base}-${col}-${k}.webp`}
const stockOf=(p,c,s)=>(p.stock[c]&&p.stock[c][s])||0;
const totalStock=p=>p.colors.reduce((a,c)=>a+p.sizes.reduce((b,s)=>b+stockOf(p,c,s),0),0);
const colorStock=(p,c)=>p.sizes.reduce((b,s)=>b+stockOf(p,c,s),0);
const firstColor=p=>p.colors.find(c=>colorStock(p,c)>0)||p.colors[0];
const inWish=id=>S.wish.some(w=>w.pid===id);
const dateVN=t=>new Date(t).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
const timeAgo=t=>{const m=Math.floor((Date.now()-t)/6e4);if(m<1)return'Vừa xong';if(m<60)return m+' phút trước';const h=Math.floor(m/60);if(h<24)return h+' giờ trước';return Math.floor(h/24)+' ngày trước'};
const badgeOf=p=>p.sale&&p.sale<p.price?'sale':p.badge;
const BADGE={new:'Mới',sale:'Sale',best:'Bán chạy'};
const FIT_LBL={oversized:'Dáng rộng',relaxed:'Dáng suông',regular:'Dáng vừa',slim:'Dáng ôm',free:'Free size'};
const shortMat=p=>{const m=String(p.material||'').split(';')[0].trim();if(m.length<=34)return m;const c=m.lastIndexOf(',',34);return c>0?m.slice(0,c):m.split(',')[0]};
/* Goi y theo hanh vi: mon da xem, da thich, trong gio, da mua -> cham diem san pham khac theo phong cach, dip mac, nhom do */
function track(id){const v=(S.viewed||[]).filter(x=>x!==id);v.unshift(id);S.viewed=v.slice(0,12);save()}
function forYou(n=4){
 const seeds=[];(S.viewed||[]).forEach((id,i)=>seeds.push({id,w:Math.max(.6,1.6-i*.15),why:'xem'}));
 S.wish.forEach(w=>seeds.push({id:w.pid,w:2,why:'thich'}));S.cart.forEach(c=>seeds.push({id:c.pid,w:2.4,why:'gio'}));
 S.orders.filter(o=>o.cid==='c1').forEach(o=>o.items.forEach(i=>seeds.push({id:i.pid,w:1,why:'mua'})));
 const sd=seeds.map(x=>({...x,p:P(x.id)})).filter(x=>x.p);if(!sd.length)return[];
 const skip=new Set(sd.filter(x=>x.why!=='mua').map(x=>x.id));
 const WHY={xem:'Vì bạn đã xem',thich:'Hợp với món bạn thích',gio:'Hợp với món trong giỏ',mua:'Hợp với món bạn đã mua'};
 return live().filter(p=>!skip.has(p.id)&&totalStock(p)>0).map(p=>{let best=null,sum=0;sd.forEach(x=>{if(x.id===p.id)return;const v=(score(p,x.p)+(p.sub!==x.p.sub?1.5:0))*x.w;sum+=v;if(!best||v>best.v)best={v,x}});return{p,sum:sum+p.sold/2500,best}})
  .sort((a,b)=>b.sum-a.sum).slice(0,n).map(r=>({p:r.p,why:r.best?WHY[r.best.x.why]+': '+r.best.x.p.name:''}))}
const recentList=(skip,n=6)=>(S.viewed||[]).filter(id=>id!==skip).map(P).filter(p=>p&&p.status==='active').slice(0,n);
const Recent=list=>list.length?`<div class="recent">${list.map(p=>`<a class="rc" href="#product-${p.id}"><img src="${img(p,firstColor(p))}" alt="" loading="lazy"><span class="xs">${esc(p.name)}</span><span class="xs num" style="font-weight:600">${vnd(pr(p))}</span></a>`).join('')}</div>`:'';
const icons={
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.2-6 8-6s6.800 2 8 6"/>',heart:'<path d="M12 20.500S3.500 15.300 3.500 9.200A4.700 4.700 0 0 1 12 6.500a4.700 4.700 0 0 1 8.500 2.700c0 6.100-8.500 11.300-8.500 11.300Z"/>',bag:'<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',bell:'<path d="M6 9a6 6 0 1 1 12 0c0 6 2.500 7.500 2.500 7.500h-17S6 15 6 9Z"/><path d="M10 20a2.200 2.200 0 0 0 4 0"/>',menu:'<path d="M3 7h18M3 12h18M3 17h18"/>',x:'<path d="M5 5l14 14M19 5 5 19"/>',home:'<path d="m3 11 9-8 9 8"/><path d="M5 9.500V21h14V9.500"/>',shop:'<path d="M4 4h16v16H4z"/><path d="M4 12h16M12 4v16"/>',spark:'<path d="M12 3v5M12 16v5M3 12h5M16 12h5"/><path d="m7 7 2 2M15 15l2 2M17 7l-2 2M9 15l-2 2"/>',upload:'<path d="M12 16V5"/><path d="m7 10 5-5 5 5"/><path d="M4 19h16"/>',tag:'<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="8" cy="9" r="1.500"/>',box:'<path d="M3 8 12 3l9 5v9l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v9"/>',chart:'<path d="M4 20V4M4 20h16"/><path d="M9 16v-5M14 16V8M19 16v-9"/>',users:'<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20c.800-3.500 3.200-5.500 6.500-5.500s5.700 2 6.500 5.500"/><path d="M16 4.800a3.500 3.500 0 0 1 0 6.500M18.500 15c1.500.900 2.500 2.500 3 5"/>',star:'<path d="m12 3 2.800 5.800 6.200.900-4.500 4.400 1.100 6.300L12 17.400l-5.600 3 1.100-6.300L3 9.700l6.200-.900L12 3Z"/>',layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',grid:'<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',back:'<path d="M15 5l-7 7 7 7"/>',ruler:'<path d="M3 16 16 3l5 5L8 21l-5-5Z"/><path d="m7 12 2 2M10.500 8.500 13 11M14 5l2 2"/>'};
const I=n=>`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${icons[n]||''}</svg>`;

/* --- toast + modal --- */
function toast(msg,opts={}){const t=document.createElement('div');t.className='toast'+(opts.bad?' bad':'');t.setAttribute('role','status');t.innerHTML=`<span>${msg}</span>${opts.link?`<a href="#${opts.link}">${opts.label||'Xem'}</a>`:''}`;$('#toasts').append(t);setTimeout(()=>t.remove(),opts.ms||3400)}
let lastFocus=null;
function openModal(html,cls=''){lastFocus=document.activeElement;$('#modal').innerHTML=`<div class="scrim" data-a="scrim"><div class="dlg ${cls}" role="dialog" aria-modal="true"><button class="iconbtn dlg-x" data-a="closeModal" aria-label="Đóng">${I('x')}</button>${html}</div></div>`;document.documentElement.style.overflow='hidden';const f=$('#modal .dlg input,#modal .dlg select');if(f&&cls==='top')f.focus()}
function closeModal(){$('#modal').innerHTML='';document.documentElement.style.overflow='';if(lastFocus&&lastFocus.isConnected)lastFocus.focus()}

/* --- notifications & stock events --- */
function addNotif(type,title,body,link){S.notifs.unshift({id:'n'+(++S.seq),type,title,body,link,at:Date.now(),read:false});badges()}
function priceChanged(p,old){const now=pr(p);if(now>=old)return;const w=S.wish.find(x=>x.pid===p.id);if(!w)return;
  if(w.target&&now<=w.target)addNotif('price',`${p.name} đã đạt giá bạn mong muốn`,`Giá mới ${vnd(now)}, mong muốn ${vnd(w.target)}.`,'product-'+p.id);
  else addNotif('price',`${p.name} vừa giảm giá`,`Từ ${vnd(old)} xuống ${vnd(now)}.`,'product-'+p.id)}
function stockChanged(p,c,s,old,now){if(old>0||now<=0)return;const i=S.restock.findIndex(r=>r.pid===p.id&&r.color===c&&r.size===s);if(i<0)return;S.restock.splice(i,1);addNotif('stock',`${p.name} đã có hàng trở lại`,`Màu ${colorName(c)}, size ${s}: còn ${now} sản phẩm.`,'product-'+p.id)}

/* --- badges --- */
function cartCount(){return S.cart.reduce((a,i)=>a+i.qty,0)}
function badges(){const u=S.notifs.filter(n=>!n.read).length;$$('[data-c=cart]').forEach(e=>{e.textContent=cartCount();e.dataset.n=cartCount()});$$('[data-c=wish]').forEach(e=>{e.textContent=S.wish.length;e.dataset.n=S.wish.length});$$('[data-c=notif]').forEach(e=>{e.textContent=u;e.dataset.n=u})}
function syncHearts(id){$$(`[data-a=wish][data-id=${id}]`).forEach(b=>{const on=inWish(id);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);if(b.dataset.label)b.textContent=on?'Đã lưu vào yêu thích':'Thêm vào yêu thích'})}

/* --- cart ops --- */
function addCart(pid,color,size,qty=1,silent){const p=P(pid);const have=S.cart.find(i=>i.pid===pid&&i.color===color&&i.size===size);const st=stockOf(p,color,size);const next=(have?have.qty:0)+qty;
  if(st<=0){toast(`${p.name} màu ${colorName(color)} size ${size} đã hết hàng.`,{bad:true});return false}
  if(next>st){toast(`Chỉ còn ${st} sản phẩm size ${size} trong kho.`,{bad:true});return false}
  if(have)have.qty=next;else S.cart.push({pid,color,size,qty});commit();if(!silent)toast(`Đã thêm ${esc(p.name)} vào giỏ.`,{link:'cart',label:'Xem giỏ'});return true}

