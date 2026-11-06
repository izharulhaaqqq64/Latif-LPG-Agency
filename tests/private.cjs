const {navigate:navigateSimple,settingsClick}=require('./navigation.cjs');
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createPrivateServer}=require('../lib/private-server');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'latif-private-')),password='Private-test-password-2468',username='private-owner';
 let app=createPrivateServer({dataDir:dir,setupCode:'local-test-setup-code'}),browser;
 const listen=async()=>{await new Promise(r=>app.server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+app.server.address().port};
 let url=await listen();
 const request=(route,body,extra={})=>fetch(url+route,{...extra,headers:{...(body!==undefined?{'Content-Type':'application/json',Origin:url}:{}),...extra.headers},...(body!==undefined?{method:extra.method||'POST',body:JSON.stringify(body)}:{})});
 try{
  assert.equal((await request('/api/state')).status,401);assert.equal((await request('/app.js')).status,401);assert.match(await (await request('/')).text(),/auth-form/);
  assert.equal((await request('/api/setup',{code:'wrong',username,password})).status,403);
  assert.equal((await request('/api/setup',{code:'local-test-setup-code',username,password:'short'})).status,400);
  assert.equal((await request('/api/setup',{code:'local-test-setup-code',username,password},{headers:{Origin:'https://foreign.example'}})).status,403);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const first=await browser.newContext({viewport:{width:1440,height:1100}}),a=await first.newPage(),errors=[];a.on('pageerror',e=>errors.push(e.message));await a.goto(url);
  await a.locator('[name=code]').fill('local-test-setup-code');await a.locator('[name=username]').fill(username);await a.locator('[name=password]').fill(password);await a.locator('[name=confirmPassword]').fill(password);await a.locator('#auth-submit').click();
  await a.locator('#sync-status').filter({hasText:'Synced'}).waitFor();assert.equal(await a.evaluate(()=>state.customers.length),0);assert.equal(await a.evaluate(()=>state.sales.length),0);assert.equal(await a.evaluate(()=>document.cookie.includes('latif_session')),false);
  assert.equal((await request('/api/setup',{code:'local-test-setup-code',username,password})).status,409);
  const second=await browser.newContext({viewport:{width:390,height:844}}),b=await second.newPage();b.on('pageerror',e=>errors.push(e.message));
  async function signIn(page,pwd=password){await page.goto(url+'/login.html');await page.locator('[name=username]').fill(username);await page.locator('[name=password]').fill(pwd);await page.locator('#auth-submit').click();await page.locator('#sync-status').filter({hasText:'Synced'}).waitFor();}
  await signIn(b);
  await a.evaluate(()=>{state.customers.push({id:'shared-client',name:'Shared client',opening:0,phone:'03001234567'});state.stock.push({id:'shared-stock',date:today(),warehouse:'Shop',qty:100,purchaseCost:10000});save();});await a.waitForFunction(()=>!localStorage.getItem('latif-lpg-sync-pending'));
  await b.reload();await b.locator('#sync-status').filter({hasText:'Synced'}).waitFor();assert.equal(await b.evaluate(()=>state.customers[0].name),'Shared client');assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await a.evaluate(()=>{recordCash(500,1,today());save()});await a.waitForFunction(()=>!localStorage.getItem('latif-lpg-sync-pending'));await b.waitForFunction(()=>state.sales.length===1,{},{timeout:12000});
  // A stale writer cannot overwrite another device; its full pending copy survives.
  let release,held;const gate=new Promise(r=>release=r),arrived=new Promise(r=>held=r);
  await a.route('**/api/state',async route=>{if(route.request().method()==='PUT'){held();await gate}await route.continue()});
  await a.evaluate(()=>{recordCash(100,0,today());save()});await arrived;
  await b.evaluate(()=>{recordCash(200,0,today());save()});await b.waitForFunction(()=>!localStorage.getItem('latif-lpg-sync-pending'));release();
  await a.locator('#use-shared-records').waitFor();const pendingDownload=a.waitForEvent('download');await a.locator('#download-pending').click();const pendingFile=await pendingDownload;const recovery=JSON.parse(fs.readFileSync(await pendingFile.path(),'utf8'));assert.equal(recovery.sales[0].amount,100);
  await a.locator('#use-shared-records').click();assert.equal(await a.evaluate(()=>state.sales[0].amount),200);assert.equal(await a.evaluate(()=>JSON.parse(localStorage.getItem('latif-lpg-sync-conflict-backup')).sales[0].amount),100);await a.unroute('**/api/state');
  // Temporary network failure queues locally, then syncs after connection returns.
  await a.route('**/api/state',route=>route.request().method()==='PUT'?route.abort():route.continue());await a.evaluate(()=>{recordCash(300,0,today());save()});await a.locator('#sync-status').filter({hasText:'waiting to sync'}).waitFor();assert.ok(await a.evaluate(()=>localStorage.getItem('latif-lpg-sync-pending')));await a.unroute('**/api/state');await a.locator('#sync-refresh').click();await a.waitForFunction(()=>!localStorage.getItem('latif-lpg-sync-pending'));
  // API rejects missing CSRF, foreign origins and stale revisions.
  const login=await request('/api/login',{username,password}),loginData=await login.json(),cookie=login.headers.get('set-cookie').split(';')[0];
  const remote=await (await request('/api/state',undefined,{headers:{Cookie:cookie}})).json();
  assert.equal((await request('/api/state',remote,{method:'PUT',headers:{Cookie:cookie}})).status,403);
  assert.equal((await request('/api/state',remote,{method:'PUT',headers:{Cookie:cookie,Origin:'https://foreign.example','X-CSRF-Token':loginData.csrf}})).status,403);
  assert.equal((await request('/api/state',{...remote,revision:0},{method:'PUT',headers:{Cookie:cookie,'X-CSRF-Token':loginData.csrf}})).status,409);
  // Logout revokes the session and removes cached business records.
  await settingsClick(b,"owner-logout");await b.locator('#auth-form').waitFor();assert.equal(await b.evaluate(()=>localStorage.getItem('latif-lpg-v1')),null);assert.equal((await b.request.get(url+'/api/state')).status(),401);
  await signIn(b);await settingsClick(a,"owner-account");await a.locator('#current-owner-password').fill(password);const newPassword='Changed-private-password-1357';await a.locator('#new-owner-password').fill(newPassword);await a.locator('#confirm-owner-password').fill(newPassword);await a.locator('#change-owner-password').click();await a.locator('#entry-dialog').waitFor({state:'hidden'});assert.equal((await b.request.get(url+'/api/state')).status(),401);
  const backups=await a.request.get(url+'/api/backups');assert.equal(backups.status(),200);const list=(await backups.json()).backups;assert.ok(list.some(r=>r.kind==='daily'));assert.ok(list.some(r=>r.kind==='revision'));assert.equal((await a.request.get(url+'/api/backups/'+list[0].kind+'/'+list[0].id)).status(),200);
  assert.deepEqual(errors,[]);await browser.close();browser=null;
  await new Promise(r=>app.server.close(r));app=createPrivateServer({dataDir:dir});assert.equal(app.setupCode,null);url=await listen();
  assert.equal((await request('/api/login',{username,password})).status,401);const fresh=await request('/api/login',{username,password:newPassword}),freshCookie=fresh.headers.get('set-cookie').split(';')[0];const persisted=await (await request('/api/state',undefined,{headers:{Cookie:freshCookie}})).json();assert.equal(persisted.data.sales.length,3);assert.equal(persisted.data.sales[0].amount,300);
  await new Promise(r=>app.server.close(r));
  // Secure-cookie deployment configuration and host validation behind HTTPS proxy.
  assert.throws(()=>createPrivateServer({dataDir:path.join(dir,'bad-origin'),origin:'http://localhost.attacker.example'}),/HTTPS/);
  app=createPrivateServer({dataDir:path.join(dir,'https'),origin:'https://agency.example',initialOwner:{username,password}});url=await listen();
  assert.equal((await request('/api/session')).status,421);
  const secureLogin=await new Promise((resolve,reject)=>{const req=require('node:http').request(url+'/api/login',{method:'POST',headers:{Host:'agency.example',Origin:'https://agency.example','Content-Type':'application/json'}},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,cookie:res.headers['set-cookie'].join(';')}))});req.on('error',reject);req.end(JSON.stringify({username,password}))});assert.equal(secureLogin.status,200);assert.match(secureLogin.cookie,/; Secure/);assert.match(secureLogin.cookie,/HttpOnly/);
  await new Promise(r=>app.server.close(r));
  // Existing browser records require explicit import; Open backup saves shared data.
  app=createPrivateServer({dataDir:path.join(dir,'migration'),initialOwner:{username,password}});url=await listen();browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const oldContext=await browser.newContext(),oldPage=await oldContext.newPage();await oldPage.goto(url+'/login.html');
  const legacy={customers:[{id:'legacy-client',name:'Existing client',opening:250}],sales:[],receipts:[],stock:[],cylinders:[]};await oldPage.evaluate(data=>localStorage.setItem('latif-lpg-v1',JSON.stringify(data)),legacy);
  await oldPage.locator('[name=username]').fill(username);await oldPage.locator('[name=password]').fill(password);await oldPage.locator('#auth-submit').click();await oldPage.locator('#import-legacy').waitFor();
  assert.equal((await (await oldPage.request.get(url+'/api/state')).json()).data,null);await oldPage.locator('#import-legacy').click();await oldPage.locator('#sync-status').filter({hasText:'Synced'}).waitFor();assert.equal(await oldPage.evaluate(()=>state.customers[0].name),'Existing client');assert.ok(await oldPage.evaluate(()=>localStorage.getItem('latif-lpg-legacy-backup')));
  const migrationDate=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Karachi'});const restore={...legacy,customers:[{id:'restored-client',name:'Restored client',opening:300}],stock:[{id:'restore-stock',date:migrationDate,warehouse:'Shop',qty:10,purchaseCost:1000}],cashTransfers:[{id:'restore-transfer',date:migrationDate,from:'Cash',to:'Home / owner',purpose:'Owner withdrawal',amount:10,recipient:'Owner',reference:'',note:''}],gasLosses:[{id:'restore-loss',date:migrationDate,warehouse:'Shop',capacity:'11.8',cylinders:1,gramsPerCylinder:350,qty:.35,basis:'Estimated',note:''}]};await oldPage.evaluate(data=>prepareBackupOpen(data),restore);await oldPage.locator('#entry-form button[type=submit]').click();await oldPage.waitForFunction(()=>!localStorage.getItem('latif-lpg-sync-pending'));
  const restoredShared=(await (await oldPage.request.get(url+'/api/state')).json()).data;assert.equal(restoredShared.customers[0].name,'Restored client');assert.equal(restoredShared.cashTransfers[0].amount,10);assert.equal(restoredShared.gasLosses[0].qty,.35);
  const inspect=new (require('node:sqlite').DatabaseSync)(path.join(dir,'migration','latif.sqlite'));const storedOwner=inspect.prepare("SELECT hash FROM accounts WHERE role='owner' AND enabled=1").get();assert.notEqual(storedOwner.hash,password);assert.match(storedOwner.hash,/^[a-f0-9]{128}$/);inspect.prepare('UPDATE sessions SET expires=0').run();inspect.close();
  await oldPage.evaluate(()=>window.lpgSync.refresh());await oldPage.locator('#sync-sign-in').waitFor();assert.equal((await oldPage.request.get(url+'/api/state')).status(),401);await browser.close();browser=null;await new Promise(r=>app.server.close(r));
  app=createPrivateServer({dataDir:path.join(dir,'rate-limit'),initialOwner:{username,password}});url=await listen();for(let i=0;i<20;i++)assert.equal((await request('/api/login',{username,password:'incorrect-password'})).status,401);assert.equal((await request('/api/login',{username,password})).status,429);
  console.log('PASS: owner setup/login, protected API, two-device sync, conflict recovery, queued saves, logout, password rotation, backups, restart persistence, HTTPS configuration, legacy migration, expiry and login rate limiting.');
 }finally{if(browser)await browser.close();await new Promise(r=>app.server.close(r));fs.rmSync(dir,{recursive:true,force:true})}
})().catch(err=>{console.error(err);process.exitCode=1});
