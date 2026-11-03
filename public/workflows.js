// Ledger entries are derived from saved sales and receipts, so they cannot be double-posted.
const roundAmount = value => Math.round((value + Number.EPSILON) * 100) / 100;
// Cylinder balances are quantities, independent of gas kilograms and money.
function cylinderBalance(id) {
 return state.cylinders.filter(c=>c.customer===id).reduce((a,c)=>a+(c.direction==='Out'?c.qty:-c.qty),0);
}
function ledgerEntries(id='') {
 const entries=[];
 for(const c of state.customers.filter(c=>!id||c.id===id)){
  if(c.opening) entries.push({date:'Opening',sort:'',customer:c.id,label:'Opening balance',debit:c.opening,credit:0});
 }
 for(const s of state.sales.filter(s=>!id||s.customer===id)) entries.push({date:s.date,sort:s.createdAt||s.date+'T'+String(Number(s.id)).padStart(12,'0'),customer:s.customer,label:`Invoice #${s.id} · ${s.kind} · ${s.qty} ${s.kind==='Gas'?'kg':'pcs'}`,debit:roundAmount(total(s)),credit:s.paid});
 for(const r of state.receipts.filter(r=>!id||r.customer===id)) entries.push({date:r.date,sort:r.createdAt||r.date+'Tzz'+r.id,customer:r.customer,label:'Wasooli · '+r.method,debit:0,credit:r.amount});
 return entries.sort((a,b)=>a.sort.localeCompare(b.sort));
}
function ledgerTable(id='') {
 let running=0;
 return table(['DATE','CUSTOMER / ENTRY','BILL / DEBIT','WASOOL / CREDIT','BAQI BALANCE'],ledgerEntries(id).map(r=>{
  running=roundAmount(running+r.debit-r.credit);
  return `<tr><td>${esc(r.date)}</td><td><strong>${esc(customer(r.customer)?.name||'')}</strong><small>${esc(r.label)}</small></td><td>Rs. ${money(r.debit)}</td><td>Rs. ${money(r.credit)}</td><td><strong>Rs. ${money(running)}</strong></td></tr>`;
 }));
}
function ledgerPage(){
 const id=document.getElementById('ledger-customer')?.value||'';
 return `<div class="section-toolbar"><label class="field">Customer ka khata<select id="ledger-customer"><option value="">Sab customers — combined ledger</option>${state.customers.map(c=>`<option value="${esc(c.id)}" ${c.id===id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><button class="button secondary" data-action="export">↓ Export backup</button></div><div class="demo-banner">Har sale ka bill debit, aur sale payment / wasooli credit mein khud post hota hai. Alag entry ki zaroorat nahin.</div><article class="card" id="ledger-table">${ledgerTable(id)}</article>`;
}
function cylinderPage(){
 const match=c=>c.name.toLowerCase().includes(query.toLowerCase());
 const sent=state.cylinders.filter(c=>c.direction==='Out').reduce((a,c)=>a+c.qty,0);
 const returned=state.cylinders.filter(c=>c.direction==='In').reduce((a,c)=>a+c.qty,0);
 return toolbar('cylinder','Cylinder entry')+`<div class="stats">${stat('Diye / dispatched',sent,'↗','Total outward quantity','pcs')}${stat('Wapas / returned',returned,'↙','Total inward quantity','pcs')}${stat('Customers ke paas',state.customers.reduce((a,c)=>a+Math.max(0,cylinderBalance(c.id)),0),'♧','Positive customer balances','pcs')}</div><article class="card"><div class="card-heading table-top"><div><h2>Customer-wise cylinder quantity</h2><div class="card-subtitle">Diye − wapas = customer ke paas baqi. Purani unmatched returns alag dikhayi gayi hain.</div></div></div>${table(['CUSTOMER','DIYE','WAPAS','BAQI / STATUS'],state.customers.filter(match).map(c=>{const rows=state.cylinders.filter(x=>x.customer===c.id),out=rows.filter(x=>x.direction==='Out').reduce((a,x)=>a+x.qty,0),inside=rows.filter(x=>x.direction==='In').reduce((a,x)=>a+x.qty,0),net=out-inside;return `<tr><td>${customerCell(c.id)}</td><td>${out}</td><td>${inside}</td><td><strong>${net>=0?net+' pcs':Math.abs(net)+' unmatched returns'}</strong></td></tr>`}))}</article><article class="card" style="margin-top:20px"><div class="card-heading table-top"><h2>Aamad / rawangi history</h2></div>${table(['DATE','CUSTOMER','MOVEMENT','QUANTITY','REFERENCE'],state.cylinders.filter(x=>match(customer(x.customer))).map(c=>`<tr><td>${esc(c.date)}</td><td>${customerCell(c.customer)}</td><td><span class="badge ${c.direction==='In'?'paid':'credit'}">${c.direction==='In'?'Wapas / aamad':'Diye / rawangi'}</span></td><td><strong>${c.qty} pcs</strong></td><td>${esc(c.note)}</td></tr>`))}</article>`;
}
let paymentMode='manual';
function updateSaleTotals(){
 const form=document.getElementById('entry-form');
 if(!form.querySelector('#sale-total'))return;
 const amount=roundAmount(Number(form.elements.qty.value)*Number(form.elements.rate.value));
 if(paymentMode==='full')form.elements.paid.value=amount;
 if(paymentMode==='credit')form.elements.paid.value=0;
 document.getElementById('sale-total').textContent='Rs. '+money(amount);
 document.getElementById('sale-due').textContent='Rs. '+money(roundAmount(amount-Number(form.elements.paid.value)));
}
document.addEventListener('click',e=>{
 if(e.target.closest('#new-sale,[data-action="sale"]')){paymentMode='manual';updateSaleTotals()}
 const b=e.target.closest('[data-payment]');if(b){paymentMode=b.dataset.payment;updateSaleTotals()}
});
document.addEventListener('input',e=>{if(e.target.closest('#entry-form')&&['qty','rate','paid'].includes(e.target.name)){if(e.target.name==='paid')paymentMode='manual';updateSaleTotals()}});
document.addEventListener('change',e=>{
 if(e.target.id==='ledger-customer')document.getElementById('ledger-table').innerHTML=ledgerTable(e.target.value);
 if(e.target.name==='kind'){
  const form=document.getElementById('entry-form'),parts=e.target.value==='Parts';
  form.elements.item.value=parts?'Parts':'LPG gas';
  form.elements.qty.parentElement.firstChild.textContent=parts?'Parts kitne? (pieces)':'Gas kitni? (kg)';
  form.elements.rate.parentElement.firstChild.textContent=parts?'Rate per piece (Rs.)':'Rate per kg (Rs.)';
 }
});
render();
