state.residualSettings ??= {gramsPerCylinder:400};
let residualMemo=null;
function residualBatchInfo(receipt){
 const p=receipt.residualPolicy;if(!p?.enabled)return {count:0,gross:Math.round(receipt.qty*1000),reserve:0,usable:Math.round(receipt.qty*1000)};
 const count=receipt.plantPurchase?receipt.plantPurchase.lines.reduce((a,l)=>a+Number(l.quantity||0),0):Number(p.cylinderCount||0),gross=Math.round(receipt.qty*1000),reserve=Math.round(count*p.gramsPerCylinder);
 return {count,gross,reserve,usable:gross-reserve};
}
function isRetailKgSale(s,data=state){if(s.kind!=='Gas'||s.channel!=='Retail'||s.saleBasis==='Full cylinder'||s.filledCylinderSale)return false;if(s.saleBasis==='Per KG')return true;return !(s.cylOut>0&&(s.fullDispatch===true||s.fullDispatch==='on'))&&!(data.cylinders||[]).some(c=>c.invoice===s.id&&(c.fullDispatch===true||c.fullDispatch==='on'));}
function automaticResidual(data=state){
 if(!data.stock.some(r=>r.residualPolicy?.enabled))return {losses:[],batches:[],shortages:[]};
 const signature=JSON.stringify([data.stock.map(r=>[r.id,r.qty,r.date,r.createdAt,r.warehouse,r.plantPurchase?.lines,r.residualPolicy]),data.sales.filter(s=>s.kind==='Gas').map(s=>[s.id,s.qty,s.date,s.createdAt,s.time,s.channel,s.saleBasis,s.cylOut,s.fullDispatch]),(data.gasLosses||[]).map(l=>[l.id,l.qty,l.date,l.createdAt,l.warehouse]),(data.cylinders||[]).map(c=>[c.invoice,c.fullDispatch])]);
 if(residualMemo?.signature===signature)return residualMemo.result;
 const locations=new Map(),losses=[],shortages=[],batches=[];
 const location=name=>{if(!locations.has(name))locations.set(name,{batches:[],saleIndex:0,lossIndex:0,debt:0,active:false});return locations.get(name)};
 const events=[...data.stock.map(row=>({kind:'stock',row})),...data.sales.filter(s=>s.kind==='Gas'&&s.qty>0).map(row=>({kind:'sale',row})),...(data.gasLosses||[]).map(row=>({kind:'manual',row}))].sort((a,b)=>a.row.date.localeCompare(b.row.date)||eventTime(a.row,a.kind==='sale')-eventTime(b.row,b.kind==='sale')||({stock:0,manual:1,sale:2}[a.kind]-{stock:0,manual:1,sale:2}[b.kind])||a.row.id.localeCompare(b.row.id));
 function removeGross(batch,grams){const take=Math.min(grams,batch.usable+batch.reserve);let net=Math.min(batch.usable,Math.round(take*batch.usable/(batch.usable+batch.reserve||1))),residual=take-net;if(residual>batch.reserve){net+=residual-batch.reserve;residual=batch.reserve}batch.usable-=net;batch.reserve-=residual;return take;}
 for(const {kind,row:r} of events){
  const name=kind==='sale'?(r.channel==='Wholesale'?'Main godown':r.channel==='Supply'?'Supply vehicle':'Shop'):r.warehouse,loc=location(name);
  if(kind==='stock'){
   const info=residualBatchInfo(r),batch={receipt:r,usable:info.usable,reserve:info.reserve,count:info.count,expected:info.reserve,gross:info.gross,recognized:0};
   if(loc.debt){loc.debt-=removeGross(batch,loc.debt)}loc.batches.push(batch);batches.push(batch);if(r.residualPolicy?.enabled)loc.active=true;continue;
  }
  const retail=kind==='sale'&&isRetailKgSale(r,data);let remaining=Math.round(r.qty*1000),index=retail?'saleIndex':'lossIndex';
  while(remaining>0){const batch=loc.batches[loc[index]];if(!batch)break;if((retail?batch.usable:batch.usable+batch.reserve)<=0){loc[index]++;continue}
   if(!retail){remaining-=removeGross(batch,remaining);continue}
   const net=Math.min(remaining,batch.usable),loss=net===batch.usable?batch.reserve:Math.min(batch.reserve,Math.round(net*batch.reserve/batch.usable));batch.usable-=net;batch.reserve-=loss;batch.recognized+=loss;remaining-=net;
   if(loss)losses.push({id:'auto-'+batch.receipt.id+'-'+r.id,sourceReceipt:batch.receipt.id,sourceSale:r.id,date:r.date,createdAt:r.createdAt,warehouse:name,capacity:batch.receipt.plantPurchase?.lines.length===1?String(batch.receipt.plantPurchase.lines[0].capacity):batch.receipt.residualPolicy?.capacity||'mixed',cylinders:batch.count,gramsPerCylinder:batch.receipt.residualPolicy.gramsPerCylinder,qty:loss/1000,basis:'Automatic estimate',note:'Proportional residual on invoice #'+r.id,automatic:true});
  }
  if(remaining){if(loc.active)shortages.push({warehouse:name,date:r.date,qty:remaining/1000,kind});loc.debt+=remaining;}
 }
 const result={losses,batches,shortages};residualMemo={signature,result};return result;
}
function retailUsableGas(warehouse=null){const reserve=automaticResidual().batches.filter(b=>!warehouse||b.receipt.warehouse===warehouse).reduce((a,b)=>a+b.reserve,0)/1000;return roundKg(Math.max(0,(warehouse?locationStock(warehouse):gasStock())-reserve));}
function allGasLosses(data=state){return [...(data.gasLosses||[]),...automaticResidual(data).losses]}
function validateAutomaticResidual(data=state){const result=automaticResidual(data);if(result.shortages.length){const r=result.shortages[0];throw Error('Not enough usable gas in '+r.warehouse+' on '+r.date+' after residual allowance. Reduce KG or add a correctly dated purchase.');}}
function residualPolicyFields(receipt=null,newPurchase=false){const policy=receipt?.residualPolicy,enabled=policy?policy.enabled:newPurchase,grams=policy?.gramsPerCylinder??state.residualSettings.gramsPerCylinder;return `<fieldset class="residual-policy"><legend>Automatic residual allowance</legend><label class="check-field"><input type="checkbox" name="residualEnabled" ${enabled?'checked':''}> Calculate residual automatically as this batch is sold</label><label class="field">Estimated grams left per cylinder<input type="number" name="residualGrams" min="0" step="1" value="${grams}"></label>${receipt&&!receipt.plantPurchase?editNumber('Actual cylinder count for this KG receipt (needed if enabled)','residualCylinderCount',policy?.cylinderCount,true,true)+editSelect('Cylinder size','residualCapacity',CYLINDER_SIZES,policy?.capacity||'15'):''}<p class="card-subtitle">400 g is an editable estimate within the usual 300–500 g range. Expected loss uses actual cylinder counts, not total KG alone. It is charged proportionally only on retail per-KG sales, not wholesale/full-cylinder sales or all at purchase. Old batches stay unchanged unless enabled explicitly.</p></fieldset>`;}
function applyPurchaseResidual(receipt,f,keepDefault=true){
 const enabled=f.residualEnabled==='on',grams=Number(f.residualGrams??state.residualSettings.gramsPerCylinder);if(!Number.isFinite(grams)||grams<0||grams>10000)throw Error('Enter valid residual grams per cylinder.');
 const policy={enabled,gramsPerCylinder:grams};if(!receipt.plantPurchase){policy.cylinderCount=Number(f.residualCylinderCount||0);policy.capacity=f.residualCapacity||'15';}
 receipt.residualPolicy=policy;const info=residualBatchInfo(receipt);if(enabled&&(!Number.isSafeInteger(info.count)||info.count<=0||info.reserve>=info.gross||info.reserve<0))throw Error('Enter the actual cylinder count; residual must be less than gross purchased gas.');
 if(enabled&&keepDefault)state.residualSettings.gramsPerCylinder=grams;
}
function addResidualForm(){document.getElementById('form-fields').insertAdjacentHTML('beforeend',residualPolicyFields(null,true));}
const receiptBeforeResidual=openCylinderReceipt;openCylinderReceipt=function(){receiptBeforeResidual();addResidualForm()};
const plantBeforeResidual=reviewPlantPurchase;reviewPlantPurchase=function(){plantBeforeResidual();addResidualForm()};
const supplierFieldsBeforeResidual=supplierPurchaseFields;supplierPurchaseFields=function(kind){return supplierFieldsBeforeResidual(kind)+(kind==='Gas'?residualPolicyFields(null,true):'')};
const editorBeforeResidual=editFields;editFields=function(type,r){const html=editorBeforeResidual(type,r);if(type==='Gas receipt')return html+residualPolicyFields(r,false);if(type==='Supplier purchase'&&r.kind==='Gas'){const receipt=state.stock.find(s=>s.id===r.stockId);return html+residualPolicyFields(receipt,false)}return html};
const applyEditorBeforeResidual=applyRecordEdit;applyRecordEdit=function(target,f){applyEditorBeforeResidual(target,f);const receipt=target.type==='Gas receipt'?target.row:target.type==='Supplier purchase'&&target.row.kind==='Gas'?state.stock.find(s=>s.id===target.row.stockId):null;if(receipt)applyPurchaseResidual(receipt,f,false);};
function batchResidualPanel(){const info=automaticResidual(),active=info.batches.filter(b=>b.receipt.residualPolicy?.enabled);return `<article class="card residual-batches"><h2>Automatic batch residual</h2><p class="card-subtitle">FIFO by location. Only retail per-KG sales create automatic loss; wholesale, supply and full-cylinder sales do not. Gross gas includes remaining trapped gas; estimated usable gas excludes the residual reserve. Loss appears in reports as gas is sold. Manual wastage is additional and must not repeat this automatic allowance.</p>${table(['BATCH','GROSS PURCHASED KG','CYLINDERS','INITIAL RETAIL ALLOWANCE KG','RECOGNIZED LOSS KG','REMAINING USABLE KG',''],active.map(b=>`<tr><td>${esc(b.receipt.date)}<small>${esc(b.receipt.warehouse)}</small></td><td>${gasNumber(b.gross/1000)}</td><td>${b.count}</td><td>${gasNumber(b.expected/1000)}</td><td>${gasNumber(b.recognized/1000)}</td><td>${gasNumber(b.usable/1000)}</td><td>${recordActions('Gas receipt',b.receipt.id)}</td></tr>`))}</article>`;}
const inventoryBeforeAutomatic=inventoryPage;inventoryPage=function(){return inventoryBeforeAutomatic().replace('<div class="stats">','<div class="stats">'+stat('Estimated retail-usable gas',gasNumber(retailUsableGas()),'◫','After unrecognized trapped-gas reserve','kg'))+batchResidualPanel()};

document.addEventListener('click',e=>{if(e.target.closest('#show-stock-residue'))document.querySelector('.gas-loss-panel')?.scrollIntoView({behavior:'smooth',block:'start'})});
