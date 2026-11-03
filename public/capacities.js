const CYLINDER_SIZES=['11.8','15','45.4','45.5'];
const TRACKING_CYLINDER_SIZES=['11.8','15','45.5'];
const GAS_UNIT_KG=11.8;
function capacityKey(value){return CYLINDER_SIZES.includes(String(value))?String(value):'unknown'}
function capacityLabel(value){return capacityKey(value)==='unknown'?'Size not recorded':esc(capacityKey(value))+' kg'}
function validateCylinderSize(value,allowUnknown=false){if(!TRACKING_CYLINDER_SIZES.includes(String(value))&&!(allowUnknown&&value==='unknown'))throw Error('Select a cylinder size.')}
function cylinderSizeSelect(name,allowUnknown=false){return select('Cylinder size / capacity',name,[...TRACKING_CYLINDER_SIZES.map(s=>[s,s+' kg']),...(allowUnknown?[['unknown','Size not recorded — old returns']]:[])])}
function cylinderSizeBalance(id,capacity){return state.cylinders.filter(c=>c.customer===id&&capacityKey(c.capacity)===capacityKey(capacity)).reduce((a,c)=>a+(c.direction==='Out'?c.qty:-c.qty),0)}
function cylinderBreakdownText(id){
 return [...CYLINDER_SIZES,'unknown'].map(s=>({s,qty:cylinderSizeBalance(id,s)})).filter(x=>x.qty!==0).map(x=>`${capacityLabel(x.s)}: ${cylinderLabel(x.qty)}`).join(' · ')||'No outstanding cylinders';
}
function cylinderPeriodSizes(rows,start,end){
 return [...CYLINDER_SIZES,'unknown'].map(capacity=>{
  const cc=rows.filter(c=>capacityKey(c.capacity)===capacity),net=items=>items.reduce((a,c)=>a+(c.direction==='Out'?c.qty:-c.qty),0);
  const opening=net(cc.filter(c=>c.date<start)),during=cc.filter(c=>c.date>=start&&c.date<end),out=during.filter(c=>c.direction==='Out').reduce((a,c)=>a+c.qty,0),inside=during.filter(c=>c.direction==='In').reduce((a,c)=>a+c.qty,0);
  return {capacity,opening,out,inside,closing:opening+out-inside};
 }).filter(x=>x.opening||x.out||x.inside);
}
function cylinderPage(){
 const matches=c=>c.name.toLowerCase().includes(query.toLowerCase()),rows=state.cylinders.filter(c=>matches(customer(c.customer)));
 return clientCylinderSummary()+toolbar('cylinder','Cylinder entry')+emptyStockPanel()+`<div class="stats">${TRACKING_CYLINDER_SIZES.map(size=>stat(size+' cylinders',state.customers.reduce((a,c)=>a+Math.max(0,cylinderSizeBalance(c.id,size)),0),'♧','Outstanding quantity held by customers','pcs')).join('')}</div><div class="demo-banner">Cylinder size is its capacity, not a measured gas quantity. Cylinder movements do not change gas inventory. Legacy entries retain “Size not recorded” without an assumed capacity.</div><article class="card"><div class="card-heading table-top"><h2>Customer cylinder quantities by size</h2></div>${table(['CUSTOMER','DISPATCHED','RETURNED','TOTAL OUTSTANDING',...TRACKING_CYLINDER_SIZES.map(size=>size+' KG'),'OLD / UNSPECIFIED'],state.customers.filter(matches).map(c=>{const rr=state.cylinders.filter(x=>x.customer===c.id),out=rr.filter(x=>x.direction==='Out').reduce((a,x)=>a+x.qty,0),inside=rr.filter(x=>x.direction==='In').reduce((a,x)=>a+x.qty,0);return `<tr><td>${customerCell(c.id)}</td><td>${out}</td><td>${inside}</td><td><strong>${cylinderLabel(out-inside)}</strong>${cylinderSizeBalance(c.id,'45.4')?'<small>Legacy 45.4 kg: '+cylinderLabel(cylinderSizeBalance(c.id,'45.4'))+'</small>':''}</td>${[...TRACKING_CYLINDER_SIZES,'unknown'].map(s=>`<td>${cylinderLabel(cylinderSizeBalance(c.id,s))}</td>`).join('')}</tr>`}))}</article><article class="card" style="margin-top:20px"><div class="card-heading table-top"><h2>Cylinder movement history by size</h2></div>${table(['DATE','CUSTOMER','SIZE','MOVEMENT','QUANTITY','REFERENCE'],rows.map(c=>`<tr><td>${esc(c.date)}</td><td>${customerCell(c.customer)}</td><td><strong>${capacityLabel(c.capacity)}</strong></td><td>${c.direction==='Out'?'Dispatch':'Return'}</td><td>${c.qty} pcs</td><td>${esc(c.note)}</td></tr>`))}</article>`;
};
let calculatorView='purchase';
let gasCalc={mode:'kg',quantity:'11.8',rate:'',rateBasis:'unit',size:'11.8'};
function gasCalculation(input){
 const quantity=Number(input.quantity),rate=Number(input.rate||0);
 if(input.quantity===''||!Number.isFinite(quantity)||quantity<0||!Number.isFinite(rate)||rate<0)throw Error('Quantity and rate must be zero or greater.');
 if(input.mode==='cylinders'&&!Number.isInteger(quantity))throw Error('Cylinder quantity must be a whole number.');
 const kg=input.mode==='units'?quantity*GAS_UNIT_KG:input.mode==='cylinders'?quantity*Number(input.size):quantity;
 const units=kg/GAS_UNIT_KG,amount=roundAmount((input.rateBasis==='unit'?units:kg)*rate);
 return {kg,units,amount,ratePerKg:input.rateBasis==='unit'?rate/GAS_UNIT_KG:rate};
}
const gasNumber=n=>new Intl.NumberFormat('en-PK',{maximumFractionDigits:6}).format(n);
function calculatorResults(){
 try{const result=gasCalculation(gasCalc);return `<div class="stats">${stat('Gas weight',gasNumber(result.kg),'◫','Total gas quantity','kg')}${stat('Gas units',gasNumber(result.units),'▦','1 unit = 11.8 kg','units')}${stat('Total amount',money(result.amount),'↗','Based on the entered rate')}</div><p class="card-subtitle">Rate per kg: Rs. ${gasNumber(result.ratePerKg)} · Full precision is used; the final amount is rounded to two decimals.</p>`}catch(err){return `<div class="demo-banner" role="alert">${esc(err.message)}</div>`}
}
function conversionPage(){
 return `<article class="card cash-entry"><h2>Gas calculator</h2><p><strong>1 unit = 11.8 kg</strong> · 23.6 kg = 2 units. Cylinder size is its nominal gas capacity.</p><div class="calculator-fields">${select('Input type','calcMode',[['kg','Kilograms (kg)'],['units','Units (11.8 kg)'],['cylinders','Full cylinder quantity']])}${field('Quantity','calcQuantity','number',gasCalc.quantity,'min="0" step="any"')}${select('Cylinder size','calcSize',CYLINDER_SIZES.map(s=>[s,s+' kg']))}${field('Gas rate (Rs.)','calcRate','number',gasCalc.rate,'min="0" step="any"')}${select('Price basis','calcBasis',[['unit','Per 11.8 kg unit'],['kg','Per kg']])}</div><div id="calculator-result">${calculatorResults()}</div><button class="button primary" id="calculator-cash">Record calculated cash sale</button><p class="card-subtitle">Calculating does not save an entry. Review and save the cash form to record a sale. Cylinder calculations assume full fills.</p></article>`;
}
function initializeCalculator(){
 const el=document.getElementById('content');if(page!=='Gas calculator'||calculatorView!=='conversion')return;
 el.querySelector('[name=calcMode]').value=gasCalc.mode;el.querySelector('[name=calcBasis]').value=gasCalc.rateBasis;el.querySelector('[name=calcSize]').value=gasCalc.size;
 el.querySelector('[name=calcSize]').closest('label').hidden=gasCalc.mode!=='cylinders';
}
const renderWithCapacities=render;
render=function(){renderWithCapacities();initializeCalculator()};
document.addEventListener('input',e=>{
 const mapping={calcMode:'mode',calcQuantity:'quantity',calcRate:'rate',calcBasis:'rateBasis',calcSize:'size'};
 if(!mapping[e.target.name])return;
 gasCalc[mapping[e.target.name]]=e.target.value;
 initializeCalculator();document.getElementById('calculator-result').innerHTML=calculatorResults();
});
document.addEventListener('click',e=>{
 if(!e.target.closest('#calculator-cash'))return;
 try{
  const result=gasCalculation(gasCalc);if(result.kg<=0||result.amount<=0)throw Error('Quantity and rate must be positive to record a sale.');
  // Cash gas quantities are recorded to 0.01 kg. Never silently round a calculated weight.
  if(Math.abs(result.kg*100-Math.round(result.kg*100))>1e-7)throw Error('Cash sale weight supports 0.01 kg precision. Adjust the calculator quantity.');
  openForm('cash');const form=document.getElementById('entry-form');form.elements.amount.value=result.amount;form.elements.gasQty.value=Math.round(result.kg*100)/100;form.querySelector('details').open=true;
 }catch(err){toast(err.message)}
});
