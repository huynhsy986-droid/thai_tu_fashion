/* Thai Tu Fashion: Thanh phan giao dien dung chung, logic size, header/footer */
/* --- Components --- */
const Logo=(k='compact')=>{const m=MARKS[k]||MARKS.compact;return`<svg class="logo-svg ${MARKS[k]?k:'compact'}" viewBox="0 0 ${m.w} ${m.h}" role="img" aria-label="THAI TU FASHION"><title>THAI TU FASHION</title><g fill="currentColor">${m.d}</g></svg>`};
const Stars=n=>{const f=Math.round(n);return`<span class="stars" aria-label="${n} trên 5 sao">${'★'.repeat(f)}<span class="off">${'★'.repeat(5-f)}</span></span>`};
const Price=p=>p.sale&&p.sale<p.price?`<span class="price num"><span class="pct">−${Math.round((1-p.sale/p.price)*100)}%</span><span class="now">${vnd(p.sale)}</span><s>${vnd(p.price)}</s></span>`:`<span class="price num">${vnd(p.price)}</span>`;
const Swatches=(p,cur,act,extra='')=>`<div class="swatches" role="radiogroup" aria-label="Màu sắc">${p.colors.map(c=>`<button class="sw ${c===cur?'on':''}" title="${colorName(c)}" aria-label="${colorName(c)}" data-a="${act}" data-color="${c}" ${extra}><i style="background:${colorHex(c)}"></i></button>`).join('')}</div>`;
const SizeSelector=(p,color,cur,act,extra='')=>`<div class="sizes">${p.sizes.map(s=>{const out=stockOf(p,color,s)<=0;return`<button class="sz ${s===cur?'on':''} ${out?'oos':''}" data-a="${act}" data-size="${s}" ${extra} aria-label="Size ${s}${out?', hết hàng':''}" title="${out?'Hết hàng':'Còn '+stockOf(p,color,s)}">${s}${!out&&stockOf(p,color,s)<=3?`<small>Còn ${stockOf(p,color,s)}</small>`:''}</button>`}).join('')}</div>`;
const rvOfP=id=>S.reviews.filter(r=>r.pid===id&&r.status==='visible');
const fmtK=n=>n>=1000?(n/1000).toFixed(1).replace('.0','').replace('.',',')+'k':String(n);
function Tags(p){if(totalStock(p)<=0)return'<span class="badge oos">Hết hàng</span>';if(p.sale&&p.sale<p.price)return'<span class="badge sale">Sale</span>';if(p.badge==='new')return'<span class="badge new">Mới</span>';if(p.badge==='best')return'<span class="badge best">Bán chạy</span>';return''}
function ProductCard(p,opts={}){const c=opts.color||firstColor(p);const out=totalStock(p)<=0;const rv=rvOfP(p.id);const avg=rv.length?rv.reduce((a,r)=>a+r.rating,0)/rv.length:0;
 const meta=[p.cat==='shoes'?'':FIT_LBL[p.fit],p.colors.length>1?p.colors.length+' màu':colorName(p.colors[0]),rv.length?`★ ${avg.toFixed(1)}`:''].filter(Boolean).join(' · ');
 return`<article class="pc" data-pid="${p.id}"><div class="pc-media"><a class="pc-img" href="#product-${p.id}" aria-label="${esc(p.name)}"><img data-k="a" src="${img(p,c,'a')}" alt="${esc(p.name)}, màu ${colorName(c)}" loading="lazy"><img class="alt" data-k="b" src="${img(p,c,'b')}" alt="" loading="lazy">${opts.rank?`<span class="rk">${opts.rank}</span>`:''}</a>
 ${p.colors.length>1?`<div class="pc-sw">${p.colors.map(k=>`<button class="sw ${k===c?'on':''}" data-a="cardColor" data-id="${p.id}" data-color="${k}" title="${colorName(k)}" aria-label="Xem màu ${colorName(k)}"><i style="background:${colorHex(k)}"></i></button>`).join('')}</div>`:''}</div>
 <div class="tags">${Tags(p)}</div>
 <button class="iconbtn heart ${inWish(p.id)?'on':''}" data-a="wish" data-id="${p.id}" aria-pressed="${inWish(p.id)}" aria-label="Yêu thích ${esc(p.name)}">${I('heart')}</button>
 <div class="pc-meta"><a class="pc-name" href="#product-${p.id}">${esc(p.name)}</a><div class="pc-cover">${Price(p)}<div class="pc-sub">${meta}</div>${out?'':`<button class="qa" data-a="quick" data-id="${p.id}" aria-label="Thêm nhanh ${esc(p.name)}">Thêm nhanh</button>`}</div>${opts.why?`<div class="pc-why">${esc(opts.why)}</div>`:''}</div></article>`}
