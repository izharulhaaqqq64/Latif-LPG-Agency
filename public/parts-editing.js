// Parts corrections use source movements; they never create a cash payment.
const fieldsBeforePartsEditing=editFields;editFields=function(type,r){
 let html=fieldsBeforePartsEditing(type,r);
 if(type==='Part'){const inv=partInventory(r.id);html+=`<fieldset class="part-stock-edit"><legend>Update parts stock</legend>${editNumber('Current stock quantity (pieces)','stockQty',inv.qty,false,true)}${field('Stock adjustment date','stockDate','date',today(),`max="${today()}"`)}${editNumber('Cost per added piece (Rs.)','stockCost',inv.average,true)}${editText('Adjustment note (optional)','stockNote','')}<p class="card-subtitle">Changing quantity records the difference as a stock adjustment. No sale, payment or customer debt is created.</p><button type="button" class="card-link" data-part-history="${esc(r.id)}">Edit stock purchases / costs ↗</button></fieldset>`}
 if(type==='Sale'&&!r.filledCylinderSale)html+=editText('Payment reference (optional)','saleReference',r.reference);
 if(type==='Sale'&&(r.directCash||r.filledCylinderSale&&!r.retailCredit)){if(r.filledCylinderSale)html+=editCustomer(r,true);html+=editNumber('Received at sale (Rs.)','editReceived',r.paid);}
 if(type==='Sale'&&r.partId){html+=editSelect('Part item','editPartId',state.partItems.map(p=>[p.id,p.name]),r.partId);const box=document.createElement('div');box.innerHTML=html;const rate=box.querySelector('[name=rate]');if(rate){rate.required=false;rate.closest('label').firstChild.textContent='Selling price per piece (Rs., optional)'}html=box.innerHTML;}
 return html;
};
const editBeforePartsEditing=applyRecordEdit;applyRecordEdit=function(t,f){
 if(t.type==='Sale'&&t.row.partId&&'rate' in f&&!String(f.rate).trim())f.rate=String(partsSellingPrice(f.editPartId||t.row.partId,''));
 editBeforePartsEditing(t,f);
 if(t.type==='Sale'){if('saleReference' in f)t.row.reference=(f.saleReference||'').trim();if('editReceived' in f){const paid=Number(f.editReceived);if(!Number.isFinite(paid)||paid<0||paid>total(t.row))throw Error('Received payment must be between zero and the sale total.');if(f.customer&&!customer(f.customer))throw Error('Choose a valid customer.');t.row.customer=f.customer||null;t.row.paid=roundAmount(paid);}if(t.row.paid<total(t.row)&&t.row.channel==='Retail'){const c=customer(t.row.customer);if(!c)throw Error('Choose a customer for the unpaid balance.');t.row.retailCredit=true;t.row.walkIn=true;c.retailKhata=true;c.khata=true;}}
 if(t.type==='Part'&&'stockQty' in f){
  const qty=Number(f.stockQty),inv=partInventory(t.id),delta=qty-inv.qty;
  if(!Number.isSafeInteger(qty)||qty<0)throw Error('Enter a whole stock quantity of zero or more.');
  if(delta){validateSaleDate(f.stockDate);assertDateOpen(f.stockDate);const cost=f.stockCost===''||f.stockCost==null?inv.average:Number(f.stockCost);if(!Number.isFinite(cost)||cost<0)throw Error('Enter a valid cost per added piece.');state.partMovements.push({id:crypto.randomUUID(),part:t.id,date:f.stockDate,createdAt:new Date().toISOString(),direction:delta>0?'In':'Out',qty:Math.abs(delta),cost:delta>0?cost:inv.average,stockAdjustment:true,note:(f.stockNote||'').trim()||'Physical parts stock correction'});
  }
 }
 if(t.type==='Sale'&&t.row.partId){
  const part=state.partItems.find(p=>p.id===(f.editPartId||t.row.partId));if(!part)throw Error('Select a part item.');
  const withoutSale={...state,partMovements:state.partMovements.filter(m=>m.invoice!==t.id)},inv=assertPartSaleStock(part.id,t.row.qty,t.row.date,withoutSale);
  Object.assign(t.row,{partId:part.id,item:part.name,costPerUnit:inv.average});
  for(const m of state.partMovements.filter(m=>m.invoice===t.id))Object.assign(m,{part:part.id,cost:inv.average});
 }
};
function openPartHistory(id){const part=state.partItems.find(p=>p.id===id);if(!part)return;action='part-stock-history';showDetail('Stock history · '+part.name,recordsTable(businessRecords().filter(r=>r.type==='Parts movement'&&r.row.part===id)));document.querySelector('.dialog-actions').style.display='none'}
document.addEventListener('click',e=>{const b=e.target.closest('[data-part-history]');if(b)openPartHistory(b.dataset.partHistory)});
// Keep payment references editable alongside amount/date/method.
const fieldsBeforeReferences=editFields;editFields=function(type,r){return fieldsBeforeReferences(type,r)+(['Customer payment','Supplier payment','Expense'].includes(type)?editText('Transaction reference (optional)','editReference',r.reference):'')};
const editBeforeReferences=applyRecordEdit;applyRecordEdit=function(t,f){editBeforeReferences(t,f);if('editReference' in f)t.row.reference=(f.editReference||'').trim()};
