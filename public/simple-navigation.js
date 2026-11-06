// Presentation only: keep existing routes, saved records and accounting handlers.
const SIMPLE_GROUPS = [
  {name:'Dashboard',icon:'▦',routes:[['Overview','Dashboard']]},
  {name:'Sales',icon:'↙',routes:[['Sales','Sales'],['Invoices','Invoices'],['Receipts','Receipts'],['Expenses','Expenses']]},
  {name:'Khata',icon:'♙',routes:[['Money & cylinder ledger','Customers'],['Supplier credit','Suppliers']]},
  {name:'Stock',icon:'◫',routes:[['Gas & inventory','Gas'],['Cylinder tracking','Cylinders'],['Gas parts','Parts'],['Gas calculator','Purchase calculator']]},
  {name:'Reports',icon:'▥',routes:[['Reports','Reports']]}
];
let simpleSalesMode='retail';
let simplePaymentDetailsOpen=false;
const cashBeforeSimpleNavigation=cashPage;
cashPage=function(){
  const box=document.createElement('div');box.innerHTML=cashBeforeSimpleNavigation();
  const details=document.createElement('details');details.className='simple-details simple-payment-details';details.open=simplePaymentDetailsOpen;
  details.innerHTML='<summary>Cash breakdown, online history & transfers</summary>';
  box.querySelectorAll('.daily-cash-card,.daily-payment-workspace').forEach(el=>details.appendChild(el));
  const summary=box.querySelector('.daily-payment-summary .stats');
  summary?.insertAdjacentHTML('afterbegin',stat('Total daily cash',money(dailyCash(cashDate).net),'↙','After expenses and cash transfers'));
  box.appendChild(details);return box.innerHTML;
};
document.addEventListener('toggle',e=>{if(e.target.matches?.('.simple-payment-details'))simplePaymentDetailsOpen=e.target.open},true);
function simpleGroup(){return SIMPLE_GROUPS.find(g=>g.routes.some(([route])=>route===page))||SIMPLE_GROUPS[0]}
function simpleGo(route){
  if(route==='Money & cylinder ledger')bookCustomer='';
  if(route==='Sales'){salesView='cash';simpleSalesMode='retail'}
  if(route==='Reports')reportsView='daily';
  page=route;query='';render();document.querySelector('.sidebar').classList.remove('open');
}
function simpleSectionTabs(group){
  if(group.routes.length<2)return '';
  return `<div class="simple-section-tabs parts-tabs" aria-label="${group.name} sections">${group.routes.map(([route,label])=>`<button type="button" data-page="${esc(route)}" class="${page===route?'selected':''}" ${page===route?'aria-current="page"':''}>${esc(label)}</button>`).join('')}</div>`;
}
function simpleCashEntry(){
  action='simple-cash-choice';
  showDetail('Cash entry',`<p>Choose one entry. Its cash or online account is updated automatically.</p><div class="simple-action-grid"><button type="button" class="button secondary" data-simple-cash="expense">Expense</button><button type="button" class="button secondary" data-simple-cash="home">Cash sent home</button><button type="button" class="button secondary" data-simple-cash="transfer">Transfer out / between accounts</button><button type="button" class="button secondary" data-simple-cash="receive">Receive customer payment</button></div><button type="button" class="card-link" data-simple-history>View daily payments & transfers ↗</button>`);
  document.querySelector('.dialog-actions').style.display='none';
}
function simplifySettings(){
  if(document.getElementById('simple-settings'))return;
  const settings=document.createElement('details');settings.id='simple-settings';
  settings.innerHTML='<summary>Settings & backups</summary><div class="simple-settings-content"></div>';
  const box=settings.querySelector('div');
  ['owner-account','save-workspace','save-backup','open-backup','manage-records','reset-business','exit-workspace','owner-logout'].forEach(id=>{const b=document.getElementById(id);if(b)box.appendChild(b)});
  const actions=document.querySelector('.workspace-file-actions');actions.hidden=true;
  document.querySelector('.header-right').appendChild(settings);
  const cash=document.createElement('button');cash.type='button';cash.id='simple-cash-entry';cash.className='button secondary';cash.textContent='＋ Cash entry';
  document.querySelector('.heading-actions').prepend(cash);
  document.querySelector('.demo-banner')?.remove();
}
const renderBeforeSimpleNavigation=render;
render=function(){
  renderBeforeSimpleNavigation();simplifySettings();
  const group=simpleGroup();
  document.getElementById('nav').innerHTML=SIMPLE_GROUPS.map(g=>`<button type="button" data-main="${g.name}" class="${g===group?'active':''}" ${g===group?'aria-current="page"':''}><span class="nav-icon">${g.icon}</span>${g.name}</button>`).join('');
  document.getElementById('content').insertAdjacentHTML('afterbegin',simpleSectionTabs(group));
  const label=group.routes.find(([route])=>route===page)?.[1]||group.name;
  document.getElementById('crumb').textContent=group.name+(label===group.name?'':' / '+label);
  document.getElementById('page-title').innerHTML=esc(page==='Money & cylinder ledger'?'Khata · Udhaar book':page==='Supplier credit'?'Khata · Suppliers':group.name==='Stock'?'Stock · '+label:label)+'<span class="title-dot">.</span>';
  document.querySelector('.eyebrow').textContent='LATIF LPG AGENCY';
  document.title=group.name+' · LATIF LPG AGENCY';
  document.getElementById('new-sale').hidden=page!=='Sales';
  document.getElementById('new-sale').innerHTML='＋ New sale';
  document.querySelectorAll('[data-customer-money]').forEach(b=>b.textContent=b.dataset.moneyKind==='credit'?'Receive payment':'Add debt');
  if(page==='Sales')document.getElementById('page-description').textContent='Retail, hotels and shops. Enter each sale once.';
  if(group.name==='Stock')document.getElementById('page-description').textContent='Gas, cylinders and parts — quantities, locations and stock updates.';
  document.getElementById('simple-cash-entry').hidden=!['Overview','Sales','Expenses'].includes(page);
};
const salesBeforeSimpleNavigation=salesPage;
salesPage=function(){
  // Keep the all-invoice and empty-container workflows as optional tools.
  if(salesView!=='cash')return salesBeforeSimpleNavigation();
  const modes=`<div class="simple-sales-modes parts-tabs" aria-label="Sale type">${[['retail','Retail / Walk-in'],['hotel','Hotel supply'],['shop','Shop / Distribution']].map(([id,label])=>`<button type="button" data-simple-sale="${id}" class="${simpleSalesMode===id?'selected':''}">${label}</button>`).join('')}</div>`;
  const tools='<details class="simple-sales-tools simple-details"><summary>Other sales options</summary><button type="button" class="button secondary" data-workspace-tab="sales:customer">All customer sales</button> <button type="button" class="button secondary" data-workspace-tab="sales:cylinders">Sell empty containers</button></details>';
  if(simpleSalesMode==='retail')return modes+cashPage()+tools;
  const hotel=simpleSalesMode==='hotel',rows=state.sales.filter(s=>s.customer&&s.date===cashDate&&(/hotel|restaurant/i.test(customer(s.customer)?.type||'')===hotel));
  return modes+`<article class="card simple-supply"><div class="section-toolbar"><h2>${hotel?'Hotel supply':'Shop / Distribution'}</h2><label class="field">Sale date<input id="cash-date" type="date" value="${esc(cashDate)}" max="${today()}"></label></div><p>One entry updates gas stock, customer khata, payment and cylinders. New supplies use today's date.</p><div class="simple-action-grid"><button type="button" class="button primary" data-simple-supply="${simpleSalesMode}">＋ New supply</button><button type="button" class="button secondary" data-action="customer">＋ Add customer</button></div></article><article class="card"><div class="card-heading"><h2>Supplies · ${esc(cashDate)}</h2></div>${salesTable(rows)}</article>`+dailyPaymentTotals(cashDate)+dailyCashPanel(cashDate,true)+tools;
};
const formBeforeSimpleCustomer=openForm;
openForm=function(kind){
  formBeforeSimpleCustomer(kind);
  if(kind==='customer'&&page==='Sales'&&simpleSalesMode!=='retail'){
    document.getElementById('entry-form').elements.type.value=simpleSalesMode==='hotel'?'Hotel / restaurant':'Shop / wholesale';
  }
};
function openSimpleSupply(kind){
  if(!state.customers.length){toast('Add a customer first.');openForm('customer');return}
  openForm('sale');const f=document.getElementById('entry-form');f.dataset.simpleSupply=kind;
  document.getElementById('dialog-title').textContent=kind==='hotel'?'Hotel cylinder supply':'Shop cylinder supply';
  const preferred=state.customers.find(c=>/hotel|restaurant/i.test(c.type||'')===(kind==='hotel'));
  if(preferred)f.elements.customer.value=preferred.id;
  f.elements.saleBasis.value='Full cylinder';f.elements.channel.value=kind==='hotel'?'Supply':'Wholesale';
  f.elements.cylOut.value=1;f.elements.cylIn.value=0;
  invoiceCylinderQuote();f.elements.fullCylinderPrice.value=cylinderSellingPrice(f.elements.cylinderCapacity.value,today(),'Wholesale')??'';
  // Move the regular supply fields out of advanced options, in working order.
  const host=document.getElementById('form-fields'),ordered=['customer','channel','cylinderCapacity','cylinderType','cylOut','cylIn','fullCylinderPrice'];
  const row=document.createElement('div');row.className='simple-supply-fields';
  for(const name of ordered){const el=f.elements[name],label=el?.closest('label');if(label)row.appendChild(label)}
  host.prepend(row);
  const channel=f.elements.channel;for(const o of channel.options)o.textContent=({Retail:'Shop',Wholesale:'Main godown',Supply:'Supply vehicle'})[o.value];
  channel.closest('label').firstChild.textContent='Dispatch from';
  f.elements.cylOut.closest('label').firstChild.textContent='Full cylinders delivered';
  f.elements.cylOut.min='1';f.elements.cylOut.required=true;
  f.elements.cylIn.closest('label').firstChild.textContent='Empty cylinders returned';
  f.elements.qty.readOnly=true;f.elements.rate.readOnly=true;
  f.elements.saleBasis.closest('label').hidden=true;
  f.elements.kind.closest('label').hidden=true;
  const details=host.querySelector('.sale-options');details.open=false;
  details.querySelector('summary').textContent='Description & cylinder handling';
  const note=f.elements.namedItem('item');note.required=false;note.closest('label').firstChild.textContent='Description (optional)';
  document.querySelector('#entry-form button[type=submit]').textContent='Save supply';
  syncSimpleSupply();
}
function syncSimpleSupply(){
  const f=document.getElementById('entry-form');if(action!=='sale'||!f.dataset.simpleSupply)return;
  f.elements.qty.value=roundKg(Number(f.elements.cylOut.value)*Number(f.elements.cylinderCapacity.value));
  f.dataset.supplyQuote=f.elements.fullCylinderPrice.value;
  const price=Number(f.elements.fullCylinderPrice.value);f.elements.rate.value=price/Number(f.elements.cylinderCapacity.value)||'';
  updateSaleTotals();
}
// Reuse existing atomic sale/cylinder handlers: no second ledger or payment write.
document.addEventListener('submit',e=>{
  if(e.target.id!=='entry-form'||action!=='sale'||!e.target.dataset.simpleSupply)return;
  syncSimpleSupply();
  const f=e.target,source={Retail:'Shop',Wholesale:'Main godown',Supply:'Supply vehicle'}[f.elements.channel.value],stock=cylinderLocationStock()[f.elements.cylinderCapacity.value];
  if((stock.known||stock.recorded)&&Number(f.elements.cylOut.value)>Math.max(0,stock[source])){
    e.preventDefault();e.stopImmediatePropagation();document.getElementById('form-error').textContent='Only '+Math.max(0,stock[source])+' full cylinders of this size are recorded at '+source+'. Choose the correct dispatch location or update stock first.';
  }
},true);
document.getElementById('entry-dialog').addEventListener('close',()=>{delete document.getElementById('entry-form').dataset.simpleSupply;delete document.getElementById('entry-form').dataset.supplyQuote});
document.addEventListener('input',e=>{if(e.target.closest('#entry-form'))syncSimpleSupply()});
document.addEventListener('change',e=>{
  const f=document.getElementById('entry-form');
  if(e.target.closest('#entry-form')&&f.dataset.simpleSupply&&action==='sale'){
    if(e.target.name==='cylinderCapacity')f.elements.fullCylinderPrice.value=cylinderSellingPrice(f.elements.cylinderCapacity.value,today(),'Wholesale')??'';
    if(e.target.name==='channel'&&f.dataset.supplyQuote)f.elements.fullCylinderPrice.value=f.dataset.supplyQuote;
    if(['cylinderCapacity','channel'].includes(e.target.name))f.querySelector('.sale-options').open=false;
    syncSimpleSupply();
  }
});
document.addEventListener('click',e=>{
  const main=e.target.closest('[data-main]');if(main){simpleGo(SIMPLE_GROUPS.find(g=>g.name===main.dataset.main).routes[0][0]);return}
  if(e.target.closest('#simple-settings button'))document.getElementById('simple-settings').open=false;
  const mode=e.target.closest('[data-simple-sale]');if(mode){simpleSalesMode=mode.dataset.simpleSale;salesView='cash';render();return}
  const supply=e.target.closest('button[data-simple-supply]');if(supply){openSimpleSupply(supply.dataset.simpleSupply);return}
  if(e.target.closest('#simple-cash-entry')){simpleCashEntry();return}
  const cash=e.target.closest('[data-simple-cash]');if(cash){const kind=cash.dataset.simpleCash;document.getElementById('entry-dialog').close();const date=page==='Overview'?dashboardDate:page==='Expenses'?expenseDate:cashDate;if(kind==='expense'){expenseDate=date;openForm('expense')}else if(kind==='receive'){bookCustomer='';simpleGo('Money & cylinder ledger');openForm('receipt')}else{openMoneyForm('transfer');const f=document.getElementById('entry-form');f.elements.date.value=date;if(kind==='home'){f.elements.from.value='Cash';f.elements.to.value='Home / owner';f.elements.purpose.value='Owner withdrawal'}}return}
  if(e.target.closest('[data-simple-history]')){document.getElementById('entry-dialog').close();cashDate=page==='Overview'?dashboardDate:cashDate;simpleGo('Sales');simplePaymentDetailsOpen=true;render();document.querySelector('.daily-payment-workspace')?.scrollIntoView({block:'start'})}
});
document.getElementById('new-sale').onclick=()=>{if(simpleSalesMode==='retail')openForm('cash');else openSimpleSupply(simpleSalesMode)};
render();
// Dismiss the compact settings menu when moving back to the workspace.
document.addEventListener('click',e=>{const settings=document.getElementById('simple-settings');if(settings?.open&&!settings.contains(e.target))settings.open=false},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('simple-settings').open=false});