const ProductGrid=(list,cls='g4')=>`<div class="grid ${cls}">${list.map(p=>ProductCard(p)).join('')}</div>`;
const ORDER={shoes:1,bottom:2,dress:2,top:3,vest:3.5,outer:4,belt:5,scarf:6,bag:7,eyes:7.5,hat:8};
function OutfitPreview(slots,tone=1){const ls=Object.values(slots).filter(Boolean).map(x=>({...x,p:P(x.pid)})).filter(x=>x.p&&!x.p.photo).sort((a,b)=>ORDER[a.p.sub]-ORDER[b.p.sub]);
 return`<div class="fig"><img src="img/mannequin-${tone}.webp" alt="Mannequin">${ls.map(x=>`<img src="${img(x.p,x.color,'o')}" alt="${esc(x.p.name)}">`).join('')}</div>`}
const Rec=p=>`<div class="rec"><a class="im" href="#product-${p.id}"><img src="${img(p,firstColor(p))}" alt="${esc(p.name)}" loading="lazy"></a><div class="b"><span style="font-weight:500">${esc(p.name)}</span>${Price(p)}<div class="act"><a class="tlink" href="#product-${p.id}">Xem sản phẩm</a><button class="tlink" data-a="toBuilder" data-id="${p.id}" style="text-align:left">Thêm vào Outfit Builder</button></div></div></div>`;
const Notif=n=>`<div class="ntf ${n.read?'':'unread'}"><span class="i">${I({price:'tag',stock:'box',order:'bag',info:'bell'}[n.type]||'bell')}</span><div style="min-width:0"><div class="h-sm">${esc(n.title)}</div><div class="small muted">${esc(n.body)}</div><div class="xs muted">${timeAgo(n.at)}</div><div class="row" style="gap:14px"><a class="tlink" href="#${n.link}" data-a="readN" data-id="${n.id}">Xem chi tiết</a>${n.read?'':`<button class="tlink" data-a="readN" data-id="${n.id}">Đánh dấu đã đọc</button>`}</div></div>${n.read?'<span></span>':'<span class="dot" aria-label="Chưa đọc"></span>'}</div>`;
function Upload(key,title,hint){return`<label class="up" data-drop="${key}" for="file-${key}">${I('upload')}<span class="h-sm">${title}</span><span class="small muted">${hint}</span><span class="btn sm ghost">Chọn tệp</span><input id="file-${key}" type="file" accept="image/jpeg,image/png,image/webp" data-file="${key}" hidden></label><div class="err" id="err-${key}" role="alert"></div>`}
function checkFile(f,max=5){if(!/^image\/(jpeg|png|webp)$/.test(f.type))return'Tệp này không phải ảnh JPG, PNG hoặc WebP. Hãy chọn ảnh khác.';if(f.size>max*1048576)return`Ảnh lớn hơn ${max} MB. Hãy chọn ảnh nhỏ hơn.`;return''}
const readURL=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f)});
function loadImg(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src})}
async function shrink(src,w=420,q=.72){const i=await loadImg(src);const k=Math.min(1,w/i.width);const c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);return c.toDataURL('image/jpeg',q)}
const FILE_HANDLERS={};
const Status=s=>`<span class="status s-${s}">${STATUS[s]}</span>`;
const Field=(id,label,val='',attrs='',err='')=>`<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" value="${esc(val)}" ${attrs}><div class="err" data-err="${id}">${err}</div></div>`;
function setErr(id,msg){const i=document.getElementById(id);const e=$(`[data-err="${id}"]`);if(i)i.classList.toggle('bad',!!msg);if(e)e.textContent=msg||''}

/* --- Size logic: every product carries its own chart --- */
const CUT={hoodie:[10,12,10,70],sweat:[8,10,8,68],cardigan:[2,4,4,50],vest:[10,12,10,66],shirt:[8,8,8,76],boxytee:[10,12,10,70],varsity:[10,12,10,66],puffer:[12,14,12,64],blazerm:[2,4,4,74],coat:[10,14,12,112],
 jeanswide:[0,0,6,104],cargo:[0,4,6,104],miniskirt:[0,0,8,40],sweatpants:[0,6,8,102],wide:[0,0,6,104]};
