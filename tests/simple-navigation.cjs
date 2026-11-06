const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {navigate,settingsClick}=require('./navigation.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.LPG_TEST_URL);
 await p.evaluate(()=>{const date=today(),createdAt=date+'T00:00:00+05:00';state=validateBackup({customers:[{id:'hotel',name:'City Hotel',type:'Hotel / restaurant',opening:0},{id:'shop',name:'City Shop',type:'Shop / wholesale',opening:0}],sales:[],receipts:[],cylinders:[],stock:[{id:'plant',date,createdAt,warehouse:'Supply vehicle',qty:150,purchaseCost:15000},{id:'godown',date,createdAt,warehouse:'Main godown',qty:150,purchaseCost:15000}],fullCylinderMovements:[{id:'f1',source:'plant',date,createdAt,direction:'In',capacity:'15',qty:10,variant:'Original',warehouse:'Supply vehicle'},{id:'f2',source:'godown',date,createdAt,direction:'In',capacity:'15',qty:10,variant:'Original',warehouse:'Main godown'}],dailyRates:{[date]:{perKg:200,cylinderPrices:{'15':{retail:3000,wholesale:2800}}}}});page='Overview';render()});
 assert.deepEqual(await p.locator('#nav button').allTextContents(),['▦Dashboard','↙Sales','♙Khata','◫Stock','▥Reports']);
 assert.equal(await p.locator('#simple-settings').evaluate(el=>el.open),false);
 assert.equal(await p.locator('#manage-records').isVisible(),false);
 await p.locator('nav [data-main=Sales]').click();
 assert.equal(await p.locator('.simple-sales-modes button').count(),3);
 assert.equal(await p.locator('.simple-payment-details').evaluate(el=>el.open),false);
 await p.locator('[data-simple-sale=hotel]').click();await p.locator('.simple-supply [data-action=customer]').click();assert.equal(await p.locator('#entry-form [name=type]').inputValue(),'Hotel / restaurant');await p.locator('#close-dialog').click();await p.locator('[data-simple-supply=hotel]').click();
 assert.equal(await p.locator('#entry-form [name=customer]').inputValue(),'hotel');
 await p.locator('#entry-form [name=cylinderCapacity]').selectOption('15');
 assert.equal(await p.locator('#entry-form [name=fullCylinderPrice]').inputValue(),'2800');
 await p.locator('#entry-form [name=cylOut]').fill('2');await p.locator('#entry-form [name=paid]').fill('1000');
 assert.equal(await p.locator('#entry-form [name=qty]').inputValue(),'30');
 await p.locator('#entry-form [name=method]').selectOption('Bank transfer');
 await p.locator('#entry-form button[type=submit]').click();
 assert.equal(await p.locator('#entry-dialog').evaluate(el=>el.open),false,await p.locator('#form-error').innerText());
 assert.deepEqual(await p.evaluate(()=>({sales:state.sales.length,kg:locationStock('Supply vehicle'),debt:balance(customer('hotel')),cyl:cylinderBalance('hotel'),full:cylinderLocationStock()['15']['Supply vehicle'],online:paymentSummary(today(),shiftISODate(today(),1))['Bank transfer'].received,loss:allGasLosses().length})),{sales:1,kg:120,debt:4600,cyl:2,full:8,online:1000,loss:0});
 await p.locator('[data-simple-sale=shop]').click();await p.locator('[data-simple-supply=shop]').click();await p.locator('#entry-form [name=cylinderCapacity]').selectOption('15');await p.locator('#entry-form [name=paid]').fill('2800');await p.locator('#entry-form [name=cylOut]').fill('11');await p.locator('#entry-form button[type=submit]').click();assert.match(await p.locator('#form-error').innerText(),/Only 10 full cylinders/);assert.equal(await p.evaluate(()=>state.sales.length),1);await p.locator('#entry-form [name=cylOut]').fill('1');await p.locator('#entry-form button[type=submit]').click();assert.equal(await p.locator('#entry-dialog').evaluate(el=>el.open),false,await p.locator('#form-error').innerText());
 assert.equal(await p.evaluate(()=>state.sales.length),2);assert.equal(await p.evaluate(()=>balance(customer('shop'))),0);assert.equal(await p.evaluate(()=>locationStock('Main godown')),135);assert.equal(await p.evaluate(()=>dailyCash(today()).net),2800);
 await p.locator('nav [data-main=Khata]').click();await p.locator('.simple-section-tabs [data-page="Supplier credit"]').click();assert.match(await p.locator('#page-title').innerText(),/Suppliers/);
 await p.locator('nav [data-main=Stock]').click();for(const name of ['Cylinder tracking','Gas parts','Gas calculator','Gas & inventory']){await p.locator(`.simple-section-tabs [data-page="${name}"]`).click();assert.match(await p.locator('#page-title').innerText(),/Stock/)}
 await p.locator('nav [data-main=Dashboard]').click();await p.locator('#simple-cash-entry').click();await p.locator('[data-simple-cash=home]').click();await p.locator('#entry-form [name=amount]').fill('500');await p.locator('#entry-form button[type=submit]').click();assert.equal(await p.evaluate(()=>dailyCash(today()).net),2300);
 await p.locator('#simple-cash-entry').click();await p.locator('[data-simple-cash=expense]').click();await p.locator('#entry-form [name=amount]').fill('100');await p.locator('#entry-form button[type=submit]').click();assert.equal(await p.evaluate(()=>dailyCash(today()).net),2200);
 await navigate(p,'Receipts');await p.locator('#create-manual-receipt').click();await p.locator('#close-dialog').click();await settingsClick(p,'manage-records');assert.equal(await p.locator('#manage-record-type').isVisible(),true);await p.locator('#close-dialog').click();
 await p.reload();assert.equal(await p.evaluate(()=>state.sales.length),2);assert.equal(await p.evaluate(()=>balance(customer('hotel'))),4600);assert.equal(await p.evaluate(()=>validateBackup(backupPayload()).cashTransfers.length),1);
 if(process.env.LPG_SCREENSHOTS)await p.screenshot({path:'/tmp/latif-simple-desktop.png',fullPage:true});await p.setViewportSize({width:390,height:844});for(const group of ['Sales','Khata','Stock','Reports','Dashboard']){await p.locator('#menu').click();await p.locator(`nav [data-main="${group}"]`).click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
 await p.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);if(process.env.LPG_SCREENSHOTS)await p.screenshot({path:'/tmp/latif-simple-mobile.png',fullPage:true});assert.deepEqual(errors,[]);await browser.close();console.log('PASS: five workspaces, contextual navigation, hidden settings, one-entry hotel/shop supplies, cash/online/debt/PCS, withdrawals/expenses, persistence and mobile.');
})().catch(e=>{console.error(e);process.exit(1)});
