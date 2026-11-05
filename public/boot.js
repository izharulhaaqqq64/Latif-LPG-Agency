(async function(){
 'use strict';
 const MAIN='latif-lpg-v1',PENDING='latif-lpg-sync-pending',META='latif-lpg-sync-meta';
 const panel=document.getElementById('connection-panel');
 let csrf='',revision=0,instance='',pending=null,inflight=false,blocked=false,remoteWaiting=null,timer=null;
 const text=(el,value)=>{el.textContent=value};
 function message(value){const el=document.getElementById('sync-status');if(el)text(el,value)}
 function download(value,name='latif-device-recovery.json'){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 async function api(url,options={}){const response=await fetch(url,{cache:'no-store',...options,headers:{...(options.method?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...options.headers}});const data=await response.json();if(!response.ok){const err=Error(data.error||'Server request failed.');err.status=response.status;throw err}return data}
 function remember(remote){revision=remote.revision;instance=remote.instance;localStorage.setItem(META,JSON.stringify({revision,instance}));}
 function dropPending(){localStorage.removeItem(PENDING);pending=null}
 function writeCached(data){localStorage.setItem(MAIN,JSON.stringify(data));}
 function lockSession(){document.getElementById('entry-dialog')?.close();blocked=true;document.body.classList.add('sync-locked');panel.innerHTML='<h2>Please sign in again</h2><p>Your session has ended. Any pending entries stay on this device until you sign in again.</p><button type="button" id="sync-sign-in">Sign in</button>';document.getElementById('sync-sign-in').onclick=()=>location.replace('/');}
 function chooseRecovery(remote){return new Promise(resolve=>{
  document.getElementById('entry-dialog')?.close();blocked=true;document.body.classList.add('sync-locked');panel.innerHTML='<h2>Newer shared records found</h2><p>This device has entries waiting to sync. Another device or a restored server has different records. Download your pending copy, then load the shared records and re-enter any missing entries.</p><button type="button" id="download-pending">Download my pending records</button> <button type="button" id="use-shared-records">Load shared records · keep a recovery copy</button>';
  document.getElementById('download-pending').onclick=()=>download(pending?.data||{},'latif-unsynced-records.json');
  document.getElementById('use-shared-records').onclick=()=>{try{if(pending)localStorage.setItem('latif-lpg-sync-conflict-backup',JSON.stringify(pending.data));dropPending();blocked=false;document.body.classList.remove('sync-locked');panel.innerHTML='';resolve(remote)}catch{panel.append(' Browser storage is unavailable. Download a backup first.')}};
 })}
 function notifyRemote(remote){remoteWaiting=remote;blocked=true;message('New records available · refresh');let notice=document.getElementById('sync-notice');if(!notice){notice=document.createElement('div');notice.id='sync-notice';notice.className='sync-notice';document.getElementById('content').before(notice)}notice.innerHTML='<strong>Another device saved updated records.</strong> Finish or cancel your open entry, then use Refresh to load them.';}
 function applyRemote(remote){const next=validateBackup(remote.data);writeCached(next);remember(remote);state=next;if(bookCustomer&&!customer(bookCustomer))bookCustomer='';if(supplierFilter&&!state.suppliers.some(s=>s.id===supplierFilter))supplierFilter='';remoteWaiting=null;blocked=false;document.getElementById('sync-notice')?.remove();render();message('Synced with private server');}
 async function pump(){
  if(inflight||!pending||blocked)return;inflight=true;const sent=pending,sentText=JSON.stringify(sent.data);message('Saving to private server…');
  try{
   const result=await api('/api/state',{method:'PUT',body:JSON.stringify(sent)});remember(result);
   if(pending&&JSON.stringify(pending.data)===sentText)dropPending();else if(pending){pending={...pending,revision,instance};localStorage.setItem(PENDING,JSON.stringify(pending));}
   message(pending?'More entries waiting to sync':'Synced with private server');
  }catch(err){
   if(err.status===401||err.status===403){lockSession()}
   else if(err.status===409){try{const remote=await api('/api/state');if(JSON.stringify(remote.data)===sentText){remember(remote);if(pending&&JSON.stringify(pending.data)===sentText)dropPending();else if(pending){pending={...pending,revision,instance};localStorage.setItem(PENDING,JSON.stringify(pending))}}else{const chosen=await chooseRecovery(remote);applyRemote(chosen)}}catch(e){if(e.status===401)lockSession();else message('Sync paused · reconnect and refresh')}}
   else message(err.status?'Not synced: '+err.message+' · device copy retained':'Saved on this device · waiting to sync');
  }finally{inflight=false;if(pending&&!blocked){clearTimeout(timer);timer=setTimeout(pump,3000)}}
 }
 function saveShared(data){
  if(blocked)throw Error('Shared records changed or your session ended. Close this entry, then refresh or sign in before saving.');
  validateBackup(data);validateAutomaticResidual(data);
  const value={instance,revision,data:JSON.parse(JSON.stringify(data))},oldMain=localStorage.getItem(MAIN),oldPending=localStorage.getItem(PENDING);
  try{localStorage.setItem(PENDING,JSON.stringify(value));writeCached(data)}catch(err){try{if(oldMain===null)localStorage.removeItem(MAIN);else localStorage.setItem(MAIN,oldMain);if(oldPending===null)localStorage.removeItem(PENDING);else localStorage.setItem(PENDING,oldPending)}catch{}throw Error('Device storage is full. Save a backup before continuing.')}
  pending=value;message('Saved on this device · synchronizing…');queueMicrotask(pump);
 }
 async function refresh(manual=false){
  if(pending){await pump();return}if(inflight)return;
  try{const remote=manual?await api('/api/state'):(remoteWaiting||await api('/api/state'));if(remote.instance!==instance){if(manual&&!document.getElementById('entry-dialog')?.open){localStorage.setItem('latif-lpg-server-change-backup',JSON.stringify(state));if(!remote.data){location.reload();return}applyRemote(remote);return}notifyRemote(remote);return}if(remote.revision===revision){message('Synced with private server');return}
   if(document.getElementById('entry-dialog')?.open){notifyRemote(remote);return}
   const editing=document.activeElement?.matches('input,textarea,select');if(!manual&&editing){notifyRemote(remote);return}applyRemote(remote);
  }catch(err){if(err.status===401||err.status===403)lockSession();else message('Cannot reach server · changes will wait to sync')}
 }
 async function firstData(remote){
  const legacy=localStorage.getItem(MAIN);let data={customers:[],sales:[],receipts:[],stock:[],cylinders:[]};
  if(legacy){data=await new Promise(resolve=>{
   panel.innerHTML='<h2>Move this device’s records to your private server?</h2><p>Your browser has existing records. Keep a backup before sharing them with your other devices.</p><button type="button" id="download-legacy">Download existing records</button> <button type="button" id="import-legacy">Use these device records</button> <button type="button" id="start-empty">Start with empty records</button>';
   document.getElementById('download-legacy').onclick=()=>{try{download(JSON.parse(legacy),'latif-existing-device-records.json')}catch{}};
   document.getElementById('import-legacy').onclick=()=>{try{const old=JSON.parse(legacy);localStorage.setItem('latif-lpg-legacy-backup',legacy);resolve(old)}catch{panel.append(' The existing data could not be read. Import a valid JSON backup after starting empty.')}};
   document.getElementById('start-empty').onclick=()=>{localStorage.setItem('latif-lpg-legacy-backup',legacy);resolve(data)};
  })}
  try{const result=await api('/api/state',{method:'PUT',body:JSON.stringify({instance:remote.instance,revision:remote.revision,data})});return {...result,data}}catch(err){if(err.status!==409)throw err;const next=await api('/api/state');pending={instance:remote.instance,revision:remote.revision,data};return chooseRecovery(next)}
 }
 async function account(){
  if(pending||inflight){toast('Wait for synchronization before opening server recovery backups.');return}
  try{const info=window.lpgRole==='owner'?await api('/api/backups'):{backups:[]};action='owner-account';showDetail('Account & server recovery',`<p>Signed in as <strong>${esc(window.lpgOwner)}</strong>. Recovery copies are stored on the server’s disk; also keep downloaded backups.</p><label class="field">Your name / business owner name<input id="edit-profile-name" value="${esc(window.lpgName||window.lpgOwner)}" maxlength="100"></label><button type="button" class="button secondary" id="save-profile-name">Save name</button>${window.lpgRole==='owner'?'<button type="button" class="button primary" id="manage-logins">Manage 5 logins · 3 owners, manager, driver</button>':''}<label class="field">Current password<input id="current-owner-password" type="password" autocomplete="current-password"></label><label class="field">New password (at least 12 characters)<input id="new-owner-password" type="password" autocomplete="new-password" minlength="12" maxlength="256"></label><label class="field">Confirm new password<input id="confirm-owner-password" type="password" autocomplete="new-password" minlength="12" maxlength="256"></label><button type="button" class="button primary" id="change-owner-password">Change password</button><h3>Server recovery snapshots</h3><div class="sync-account-backups">${window.lpgRole!=='owner'?'Server recovery snapshots are owner-only.':info.backups.length?info.backups.map(r=>`<p>${esc(r.created)} · ${esc(r.kind)} · revision ${r.revision} <a class="card-link" href="/api/backups/${encodeURIComponent(r.kind)}/${encodeURIComponent(r.id)}" download>Download</a></p>`).join(''):'Recovery snapshots appear after records are saved.'}</div>`)}catch(err){if(err.status===401)lockSession();else toast(err.message)}
 }
 try{
  const auth=await api('/api/session');if(!auth.authenticated){location.replace('/login.html');return}csrf=auth.csrf;window.lpgOwner=auth.username;window.lpgRole=auth.role;window.lpgName=auth.name;
  let remote=await api('/api/state');const oldMeta=JSON.parse(localStorage.getItem(META)||'null');if(oldMeta&&oldMeta.instance!==remote.instance&&localStorage.getItem(MAIN))localStorage.setItem('latif-lpg-server-change-backup',localStorage.getItem(MAIN));remember(remote);
  try{pending=JSON.parse(localStorage.getItem(PENDING)||'null')}catch{throw Error('Pending device records are unreadable. Preserve this browser’s storage before restoring a backup.')}
  if(pending){if(pending.instance===remote.instance&&JSON.stringify(pending.data)===JSON.stringify(remote.data)){dropPending()}
   else if(pending.instance===remote.instance&&pending.revision===remote.revision){try{const result=await api('/api/state',{method:'PUT',body:JSON.stringify(pending)});remote={...result,data:pending.data};dropPending()}catch(err){if(err.status===409)remote=await chooseRecovery(await api('/api/state'));else throw err}}
   else remote=await chooseRecovery(remote);
  }
  if(!remote.data)remote=await firstData(remote);
  remember(remote);writeCached(remote.data);window.lpgInitialData=remote.data;window.lpgSync={save:saveShared,refresh:()=>refresh(true),reset:async(password,confirmation)=>{if(pending||inflight||blocked||remoteWaiting)throw Error('Wait for sync and refresh newer records before resetting.');const result=await api('/api/reset',{method:'POST',body:JSON.stringify({password,confirmation,instance,revision})});applyRemote(result)}};
  const modules=await api('/modules.json');for(const src of modules){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(Error('Could not load '+src));document.head.appendChild(script)})}
  state=validateBackup(state);panel.innerHTML='';document.body.classList.remove('app-loading');message('Synced with private server');document.getElementById('profile-owner-name').textContent=window.lpgName||window.lpgOwner;document.getElementById('profile-role').textContent=window.lpgRole||'Owner';
  document.getElementById('sync-refresh').onclick=()=>refresh(true);document.getElementById('owner-account').onclick=account;
  document.getElementById('owner-logout').onclick=async()=>{if(pending||inflight){toast('Wait for sync before signing out. Save backup if the server is unreachable.');return}try{await api('/api/logout',{method:'POST',body:'{}'});for(const k of Object.keys(localStorage))if(k.startsWith('latif-lpg-'))localStorage.removeItem(k);location.replace('/login.html')}catch(err){toast(err.message)}};
  document.getElementById('save-workspace').onclick=()=>{try{save();toast('Save requested. Check Synced status before switching devices.')}catch(err){toast(err.message)}};
  document.getElementById('exit-workspace').onclick=()=>document.getElementById('owner-logout').click();
  let users=[];
  async function manageUsers(){const result=await api('/api/users');users=result.users;action='owner-account';showDetail('Five business logins',`<p>Three owners, one manager and one read-only driver. Disabled accounts need a password before enabling. Roles are fixed; no default passwords are provided.</p><label class="field">Login<select id="user-slot">${users.map(u=>`<option value="${esc(u.id)}">${esc(u.role)} · ${esc(u.username)} · ${u.enabled?'Enabled':'Needs password'}</option>`).join('')}</select></label><label class="field">Display name<input id="user-name" maxlength="100"></label><label class="field">Username<input id="user-username" maxlength="64"></label><label class="field">New password (12+ characters; leave blank to keep current)<input id="user-password" type="password" autocomplete="new-password"></label><label class="check-field"><input id="user-enabled" type="checkbox"> Enable login</label><button type="button" id="save-user-slot" class="button primary">Save login</button>`);fillUser();}
  function fillUser(){const u=users.find(u=>u.id===document.getElementById('user-slot').value);document.getElementById('user-name').value=u.name;document.getElementById('user-username').value=u.username;document.getElementById('user-password').value='';document.getElementById('user-enabled').checked=!!u.enabled;}
  document.addEventListener('change',e=>{if(e.target.id==='user-slot')fillUser()});
  document.addEventListener('click',async e=>{try{
   if(e.target.closest('#save-profile-name')){const result=await api('/api/profile',{method:'POST',body:JSON.stringify({name:document.getElementById('edit-profile-name').value})});window.lpgName=result.name;document.getElementById('profile-owner-name').textContent=result.name;toast('Name saved.');}
   if(e.target.closest('#manage-logins'))await manageUsers();
   if(e.target.closest('#save-user-slot')){await api('/api/users',{method:'POST',body:JSON.stringify({id:document.getElementById('user-slot').value,name:document.getElementById('user-name').value,username:document.getElementById('user-username').value,password:document.getElementById('user-password').value,enabled:document.getElementById('user-enabled').checked})});toast('Login saved.');await manageUsers();}
  }catch(err){document.getElementById('form-error').textContent=err.message}});
  document.addEventListener('submit',e=>{if(e.target.id==='entry-form'&&action==='owner-account'){e.preventDefault();e.stopImmediatePropagation()}},true);
  document.addEventListener('click',async e=>{if(!e.target.closest('#change-owner-password'))return;const currentPassword=document.getElementById('current-owner-password').value,newPassword=document.getElementById('new-owner-password').value;if(newPassword!==document.getElementById('confirm-owner-password').value){document.getElementById('form-error').textContent='New passwords do not match.';return}try{const result=await api('/api/password',{method:'POST',body:JSON.stringify({currentPassword,newPassword})});csrf=result.csrf;document.getElementById('entry-dialog').close();toast('Password changed. Other devices must sign in again.')}catch(err){document.getElementById('form-error').textContent=err.message}});
  addEventListener('online',()=>{if(pending)pump();else refresh()});setInterval(()=>{if(!document.hidden){if(pending)pump();else refresh()}},5000);
 }catch(err){document.body.classList.add('app-loading');panel.innerHTML='<h2>Workspace could not open</h2><p id="boot-error"></p><button type="button" id="retry-workspace">Retry</button>';text(document.getElementById('boot-error'),err.message);document.getElementById('retry-workspace').onclick=()=>location.reload();}
})();
