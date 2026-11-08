// All record changes are atomic: validate the complete proposed state before saving.
const EDIT_TYPES={Customer:'customers',Sale:'sales','Customer payment':'receipts','Customer debit':'creditEntries',Expense:'expenses','Gas receipt':'stock',Part:'partItems','Parts movement':'partMovements',Supplier:'suppliers','Supplier purchase':'supplierPurchases','Supplier payment':'supplierPayments','Cylinder movement':'cylinders','Empty movement':'emptyCylinderMovements','Full movement':'fullCylinderMovements','Full count':'fullCylinderCounts','WhatsApp reminder':'paymentReminders'};
const EDIT_MAPS={'Daily rate':'dailyRates','Empty opening':'emptyCylinderOpening','Monthly closing':'monthClosings','Daily closing':'daily','Weekly closing':'weekly'};
let recordTarget=null,recordManagerType='Sale';
function editorRows(type){if(EDIT_TYPES[type])return state[EDIT_TYPES[type]];const map=type==='Daily closing'||type==='Weekly closing'?state.periodClosings[EDIT_MAPS[type]]:state[EDIT_MAPS[type]];return Object.entries(map||{}).map(([id,row])=>({...row,id}));}
function editorRecord(type,id){return editorRows(type).find(r=>r.id===id);}
function recordLabel(type,r){return [r.date||r.id,r.name||customer(r.customer)?.name||state.suppliers.find(s=>s.id===r.supplier)?.name,r.recipient||r.item||r.note||r.reference||r.capacity||(type==='Part'?r.sellingRate:''),r.amount??r.total??r.qty??''].filter(v=>v!==undefined&&v!=='').join(' · ');}
function sourceRecord(type,id){
 const r=editorRecord(type,id);if(!r)throw Error('This record no longer exists.');
 if((type==='Gas receipt'||type==='Parts movement')&&r.supplierPurchase)return sourceRecord('Supplier purchase',r.supplierPurchase);
 if(type==='Full movement'&&r.invoice)return sourceRecord('Sale',r.invoice);
 if(type==='Parts movement'&&r.invoice)return sourceRecord('Sale',r.invoice);
 if(type==='Cylinder movement'&&r.invoice)return sourceRecord('Sale',r.invoice);
 if(type==='Empty movement'&&r.invoice)return sourceRecord('Sale',r.invoice);
 if(type==='Empty movement'&&r.cylinderMovement)return sourceRecord('Cylinder movement',r.cylinderMovement);
 if(type==='Full movement'&&r.source){if(state.stock.some(s=>s.id===r.source))return sourceRecord('Gas receipt',r.source);if(state.cylinders.some(c=>c.id===r.source))return sourceRecord('Cylinder movement',r.source);throw Error('The source of this generated movement is missing. Restore its backup before changing it.');}
 return {type,id,row:r};
}
function recordActions(type,id){return `<span class="record-actions"><button type="button" class="card-link" data-edit-record="${esc(id)}" data-edit-type="${esc(type)}">Edit</button><button type="button" class="card-link record-delete" data-delete-record="${esc(id)}" data-edit-type="${esc(type)}">Delete</button></span>`;}
function openRecordManager(){
 const defaults={Overview:'Sale','Cash & online':'Cash transfer',Sales:'Sale',Invoices:'Sale',Receipts:'Customer payment','Money & cylinder ledger':'Customer','Supplier credit':'Supplier purchase','Gas & inventory':'Gas receipt','Gas parts':'Part','Cylinder tracking':'Cylinder movement',Expenses:'Expense',Reports:'Monthly closing','Gas calculator':'Gas receipt'};
 recordManagerType=defaults[page]||'Sale';action='record-manager';
 showDetail('Edit & delete records',`<p>Choose a record type. Linked stock and ledger records are updated together.</p>${localStorage.getItem('latif-lpg-before-record-change')?'<button type="button" class="button secondary" id="record-download-previous">Download state before last change</button>':''}<label class="field">Record type<select id="manage-record-type">${[...Object.keys(EDIT_TYPES),...Object.keys(EDIT_MAPS)].map(type=>`<option ${type===recordManagerType?'selected':''}>${esc(type)}</option>`).join('')}</select></label><label class="field">Find record<input id="manage-record-search" placeholder="Name, date, reference or item"></label><div id="manage-record-results"></div>`);renderRecordManager();
}
function renderRecordManager(){const q=(document.getElementById('manage-record-search')?.value||'').toLowerCase(),rows=editorRows(recordManagerType).filter(r=>recordLabel(recordManagerType,r).toLowerCase().includes(q));document.getElementById('manage-record-results').innerHTML=`<p>${rows.length} records${rows.length>100?' · showing first 100':''}</p>`+table(['RECORD',''],rows.slice(0,100).map(r=>`<tr><td>${esc(recordLabel(recordManagerType,r))}</td><td>${recordActions(recordManagerType,r.id)}</td></tr>`));}
function editNumber(label,name,value,optional=false,whole=false){return `<label class="field">${label}${optional?' (optional)':''}<input type="number" name="${name}" value="${value??''}" min="0" step="${whole?'1':Number.isFinite(Number(value))&&Math.abs(Number(value)*100-Math.round(Number(value)*100))>1e-7?'any':'0.01'}" ${optional?'':'required'}></label>`;}
function editSelect(label,name,choices,value){return `<label class="field">${label}<select name="${name}">${choices.map(o=>{const [id,text]=Array.isArray(o)?o:[o,o];return `<option value="${esc(id)}" ${String(id)===String(value)?'selected':''}>${esc(text)}</option>`}).join('')}</select></label>`;}
function editText(label,name,value=''){return `<label class="field">${label}<input name="${name}" value="${esc(value||'')}" maxlength="500"></label>`;}
function editCustomer(r,optional=false){return editSelect('Customer','customer',[...(optional?[['','Cash customer']]:[]),...state.customers.map(c=>[c.id,c.name])],r.customer||'');}
function editMethod(r){return editSelect('Payment method','method',['Cash','Bank transfer','Easypaisa / JazzCash'],r.method||'Cash');}
function editFields(type,r){
 const date=()=>field('Date','date','date',r.date||today(),`max="${today()}"`),qty=()=>editNumber('Quantity','qty',r.qty,false,['Supplier purchase','Parts movement','Cylinder movement','Full count','Full movement','Empty movement'].includes(type)),note=()=>editText('Description / note (optional)','note',r.note),sizes=()=>editSelect('Cylinder capacity','capacity',[...CYLINDER_SIZES,'unknown'],r.capacity||r.cylinderSale?.capacity);
 if(type==='Customer'||type==='Supplier')return editText('Name','name',r.name)+editText('Mobile (optional)','phone',r.phone)+(type==='Customer'?editText('Address (optional)','address',r.address)+editSelect('Customer type','type',['Retail customer','Shop / wholesale','Hotel / restaurant'],r.type):date())+editNumber('Opening amount owed (Rs.)','opening',r.opening)+(type==='Customer'?`<label class="field">Due date (optional)<input type="date" name="paymentDueDate" value="${esc(r.paymentDueDate||'')}"></label>`:'');
 if(type==='Part')return editText('Part name','name',r.name)+editNumber('Selling price','sellingRate',r.sellingRate);
 if(type==='Daily rate')return editNumber('Price per kg','perKg',r.perKg);
 if(type==='Empty opening')return editNumber('Physical empty quantity','qty',r.qty,false,true)+editNumber('Average tare kg','tareKg',r.tareKg,true);
 if(type==='WhatsApp reminder')return editText('Recorded message','message',r.message)+editText('Phone (country code, digits only)','phone',r.phone);
 if(type==='Sale'){
  let html=date()+editCustomer(r,true);
  if(r.directCash)html+=editNumber('Payment amount','amount',total(r))+editNumber('Gas kg (0 if unrecorded)','qty',r.qty)+editNumber('Quoted customer price per kg','quotedRate',r.quotedRate,true);
  else html+=editNumber(r.cylinderSale?'Empty cylinder quantity':r.kind==='Gas'?'Gas kg':'Part quantity','qty',r.qty,false,r.kind!=='Gas')+editNumber('Selling price per kg / piece','rate',r.rate)+editNumber('Received at sale','paid',r.paid);
  if(r.kind==='Gas'&&!r.directCash)html+=editSelect('Gas sale type','saleBasis',['Per KG','Full cylinder'],r.saleBasis||'Per KG');
  html+=editMethod(r)+editText('Description (optional)','item',r.item)+editSelect('Sales channel','channel',['Retail','Wholesale','Supply'],r.channel);
  if(r.cylinderSale)html+=sizes()+editNumber('Actual container cost per piece','costPerUnit',r.costPerUnit,true);
  const linked=state.cylinders.filter(c=>c.invoice===r.id);
  if(linked.length)html+='<p>Linked cylinder quantities</p>'+linked.map(c=>editNumber('Cylinder '+c.direction+' quantity','cyl_'+c.id,c.qty,false,true)+editSelect('Capacity','cyl_size_'+c.id,[...CYLINDER_SIZES,'unknown'],c.capacity||'unknown')+editSelect('Type','cyl_type_'+c.id,['Original','Local','Unspecified'],c.cylinderType||'Unspecified')).join('');
  return html;
 }
 if(type==='Customer payment'||type==='Customer debit')return date()+editCustomer(r)+editNumber('Amount','amount',r.amount)+(type==='Customer payment'?editMethod(r):'')+note();
 if(type==='Expense')return date()+editNumber('Expense amount','amount',r.amount)+editSelect('Category','category',['Transport','Rent','Wages','Utilities','Maintenance','Other'],r.category)+editMethod(r)+note();
 if(type==='Supplier payment')return date()+editSelect('Supplier','supplier',state.suppliers.map(s=>[s.id,s.name]),r.supplier)+editNumber('Amount paid','amount',r.amount)+editMethod(r)+note();
 if(type==='Supplier purchase')return date()+editSelect('Supplier','supplier',state.suppliers.map(s=>[s.id,s.name]),r.supplier)+qty()+editNumber(r.kind==='Gas'?'Price per 11.8 kg unit':'Purchase cost per piece','rate',r.rate)+editNumber('Paid at purchase','paid',r.paid)+editMethod(r)+editText('Bill reference (optional)','reference',r.reference)+(r.kind==='Gas'?sizes()+editSelect('Location','warehouse',['Shop','Main godown','Supply vehicle'],state.stock.find(s=>s.id===r.stockId)?.warehouse):editSelect('Part','part',state.partItems.map(p=>[p.id,p.name]),r.part));
 if(type==='Gas receipt')return date()+editSelect('Location','warehouse',['Shop','Main godown','Supply vehicle'],r.warehouse)+(r.plantPurchase?r.plantPurchase.lines.map((line,i)=>editSelect('Cylinder capacity','line_size_'+i,[...new Set([...CYLINDER_SIZES,String(line.capacity)])],line.capacity)+editNumber('Cylinder quantity','line_'+i,line.quantity,false,true)).join(''):qty())+editNumber('Actual total purchase cost','purchaseCost',r.purchaseCost,true)+note();
 if(type==='Parts movement')return date()+editSelect('Part','part',state.partItems.map(p=>[p.id,p.name]),r.part)+qty()+editNumber('Purchase cost per piece','cost',r.cost)+note();
 if(type==='Cylinder movement')return date()+editCustomer(r)+sizes()+editSelect('Cylinder type','cylinderType',['Original','Local','Unspecified'],r.cylinderType||'Unspecified')+editSelect('Movement','direction',['Out','In'],r.direction)+qty()+note()+`<label class="check-field"><input type="checkbox" name="fullDispatch" ${state.fullCylinderMovements.some(m=>m.source===r.id)?'checked':''}> Dispatch full cylinders</label><label class="check-field"><input type="checkbox" name="returnEmpty" ${state.emptyCylinderMovements.some(m=>m.cylinderMovement===r.id)?'checked':''}> Returned cylinders are empty</label>`;
 if(type==='Full count'||type==='Full movement'||type==='Empty movement')return date()+sizes()+(type==='Full count'?'':editSelect('Movement','direction',['In','Out'],r.direction))+qty()+note();
 throw Error('Use the report Reopen action to revise saved closings.');
}
function openRecordEdit(type,id){
 try{recordTarget=sourceRecord(type,id);if(type.endsWith('closing')){openRecordDelete(type,id,true);return}action='record-edit';const t=recordTarget;showDetail('Edit '+t.type,editFields(t.type,t.row)+'<p class="card-subtitle">Linked records and reports will recalculate. Closed dates must be reopened first.</p>');document.querySelector('.dialog-actions').style.display='flex';document.querySelector('#entry-form button[type=submit]').textContent='Save changes';}catch(err){toast(err.message)}
}
function openRecordDelete(type,id,reopen=false){
 try{recordTarget=sourceRecord(type,id);action=reopen?'record-reopen':'record-delete';showDetail(reopen?'Reopen closing to edit':'Delete '+recordTarget.type,`<p><strong>${esc(recordLabel(recordTarget.type,recordTarget.row))}</strong></p><p>${reopen?'This reopens the saved snapshot. Correct the source records, then save the closing again.':'Delete this record and its generated stock/ledger movements? Dependent records and closed periods are protected.'}</p><p>A safety copy is kept locally before the change.</p><button type="button" class="button secondary" id="record-backup-before-change">Save backup first</button> <button type="button" class="button ${reopen?'primary':'danger'}" id="confirm-record-delete">${reopen?'Reopen for editing':'Delete record'}</button>`);}catch(err){toast(err.message)}
}
function requireRecordDate(row){if(row.date){validateSaleDate(row.date);assertDateOpen(row.date)}}
function removeCylinderLinks(id){state.fullCylinderMovements=state.fullCylinderMovements.filter(m=>m.source!==id);state.emptyCylinderMovements=state.emptyCylinderMovements.filter(m=>m.cylinderMovement!==id);}
function rebuildCylinder(row,full,empty){removeCylinderLinks(row.id);if(row.direction==='Out'&&full){state.fullCylinderMovements.push({id:crypto.randomUUID(),capacity:capacityKey(row.capacity),direction:'Out',qty:row.qty,date:row.date,createdAt:row.createdAt||row.date+'T00:00:00Z',source:row.id,variant:row.cylinderType,warehouse:row.warehouse})}if(row.direction==='In'&&empty)state.emptyCylinderMovements.push({id:crypto.randomUUID(),capacity:capacityKey(row.capacity),direction:'In',qty:row.qty,date:row.date,createdAt:row.createdAt||row.date+'T00:00:00Z',cylinderMovement:row.id,warehouse:row.warehouse,note:row.note});}
function rebuildStock(row){state.fullCylinderMovements=state.fullCylinderMovements.filter(m=>m.source!==row.id);if(row.plantPurchase)recordPlantCylinderReceipt(row);}
function rebuildPlant(row,lines,cost){const result=historicalPlantPurchase(row.plantPurchase,lines.map(l=>({capacity:l.capacity,quantity:String(l.quantity)})),0);if(result.kg<=0)throw Error('Enter at least one cylinder.');row.qty=result.kg;result.totalCost=cost;result.unitRate=cost===null?null:cost/result.units;result.costPerKg=cost===null?null:cost/result.kg;row.plantPurchase=result;if(cost===null)delete row.purchaseCost;else row.purchaseCost=cost;rebuildStock(row);}
function applyRecordEdit(target,f){
 const {type,row:r}=target;
 const num=(key,positive=false,whole=false)=>{const n=Number(f[key]);if(f[key]===''||!Number.isFinite(n)||n<0||positive&&n<=0||whole&&!Number.isSafeInteger(n))throw Error('Enter a valid '+key+'.');return n;};
 const optional=key=>f[key]===''?null:num(key);
 if(type==='Daily rate'){assertDateOpen(r.id);state.dailyRates[r.id]={...state.dailyRates[r.id],perKg:num('perKg',true),updatedAt:new Date().toISOString()};return}
 if(type==='Empty opening'){assertDateOpen(r.date||'0000-01-01');Object.assign(state.emptyCylinderOpening[r.id],{qty:num('qty',false,true),tareKg:optional('tareKg')});return}
 if(type==='WhatsApp reminder'){if(!/^[1-9]\d{7,14}$/.test(f.phone)||!f.message.trim())throw Error('Enter a phone and message.');Object.assign(r,{phone:f.phone,message:f.message.trim()});return}
 if(type==='Customer'||type==='Supplier'){
  if(!f.name.trim())throw Error('Enter a name.');const opening=num('opening');if(opening!==r.opening||type==='Supplier'&&f.date!==r.date)assertDateOpen(r.date||'0000-01-01');
  Object.assign(r,{name:f.name.trim(),phone:f.phone.trim(),opening});
  if(type==='Customer'){if(!validDueDate(f.paymentDueDate))throw Error('Invalid due date.');Object.assign(r,{address:f.address.trim(),type:f.type,paymentDueDate:f.paymentDueDate});}else{validateSaleDate(f.date);if(f.date!==r.date)assertDateOpen(f.date);r.date=f.date}return;
 }
 if(type==='Part'){if(state.partItems.some(p=>p.id!==r.id&&p.name.toLowerCase()===f.name.trim().toLowerCase()))throw Error('This part name already exists.');if(!f.name.trim())throw Error('Enter a part name.');r.name=f.name.trim();r.sellingRate=num('sellingRate',true);return}
 requireRecordDate(r);validateSaleDate(f.date);assertDateOpen(f.date);r.date=f.date;
 if('customer' in f){if(f.customer&&!customer(f.customer))throw Error('Customer is missing.');r.customer=f.customer||null}
 if('supplier' in f){if(!state.suppliers.some(s=>s.id===f.supplier))throw Error('Supplier is missing.');r.supplier=f.supplier}
 if('method' in f){if(!['Cash','Bank transfer','Easypaisa / JazzCash'].includes(f.method))throw Error('Invalid payment method.');r.method=f.method}
 if('warehouse' in f&&type==='Cylinder movement'){if(f.warehouse&&!['Shop','Main godown','Supply vehicle'].includes(f.warehouse))throw Error('Select a valid dispatch location.');if(f.warehouse)r.warehouse=f.warehouse;else delete r.warehouse;}if('note' in f)r.note=f.note.trim();if('variant' in f){if(f.variant&&!['Original','Local','Unspecified'].includes(f.variant))throw Error('Invalid cylinder variant.');if(f.variant)r.variant=f.variant;else delete r.variant;}
 if(type==='Customer payment'||type==='Customer debit'||type==='Expense'||type==='Supplier payment'){r.amount=num('amount',true);if(type==='Expense')r.category=f.category;return}
 if(type==='Sale'){
  r.qty=num('qty',!r.directCash,r.kind!=='Gas');r.item=f.item.trim();r.description=r.item;r.channel=f.channel;if(f.saleBasis){if(!['Per KG','Full cylinder'].includes(f.saleBasis))throw Error('Invalid sale type.');r.saleBasis=f.saleBasis;}
  if(r.directCash){if(f.quotedRate!=='')r.quotedRate=num('quotedRate',true);else delete r.quotedRate;r.amount=num('amount',true);r.paid=r.amount;r.rate=r.qty?r.amount/r.qty:0}else{r.rate=num('rate',true);r.amount=roundAmount(r.qty*r.rate);r.paid=num('paid');if(r.paid>r.amount)throw Error('Payment exceeds the invoice.');if(r.paid<r.amount&&!r.customer)throw Error('A credit sale needs a customer.');}
  if(r.cylinderSale){if(!CYLINDER_SIZES.includes(f.capacity))throw Error('Invalid cylinder capacity.');r.cylinderSale={...r.cylinderSale,capacity:f.capacity,quantity:r.qty,price:r.rate};const cost=optional('costPerUnit');if(cost===null)delete r.costPerUnit;else r.costPerUnit=cost;state.emptyCylinderMovements.filter(m=>m.invoice===r.id).forEach(m=>Object.assign(m,{capacity:f.capacity,qty:r.qty,date:r.date}));}
  state.partMovements.filter(m=>m.invoice===r.id).forEach(m=>Object.assign(m,{qty:r.qty,rate:r.rate,date:r.date}));
  state.cylinders.filter(c=>c.invoice===r.id).forEach(c=>{requireRecordDate(c);const full=state.fullCylinderMovements.some(m=>m.source===c.id),empty=state.emptyCylinderMovements.some(m=>m.cylinderMovement===c.id);c.qty=num('cyl_'+c.id,false,true);if(![...CYLINDER_SIZES,'unknown'].includes(f['cyl_size_'+c.id])||!['Original','Local','Unspecified'].includes(f['cyl_type_'+c.id]))throw Error('Invalid linked cylinder size/type.');c.capacity=f['cyl_size_'+c.id];c.cylinderType=f['cyl_type_'+c.id];c.customer=r.customer;c.date=r.date;if(!c.customer)throw Error('Linked cylinders require a customer.');rebuildCylinder(c,full,empty)});return;
 }
 if(type==='Gas receipt'){
  r.warehouse=f.warehouse;const cost=optional('purchaseCost');if(r.plantPurchase){rebuildPlant(r,r.plantPurchase.lines.map((l,i)=>({...l,capacity:Number(f['line_size_'+i]),quantity:num('line_'+i,false,true)})),cost)}else{r.qty=num('qty',true);if(cost===null)delete r.purchaseCost;else r.purchaseCost=cost}return;
 }
 if(type==='Supplier purchase'){
  r.qty=num('qty',true,true);r.rate=num('rate',r.kind==='Gas');r.paid=num('paid');r.reference=f.reference.trim();
  if(r.kind==='Gas'){if(!CYLINDER_SIZES.includes(f.capacity))throw Error('Invalid size.');r.capacity=f.capacity;const stock=state.stock.find(s=>s.id===r.stockId);if(!stock)throw Error('Linked stock receipt is missing.');requireRecordDate(stock);stock.date=r.date;stock.warehouse=f.warehouse;if(f.variant)stock.variant=f.variant;else delete stock.variant;const result=historicalPlantPurchase(stock.plantPurchase,[{capacity:r.capacity,quantity:String(r.qty)}],r.rate);r.total=result.totalCost;stock.plantPurchase=result;stock.qty=result.kg;stock.purchaseCost=r.total;stock.note=r.reference;rebuildStock(stock)}else{if(!state.partItems.some(p=>p.id===f.part))throw Error('Part is missing.');r.part=f.part;r.total=roundAmount(r.qty*r.rate);const m=state.partMovements.find(m=>m.id===r.partMovementId);if(!m)throw Error('Linked part receipt is missing.');requireRecordDate(m);Object.assign(m,{part:r.part,qty:r.qty,cost:r.rate,date:r.date});}
  if(r.paid>r.total)throw Error('Payment exceeds purchase total.');return;
 }
 if(type==='Parts movement'){if(!state.partItems.some(p=>p.id===f.part))throw Error('Part is missing.');Object.assign(r,{part:f.part,qty:num('qty',true,true),cost:num('cost')});return}
 if('capacity' in f){if(![...CYLINDER_SIZES,'unknown'].includes(f.capacity))throw Error('Invalid cylinder capacity.');r.capacity=f.capacity}
 r.qty=num('qty',type!=='Full count',true);if(type==='Full count'){delete r.estimated;delete r.stockDeficit}
 if(type!=='Full count'){if(!['In','Out'].includes(f.direction))throw Error('Invalid direction.');r.direction=f.direction}
 if(type==='Cylinder movement'){if(!['Original','Local','Unspecified'].includes(f.cylinderType))throw Error('Invalid cylinder type.');r.cylinderType=f.cylinderType;rebuildCylinder(r,f.fullDispatch==='on',f.returnEmpty==='on')}
}
function applyRecordDelete({type,id,row:r}){
 if(type.endsWith('closing')){const period=type.split(' ')[0].toLowerCase();ensureClosingCanReopen(period,id);if(period==='monthly')delete state.monthClosings[id];else delete state.periodClosings[period][id];return}
 if(type==='Daily rate'){assertDateOpen(id);delete state.dailyRates[id];return}
 if(type==='Empty opening'){assertDateOpen(r.date||'0000-01-01');if(state.emptyCylinderMovements.some(m=>m.capacity===id))throw Error('Remove dependent empty movements before deleting their physical opening.');delete state.emptyCylinderOpening[id];return}
 if(type==='Customer'){
  if(['sales','receipts','creditEntries','cylinders','paymentReminders'].some(k=>state[k].some(x=>x.customer===id))||allClosedPeriods().length)throw Error('This customer has history or saved closings. Remove dependent records and reopen closings first.');assertDateOpen(r.date||'0000-01-01');
 }else if(type==='Supplier'){if(state.supplierPurchases.some(x=>x.supplier===id)||state.supplierPayments.some(x=>x.supplier===id))throw Error('Remove this supplier’s purchases and payments first.');requireRecordDate(r);
 }else if(type==='Part'){if(state.partMovements.some(x=>x.part===id)||state.sales.some(x=>x.partId===id)||state.supplierPurchases.some(x=>x.part===id))throw Error('Remove dependent parts purchases and sales first.');
 }else if(type!=='WhatsApp reminder')requireRecordDate(r);
 if(type==='Sale'){
  for(const c of state.cylinders.filter(x=>x.invoice===id)){requireRecordDate(c);removeCylinderLinks(c.id)}
  state.cylinders=state.cylinders.filter(x=>x.invoice!==id);state.partMovements=state.partMovements.filter(x=>x.invoice!==id);state.emptyCylinderMovements=state.emptyCylinderMovements.filter(x=>x.invoice!==id);
 }
 if(type==='Cylinder movement')removeCylinderLinks(id);
 if(type==='Gas receipt')state.fullCylinderMovements=state.fullCylinderMovements.filter(x=>x.source!==id);
 if(type==='Supplier purchase'){
  const stock=state.stock.find(x=>x.id===r.stockId);if(stock){requireRecordDate(stock);state.fullCylinderMovements=state.fullCylinderMovements.filter(x=>x.source!==stock.id);state.stock=state.stock.filter(x=>x.id!==stock.id)}
  const part=state.partMovements.find(x=>x.id===r.partMovementId);if(part)requireRecordDate(part);state.partMovements=state.partMovements.filter(x=>x.supplierPurchase!==id);
 }
 state[EDIT_TYPES[type]]=state[EDIT_TYPES[type]].filter(x=>x.id!==id);
}
// Check chronological balances against the original state, preserving legacy mismatches
// while refusing any new or worsened shortage/overpayment.
function assertNoWorseTimeline(before,after,label){const keys=new Set([...before.keys(),...after.keys()]);for(const key of keys){const old=before.get(key)||[],next=after.get(key)||[],dates=[...new Set([...old,...next].map(x=>x.date))].sort();let a=0,b=0;for(const date of dates){a+=old.filter(x=>x.date===date).reduce((s,x)=>s+x.qty,0);b+=next.filter(x=>x.date===date).reduce((s,x)=>s+x.qty,0);if(b<Math.min(0,a)-.005)throw Error(label==='parts balance'?'parts balance would become negative on '+date+' for '+(state.partItems.find(p=>p.id===key)?.name||'this part')+'. Check the purchase/stock date and later sales.':label+' would become negative. Correct dependent entries first.');}}}
function balanceEvents(data,kind){const map=new Map(),add=(key,date,qty)=>{if(!map.has(key))map.set(key,[]);map.get(key).push({date:date||'0000-01-01',qty})};
 if(kind==='gas'){for(const l of allGasLosses(data))add(l.warehouse,l.date,-l.qty);for(const x of gasInventoryRows(data))add(x.warehouse,x.date,x.qty);for(const x of data.sales.filter(s=>s.kind==='Gas'))add(x.channel==='Wholesale'?'Main godown':x.channel==='Supply'?'Supply vehicle':'Shop',x.date,-x.qty)}
 if(kind==='customer'){for(const c of data.customers)add(c.id,c.date,c.opening);for(const x of data.sales)if(x.customer)add(x.customer,x.date,total(x)-x.paid);for(const x of data.creditEntries)add(x.customer,x.date,x.amount);for(const x of data.receipts)add(x.customer,x.date,-x.amount)}
 if(kind==='supplier'){for(const s of data.suppliers)add(s.id,s.date,s.opening);for(const x of data.supplierPurchases)add(x.supplier,x.date,x.total-x.paid);for(const x of data.supplierPayments)add(x.supplier,x.date,-x.amount)}
 if(kind==='parts')for(const x of data.partMovements)add(x.part,x.date,(x.direction==='In'?1:-1)*x.qty);
 if(kind==='cylinders')for(const x of data.cylinders)add(x.customer+'|'+capacityKey(x.capacity)+'|'+(x.cylinderType||'Unspecified'),x.date,(x.direction==='Out'?1:-1)*x.qty);
 return map;
}
function stockCountEvents(data,empty){const map=new Map(),add=(key,date,qty)=>{if(!map.has(key))map.set(key,[]);map.get(key).push({date,qty})};for(const size of [...CYLINDER_SIZES,'unknown'])for(const variant of (empty?[null]:[null,'Original','Local'])){const count=empty?data.emptyCylinderOpening[size]:data.fullCylinderCounts.filter(c=>!c.migrationArchived&&c.capacity===size&&(c.variant||null)===variant).at(-1);if(!count||count.estimated||count.incomplete)continue;const key=size+(variant?'|'+variant:''),stamp=empty?count.asOf:count.createdAt;add(key,count.date,count.qty);for(const m of (empty?data.emptyCylinderMovements:data.fullCylinderMovements).filter(m=>m.capacity===size&&(!variant||m.variant===variant)&&(!stamp||m.createdAt>stamp)&&m.date>=count.date))add(key,m.date,(m.direction==='In'?1:-1)*m.qty)}return map;}
function recostEditedParts(before){
 const changed=new Set();
 for(const m of [...before.partMovements,...state.partMovements])if(JSON.stringify(before.partMovements.find(x=>x.id===m.id))!==JSON.stringify(state.partMovements.find(x=>x.id===m.id)))changed.add(m.part);
 for(const part of changed){let qty=0,value=0;for(const m of state.partMovements.filter(m=>m.part===part).slice().sort((a,b)=>a.date.localeCompare(b.date)||(a.createdAt||'').localeCompare(b.createdAt||''))){if(m.direction==='In'){qty+=m.qty;value+=m.qty*m.cost}else{const cost=qty>0?value/qty:m.cost;if(Math.abs(m.cost-cost)>.000001){assertDateOpen(m.date);m.cost=cost;const sale=state.sales.find(s=>s.id===m.invoice);if(sale){assertDateOpen(sale.date);sale.costPerUnit=cost}}qty-=m.qty;value-=m.qty*m.cost;}}}
}
function validateRecordChange(before){
 validateBackup(backupPayload());validateAutomaticResidual(state);
 for(const kind of ['gas','customer','supplier','parts','cylinders'])assertNoWorseTimeline(balanceEvents(before,kind),balanceEvents(state,kind),kind+' balance');
 for(const empty of [true,false])assertNoWorseTimeline(stockCountEvents(before,empty),stockCountEvents(state,empty),empty?'Empty cylinder stock':'Full cylinder stock');
 for(const s of state.supplierPurchases.concat(state.supplierPayments)){const supplier=state.suppliers.find(x=>x.id===s.supplier);if(s.date<supplier.date)throw Error('Supplier transaction precedes its opening date.');}
 for(const c of state.cylinders)if(!customer(c.customer))throw Error('A cylinder movement requires a customer.');
}
function commitRecordChange(remove=false){
 if(!recordTarget)return;const before=structuredClone(state),target=sourceRecord(recordTarget.type,recordTarget.id);
 try{
  if(remove)applyRecordDelete(target);else applyRecordEdit(target,Object.fromEntries(new FormData(document.getElementById('entry-form'))));
  recostEditedParts(before);validateRecordChange(before);localStorage.setItem('latif-lpg-before-record-change',JSON.stringify(before));save();
  recordTarget=null;document.getElementById('entry-dialog').close();render();toast(remove?'Record deleted; linked totals updated.':'Changes saved; linked totals updated.');
 }catch(err){state=before;document.getElementById('form-error').textContent=err.message}
}
function decorateRecordControls(root=document){
 for(const el of root.querySelectorAll('[data-invoice],[data-sale-invoice],[data-open-gas-receipt],[data-payment-receipt],[data-supplier-print-id],tr[data-ledger-record-id],[data-record-kind]')){
  const row=el.closest('tr');if(!row||row.querySelector('.record-actions'))continue;let type,id;
  if(el.dataset.recordKind){type=el.dataset.recordKind;id=el.dataset.recordKey}
  else if(el.dataset.invoice||el.dataset.saleInvoice){type='Sale';id=el.dataset.invoice||el.dataset.saleInvoice}
  else if(el.dataset.openGasReceipt){type='Gas receipt';id=el.dataset.openGasReceipt}
  else if(el.dataset.paymentReceipt){type='Customer payment';id=el.dataset.paymentReceipt}
  else if(el.dataset.supplierPrintId){type=el.dataset.supplierPrintType==='purchase'?'Supplier purchase':'Supplier payment';id=el.dataset.supplierPrintId}
  else{type=el.dataset.ledgerRecordType;id=el.dataset.ledgerRecordId;if(type==='Opening')type='Customer'}
  row.firstElementChild?.insertAdjacentHTML('beforeend',recordActions(type,id));
 }
}
const detailBeforeRecords=showDetail;
showDetail=function(title,html){detailBeforeRecords(title,html);decorateRecordControls(document.getElementById('form-fields'))};
const renderBeforeRecords=render;
render=function(){renderBeforeRecords();decorateRecordControls(document.getElementById('content'))};
document.addEventListener('click',e=>{
 const edit=e.target.closest('[data-edit-record]'),del=e.target.closest('[data-delete-record]');if(edit||del){e.preventDefault();e.stopImmediatePropagation();const button=edit||del;if(edit)openRecordEdit(button.dataset.editType,button.dataset.editRecord);else openRecordDelete(button.dataset.editType,button.dataset.deleteRecord);return}
 if(e.target.closest('#manage-records'))openRecordManager();
 if(e.target.closest('#confirm-record-delete'))commitRecordChange(true);
 if(e.target.closest('#record-download-previous')){const previous=localStorage.getItem('latif-lpg-before-record-change');if(previous)downloadText('latif-lpg-before-last-change.json',previous,'application/json');}
 if(e.target.closest('#record-backup-before-change'))downloadText('latif-lpg-before-change-'+today()+'.json',JSON.stringify(backupPayload(),null,2),'application/json');
},true);
document.addEventListener('submit',e=>{if(e.target.id!=='entry-form'||!['record-edit','record-manager','record-delete','record-reopen'].includes(action))return;e.preventDefault();e.stopImmediatePropagation();if(action==='record-edit')commitRecordChange();},true);
document.addEventListener('change',e=>{if(e.target.id==='manage-record-type'){recordManagerType=e.target.value;renderRecordManager()}});
document.addEventListener('input',e=>{if(e.target.id==='manage-record-search')renderRecordManager()});