function sizeChart(p){
 if(p.sub==='shoes'){const adj={chunky:.2,loafer:-.2,boot:0,sneaker:0}[p.tpl]||0;return{kind:'foot',rows:p.sizes.map(s=>({size:s,foot:+((+s-37)*.67+23.6+adj).toFixed(1)}))}}
 if(p.cat==='accessories'||p.cat==='jewelry')return null;
 const C_=[88,94,100,106],W_=[70,76,82,88],H_=[92,97,102,107];
 const c=CUT[p.tpl]||[0,0,0,70];
 return{kind:'body',rows:p.sizes.map((s,i)=>({size:s,chest:C_[i]+c[0],waist:W_[i]+c[1],hip:H_[i]+c[2],length:c[3]+i*(c[3]>90?1.5:1.5)}))}}
function chartTable(p,hl){const ch=sizeChart(p);if(!ch)return'<p class="small muted">Sản phẩm này dùng một kích thước.</p>';
 if(ch.kind==='foot')return`<div class="tbl-wrap"><table class="t"><thead><tr><th>Size EU</th><th>Chiều dài chân tối đa (cm)</th></tr></thead><tbody>${ch.rows.map(r=>`<tr class="${r.size===hl?'hl':''}"><td>${r.size}</td><td>${r.foot}</td></tr>`).join('')}</tbody></table></div>`;
 return`<div class="tbl-wrap"><table class="t"><thead><tr><th>Size</th><th>Ngực <small>가슴</small></th><th>Eo <small>허리</small></th><th>Mông <small>엉덩이</small></th><th>Dài SP <small>총장</small></th></tr></thead><tbody>${ch.rows.map(r=>`<tr class="${r.size===hl?'hl':''}"><td>${r.size}</td><td>${r.chest}</td><td>${r.waist}</td><td>${r.hip}</td><td>${r.length}</td></tr>`).join('')}</tbody></table></div><p class="xs muted" style="margin-top:8px">Bảng riêng cho ${esc(p.name)}, số đo cơ thể tối đa (cm) cho mỗi size, đã tính độ rộng của dáng ${p.fit==='oversized'?'oversize':'regular'}.</p>`}
const FIT_EASE={slim:-2,regular:0,relaxed:3};const FIT_NAME={slim:'Slim (ôm)',regular:'Regular (vừa)',relaxed:'Relaxed (rộng)'};
const DIMS={top:['chest','waist'],outer:['chest','waist'],bottom:['waist','hip'],dress:['chest','waist','hip']};
const DIM_NAME={chest:'Ngực',waist:'Eo',hip:'Mông'};
function advise(p,m){const ch=sizeChart(p);const dims=DIMS[p.sub];const ease=FIT_EASE[m.fit];let idx=-1,reason=[];
 for(let i=0;i<ch.rows.length;i++){if(dims.every(d=>m[d]+ease<=ch.rows[i][d])){idx=i;break}}
 const tooBig=idx<0;if(tooBig)idx=ch.rows.length-1;const r=ch.rows[idx];let minMargin=99;
 dims.forEach(d=>{const margin=r[d]-(m[d]+ease);minMargin=Math.min(minMargin,margin);reason.push(`${DIM_NAME[d]} của bạn ${m[d]} cm${ease?` (${ease>0?'+':''}${ease} cm theo dáng ${FIT_NAME[m.fit]})`:''}, size ${r.size} tới ${r[d]} cm.`)});
 const bmi=m.weight/((m.height/100)**2);const ref=168;
 reason.push(`Chiều cao ${m.height} cm: chiều dài sản phẩm size ${r.size} là ${r.length} cm${m.height>ref+12?', có thể hơi ngắn so với dáng thiết kế':m.height<ref-10?', sẽ dài và rộng hơn trên người bạn, đúng tinh thần oversize':''}.`);
 reason.push(`Cân nặng ${m.weight} kg (BMI khoảng ${bmi.toFixed(1)}) được dùng để đối chiếu, không quyết định size.`);
 const conf=tooBig?'Thấp':minMargin>=1&&minMargin<=6?'Cao':'Trung bình';
 return{size:r.size,conf,tooBig,reason}}/* ===== Customer pages ===== */
