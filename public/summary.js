let emptyDetailsOpen=false;
function clientCountForCustomer(id){return [...CYLINDER_SIZES,'unknown'].reduce((a,size)=>a+Math.max(0,cylinderSizeBalance(id,size)),0)}
function combinedLedgerPanel(){
 const totals=ledgerValueTotals('');
 return `<article class="combined-ledger debit-credit-only"><div><span>Total debit · all customers</span><strong id="combined-ledger-debit">Rs. ${money(totals.debits)}</strong></div><div><span>Total credit · all customers</span><strong id="combined-ledger-credit">Rs. ${money(totals.received)}</strong></div></article>`;
}
function monthlyFinancialValues(report){
 const end=report.end||closingRange('monthly',report.month+'-01').end;
 const kg=Number.isFinite(report.gasClosing)?report.gasClosing:roundAmount(state.stock.filter(r=>r.date<end).reduce((a,r)=>a+r.qty,0)-state.sales.filter(s=>s.date<end&&s.kind==='Gas').reduce((a,s)=>a+s.qty,0)-allGasLosses().filter(l=>l.date<end).reduce((a,l)=>a+l.qty,0));
 const priced=state.stock.filter(r=>r.date<end&&r.qty>0&&Number.isFinite(r.purchaseCost)&&r.purchaseCost>=0).slice().sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||''))[0];
 const gasRate=priced?priced.purchaseCost/priced.qty:null,gasValue=kg===0?0:kg>0&&gasRate!==null?roundAmount(kg*gasRate):null;
 const movements=state.partMovements.filter(m=>m.date<end),rawParts=movements.reduce((a,m)=>a+(m.direction==='In'?1:-1)*m.qty*m.cost,0),partsValue=rawParts<-.005?null:roundAmount(Math.max(0,rawParts));
 const monthStart=report.start||report.month+'-01',previous=new Date(monthStart+'T00:00:00Z');previous.setUTCMonth(previous.getUTCMonth()-1);const previousMonth=previous.toISOString().slice(0,7),saved=state.monthClosings[previousMonth]?.report;
 return {gasKg:kg,gasValue,gasRate,gasRateDate:priced?.date||null,partsValue,moneyInMarket:roundAmount(report.customers.reduce((a,c)=>a+Math.max(0,c.closing),0)),lastMonthClosing:saved?saved.closing:report.opening,lastMonthSaved:Boolean(saved),previousMonth,cash:Number.isFinite(report.cashNet)?report.cashNet:null};
}
function monthlyValueCards(report){
 const v=report.financialSummary;
 if(!v)return `<article class="card monthly-values"><div class="card-heading table-top"><h2>Month-end values</h2></div><p class="empty-weight-note">These values were not stored in this older closing. Reopen and save the month to include them. The saved customer balances remain unchanged.</p><div class="stats">${stat('Gas value','Not recorded','◫','Not stored in this snapshot','')}${stat('Parts value','Not recorded','⚙','Not stored in this snapshot','')}${stat('Money in market',money(report.customers.reduce((a,c)=>a+Math.max(0,c.closing),0)),'▤','Customer receivables at month end')}${stat('Last month closing',money(report.opening),'↙','Previous net customer balance')}${stat('Cash',Number.isFinite(report.cashNet)?money(report.cashNet):'Not recorded','↙','Net cash movement; opening cash excluded')}${netProfitCard(report)}</div></article>`;
 return `<div class="stats monthly-value-cards" id="monthly-values">${stat('Gas value',v.gasValue===null?'Not available':money(v.gasValue),'◫',v.gasValue===null?'Purchase cost missing or stock needs reconciliation':gasNumber(v.gasKg)+' kg · estimated at last recorded purchase cost')}${stat('Parts value',v.partsValue===null?'Not available':money(v.partsValue),'⚙','Month-end tracked stock at purchase cost')}${stat('Money in market',money(v.moneyInMarket),'▤','Customer amounts owed at month end')}${stat('Last month closing',money(v.lastMonthClosing),'↙',v.previousMonth+' · '+(v.lastMonthSaved?'saved':'derived')+' net customer balance')}${stat('Cash',v.cash===null?'Not recorded':money(v.cash),'↙','Net cash after expenses and recorded supplier payments; opening cash excluded')}${netProfitCard(report)}</div><p class="monthly-value-note">Gas value is an estimate using the last recorded purchase cost before month end. Parts value covers tracked stock only. Cash is net recorded movement after supplier cash payments, not a till balance. Values are saved with this closing.</p>`;
}
function simpleEmptySummary(){
 const summary=emptyStockSummary();
 return `<article class="client-cylinder-total simple-empty"><div><span>Empty cylinders available</span><strong>${summary.count} pcs${summary.complete?'':' (partial)'}</strong><small>${summary.complete?'Ready for filling / plant dispatch':'Set physical opening counts in Empty stock & setup'}</small></div><p>${EMPTY_SALE_SIZES.map(size=>size+' kg: '+emptyQuantity(size)).join(' · ')}</p></article>`;
}
function prepareSimpleCylinderForm(){
 const form=document.getElementById('entry-form'),note=form.elements.note;
 if(note){const details=document.createElement('details');details.className='simple-details';details.innerHTML='<summary>Reference / note</summary>';note.closest('label').before(details);details.appendChild(note.closest('label'))}
 updateCylinderReturnOption();
}
function updateCylinderReturnOption(){
 const form=document.getElementById('entry-form');if(action==='cylinder'&&form.elements.returnEmpty)form.elements.returnEmpty.closest('label').hidden=form.elements.direction.value!=='In';if(action==='cylinder'&&form.elements.fullDispatch)form.elements.fullDispatch.closest('label').hidden=form.elements.direction.value!=='Out';
}
document.addEventListener('click',e=>{
 const receive=e.target.closest('#receive-cylinders,[data-receive-customer]');if(!receive)return;
 openForm('cylinder');const form=document.getElementById('entry-form');form.elements.direction.value='In';if(receive.dataset.receiveCustomer)form.elements.customer.value=receive.dataset.receiveCustomer;updateCylinderReturnOption();
});
document.addEventListener('change',e=>{if(e.target.name==='direction')updateCylinderReturnOption()});
document.addEventListener('toggle',e=>{if(e.target.id==='empty-stock-details'&&e.target.isConnected)emptyDetailsOpen=e.target.open},true);
