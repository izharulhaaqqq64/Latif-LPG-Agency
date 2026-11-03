const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page = await browser.newPage({viewport:{width:1440,height:1100}});
 const navigate=async(name)=>{
  const routes={'Daily cash sales':['Sales','sales:cash'],'Sales & invoices':['Sales','sales:customer'],'Customers & ledger':['Money & cylinder ledger',null],'Automatic ledger':['Money & cylinder ledger',null],'Collections':['Money & cylinder ledger',null],'Godowns':['Gas & inventory',null],'Monthly closing':['Reports','reports:monthly'],'Reports':['Reports','reports:daily']};
  const [root,tab]=routes[name]||[name,null];
  await page.locator(`nav [data-page="${root}"]`).click();
  if(tab)await page.locator(`[data-workspace-tab="${tab}"]`).click();
 };
 const assertLedgerBalance=async(expected)=>{const debit=Number((await page.locator('#ledger-total-value').innerText()).replace('Rs.','').replace(/,/g,'').trim()),credit=Number((await page.locator('#ledger-total-credit').innerText()).replace('Rs.','').replace(/,/g,'').trim());assert.equal(debit-credit,expected)};
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3000');
 await page.screenshot({path:'/tmp/latif-desktop.png',fullPage:true});
 await navigate('Sales & invoices');
 await page.locator('[data-action=sale]').click();
 await page.locator('[name=customer]').selectOption('c2');
 await page.locator('[name=qty]').fill('2');
 await page.locator('[name=rate]').fill('290');
 await page.locator('[name=paid]').fill('0');
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.equal(await page.locator('dialog').evaluate(e=>e.open),false);
 let data=await page.evaluate(()=>JSON.parse(localStorage.getItem('latif-lpg-v1')));
 assert.equal(data.sales[0].qty,2);assert.equal(data.sales[0].paid,0);
 await navigate('Customers & ledger');
 await page.locator('#ledger-customer').selectOption('c2');
 assert.match(await page.locator('#content').innerText(),/580/);
 await navigate('Collections');
 await page.locator('[data-action=receipt]').click();
 await page.locator('[name=customer]').selectOption('c2');
 await page.locator('[name=amount]').fill('200');
 await page.getByRole('button',{name:'Save entry'}).click();
 await page.reload();
 data=await page.evaluate(()=>JSON.parse(localStorage.getItem('latif-lpg-v1')));
 assert.equal(data.receipts[0].amount,200);
 await navigate('Customers & ledger');
 await page.locator('#ledger-customer').selectOption('c2');
 assert.match(await page.locator('#content').innerText(),/380/);
 for (const name of ['Sales & invoices','Gas & inventory','Cylinder tracking','Godowns','Reports']) {
  await navigate(name);
  assert.ok((await page.locator('#content').innerText()).length>50);
 }
 // Simplified sale calculates the bill, posts the ledger and links cylinder quantities.
 await navigate('Sales & invoices');
 await page.locator('[data-action=sale]').click();
 await page.locator('[name=customer]').selectOption('c2');
 await page.locator('[name=qty]').fill('3');
 await page.locator('[name=rate]').fill('100');
 await page.locator('[data-payment=full]').click();
 assert.equal(await page.locator('[name=paid]').inputValue(),'300');
 await page.locator('[name=qty]').fill('4');
 assert.equal(await page.locator('[name=paid]').inputValue(),'400');
 await page.locator('[data-payment=credit]').click();
 await page.locator('summary').click();
 await page.locator('[name=cylOut]').fill('3');
 await page.locator('[name=cylIn]').fill('1');
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.equal(await page.locator('dialog').evaluate(e=>e.open),false);
 await navigate('Automatic ledger');
 await page.locator('#ledger-customer').selectOption('c2');
 assert.match(await page.locator('#ledger-table').innerText(),/780/);
 await navigate('Cylinder tracking');
 const cylinderRow=page.locator('#content tr').filter({hasText:'Ahmed Ali'}).first();
 assert.match(await cylinderRow.innerText(),/2 pcs/);
 await page.locator('[data-action=cylinder]').click();
 await page.locator('[name=customer]').selectOption('c2');
 await page.locator('[name=direction]').selectOption('In');
 await page.locator('[name=qty]').fill('3');
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.match(await page.locator('#form-error').innerText(),/exceed|insufficient/i);
 await page.locator('[name=qty]').fill('2');
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.match(await cylinderRow.innerText(),/0 pcs/);
 await page.reload();
 data=await page.evaluate(()=>JSON.parse(localStorage.getItem('latif-lpg-v1')));
 assert.equal(data.cylinders.filter(c=>c.customer==='c2').reduce((a,c)=>a+(c.direction==='Out'?c.qty:-c.qty),0),0);
 // Amount-only cash entry requires no customer or fabricated gas quantity.
 await navigate('Daily cash sales');
 await page.locator('#quick-cash-form [name=amount]').fill('500');
 await page.locator('#quick-cash-form button').click();
 await page.locator('#quick-cash-form [name=amount]').fill('250');
 await page.locator('#quick-cash-form button').click();
 assert.match(await page.locator('#cash-day-total').innerText(),/750/);
 data=await page.evaluate(()=>JSON.parse(localStorage.getItem('latif-lpg-v1')));
 assert.equal(data.sales[0].customer,null);assert.equal(data.sales[0].qty,0);assert.equal(data.sales[0].amount,250);
 // Create, restock and sell a part. Weighted cost 150, sale 300 => profit 150 per piece.
 await navigate('Gas parts');
 await page.locator('[data-action=part-new]').click();
 await page.locator('[name=name]').fill('Test regulator');
 await page.locator('[name=qty]').fill('10');
 await page.locator('[name=cost]').fill('100');
 await page.locator('[name=rate]').fill('300');
 await page.getByRole('button',{name:'Save entry'}).click();
 await page.locator('[data-action=part-buy]').click();
 await page.locator('[name=qty]').fill('10');
 await page.locator('[name=cost]').fill('200');
 await page.getByRole('button',{name:'Save entry'}).click();
 await page.locator('[data-action=part-sale]').click();
 await page.locator('[name=qty]').fill('21');
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.match(await page.locator('#form-error').innerText(),/exceed|insufficient/i);
 await page.locator('[name=qty]').fill('2');
 await page.getByRole('button',{name:'Save entry'}).click();
 data=await page.evaluate(()=>JSON.parse(localStorage.getItem('latif-lpg-v1')));
 assert.equal(data.sales[0].costPerUnit,150);assert.equal(data.sales[0].paid,600);
 assert.match(await page.locator('#content table').innerText(),/18 pcs/);
 await page.locator('[data-parts-view=prices]').click();
 const priceCells=page.locator('#content table tbody tr').first().locator('td');
 assert.equal(await priceCells.nth(1).innerText(),'Rs. 150');
 assert.equal(await priceCells.nth(3).innerText(),'Rs. 150');
 assert.equal(await priceCells.nth(4).innerText(),'Rs. 300');
 await page.reload();
 await navigate('Gas parts');
 assert.match(await page.locator('#content table').innerText(),/18 pcs/);
 await navigate('Automatic ledger');
 assert.match(await page.locator('#ledger-table').innerText(),/Cash sale/);
 // A customer's money and cylinder balance are visible together.
 await page.locator('#ledger-customer').selectOption('c1');
 await assertLedgerBalance(12800);
 assert.equal(await page.locator('#account-cylinders').innerText(),'4 pcs');
 assert.match(await page.locator('#account-cylinder-sizes').innerText(),/Size not recorded: 4 pcs/);
 // Capacity-specific dispatches and returns cannot cancel another cylinder size.
 await navigate('Cylinder tracking');
 for(const [capacity,qty] of [['15','2'],['45.5','1']]){
  await page.locator('[data-action=cylinder]').click();
  await page.locator('[name=customer]').selectOption('c5');
  await page.locator('[name=capacity]').selectOption(capacity);
  await page.locator('[name=qty]').fill(qty);
  await page.getByRole('button',{name:'Save entry'}).click();
 }
 await page.locator('[data-action=cylinder]').click();
 await page.locator('[name=customer]').selectOption('c5');
 await page.locator('[name=direction]').selectOption('In');
 await page.locator('[name=qty]').fill('1');
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.match(await page.locator('#form-error').innerText(),/size/);
 await page.locator('[name=capacity]').selectOption('15');
 await page.getByRole('button',{name:'Save entry'}).click();
 await navigate('Automatic ledger');
 await page.locator('#ledger-customer').selectOption('c5');
 assert.equal(await page.locator('#account-cylinders').innerText(),'2 pcs');
 assert.match(await page.locator('#account-cylinder-sizes').innerText(),/15 kg: 1 pcs/);
 assert.match(await page.locator('#account-cylinder-sizes').innerText(),/45.5 kg: 1 pcs/);
 assert.match(await page.locator('#ledger-table').innerText(),/Cylinder.*15 kg/);
 // Calculator: kg <-> units and unit pricing, without posting a sale.
 await navigate('Gas calculator');
 // Plant purchase: 40 x 15 kg + 10 x 45.4 kg, priced per 11.8 kg.
 const plantQuantities=page.locator('[data-plant-field=quantity]');
 await plantQuantities.nth(0).fill('40');
 await plantQuantities.nth(1).fill('10');
 await page.locator('[name=plantRate]').fill('1180');
 const purchaseResult=await page.locator('#plant-result').innerText();
 assert.match(purchaseResult,/1,054/);assert.match(purchaseResult,/89.322034/);assert.match(purchaseResult,/105,400/);
 await plantQuantities.nth(0).fill('1.5');
 assert.match(await page.locator('#plant-result').innerText(),/whole number/);
 await plantQuantities.nth(0).fill('40');
 await page.locator('#add-plant-row').click();
 await page.locator('[data-plant-field=quantity]').nth(2).fill('2');
 assert.match(await page.locator('#plant-result').innerText(),/1,077.6/);
 await page.locator('[data-remove-plant-row]').nth(2).click();
 assert.match(await page.locator('#plant-result').innerText(),/1,054/);
 const beforePurchase=await page.evaluate(()=>({stock:gasStock(),sales:state.sales.length}));
 await page.locator('#save-plant-purchase').click();
 await page.getByRole('button',{name:'Save entry'}).click();
 const purchase=await page.evaluate(()=>({stock:gasStock(),sales:state.sales.length,record:state.stock[0]}));
 assert.equal(purchase.stock-beforePurchase.stock,1054);
 assert.equal(purchase.sales,beforePurchase.sales);
 assert.equal(purchase.record.purchaseCost,105400);
 assert.equal(purchase.record.plantPurchase.lines[1].capacity,45.4);
 assert.equal(purchase.record.plantPurchase.units,1054/11.8);
 await page.locator('[data-calculator-tab=conversion]').click();
 await page.locator('[name=calcQuantity]').fill('23.6');
 await page.locator('[name=calcRate]').fill('1180');
 let calcText=await page.locator('#calculator-result').innerText();
 assert.match(calcText,/units\s*2/);assert.match(calcText,/2,360/);
 await page.locator('[name=calcMode]').selectOption('units');
 await page.locator('[name=calcQuantity]').fill('2');
 assert.match(await page.locator('#calculator-result').innerText(),/kg\s*23\.6/);
 await page.locator('[name=calcMode]').selectOption('cylinders');
 await page.locator('[name=calcSize]').selectOption('45.5');
 await page.locator('[name=calcQuantity]').fill('2');
 await page.locator('[name=calcBasis]').selectOption('kg');
 await page.locator('[name=calcRate]').fill('100');
 assert.match(await page.locator('#calculator-result').innerText(),/kg\s*91/);
 assert.match(await page.locator('#calculator-result').innerText(),/9,100/);
 const beforeCalculator=await page.evaluate(()=>state.sales.length);
 await page.locator('#calculator-cash').click();
 assert.equal(await page.locator('[name=gasQty]').inputValue(),'91');
 assert.equal(await page.locator('[name=amount]').inputValue(),'9100');
 await page.locator('#cancel-dialog').click();
 assert.equal(await page.evaluate(()=>state.sales.length),beforeCalculator);
 // Historical daily entries are saved to the selected day, not to today.
 const dates=await page.evaluate(()=>{const now=today(),d=new Date(now+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);const previous=d.toISOString().slice(0,10);d.setUTCDate(0);return {now,previous,priorMonthEnd:d.toISOString().slice(0,10)}});
 await navigate('Daily cash sales');
 await page.locator('#cash-date').fill(dates.previous);
 await page.locator('#quick-cash-form [name=amount]').fill('125');
 await page.locator('#quick-cash-form button').click();
 assert.equal(await page.locator('#cash-day-total').innerText(),'Rs. 125');
 await page.locator('#cash-date').fill(dates.now);
 assert.equal(await page.locator('#cash-day-total').innerText(),'Rs. 750');
 // Seed prior-month activity to verify opening/carry-forward boundary math.
 await page.evaluate(({priorMonthEnd})=>{
  const data=JSON.parse(localStorage.getItem('latif-lpg-v1'));
  data.sales.push({id:'900',customer:'c2',kind:'Gas',channel:'Retail',qty:1,rate:1000,paid:0,date:priorMonthEnd});
  data.cylinders.push({id:'prior-cyl',customer:'c2',direction:'Out',qty:2,date:priorMonthEnd,note:'Prior month'});
  localStorage.setItem('latif-lpg-v1',JSON.stringify(data));
 },dates);
 await page.reload();
 await navigate('Monthly closing');
 const monthlyCustomer=page.locator('#content table tbody tr').filter({hasText:'Ahmed Ali'}).locator('td');
 assert.equal(await monthlyCustomer.nth(1).innerText(),'1,000');
 assert.equal(await monthlyCustomer.nth(5).innerText(),'1,780');
 assert.equal(await monthlyCustomer.nth(6).innerText(),'2 pcs');
 assert.equal(await monthlyCustomer.nth(9).innerText(),'2 pcs');
 assert.equal(await page.locator('.closing-formulas').count(),0);
 for(const label of ['Gas value','Parts value','Money in market','Last month closing','Cash'])assert.match(await page.locator('#monthly-values').innerText(),new RegExp(label));
 await page.locator('#close-month').click();
 await page.reload();
 await navigate('Monthly closing');
 assert.equal(await page.locator('#reopen-month').count(),1);
 const savedSizes=await page.evaluate(()=>state.monthClosings[today().slice(0,7)].report.customers.find(c=>c.id==='c5').cylBySize);
 assert.equal(savedSizes.find(x=>x.capacity==='15').closing,1);
 assert.equal(savedSizes.find(x=>x.capacity==='45.5').closing,1);
 await navigate('Daily cash sales');
 await page.locator('#quick-cash-form [name=amount]').fill('999');
 await page.locator('#quick-cash-form button').click();
 await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('monthly closing'));
 assert.match(await page.locator('#toast').textContent(),/monthly closing/i);
 assert.equal(await page.locator('#cash-day-total').innerText(),'Rs. 750');
 const carried=await page.evaluate(()=>{const d=new Date(today().slice(0,7)+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);return monthReport(d.toISOString().slice(0,7)).customers.find(c=>c.id==='c2')});
 assert.equal(carried.opening,1780);assert.equal(carried.cylOpening,2);
 await navigate('Monthly closing');
 await page.locator('#reopen-month').click();
 await navigate('Daily cash sales');
 await page.locator('#quick-cash-form [name=amount]').fill('10');
 await page.locator('#quick-cash-form button').click();
 assert.equal(await page.locator('#cash-day-total').innerText(),'Rs. 760');
 // One credit workspace replaces three sidebar pages without losing balances.
 assert.equal(await page.locator('nav button').count(),10);
 assert.equal(await page.locator('nav [data-page="Automatic ledger"]').count(),0);
 await navigate('Customers & ledger');
 await page.locator('[data-action=credit-entry]').click();
 await page.locator('[name=customer]').selectOption('c5');
 await page.locator('[name=date]').fill(dates.previous);
 await page.locator('[name=amount]').fill('1000');
 await page.locator('[name=note]').fill('Additional delivery credit');
 await page.locator('[name=dueDate]').fill(dates.previous);
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.equal(await page.locator('[data-workspace-tab^="book:"]').count(),0);
 assert.match(await page.locator('.ledger-context').innerText(),new RegExp(dates.previous));
 await page.locator('#ledger-collect').click();
 assert.equal(await page.locator('[name=customer]').inputValue(),'c5');
 await page.locator('[name=amount]').fill('300');
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.match(await page.locator('#ledger-table').innerText(),/Collection/);
 await page.locator('[data-reminder=c5]').click();
 assert.match(await page.locator('#reminder-draft').inputValue(),/21,700/);
 await page.locator('#close-dialog').click();

 await assertLedgerBalance(21700);
 assert.match(await page.locator('#account-last-purchase').innerText(),new RegExp(dates.now));
 assert.match(await page.locator('#ledger-table').innerText(),/Additional delivery credit/);
 const statementDownload=page.waitForEvent('download');
 await page.locator('#export-statement').click();
 const statement=await statementDownload;
 assert.match(statement.suggestedFilename(),/customer-statement.*csv/);
 // Date-filtered operating expenses flow into both daily and monthly reports.
 await navigate('Expenses');
 await page.locator('#expense-date').fill(dates.previous);
 await page.locator('[data-action=expense]').click();
 await page.locator('[name=amount]').fill('150');
 await page.locator('[name=note]').fill('Delivery truck fuel');
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.match(await page.locator('#content table').innerText(),/Delivery truck fuel/);
 await navigate('Reports');
 await page.locator('#report-date').fill(dates.previous);
 assert.match(await page.locator('#report-content').innerText(),/Operating expenses/);
 assert.match(await page.locator('#report-content').innerText(),/150/);
 const reportWithCredit=await page.evaluate(({month})=>monthReport(month),{month:dates.now.slice(0,7)});
 assert.equal(reportWithCredit.customers.find(c=>c.id==='c5').closing,21700);
 const expenseReport=await page.evaluate(({month})=>monthReport(month),{month:dates.previous.slice(0,7)});
 assert.equal(expenseReport.expenses,150);
 await page.reload();
 await navigate('Expenses');
 await page.locator('#expense-date').fill(dates.previous);
 assert.match(await page.locator('#content table').innerText(),/Delivery truck fuel/);
 // Empty stock requires explicit opening quantities and remains separate from gas.
 await navigate('Cylinder tracking');
 await page.locator('[data-action=cylinder]').click();
 assert.equal(await page.locator('[name=capacity] option[value="45.4"]').count(),0);
 await page.locator('#cancel-dialog').click();
 const beforeEmpty=await page.evaluate(()=>({complete:emptyStockSummary().complete,counts:Object.fromEntries(TRACKING_CYLINDER_SIZES.map(size=>[size,emptyQuantity(size)])),gas:gasStock()}));
 assert.equal(beforeEmpty.complete,false);
 await page.locator('#empty-stock-details > summary').click();
 for(const [capacity,qty,tare] of [['11.8','10','12'],['15','5','15'],['45.5','2','30']]){
  await page.locator('[data-action=empty-opening]').click();
  await page.locator('[name=capacity]').selectOption(capacity);
  await page.locator('[name=qty]').fill(qty);
  await page.locator('[name=tareKg]').fill(tare);
  await page.getByRole('button',{name:'Save entry'}).click();
 }
 let emptySummary=await page.evaluate(()=>emptyStockSummary());
 const expectedCount=17;
 const expectedWeight=10*12+5*15+2*30;
 assert.equal(emptySummary.complete,true);assert.equal(emptySummary.count,expectedCount);assert.equal(emptySummary.tare,expectedWeight);
 await page.locator('[data-action=empty-movement]').click();
 await page.locator('[name=capacity]').selectOption('11.8');
 await page.locator('[name=direction]').selectOption('Out');
 await page.locator('[name=qty]').fill('999');
 await page.locator('[name=note]').fill('Sent for filling');
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.match(await page.locator('#form-error').innerText(),/exceeds/);
 await page.locator('[name=qty]').fill('3');
 await page.getByRole('button',{name:'Save entry'}).click();
 emptySummary=await page.evaluate(()=>emptyStockSummary());
 assert.equal(emptySummary.count,expectedCount-3);assert.equal(emptySummary.tare,expectedWeight-36);
 assert.equal(await page.evaluate(()=>gasStock()),beforeEmpty.gas);
 // A new customer return after the physical stock count adds one empty of the same size.
 await page.locator('[data-action=cylinder]').click();
 await page.locator('[name=customer]').selectOption('c5');
 await page.locator('[name=capacity]').selectOption('15');
 await page.locator('[name=direction]').selectOption('In');
 await page.locator('[name=qty]').fill('1');
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.equal((await page.evaluate(()=>emptyStockSummary())).count,expectedCount-2);

 await page.reload();
 await navigate('Overview');
 const overview=await page.locator('#overview-stock-stats').innerText();
 assert.equal(await page.locator('#overview-stock-stats .stat').count(),8);
 assert.equal(await page.locator('#content table').count(),1);
 assert.match(overview,/Gas stock/);assert.match(overview,/Parts stock value/);assert.match(overview,/Daily expenses/);assert.match(overview,/Empty cylinders available/);
 assert.equal((await page.evaluate(()=>emptyStockSummary())).count,expectedCount-2);
 await navigate('Automatic ledger');
 await page.locator('#ledger-customer').selectOption('c5');
 assert.match(await page.locator('#account-purchase-age').innerText(),/Time since last purchase:/);
 const ages=await page.evaluate(()=>{
  const old=state.sales;
  try{state.sales=[{id:'t',customer:'age-test',date:'2026-01-02',createdAt:'2026-01-02T05:00:00Z'}];const timed=purchaseAge('age-test',Date.parse('2026-01-02T07:30:00Z'));state.sales=[{id:'t',customer:'age-test',date:'2026-01-01'}];return {timed,dateOnly:purchaseAge('age-test',Date.parse('2026-01-02T07:30:00Z'))}}finally{state.sales=old}
 });
 assert.equal(ages.timed,'2 hr 30 min ago');assert.equal(ages.dateOnly,'1 day ago (time not recorded)');
 // Daily cash includes sales + cash recoveries, excludes credit/bank/wallet, and subtracts only cash expenses for net flow.
 const cashTotals=await page.evaluate(()=>{
  const original=state;
  try{
   state={...state,sales:[{date:'2026-01-02',paid:100,method:'Cash'},{date:'2026-01-02',paid:50},{date:'2026-01-02',paid:0,method:'Cash'},{date:'2026-01-02',paid:200,method:'Bank transfer'},{date:'2026-01-02',paid:300,method:'Easypaisa / JazzCash'},{date:'2026-01-01',paid:999,method:'Cash'}],receipts:[{date:'2026-01-02',amount:25,method:'Cash'},{date:'2026-01-02',amount:100,method:'Bank transfer'}],expenses:[{date:'2026-01-02',amount:10,method:'Cash'},{date:'2026-01-02',amount:50,method:'Bank transfer'}]};
   return {current:dailyCash('2026-01-02'),previous:dailyCash('2026-01-01')};
  }finally{state=original}
 });
 assert.deepEqual(cashTotals.current,{cashSales:150,recoveries:25,expenses:10,supplierPayments:0,total:175,net:165});
 assert.equal(cashTotals.previous.total,999);
 await navigate('Overview');
 await page.locator('#dashboard-date').fill(dates.previous);
 assert.equal(await page.locator('#dashboard-daily-cash').innerText(),'Rs. 125');
 await page.locator('#dashboard-date').fill(dates.now);
 const expectedDailyCash=await page.evaluate(()=>money(dailyCash(today()).total));
 assert.equal(await page.locator('#dashboard-daily-cash').innerText(),'Rs. '+expectedDailyCash);
 await navigate('Daily cash sales');
 assert.equal(await page.locator('#sales-daily-cash').innerText(),'Rs. '+expectedDailyCash);
 // Monthly revenue counts invoice amounts once; active customers require a purchase, not a collection.
 const monthlyFixture=await page.evaluate(()=>{
  const original=state;
  try{
   state={...state,customers:[{id:'a'},{id:'b'}],sales:[{date:'2026-01-01',customer:'a',amount:100},{date:'2026-01-02',customer:'a',amount:200},{date:'2026-01-03',customer:null,amount:300},{date:'2026-02-01',customer:'b',amount:999}],receipts:[{date:'2026-01-04',customer:'b',amount:50}]};
   return {month:monthlyDashboardData('2026-01'),trend:revenueTrend('2026-01')};
  }finally{state=original}
 });
 assert.deepEqual(monthlyFixture.month,{revenue:600,activeCustomers:1});
 assert.equal(monthlyFixture.trend.length,12);assert.equal(monthlyFixture.trend.reduce((a,d)=>a+d.revenue,0),600);
 await navigate('Overview');
 assert.match(await page.locator('#overview-stock-stats').innerText(),/Monthly revenue/);
 assert.match(await page.locator('#overview-stock-stats').innerText(),/Active customers/);
 assert.equal(await page.locator('.revenue-trend svg').count(),1);
 assert.match(await page.locator('.dashboard-insights').innerText(),/Stock overview/);
 // Set actual full-cylinder counts, then save cylinder-wise alert levels.
 await page.locator('[data-action=filled-stock]').first().click();
 for(const [i,size] of ['11.8','15','45.4'].entries()){
  if(i)await page.locator('[data-action=filled-stock]').first().click();
  await page.locator('[name=capacity]').selectOption(size);await page.locator('[name=qty]').fill('10');
  await page.getByRole('button',{name:'Save entry'}).click();
 }
 assert.match(await page.locator('.dashboard-insights table').innerText(),/45.4 kg/);
 assert.doesNotMatch(await page.locator('.dashboard-insights table').innerText(),/Main godown/);
 await page.locator('.alert-settings summary').click();
 await page.locator('[name="level-11.8"]').fill('12');await page.locator('[name="level-15"]').fill('0');await page.locator('[name="level-45.4"]').fill('0');
 await page.locator('#stock-alert-settings button').click();
 assert.match(await page.locator('.stock-alert-list').innerText(),/11.8 kg cylinders/);
 await page.reload();
 assert.deepEqual(await page.evaluate(()=>state.cylinderAlertLevels),{'11.8':12,'15':0,'45.4':0});
 await navigate('Cylinder tracking');
 await page.locator('[data-action=cylinder]').click();await page.locator('[name=customer]').selectOption('c5');await page.locator('[name=capacity]').selectOption('15');await page.locator('[name=qty]').fill('999');
 await page.getByRole('button',{name:'Save entry'}).click();assert.match(await page.locator('#form-error').innerText(),/Not enough full/);
 assert.equal((await page.evaluate(()=>fullCylinderStock('15'))).qty,10);
 await page.locator('[name=qty]').fill('2');await page.getByRole('button',{name:'Save entry'}).click();
 assert.equal((await page.evaluate(()=>fullCylinderStock('15'))).qty,8);
 await navigate('Gas calculator');await page.locator('[data-calculator-tab=purchase]').click();
 await page.locator('[data-plant-field=quantity]').nth(0).fill('1');await page.locator('[data-plant-field=quantity]').nth(1).fill('1');
 await page.locator('[name=plantRate]').fill('1180');
 await page.locator('#save-plant-purchase').click();await page.getByRole('button',{name:'Save entry'}).click();
 assert.equal((await page.evaluate(()=>fullCylinderStock('15'))).qty,9);assert.equal((await page.evaluate(()=>fullCylinderStock('45.4'))).qty,11);
 await navigate('Overview');
 const formula=await page.evaluate(()=>closingFormulaTotals({customers:[{opening:100,newOpening:50,bills:200,received:80,closing:270,cylOpening:2,out:4,inside:1,cylClosing:5}],gasSales:300,partsSales:100,collections:90,expenses:10}));
 assert.equal(formula.opening+formula.newOpening+formula.bills-formula.received,formula.closing);
 assert.equal(formula.cylOpening+formula.cylOut-formula.cylIn,formula.cylClosing);
 assert.equal(formula.revenue,400);assert.equal(formula.afterExpenses,80);
 await page.locator('[data-reports-view=monthly]').click();
 assert.equal(await page.locator('#closing-month').count(),1);
 assert.equal(await page.locator('.closing-formulas').count(),0);

 // Ledger totals, physical client count, and period boundary/carry-forward checks.
 await navigate('Automatic ledger');
 await page.locator('#ledger-customer').selectOption('c5');
 await assertLedgerBalance(21700);
 const ledgerTotals=await page.evaluate(()=>ledgerValueTotals('c5'));
 const combined=await page.evaluate(()=>ledgerValueTotals(''));
 assert.equal(await page.locator('#combined-ledger-debit').innerText(),'Rs. '+await page.evaluate(n=>money(n),combined.debits));
 assert.equal(await page.locator('#combined-ledger-credit').innerText(),'Rs. '+await page.evaluate(n=>money(n),combined.received));
 assert.doesNotMatch(await page.locator('.combined-ledger').innerText(),/Money owed|Combined total|Net outstanding/);
 assert.equal(ledgerTotals.debits-ledgerTotals.received,ledgerTotals.balance);
 assert.equal(await page.locator('#ledger-total-value').innerText(),'Rs. '+await page.evaluate(value=>money(value),ledgerTotals.debits));
 await navigate('Cylinder tracking');
 const clientTotal=await page.evaluate(()=>clientCylinderTotals());
 assert.equal(await page.locator('#client-cylinder-count').innerText(),clientTotal.total+' pcs');
 assert.ok(clientTotal.unmatched>0);
 const boundaries=await page.evaluate(()=>({day:closingRange('daily','2026-01-31'),week:closingRange('weekly','2026-02-01'),month:closingRange('monthly','2026-02-15')}));
 assert.deepEqual(boundaries.day,{start:'2026-01-31',end:'2026-02-01',last:'2026-01-31'});
 assert.deepEqual(boundaries.week,{start:'2026-01-26',end:'2026-02-02',last:'2026-02-01'});
 assert.deepEqual(boundaries.month,{start:'2026-02-01',end:'2026-03-01',last:'2026-02-28'});
 const periodCarry=await page.evaluate(()=>{
  const date=today(),d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);const tomorrow=d.toISOString().slice(0,10),next=new Date(d);next.setUTCDate(next.getUTCDate()+1);
  const first=periodReport(date,tomorrow,'daily'),second=periodReport(tomorrow,next.toISOString().slice(0,10),'next');
  return {first:first.customers.find(c=>c.id==='c5'),second:second.customers.find(c=>c.id==='c5')};
 });
 assert.equal(periodCarry.first.closing,periodCarry.second.opening);
 assert.equal(periodCarry.first.cylClosing,periodCarry.second.cylOpening);
 const gasCarry=await page.evaluate(()=>{const range=closingRange('daily',today()),r=periodReport(range.start,range.end,'today');return {opening:r.gasOpening,received:r.gasReceived,sold:r.gasKg,closing:r.gasClosing,stock:gasStock(),cash:r.cashNet,expected:dailyCash(today()).net}});
 assert.equal(Math.round((gasCarry.opening+gasCarry.received-gasCarry.sold)*100)/100,gasCarry.closing);
 assert.equal(gasCarry.closing,Math.round(gasCarry.stock*100)/100);assert.equal(gasCarry.cash,gasCarry.expected);
 await navigate('Reports');
 await page.locator('[data-workspace-tab="reports:day-close"]').click();
 assert.equal(await page.locator('.closing-formulas').count(),0);
 await page.locator('[data-period-action=save]').click();
 await page.reload();
 await navigate('Reports');
 await page.locator('[data-workspace-tab="reports:day-close"]').click();
 assert.equal(await page.locator('[data-period-action=reopen]').count(),1);
 await navigate('Daily cash sales');
 await page.locator('#quick-cash-form [name=amount]').fill('10');
 await page.locator('#quick-cash-form button').click();
 await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('closing locks'));
 await navigate('Reports');
 await page.locator('[data-workspace-tab="reports:week-close"]').click();
 assert.equal(await page.locator('.closing-formulas').count(),0);
 await page.locator('[data-period-action=save]').click();
 await page.locator('[data-period-action=reopen]').click();
 await page.locator('[data-workspace-tab="reports:day-close"]').click();
 await page.locator('[data-period-action=reopen]').click();
 const values=await page.evaluate(()=>{
  const original=state;
  try{
   state={...state,stock:[{date:'2026-01-01',qty:100,purchaseCost:1000},{date:'2026-02-01',qty:999,purchaseCost:99900}],partMovements:[{date:'2026-01-01',direction:'In',qty:10,cost:20},{date:'2026-01-10',direction:'Out',qty:2,cost:20},{date:'2026-02-01',direction:'In',qty:50,cost:100}],monthClosings:{}};
   return monthlyFinancialValues({month:'2026-01',start:'2026-01-01',end:'2026-02-01',gasClosing:80,opening:500,cashNet:150,customers:[{closing:600},{closing:-50}]});
  }finally{state=original}
 });
 assert.equal(values.gasValue,800);assert.equal(values.partsValue,160);assert.equal(values.moneyInMarket,600);assert.equal(values.lastMonthClosing,500);assert.equal(values.cash,150);
 // Net profit uses gas cost of sales, recorded part cost and expenses, not full stock purchases or debt recovery.
 const profits=await page.evaluate(()=>{
  const original=state;
  try{
   state={...state,stock:[{date:'2026-01-01',qty:100,purchaseCost:1000},{date:'2026-01-03',qty:100,purchaseCost:2000},{date:'2026-02-01',qty:100,purchaseCost:1}],sales:[{id:'g1',date:'2026-01-02',kind:'Gas',qty:20,amount:400},{id:'p1',date:'2026-01-03',kind:'Parts',qty:2,costPerUnit:50,amount:200},{id:'g2',date:'2026-01-04',kind:'Gas',qty:18,amount:360}],receipts:[{date:'2026-01-10',amount:999}],expenses:[{date:'2026-01-04',amount:30}]};
   const complete=monthlyNetProfit('2026-01-01','2026-02-01');state.sales.push({id:'missing',kind:'Gas',date:'2026-01-05',qty:0,amount:100});const incomplete=monthlyNetProfit('2026-01-01','2026-02-01');return {complete,incomplete};
  }finally{state=original}
 });
 assert.equal(profits.complete.complete,true);assert.equal(profits.complete.revenue,960);assert.equal(profits.complete.gasCost,480);assert.equal(profits.complete.partsCost,100);assert.equal(profits.complete.netProfit,350);
 assert.equal(profits.incomplete.netProfit,null);assert.equal(profits.incomplete.missing[0].id,'missing');
 await navigate('Monthly closing');
 assert.match(await page.locator('#monthly-values').innerText(),/Net profit/);
 assert.match(await page.locator('#monthly-values').innerText(),/Incomplete/);
 await page.locator('[data-profit-month]').click();await page.locator('[name=saleId]').selectOption('1045');await page.locator('[name=unitCost]').fill('500');
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.equal(await page.evaluate(()=>state.sales.find(s=>s.id==='1045').costPerUnit),500);
 assert.equal(await page.evaluate(()=>balance(customer('c5'))),21700);
 // Backdated receipts already covered by a physical count do not add full cylinders twice.
 const datedFullStock=await page.evaluate(()=>{const old=state;try{state={...state,fullCylinderCounts:[{capacity:'15',qty:10,date:'2026-01-05',createdAt:'2026-01-05T05:00:00Z'}],fullCylinderMovements:[{capacity:'15',qty:5,direction:'In',date:'2026-01-04',createdAt:'2026-01-06T05:00:00Z'},{capacity:'15',qty:2,direction:'In',date:'2026-01-06',createdAt:'2026-01-06T05:01:00Z'}]};return fullCylinderStock('15').qty}finally{state=old}});
 assert.equal(datedFullStock,12);
 // Supplier credit adds stock once and records partial/full payments separately from customer debt and profit expenses.
 const supplierBefore=await page.evaluate(()=>({gas:gasStock(),parts:partInventory(state.partItems[0].id).qty,full:fullCylinderStock('15').qty,cash:dailyCash(today()).net,expenses:state.expenses.length,revenue:monthlyDashboardData(today().slice(0,7)).revenue}));
 await navigate('Supplier credit');await page.locator('[data-action=supplier-new]').click();
 await page.locator('[name=name]').fill('Test LPG Plant');await page.locator('[name=opening]').fill('100');
 await page.getByRole('button',{name:'Save entry'}).click();
 await page.locator('[data-action=supplier-purchase]').click();
 await page.locator('[name=capacity]').selectOption('15');await page.locator('[name=qty]').fill('2');await page.locator('[name=rate]').fill('1180');await page.locator('[name=reference]').fill('GAS-001');
 await page.getByRole('button',{name:'Save entry'}).click();
 const supplierId=await page.evaluate(()=>state.suppliers[0].id);
 assert.equal(await page.evaluate(id=>supplierBalance(id),supplierId),3100);
 assert.equal(await page.evaluate(()=>gasStock()),supplierBefore.gas+30);
 assert.equal((await page.evaluate(()=>fullCylinderStock('15'))).qty,supplierBefore.full+2);
 await page.locator('[data-action=supplier-purchase]').click();await page.locator('[name=kind]').selectOption('Parts');await page.locator('[name=qty]').fill('3');await page.locator('[name=rate]').fill('100');await page.locator('[name=paid]').fill('50');await page.locator('[name=reference]').fill('PART-001');
 await page.getByRole('button',{name:'Save entry'}).click();
 assert.equal(await page.evaluate(id=>supplierBalance(id),supplierId),3350);
 assert.equal(await page.evaluate(()=>partInventory(state.partItems[0].id).qty),supplierBefore.parts+3);
 await page.locator('[data-action=supplier-payment]').click();await page.locator('[name=amount]').fill('99999');await page.getByRole('button',{name:'Save entry'}).click();assert.match(await page.locator('#form-error').innerText(),/cannot exceed/);
 await page.locator('[name=amount]').fill('100');await page.getByRole('button',{name:'Save entry'}).click();
 await page.locator('[data-action=supplier-payment]').click();await page.locator('[name=amount]').fill('200');await page.locator('[name=method]').selectOption('Bank transfer');await page.getByRole('button',{name:'Save entry'}).click();
 assert.equal(await page.evaluate(id=>supplierBalance(id),supplierId),3050);
 assert.equal(await page.evaluate(()=>dailyCash(today()).net),supplierBefore.cash-150);
 assert.equal(await page.evaluate(()=>state.expenses.length),supplierBefore.expenses);
 assert.equal(await page.evaluate(()=>monthlyDashboardData(today().slice(0,7)).revenue),supplierBefore.revenue);
 assert.equal(await page.evaluate(()=>balance(customer('c5'))),21700);
 await page.reload();await navigate('Supplier credit');assert.match(await page.locator('#content').innerText(),/3,050/);
 await navigate('Gas & inventory');const gasText=await page.locator('#content').innerText();for(const size of ['11.8 kg cylinders','15 kg cylinders','45.4 kg cylinders'])assert.ok(gasText.includes(size));
 await page.setViewportSize({width:390,height:844});
 await page.locator('#menu').click();
 await navigate('Overview');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.screenshot({path:'/tmp/latif-mobile.png',fullPage:true});
 for(const screen of ['Daily cash sales','Gas parts','Monthly closing','Automatic ledger','Gas calculator','Cylinder tracking','Expenses','Supplier credit']){
  await page.locator('#menu').click();
  await navigate(screen);
  if(screen==='Gas calculator')await page.locator('[data-calculator-tab=purchase]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 }
 for(const screen of ['Daily cash sales','Gas parts','Monthly closing','Automatic ledger','Cylinder tracking','Sales & invoices','Customers & ledger','Collections','Gas & inventory','Godowns','Reports','Expenses','Supplier credit']){
  await page.locator('#menu').click();
  await navigate(screen);
  const text=await page.locator('#content').innerText();
  assert.doesNotMatch(text,/\b(baqi|karein|wasooli|raqam|rupay|khata|diye|wapas|hisab|zyada|nahin)\b/i);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: supplier credit gas/parts stock integration, partial payments, overpayment protection, cash/noncash treatment, debit/credit-only ledger, monthly profit and preserved workflows.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