const ui={shop:{f:{},limit:12},pdp:{},ob:{tab:'tops',tone:1},chat:{msgs:null,occ:'',style:'',budget:0,gender:'',busy:false},vs:{state:'idle'},tr:{source:'model',tone:2,pid:'k07',color:'navy',state:'done',adj:{x:0,y:0,s:100}},co:{ship:'std',pay:'cod'},adm:{}};
// Lối vào khu quản trị chỉ hiện cho tài khoản admin; chế độ demo (không API) vẫn mở sẵn như prototype (#52)
const canAdmin=()=>typeof SYNC==='undefined'||SYNC.mode==='demo'||(typeof API!=='undefined'&&API.isAdmin());
const NAV=[['shop-new','Hàng mới'],['shop','Cửa hàng'],['shop-tops','Áo'],['shop-outer','Áo khoác'],['shop-bottoms','Quần & váy'],['shop-dresses','Đầm'],['shop-shoes','Giày'],['shop-accessories','Phụ kiện'],['shop-jewelry','Trang sức']];
const ANN=[['Miễn phí giao hàng cho đơn từ 1.500.000₫','info-shipping'],['DROP 04 · Bộ len mùa đông · Thứ Sáu 8:00 sáng','shop-new'],['Đổi size miễn phí trong 7 ngày','info-returns'],['Nhập THAITU10 để giảm 10% đơn đầu tiên','shop']];
// Bản sao thứ 2 chỉ để chạy vòng liền mạch: ẩn với trình đọc màn hình và bỏ khỏi thứ tự Tab (#51)
const Announcement=()=>{const set=hide=>ANN.map(([t,h])=>`<a href="#${h}"${hide?' tabindex="-1"':''}>${t}</a>`).join('');return`<div class="ann" role="region" aria-label="Thông báo khuyến mãi"><div class="ann-in"><span class="ann-set">${set(false)}</span><span class="ann-set" aria-hidden="true">${set(true)}</span></div></div>`};
function Header(cur){return`<header class="hdr"><div class="wrap hdr-in">
 <a class="logo" href="#home" aria-label="Thai Tu Fashion, về trang chủ">${Logo()}</a>
 <nav class="nav" aria-label="Điều hướng chính">${NAV.map(([h,l])=>`<a href="#${h}" class="${cur===h?'on':''}">${l}</a>`).join('')}<a href="#studio" class="studio ${/^(studio|outfit|size|stylist|visual|tryon)/.test(cur)?'on':''}">Smart Studio</a></nav>
 <div class="hdr-r"><button class="iconbtn" data-a="search" aria-label="Tìm kiếm">${I('search')}</button><a class="iconbtn" href="#notifications" aria-label="Thông báo">${I('bell')}<span class="count" data-c="notif"></span></a><a class="iconbtn" href="#account" aria-label="Tài khoản">${I('user')}</a><a class="iconbtn d-only" href="#wishlist" aria-label="Yêu thích">${I('heart')}<span class="count" data-c="wish"></span></a><a class="iconbtn" href="#cart" aria-label="Giỏ hàng">${I('bag')}<span class="count" data-c="cart"></span></a><button class="iconbtn burger" data-a="menu" aria-label="Mở menu">${I('menu')}</button></div>
 </div></header>
 <nav class="mnav" aria-label="Điều hướng nhanh"><a href="#home" class="${cur==='home'?'on':''}">${I('home')}Trang chủ</a><a href="#shop" class="${cur.startsWith('shop')?'on':''}">${I('grid')}Cửa hàng</a><a href="#studio" class="${/^(studio|outfit|size|stylist|visual|tryon)/.test(cur)?'on':''}">${I('spark')}Studio</a><a href="#wishlist" class="${cur==='wishlist'?'on':''}">${I('heart')}Yêu thích<span class="count" data-c="wish"></span></a><a href="#cart" class="${cur==='cart'?'on':''}">${I('bag')}Giỏ hàng<span class="count" data-c="cart"></span></a></nav>`}
