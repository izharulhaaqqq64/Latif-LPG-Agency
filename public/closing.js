state.monthClosings ??= {};
let closingMonth=today().slice(0,7);
function validateSaleDate(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Select a valid date.');
 if(date>today())throw Error('Future-dated entries are not allowed.');
}
function assertDateOpen(date){
 if(Object.keys(state.monthClosings||{}).some(month=>month>=date.slice(0,7)))throw Error('A monthly closing locks this date. Reopen the affected months before adding entries.');
 if(otherClosedPeriods().some(row=>date<row.end))throw Error('A daily or weekly closing locks this date. Reopen the affected periods before adding entries.');
}
function cylinderLabel(qty){return qty<0?`${Math.abs(qty)} unmatched returns`:`${qty} pcs`}
// Cylinder movements are separate ledger rows; linked invoices are never counted twice.
function accountLedgerEntries(id=''){
 const rows=ledgerEntries(id).map(r=>({...r,out:0,inside:0}));
 for(const c of state.cylinders.filter(c=>!id||c.customer===id))rows.push({recordType:'Cylinder movement',recordId:c.id,date:c.date,sort:c.createdAt||c.date+'Tzz-cylinder-'+c.id,customer:c.customer,label:`Cylinder ${c.direction==='Out'?'dispatch':'return'} · ${c.note||''} · ${capacityLabel(c.capacity)} · ${c.cylinderType||'Unspecified'}`,capacity:capacityKey(c.capacity),debit:0,credit:0,out:c.direction==='Out'?c.qty:0,inside:c.direction==='In'?c.qty:0});
 return rows.sort((a,b)=>a.date==='Opening'?-1:b.date==='Opening'?1:a.date.localeCompare(b.date)||a.sort.localeCompare(b.sort));
}
function ledgerTable(id=''){
 let rupees=0,cylinders=0;
 const c=customer(id);
 const summary=c?`<div class="account-summary"><div><span>${esc(c.name)} · customer statement</span><small id="account-last-purchase">Last purchase: ${esc(lastPurchaseDate(id)||'No recorded purchase')}${latestPurchase(id)?.time?' · '+esc(latestPurchase(id).time):''}</small></div><div><span>Cylinders held by customer</span><strong id="account-cylinders">${cylinderLabel(cylinderBalance(id))}</strong><small id="account-cylinder-sizes">${cylinderBreakdownText(id)}</small></div></div>`:'';
 return summary+table(['DATE','CUSTOMER / ENTRY','DEBIT','CREDIT','BALANCE Rs.','CYLINDERS DISPATCHED','RETURNED','CYLINDERS OUTSTANDING'],accountLedgerEntries(id).map(r=>{
  rupees=roundAmount(rupees+r.debit-r.credit);cylinders+=r.out-r.inside;
  return `<tr class="clickable-ledger-entry" tabindex="0" data-ledger-record-type="${esc(r.recordType)}" data-ledger-record-id="${esc(r.recordId)}" aria-label="Open ${esc(r.label)}"><td>${esc(r.date)}</td><td><strong>${esc(customer(r.customer)?.name||'Cash sale')}</strong><small><button type="button" class="card-link ledger-entry-link" data-ledger-record-type="${esc(r.recordType)}" data-ledger-record-id="${esc(r.recordId)}">${esc(r.label)} ↗</button></small>${r.invoiceId?'<button class="card-link" data-invoice="'+esc(r.invoiceId)+'">Receipt ↗</button>':r.receiptId?'<button class="card-link" data-payment-receipt="'+esc(r.receiptId)+'">Receipt ↗</button>':''}</td><td>Rs. ${money(r.debit)}</td><td>Rs. ${money(r.credit)}</td><td><strong>Rs. ${money(rupees)}</strong></td><td>${r.out}</td><td>${r.inside}</td><td><strong>${cylinderLabel(cylinders)}</strong></td></tr>`;
 }))+ledgerTotalsPanel(id);
};
function monthReport(month){const range=closingRange('monthly',month+'-01');const report=periodReport(range.start,range.end,month);return {...report,financialSummary:monthlyFinancialValues(report),profit:monthlyNetProfit(range.start,range.end)}}
function periodReport(start,end,label){
 const during=x=>x.date>=start&&x.date<end,before=x=>x.date<start;
 const sales=state.sales.filter(during),receipts=state.receipts.filter(during),cylinders=state.cylinders.filter(during);
 const sum=(rows,fn)=>roundAmount(rows.reduce((a,r)=>a+fn(r),0));
 const customers=state.customers.filter(c=>!c.date||c.date<end).map(c=>{
  const debts=(state.creditEntries||[]).filter(r=>r.customer===c.id);const ss=state.sales.filter(s=>s.customer===c.id),rr=state.receipts.filter(r=>r.customer===c.id),cc=state.cylinders.filter(x=>x.customer===c.id);
  const newOpening=c.date&&c.date>=start?c.opening:0;
  const opening=roundAmount((!c.date||c.date<start?c.opening:0)+sum(ss.filter(before),s=>total(s)-s.paid)-sum(rr.filter(before),r=>r.amount)+sum(debts.filter(before),r=>r.amount));
  const bills=roundAmount(sum(ss.filter(during),total)+sum(debts.filter(during),r=>r.amount)),received=roundAmount(sum(ss.filter(during),s=>s.paid)+sum(rr.filter(during),r=>r.amount));
  const cylOpening=sum(cc.filter(before),x=>x.direction==='Out'?x.qty:-x.qty),out=sum(cc.filter(during).filter(x=>x.direction==='Out'),x=>x.qty),inside=sum(cc.filter(during).filter(x=>x.direction==='In'),x=>x.qty);
  return {id:c.id,name:c.name,opening,newOpening,bills,received,closing:roundAmount(opening+newOpening+bills-received),cylOpening,out,inside,cylClosing:cylOpening+out-inside,cylBySize:cylinderPeriodSizes(cc,start,end)};
 });
 const cashReceipts=roundAmount(sum(sales.filter(s=>(s.method||'Cash')==='Cash'),s=>s.paid)+sum(receipts.filter(r=>(r.method||'Cash')==='Cash'),r=>r.amount)),cashExpenses=sum((state.expenses||[]).filter(during).filter(r=>(r.method||'Cash')==='Cash'),r=>r.amount);
 const gasOpening=roundAmount(sum(state.stock.filter(before),r=>r.qty)-sum(state.sales.filter(before).filter(s=>s.kind==='Gas'),s=>s.qty)),gasReceived=sum(state.stock.filter(during),r=>r.qty),gasSold=sum(sales.filter(s=>s.kind==='Gas'),s=>s.qty);
 return {month:label,start,end,cashReceipts,cashExpenses,cashSupplierPayments:supplierCashPaid(start,end),cashNet:roundAmount(cashReceipts-cashExpenses-supplierCashPaid(start,end)),gasOpening,gasReceived,gasClosing:roundAmount(gasOpening+gasReceived-gasSold),customers,expenses:sum((state.expenses||[]).filter(during),r=>r.amount),gasSales:sum(sales.filter(s=>s.kind==='Gas'),total),partsSales:sum(sales.filter(s=>s.kind==='Parts'),total),collections:roundAmount(sum(sales,s=>s.paid)+sum(receipts,r=>r.amount)),gasKg:sum(sales.filter(s=>s.kind==='Gas'),s=>s.qty),unmeasuredCash:sales.filter(s=>s.directCash&&!s.qty).length,partsProfit:sum(sales.filter(s=>s.partId),s=>total(s)-s.qty*s.costPerUnit),opening:sum(customers,c=>c.opening),closing:sum(customers,c=>c.closing),cylOut:sum(cylinders.filter(x=>x.direction==='Out'),x=>x.qty),cylIn:sum(cylinders.filter(x=>x.direction==='In'),x=>x.qty)};
}
function monthlyPage(){
 const saved=state.monthClosings[closingMonth],r=saved?.report||monthReport(closingMonth);
 return `<div class="section-toolbar"><label class="field">Select month<input id="closing-month" type="month" value="${closingMonth}" max="${today().slice(0,7)}"></label><div><button class="button secondary" data-action="print">Print</button> <button class="button ${saved?'secondary':'primary'}" id="${saved?'reopen-month':'close-month'}">${saved?'Reopen month':'Save monthly closing'}</button></div></div><div class="demo-banner">${saved?'Closing saved · '+esc(saved.savedAt)+' · New entries for this month are locked.':'Live monthly report. Saving the closing locks entries for this month.'} Outstanding money and cylinders carry forward automatically to the next month without duplicate entries.</div>${monthlyValueCards(r)}<div class="stats">${stat('Gas sales',money(r.gasSales),'↗',money(r.gasKg)+' kg recorded')}${stat('Parts sales',money(r.partsSales),'⚙','Tracked parts gross profit Rs. '+money(r.partsProfit))}${stat('Collections',money(r.collections),'↙','Sale payments + collections')}${stat('Customer closing dues',money(r.closing),'▤','Opening dues Rs. '+money(r.opening))}${stat('Operating expenses',money(r.expenses||0),'↘','Recorded operating costs')}</div><div class="account-summary"><div><span>Cylinders dispatched this month</span><strong>${r.cylOut} pcs</strong></div><div><span>Cylinders returned this month</span><strong>${r.cylIn} pcs</strong></div></div>${r.unmeasuredCash?`<div class="demo-banner">${r.unmeasuredCash} cash entries have no recorded weight; the gas weight total includes recorded quantities only.</div>`:''}<article class="card"><div class="card-heading table-top"><h2>Customer-wise monthly closing · ${closingMonth}</h2></div>${table(['CUSTOMER','OPENING Rs.','NEW OPENING Rs.','BILLS / CREDIT Rs.','RECEIVED Rs.','CLOSING Rs.','CYL OPEN','DISPATCHED','RETURNED','CYL CLOSE','CYLINDER SIZES'],r.customers.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${money(c.opening)}</td><td>${money(c.newOpening)}</td><td>${money(c.bills)}</td><td>${money(c.received)}</td><td><strong>${money(c.closing)}</strong></td><td>${cylinderLabel(c.cylOpening)}</td><td>${c.out}</td><td>${c.inside}</td><td><strong>${cylinderLabel(c.cylClosing)}</strong></td><td>${c.cylBySize?c.cylBySize.map(x=>capacityLabel(x.capacity)+': '+cylinderLabel(x.closing)).join('<br>'):'Old closing: size not recorded'}</td></tr>`))}</article>`;
}
document.addEventListener('change',e=>{
 if(e.target.id==='closing-month'){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)||e.target.value>today().slice(0,7)){e.target.value=closingMonth;toast('Select a valid month.');return}
  closingMonth=e.target.value;render();
 }
});
document.addEventListener('click',e=>{
 if(!e.target.closest('#close-month,#reopen-month'))return;
 const before=structuredClone(state);
 try{
  if(e.target.closest('#close-month'))state.monthClosings[closingMonth]={report:monthReport(closingMonth),savedAt:new Date().toLocaleString('en-PK',{timeZone:'Asia/Karachi'}),createdAt:new Date().toISOString()};
  else {ensureClosingCanReopen('monthly',closingMonth);if(Object.keys(state.monthClosings).some(month=>month>closingMonth))throw Error('Reopen later closed months first.');delete state.monthClosings[closingMonth];}
  save();render();toast(state.monthClosings[closingMonth]?'Monthly closing saved':'Month reopened');
 }catch(err){state=before;toast(err.message)}
});
