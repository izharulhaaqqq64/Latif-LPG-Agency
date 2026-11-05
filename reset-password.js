'use strict';
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline/promises'),{Writable}=require('node:stream');
if(fs.existsSync('.env'))process.loadEnvFile('.env');
const {DatabaseSync}=require('node:sqlite'),{key,validPassword,defaultDataDir}=require('./lib/private-server');
(async()=>{
 const file=path.join(path.resolve(process.env.LPG_DATA_DIR||defaultDataDir()),'latif.sqlite');if(!fs.existsSync(file))throw Error('No account database found. Start the app and create your owner account first.');
 let muted=false;const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk);done()}});output.isTTY=process.stdout.isTTY;output.columns=process.stdout.columns;
 const rl=readline.createInterface({input:process.stdin,output,terminal:Boolean(process.stdin.isTTY)});let password,confirm;
 try{process.stdout.write('New owner password (at least 12 characters): ');muted=true;password=await rl.question('');process.stdout.write('\nConfirm password: ');confirm=await rl.question('');process.stdout.write('\n');}finally{muted=false;rl.close()}
 if(password!==confirm||!validPassword(password))throw Error('Passwords must match and contain 12–256 characters.');
 const db=new DatabaseSync(file);try{if(!db.prepare("SELECT id FROM accounts WHERE role='owner' AND enabled=1 ORDER BY rowid LIMIT 1").get())throw Error('Create your owner account first.');const owner=db.prepare("SELECT id FROM accounts WHERE role='owner' AND enabled=1 ORDER BY rowid LIMIT 1").get();const h=key(password);db.exec('BEGIN IMMEDIATE');db.prepare('UPDATE accounts SET salt=?,hash=? WHERE id=?').run(h.salt,h.hash,owner.id);db.exec('DELETE FROM sessions; COMMIT');console.log('Owner password reset. Sign in again on each device.');}finally{db.close()}
})().catch(err=>{console.error(err.message);process.exitCode=1});
