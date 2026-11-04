state.dailyRates ??= {};
let pendingBackup=null;
const BACKUP_ARRAYS=['customers','sales','receipts','stock','cylinders','partItems','partMovements','creditEntries','expenses','emptyCylinderMovements','fullCylinderCounts','fullCylinderMovements','costCorrections','suppliers','supplierPurchases','supplierPayments'];
function backupPayload(){return {format:'latif-lpg-backup',version:1,exportedAt:new Date().toISOString(),data:state}}
function validateBackup(payload){
 if(payload?.format&&payload.format!=='latif-lpg-backup')throw Error('This is not a Latif LPG backup.');if(payload?.format&&payload.version!==1)throw Error('Unsupported backup version.');
 const data=structuredClone(payload?.format?payload.data:payload);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('The backup must contain business data.');
 let visited=0;
 function walk(value,depth=0){if(++visited>500000||depth>40)throw Error('Backup data is too large or deeply nested.');if(typeof value==='number'&&!Number.isFinite(value))throw Error('Invalid number in backup.');if(value&&typeof value==='object'){for(const [key,item] of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))throw Error('Unsafe backup structure.');walk(item,depth+1)}}}
 walk(data);
 for(const name of ['customers','sales','receipts','stock','cylinders'])if(!Array.isArray(data[name]))throw Error('Missing '+name+' records.');
 for(const name of BACKUP_ARRAYS){data[name]??=[];if(!Array.isArray(data[name])||data[name].length>100000)throw Error('Invalid '+name+' records.');const ids=new Set();for(const row of data[name]){if(!row||typeof row!=='object'||Array.isArray(row))throw Error('Invalid row in '+name);if(name!=='costCorrections'){if(typeof row.id!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(row.id)||ids.has(row.id))throw Error('Missing or duplicate ID in '+name);ids.add(row.id)}if(!['customers','partItems','costCorrections'].includes(name)&&typeof row.date!=='string')throw Error('Missing date in '+name);if(row.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date))||new Date(row.date).toISOString().slice(0,10)!==row.date))throw Error('Invalid date in '+name);for(const key of ['qty','paid','amount','rate','opening','purchaseCost','cost','costPerUnit','total'])if(row[key]!=null&&(!Number.isFinite(row[key])||row[key]<0))throw Error('Invalid '+key+' in '+name)}}
 const number=(row,key,name)=>{if(!Number.isFinite(row[key])||row[key]<0)throw Error('Missing '+key+' in '+name)};
 const customers=new Set(data.customers.map(c=>c.id)),parts=new Set(data.partItems.map(p=>p.id)),suppliers=new Set(data.suppliers.map(s=>s.id));
 for(const c of data.customers){if(typeof c.name!=='string'||!c.name.trim())throw Error('Invalid customer name.');number(c,'opening','customers')}
 for(const s of data.sales){for(const key of ['qty','rate','paid'])number(s,key,'sales');if(!['Gas','Parts'].includes(s.kind))throw Error('Invalid sale category.');if(s.customer!=null&&!customers.has(s.customer))throw Error('Sale customer is missing.');if(s.partId&&!parts.has(s.partId))throw Error('Sale part is missing.');if(s.cylinderSale&&(!CYLINDER_SIZES.includes(String(s.cylinderSale.capacity))||!Number.isSafeInteger(s.cylinderSale.quantity)||s.cylinderSale.quantity<=0||!Number.isFinite(s.cylinderSale.price)||s.cylinderSale.price<=0))throw Error('Invalid sold-cylinder details.');if(s.paid>total(s)+.005)throw Error('Sale payment exceeds invoice.');if(!s.date)throw Error('Sale date is missing.')}
 for(const name of ['receipts','creditEntries','cylinders'])for(const row of data[name]){if(!customers.has(row.customer))throw Error('Missing customer in '+name);number(row,name==='cylinders'?'qty':'amount',name)}
 for(const row of data.stock){number(row,'qty','stock');if(!['Main godown','Shop','Supply vehicle'].includes(row.warehouse)||!row.date)throw Error('Invalid gas receipt.');if(row.plantPurchase&&(!Array.isArray(row.plantPurchase.lines)||!Number.isFinite(row.plantPurchase.units)))throw Error('Invalid cylinder receipt breakdown.')}
 for(const row of data.partItems){if(typeof row.name!=='string')throw Error('Invalid part name.');number(row,'sellingRate','parts')}
 for(const row of data.partMovements){if(!parts.has(row.part)||!['In','Out'].includes(row.direction))throw Error('Invalid parts movement.');number(row,'qty','parts');number(row,'cost','parts')}
 for(const row of data.suppliers){if(typeof row.name!=='string'||!row.date)throw Error('Invalid supplier.');number(row,'opening','supplier')}
 for(const name of ['supplierPurchases','supplierPayments'])for(const row of data[name]){if(!suppliers.has(row.supplier))throw Error('Missing supplier.');number(row,name==='supplierPurchases'?'total':'amount',name);if(name==='supplierPurchases'){number(row,'paid',name);if(row.paid>row.total)throw Error('Supplier purchase payment exceeds total.')}}
 for(const name of ['cylinders','emptyCylinderMovements','fullCylinderMovements'])for(const row of data[name])if(!['In','Out'].includes(row.direction)||!Number.isSafeInteger(row.qty)||row.qty<0)throw Error('Invalid cylinder movement.');
 for(const row of data.cylinders)if(row.cylinderType!=null&&!['Original','Local','Unspecified'].includes(row.cylinderType))throw Error('Invalid cylinder type.');
 for(const row of data.fullCylinderCounts)if(!Number.isSafeInteger(row.qty)||row.qty<0)throw Error('Invalid cylinder count.');
 for(const row of data.expenses)number(row,'amount','expenses');
 const maps={monthClosings:{},emptyCylinderOpening:{},stockAlertSettings:{gasKg:500,partsQty:5},cylinderAlertLevels:{'11.8':5,'15':5,'45.5':5},dailyRates:{},periodClosings:{daily:{},weekly:{}}};
 for(const [name,fallback] of Object.entries(maps)){data[name]??=structuredClone(fallback);if(!data[name]||typeof data[name]!=='object'||Array.isArray(data[name]))throw Error('Invalid '+name)}
 data.periodClosings.daily??={};data.periodClosings.weekly??={};
 for(const type of ['daily','weekly'])if(!data.periodClosings[type]||typeof data.periodClosings[type]!=='object'||Array.isArray(data.periodClosings[type]))throw Error('Invalid period closing map.');
 for(const size of FULL_STOCK_SIZES){data.cylinderAlertLevels[size]??=5;if(!Number.isSafeInteger(data.cylinderAlertLevels[size])||data.cylinderAlertLevels[size]<0)throw Error('Invalid cylinder alert level.');}
 for(const [key,fallback] of Object.entries({gasKg:500,partsQty:5})){data.stockAlertSettings[key]??=fallback;if(!Number.isFinite(data.stockAlertSettings[key])||data.stockAlertSettings[key]<0)throw Error('Invalid stock alert level.');}
 for(const row of [...data.fullCylinderCounts,...data.fullCylinderMovements])if(!STORED_FULL_STOCK_SIZES.includes(row.capacity))throw Error('Invalid full-cylinder capacity.');
 for(const row of data.stock)if(row.plantPurchase)for(const line of row.plantPurchase.lines)if(!Number.isFinite(line.capacity)||line.capacity<=0||!Number.isSafeInteger(line.quantity)||line.quantity<0)throw Error('Invalid cylinder receipt line.');

 for(const snapshot of [...Object.values(data.monthClosings),...Object.values(data.periodClosings.daily),...Object.values(data.periodClosings.weekly)]){if(!snapshot?.report||!Array.isArray(snapshot.report.customers))throw Error('Invalid closing snapshot.');for(const key of ['gasSales','partsSales','collections','closing','opening','cylOut','cylIn'])if(!Number.isFinite(snapshot.report[key]))throw Error('Invalid closing totals.');}
 for(const opening of Object.values(data.emptyCylinderOpening))if(!Number.isSafeInteger(opening.qty)||opening.qty<0||opening.tareKg!=null&&(!Number.isFinite(opening.tareKg)||opening.tareKg<=0))throw Error('Invalid empty-cylinder opening.');
 for(const rate of Object.values(data.dailyRates))if(!Number.isFinite(rate.perKg)||rate.perKg<=0)throw Error('Invalid daily rate.');
 return data;
}
function prepareBackupOpen(payload){
 pendingBackup=validateBackup(payload);action='restore-backup';document.getElementById('dialog-title').textContent='Open business backup';
 document.getElementById('form-fields').innerHTML=`<p>This will replace this browser’s business records with the chosen file.</p><div class="account-summary"><div><span>Customers</span><strong>${pendingBackup.customers.length}</strong></div><div><span>Sales</span><strong>${pendingBackup.sales.length}</strong></div></div><p>${pendingBackup.stock.length} gas receipts · ${pendingBackup.cylinders.length} cylinder movements · ${pendingBackup.suppliers.length} suppliers</p><p class="card-subtitle">Save your current data first. A safety copy will also be kept in this browser.</p><button type="button" class="button secondary" id="save-current-before-open">Save current backup</button>`;
 document.getElementById('form-error').textContent='';document.querySelector('.dialog-actions').style.display='flex';document.querySelector('#entry-form button[type=submit]').textContent='Restore backup';document.getElementById('entry-dialog').showModal();
}
function restorePendingBackup(){
 try{
  if(!pendingBackup)throw Error('Choose and validate a backup first.');const restored=validateBackup(pendingBackup),previous=JSON.stringify(state);
  localStorage.setItem('latif-lpg-before-open',previous);localStorage.setItem('latif-lpg-v1',JSON.stringify(restored));state=restored;pendingBackup=null;
  page='Overview';query='';bookCustomer='';supplierFilter='';salesView='cash';reportsView='daily';dashboardDate=today();cashDate=today();reportDate=today();expenseDate=today();closingMonth=today().slice(0,7);dailyClosingDate=today();weeklyClosingDate=today();plantDraft=null;
  document.getElementById('entry-dialog').close();render();toast('Backup opened successfully.');
 }catch(err){document.getElementById('form-error').textContent=err.message}
}
function dailyRatesPanel(date){
 const rate=state.dailyRates[date]?.perKg;
 return `<article class="card daily-rates"><div class="card-heading table-top"><div><h2>Daily price list</h2><div class="card-subtitle">Selling prices for ${date} · based on price per kg</div></div></div><form id="daily-rate-form"><label class="field">Rate per kg (Rs.)<input type="number" name="perKg" min="0.01" step="0.01" required value="${rate??''}" placeholder="Enter daily selling rate"></label><button class="button primary">Save daily rate</button></form><div class="rate-prices" id="daily-rate-prices">${ratePrices(rate)}</div><p class="card-subtitle">Daily rates prefill new customer sales. Saved invoices and purchase costs are unchanged.</p></article>`;
}
function ratePrices(rate){return [['Per kg',1],['11.8 kg cylinder',11.8],['15 kg cylinder',15],['45.5 kg cylinder',45.5]].map(([label,kg])=>`<div><span>${label}</span><strong>${Number.isFinite(rate)&&rate>0?'Rs. '+money(roundAmount(rate*kg)):'Not set'}</strong></div>`).join('')}
function openCylinderReceipt(){
 action='gas-cylinder-receipt';document.getElementById('dialog-title').textContent='Add cylinder gas receipt';
 document.getElementById('form-fields').innerHTML=field('Receipt date','date','date',today(),`max="${today()}"`)+select('Cylinder size','capacity',FULL_STOCK_SIZES.map(size=>[size,size+' kg']))+field('Number of full cylinders','qty','number','','min="1" step="1"')+`<div class="sale-totals"><span>Total gas<strong id="receipt-total-kg">0 kg</strong></span><span>11.8 kg units<strong id="receipt-total-units">0</strong></span></div>`+select('Receive at','warehouse',['Main godown','Shop','Supply vehicle'])+`<label class="field">Actual total purchase cost (Rs., optional)<input type="number" name="purchaseCost" min="0" step="0.01"></label>`+field('Reference / note','note','text','Cylinder gas receipt','maxlength="150"')+'<p class="card-subtitle">Cylinder quantity is converted to kg automatically. Saving adds gas stock and supported full-cylinder counts once. For supplier credit use Supplier credit instead; do not enter the same purchase twice.</p>';
 document.getElementById('form-error').textContent='';document.querySelector('.dialog-actions').style.display='flex';document.getElementById('entry-dialog').showModal();
}
function saveCylinderReceipt(e){
 const before=structuredClone(state),f=Object.fromEntries(new FormData(e.target));
 try{
  validateSaleDate(f.date);assertDateOpen(f.date);const qty=Number(f.qty),capacity=Number(f.capacity),cost=f.purchaseCost===''?null:Number(f.purchaseCost);
  if(!FULL_STOCK_SIZES.includes(f.capacity)||!Number.isSafeInteger(qty)||qty<=0||!Number.isSafeInteger(qty*Math.round(capacity*100))||!['Main godown','Shop','Supply vehicle'].includes(f.warehouse))throw Error('Enter valid cylinder quantity, size and location.');if(cost!==null&&(!Number.isFinite(cost)||cost<0))throw Error('Enter a valid purchase cost or leave it blank.');
  const kg=roundAmount(qty*capacity),units=kg/GAS_UNIT_KG,receipt={id:crypto.randomUUID(),date:f.date,createdAt:new Date().toISOString(),warehouse:f.warehouse,qty:kg,note:f.note.trim(),plantPurchase:{lines:[{capacity,quantity:qty,kg,units}],kg,units,quantity:qty,totalCost:cost,unitRate:cost===null?null:cost/units,costPerKg:cost===null?null:cost/kg}};
  if(cost!==null)receipt.purchaseCost=cost;state.stock.unshift(receipt);recordPlantCylinderReceipt(receipt);save();document.getElementById('entry-dialog').close();render();toast('Cylinder receipt saved. Gas kg updated.');
 }catch(err){state=before;document.getElementById('form-error').textContent=err.message}
}
document.addEventListener('click',e=>{
 if(e.target.closest('#save-backup,#save-current-before-open'))downloadText(`latif-lpg-backup-${today()}.json`,JSON.stringify(backupPayload(),null,2),'application/json');
 const receiptButton=e.target.closest('[data-open-gas-receipt]');if(receiptButton){const receipt=state.stock.find(row=>row.id===receiptButton.dataset.openGasReceipt);if(receipt)receiptPreview('Gas receipt · '+receipt.date,`<p>Date: ${esc(receipt.date)}<br>Location: ${esc(receipt.warehouse)}</p><hr><strong>${money(receipt.qty)} kg received</strong><p>${receipt.plantPurchase?receipt.plantPurchase.lines.filter(line=>line.quantity).map(line=>line.quantity+' × '+line.capacity+' kg').join('<br>'):'Weight-only receipt'}</p><hr>Purchase cost: ${Number.isFinite(receipt.purchaseCost)?'Rs. '+money(receipt.purchaseCost):'Not recorded'}<br>Reference: ${esc(receipt.note)}`)}
 if(e.target.closest('#open-backup'))document.getElementById('backup-file').click();
});
document.getElementById('backup-file').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{if(file.size>10*1024*1024)throw Error('Backup files must be smaller than 10 MB.');prepareBackupOpen(JSON.parse(await file.text()))}catch(err){pendingBackup=null;toast('Cannot open backup: '+err.message)}finally{e.target.value=''}
});
document.getElementById('entry-dialog').addEventListener('close',()=>{document.querySelector('#entry-form button[type=submit]').textContent='Save entry ↗'});
document.addEventListener('input',e=>{
 if(e.target.closest('#daily-rate-form'))document.getElementById('daily-rate-prices').innerHTML=ratePrices(Number(e.target.value));
 if(action==='gas-cylinder-receipt'&&['capacity','qty'].includes(e.target.name)){const form=document.getElementById('entry-form'),kg=Number(form.elements.capacity.value)*Number(form.elements.qty.value||0);document.getElementById('receipt-total-kg').textContent=money(kg)+' kg';document.getElementById('receipt-total-units').textContent=gasNumber(kg/GAS_UNIT_KG)}
});
document.addEventListener('submit',e=>{
 if(e.target.id!=='daily-rate-form')return;e.preventDefault();const rate=Number(new FormData(e.target).get('perKg')),old=structuredClone(state.dailyRates);
 try{validateSaleDate(dashboardDate);if(!Number.isFinite(rate)||rate<=0||!Number.isFinite(rate*45.5))throw Error('Enter a valid positive daily rate.');state.dailyRates[dashboardDate]={perKg:rate,updatedAt:new Date().toISOString()};save();render();toast('Daily gas rate saved.')}catch(err){state.dailyRates=old;toast(err.message)}
});
