const {navigate:navigateSimple,settingsClick}=require('./navigation.cjs');
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.LPG_TEST_URL||'http://127.0.0.1:3000');
 await page.evaluate(()=>{
  const date=today(),createdAt=new Date().toISOString();
  state=validateBackup({customers:[{id:'c',name:'Test client',phone:'03001234567',opening:500}],sales:[],receipts:[],stock:[{id:'g',date,createdAt,warehouse:'Shop',qty:1000,purchaseCost:10000,note:'Opening gas'}],cylinders:[],partItems:[{id:'p',name:'Regulator',sellingRate:200}],partMovements:[{id:'pm',part:'p',direction:'In',qty:10,cost:100,date,createdAt}],suppliers:[{id:'s',name:'Plant',opening:1000,date}],emptyCylinderOpening:{'11.8':{qty:5,date,asOf:'2000-01-01T00:00:00.000Z',tareKg:12}},fullCylinderCounts:[{id:'fc',capacity:'11.8',qty:20,date,createdAt:'2000-01-01T00:00:00.000Z'}]});
  recordCash(100,1,date);save();page='Sales';salesView='cash';render();
 });
 const saleId=await page.evaluate(()=>state.sales[0].id);
 const save=async()=>page.locator('#entry-form button[type=submit]').click();
 const edit=async(type,id)=>{await page.evaluate(([type,id])=>openRecordEdit(type,id),[type,id]);assert.equal(await page.locator('dialog').evaluate(e=>e.open),true)};
 const remove=async(type,id)=>{await page.evaluate(([type,id])=>openRecordDelete(type,id),[type,id]);await page.locator('#confirm-record-delete').click()};
 const cancel=async()=>page.locator('#cancel-dialog:visible,#close-dialog:visible').first().click();
 await page.locator(`[data-edit-type="Sale"][data-edit-record="${saleId}"]`).click();await page.locator('#entry-form [name=amount]').fill('250');await page.locator('#entry-form [name=editReceived]').fill('250');await page.locator('#entry-form [name=qty]').fill('2');await page.locator('#entry-form [name=method]').selectOption('Bank transfer');await save();
 assert.equal(await page.evaluate(()=>gasStock()),998);assert.equal(await page.evaluate(()=>dailyCash(today()).net),0);assert.equal(await page.evaluate(()=>state.sales[0].paid),250);
 await page.locator(`[data-delete-record="${saleId}"]`).click();await page.locator('#close-dialog').click();assert.equal(await page.evaluate(()=>state.sales.length),1);
 await remove('Sale',saleId);assert.equal(await page.evaluate(()=>state.sales.length),0);assert.equal(await page.evaluate(()=>gasStock()),1000);
 assert.ok(await page.evaluate(id=>Number(nextInvoice())>Number(id),saleId));
 // Invoice cylinder issues and gas restore together.
 await page.evaluate(()=>{const date=today(),createdAt=new Date().toISOString();state.sales.push({id:'1100',customer:'c',kind:'Gas',channel:'Retail',qty:10,rate:10,paid:0,date,createdAt});recordCylinderMovement({id:'cy',date,createdAt,customer:'c',direction:'Out',capacity:'11.8',cylinderType:'Original',qty:2,invoice:'1100',fullDispatch:true},false);save();});
 await edit('Cylinder movement','cy');assert.match(await page.locator('#dialog-title').innerText(),/Edit Sale/);await page.locator('#entry-form [name=qty]').fill('5');await page.locator('#entry-form [name=cyl_cy]').fill('4');await save();
 assert.equal(await page.evaluate(()=>fullCylinderStock('11.8').qty),16);assert.equal(await page.evaluate(()=>gasStock()),995);
 await remove('Sale','1100');assert.equal(await page.evaluate(()=>state.cylinders.length),0);assert.equal(await page.evaluate(()=>fullCylinderStock('11.8').qty),20);assert.equal(await page.evaluate(()=>gasStock()),1000);
 // Supplier edit updates its linked inventory once; dependent payments block deletion.
 await page.evaluate(()=>openForm('supplier-purchase'));await page.locator('#entry-form [name=capacity]').selectOption('15');await page.locator('#entry-form [name=qty]').fill('2');await page.locator('#entry-form [name=rate]').fill('1180');await page.locator('#entry-form [name=paid]').fill('50');await save();
 const purchase=await page.evaluate(()=>state.supplierPurchases[0]);await edit('Gas receipt',purchase.stockId);assert.match(await page.locator('#dialog-title').innerText(),/Supplier purchase/);await page.locator('#entry-form [name=qty]').fill('3');await save();
 assert.equal(await page.evaluate(id=>state.stock.find(s=>s.id===id).qty,purchase.stockId),45);assert.equal(await page.evaluate(()=>supplierBalance('s')),5450);assert.equal(await page.evaluate(id=>state.stock.filter(s=>s.id===id).length,purchase.stockId),1);
 await page.evaluate(()=>openForm('supplier-payment'));await page.locator('#entry-form [name=amount]').fill('1500');await save();const paymentId=await page.evaluate(()=>state.supplierPayments[0].id);
 const beforeBlocked=await page.evaluate(()=>JSON.stringify(state));await remove('Supplier purchase',purchase.id);assert.match(await page.locator('#form-error').innerText(),/supplier balance/);assert.equal(await page.evaluate(()=>JSON.stringify(state)),beforeBlocked);await page.locator('#close-dialog').click();
 await remove('Supplier payment',paymentId);await remove('Supplier purchase',purchase.id);assert.equal(await page.evaluate(()=>state.stock.length),1);assert.equal(await page.evaluate(()=>state.fullCylinderMovements.filter(m=>m.capacity==='15').length),0);
 // Purchase cost edits propagate to tracked part sales and protect dependent stock.
 await page.evaluate(()=>openForm('part-sale'));await page.locator('#entry-form [name=qty]').fill('2');await save();const partSale=await page.evaluate(()=>state.sales[0].id);
 await edit('Parts movement','pm');await page.locator('#entry-form [name=cost]').fill('200');await save();assert.equal(await page.evaluate(()=>state.sales[0].costPerUnit),200);assert.equal(await page.evaluate(()=>partInventory('p').value),1600);
 await remove('Parts movement','pm');assert.match(await page.locator('#form-error').innerText(),/parts balance/);await page.locator('#close-dialog').click();await remove('Part','p');assert.match(await page.locator('#form-error').innerText(),/dependent/);await page.locator('#close-dialog').click();
 await remove('Sale',partSale);await remove('Parts movement','pm');assert.equal(await page.evaluate(()=>partInventory('p').qty),0);
 // Empty-container sale edit/delete preserves gas/full-cylinder counts.
 await page.evaluate(()=>openCylinderSale());await page.locator('#entry-form [name=price]').fill('600');await page.locator('#entry-form [name=unitCost]').fill('400');await save();const emptySale=await page.evaluate(()=>state.sales[0].id);
 await edit('Sale',emptySale);await page.locator('#entry-form [name=qty]').fill('2');await page.locator('#entry-form [name=paid]').fill('1200');await save();assert.equal(await page.evaluate(()=>emptyQuantity('11.8')),3);assert.equal(await page.evaluate(()=>gasStock()),1000);assert.equal(await page.evaluate(()=>fullCylinderStock('11.8').qty),20);
 await remove('Sale',emptySale);assert.equal(await page.evaluate(()=>emptyQuantity('11.8')),5);
 // Customer collections prevent deletion of debt that has already been recovered.
 await page.evaluate(()=>{const date=today(),createdAt=new Date().toISOString();state.creditEntries.push({id:'debt',customer:'c',date,createdAt,amount:100,note:'Credit'});state.receipts.push({id:'pay',customer:'c',date,createdAt,amount:550,method:'Cash'});});
 await remove('Customer debit','debt');assert.match(await page.locator('#form-error').innerText(),/customer balance/);await page.locator('#close-dialog').click();await remove('Customer payment','pay');await remove('Customer debit','debt');
 // Physical stock, rates, customer and supplier master records are editable.
 await edit('Full count','fc');await page.locator('#entry-form [name=qty]').fill('25');await save();assert.equal(await page.evaluate(()=>fullCylinderStock('11.8').qty),25);
 await edit('Empty opening','11.8');await page.locator('#entry-form [name=qty]').fill('6');await save();assert.equal(await page.evaluate(()=>emptyQuantity('11.8')),6);
 await page.evaluate(()=>{state.dailyRates[today()]={perKg:100}});const date=await page.evaluate(()=>today());await edit('Daily rate',date);await page.locator('#entry-form [name=perKg]').fill('120');await save();assert.equal(await page.evaluate(()=>state.dailyRates[today()].perKg),120);await remove('Daily rate',date);
 await edit('Supplier','s');await page.locator('#entry-form [name=name]').fill('Plant renamed');await save();assert.equal(await page.evaluate(()=>state.suppliers[0].name),'Plant renamed');
 // Closed periods block financial changes but permit contact corrections.
 await page.evaluate(()=>{const date=today();state.expenses.push({id:'e',date,amount:10,method:'Cash',category:'Other',note:''});state.monthClosings[date.slice(0,7)]={report:monthReport(date.slice(0,7)),savedAt:'Test',createdAt:new Date().toISOString()};});
 await edit('Expense','e');await page.locator('#entry-form [name=amount]').fill('20');await save();assert.match(await page.locator('#form-error').innerText(),/closing locks/);assert.equal(await page.evaluate(()=>state.expenses[0].amount),10);await cancel();
 await edit('Customer','c');await page.locator('#entry-form [name=phone]').fill('03009998888');await save();assert.equal(await page.evaluate(()=>customer('c').phone),'03009998888');
 await page.evaluate(date=>openRecordEdit('Monthly closing',date.slice(0,7)),date);await page.locator('#confirm-record-delete').click();assert.equal(await page.evaluate(()=>Object.keys(state.monthClosings).length),0);
 // Manager is present on every workspace, and delete is always a review step.
 for(const name of ['Overview','Sales','Invoices','Receipts','Money & cylinder ledger','Supplier credit','Gas & inventory','Cylinder tracking','Gas parts','Gas calculator','Expenses','Reports']){await navigateSimple(page,`${name}`);await settingsClick(page,"manage-records");assert.equal(await page.locator('#manage-record-type').isVisible(),true);await page.locator('#close-dialog').click();}
 assert.ok(await page.evaluate(()=>!!localStorage.getItem('latif-lpg-before-record-change')));await page.reload();assert.equal(await page.evaluate(()=>customer('c').phone),'03009998888');
 await remove('Part','p');await remove('Supplier','s');await remove('Customer','c');assert.equal(await page.evaluate(()=>state.partItems.length+state.suppliers.length+state.customers.length),0);
 await page.setViewportSize({width:390,height:844});await settingsClick(page,"manage-records");assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('#close-dialog').click();assert.deepEqual(errors,[]);
 await browser.close();console.log('PASS: atomic edit/delete, linked stock, supplier/customer debt guards, part recosting, closed periods, all-tab manager and persistence.');
})().catch(e=>{console.error(e);process.exit(1)});
