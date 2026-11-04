// One index for saved records; search never changes business data.
navItems.splice(2,0,['Invoices','▥'],['Receipts','▤']);
descriptions.Invoices='All customer sales invoices, gas sales and empty-cylinder sales.';
descriptions.Receipts='Find saved sales and payments, view receipts and print or save as PDF.';
function businessRecords(){
 const records=[];
 const add=(type,rows,describe,amount)=>rows.forEach(row=>records.push({type,id:row.id,date:row.date||'',row,text:describe(row),amount:amount?amount(row):null}));
 const client=r=>customer(r.customer)?.name||'Cash customer';
 const supplier=r=>state.suppliers.find(s=>s.id===r.supplier)?.name||'';
 add('Sale',state.sales,r=>`${client(r)} ${r.item||'LPG gas'} ${r.kind} ${r.channel} ${r.description||''} ${r.method||'Cash'} ${r.cylinderSale?.capacity||''}`,total);
 add('Customer payment',state.receipts,r=>`${client(r)} ${r.method} ${r.note||''}`,r=>r.amount);
 add('Gas receipt',state.stock,r=>`${r.warehouse} ${r.qty} kg ${r.note||''} ${(r.plantPurchase?.lines||[]).map(l=>l.capacity+' kg').join(' ')}`,r=>r.purchaseCost);
 add('Supplier purchase',state.supplierPurchases,r=>`${supplier(r)} ${r.kind} ${r.reference||''} ${r.capacity||''}`,r=>r.total);
 add('Supplier payment',state.supplierPayments,r=>`${supplier(r)} ${r.method} ${r.note||''}`,r=>r.amount);
 add('Customer',state.customers,r=>`${r.name} ${r.phone||''} ${r.address||''} ${r.type||''}`);
 add('Supplier',state.suppliers,r=>`${r.name} ${r.phone||''}`);
 add('Expense',state.expenses,r=>`${r.category} ${r.note||''} ${r.method}`,r=>r.amount);
 add('Cylinder movement',state.cylinders,r=>`${client(r)} ${r.direction} ${r.cylinderType||'Unspecified'} ${r.qty} cylinders ${r.capacity||''} kg ${r.note||''}`);
 add('Part',state.partItems,r=>`${r.name} ${r.sku||''}`);
 add('Parts movement',state.partMovements,r=>`${state.partItems.find(p=>p.id===r.part)?.name||''} ${r.direction} ${r.qty} ${r.note||''}`);
 add('WhatsApp reminder',state.paymentReminders,r=>`${client(r)} ${r.phone} ${r.status} ${r.message}`,r=>r.amount);
 add('Customer debit',state.creditEntries,r=>`${client(r)} ${r.note||''}`,r=>r.amount);
 add('Empty cylinder movement',state.emptyCylinderMovements,r=>`${r.direction} ${r.qty} × ${r.capacity} kg ${r.note||''}`);
 add('Full cylinder movement',state.fullCylinderMovements,r=>`${r.direction} ${r.qty} × ${r.capacity} kg ${r.note||''}`);
 add('Physical full-cylinder count',state.fullCylinderCounts,r=>`${r.qty} × ${r.capacity} kg ${r.note||''}`);
 add('Daily rate',Object.entries(state.dailyRates).map(([date,r])=>({...r,date,id:date})),r=>`Gas selling price per kg ${r.perKg}`,r=>r.perKg);
 add('Monthly closing',Object.entries(state.monthClosings).map(([id,r])=>({id,date:id+'-01',report:r.report})),r=>`Saved monthly closing ${r.id}`);
 return records.sort((a,b)=>b.date.localeCompare(a.date));
}
const receiptTypes=['Sale','Customer payment','Gas receipt','Supplier purchase','Supplier payment'];
function matchingRecords(records,value){const words=value.toLowerCase().trim().split(/\s+/).filter(Boolean);return records.filter(r=>words.every(w=>`${r.type} ${r.id} INV-${r.id} ${r.date} ${r.text} ${r.amount??''}`.toLowerCase().includes(w)))}
function recordButtons(r,print=false){return `${EDIT_TYPES[r.type]?recordActions(r.type,r.id):''}<button type="button" class="card-link" data-record-type="${esc(r.type)}" data-record-id="${esc(r.id)}">${receiptTypes.includes(r.type)?'View receipt':'Open'}</button>${print?` <button type="button" class="card-link" data-record-type="${esc(r.type)}" data-record-id="${esc(r.id)}" data-record-print="true">Print receipt</button>`:''}`}
function recordsTable(rows,print=false){return table(['DATE','TYPE / REFERENCE','DETAILS','AMOUNT',''],rows.map(r=>`<tr><td>${esc(r.date||'—')}</td><td>${esc(r.type)}<small>${esc(r.id)}</small></td><td>${esc(r.text)}</td><td>${Number.isFinite(r.amount)?'Rs. '+money(r.amount):'—'}</td><td>${recordButtons(r,print)}</td></tr>`))}
let receiptQuery='';
let invoiceQuery='';
function invoicesPage(){return `<div class="section-toolbar"><label class="field">Find invoice<input class="search" id="invoice-search" value="${esc(invoiceQuery)}" placeholder="Customer, date or invoice number"></label><button class="button primary" data-action="sale">＋ New customer invoice</button></div><article class="card" id="invoice-results">${invoiceResults()}</article>`}
function invoiceResults(){const rows=matchingRecords(businessRecords().filter(r=>r.type==='Sale'),invoiceQuery);return table(['DATE','INVOICE','CUSTOMER / ITEM','TOTAL',''],rows.map(r=>`<tr><td>${esc(r.date)}</td><td>#INV-${esc(r.id)}</td><td>${esc(r.text)}</td><td>Rs. ${money(r.amount)}</td><td><button class="card-link" data-sale-invoice="${esc(r.id)}">View invoice</button> <button class="card-link" data-sale-invoice="${esc(r.id)}" data-invoice-print="true">Print invoice</button>${recordActions('Sale',r.id)}</td></tr>`))}
function receiptsPage(){return `<div class="section-toolbar"><label class="field">Find receipt<input class="search" id="receipt-search" value="${esc(receiptQuery)}" placeholder="Customer, date, invoice or payment reference"></label><button class="button primary" data-action="receipt">＋ Receive customer payment</button></div><article class="card" id="receipt-results">${receiptResults()}</article>`}
function receiptResults(){const rows=matchingRecords(businessRecords().filter(r=>receiptTypes.includes(r.type)),receiptQuery);return `<p class="card-subtitle">${rows.length} receipts · Reprinting does not create another entry.</p>`+recordsTable(rows,true)}
const sectionBeforeSearch=section;
section=function(){return page==='Invoices'?invoicesPage():page==='Receipts'?receiptsPage():sectionBeforeSearch()};
function updateGlobalSearch(){const value=document.getElementById('global-search').value,box=document.getElementById('global-search-results');box.hidden=!value.trim();if(box.hidden){box.innerHTML='';return}const rows=matchingRecords(businessRecords(),value);box.innerHTML=`<p role="status">${rows.length} matching records${rows.length>80?' · Showing first 80; refine your search':''}</p>`+recordsTable(rows.slice(0,80))}
function openBusinessRecord(type,id){
 const record=businessRecords().find(r=>r.type===type&&r.id===id);if(!record){toast('Record no longer exists.');return false}
 if(type==='Sale')showSaleReceipt(record.row);
 else if(type==='Supplier purchase'||type==='Supplier payment')showSupplierReceipt(type==='Supplier purchase'?'purchase':'payment',id);
 else if(type==='Customer payment'||type==='Gas receipt'){
  const button=document.createElement('button');button.hidden=true;button.setAttribute(type==='Customer payment'?'data-payment-receipt':'data-open-gas-receipt',id);document.body.appendChild(button);button.click();button.remove();
 }else if(type==='Customer'){bookCustomer=id;page='Money & cylinder ledger';query='';render()}
 else showDetail(type,`<p>${esc(record.text)}</p><p>Reference: ${esc(id)}<br>Date: ${esc(record.date||'Not recorded')}${Number.isFinite(record.amount)?'<br>Amount: Rs. '+money(record.amount):''}</p>`);
 return true;
}
document.addEventListener('input',e=>{if(e.target.id==='global-search')updateGlobalSearch();if(e.target.id==='invoice-search'){invoiceQuery=e.target.value;document.getElementById('invoice-results').innerHTML=invoiceResults()}if(e.target.id==='receipt-search'){receiptQuery=e.target.value;document.getElementById('receipt-results').innerHTML=receiptResults()}});
document.addEventListener('click',e=>{const inv=e.target.closest('[data-sale-invoice]');if(inv){const sale=state.sales.find(s=>s.id===inv.dataset.saleInvoice);if(sale){showSaleReceipt(sale);const title='Invoice #INV-'+sale.id;document.getElementById('dialog-title').textContent=title;document.querySelector('.receipt-document-title').textContent=title;document.querySelector('dialog [data-action=print]').textContent='Print invoice / Save PDF';if(inv.dataset.invoicePrint==='true')window.print()}return}if(e.target.closest('#clear-global-search')){document.getElementById('global-search').value='';updateGlobalSearch();document.getElementById('global-search').focus()}const button=e.target.closest('[data-record-id]');if(button&&openBusinessRecord(button.dataset.recordType,button.dataset.recordId)&&button.dataset.recordPrint==='true')window.print()});

