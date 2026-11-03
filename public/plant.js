let plantRows=[{id:crypto.randomUUID(),capacity:'15',quantity:'0'},{id:crypto.randomUUID(),capacity:'45.4',quantity:'0'}];
let plantRate='';
let plantDraft=null;
function calculatePlantPurchase(rows,unitRate){
 const rate=Number(unitRate||0);
 if(!Number.isFinite(rate)||rate<0)throw Error('The price per unit must be zero or greater.');
 if(!rows.length)throw Error('Add at least one cylinder size.');
 const lines=rows.map(row=>{
  const capacity=Number(row.capacity),quantity=Number(row.quantity||0);
  if(!Number.isFinite(capacity)||capacity<=0||Math.abs(capacity*100-Math.round(capacity*100))>1e-7)throw Error('Enter a positive capacity with up to two decimal places.');
  if(!Number.isSafeInteger(quantity)||quantity<0)throw Error('Cylinder quantity must be a non-negative whole number.');
  const kg=(Math.round(capacity*100)*quantity)/100;
  if(!Number.isSafeInteger(Math.round(capacity*100)*quantity))throw Error('The cylinder quantity is too large.');
  return {capacity,quantity,kg,units:kg/GAS_UNIT_KG,amount:roundAmount(kg/GAS_UNIT_KG*rate)};
 });
 const kg=roundAmount(lines.reduce((a,line)=>a+line.kg,0)),units=kg/GAS_UNIT_KG,totalCost=roundAmount(units*rate);
 if(!Number.isFinite(totalCost))throw Error('The total is too large.');
 return {lines,quantity:lines.reduce((a,line)=>a+line.quantity,0),kg,units,unitRate:rate,costPerKg:rate/GAS_UNIT_KG,totalCost};
}
function plantResults(){
 try{
  const p=calculatePlantPurchase(plantRows,plantRate);
  return `<div class="stats">${stat('Total cylinders',money(p.quantity),'♧','All entered cylinder sizes','pcs')}${stat('Total gas weight',gasNumber(p.kg),'◫','Sum of quantity × capacity','kg')}${stat('11.8 kg units',gasNumber(p.units),'▦','Total kg ÷ 11.8','units')}${stat('Plant purchase cost',money(p.totalCost),'↗','Total units × price per unit')}</div><article class="card">${table(['CYLINDER CAPACITY','QUANTITY','GAS WEIGHT','11.8 KG UNITS','LINE COST (Rs.)'],p.lines.map(l=>`<tr><td>${gasNumber(l.capacity)} kg</td><td>${l.quantity}</td><td>${gasNumber(l.kg)} kg</td><td>${gasNumber(l.units)}</td><td>${money(l.amount)}</td></tr>`))}</article><p class="card-subtitle">Price per kg: Rs. ${gasNumber(p.costPerKg)}. Units are not rounded before pricing. The final total is rounded to two decimals; displayed line totals can differ by a cent when added.</p>`;
 }catch(err){return `<div class="demo-banner" role="alert">${esc(err.message)}</div>`}
}
calculatorPage=function(){
 const tabs=`<div class="parts-tabs"><button class="${calculatorView==='purchase'?'selected':''}" data-calculator-tab="purchase">Plant purchase</button><button class="${calculatorView==='conversion'?'selected':''}" data-calculator-tab="conversion">KG / unit converter</button></div>`;
 if(calculatorView==='conversion')return tabs+conversionPage();
 return tabs+`<article class="card cash-entry"><h2>Mixed-cylinder plant purchase</h2><p>Enter each cylinder size and its quantity. Plant pricing is always per <strong>11.8 kg unit</strong>.</p><datalist id="plant-capacities">${CYLINDER_SIZES.map(size=>`<option value="${size}">${size} kg</option>`).join('')}</datalist><div id="plant-rows">${plantRows.map((row,i)=>`<div class="plant-row"><span class="plant-row-number">${i+1}</span><label class="field">Capacity per cylinder (kg)<input type="number" min="0.01" step="0.01" list="plant-capacities" data-plant-row="${row.id}" data-plant-field="capacity" value="${esc(row.capacity)}"></label><span class="multiply">×</span><label class="field">Number of cylinders<input type="number" min="0" step="1" data-plant-row="${row.id}" data-plant-field="quantity" value="${esc(row.quantity)}"></label><button class="button secondary" data-remove-plant-row="${row.id}" aria-label="Remove cylinder row ${i+1}" ${plantRows.length===1?'disabled':''}>×</button></div>`).join('')}</div><button class="button secondary" id="add-plant-row">＋ Add cylinder size</button><div class="plant-price">${field('Plant price per 11.8 kg unit (Rs.)','plantRate','number',plantRate,'min="0" step="0.01"')}</div><div id="plant-result">${plantResults()}</div><div class="dialog-actions"><button class="button primary" id="save-plant-purchase">Review & add purchased gas to stock</button></div><p class="card-subtitle">Example: 40 × 15 kg + 10 × 45.4 kg = 1,054 kg = 89.322034 units. Calculating alone does not save a purchase. Use actual plant-filled weights if cylinders are not full.</p></article>`;
};
function reviewPlantPurchase(){
 const result=calculatePlantPurchase(plantRows,plantRate);
 if(result.kg<=0||result.unitRate<=0)throw Error('Enter a cylinder quantity and a positive unit price before saving.');
 plantDraft=structuredClone(result);action='plant-purchase';
 document.getElementById('dialog-title').textContent='Review plant purchase';
 document.getElementById('form-fields').innerHTML=field('Purchase date','date','date',today(),`max="${today()}"`)+select('Receive gas at','warehouse',['Main godown','Shop','Supply vehicle'])+`<div class="account-summary"><div><span>Gas received</span><strong>${gasNumber(result.kg)} kg</strong></div><div><span>Purchase cost</span><strong>Rs. ${money(result.totalCost)}</strong></div></div><p>${gasNumber(result.units)} units × Rs. ${money(result.unitRate)} per 11.8 kg unit</p>`+field('Reference / note','note','text','Plant purchase','maxlength="150"')+'<p class="card-subtitle">This adds purchased gas to inventory and saves its cost and cylinder breakdown. It does not create a customer sale or a supplier payment.</p>';
 document.getElementById('form-error').textContent='';document.querySelector('.dialog-actions').style.display='flex';document.getElementById('entry-dialog').showModal();
}
function submitPlantPurchase(e){
 const before=structuredClone(state);
 try{
  if(!plantDraft)throw Error('Calculate and review the purchase again.');
  const f=Object.fromEntries(new FormData(e.target));validateSaleDate(f.date);assertDateOpen(f.date);
  if(!['Main godown','Shop','Supply vehicle'].includes(f.warehouse))throw Error('Select a valid storage location.');
  state.stock.unshift({id:crypto.randomUUID(),date:f.date,createdAt:new Date().toISOString(),warehouse:f.warehouse,qty:plantDraft.kg,note:f.note.trim(),purchaseCost:plantDraft.totalCost,plantPurchase:structuredClone(plantDraft)});
  save();plantDraft=null;document.getElementById('entry-dialog').close();render();toast('Plant purchase saved. Gas inventory increased.');
 }catch(err){state=before;document.getElementById('form-error').textContent=err.message}
}
document.addEventListener('input',e=>{
 const row=e.target.dataset.plantRow;
 if(row){const item=plantRows.find(r=>r.id===row);if(item)item[e.target.dataset.plantField]=e.target.value;}
 if(e.target.name==='plantRate')plantRate=e.target.value;
 if(row||e.target.name==='plantRate')document.getElementById('plant-result').innerHTML=plantResults();
});
document.addEventListener('click',e=>{
 const tab=e.target.closest('[data-calculator-tab]');if(tab){calculatorView=tab.dataset.calculatorTab;render();}
 if(e.target.closest('#add-plant-row')){plantRows.push({id:crypto.randomUUID(),capacity:'11.8',quantity:'0'});render();}
 const remove=e.target.closest('[data-remove-plant-row]');if(remove&&plantRows.length>1){plantRows=plantRows.filter(row=>row.id!==remove.dataset.removePlantRow);render();}
 if(e.target.closest('#save-plant-purchase')){try{reviewPlantPurchase()}catch(err){toast(err.message)}}
});
render();
