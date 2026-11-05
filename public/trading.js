state.partItems ??= [];
state.partMovements ??= [];
state.invoiceSequence ??= Math.max(1048,...state.sales.map(s=>Number(s.id)||0));
let partsView='stock';
let cashDate=today();
function cashPage(){
 const rows=walkInRows(cashDate);
 return `<article class="card cash-entry"><div class="section-toolbar"><h2>Date-wise daily sale</h2><label class="field">Sale date<input id="cash-date" type="date" value="${esc(cashDate)}" max="${today()}" required></label></div><p class="selected-date">Entries and total: <strong>${esc(cashDate)}</strong></p><p>Enter the payment and press Enter. A customer name is not required.</p><form id="quick-cash-form"><label class="field">Payment amount (Rs.)<input name="amount" type="number" min="0.01" step="0.01" required placeholder="Example: 500" autofocus></label><label class="field">Price per KG (Rs., optional override)<input name="pricePerKg" type="number" min="0.01" step="0.01" value="${state.dailyRates[cashDate]?.perKg??''}" placeholder="Daily rate or customer rate"></label><label class="field">Actual gas KG (optional override)<input name="gasQty" type="number" min="0.001" step="0.001" placeholder="Calculated automatically on save"></label><label class="field">Description (optional)<input name="description" maxlength="150" placeholder="Optional"></label>${select('Payment method','method',['Cash','Bank transfer','Easypaisa / JazzCash'])}${field('Online transaction reference','reference','text','','maxlength="100"')}<output id="sale-gas-preview" class="sale-gas-preview">Enter amount and price to calculate KG</output><button type="submit" class="button primary">Save payment & calculate gas</button></form><p class="card-subtitle">Estimated retail-usable Shop gas: <strong>${gasNumber(retailUsableGas('Shop'))} kg</strong>. This records a paid gas sale, not a recovery of existing debt. Entered kg reduce shop gas stock automatically. Bank and wallet payments are excluded from total daily cash.</p></article><article class="card" style="margin-top:20px">${table(['TIME','SALE TYPE / QUANTITY','GAS KG','PRICE','DESCRIPTION','METHOD','RECEIVED',''],rows.map(s=>`<tr><td>${esc(s.time)}</td><td>${s.filledCylinderSale?s.filledCylinderSale.quantity+' × '+s.filledCylinderSale.capacity+' kg full gas':s.kind==='Parts'?s.qty+' pcs · '+esc(s.item||'Parts'):'Gas by KG'}</td><td>${s.kind==='Gas'?(s.qty>0?gasNumber(s.qty):'Not recorded'):'—'}</td><td>${s.filledCylinderSale?'Rs. '+money(s.filledCylinderSale.price)+' / cylinder':s.kind==='Parts'?'Rs. '+money(s.rate)+' / piece':s.qty>0?'Rs. '+money(s.quotedRate||s.rate)+' / kg':'—'}</td><td>${esc(s.description||s.item||'—')}</td><td>${esc(s.method||'Cash')}</td><td><strong>Rs. ${money(s.paid)}</strong></td><td><button class="card-link" data-invoice="${esc(s.id)}">Print receipt ↗</button></td></tr>`))}<div class="cash-day-total"><span>${esc(cashDate)} walk-in entries · ${rows.length} sales</span><strong id="cash-day-total">Rs. ${money(rows.reduce((a,s)=>a+s.paid,0))}</strong></div></article>`;
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
 return `<div class="section-toolbar"><input class="search" id="search" placeholder="Search parts…" value="${esc(query)}"><div><button class="button secondary" data-action="part-new">＋ New part</button> <button class="button secondary" data-action="part-buy">＋ Purchase stock</button> <button class="button primary" data-action="part-sale">− Sell parts</button></div></div><div class="parts-tabs"><button data-parts-view="stock" class="${partsView==='stock'?'selected':''}">Stock / quantity</button><button data-parts-view="prices" class="${partsView==='prices'?'selected':''}">Actual price & profit</button><button data-parts-view="history" class="${partsView==='history'?'selected':''}">Purchase / sale history</button></div><div class="stats">${stat('Parts stock value',money(state.partItems.reduce((a,p)=>a+partInventory(p.id).value,0)),'◫','Current stock at weighted-average cost')}${stat('Parts sales',money(stats.revenue),'↗','Sales from tracked parts')}${stat('Gross profit',money(roundAmount(stats.revenue-stats.cost)),'↗','Sale value − actual cost; expenses excluded')}</div><article class="card">${partsView==='history'?table(['DATE','PART','MOVEMENT','QUANTITY','COST / PIECE','SALE / PIECE'],state.partMovements.filter(m=>items.some(p=>p.id===m.part)).slice().reverse().map(m=>`<tr data-record-kind="Parts movement" data-record-key="${esc(m.id)}"><td>${esc(m.date)}</td><td><strong>${esc(state.partItems.find(p=>p.id===m.part)?.name)}</strong></td><td>${m.direction==='In'?'Stock add':'Sale / stock minus'}</td><td>${m.qty}</td><td>Rs. ${money(m.cost)}</td><td>${m.direction==='Out'?'Rs. '+money(m.rate):'—'}</td></tr>`)):partsView==='prices'?table(['PART','ACTUAL COST / PIECE','SELLING PRICE / PIECE','EXPECTED PROFIT / PIECE','REALIZED GROSS PROFIT'],items.map(p=>{const inv=partInventory(p.id),sold=state.sales.filter(s=>s.partId===p.id);return `<tr data-record-kind="Part" data-record-key="${esc(p.id)}"><td><strong>${esc(p.name)}</strong></td><td>${inv.qty?'Rs. '+money(inv.average):'No stock'}</td><td>Rs. ${money(p.sellingRate)}</td><td>${inv.qty?'Rs. '+money(roundAmount(p.sellingRate-inv.average)):'—'}</td><td>Rs. ${money(roundAmount(sold.reduce((a,s)=>a+total(s)-s.qty*s.costPerUnit,0)))}</td></tr>`})):table(['PART','AVAILABLE QUANTITY','PURCHASE COST / PIECE','SELLING PRICE / PIECE','STOCK VALUE'],items.map(p=>{const inv=partInventory(p.id);return `<tr data-record-kind="Part" data-record-key="${esc(p.id)}"><td><strong>${esc(p.name)}</strong></td><td><span class="badge ${inv.qty?'paid':'credit'}">${inv.qty} pcs</span></td><td>${inv.qty?'Rs. '+money(inv.average):'—'}</td><td>Rs. ${money(p.sellingRate)}</td><td>Rs. ${money(inv.value)}</td></tr>`}))}</article><p class="card-subtitle">Purchases increase stock and sales reduce it. Purchase cost uses a weighted average. Legacy untracked parts sales remain in reports without assumed costs or inventory quantities.</p>`;
}
function openTradingForm(kind){
 action=kind;
 if(kind.startsWith('part-')&&kind!=='part-new'&&!state.partItems.length){toast('Add a new part first.');return}
 const titles={cash:'Daily sale payment','part-new':'New gas part','part-buy':'Purchase parts stock','part-sale':'Sell parts'};
 document.getElementById('dialog-title').textContent=titles[kind];
 const partSelect=()=>select('Part','part',state.partItems.map(p=>[p.id,p.name]));
 let html='';
 if(kind==='cash')html=field('Sale date','saleDate','date',page==='Sales'&&salesView==='cash'?cashDate:today(),`max="${today()}"`)+field('Payment amount (Rs.)','amount','number','','min="0.01" step="0.01"')+`<label class="field">Price per KG (Rs., optional override)<input name="pricePerKg" type="number" min="0.01" step="0.01" value="${state.dailyRates[page==='Sales'?cashDate:today()]?.perKg??''}"></label><details class="sale-options"><summary>Actual gas weight (optional)</summary><label class="field">Gas sold (kg)<input name="gasQty" type="number" min="0.001" step="0.001" placeholder="Optional"></label></details>${field('Description (optional)','description','text','','maxlength="150"')}${select('Payment method','method',['Cash','Bank transfer','Easypaisa / JazzCash'])}${field('Online transaction reference','reference','text','','maxlength="100"')}<p class="card-subtitle">No customer name is required. Payment is included in sales and collections. Entered kilograms reduce shop gas inventory.</p>`;
 if(kind==='part-new')html=field('Part name','name','text','','maxlength="80"')+field('Opening quantity (pieces)','qty','number','0','min="0" step="1"')+field('Actual / purchase price per piece (Rs.)','cost','number','','min="0" step="0.01"')+field('Selling price per piece (Rs.)','rate','number','','min="0.01" step="0.01"');
 if(kind==='part-buy')html=partSelect()+field('Purchased quantity (pieces)','qty','number','','min="1" step="1"')+field('Actual purchase price per piece (Rs.)','cost','number','','min="0" step="0.01"')+field('Selling price per piece (Rs.)','rate','number',state.partItems[0].sellingRate,'min="0.01" step="0.01"');
 if(kind==='part-sale')html=partSelect()+field('Sale quantity (pieces)','qty','number','1','min="1" step="1"')+field('Selling price per piece (Rs.)','rate','number',state.partItems[0].sellingRate,'min="0.01" step="0.01"')+select('Payment method','method',['Cash','Bank transfer','Easypaisa / JazzCash'])+field('Online transaction reference','reference','text','','maxlength="100"')+'<p class="card-subtitle">Paid sale: payment, inventory deduction and gross profit are recorded automatically.</p>';
 document.getElementById('form-fields').innerHTML=html;
 document.getElementById('form-error').textContent='';
 document.querySelector('.dialog-actions').style.display='flex';
 document.getElementById('entry-dialog').showModal();
}
function recordCash(amount,gasQty=0,date=cashDate,method='Cash',description='',reference=''){
 if(!['Cash','Bank transfer','Easypaisa / JazzCash'].includes(method))throw Error('Select a valid payment method.');
 if(typeof description!=='string'||description.length>150)throw Error('Description must be 150 characters or fewer.');
 validateSaleDate(date);assertDateOpen(date);
 if(!Number.isFinite(amount)||amount<=0)throw Error('Payment must be greater than zero.');
 if(!Number.isFinite(gasQty)||gasQty<0)throw Error('Enter a valid gas weight.');
 if(gasQty>locationStock('Shop'))throw Error('The shop has insufficient gas stock.');
 const s={id:nextInvoice(),date,createdAt:new Date().toISOString(),time:new Date().toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit'}),customer:null,kind:'Gas',channel:'Retail',item:description.trim()||'Gas sale',description:description.trim(),reference:String(reference||'').trim(),method,qty:gasQty,rate:gasQty?amount/gasQty:0,amount:roundAmount(amount),paid:roundAmount(amount),directCash:true,saleBasis:'Per KG'};
 state.sales.unshift(s);
}
function nextInvoice(){state.invoiceSequence=Math.max(state.invoiceSequence||1048,1048,...state.sales.map(s=>Number(s.id)||0))+1;return String(state.invoiceSequence)}
function submitTrading(e){
 const before=structuredClone(state),f=Object.fromEntries(new FormData(e.target));
 try{
  if(action==='cash'){const rate=Number(f.pricePerKg||0),kg=f.gasQty?Number(f.gasQty):rate>0?roundKg(Number(f.amount)/rate):0;recordCash(Number(f.amount),kg,f.saleDate,f.method,f.description||'',f.reference||'');if(rate>0&&!f.gasQty)state.sales[0].quotedRate=rate;cashDate=f.saleDate;}
  else{
   assertDateOpen(today());
   const qty=Number(f.qty),cost=Number(f.cost),rate=Number(f.rate);
   if(!Number.isInteger(qty)||qty<(action==='part-new'?0:1))throw Error('Quantity must be a whole number of pieces.');
   if(!Number.isFinite(rate)||rate<=0)throw Error('Selling price must be greater than zero.');
   if(action!=='part-sale'&&(!Number.isFinite(cost)||cost<0))throw Error('Purchase cost cannot be negative.');
   let p;
   if(action==='part-new'){
    const name=f.name.trim();if(!name)throw Error('Enter a part name.');
    if(state.partItems.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw Error('This part already exists. Add a stock purchase instead.');
    p={id:crypto.randomUUID(),name,sellingRate:rate};state.partItems.push(p);
   }else{p=state.partItems.find(p=>p.id===f.part);if(!p)throw Error('Select a part.')}
   const inv=partInventory(p.id),m={id:crypto.randomUUID(),part:p.id,qty,date:today(),createdAt:new Date().toISOString()};
   if(action==='part-sale'){
    if(qty>inv.qty)throw Error('The sale quantity exceeds available stock.');
    const s={id:nextInvoice(),partId:p.id,costPerUnit:inv.average,customer:null,kind:'Parts',item:p.name,qty,rate,paid:roundAmount(qty*rate),channel:'Retail',method:f.method||'Cash',reference:f.reference||'',date:today(),createdAt:m.createdAt,time:new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})};
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
 try{const f=Object.fromEntries(new FormData(e.target));const rate=Number(f.pricePerKg||0),kg=f.gasQty?Number(f.gasQty):rate>0?roundKg(Number(f.amount)/rate):0;recordCash(Number(f.amount),kg,cashDate,f.method,f.description||'',f.reference||'');if(rate>0&&!f.gasQty)state.sales[0].quotedRate=rate;save();render();document.querySelector('#quick-cash-form input').focus();toast('Payment saved')}catch(err){state=before;toast(err.message)}
});
document.addEventListener('click',e=>{const b=e.target.closest('[data-parts-view]');if(b){partsView=b.dataset.partsView;render()}});
document.addEventListener('change',e=>{if(e.target.id==='cash-date'){try{validateSaleDate(e.target.value);cashDate=e.target.value;render()}catch(err){e.target.value=cashDate;toast(err.message)}}if(e.target.name==='part'&&e.target.closest('#entry-form')){const p=state.partItems.find(p=>p.id===e.target.value);if(p&&document.getElementById('entry-form').elements.rate)document.getElementById('entry-form').elements.rate.value=p.sellingRate}});

document.addEventListener('input',e=>{const f=e.target.closest('#quick-cash-form');if(!f)return;const amount=Number(f.elements.amount.value||0),rate=Number(f.elements.pricePerKg.value||0),kg=f.elements.gasQty.value?Number(f.elements.gasQty.value):rate>0?roundKg(amount/rate):0;document.getElementById('sale-gas-preview').textContent=kg>0?'Gas to record: '+gasNumber(kg)+' kg'+(f.elements.gasQty.value?' (actual override)':' (calculated)'):'Enter a price to calculate KG; a payment without weight stays unmeasured.';});
