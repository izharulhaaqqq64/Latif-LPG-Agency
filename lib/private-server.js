'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const defaultDataDir=()=>process.platform==='win32'&&process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'Latif LPG Agency','data'):path.join(__dirname,'..','data');
function privateHost(host){const value=host.replace(/^\[|\]$/g,'');if(value==='localhost'||value==='::1')return true;if(require('node:net').isIP(value)!==4)return false;const parts=value.split('.').map(Number);return parts[0]===127||parts[0]===10||parts[0]===192&&parts[1]===168||parts[0]===172&&parts[1]>=16&&parts[1]<=31;}
const MAX_DATA=10*1024*1024,SESSION_MS=12*60*60*1000;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const key=password=>{const salt=crypto.randomBytes(16).toString('hex');return {salt,hash:crypto.scryptSync(password,salt,64).toString('hex')}};
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
function validPassword(password){return typeof password==='string'&&password.length>=12&&password.length<=256}
function validUser(username){return typeof username==='string'&&/^[A-Za-z0-9_.-]{3,64}$/.test(username)}
function verifyPassword(owner,password){return typeof password==='string'&&password.length<=256&&equal(owner.hash,crypto.scryptSync(password,owner.salt,64).toString('hex'))}
function datePK(){return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Karachi'})}
function validateDocument(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Object.assign(Error('Invalid business data.'),{status:400});
 let nodes=0;function walk(value,depth=0){if(++nodes>500000||depth>40)throw Object.assign(Error('Data is too large.'),{status:400});if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(k))throw Object.assign(Error('Invalid data keys.'),{status:400});walk(v,depth+1)}}walk(data);
 for(const name of ['customers','sales','receipts','stock','cylinders']){if(!Array.isArray(data[name])||data[name].length>100000)throw Object.assign(Error('Missing '+name+' records.'),{status:400});const ids=new Set();for(const r of data[name]){if(!r||typeof r!=='object'||typeof r.id!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(r.id)||ids.has(r.id))throw Object.assign(Error('Invalid record IDs.'),{status:400});ids.add(r.id)}}
 return JSON.stringify(data);
}
function readJSON(req,limit){return new Promise((resolve,reject)=>{let size=0,done=false,chunks=[];req.on('data',chunk=>{if(done)return;size+=chunk.length;if(size>limit){done=true;chunks=[];reject(Object.assign(Error('Request too large.'),{status:413}));return}chunks.push(chunk)});req.on('end',()=>{if(done)return;try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Object required');resolve(value)}catch{reject(Object.assign(Error('Invalid JSON.'),{status:400}))}});req.on('error',reject)})}
function createPrivateServer(options={}){
 const originValue=options.origin||process.env.APP_ORIGIN||null;
 let configuredOrigin=null;if(originValue){const u=new URL(originValue);if(!['https:','http:'].includes(u.protocol)||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('APP_ORIGIN must be an HTTP(S) origin without a path.');if(u.protocol==='http:'&&!privateHost(u.hostname))throw Error('Public hosting requires an HTTPS APP_ORIGIN.');configuredOrigin=u.origin;}
 const dataDir=path.resolve(options.dataDir||process.env.LPG_DATA_DIR||defaultDataDir());
 fs.mkdirSync(dataDir,{recursive:true,mode:0o700});if(process.platform!=='win32')fs.chmodSync(dataDir,0o700);
 const db=new DatabaseSync(path.join(dataDir,'latif.sqlite'));if(process.platform!=='win32')fs.chmodSync(path.join(dataDir,'latif.sqlite'),0o600);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS owner(id INTEGER PRIMARY KEY CHECK(id=1),username TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS config(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS business(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,data TEXT,updated TEXT);
 CREATE TABLE IF NOT EXISTS recovery(id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS daily_recovery(day TEXT PRIMARY KEY,revision INTEGER NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL);
 INSERT OR IGNORE INTO business(id,revision) VALUES(1,0);`);
 const account=id=>db.prepare('SELECT * FROM accounts WHERE id=?').get(id);
 const owner=()=>db.prepare("SELECT * FROM accounts WHERE role='owner' AND enabled=1 ORDER BY rowid LIMIT 1").get();
 const legacy=db.prepare('SELECT * FROM owner WHERE id=1').get();
 if(!db.prepare('SELECT id FROM accounts LIMIT 1').get()&&legacy)db.prepare("INSERT INTO accounts VALUES(?,?,?,?,?,?,1)").run(crypto.randomUUID(),legacy.username,legacy.username,'owner',legacy.salt,legacy.hash);
 if(options.initialOwner&&!owner()){const {username,password}=options.initialOwner;if(!validUser(username)||!validPassword(password))throw Error('Invalid initial owner.');const h=key(password);db.prepare("INSERT INTO accounts VALUES(?,?,?,?,?,?,1)").run(crypto.randomUUID(),username,username,'owner',h.salt,h.hash)}
 function fillSlots(){if(!owner())return;for(const [role,limit] of [['owner',3],['manager',1],['driver',1]]){let count=db.prepare('SELECT COUNT(*) n FROM accounts WHERE role=?').get(role).n;while(count<limit){let username=role+(role==='owner'?count+1:'');while(db.prepare('SELECT id FROM accounts WHERE username=?').get(username))username+='2';const h=key(crypto.randomBytes(32).toString('hex'));db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?,0)').run(crypto.randomUUID(),username,role==='owner'?'Owner '+(count+1):role[0].toUpperCase()+role.slice(1),role,h.salt,h.hash);count++;}}}
 fillSlots();if(owner())db.exec('DELETE FROM owner');
 if(!db.prepare('PRAGMA table_info(sessions)').all().some(c=>c.name==='user_id')){db.exec('ALTER TABLE sessions ADD COLUMN user_id TEXT');if(owner())db.prepare('UPDATE sessions SET user_id=? WHERE user_id IS NULL').run(owner().id)}
 const currentInstance=db.prepare('SELECT value FROM config WHERE key=?').get('instance');
 const instance=currentInstance?.value||crypto.randomUUID();if(!currentInstance)db.prepare('INSERT INTO config VALUES(?,?)').run('instance',instance);
 const setupCode=owner()?null:options.setupCode||crypto.randomBytes(24).toString('base64url');

 const publicRoot=path.join(__dirname,'..','public'),dummy=key(crypto.randomBytes(24).toString('hex')),attempts=new Map();
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))};
 function originFor(req){if(configuredOrigin)return configuredOrigin;const host=req.headers.host||'';if(!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))return null;return 'http://'+host}
 function session(req){const cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('latif_session='));if(!cookie)return null;const token=cookie.slice('latif_session='.length);if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;const found=db.prepare('SELECT sessions.*,accounts.username,accounts.name,accounts.role FROM sessions JOIN accounts ON accounts.id=sessions.user_id WHERE accounts.enabled=1 AND token=? AND expires>?').get(sha(token),Date.now());return found||null}
 function setSession(res,user=owner()){const token=crypto.randomBytes(32).toString('base64url'),csrf=crypto.randomBytes(24).toString('base64url'),expires=Date.now()+SESSION_MS;db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());db.prepare('INSERT INTO sessions(token,csrf,expires,user_id) VALUES(?,?,?,?)').run(sha(token),csrf,expires,user.id);res.setHeader('Set-Cookie',`latif_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS/1000}${configuredOrigin?.startsWith('https:')?'; Secure':''}`);return csrf}
 function rateLimit(req){const id=req.socket.remoteAddress||'unknown',now=Date.now();if(attempts.size>1000)for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);let row=attempts.get(id);if(!row||row.until<now){row={count:0,until:now+15*60*1000};attempts.set(id,row)}if(++row.count>20)throw Object.assign(Error('Too many attempts. Try again in 15 minutes.'),{status:429});}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  if(configuredOrigin?.startsWith('https:'))res.setHeader('Strict-Transport-Security','max-age=31536000');
  try{
   const origin=originFor(req);if(!origin||req.headers.host!==new URL(origin).host)return send(res,421,{error:'Use the configured application address.'});
   const pathname=new URL(req.url,origin).pathname;
   if(req.method==='GET'&&pathname==='/health')return send(res,200,{ok:true});
   const mutating=['POST','PUT','DELETE','PATCH'].includes(req.method);
   if(mutating){if(req.headers.origin!==origin)return send(res,403,{error:'Same-origin requests required.'});if(!String(req.headers['content-type']||'').startsWith('application/json'))return send(res,415,{error:'Use application/json.'})}
   if(req.method==='GET'&&pathname==='/api/session'){const s=session(req),o=owner();return send(res,200,{authenticated:Boolean(s&&o),needsSetup:!o,username:s?.username,name:s?.name,role:s?.role,csrf:s?.csrf})}
   if(req.method==='POST'&&pathname==='/api/setup'){
    rateLimit(req);if(owner())return send(res,409,{error:'An owner account already exists.'});const body=await readJSON(req,8192);
    if(!equal(body.code,setupCode))return send(res,403,{error:'Incorrect setup code. Check the server window.'});
    if(!validUser(body.username)||!validPassword(body.password))return send(res,400,{error:'Use a 3–64 character username and a password of 12–256 characters.'});
    const h=key(body.password);db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?,1)').run(crypto.randomUUID(),body.username,String(body.name||body.username).slice(0,100),'owner',h.salt,h.hash);fillSlots();return send(res,201,{username:body.username,csrf:setSession(res)});
   }
   if(req.method==='POST'&&pathname==='/api/login'){
    rateLimit(req);const body=await readJSON(req,8192),o=db.prepare('SELECT * FROM accounts WHERE username=? AND enabled=1').get(typeof body.username==='string'?body.username:'');const passwordOK=verifyPassword(o||dummy,body.password);
    if(!o||body.username!==o.username||!passwordOK)return send(res,401,{error:'Incorrect username or password.'});
    return send(res,200,{username:o.username,role:o.role,csrf:setSession(res,o)});
   }
   const s=session(req);
   if(pathname.startsWith('/api/')){
    if(!s)return send(res,401,{error:'Please sign in.'});
    if(mutating&&!equal(req.headers['x-csrf-token'],s.csrf))return send(res,403,{error:'Invalid session token. Reload and sign in again.'});
    if(req.method==='POST'&&pathname==='/api/logout'){db.prepare('DELETE FROM sessions WHERE token=?').run(s.token);res.setHeader('Set-Cookie',`latif_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${configuredOrigin?.startsWith('https:')?'; Secure':''}`);return send(res,200,{ok:true})}
    if(req.method==='POST'&&pathname==='/api/password'){
     rateLimit(req);const body=await readJSON(req,8192);if(!verifyPassword(account(s.user_id),body.currentPassword)||!validPassword(body.newPassword))return send(res,400,{error:'Check the current password and use at least 12 characters for the new password.'});
     const h=key(body.newPassword);db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE accounts SET salt=?,hash=? WHERE id=?').run(h.salt,h.hash,s.user_id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(s.user_id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return send(res,200,{csrf:setSession(res,account(s.user_id))});
    }
    if(req.method==='POST'&&pathname==='/api/profile'){const body=await readJSON(req,8192);if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100)return send(res,400,{error:'Enter a name up to 100 characters.'});db.prepare('UPDATE accounts SET name=? WHERE id=?').run(body.name.trim(),s.user_id);return send(res,200,{name:body.name.trim()})}
    if(pathname==='/api/users'){
     if(s.role!=='owner')return send(res,403,{error:'Only owners manage logins.'});
     if(req.method==='GET')return send(res,200,{users:db.prepare('SELECT id,username,name,role,enabled FROM accounts ORDER BY rowid').all()});
     if(req.method==='POST'){const b=await readJSON(req,8192),target=account(b.id);if(!target||!validUser(b.username)||typeof b.name!=='string'||!b.name.trim()||b.name.length>100)return send(res,400,{error:'Choose an account, a valid username and a name.'});const enabled=b.enabled===true?1:0;if(target.id===s.user_id&&!enabled)return send(res,400,{error:'You cannot disable your own login.'});if(target.role==='owner'&&!enabled&&db.prepare("SELECT COUNT(*) n FROM accounts WHERE role='owner' AND enabled=1 AND id<>?").get(target.id).n===0)return send(res,400,{error:'Keep at least one owner enabled.'});if(db.prepare('SELECT id FROM accounts WHERE username=? AND id<>?').get(b.username,target.id))return send(res,400,{error:'Username already used.'});if((!target.enabled&&enabled||b.password)&&!validPassword(b.password))return send(res,400,{error:'Set a password of at least 12 characters to enable this login.'});db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE accounts SET username=?,name=?,enabled=? WHERE id=?').run(b.username,b.name.trim(),enabled,target.id);if(b.password){const h=key(b.password);db.prepare('UPDATE accounts SET salt=?,hash=? WHERE id=?').run(h.salt,h.hash,target.id)}db.prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').run(target.id,s.token);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return send(res,200,{ok:true});}
    }
    if(req.method==='GET'&&pathname==='/api/driver'){const row=db.prepare('SELECT data FROM business WHERE id=1').get(),d=row.data?JSON.parse(row.data):{customers:[],sales:[],cylinders:[]};return send(res,200,{customers:d.customers.filter(c=>d.sales.some(s=>s.channel==='Supply'&&s.customer===c.id)||d.cylinders.some(x=>x.customer===c.id)).map(c=>({id:c.id,name:c.name,phone:c.phone,address:c.address})),deliveries:d.sales.filter(x=>x.channel==='Supply').map(x=>({id:x.id,date:x.date,customer:x.customer,qty:x.qty,item:x.item})),cylinders:d.cylinders.map(c=>({id:c.id,date:c.date,customer:c.customer,capacity:c.capacity,cylinderType:c.cylinderType,direction:c.direction,qty:c.qty}))})}
    if(s.role==='driver')return send(res,403,{error:'Driver access is limited to delivery/cylinder information.'});
    if(s.role!=='owner'&&pathname.startsWith('/api/backups'))return send(res,403,{error:'Only owners can download full server recovery backups.'});
    if(req.method==='GET'&&pathname==='/api/state'){const row=db.prepare('SELECT * FROM business WHERE id=1').get();return send(res,200,{instance,revision:row.revision,data:row.data?JSON.parse(row.data):null,updated:row.updated})}
    if(req.method==='PUT'&&pathname==='/api/state'){
     const body=await readJSON(req,MAX_DATA+1024);if(body.instance!==instance||!Number.isSafeInteger(body.revision)||body.revision<0)return send(res,409,{error:'Server or revision changed. Reload shared records.'});const data=validateDocument(body.data);if(Buffer.byteLength(data)>MAX_DATA)return send(res,413,{error:'Business data exceeds 10 MB.'});
     db.exec('BEGIN IMMEDIATE');try{const old=db.prepare('SELECT * FROM business WHERE id=1').get();if(old.revision!==body.revision){db.exec('ROLLBACK');return send(res,409,{error:'Another device saved newer records.'})}const now=new Date().toISOString(),revision=old.revision+1;if(old.data)db.prepare('INSERT INTO recovery(revision,data,created) VALUES(?,?,?)').run(old.revision,old.data,now);db.prepare('UPDATE business SET revision=?,data=?,updated=? WHERE id=1').run(revision,data,now);db.prepare('INSERT INTO daily_recovery VALUES(?,?,?,?) ON CONFLICT(day) DO UPDATE SET revision=excluded.revision,data=excluded.data,created=excluded.created').run(datePK(),revision,data,now);db.exec('DELETE FROM recovery WHERE id NOT IN (SELECT id FROM recovery ORDER BY id DESC LIMIT 20); DELETE FROM daily_recovery WHERE day NOT IN (SELECT day FROM daily_recovery ORDER BY day DESC LIMIT 30); COMMIT');return send(res,200,{instance,revision,updated:now});}catch(e){try{db.exec('ROLLBACK')}catch{}throw e}
    }
    if(req.method==='GET'&&pathname==='/api/backups'){const revisions=db.prepare("SELECT 'revision' AS kind,CAST(id AS TEXT) AS id,revision,created FROM recovery ORDER BY id DESC").all(),daily=db.prepare("SELECT 'daily' AS kind,day AS id,revision,created FROM daily_recovery ORDER BY day DESC").all();return send(res,200,{backups:[...daily,...revisions]})}
    if(req.method==='GET'&&pathname.startsWith('/api/backups/')){const [, , ,kind,id]=pathname.split('/');const row=kind==='daily'?db.prepare('SELECT data FROM daily_recovery WHERE day=?').get(id):kind==='revision'?db.prepare('SELECT data FROM recovery WHERE id=?').get(id):null;if(!row)return send(res,404,{error:'Backup not found.'});res.setHeader('Content-Disposition','attachment; filename="latif-recovery.json"');return send(res,200,{format:'latif-lpg-backup',version:1,data:JSON.parse(row.data)})}
    return send(res,404,{error:'Unknown API route.'});
   }
   if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed.'});
   const publicFiles=new Set(['/login.html','/auth.js','/auth.css','/latif-logo.png']);let filePath=pathname==='/'?'/index.html':pathname;
   if(!s&&!publicFiles.has(filePath)){if(filePath==='/index.html'||filePath==='/driver.html'){filePath='/login.html'}else return send(res,401,{error:'Please sign in.'})}
   if(s?.role==='driver'){if(filePath==='/index.html'){res.writeHead(302,{Location:'/driver.html'});return res.end()}if(!['/driver.html','/driver.js','/auth.css','/latif-logo.png'].includes(filePath))return send(res,403,{error:'Driver access only.'});}
   const decoded=decodeURIComponent(filePath),file=path.resolve(publicRoot,'.'+decoded);if(!file.startsWith(publicRoot+path.sep)||decoded.split('/').some(p=>p.startsWith('.')))return send(res,403,{error:'Forbidden.'});
   if(!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,{error:'Not found.'});
   const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8'}[path.extname(file)]||'application/octet-stream';res.setHeader('Content-Type',type);if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
  }catch(err){if(!res.headersSent)send(res,err.status||500,{error:err.status?err.message:'The server could not complete this request.'});else res.end();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=40;server.on('close',()=>db.close());return {server,setupCode,dataDir};
}
module.exports={createPrivateServer,validPassword,key,defaultDataDir};