/* Thông tin liên hệ chính thức (AC-CON-04) — dùng chung cho chân trang, Giới thiệu, Liên hệ */
const SHOP_INFO={
 email:'support@thaitufashion.vn',
 address:'Số 174 Lê Lợi, Quận Hải Châu, TP. Đà Nẵng',
 hotlines:[['1900 5368','19005368'],['+84 393 131 385','+84393131385']],
 hours:'Thứ 2 – Chủ nhật · 9:00 – 21:00',
 reply:'Phản hồi trong vòng 24 giờ làm việc',
 map:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('174 Lê Lợi, Hải Châu, Đà Nẵng'),
};
icons.mail='<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>';
icons.phone='<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>';
icons.pin='<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>';
const hotlineLinks=(sep=' · ')=>SHOP_INFO.hotlines.map(([t,n])=>`<a href="tel:${n}" class="num">${t}</a>`).join(sep);
const ShopContact=()=>`<address class="ftr-contact tw-not-italic tw-mt-5 tw-flex tw-flex-col tw-gap-2 small" aria-label="Thông tin liên hệ">
 <span class="tw-flex tw-gap-2 tw-items-start">${I('pin')}<span>${SHOP_INFO.address}</span></span>
 <span class="tw-flex tw-gap-2 tw-items-start">${I('phone')}<span>Hotline: ${hotlineLinks()}</span></span>
 <span class="tw-flex tw-gap-2 tw-items-start">${I('mail')}<a href="mailto:${SHOP_INFO.email}">${SHOP_INFO.email}</a></span>
</address>`;
// Đã đăng ký nhận tin thì không hiện lại ô đăng ký ở footer (#52)
const NEWS_KEY='thaitu-news';const newsDone=()=>{try{return localStorage.getItem(NEWS_KEY)==='1'}catch(e){return false}};const markNews=()=>{try{localStorage.setItem(NEWS_KEY,'1')}catch(e){}};
const Footer=()=>`<footer class="ftr"><div class="wrap">${newsDone()?'<div class="ftr-news ftr-news-done"><span class="small">✓ Bạn đã đăng ký nhận tin đợt drop mới qua email.</span></div>':`<div class="ftr-news"><div class="stack" style="gap:4px"><b>Nhận tin đợt drop mới</b><span class="small muted">Một email trước mỗi đợt drop thứ Sáu và ưu đãi riêng.</span></div><form class="stack" data-form="news" novalidate style="gap:4px"><div class="inline-form"><div class="field"><label for="news-mail" class="xs muted">Email của bạn</label><input class="input" id="news-mail" type="email" placeholder="ten@email.com" autocomplete="email"></div><button class="btn" style="align-self:flex-end">Đăng ký</button></div><div class="err" data-err="news-mail"></div><div id="news-ok"></div></form></div>`}<div class="ftr-grid">
 <div class="ftr-brand"><div class="logo" role="img" aria-label="Thai Tu Fashion" style="margin-bottom:18px">${Logo('primary')}</div><p class="small muted" style="max-width:36ch">Trang phục unisex phong cách Seoul, chất liệu tốt, ra mắt theo từng đợt drop mỗi thứ Sáu.</p>${ShopContact()}</div>
 <div><h2 class="fh">Mua sắm</h2><ul><li><a href="#shop-new">Hàng mới</a></li><li><a href="#shop-tops">Áo</a></li><li><a href="#shop-outer">Áo khoác</a></li><li><a href="#shop-bottoms">Quần & váy</a></li><li><a href="#shop-shoes">Giày</a></li><li><a href="#shop-accessories">Phụ kiện</a></li><li><a href="#shop-dresses">Đầm</a></li><li><a href="#shop-jewelry">Trang sức & đồng hồ</a></li></ul></div>
 <div><h2 class="fh">Smart Studio</h2><ul><li><a href="#outfit">Outfit Builder</a></li><li><a href="#size">Size Advisor</a></li><li><a href="#stylist">AI Stylist</a></li><li><a href="#visual">Visual Search</a></li><li><a href="#tryon">Virtual Try-On</a></li></ul></div>
 <div><h2 class="fh">Hỗ trợ</h2><ul><li><a href="#about">Giới thiệu</a></li><li><a href="#contact">Liên hệ</a></li><li><a href="#info-shipping">Giao hàng</a></li><li><a href="#info-returns">Đổi trả</a></li><li><a href="#info-privacy">Quyền riêng tư</a></li><li><a href="#account">Tài khoản</a></li>${canAdmin()?'<li><a href="#admin">Khu quản trị</a></li>':''}${typeof SYNC!=='undefined'&&SYNC.mode==='api'?'':'<li><button data-a="resetAsk">Đặt lại dữ liệu demo</button></li>'}</ul></div>
 </div><div class="ftr-b"><span>© 2026 Thai Tu Fashion</span><span><a href="#about">Về Thai Tu</a> · <a href="#contact">Liên hệ</a> · <a href="#info-privacy">Quyền riêng tư</a></span></div></div></footer>`;

