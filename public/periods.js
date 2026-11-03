state.periodClosings ??= {daily:{},weekly:{}};
state.periodClosings.daily ??= {};
state.periodClosings.weekly ??= {};
let dailyClosingDate=today(),weeklyClosingDate=today();
function closingRange(type,date){
 const startDate=new Date(date+'T00:00:00Z'),endDate=new Date(startDate);
 if(type==='daily')endDate.setUTCDate(endDate.getUTCDate()+1);
 else if(type==='weekly'){startDate.setUTCDate(startDate.getUTCDate()-(startDate.getUTCDay()+6)%7);endDate.setTime(startDate.getTime());endDate.setUTCDate(endDate.getUTCDate()+7)}
 else if(type==='monthly'){startDate.setUTCDate(1);endDate.setTime(startDate.getTime());endDate.setUTCMonth(endDate.getUTCMonth()+1)}
 else throw Error('Unknown closing period.');
 const last=new Date(endDate);last.setUTCDate(last.getUTCDate()-1);
 return {start:startDate.toISOString().slice(0,10),end:endDate.toISOString().slice(0,10),last:last.toISOString().slice(0,10)};
}
function otherClosedPeriods(){
 return ['daily','weekly'].flatMap(type=>Object.entries(state.periodClosings[type]).map(([key,snapshot])=>({type,key,end:snapshot.report.end,start:snapshot.report.start})));
}
function allClosedPeriods(){return [...otherClosedPeriods(),...Object.keys(state.monthClosings).map(key=>({type:'monthly',key,...closingRange('monthly',key+'-01')}))]}
function ensureClosingCanReopen(type,key){
 const current=allClosedPeriods().find(row=>row.type===type&&row.key===key);if(!current)return;
 if(allClosedPeriods().some(row=>row.end>current.end))throw Error('Reopen later dependent closings first, including daily, weekly and monthly snapshots.');
}
function periodClosingPage(type){
 const date=type==='daily'?dailyClosingDate:weeklyClosingDate,range=closingRange(type,date),saved=state.periodClosings[type][range.start],title=type==='daily'?'Daily':'Weekly';
 const report={...(saved?.report||periodReport(range.start,range.end,range.start+' to '+range.last)),periodTitle:title};
 return `<div class="section-toolbar"><label class="field">${title==='Weekly'?'Choose a date in the week (Monday–Sunday)':'Closing date'}<input type="date" id="${type}-closing-date" max="${today()}" value="${date}"></label><div><button class="button secondary" data-action="print">Print</button><button class="button ${saved?'secondary':'primary'}" data-period-action="${saved?'reopen':'save'}" data-period-type="${type}">${saved?'Reopen':'Save'} ${type} closing</button></div></div><div class="demo-banner">${title} closing: ${range.start} to ${range.last}. ${saved?'Saved snapshot · '+esc(saved.savedAt):'Live figures from recorded transactions.'} ${range.last>=today()?'This period may still be in progress. Saving locks entries through its end; reopen to add more.':''} Opening balances come from earlier records; no balance is posted twice.</div>${monthlyClosingFormulas(report)}<div class="stats">${stat('Period revenue',money(report.gasSales+report.partsSales),'↗','Gas + parts invoice amounts')}${stat('Collections',money(report.collections),'↙','All recorded payment methods')}${stat('Operating expenses',money(report.expenses),'↘','Recorded costs in this period')}${stat('Closing customer balance',money(report.closing),'▤','Opening + bills/credit − receipts')}</div><article class="card"><div class="card-heading table-top"><h2>${title} closing by customer</h2></div>${table(['CUSTOMER','OPENING Rs.','NEW OPENING Rs.','BILLS / CREDIT Rs.','RECEIVED Rs.','CLOSING Rs.','CYL OPEN','DISPATCHED','RETURNED','CYL CLOSE'],report.customers.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${money(c.opening)}</td><td>${money(c.newOpening)}</td><td>${money(c.bills)}</td><td>${money(c.received)}</td><td><strong>${money(c.closing)}</strong></td><td>${cylinderLabel(c.cylOpening)}</td><td>${c.out}</td><td>${c.inside}</td><td><strong>${cylinderLabel(c.cylClosing)}</strong></td></tr>`))}</article>`;
}
function periodRecordFormulas(r){
 const cash=Number.isFinite(r.cashReceipts)?`<div class="formula-row"><h3>Cash flow for this period</h3><p>Cash sale receipts + cash recoveries − cash expenses = net cash flow</p><strong id="period-cash-formula">Rs. ${money(r.cashReceipts)} − ${money(r.cashExpenses)} = ${money(r.cashNet)}</strong><small>Excludes bank/wallet payments and unrecorded inventory payments. This is cash movement, not a cash balance with opening cash.</small></div>`:'';
 const gas=Number.isFinite(r.gasOpening)?`<div class="formula-row"><h3>Recorded gas stock closing</h3><p>Opening gas + gas arrivals − recorded gas sold = closing gas</p><strong id="period-gas-formula">${money(r.gasOpening)} + ${money(r.gasReceived)} − ${money(r.gasKg)} = ${money(r.gasClosing)} kg</strong><small>Entries without measured kg cannot reduce stock. Only saved gas receipts and sales are used.</small></div>`:'';
 return cash+gas;
}
function ledgerValueTotals(id=''){
 const entries=ledgerEntries(id),debits=roundAmount(entries.reduce((a,r)=>a+r.debit,0)),received=roundAmount(entries.reduce((a,r)=>a+r.credit,0));
 return {debits,received,balance:roundAmount(debits-received)};
}
function ledgerTotalsPanel(id=''){
 const totals=ledgerValueTotals(id);
 return `<div class="ledger-value-totals" id="ledger-totals"><div><span>Total ledger value</span><strong id="ledger-total-value">Rs. ${money(totals.debits)}</strong><small>Opening balances + invoices + other credit</small></div><div><span>Total received</span><strong>Rs. ${money(totals.received)}</strong></div><div><span>Net outstanding balance</span><strong id="ledger-total-balance">Rs. ${money(totals.balance)}</strong><small>Customer credit offsets debt in the combined net balance.</small></div></div>`;
}
function clientCylinderTotals(){
 const bySize=Object.fromEntries([...CYLINDER_SIZES,'unknown'].map(size=>[size,0]));let unmatched=0;
 for(const c of state.customers)for(const size of Object.keys(bySize)){const qty=cylinderSizeBalance(c.id,size);bySize[size]+=Math.max(0,qty);unmatched+=Math.max(0,-qty)}
 return {total:Object.values(bySize).reduce((a,n)=>a+n,0),bySize,unmatched};
}
function clientCylinderSummary(){
 const totals=clientCylinderTotals();
 return `<article class="client-cylinder-total"><div><span>Total cylinders with clients</span><strong id="client-cylinder-count">${totals.total} pcs</strong><small>Positive outstanding balances for each customer and size; empty cylinders at the agency are separate.</small></div><p>${Object.entries(totals.bySize).filter(([,qty])=>qty).map(([size,qty])=>`${capacityLabel(size)}: ${qty}`).join(' · ')||'No recorded client-held cylinders'}${totals.unmatched?'<br>'+totals.unmatched+' unmatched legacy returns shown separately; not subtracted from other clients.':''}</p></article>`;
}
document.addEventListener('change',e=>{
 if(!['daily-closing-date','weekly-closing-date'].includes(e.target.id))return;
 try{validateSaleDate(e.target.value);if(e.target.id==='daily-closing-date')dailyClosingDate=e.target.value;else weeklyClosingDate=e.target.value;render()}catch(err){e.target.value=e.target.id==='daily-closing-date'?dailyClosingDate:weeklyClosingDate;toast(err.message)}
});
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-period-action]');if(!button)return;const type=button.dataset.periodType,range=closingRange(type,type==='daily'?dailyClosingDate:weeklyClosingDate),before=structuredClone(state);
 try{
  if(button.dataset.periodAction==='save')state.periodClosings[type][range.start]={report:periodReport(range.start,range.end,range.start+' to '+range.last),savedAt:new Date().toLocaleString('en-PK',{timeZone:'Asia/Karachi'}),createdAt:new Date().toISOString()};
  else{ensureClosingCanReopen(type,range.start);delete state.periodClosings[type][range.start]}
  save();render();toast(button.dataset.periodAction==='save'?'Closing saved. Period entries are locked.':'Closing reopened.');
 }catch(err){state=before;toast(err.message)}
});
render();
