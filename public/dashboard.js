let dashboardDate=today();
function dailyCash(date){
 const cashSales=roundAmount(state.sales.filter(s=>s.date===date&&(s.method||'Cash')==='Cash').reduce((a,s)=>a+s.paid,0));
 const recoveries=roundAmount(state.receipts.filter(r=>r.date===date&&(r.method||'Cash')==='Cash').reduce((a,r)=>a+r.amount,0));
 const expenses=roundAmount(state.expenses.filter(e=>e.date===date&&(e.method||'Cash')==='Cash').reduce((a,e)=>a+e.amount,0));
 return {cashSales,recoveries,expenses,total:roundAmount(cashSales+recoveries),net:roundAmount(cashSales+recoveries-expenses)};
}
function dailyCashPanel(date,compact=false){
 const cash=dailyCash(date);
 return `<article class="daily-cash-card ${compact?'compact-cash':''}"><div class="daily-cash-heading"><div><div class="eyebrow">${esc(date)}</div><h2>Total daily cash</h2><p>Cash sales + cash debt collections</p></div><strong id="${compact?'sales-daily-cash':'dashboard-daily-cash'}"><span>Rs.</span> ${money(cash.total)}</strong></div><div class="daily-cash-breakdown"><div><span>Cash sales</span><strong>Rs. ${money(cash.cashSales)}</strong></div><div><span>Cash collections</span><strong>Rs. ${money(cash.recoveries)}</strong></div><div><span>Cash expenses</span><strong>Rs. ${money(cash.expenses)}</strong></div><div><span>Net daily cash flow</span><strong>Rs. ${money(cash.net)}</strong></div></div><p class="daily-cash-note">Bank and wallet payments are excluded. Sales without a recorded payment method are counted as cash. Net flow excludes opening cash and inventory purchase payments.</p></article>`;
}
function dashboardPage(){
 const sales=state.sales.filter(s=>s.date===dashboardDate),salesTotal=sales.reduce((a,s)=>a+total(s),0),partsValue=state.partItems.reduce((a,p)=>a+partInventory(p.id).value,0),credit=state.customers.reduce((a,c)=>a+Math.max(0,balance(c)),0),empty=emptyStockSummary();
 return `<div class="section-toolbar dashboard-toolbar"><label class="field">Daily totals for<input type="date" id="dashboard-date" value="${dashboardDate}" max="${today()}"></label><span>Inventory and customer balances show the current position.</span></div>${dailyCashPanel(dashboardDate)}<div class="stats dashboard-main-stats" id="overview-stock-stats">${stat('Total sales',money(salesTotal),'↗',sales.length+' invoices on selected date')}${stat('Gas stock',money(gasStock()),'◫','Recorded stock across all locations','kg')}${stat('Parts stock value',money(partsValue),'⚙','Remaining inventory at purchase cost')}${stat('Outstanding credit',money(roundAmount(credit)),'▤','Current customer receivables')}${stat('Daily expenses',money(expensesFor(dashboardDate)),'↘','All payment methods on selected date')}${stat('Empty cylinders available',empty.complete?String(empty.count):empty.count?empty.count+' partial':'Not set','♧',empty.complete?'Current empty stock':'Set counts in Cylinder tracking','pcs')}</div><div class="dashboard-links"><button class="button secondary" data-page="Sales">View sales</button><button class="button secondary" data-page="Cylinder tracking">Cylinder details</button><button class="button secondary" data-page="Reports">Daily report</button></div>`;
}
const cashEntryPage=cashPage;
cashPage=function(){return cashEntryPage()+dailyCashPanel(cashDate,true)};
document.addEventListener('change',e=>{
 if(e.target.id==='dashboard-date'){try{validateSaleDate(e.target.value);dashboardDate=e.target.value;render()}catch(err){e.target.value=dashboardDate;toast(err.message)}}
});
render();
