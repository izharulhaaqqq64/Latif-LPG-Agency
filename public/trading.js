state.partItems ??= [];
state.partMovements ??= [];
let partsView='stock';
function cashPage(){
 const rows=state.sales.filter(s=>s.directCash&&s.date===today());
 return `<article class="card cash-entry"><h2>Aaj ki cash sale</h2><p>Sirf payment likhein aur Enter dabayein. Customer ka naam zaroori nahin.</p><form id="quick-cash-form"><label class="field">Payment / raqam (Rs.)<input name="amount" type="number" min="0.01" step="0.01" required placeholder="Misal: 500" autofocus></label><button class="button primary">＋ Payment save karein</button></form><p class="card-subtitle">Yeh cash gas sale hai, purana udhaar ki wasooli nahin. Kg dene ke liye “Cash entry” button use karein; kg ke baghair gas stock nahin ghatega.</p></article><article class="card" style="margin-top:20px">${table(['TIME','PAYMENT'],rows.map(s=>`<tr><td>${esc(s.time)}</td><td><strong>Rs. ${money(total(s))}</strong></td></tr>`))}<div class="cash-day-total"><span>Aaj ki direct cash entries · ${rows.length} payments</span><strong id="cash-day-total">Rs. ${money(rows.reduce((a,s)=>a+total(s),0))}</strong></div></article>`;
}
function partInventory(id){
 let qty=0,value=0;
 for(const m of state.partMovements.filter(m=>m.part===id)){
  const sign=m.direction==='In'?1:-1;
  qty+=sign*m.qty;value+=sign*m.qty*m.cost;
 }
 return {qty,value:Math.max(0,value),average:qty>0?Math.max(0,value)/qty:0};
}
function partStats(){
 const sales=state.sales.filter(s=>s.partId);
 return {revenue:sales.reduce((a,s)=>a+total(s),0),cost:sales.reduce((a,s)=>a+s.qty*s.costPerUnit,0)};
}
function partsPage(){
 const stats=partStats(),items=state.partItems.filter(p=>p.name.toLowerCase().includes(query.toLowerCase()));
 return `<div class="section-toolbar"><input class="search" id="search" placeholder="Search parts…" value="${esc(query)}"><div><button class="button secondary" data-action="part-new">＋ Naya part</button> <button class="button secondary" data-action="part-buy">＋ Stock khareedein</button> <button class="button primary" data-action="part-sale">− Part sale</button></div></div><div class="parts-tabs"><button data-parts-view="stock" class="${partsView==='stock'?'selected':''}">Stock / quantity</button><button data-parts-view="prices" class="${partsView==='prices'?'selected':''}">Actual price & profit</button><button data-parts-view="history" class="${partsView==='history'?'selected':''}">Aamad / sale history</button></div><div class="stats">${stat('Parts stock value',money(state.partItems.reduce((a,p)=>a+partInventory(p.id).value,0)),'◫','Current stock at weighted-average cost')}${stat('Parts sales',money(stats.revenue),'↗','Sales from tracked parts')}${stat('Gross profit',money(roundAmount(stats.revenue-stats.cost)),'↗','Sale value − actual cost; expenses excluded')}</div><article class="card">${partsView==='history'?table(['DATE','PART','MOVEMENT','QUANTITY','COST / PIECE','SALE / PIECE'],state.partMovements.filter(m=>items.some(p=>p.id===m.part)).slice().reverse().map(m=>`<tr><td>${esc(m.date)}</td><td><strong>${esc(state.partItems.find(p=>p.id===m.part)?.name)}</strong></td><td>${m.direction==='In'?'Stock add':'Sale / stock minus'}</td><td>${m.qty}</td><td>Rs. ${money(m.cost)}</td><td>${m.direction==='Out'?'Rs. '+money(m.rate):'—'}</td></tr>`)):partsView==='prices'?table(['PART','ACTUAL COST / PIECE','SELLING PRICE / PIECE','EXPECTED PROFIT / PIECE','REALIZED GROSS PROFIT'],items.map(p=>{const inv=partInventory(p.id),sold=state.sales.filter(s=>s.partId===p.id);return `<tr><td><strong>${esc(p.name)}</strong></td><td>${inv.qty?'Rs. '+money(inv.average):'No stock'}</td><td>Rs. ${money(p.sellingRate)}</td><td>${inv.qty?'Rs. '+money(roundAmount(p.sellingRate-inv.average)):'—'}</td><td>Rs. ${money(roundAmount(sold.reduce((a,s)=>a+total(s)-s.qty*s.costPerUnit,0)))}</td></tr>`})):table(['PART','AVAILABLE QUANTITY','PURCHASE COST / PIECE','SELLING PRICE / PIECE','STOCK VALUE'],items.map(p=>{const inv=partInventory(p.id);return `<tr><td><strong>${esc(p.name)}</strong></td><td><span class="badge ${inv.qty?'paid':'credit'}">${inv.qty} pcs</span></td><td>${inv.qty?'Rs. '+money(inv.average):'—'}</td><td>Rs. ${money(p.sellingRate)}</td><td>Rs. ${money(inv.value)}</td></tr>`}))}</article><p class="card-subtitle">Khareed par quantity add aur sale par minus hoti hai. Actual cost weighted average hai. Purani untracked parts sales reports mein rehti hain; unki cost aur stock assume nahin kiye gaye.</p>`;
}
function openTradingForm(kind){
 action=kind;
 if(kind.startsWith('part-')&&kind!=='part-new'&&!state.partItems.length){toast('Pehle “Naya part” add karein.');return}
 const titles={cash:'Direct cash payment','part-new':'Naya gas part','part-buy':'Parts stock add karein','part-sale':'Part sale / stock minus'};
 document.getElementById('dialog-title').textContent=titles[kind];
 const partSelect=()=>select('Part','part',state.partItems.map(p=>[p.id,p.name]));
 let html='';
 if(kind==='cash')html=field('Sirf payment / raqam (Rs.)','amount','number','','min="0.01" step="0.01"')+`<details class="sale-options"><summary>Gas kg bhi record karein (optional)</summary><label class="field">Gas sold (kg)<input name="gasQty" type="number" min="0.01" step="0.01" placeholder="Optional"></label></details><p class="card-subtitle">Naam ki zaroorat nahin. Payment sales aur collections mein khud add hogi. Kg enter karne par Shop ka gas stock kam hoga.</p>`;
 if(kind==='part-new')html=field('Part ka naam','name','text','','maxlength="80"')+field('Opening quantity (pieces)','qty','number','0','min="0" step="1"')+field('Actual / purchase price per piece (Rs.)','cost','number','','min="0" step="0.01"')+field('Selling price per piece (Rs.)','rate','number','','min="0.01" step="0.01"');
 if(kind==='part-buy')html=partSelect()+field('Khareedi quantity (pieces)','qty','number','','min="1" step="1"')+field('Actual purchase price per piece (Rs.)','cost','number','','min="0" step="0.01"')+field('Selling price per piece (Rs.)','rate','number',state.partItems[0].sellingRate,'min="0.01" step="0.01"');
 if(kind==='part-sale')html=partSelect()+field('Sale quantity (pieces)','qty','number','1','min="1" step="1"')+field('Selling price per piece (Rs.)','rate','number',state.partItems[0].sellingRate,'min="0.01" step="0.01"')+'<p class="card-subtitle">Cash sale: total payment, stock minus aur gross profit automatic record honge.</p>';
 document.getElementById('form-fields').innerHTML=html;
 document.getElementById('form-error').textContent='';
 document.querySelector('.dialog-actions').style.display='flex';
 document.getElementById('entry-dialog').showModal();
}
function recordCash(amount,gasQty=0){
 if(!Number.isFinite(amount)||amount<=0)throw Error('Payment 0 se zyada honi chahiye.');
 if(!Number.isFinite(gasQty)||gasQty<0)throw Error('Gas kg sahi enter karein.');
 if(gasQty>locationStock('Shop'))throw Error('Shop mein itna gas available nahin hai.');
 const s={id:nextInvoice(),date:today(),createdAt:new Date().toISOString(),time:new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'}),customer:null,kind:'Gas',channel:'Retail',item:'Cash gas sale',qty:gasQty,rate:gasQty?amount/gasQty:0,amount:roundAmount(amount),paid:roundAmount(amount),directCash:true};
 state.sales.unshift(s);
}
function nextInvoice(){return String(Math.max(1048,...state.sales.map(s=>Number(s.id)))+1)}
function submitTrading(e){
 const before=structuredClone(state),f=Object.fromEntries(new FormData(e.target));
 try{
  if(action==='cash')recordCash(Number(f.amount),Number(f.gasQty||0));
  else{
   const qty=Number(f.qty),cost=Number(f.cost),rate=Number(f.rate);
   if(!Number.isInteger(qty)||qty<(action==='part-new'?0:1))throw Error('Quantity poore pieces mein enter karein.');
   if(!Number.isFinite(rate)||rate<=0)throw Error('Selling price 0 se zyada ho.');
   if(action!=='part-sale'&&(!Number.isFinite(cost)||cost<0))throw Error('Actual cost 0 ya zyada enter karein.');
   let p;
   if(action==='part-new'){
    const name=f.name.trim();if(!name)throw Error('Part ka naam likhein.');
    if(state.partItems.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw Error('Yeh part pehle se hai. Stock add karein.');
    p={id:crypto.randomUUID(),name,sellingRate:rate};state.partItems.push(p);
   }else{p=state.partItems.find(p=>p.id===f.part);if(!p)throw Error('Part select karein.')}
   const inv=partInventory(p.id),m={id:crypto.randomUUID(),part:p.id,qty,date:today(),createdAt:new Date().toISOString()};
   if(action==='part-sale'){
    if(qty>inv.qty)throw Error('Available stock se zyada sale nahin ho sakti.');
    const s={id:nextInvoice(),partId:p.id,costPerUnit:inv.average,customer:null,kind:'Parts',item:p.name,qty,rate,paid:roundAmount(qty*rate),channel:'Retail',date:today(),createdAt:m.createdAt,time:new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})};
    state.sales.unshift(s);Object.assign(m,{direction:'Out',cost:inv.average,rate,invoice:s.id});
   }else{p.sellingRate=rate;Object.assign(m,{direction:'In',cost})}
   if(qty)state.partMovements.push(m);
  }
  save();document.getElementById('entry-dialog').close();render();toast('Entry saved — totals updated');
 }catch(err){state=before;document.getElementById('form-error').textContent=err.message}
}
document.addEventListener('submit',e=>{
 if(e.target.id!=='quick-cash-form')return;e.preventDefault();
 const before=structuredClone(state);
 try{recordCash(Number(new FormData(e.target).get('amount')));save();render();document.querySelector('#quick-cash-form input').focus();toast('Payment saved')}catch(err){state=before;toast(err.message)}
});
document.addEventListener('click',e=>{const b=e.target.closest('[data-parts-view]');if(b){partsView=b.dataset.partsView;render()}});
document.addEventListener('change',e=>{if(e.target.name==='part'){const p=state.partItems.find(p=>p.id===e.target.value);if(p)document.getElementById('entry-form').elements.rate.value=p.sellingRate}});
render();