function showLedgerRecord(type,id){
 if(type==='Opening'){
  const c=customer(id);if(!c){toast('Customer no longer exists.');return}
  showDetail('Opening customer balance',`<p><strong>${esc(c.name)}</strong><br>Mobile: ${esc(c.phone||'Not entered')}<br>Address: ${esc(c.address||'Not entered')}</p><p>Opening debit: Rs. ${money(c.opening)}<br>Date: ${esc(c.date||'Opening balance')}</p><p>This is an opening amount owed, not a new sale or payment.</p>`);
 }else openBusinessRecord(type,id);
}
document.addEventListener('click',e=>{
 const focus=e.target.closest('#focus-global-search');if(focus){const input=document.getElementById('global-search');input.scrollIntoView({block:'center'});input.focus();return}
 const row=e.target.closest('[data-ledger-record-id]');if(!row||e.target.closest('[data-invoice],[data-payment-receipt]'))return;
 showLedgerRecord(row.dataset.ledgerRecordType,row.dataset.ledgerRecordId);
});
document.addEventListener('keydown',e=>{if(e.target.matches('tr[data-ledger-record-id]')&&['Enter',' '].includes(e.key)){e.preventDefault();showLedgerRecord(e.target.dataset.ledgerRecordType,e.target.dataset.ledgerRecordId)}});

// Refresh visible search results after saves, imports and navigation.
const renderBeforeSearch=render;
render=function(){renderBeforeSearch();updateGlobalSearch()};
render();
