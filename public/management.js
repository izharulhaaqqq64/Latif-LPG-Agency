state.creditEntries ??= [];
state.expenses ??= [];
let salesView='cash',bookCustomer='',reportsView='daily',reportDate=today(),expenseDate=today(),termsCustomer='';
function workspaceTabs(group,items,current){return `<div class="parts-tabs workspace-tabs">${items.map(([value,label])=>`<button data-workspace-tab="${group}:${value}" class="${value===current?'selected':''}">${label}</button>`).join('')}</div>`}
function salesPage(){
 const tabs=workspaceTabs('sales',[['cash','Daily cash sales'],['customer','Customer sales & invoices']],salesView);
 if(salesView==='cash')return tabs+cashPage();
 const match=s=>`${customer(s.customer)?.name||'Cash sale'} ${s.id} ${s.kind} ${s.channel} ${s.item||''}`.toLowerCase().includes(query.toLowerCase());
 return tabs+toolbar('sale','Customer sale')+`<article class="card">${salesTable(state.sales.filter(match))}</article>`;
}
function inventoryPage(){
 const match=s=>`${s.warehouse} ${s.note}`.toLowerCase().includes(query.toLowerCase());
 return cashStockWarning()+toolbar('stock','Gas arrival')+`<div class="stats">${['Main godown','Shop','Supply vehicle'].map(w=>stat(w,money(locationStock(w)),'▥','Available gas','kg')).join('')}${stat('Total gas',money(gasStock()),'◫','Across all locations','kg')}</div><article class="card">${table(['DATE','LOCATION','GAS RECEIVED','PURCHASE UNITS','PURCHASE COST','REFERENCE'],state.stock.filter(match).map(s=>`<tr><td>${esc(s.date)}</td><td><strong>${esc(s.warehouse)}</strong></td><td>${money(s.qty)} kg</td><td>${s.plantPurchase?gasNumber(s.plantPurchase.units):'—'}</td><td>${Number.isFinite(s.purchaseCost)?'Rs. '+money(s.purchaseCost):'—'}</td><td>${esc(s.note)}${s.plantPurchase?'<small>'+s.plantPurchase.lines.filter(l=>l.quantity).map(l=>l.quantity+' × '+l.capacity+' kg').join(' + ')+'</small>':''}</td></tr>`))}</article>`;
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
 return `<div class="section-toolbar book-toolbar"><label class="field">Customer statement<select id="ledger-customer"><option value="">All customers — combined ledger</option>${state.customers.map(c=>`<option value="${esc(c.id)}" ${bookCustomer===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><div class="ledger-actions"><button class="button secondary" data-action="customer">＋ Customer</button><button class="button secondary" data-action="credit-entry">＋ Credit entry</button><button class="button primary" data-action="receipt" id="ledger-collect">Collect payment</button><button class="button secondary" id="export-statement">CSV</button><button class="button secondary" data-action="print">Print</button></div></div>${c?`<div class="ledger-context"><span>Payment due: ${esc(c.paymentDueDate||'Not set')}</span><button class="card-link" data-customer-terms="${c.id}">Edit due date</button>${balance(c)>0?`<button class="card-link" data-reminder="${c.id}">Reminder draft</button>`:''}</div>`:''}<article class="card" id="ledger-table">${ledgerTable(bookCustomer)}</article>`;
}
function openManagementForm(kind){
 action=kind;let html='',title='';
 if(kind==='credit-entry'){
  title='Record customer credit';html=customers()+field('Entry date','date','date',today(),`max="${today()}"`)+field('Credit amount owed (Rs.)','amount','number','','min="0.01" step="0.01"')+field('Description / reference','note','text','','maxlength="150"')+`<label class="field">Account due date (optional)<input type="date" name="dueDate"></label><p class="card-subtitle">This increases the customer’s debt and posts to the ledger. It does not change gas stock or create another gas sale.</p>`;
 }
 if(kind==='customer-terms'){
  const c=customer(termsCustomer);title='Customer payment terms';html=`<p><strong>${esc(c.name)}</strong></p><label class="field">Account due date (optional)<input type="date" name="dueDate" value="${esc(c.paymentDueDate||'')}"></label><p class="card-subtitle">A reminder date for the current account balance. This does not change the money owed.</p>`;
 }
 if(kind==='expense'){
  title='Record operating expense';html=field('Expense date','date','date',expenseDate,`max="${today()}"`)+select('Category','category',['Transport','Rent','Wages','Utilities','Maintenance','Other'])+field('Amount paid (Rs.)','amount','number','','min="0.01" step="0.01"')+select('Payment method','method',['Cash','Bank transfer','Easypaisa / JazzCash'])+field('Description','note','text','','maxlength="150"');
 }
 document.getElementById('dialog-title').textContent=title;document.getElementById('form-fields').innerHTML=html;document.getElementById('form-error').textContent='';document.querySelector('.dialog-actions').style.display='flex';document.getElementById('entry-dialog').showModal();
}
function validDueDate(date){return !date||/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date}
function submitManagementForm(e){
 const before=structuredClone(state),f=Object.fromEntries(new FormData(e.target));
 try{
  if(action==='customer-terms'){
   if(!validDueDate(f.dueDate))throw Error('Select a valid due date.');const c=customer(termsCustomer);if(!c)throw Error('Customer not found.');c.paymentDueDate=f.dueDate;
  }else{
   validateSaleDate(f.date);assertDateOpen(f.date);const amount=roundAmount(Number(f.amount));if(!Number.isFinite(amount)||amount<=0)throw Error('The amount must be greater than zero.');if(!f.note.trim())throw Error('Enter a description.');
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
 return `<div class="section-toolbar"><label class="field">Expense date<input id="expense-date" type="date" max="${today()}" value="${expenseDate}"></label><button class="button primary" data-action="expense">＋ Operating expense</button></div><div class="stats">${stat('Expenses on selected date',money(expensesFor(expenseDate)),'↘',expenseDate)}${stat('Recorded expenses',state.expenses.filter(e=>e.date===expenseDate).length,'▤','All categories','')}</div><article class="card">${table(['DATE','CATEGORY','DESCRIPTION','METHOD','AMOUNT'],rows.map(e=>`<tr><td>${esc(e.date)}</td><td>${esc(e.category)}</td><td>${esc(e.note)}</td><td>${esc(e.method)}</td><td><strong>Rs. ${money(e.amount)}</strong></td></tr>`))}</article><p class="card-subtitle">Operating expenses are separate from gas and parts stock purchases. Collections after expenses is not a full bank or cash balance.</p>`;
}
function reportsPage(){return workspaceTabs('reports',[['daily','Daily report'],['monthly','Monthly closing']],reportsView)+(reportsView==='monthly'?monthlyPage():`<div class="section-toolbar"><input id="report-date" class="search" type="date" value="${reportDate}" max="${today()}"><button class="button secondary" data-action="export">↓ Export backup</button></div><div id="report-content">${report(reportDate)}</div>`)}
const baseDailyReport=report;
report=function(date){
 const received=state.sales.filter(s=>s.date===date).reduce((a,s)=>a+s.paid,0)+state.receipts.filter(r=>r.date===date).reduce((a,r)=>a+r.amount,0),spent=expensesFor(date);
 return baseDailyReport(date)+`<div class="stats" style="margin-top:20px">${stat('Operating expenses',money(spent),'↘','Recorded expenses on this date')}${stat('Collections after expenses',money(roundAmount(received-spent)),'▤','Collections minus operating expenses')}</div>`;
};
function weeklySalesChart(){
 const days=Array.from({length:7},(_,i)=>{const d=new Date(today()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-6+i);const date=d.toISOString().slice(0,10),sales=state.sales.filter(s=>s.date===date);return {date,label:d.toLocaleDateString('en-GB',{weekday:'short',timeZone:'UTC'}),gas:sales.filter(s=>s.kind==='Gas').reduce((a,s)=>a+total(s),0),parts:sales.filter(s=>s.kind==='Parts').reduce((a,s)=>a+total(s),0)}}),max=Math.max(1,...days.flatMap(d=>[d.gas,d.parts])),sum=days.reduce((a,d)=>a+d.gas+d.parts,0);
 return `<article class="card"><div class="card-heading"><div><h2>Sales in the last 7 days</h2><div class="card-subtitle">Based on saved sales, including initial demo records</div></div></div><div class="chart-summary"><strong><span class="currency">Rs.</span>${money(sum)}</strong><div class="chart-legend"><span><i class="legend-dot"></i>Gas</span><span><i class="legend-dot light"></i>Parts</span></div></div><div class="chart"><div class="chart-axis"><span>${money(max)}</span><span>${money(max/2)}</span><span>0</span></div><div class="chart-plot">${days.map(d=>`<div class="bar-group" title="${d.date}: gas Rs. ${money(d.gas)}, parts Rs. ${money(d.parts)}"><div class="bar" style="height:${d.gas/max*100}%"></div><div class="bar light" style="height:${d.parts/max*100}%"></div><label>${d.label}</label></div>`).join('')}</div></div><div class="chart-note">Today’s operating expenses: Rs. ${money(expensesFor(today()))}</div></article>`;
}
function downloadText(filename,text,type='text/plain'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csvValue(value){let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'}
function exportStatement(){
 let amount=0,cylinders=0;
 const rows=[['Date','Customer','Description','Debit','Credit','Balance','Cylinders out','Cylinders in','Cylinder balance'],...accountLedgerEntries(bookCustomer).map(r=>{amount=roundAmount(amount+r.debit-r.credit);cylinders+=r.out-r.inside;return [r.date,customer(r.customer)?.name||'Cash sale',r.label,r.debit,r.credit,amount,r.out,r.inside,cylinders]})];
 downloadText(`customer-statement-${today()}.csv`,rows.map(row=>row.map(csvValue).join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
let reminderText='';
document.addEventListener('click',e=>{
 const tab=e.target.closest('[data-workspace-tab]');if(tab){const [group,value]=tab.dataset.workspaceTab.split(':');if(group==='sales')salesView=value;if(group==='reports')reportsView=value;query='';render();}
 const collect=e.target.closest('#ledger-collect');if(collect&&bookCustomer){const c=customer(bookCustomer);const f=document.getElementById('entry-form');f.elements.customer.value=c.id;f.elements.amount.max=roundAmount(balance(c));}
 const terms=e.target.closest('[data-customer-terms]');if(terms){termsCustomer=terms.dataset.customerTerms;openForm('customer-terms');}
 const reminder=e.target.closest('[data-reminder]');if(reminder){const c=customer(reminder.dataset.reminder);reminderText=`Hello ${c.name}, your outstanding balance with Latif LPG Agency is Rs. ${money(roundAmount(balance(c)))}.${c.paymentDueDate?' Payment due date: '+c.paymentDueDate+'.':''} Cylinders outstanding: ${cylinderBreakdownText(c.id)}. Please contact us to arrange payment. Thank you.`;showDetail('Payment reminder draft',`<p class="card-subtitle">Review this message and share it yourself. Nothing has been sent.</p><textarea id="reminder-draft" readonly>${esc(reminderText)}</textarea><button type="button" class="button secondary" id="download-reminder">Download reminder</button>`);}
 if(e.target.closest('#download-reminder'))downloadText('payment-reminder.txt',reminderText);
 if(e.target.closest('#export-statement'))exportStatement();
});
document.addEventListener('change',e=>{
 if(e.target.id==='ledger-customer'){bookCustomer=e.target.value;render();}
 if(e.target.id==='report-date')reportDate=e.target.value;
 if(e.target.id==='expense-date'){try{validateSaleDate(e.target.value);expenseDate=e.target.value;render()}catch(err){e.target.value=expenseDate;toast(err.message)}}
});
