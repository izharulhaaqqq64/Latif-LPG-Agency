const FULL_STOCK_SIZES=['11.8','15','45.5'];
const STORED_FULL_STOCK_SIZES=[...FULL_STOCK_SIZES,'45.4'];
state.fullCylinderCounts ??= [];
state.fullCylinderMovements ??= [];
state.cylinderAlertLevels ??= {};
for(const size of FULL_STOCK_SIZES)state.cylinderAlertLevels[size] ??= 5;
state.costCorrections ??= [];
let costTarget='',profitMonth='';
function fullCylinderStock(size){
 const count=state.fullCylinderCounts.filter(row=>row.capacity===size).at(-1),movements=state.fullCylinderMovements.filter(row=>row.capacity===size&&(!count||row.createdAt>count.createdAt&&(!count.date||row.date>=count.date)));
 return {known:Boolean(count),qty:(count?.qty||0)+movements.reduce((a,row)=>a+(row.direction==='In'?row.qty:-row.qty),0)};
}
function recordFullCylinderDispatch(row){
 const size=String(row.capacity);if(!STORED_FULL_STOCK_SIZES.includes(size))return;
 const stock=fullCylinderStock(size);if(stock.known&&row.qty>stock.qty)throw Error('Not enough full '+size+' kg cylinders. Update the physical stock count first.');
 state.fullCylinderMovements.push({id:crypto.randomUUID(),capacity:size,direction:'Out',qty:row.qty,date:row.date,createdAt:row.createdAt,source:row.id});
}
function recordPlantCylinderReceipt(receipt){
 for(const line of receipt.plantPurchase.lines){const size=String(line.capacity);if(STORED_FULL_STOCK_SIZES.includes(size)&&line.quantity)state.fullCylinderMovements.push({id:crypto.randomUUID(),capacity:size,direction:'In',qty:line.quantity,date:receipt.date,createdAt:receipt.createdAt,source:receipt.id})}
}
function eventTime(row,isSale){
 if(isSale)return purchaseTimestamp(row)||Date.parse(row.date+'T00:00:00+05:00');
 return row.createdAt&&new Date(row.createdAt).toLocaleDateString('en-CA',{timeZone:'Asia/Karachi'})===row.date?Date.parse(row.createdAt):Date.parse(row.date+'T00:00:00+05:00');
}
function monthlyNetProfit(start,end){
 const events=[...allGasLosses().filter(r=>r.date<end).map(row=>({kind:'loss',row})),...state.stock.filter(r=>r.date<end).map(row=>({kind:'stock',row})),...state.sales.filter(s=>s.kind==='Gas'&&s.date<end).map(row=>({kind:'sale',row}))].sort((a,b)=>a.row.date.localeCompare(b.row.date)||eventTime(a.row,a.kind==='sale')-eventTime(b.row,b.kind==='sale')||(a.kind==='stock'?-1:1));
 let qty=0,value=0,known=true,gasCost=0,partsCost=0,lossCost=0;const missing=[];
 for(const event of events){const row=event.row;
  if(event.kind==='stock'){
   if(qty===0){known=true;value=0}
   if(qty<0||!Number.isFinite(row.purchaseCost)||row.purchaseCost<0)known=false;
   if(known)value+=row.purchaseCost;qty+=row.qty;continue;
  }
  const inPeriod=row.date>=start;
  if(!(row.qty>0)){if(total(row)>0){if(inPeriod)missing.push({id:row.id,reason:'Gas weight not recorded'});known=false}continue}
  const average=known&&qty>=row.qty&&qty>0?value/qty:null;
  const cost=Number.isFinite(row.costPerUnit)&&row.costPerUnit>=0?row.costPerUnit:average;
  if(inPeriod){if(cost===null)missing.push({id:row.id,reason:event.kind==='loss'?'Gas loss purchase cost / stock history incomplete':'Gas purchase cost / stock history incomplete'});else if(event.kind==='loss')lossCost+=row.qty*cost;else gasCost+=row.qty*cost}
  if(average!==null)value-=row.qty*average;else known=false;
  qty-=row.qty;if(Math.abs(qty)<1e-8){qty=0;value=0;known=true}
 }
 const sales=state.sales.filter(s=>s.date>=start&&s.date<end);
 for(const sale of sales.filter(s=>s.kind==='Parts')){if(!Number.isFinite(sale.costPerUnit)||sale.costPerUnit<0)missing.push({id:sale.id,reason:'Parts purchase cost not recorded'});else partsCost+=sale.qty*sale.costPerUnit}
 const revenue=roundAmount(sales.reduce((a,s)=>a+total(s),0)),expenses=roundAmount(state.expenses.filter(e=>e.date>=start&&e.date<end).reduce((a,e)=>a+e.amount,0));
 return {complete:missing.length===0,revenue,gasCost:roundAmount(gasCost),partsCost:roundAmount(partsCost),lossCost:roundAmount(lossCost),expenses,netProfit:missing.length?null:roundAmount(revenue-gasCost-partsCost-lossCost-expenses),missing};
}
function netProfitCard(report){
 const profit=report.profit;
 return stat('Net profit',profit?.complete?money(profit.netProfit):'Incomplete','↗',profit?.complete?'After cost of gas/parts sold and operating expenses':profit?profit.missing.length+' sales need weights or costs':'Not stored in this older closing',profit?.complete?'Rs.':'');
}
const monthlyCardsBase=monthlyValueCards;
monthlyValueCards=function(report){
 return monthlyCardsBase(report)+(report.profit&&!report.profit.complete?`<div class="profit-help"><span>Net profit needs complete sales weights and purchase costs. Reopen saved closings before correcting records. Stock purchases are expensed only when sold; collections do not add revenue again.</span><button class="button secondary" data-profit-month="${esc(report.month)}">Complete sale costs</button><button class="button secondary" data-page="Gas & inventory">Gas purchase costs</button></div>`:'');
};
function openStockProfitForm(kind){
 action=kind;let html='',title='';
 if(kind==='filled-stock'){
  title='Full-cylinder stock';html=select('Cylinder size','capacity',FULL_STOCK_SIZES.map(size=>[size,size+' kg']))+select('Action','mode',[['Count','Set current physical count'],['In','Receive full cylinders'],['Out','Issue full cylinders']])+field('Cylinder quantity','qty','number','','min="0" step="1"')+field('Reference / note','note','text','Physical stock update','maxlength="150"')+'<p class="card-subtitle">A physical count includes all receipts and dispatches up to now; only later movements change it. This updates cylinder counts, not gas kg, cash or customer balances. Plant receipts and marked-full customer dispatches already update counts—do not enter them twice.</p>';
 }
 if(kind==='gas-cost'){
  const rows=state.stock;if(!rows.length){toast('Record a gas arrival first.');return}
  title='Record gas purchase cost';html=select('Gas receipt','stockId',rows.map(row=>[row.id,row.date+' · '+row.warehouse+' · '+money(row.qty)+' kg']))+field('Actual total purchase cost (Rs.)','purchaseCost','number','','min="0" step="0.01"')+'<p class="card-subtitle">Enter the actual receipt cost. Gas quantity and cash records stay unchanged. Closed periods must be reopened before correcting costs.</p>';
 }
 if(kind==='sale-cost'){
  const rows=state.sales.filter(s=>s.date.startsWith(profitMonth));if(!rows.length){toast('No sales in the selected month.');return}
  title='Complete sale weight / cost';html=select('Invoice','saleId',rows.map(s=>[s.id,'#'+s.id+' · '+s.date+' · '+(s.item||s.kind)]))+`<label class="field">Missing gas weight (kg, only for gas entries without weight)<input name="gasQty" type="number" min="0.01" step="0.01"></label><label class="field">Actual cost per kg / part (Rs., optional for gas)<input name="unitCost" type="number" min="0" step="0.01"></label><p class="card-subtitle">Gas cost is inferred from weighted-average purchase cost unless an actual unit cost is entered. Parts require a recorded cost per piece. Missing gas kg will reduce the original sale location's gas stock. Invoice value, received payment and customer debt stay unchanged.</p>`;
 }
 document.getElementById('dialog-title').textContent=title;document.getElementById('form-fields').innerHTML=html;document.getElementById('form-error').textContent='';document.querySelector('.dialog-actions').style.display='flex';document.getElementById('entry-dialog').showModal();if(kind==='gas-cost'&&costTarget)document.getElementById('entry-form').elements.stockId.value=costTarget;
}
function submitStockProfitForm(e){
 const before=structuredClone(state),f=Object.fromEntries(new FormData(e.target));
 try{
  if(action==='filled-stock'){
   assertDateOpen(today());const size=f.capacity,qty=Number(f.qty),stock=fullCylinderStock(size);if(!FULL_STOCK_SIZES.includes(size)||!Number.isSafeInteger(qty)||qty<0||f.mode!=='Count'&&qty===0)throw Error('Enter a valid cylinder size and whole quantity.');
   const row={id:crypto.randomUUID(),capacity:size,qty,date:today(),createdAt:new Date().toISOString(),note:f.note.trim()};
   if(f.mode==='Count')state.fullCylinderCounts.push(row);else{if(!['In','Out'].includes(f.mode))throw Error('Select a stock action.');if(f.mode==='Out'&&(!stock.known||qty>stock.qty))throw Error('Set a physical stock count and do not exceed available cylinders.');state.fullCylinderMovements.push({...row,direction:f.mode})}
  }else if(action==='gas-cost'){
   const receipt=state.stock.find(r=>r.id===f.stockId),cost=Number(f.purchaseCost);if(!receipt)throw Error('Select a receipt.');assertDateOpen(receipt.date);if(!Number.isFinite(cost)||cost<0)throw Error('Enter a valid purchase cost.');state.costCorrections.push({kind:'gas',id:receipt.id,old:receipt.purchaseCost??null,cost,createdAt:new Date().toISOString()});receipt.purchaseCost=cost;
  }else{
   const sale=state.sales.find(s=>s.id===f.saleId);if(!sale)throw Error('Select an invoice.');assertDateOpen(sale.date);let changed=false;const old={qty:sale.qty,costPerUnit:sale.costPerUnit??null};
   if(sale.kind==='Gas'&&!(sale.qty>0)){
    const kg=Number(f.gasQty);if(!Number.isFinite(kg)||kg<=0)throw Error('Enter the missing gas weight.');const location=sale.channel==='Retail'?'Shop':sale.channel==='Wholesale'?'Main godown':'Supply vehicle';if(kg>locationStock(location))throw Error('This weight exceeds current recorded gas stock.');sale.amount=total(sale);sale.qty=kg;sale.rate=sale.amount/kg;changed=true;
   }
   if(f.unitCost!==''){const cost=Number(f.unitCost);if(!Number.isFinite(cost)||cost<0)throw Error('Enter a valid unit cost.');sale.costPerUnit=cost;changed=true}
   if(sale.kind==='Parts'&&!Number.isFinite(sale.costPerUnit))throw Error('Enter the parts cost per piece.');if(!changed)throw Error('Enter missing weight or an actual cost.');state.costCorrections.push({kind:'sale',id:sale.id,old,qty:sale.qty,costPerUnit:sale.costPerUnit??null,createdAt:new Date().toISOString()});
  }
  save();document.getElementById('entry-dialog').close();render();toast('Stock / cost data saved. Monthly profit recalculated.');
 }catch(err){state=before;document.getElementById('form-error').textContent=err.message}
}
const inventoryBeforeCosts=inventoryPage;
inventoryPage=function(){return inventoryBeforeCosts()+`<details class="simple-details"><summary>Gas purchase costs for profit</summary><article class="card">${table(['DATE','QUANTITY','PURCHASE COST',''],state.stock.map(row=>`<tr><td>${row.date}</td><td>${money(row.qty)} kg</td><td>${Number.isFinite(row.purchaseCost)?'Rs. '+money(row.purchaseCost):'Not recorded'}</td><td><button class="card-link" data-gas-cost="${row.id}">Record / correct cost</button></td></tr>`))}</article></details>`};
document.addEventListener('click',e=>{
 const cost=e.target.closest('[data-gas-cost]');if(cost){costTarget=cost.dataset.gasCost;openForm('gas-cost')}
 const profit=e.target.closest('[data-profit-month]');if(profit){profitMonth=profit.dataset.profitMonth;openForm('sale-cost')}
});
