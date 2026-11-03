state.stockAlertSettings ??= {gasKg:500,partsQty:5};
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
 const month=dashboardDate.slice(0,7),monthly=monthlyDashboardData(month);const sales=state.sales.filter(s=>s.date===dashboardDate),salesTotal=sales.reduce((a,s)=>a+total(s),0),partsValue=state.partItems.reduce((a,p)=>a+partInventory(p.id).value,0),credit=state.customers.reduce((a,c)=>a+Math.max(0,balance(c)),0),empty=emptyStockSummary();
 return `<div class="section-toolbar dashboard-toolbar"><label class="field">Daily totals for<input type="date" id="dashboard-date" value="${dashboardDate}" max="${today()}"></label><span>Inventory and customer balances show the current position.</span></div>${dailyCashPanel(dashboardDate)}<div class="stats dashboard-main-stats" id="overview-stock-stats">${stat('Total sales',money(salesTotal),'↗',sales.length+' invoices on selected date')}${stat('Monthly revenue',money(monthly.revenue),'↗',month+' · invoiced sales')}${stat('Active customers',monthly.activeCustomers,'♙','Customers who purchased in '+month,'')}${stat('Gas stock',money(gasStock()),'◫','Recorded stock across all locations','kg')}${stat('Parts stock value',money(partsValue),'⚙','Remaining inventory at purchase cost')}${stat('Outstanding credit',money(roundAmount(credit)),'▤','Current customer receivables')}${stat('Daily expenses',money(expensesFor(dashboardDate)),'↘','All payment methods on selected date')}${stat('Empty cylinders available',empty.complete?String(empty.count):empty.count?empty.count+' partial':'Not set','♧',empty.complete?'Current empty stock':'Set counts in Cylinder tracking','pcs')}</div>${dashboardInsights(month)}<div class="dashboard-links"><button class="button secondary" data-page="Sales">View sales</button><button class="button secondary" data-page="Cylinder tracking">Cylinder details</button><button class="button secondary" data-page="Reports">Daily report</button><button class="button primary" data-page="Reports" data-reports-view="monthly" data-closing-month="${month}">Monthly closing</button></div>`;
}
const cashEntryPage=cashPage;
cashPage=function(){return cashEntryPage()+dailyCashPanel(cashDate,true)};
document.addEventListener('change',e=>{
 if(e.target.id==='dashboard-date'){try{validateSaleDate(e.target.value);dashboardDate=e.target.value;render()}catch(err){e.target.value=dashboardDate;toast(err.message)}}
});
function monthlyDashboardData(month){
 const sales=state.sales.filter(s=>s.date.startsWith(month)),ids=new Set(state.customers.map(c=>c.id));
 return {revenue:roundAmount(sales.reduce((a,s)=>a+total(s),0)),activeCustomers:new Set(sales.filter(s=>s.customer&&ids.has(s.customer)).map(s=>s.customer)).size};
}
function revenueTrend(month){
 const anchor=new Date(month+'-01T00:00:00Z');
 return Array.from({length:12},(_,i)=>{const d=new Date(anchor);d.setUTCMonth(d.getUTCMonth()-11+i);const key=d.toISOString().slice(0,7);return {month:key,date:key+'-01',label:d.toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'}),revenue:roundAmount(state.sales.filter(s=>s.date.startsWith(key)).reduce((a,s)=>a+total(s),0))}});
}
function revenueTrendPanel(month){
 const rows=revenueTrend(month),ceiling=Math.max(1,...rows.map(r=>r.revenue)),width=620,height=190,left=55,top=20,bottom=155,right=600;
 const points=rows.map((r,i)=>({x:rows.length===1?(left+right)/2:left+i/(rows.length-1)*(right-left),y:bottom-r.revenue/ceiling*(bottom-top),...r}));
 const path=points.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ');
 return `<article class="card revenue-trend"><div class="card-heading table-top"><div><h2>Revenue trend</h2><div class="card-subtitle">Monthly invoice revenue · last 12 months through ${month}</div></div></div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly revenue through ${month}"><title>Monthly invoiced revenue through ${month}</title>${[0,.5,1].map(f=>{const y=bottom-f*(bottom-top);return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#e6ece2"/><text x="${left-8}" y="${y+3}" text-anchor="end" fill="#8d9b86" font-size="9">${money(ceiling*f)}</text>`}).join('')}<path d="${path}" stroke="#26734e" stroke-width="2.5" fill="none" stroke-linejoin="round"/>${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3" fill="#26734e"><title>${p.month}: Rs. ${money(p.revenue)}</title></circle>`).join('')}${[0,2,4,6,8,11].map(i=>`<text x="${points[i].x}" y="178" text-anchor="middle" fill="#8d9b86" font-size="10">${rows[i].label}</text>`).join('')}</svg><div class="chart-note">Revenue = gas invoice amounts + parts invoice amounts. Debt recovery is not counted again.</div></article>`;
}
function stockAlerts(){
 const alerts=[];
 for(const name of ['Main godown','Shop','Supply vehicle']){const qty=locationStock(name);if(qty<=state.stockAlertSettings.gasKg)alerts.push({kind:'Gas',name,qty,unit:'kg',threshold:state.stockAlertSettings.gasKg})}
 for(const part of state.partItems){const qty=partInventory(part.id).qty;if(qty<=state.stockAlertSettings.partsQty)alerts.push({kind:'Parts',name:part.name,qty,unit:'pcs',threshold:state.stockAlertSettings.partsQty})}
 return alerts;
}
function dashboardInsights(month){
 const alerts=stockAlerts();
 return `<div class="dashboard-insights">${revenueTrendPanel(month)}<article class="card"><div class="card-heading table-top"><div><h2>Stock overview</h2><div class="card-subtitle">Current gas stock by location</div></div><button class="card-link" data-page="Gas & inventory">View inventory ↗</button></div>${table(['LOCATION','AVAILABLE','STATUS'],['Main godown','Shop','Supply vehicle'].map(name=>{const qty=locationStock(name),low=qty<=state.stockAlertSettings.gasKg;return `<tr><td>${name}</td><td><strong>${money(qty)} kg</strong></td><td><span class="badge ${low?'credit':'paid'}">${qty<=0?'Out of stock':low?'Low stock':'Available'}</span></td></tr>`}))}<div class="table-bottom"><span>Parts: ${state.partItems.reduce((a,p)=>a+partInventory(p.id).qty,0)} pieces in tracked inventory</span></div></article></div><article class="card low-stock-card"><div class="card-heading table-top"><div><h2>Low stock alerts</h2><div class="card-subtitle">${alerts.length?alerts.length+' item/location alerts':'All recorded gas locations and parts are above the alert levels.'}</div></div></div><div class="stock-alert-list">${alerts.map(a=>`<div><span><strong>${esc(a.name)}</strong><small>${a.kind} · alert level ${money(a.threshold)} ${a.unit}</small></span><strong>${money(a.qty)} ${a.unit}</strong></div>`).join('')}</div><details class="alert-settings"><summary>Set low stock alert levels</summary><form id="stock-alert-settings"><label class="field">Gas per location (kg)<input type="number" name="gasKg" min="0" step="0.01" required value="${state.stockAlertSettings.gasKg}"></label><label class="field">Parts per item (pieces)<input type="number" name="partsQty" min="0" step="1" required value="${state.stockAlertSettings.partsQty}"></label><button class="button secondary">Save alert levels</button></form><p class="card-subtitle">Alerts use recorded inventory. Cash gas entries without weight cannot reduce kg stock.</p></details></article>`;
}
document.addEventListener('submit',e=>{
 if(e.target.id!=='stock-alert-settings')return;e.preventDefault();const f=new FormData(e.target),gasKg=Number(f.get('gasKg')),partsQty=Number(f.get('partsQty'));
 if(!Number.isFinite(gasKg)||gasKg<0||!Number.isSafeInteger(partsQty)||partsQty<0){toast('Enter valid non-negative alert levels.');return}
 const old=structuredClone(state.stockAlertSettings);try{state.stockAlertSettings={gasKg,partsQty};save();render();toast('Low stock alert levels saved.')}catch(err){state.stockAlertSettings=old;toast(err.message)}
});
function closingFormulaTotals(r){
 const sum=key=>roundAmount(r.customers.reduce((a,c)=>a+(c[key]||0),0));
 return {opening:sum('opening'),newOpening:sum('newOpening'),bills:sum('bills'),received:sum('received'),closing:sum('closing'),cylOpening:sum('cylOpening'),cylOut:sum('out'),cylIn:sum('inside'),cylClosing:sum('cylClosing'),revenue:roundAmount(r.gasSales+r.partsSales),afterExpenses:roundAmount(r.collections-(r.expenses||0))};
}
