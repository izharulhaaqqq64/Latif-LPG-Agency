state.creditEntries ??= [];
state.expenses ??= [];
let salesView='cash',bookCustomer='',reportsView='daily',reportDate=today(),expenseDate=today(),termsCustomer='';
function workspaceTabs(group,items,current){return `<div class="parts-tabs workspace-tabs">${items.map(([value,label])=>`<button data-workspace-tab="${group}:${value}" class="${value===current?'selected':''}">${label}</button>`).join('')}</div>`}
function salesPage(){
 const tabs=workspaceTabs('sales',[['cash','Daily sales'],['customer','Customer sales & invoices'],['cylinders','Sold cylinders']],salesView);
 if(salesView==='cash')return tabs+cashPage();if(salesView==='cylinders')return tabs+soldCylindersPage();
 const match=s=>`${customer(s.customer)?.name||'Cash sale'} ${s.id} ${s.kind} ${s.channel} ${s.item||''}`.toLowerCase().includes(query.toLowerCase());
 return tabs+toolbar('sale','Customer sale')+`<article class="card">${salesTable(state.sales.filter(match))}</article>`;
}
function inventoryPage(){
 const match=s=>`${s.date} ${s.warehouse} ${s.note} ${(s.plantPurchase?.lines||[]).map(l=>l.capacity+' kg '+l.quantity).join(' ')} ${s.qty}`.toLowerCase().includes(query.toLowerCase());
 const legacyStock=fullCylinderStock('45.4');const legacy=legacyStock.known||state.fullCylinderMovements.some(m=>m.capacity==='45.4')?`<details class="simple-details"><summary>Legacy 45.4 kg stock (kept separate)</summary><p>${legacyStock.known?legacyStock.qty+' full cylinders':"Physical count not set"} · existing receipts and movements remain unchanged.</p></details>`:'';
 return cashStockWarning()+legacy+toolbar('gas-cylinder-receipt','Add cylinders')+`<div class="stats">${FULL_STOCK_SIZES.map(size=>{const stock=fullCylinderStock(size);return stat(size+' kg cylinders',stock.known?stock.qty:'Not set','♧',stock.known?money(stock.qty*Number(size))+' kg nominal capacity':'Set a physical stock count first','pcs')}).join('')}${stat('Recorded gas weight',gasNumber(gasStock()),'◫','Measured kg including weight-only receipts','kg')}</div><div class="section-toolbar"><button class="button primary" data-action="filled-stock">Update cylinder counts</button><button class="button secondary" id="show-stock-residue">Wastage & residual</button><button class="button secondary" data-action="stock">Add kg receipt</button><button class="button secondary" data-page="Supplier credit">Buy gas on credit</button></div><article class="card" id="gas-receipts">${table(['DATE','CYLINDER BREAKDOWN','GAS RECEIVED','PURCHASE COST','REFERENCE',''],state.stock.filter(match).map(s=>`<tr><td>${esc(s.date)}</td><td>${s.plantPurchase?s.plantPurchase.lines.filter(l=>l.quantity).map(l=>l.quantity+' × '+l.capacity+' kg').join('<br>'):'Weight-only receipt'}</td><td>${money(s.qty)} kg</td><td>${Number.isFinite(s.purchaseCost)?'Rs. '+money(s.purchaseCost):'Not recorded'}</td><td>${esc(s.note)}<small>${esc(s.warehouse)}</small></td><td><button class="card-link" data-open-gas-receipt="${esc(s.id)}">Open ↗</button></td></tr>`))}</article>`;
}
function lastPurchaseDate(id){return state.sales.filter(s=>s.customer===id).reduce((latest,s)=>s.date>latest?s.date:latest,'')}
function purchaseTimestamp(s){
 if(s.createdAt&&Number.isFinite(Date.parse(s.createdAt))&&new Date(s.createdAt).toLocaleDateString('en-CA',{timeZone:'Asia/Karachi'})===s.date)return Date.parse(s.createdAt);
 const match=String(s.time||'').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
 if(!match)return null;
 let hour=Number(match[1]),minute=Number(match[2]);if(minute>59||hour>(match[3]?12:23)||match[3]&&hour<1)return null;
 if(match[3])hour=hour%12+(match[3].toUpperCase()==='PM'?12:0);
 const timestamp=Date.parse(s.date+'T'+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+':00+05:00');return Number.isFinite(timestamp)?timestamp:null;
}
function latestPurchase(id){return state.sales.filter(s=>s.customer===id).slice().sort((a,b)=>b.date.localeCompare(a.date)||((purchaseTimestamp(b)||0)-(purchaseTimestamp(a)||0))||Number(b.id)-Number(a.id))[0]}
function purchaseAge(id,now=Date.now()){
 const sale=latestPurchase(id);if(!sale)return 'No recorded purchase';const timestamp=purchaseTimestamp(sale);
 if(timestamp===null){const date=new Date(now).toLocaleDateString('en-CA',{timeZone:'Asia/Karachi'}),days=Math.round((Date.parse(date)-Date.parse(sale.date))/86400000);return days===0?'Today (time not recorded)':days>0?days+' day'+(days===1?'':'s')+' ago (time not recorded)':'Purchase date is in the future';}
 const elapsed=now-timestamp;if(elapsed<0)return 'Recorded purchase time is in the future';const minutes=Math.floor(elapsed/60000),hours=Math.floor(minutes/60),days=Math.floor(hours/24);
 if(!minutes)return 'Just now';if(!hours)return minutes+' min ago';if(!days)return hours+' hr '+minutes%60+' min ago';return days+' day'+(days===1?'':'s')+' '+hours%24+' hr ago';
}
function updatePurchaseAge(){const el=document.getElementById('account-purchase-age');if(el&&bookCustomer)el.textContent='Time since last purchase: '+purchaseAge(bookCustomer)}
setInterval(updatePurchaseAge,60000);
function ledgerWorkspacePage(){
 const c=customer(bookCustomer);
 return `${combinedLedgerPanel()}${ledgerReminderBanner(c)}<div class="section-toolbar book-toolbar"><label class="field">Customer statement<select id="ledger-customer"><option value="">All customers — combined ledger</option>${state.customers.map(c=>`<option value="${esc(c.id)}" ${bookCustomer===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><div class="ledger-actions"><button class="button secondary" data-action="customer">＋ Customer</button><button class="button secondary" data-action="credit-entry">＋ Debit · customer owes</button><button class="button primary" data-action="receipt" id="ledger-collect">＋ Credit · payment received</button><button class="button secondary" id="export-statement">CSV</button><button class="button secondary" data-action="print">Print</button></div></div>${c?`<div class="ledger-context"><span>Mobile: ${esc(c.phone||'Not entered')} · Address: ${esc(c.address||'Not entered')}</span><span class="purchase-age-badge" id="account-purchase-age">Time since last purchase: ${esc(purchaseAge(c.id))}</span><span>Payment due: ${esc(c.paymentDueDate||'Not set')}</span><button class="card-link" data-customer-terms="${c.id}">Edit contact / due date</button></div>`:''}${c?paymentReminderHistory(c.id):''}<article class="card" id="ledger-table">${ledgerTable(bookCustomer)}</article>`;
}
function openManagementForm(kind){
 action=kind;let html='',title='';
 if(kind==='credit-entry'){
  title='Direct debit · customer owes';html=customers()+field('Entry date','date','date',today(),`max="${today()}"`)+field('Debit amount owed (Rs.)','amount','number','','min="0.01" step="0.01"')+field('Description / reference','note','text','','maxlength="150"')+`<label class="field">Account due date (optional)<input type="date" name="dueDate"></label><p class="card-subtitle">This increases the customer’s debt and posts to the ledger. It does not change gas stock or create another gas sale.</p>`;
 }
 if(kind==='customer-terms'){
  const c=customer(termsCustomer);title='Customer contact & payment terms';html=field('Mobile number (optional)','phone','tel',c.phone||'','maxlength="25"')+field('Address (optional)','address','text',c.address||'','maxlength="200"')+`<p><strong>${esc(c.name)}</strong></p><label class="field">Account due date (optional)<input type="date" name="dueDate" value="${esc(c.paymentDueDate||'')}"></label><p class="card-subtitle">A reminder date for the current account balance. This does not change the money owed.</p>`;
 }
 if(kind==='expense'){
  title='Record operating expense';html=field('Expense date','date','date',expenseDate,`max="${today()}"`)+select('Category','category',['Transport','Rent','Wages','Utilities','Maintenance','Other'])+field('Amount paid (Rs.)','amount','number','','min="0.01" step="0.01"')+select('Payment method','method',['Cash','Bank transfer','Easypaisa / JazzCash'])+field('Description','note','text','','maxlength="150"');
 }
 document.getElementById('dialog-title').textContent=title;document.getElementById('form-fields').innerHTML=html;document.getElementById('form-error').textContent='';document.querySelector('.dialog-actions').style.display='flex';document.getElementById('entry-dialog').showModal();if(kind==='credit-entry'&&bookCustomer)document.getElementById('entry-form').elements.customer.value=bookCustomer;
}
function validDueDate(date){return !date||/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date}
function submitManagementForm(e){
 const before=structuredClone(state),f=Object.fromEntries(new FormData(e.target));
 try{
  if(action==='customer-terms'){
   if(!validDueDate(f.dueDate))throw Error('Select a valid due date.');const c=customer(termsCustomer);if(!c)throw Error('Customer not found.');c.paymentDueDate=f.dueDate;c.phone=(f.phone||'').trim();c.address=(f.address||'').trim();
  }else{
   validateSaleDate(f.date);assertDateOpen(f.date);const amount=roundAmount(Number(f.amount));if(!Number.isFinite(amount)||amount<=0)throw Error('The amount must be greater than zero.');
   const row={id:crypto.randomUUID(),date:f.date,createdAt:new Date().toISOString(),amount,note:f.note.trim()};
   if(action==='credit-entry'){
    const c=customer(f.customer);if(!c)throw Error('Select a customer.');if(!validDueDate(f.dueDate)||f.dueDate&&f.dueDate<f.date)throw Error('The due date cannot be earlier than the entry date.');row.customer=c.id;bookCustomer=c.id;state.creditEntries.push(row);if(f.dueDate)c.paymentDueDate=f.dueDate;
   }else{row.category=f.category;row.method=f.method;state.expenses.unshift(row);expenseDate=f.date;}
  }
  save();document.getElementById('entry-dialog').close();render();toast('Entry saved. Account and reports updated.');
 }catch(err){state=before;document.getElementById('form-error').textContent=err.message}
}
function expensesFor(date){return state.expenses.filter(e=>e.date===date).reduce((a,e)=>a+e.amount,0)}
function expensesPage(){
 const rows=state.expenses.filter(e=>e.date===expenseDate&&`${e.category} ${e.note}`.toLowerCase().includes(query.toLowerCase()));
 return `<div class="section-toolbar"><label class="field">Expense date<input id="expense-date" type="date" max="${today()}" value="${expenseDate}"></label><button class="button primary" data-action="expense">＋ Operating expense</button></div><div class="stats">${stat('Expenses on selected date',money(expensesFor(expenseDate)),'↘',expenseDate)}${stat('Recorded expenses',state.expenses.filter(e=>e.date===expenseDate).length,'▤','All categories','')}</div><article class="card">${table(['DATE','CATEGORY','DESCRIPTION','METHOD','AMOUNT'],rows.map(e=>`<tr data-record-kind="Expense" data-record-key="${esc(e.id)}"><td>${esc(e.date)}</td><td>${esc(e.category)}</td><td>${esc(e.note)}</td><td>${esc(e.method)}</td><td><strong>Rs. ${money(e.amount)}</strong></td></tr>`))}</article><p class="card-subtitle">Operating expenses are separate from gas and parts stock purchases. Collections after expenses is not a full bank or cash balance.</p>`;
}
function reportsPage(){return workspaceTabs('reports',[['daily','Daily report'],['day-close','Daily closing'],['week-close','Weekly closing'],['monthly','Monthly closing']],reportsView)+(reportsView==='monthly'?monthlyPage():reportsView==='day-close'?periodClosingPage('daily'):reportsView==='week-close'?periodClosingPage('weekly'):`<div class="section-toolbar"><input id="report-date" class="search" type="date" value="${reportDate}" max="${today()}"><button class="button secondary" data-action="export">↓ Export backup</button></div><div id="report-content">${report(reportDate)}</div>`)}
const baseDailyReport=report;
report=function(date){
 const received=state.sales.filter(s=>s.date===date).reduce((a,s)=>a+s.paid,0)+state.receipts.filter(r=>r.date===date).reduce((a,r)=>a+r.amount,0),spent=expensesFor(date);
 return baseDailyReport(date)+`<div class="stats" style="margin-top:20px">${stat('Operating expenses',money(spent),'↘','Recorded expenses on this date')}${stat('Collections after expenses',money(roundAmount(received-spent)),'▤','Collections minus operating expenses')}</div>`;
};
function downloadText(filename,text,type='text/plain'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csvValue(value){let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'}
function exportStatement(){
 let amount=0,cylinders=0;
 const rows=[['Date','Customer','Description','Debit','Credit','Balance','Cylinders out','Cylinders in','Cylinder balance'],...accountLedgerEntries(bookCustomer).map(r=>{amount=roundAmount(amount+r.debit-r.credit);cylinders+=r.out-r.inside;return [r.date,customer(r.customer)?.name||'Cash sale',r.label,r.debit,r.credit,amount,r.out,r.inside,cylinders]})];
 const totals=ledgerValueTotals(bookCustomer);rows.push(['TOTAL','','Opening + invoices + other credit',totals.debits,totals.received,totals.balance,'','',cylinders]);
 downloadText(`customer-statement-${today()}.csv`,rows.map(row=>row.map(csvValue).join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
let reminderText='';
document.addEventListener('click',e=>{
 const tab=e.target.closest('[data-workspace-tab]');if(tab){const [group,value]=tab.dataset.workspaceTab.split(':');if(group==='sales')salesView=value;if(group==='reports')reportsView=value;if(group==='suppliers')supplierView=value;query='';render();}
 const collect=e.target.closest('#ledger-collect');if(collect&&bookCustomer){const c=customer(bookCustomer);const f=document.getElementById('entry-form');f.elements.customer.value=c.id;f.elements.amount.max=roundAmount(balance(c));}
 const terms=e.target.closest('[data-customer-terms]');if(terms){termsCustomer=terms.dataset.customerTerms;openForm('customer-terms');}
 const reminder=e.target.closest('[data-reminder]');if(reminder)openWhatsAppReminder(reminder.dataset.reminder);
 if(e.target.closest('#download-reminder'))downloadText('payment-reminder.txt',reminderText);
 if(e.target.closest('#export-statement'))exportStatement();
});
document.addEventListener('change',e=>{
 if(e.target.id==='ledger-customer'){bookCustomer=e.target.value;render();}
 if(e.target.id==='report-date')reportDate=e.target.value;
 if(e.target.id==='expense-date'){try{validateSaleDate(e.target.value);expenseDate=e.target.value;render()}catch(err){e.target.value=expenseDate;toast(err.message)}}
});
