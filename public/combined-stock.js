// One operational inventory. Keep historical metadata in backups, never repost stock.
const combinedStockEnabled=true;
const fullStockBeforeCombined=fullCylinderStock;
function ensureCombinedStock(data){
 if(data.combinedStockVersion===1){if(!data.combinedLegacySources){const ids=new Set(data.combinedLegacyMovements);data.combinedLegacySources=[...new Set(data.fullCylinderMovements.filter(r=>ids.has(r.id)).flatMap(r=>[...(r.source?['source:'+r.source]:[]),...(r.invoice?['invoice:'+r.invoice]:[])]))]}return data;}
 data.combinedStockVersion=1;data.combinedStockAt=new Date().toISOString();
 data.combinedLegacyCounts=data.fullCylinderCounts.map(r=>r.id);data.combinedLegacyMovements=data.fullCylinderMovements.map(r=>r.id);data.combinedLegacySources=[...new Set(data.fullCylinderMovements.flatMap(r=>[...(r.source?['source:'+r.source]:[]),...(r.invoice?['invoice:'+r.invoice]:[])]))];return data;
}
ensureCombinedStock(state);
function combinedIsLegacy(row,ids,sources){return ids.has(row.id)||!!row.source&&sources.has('source:'+row.source)||!!row.invoice&&sources.has('invoice:'+row.invoice)}
fullCylinderStock=function(size,variant=null,data=state){
 ensureCombinedStock(data);const countIds=new Set(data.combinedLegacyCounts),moveIds=new Set(data.combinedLegacyMovements),sourceIds=new Set(data.combinedLegacySources);
 const legacyCounts=data.fullCylinderCounts.filter(r=>combinedIsLegacy(r,countIds,sourceIds)),legacyMoves=data.fullCylinderMovements.filter(r=>combinedIsLegacy(r,moveIds,sourceIds));
 const old=fullStockBeforeCombined(size,null,{...data,fullCylinderCounts:legacyCounts,fullCylinderMovements:legacyMoves});
 let qty=old.qty,known=old.known,recorded=old.recorded,stamp=old.stamp||'';
 const events=[...data.fullCylinderCounts.filter(r=>!r.migrationArchived&&r.capacity===size&&!combinedIsLegacy(r,countIds,sourceIds)).map((r,i)=>({kind:'count',r,i})),...data.fullCylinderMovements.filter(r=>r.capacity===size&&!combinedIsLegacy(r,moveIds,sourceIds)).map((r,i)=>({kind:'move',r,i}))].sort((a,b)=>(a.r.createdAt||a.r.date).localeCompare(b.r.createdAt||b.r.date)||(a.kind===b.kind?a.i-b.i:a.kind==='count'?-1:1));
 for(const {kind,r} of events){recorded=true;if(kind==='count'){qty=r.qty-(r.stockDeficit||0);known=!r.estimated;stamp=r.createdAt||''}else qty+=(r.direction==='In'?1:-1)*r.qty}
 return {qty,known,recorded,stamp};
};
const backupBeforeCombined=validateBackup;validateBackup=function(payload){const data=backupBeforeCombined(payload);if(data.combinedStockVersion!=null){if(data.combinedLegacySources!=null&&(!Array.isArray(data.combinedLegacySources)||data.combinedLegacySources.length>200000||data.combinedLegacySources.some(id=>typeof id!=='string')))throw Error('Invalid combined-stock sources.');if(data.combinedStockVersion!==1||!Number.isFinite(Date.parse(data.combinedStockAt))||!['combinedLegacyCounts','combinedLegacyMovements'].every(key=>Array.isArray(data[key])&&data[key].length<=100000&&data[key].every(id=>typeof id==='string')&&new Set(data[key]).size===data[key].length))throw Error('Invalid combined-stock history.')}return ensureCombinedStock(data)};
const locationStockBeforeCombined=locationStock;
locationStock=function(){return gasStock()};
cylinderTypeBalance=function(id,size){return cylinderSizeBalance(id,size)};
const balanceEventsBeforeCombined=balanceEvents;
balanceEvents=function(data,kind){
 const old=balanceEventsBeforeCombined(data,kind);
 if(kind==='gas')return new Map([['Combined stock',[...old.values()].flat()]]);
 if(kind==='cylinders'){const out=new Map();for(const [key,rows] of old){const k=key.split('|').slice(0,2).join('|');if(!out.has(k))out.set(k,[]);out.get(k).push(...rows)}return out}
 return old;
};
const stockEventsBeforeCombined=stockCountEvents;
stockCountEvents=function(data,empty){
 if(empty)return stockEventsBeforeCombined(data,true);
 ensureCombinedStock(data);const out=new Map();
 for(const size of FULL_STOCK_SIZES){const dates=[...new Set([...data.fullCylinderCounts,...data.fullCylinderMovements].filter(r=>!r.migrationArchived&&r.capacity===size).map(r=>r.date))].sort(),rows=[];let previous=0;
  for(const date of dates){const s=fullCylinderStock(size,null,{...data,fullCylinderCounts:data.fullCylinderCounts.filter(r=>r.date<=date),fullCylinderMovements:data.fullCylinderMovements.filter(r=>r.date<=date)});if(s.known){rows.push({date,qty:s.qty-previous});previous=s.qty}}
  if(rows.length)out.set(size,rows);
 }return out;
};
const locationsBeforeCombined=cylinderLocationStock;
cylinderLocationStock=function(data=state){return Object.fromEntries(FULL_STOCK_SIZES.map(size=>{const s=fullCylinderStock(size,null,data);return [size,{Shop:s.qty,'Main godown':0,'Supply vehicle':0,Unassigned:0,total:s.qty,known:s.known,recorded:s.recorded}]}))};
const emptyLocationsBeforeCombined=emptyCylinderLocationStock;
emptyCylinderLocationStock=function(data=state){return Object.fromEntries(FULL_STOCK_SIZES.map(size=>{const o=data.emptyCylinderOpening[size],qty=(o?.qty||0)-(o?.stockDeficit||0)+data.emptyCylinderMovements.filter(m=>m.capacity===size&&(!o?.asOf||m.createdAt>o.asOf)).reduce((a,m)=>a+(m.direction==='In'?1:-1)*m.qty,0);return [size,{Shop:qty,'Main godown':0,'Supply vehicle':0,Unassigned:0,total:qty}]}))};
cylinderLocationPanel=function(){return ''};emptyLocationsPanel=function(){return ''};
function simplifyStockDimensions(root){
 if(!root)return;
 // Keep schema-compatible fields private; old records retain their saved values.
 for(const el of root.querySelectorAll('[name=warehouse],[name=variant],[name=cylinderType],[name=returnedVariant],[name^="cyl_type_"]')){const label=el.closest('label');if(label){label.hidden=true;label.classList.add('legacy-stock-dimension')}}
 const form=document.getElementById('entry-form');if(form?.dataset.simpleSupply&&form.elements.channel){const label=form.elements.channel.closest('label');label.hidden=true;label.classList.add('legacy-stock-dimension')}
 root.querySelectorAll('.cylinder-location-panel,.empty-location-panel,#assign-cylinder-location,[data-correct-location-kind]').forEach(n=>n.remove());
 root.querySelectorAll('small').forEach(n=>{if(/^Original:\s*-?\d/.test(n.textContent)||n.closest('#gas-receipts')&&['Main godown','Shop','Supply vehicle'].includes(n.textContent.trim()))n.remove()});
 for(const table of root.querySelectorAll('table')){
  const headers=[...table.querySelectorAll('thead th')];const remove=[];
  headers.forEach((h,i)=>{const text=h.textContent.trim().toUpperCase();if(text==='LOCATION'||text==='TYPE'&&[...table.querySelectorAll('tbody tr')].some(tr=>['Original','Local','Unspecified'].includes(tr.children[i]?.textContent.trim())))remove.push(i);if(text==='SIZE / VARIANT')h.textContent='SIZE'});
  for(const i of remove.reverse())for(const tr of table.querySelectorAll('tr'))tr.children[i]?.remove();
 }
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const changes=[];
 while(walker.nextNode()){const n=walker.currentNode;if(n.parentElement.closest('input,textarea,script,style,.legacy-stock-dimension'))continue;let text=n.textContent;
  text=text.replace(/\s*[··]\s*(Original|Local)\b/g,'').replace(/\bkg\s+(Original|Local)\b/g,'kg').replace(/\s*\((Original|Local)\)/g,'').replace(/Variant:\s*(Original|Local)\s*/g,'').replace(/Location:\s*(Main godown|Supply vehicle|Shop)/g,'');
  if(text!==n.textContent)changes.push([n,text]);
 }
 changes.forEach(([n,t])=>n.textContent=t);
 root.querySelectorAll('#linked-stock-preview').forEach(n=>n.textContent=n.textContent.replace(/ · (Shop|Main godown|Supply vehicle):/g,' · Stock after update:'));
 root.querySelectorAll('.card-subtitle').forEach(n=>{const text=n.textContent.replace(/Select a size, variant, location and whole quantity\./g,'Select a cylinder size and whole quantity.').replace(/Size and variant stay fixed/g,'Cylinder size stays fixed').replace(/at the selected location/g,'in combined stock').replace(/Choose the correct dispatch location or update stock first\./g,'Update cylinder stock first.');if(text!==n.textContent)n.textContent=text});
 root.querySelectorAll('#manage-record-type option').forEach(o=>{if(o.value==='Cylinder location')o.remove()});
}
const detailBeforeCombined=showDetail;showDetail=function(title,html){detailBeforeCombined(title,html);simplifyStockDimensions(document.getElementById('form-fields'))};
function simplifyAfter(fn){return function(...args){const r=fn(...args);simplifyStockDimensions(document.getElementById('form-fields'));return r}}
openForm=simplifyAfter(openForm);openRecordEdit=simplifyAfter(openRecordEdit);openSimpleSupply=simplifyAfter(openSimpleSupply);openCylinderReceipt=simplifyAfter(openCylinderReceipt);reviewPlantPurchase=simplifyAfter(reviewPlantPurchase);openSupplierForm=simplifyAfter(openSupplierForm);openStockProfitForm=simplifyAfter(openStockProfitForm);
const exchangeBeforeCombined=updateExchangeForm;updateExchangeForm=function(f){exchangeBeforeCombined(f);if(f?.elements.securityRate&&!f.elements.securityRate.value){const size=f.elements.capacity.value;f.elements.securityRate.value=state.securityRates[size+'|Original']||state.securityRates[size+'|Local']||''}simplifyStockDimensions(f)};
const renderBeforeCombined=render;render=function(){renderBeforeCombined();simplifyStockDimensions(document.getElementById('content'));simplifyStockDimensions(document.getElementById('form-fields'));if(page==='Gas & inventory')document.getElementById('page-description').textContent='One combined gas stock, cylinder counts and purchases.';if(page==='Cylinder tracking')document.getElementById('page-description').textContent='Cylinders by size: available full, empty and with customers.';if(page==='Stock')document.getElementById('page-description').textContent='Combined gas, cylinders and parts.'};
document.addEventListener('change',e=>{if(e.target.closest('#entry-form,#walkin-sale-form'))simplifyStockDimensions(e.target.closest('form'))});
// Raw rows retain old labels for recovery; generated search text uses combined stock.
const recordsBeforeCombined=businessRecords;businessRecords=function(){return recordsBeforeCombined().filter(r=>r.type!=='Cylinder location').map(r=>{const row=r.row;if(!row)return r;let text=r.text;if(r.type==='Gas receipt')text=`${row.qty} kg ${row.note||''} ${(row.plantPurchase?.lines||[]).map(l=>l.capacity+' kg').join(' ')}`;if(r.type==='Cylinder purchase')text=`${row.qty} × ${row.capacity} kg empty containers ${row.supplierName||''} ${row.note||''}`;if(r.type==='Cylinder movement')text=`${customer(row.customer)?.name||''} ${row.direction} ${row.qty} cylinders ${row.capacity||''} kg ${row.note||''}`;if(r.type==='Gas stock correction')text=`${row.qty} kg correction · ${row.capacity} kg cylinders`;if(r.type==='Security deposit')text=`Invoice ${row.invoice} ${row.name||'Receipt bearer'} ${row.phone||''} ${row.qty} × ${row.capacity} kg ${row.method}`;return {...r,text}})};
render();
document.addEventListener('click',()=>{if(document.getElementById('entry-dialog').open)simplifyStockDimensions(document.getElementById('form-fields'))});
