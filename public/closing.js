state.monthClosings ??= {};
let closingMonth=today().slice(0,7);
function validateSaleDate(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Sahi date select karein.');
 if(date>today())throw Error('Future ki sale abhi enter nahin kar sakte.');
}
function assertDateOpen(date){
 if(Object.keys(state.monthClosings||{}).some(month=>month>=date.slice(0,7)))throw Error('Is date ya is ke baad monthly closing save hai. Pehle related months reopen karein.');
}
function cylinderLabel(qty){return qty<0?`${Math.abs(qty)} unmatched returns`:`${qty} pcs`}
function customerAccountRows(){
 return table(['CUSTOMER','RUPAY BAQI','CYLINDERS BAQI','KHATA'],state.customers.map(c=>`<tr><td>${customerCell(c.id)}</td><td><strong>Rs. ${money(roundAmount(balance(c)))}</strong></td><td><strong>${cylinderLabel(cylinderBalance(c.id))}</strong></td><td><button class="card-link" data-ledger="${esc(c.id)}">Rupay + cylinders ↗</button></td></tr>`));
}
// Cylinder movements are separate ledger rows; linked invoices are never counted twice.
function accountLedgerEntries(id=''){
 const rows=ledgerEntries(id).map(r=>({...r,out:0,inside:0}));
 for(const c of state.cylinders.filter(c=>!id||c.customer===id))rows.push({date:c.date,sort:c.createdAt||c.date+'Tzz-cylinder-'+c.id,customer:c.customer,label:`Cylinder ${c.direction==='Out'?'diye / rawangi':'wapas / aamad'} · ${c.note||''}`,debit:0,credit:0,out:c.direction==='Out'?c.qty:0,inside:c.direction==='In'?c.qty:0});
 return rows.sort((a,b)=>a.date==='Opening'?-1:b.date==='Opening'?1:a.date.localeCompare(b.date)||a.sort.localeCompare(b.sort));
}
ledgerTable=function(id=''){
 let rupees=0,cylinders=0;
 const c=customer(id);
 const summary=c?`<div class="account-summary"><div><span>${esc(c.name)} · rupay baqi</span><strong id="account-money">Rs. ${money(roundAmount(balance(c)))}</strong></div><div><span>Customer ke paas cylinders</span><strong id="account-cylinders">${cylinderLabel(cylinderBalance(id))}</strong></div></div>`:'';
 return summary+table(['DATE','CUSTOMER / ENTRY','BILL','WASOOL','RUPAY BAQI','CYLINDER DIYE','WAPAS','CYLINDER BAQI'],accountLedgerEntries(id).map(r=>{
  rupees=roundAmount(rupees+r.debit-r.credit);cylinders+=r.out-r.inside;
  return `<tr><td>${esc(r.date)}</td><td><strong>${esc(customer(r.customer)?.name||'Cash sale')}</strong><small>${esc(r.label)}</small></td><td>Rs. ${money(r.debit)}</td><td>Rs. ${money(r.credit)}</td><td><strong>Rs. ${money(rupees)}</strong></td><td>${r.out}</td><td>${r.inside}</td><td><strong>${cylinderLabel(cylinders)}</strong></td></tr>`;
 }));
};
const oldLedgerPage=ledgerPage;
ledgerPage=function(){return oldLedgerPage()+`<article class="card" style="margin-top:22px"><div class="card-heading table-top"><h2>Har customer: rupay aur cylinders ek saath</h2></div>${customerAccountRows()}</article>`};
function monthReport(month){
 const start=month+'-01',next=new Date(month+'-01T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);const end=next.toISOString().slice(0,10);
 const during=x=>x.date>=start&&x.date<end,before=x=>x.date<start;
 const sales=state.sales.filter(during),receipts=state.receipts.filter(during),cylinders=state.cylinders.filter(during);
 const sum=(rows,fn)=>roundAmount(rows.reduce((a,r)=>a+fn(r),0));
 const customers=state.customers.filter(c=>!c.date||c.date<end).map(c=>{
  const ss=state.sales.filter(s=>s.customer===c.id),rr=state.receipts.filter(r=>r.customer===c.id),cc=state.cylinders.filter(x=>x.customer===c.id);
  const newOpening=c.date&&c.date>=start?c.opening:0;
  const opening=roundAmount((!c.date||c.date<start?c.opening:0)+sum(ss.filter(before),s=>total(s)-s.paid)-sum(rr.filter(before),r=>r.amount));
  const bills=sum(ss.filter(during),total),received=roundAmount(sum(ss.filter(during),s=>s.paid)+sum(rr.filter(during),r=>r.amount));
  const cylOpening=sum(cc.filter(before),x=>x.direction==='Out'?x.qty:-x.qty),out=sum(cc.filter(during).filter(x=>x.direction==='Out'),x=>x.qty),inside=sum(cc.filter(during).filter(x=>x.direction==='In'),x=>x.qty);
  return {id:c.id,name:c.name,opening,newOpening,bills,received,closing:roundAmount(opening+newOpening+bills-received),cylOpening,out,inside,cylClosing:cylOpening+out-inside};
 });
 return {month,customers,gasSales:sum(sales.filter(s=>s.kind==='Gas'),total),partsSales:sum(sales.filter(s=>s.kind==='Parts'),total),collections:roundAmount(sum(sales,s=>s.paid)+sum(receipts,r=>r.amount)),gasKg:sum(sales.filter(s=>s.kind==='Gas'),s=>s.qty),unmeasuredCash:sales.filter(s=>s.directCash&&!s.qty).length,partsProfit:sum(sales.filter(s=>s.partId),s=>total(s)-s.qty*s.costPerUnit),opening:sum(customers,c=>c.opening),closing:sum(customers,c=>c.closing),cylOut:sum(cylinders.filter(x=>x.direction==='Out'),x=>x.qty),cylIn:sum(cylinders.filter(x=>x.direction==='In'),x=>x.qty)};
}
function monthlyPage(){
 const saved=state.monthClosings[closingMonth],r=saved?.report||monthReport(closingMonth);
 return `<div class="section-toolbar"><label class="field">Mahina select karein<input id="closing-month" type="month" value="${closingMonth}" max="${today().slice(0,7)}"></label><div><button class="button secondary" data-action="print">Print</button> <button class="button ${saved?'secondary':'primary'}" id="${saved?'reopen-month':'close-month'}">${saved?'Reopen month':'Save monthly closing'}</button></div></div><div class="demo-banner">${saved?'Closing saved · '+esc(saved.savedAt)+' · Is mahine ki nayi entries locked hain.':'Live monthly hisab. Closing save karne par is mahine ki entries lock hongi.'} Baqi rupay aur cylinders aglay mahine ki opening mein khud aayenge; double entry nahin hogi.</div><div class="stats">${stat('Gas sales',money(r.gasSales),'↗',money(r.gasKg)+' kg recorded')}${stat('Parts sales',money(r.partsSales),'⚙','Tracked parts gross profit Rs. '+money(r.partsProfit))}${stat('Collections',money(r.collections),'↙','Sale payments + wasooli')}${stat('Customer closing dues',money(r.closing),'▤','Opening dues Rs. '+money(r.opening))}</div><div class="account-summary"><div><span>Is mahine cylinders diye</span><strong>${r.cylOut} pcs</strong></div><div><span>Is mahine cylinders wapas</span><strong>${r.cylIn} pcs</strong></div></div>${r.unmeasuredCash?`<div class="demo-banner">${r.unmeasuredCash} cash entries kg ke baghair hain; gas kg total sirf recorded quantity hai.</div>`:''}<article class="card"><div class="card-heading table-top"><h2>Customer-wise monthly closing · ${closingMonth}</h2></div>${table(['CUSTOMER','OPENING Rs.','NEW OPENING Rs.','BILLS Rs.','WASOOL Rs.','CLOSING Rs.','CYL OPEN','DIYE','WAPAS','CYL CLOSE'],r.customers.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${money(c.opening)}</td><td>${money(c.newOpening)}</td><td>${money(c.bills)}</td><td>${money(c.received)}</td><td><strong>${money(c.closing)}</strong></td><td>${cylinderLabel(c.cylOpening)}</td><td>${c.out}</td><td>${c.inside}</td><td><strong>${cylinderLabel(c.cylClosing)}</strong></td></tr>`))}</article>`;
}
document.addEventListener('change',e=>{
 if(e.target.id==='closing-month'){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)||e.target.value>today().slice(0,7)){e.target.value=closingMonth;toast('Sahi mahina select karein.');return}
  closingMonth=e.target.value;render();
 }
});
document.addEventListener('click',e=>{
 if(!e.target.closest('#close-month,#reopen-month'))return;
 const before=structuredClone(state);
 try{
  if(e.target.closest('#close-month'))state.monthClosings[closingMonth]={report:monthReport(closingMonth),savedAt:new Date().toLocaleString('en-PK',{timeZone:'Asia/Karachi'}),createdAt:new Date().toISOString()};
  else {if(Object.keys(state.monthClosings).some(month=>month>closingMonth))throw Error('Pehle baad walay closed months reopen karein.');delete state.monthClosings[closingMonth];}
  save();render();toast(state.monthClosings[closingMonth]?'Monthly closing saved':'Month reopened');
 }catch(err){state=before;toast(err.message)}
});
render();
