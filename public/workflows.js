// Ledger entries are derived from saved sales and receipts, so they cannot be double-posted.
const roundAmount = value => Math.round((value + Number.EPSILON) * 100) / 100;
// Cylinder balances are quantities, independent of gas kilograms and money.
function cylinderBalance(id) {
 return state.cylinders.filter(c=>c.customer===id).reduce((a,c)=>a+(c.direction==='Out'?c.qty:-c.qty),0);
}
function ledgerEntries(id='') {
 const entries=[];
 for(const c of state.customers.filter(c=>!id||c.id===id)){
  if(c.opening) entries.push({recordType:'Opening',recordId:c.id,date:'Opening',sort:'',customer:c.id,label:'Opening balance',debit:c.opening,credit:0});
 }
 for(const s of state.sales.filter(s=>!id||s.customer===id)) entries.push({recordType:'Sale',recordId:s.id,invoiceId:s.id,date:s.date,sort:s.createdAt||s.date+'T'+String(Number(s.id)).padStart(12,'0'),customer:s.customer,label:`Invoice #${s.id} · ${s.kind} · ${s.directCash&&!s.qty?'Payment only':s.qty+' '+(s.kind==='Gas'?'kg':'pcs')}`,debit:roundAmount(total(s)),credit:s.paid});
 for(const r of state.receipts.filter(r=>!id||r.customer===id)) entries.push({recordType:'Customer payment',recordId:r.id,receiptId:r.id,date:r.date,sort:r.createdAt||r.date+'Tzz'+r.id,customer:r.customer,label:'Credit · Collection / payment received · '+r.method,debit:0,credit:r.amount});
 for(const r of (state.creditEntries||[]).filter(r=>!id||r.customer===id))entries.push({recordType:'Customer debit',recordId:r.id,date:r.date,sort:r.createdAt,customer:r.customer,label:'Debit · customer owes · '+(r.note||'No description'),debit:r.amount,credit:0});
 return entries.sort((a,b)=>a.sort.localeCompare(b.sort));
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
  form.elements.qty.parentElement.firstChild.textContent=parts?'Parts kitne? (pieces)':'Gas quantity (kg)';
  form.elements.rate.parentElement.firstChild.textContent=parts?'Rate per piece (Rs.)':'Rate per kg (Rs.)';
 }
});
