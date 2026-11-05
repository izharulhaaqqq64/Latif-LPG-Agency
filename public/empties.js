state.emptyCylinderOpening ??= {};
state.emptyCylinderMovements ??= [];
function emptySizes(){return [...EMPTY_SALE_SIZES,...['unknown'].filter(size=>state.emptyCylinderOpening[size]||state.emptyCylinderMovements.some(m=>m.capacity===size))]}
function emptyQuantity(size){return (state.emptyCylinderOpening[size]?.qty||0)-(state.emptyCylinderOpening[size]?.stockDeficit||0)+state.emptyCylinderMovements.filter(m=>m.capacity===size&&(!state.emptyCylinderOpening[size]?.asOf||m.createdAt>state.emptyCylinderOpening[size].asOf)).reduce((a,m)=>a+(m.direction==='In'?m.qty:-m.qty),0)}
function emptyStockSummary(){
 const sizes=emptySizes(),complete=sizes.every(s=>state.emptyCylinderOpening[s]&&!state.emptyCylinderOpening[s].incomplete);
 let count=0,capacity=0,tare=0,weightKnown=complete,capacityKnown=complete;
 for(const size of sizes){const qty=emptyQuantity(size),opening=state.emptyCylinderOpening[size];count+=qty;if(size==='unknown'&&qty)capacityKnown=false;else capacity+=qty*(Number(size)||0);if(qty&&opening?.tareKg==null)weightKnown=false;else tare+=qty*(opening?.tareKg||0)}
 return {count,capacity,tare,complete,weightKnown,capacityKnown};
}
function emptyStockPanel(compact=false){
 const summary=emptyStockSummary();
 return `<article class="card empty-stock-panel"><div class="card-heading table-top"><div><h2>Empty cylinders available</h2><div class="card-subtitle">${summary.complete?summary.count+' empty cylinders recorded':'Opening inventory incomplete — recorded quantities shown below'}</div></div>${compact?'<button class="card-link" data-page="Cylinder tracking">Manage empty stock ↗</button>':'<div class="empty-actions"><button class="button secondary" data-action="empty-opening">Set opening stock</button><button class="button secondary" data-action="empty-tare">Tare weights</button><button class="button primary" data-action="empty-movement">Empty stock movement</button></div>'}</div>${table(['CYLINDER CAPACITY','EMPTY QUANTITY','EMPTY / TARE KG EACH','TOTAL EMPTY WEIGHT'],emptySizes().map(size=>{const opening=state.emptyCylinderOpening[size],qty=emptyQuantity(size);return `<tr ${opening?'data-record-kind="Empty opening" data-record-key="'+esc(size)+'"':''}><td><strong>${capacityLabel(size)}</strong></td><td>${qty} pcs${opening?'':'<small>Opening balance not set</small>'}</td><td>${opening?.tareKg!=null?money(opening.tareKg)+' kg':'Not entered'}</td><td>${opening&&(!qty||opening.tareKg!=null)?money(qty*(opening.tareKg||0))+' kg':'Not known'}</td></tr>`}))}<div class="cash-day-total"><span>${summary.complete?'Total empty cylinders':'Recorded empty movements + entered openings (partial)'}<small>Capacity is a size label. Tare is the empty shell’s actual weight.</small></span><strong id="empty-cylinder-total">${summary.count} pcs${summary.complete?'':' (partial)'}</strong></div><p class="empty-weight-note">Estimated empty shell weight: <strong>${summary.weightKnown?money(summary.tare)+' kg':'Enter opening quantities and tare weights'}</strong>. Total nominal capacity: ${summary.capacityKnown?money(summary.capacity)+' kg':'Incomplete'}. Average tare weights give an estimate, not a weighed load.</p></article>`;
}
function recordCylinderMovement(row,isEmptyReturn){
 row.cylinderType ??= 'Unspecified';
 if(!['Original','Local','Unspecified'].includes(row.cylinderType))throw Error('Select a valid cylinder type.');
 if(row.direction==='Out'&&row.cylinderType==='Unspecified')throw Error('Select Original or Local for new dispatches.');
 if(row.direction==='In'&&row.qty>Math.max(0,cylinderTypeBalance(row.customer,row.capacity,row.cylinderType)))throw Error('Returns exceed this customer’s outstanding quantity for this size and type.');
 if(row.direction==='Out'&&(row.fullDispatch===true||row.fullDispatch==='on'))recordFullCylinderDispatch(row);
 state.cylinders.unshift(row);
 if(row.direction==='In'&&isEmptyReturn)state.emptyCylinderMovements.push({id:crypto.randomUUID(),date:row.date,createdAt:row.createdAt,capacity:capacityKey(row.capacity),direction:'In',qty:row.qty,note:'Empty customer return · '+(row.note||''),cylinderMovement:row.id,warehouse:row.warehouse});
}
function openEmptyForm(kind){
 action=kind;const opening=kind==='empty-opening',tareOnly=kind==='empty-tare',sizes=opening?emptySizes().filter(size=>!state.emptyCylinderOpening[size]):tareOnly?emptySizes().filter(size=>state.emptyCylinderOpening[size]):emptySizes();
 if(!sizes.length){toast(tareOnly?'Set an opening quantity first.':'Opening stock is already set. Use empty stock movements for corrections.');return}
 document.getElementById('dialog-title').textContent=opening?'Opening empty-cylinder stock':tareOnly?'Update average tare weight':'Empty cylinder movement';
 const sizeSelect=select('Cylinder capacity','capacity',sizes.map(size=>[size,capacityLabel(size)]));
 const html=tareOnly?sizeSelect+'<label class="field">Average empty tare weight per cylinder (kg, optional)<input type="number" name="tareKg" min="0.01" step="0.01" placeholder="Leave blank if unknown"></label><p class="card-subtitle">This changes the estimated shell weight only, not cylinder quantities.</p>':opening?sizeSelect+field('Empty cylinders currently on hand','qty','number','0','min="0" step="1"')+`<label class="field">Average empty tare weight per cylinder (kg, optional)<input type="number" name="tareKg" min="0.01" step="0.01" placeholder="Read the cylinder tare marking"></label><p class="card-subtitle">Enter the physical empty-cylinder count now, including returns already received. Only subsequent empty movements change this count. Existing gas and customer balances are unchanged.</p>`:field('Movement date','date','date',today(),`max="${today()}"`)+sizeSelect+select('Empty stock movement','direction',[['In','Receive empty cylinders'],['Out','Send to plant / fill / remove empties']])+field('Quantity (whole cylinders)','qty','number','','min="1" step="1"')+field('Reference / reason','note','text','','maxlength="150"')+'<p class="card-subtitle">Filling or sending empties reduces empty stock only. Record gas sales and plant gas arrivals separately. Customer returns marked empty already add stock automatically; do not enter them twice.</p>';
 document.getElementById('form-fields').innerHTML=html;document.getElementById('form-error').textContent='';document.querySelector('.dialog-actions').style.display='flex';document.getElementById('entry-dialog').showModal();
}
function submitEmptyForm(e){
 const before=structuredClone(state),f=Object.fromEntries(new FormData(e.target));
 try{
  const qty=action==='empty-tare'?0:Number(f.qty);if(!emptySizes().includes(f.capacity))throw Error('Select a valid cylinder size.');if(!Number.isSafeInteger(qty)||qty<(action==='empty-opening'||action==='empty-tare'?0:1))throw Error('Enter a valid whole-cylinder quantity.');
  if(action==='empty-tare'){const row=state.emptyCylinderOpening[f.capacity];if(!row)throw Error('Set an opening quantity first.');const tare=f.tareKg===''?null:Number(f.tareKg);if(tare!==null&&(!Number.isFinite(tare)||tare<=0))throw Error('Enter a positive tare weight or leave it blank.');row.tareKg=tare;}else if(action==='empty-opening'){
   assertDateOpen(today());if(state.emptyCylinderOpening[f.capacity])throw Error('Opening stock has already been set for this size.');
   const tare=f.tareKg===''?null:Number(f.tareKg);if(tare!==null&&(!Number.isFinite(tare)||tare<=0))throw Error('Enter a positive tare weight, or leave it blank.');
   state.emptyCylinderOpening[f.capacity]={qty,tareKg:tare,date:today(),asOf:new Date().toISOString(),createdAt:new Date().toISOString()};
  }else{
   validateSaleDate(f.date);assertDateOpen(f.date);if(!['In','Out'].includes(f.direction))throw Error('Select a movement direction.');
   if(f.direction==='Out'&&!state.emptyCylinderOpening[f.capacity])throw Error('Set this size’s opening stock before removing empties.');if(f.direction==='Out'&&qty>emptyQuantity(f.capacity))throw Error('The quantity exceeds available empty cylinders of this size.');
   const opening=state.emptyCylinderOpening[f.capacity];if(opening?.asOf&&f.date<opening.date)throw Error('This movement is before the physical stock count. Use a date on or after '+opening.date+'.');state.emptyCylinderMovements.push({id:crypto.randomUUID(),date:f.date,createdAt:new Date().toISOString(),capacity:f.capacity,direction:f.direction,qty,note:f.note.trim()});
  }
  save();document.getElementById('entry-dialog').close();render();toast('Empty-cylinder inventory updated.');
 }catch(err){state=before;document.getElementById('form-error').textContent=err.message}
}
