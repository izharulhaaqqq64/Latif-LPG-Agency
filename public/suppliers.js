state.suppliers ??= [];
state.supplierPurchases ??= [];
state.supplierPayments ??= [];
let supplierFilter='';
function shiftISODate(date,days){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function supplierBalance(id,end='9999-12-31'){
 const supplier=state.suppliers.find(s=>s.id===id);if(!supplier)return 0;
 return roundAmount((supplier.date<end?supplier.opening:0)+state.supplierPurchases.filter(p=>p.supplier===id&&p.date<end).reduce((a,p)=>a+p.total-p.paid,0)-state.supplierPayments.filter(p=>p.supplier===id&&p.date<end).reduce((a,p)=>a+p.amount,0));
}
function supplierCashPaid(start,end){return roundAmount(state.supplierPurchases.filter(p=>p.date>=start&&p.date<end&&p.method==='Cash').reduce((a,p)=>a+p.paid,0)+state.supplierPayments.filter(p=>p.date>=start&&p.date<end&&p.method==='Cash').reduce((a,p)=>a+p.amount,0))}
function supplierRows(id=''){
 return [...state.suppliers.filter(s=>!id||s.id===id).filter(s=>s.opening).map(s=>({date:s.date,createdAt:new Date(s.date+'T00:00:00+05:00').toISOString(),supplier:s.id,note:'Opening supplier balance',credit:s.opening,debit:0})),...state.supplierPurchases.filter(p=>!id||p.supplier===id).map(p=>({purchaseId:p.id,date:p.date,createdAt:p.createdAt,supplier:p.supplier,note:p.kind+' purchase · '+p.reference,credit:p.total,debit:p.paid})),...state.supplierPayments.filter(p=>!id||p.supplier===id).map(p=>({paymentId:p.id,date:p.date,createdAt:p.createdAt,supplier:p.supplier,note:'Payment · '+p.method+' · '+p.note,credit:0,debit:p.amount}))].sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt));
}
function supplierCreditPage(){
 const rows=supplierRows(supplierFilter);let balance=0;const totalCredit=roundAmount(rows.reduce((a,r)=>a+r.credit,0)),totalDebit=roundAmount(rows.reduce((a,r)=>a+r.debit,0));
 return `<div class="section-toolbar"><label class="field">Supplier<select id="supplier-filter"><option value="">All suppliers</option>${state.suppliers.map(s=>`<option value="${s.id}" ${supplierFilter===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label><div><button class="button secondary" data-action="supplier-new">＋ Supplier</button><button class="button primary" data-action="supplier-purchase">Buy on credit</button><button class="button secondary" data-action="supplier-payment">Pay supplier</button></div></div><div class="stats">${stat('Purchases / opening credit',money(totalCredit),'↗','Amounts charged by suppliers')}${stat('Payments / debit',money(totalDebit),'↙','Initial and later supplier payments')}${stat('Balance payable',money(roundAmount(totalCredit-totalDebit)),'▤','What your business owes suppliers')}</div><article class="card">${table(['DATE','SUPPLIER','DESCRIPTION','CREDIT / PURCHASE','DEBIT / PAYMENT','BALANCE PAYABLE'],rows.map(r=>{balance=roundAmount(balance+r.credit-r.debit);return `<tr><td>${r.date}</td><td><strong>${esc(state.suppliers.find(s=>s.id===r.supplier)?.name||'')}</strong></td><td>${esc(r.note)}${r.purchaseId||r.paymentId?'<br><button class="card-link" data-supplier-print-type="'+(r.purchaseId?'purchase':'payment')+'" data-supplier-print-id="'+esc(r.purchaseId||r.paymentId)+'">Print receipt</button>':''}</td><td>${money(r.credit)}</td><td>${money(r.debit)}</td><td><strong>Rs. ${money(balance)}</strong></td></tr>`}))}</article><p class="card-subtitle">This is supplier credit: gas or parts your business bought on debt. Purchases add inventory once. Supplier payments reduce debt; they are not operating expenses or revenue.</p>`;
}
function supplierPurchaseFields(kind){
 if(kind==='Gas')return `<div class="field-row">${select('Cylinder size','capacity',FULL_STOCK_SIZES.map(size=>[size,size+' kg']))}${field('Full cylinder quantity','qty','number','','min="1" step="1"')}</div>`+field('Gas price per 11.8 kg unit (Rs.)','rate','number','','min="0.01" step="0.01"')+select('Receive gas at','warehouse',['Main godown','Shop','Supply vehicle']);
 return select('Part item','part',state.partItems.length?state.partItems.map(p=>[p.id,p.name]):[['','Create a part in Gas parts first']])+field('Part quantity','qty','number','','min="1" step="1"')+field('Purchase cost per piece (Rs.)','rate','number','','min="0" step="0.01"');
}
function supplierFormTotal(form){
 const quantity=Number(form.elements.qty?.value||0),rate=Number(form.elements.rate?.value||0);
 return roundAmount(form.elements.kind.value==='Gas'?quantity*Number(form.elements.capacity.value)/GAS_UNIT_KG*rate:quantity*rate);
}
function openSupplierForm(kind){
 action=kind;let title='',html='';
 const choices=state.suppliers.map(s=>[s.id,s.name]),selectSupplier=()=>select('Supplier','supplier',choices);
 if(kind!=='supplier-new'&&!choices.length){toast('Add a supplier first.');return}
 if(kind==='supplier-new'){title='Add supplier';html=field('Supplier name','name','text','','maxlength="80"')+`<label class="field">Phone (optional)<input name="phone" maxlength="25"></label>`+field('Opening amount owed (Rs.)','opening','number','0','min="0" step="0.01"')+field('Opening balance date','date','date',today(),`max="${today()}"`)+'<p class="card-subtitle">For credit stock already entered elsewhere, use the existing amount owed as opening balance. This does not add inventory again.</p>'}
 if(kind==='supplier-purchase'){
  title='Gas / parts credit purchase';html=selectSupplier()+field('Purchase date','date','date',today(),`max="${today()}"`)+select('Purchase type','kind',['Gas','Parts'])+`<div id="supplier-purchase-fields">${supplierPurchaseFields('Gas')}</div><div class="sale-totals"><span>Total purchase<strong id="supplier-total">Rs. 0</strong></span><span>Credit remaining<strong id="supplier-due">Rs. 0</strong></span></div>`+field('Paid now (Rs.) — 0 for full credit','paid','number','0','min="0" step="0.01"')+select('Payment method','method',['Cash','Bank transfer','Easypaisa / JazzCash'])+field('Bill / reference','reference','text','','maxlength="150"')+'<p class="card-subtitle">Gas cylinders and kg, or part stock and cost, are added once when saved. For parts, create the item with zero opening stock first. Do not also enter the same purchase in Gas calculator or Gas parts.</p>';
 }
 if(kind==='supplier-payment')title='Pay supplier',html=selectSupplier()+field('Payment date','date','date',today(),`max="${today()}"`)+field('Amount paid (Rs.)','amount','number','','min="0.01" step="0.01"')+select('Payment method','method',['Cash','Bank transfer','Easypaisa / JazzCash'])+field('Note / reference','note','text','Supplier payment','maxlength="150"');
 document.getElementById('dialog-title').textContent=title;document.getElementById('form-fields').innerHTML=html;document.getElementById('form-error').textContent='';document.querySelector('.dialog-actions').style.display='flex';document.getElementById('entry-dialog').showModal();if(supplierFilter&&kind!=='supplier-new')document.getElementById('entry-form').elements.supplier.value=supplierFilter;
}
function submitSupplierForm(e){
 const before=structuredClone(state),f=Object.fromEntries(new FormData(e.target)),date=f.date;
 try{
  validateSaleDate(date);assertDateOpen(date);const createdAt=new Date().toISOString();
  if(action==='supplier-new'){
   const opening=Number(f.opening),name=f.name.trim();if(!name||!Number.isFinite(opening)||opening<0)throw Error('Enter a supplier name and a valid opening balance.');if(state.suppliers.some(s=>s.name.toLowerCase()===name.toLowerCase()))throw Error('This supplier already exists.');const row={id:crypto.randomUUID(),name,phone:f.phone.trim(),opening:roundAmount(opening),date,createdAt};state.suppliers.push(row);supplierFilter=row.id;
  }else{
   const supplier=state.suppliers.find(s=>s.id===f.supplier);if(!supplier)throw Error('Select a supplier.');if(date<supplier.date)throw Error('The date cannot precede the supplier opening balance date.');
   if(action==='supplier-payment'){
    const amount=roundAmount(Number(f.amount)),available=Math.min(supplierBalance(supplier.id),supplierBalance(supplier.id,shiftISODate(date,1)));if(!Number.isFinite(amount)||amount<=0||amount>available)throw Error('Payment must be positive and cannot exceed the supplier debt on that date.');state.supplierPayments.push({id:crypto.randomUUID(),supplier:supplier.id,date,createdAt,amount,method:f.method,note:f.note.trim()});
   }else{
    const qty=Number(f.qty),rate=Number(f.rate),paid=roundAmount(Number(f.paid));if(!Number.isSafeInteger(qty)||qty<=0||!Number.isFinite(rate)||rate<0||!Number.isFinite(paid)||paid<0)throw Error('Enter valid quantity, price and payment.');
    if(!['Gas','Parts'].includes(f.kind))throw Error('Select gas or parts.');let totalCost,receipt,part;
    if(f.kind==='Gas'){
     if(!FULL_STOCK_SIZES.includes(f.capacity)||rate<=0||!['Main godown','Shop','Supply vehicle'].includes(f.warehouse))throw Error('Select a valid cylinder size, price and location.');const plantPurchase=calculatePlantPurchase([{capacity:f.capacity,quantity:String(qty)}],rate);totalCost=plantPurchase.totalCost;receipt={id:crypto.randomUUID(),date,createdAt,warehouse:f.warehouse,qty:plantPurchase.kg,purchaseCost:totalCost,plantPurchase,note:'Supplier credit · '+supplier.name+' · '+f.reference};
    }else{part=state.partItems.find(p=>p.id===f.part);if(!part)throw Error('Create and select a part item first.');totalCost=roundAmount(qty*rate)}
    if(paid>totalCost)throw Error('Paid amount cannot exceed purchase total.');const purchase={id:crypto.randomUUID(),supplier:supplier.id,date,createdAt,kind:f.kind,qty,rate,total:totalCost,paid,method:f.method,reference:f.reference.trim()};
    if(receipt){receipt.supplierPurchase=purchase.id;state.stock.unshift(receipt);recordPlantCylinderReceipt(receipt);purchase.stockId=receipt.id;purchase.capacity=f.capacity}
    else{const movement={id:crypto.randomUUID(),part:part.id,direction:'In',qty,cost:rate,date,createdAt,supplierPurchase:purchase.id};state.partMovements.push(movement);purchase.part=part.id;purchase.partMovementId=movement.id}
    state.supplierPurchases.push(purchase);
   }
   supplierFilter=supplier.id;
  }
  save();document.getElementById('entry-dialog').close();render();toast('Supplier account and inventory updated.');
 }catch(err){state=before;document.getElementById('form-error').textContent=err.message}
}
document.addEventListener('change',e=>{
 if(e.target.id==='supplier-filter'){supplierFilter=e.target.value;render()}
 if(action==='supplier-purchase'&&e.target.name==='kind')document.getElementById('supplier-purchase-fields').innerHTML=supplierPurchaseFields(e.target.value);
 updateSupplierTotals();
});
function updateSupplierTotals(){const form=document.getElementById('entry-form');if(action!=='supplier-purchase'||!form.querySelector('#supplier-total'))return;const total=supplierFormTotal(form);document.getElementById('supplier-total').textContent='Rs. '+money(total);document.getElementById('supplier-due').textContent='Rs. '+money(roundAmount(total-Number(form.elements.paid.value||0)))}
document.addEventListener('input',e=>{if(e.target.closest('#entry-form'))updateSupplierTotals()});
