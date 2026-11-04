'use strict';
if(require('node:fs').existsSync('.env'))process.loadEnvFile('.env');
const {createPrivateServer}=require('./lib/private-server');
const app=createPrivateServer();
const port=Number(process.env.PORT||3000);
app.server.on('error',err=>{console.error(err.code==='EADDRINUSE'?'This port is already in use. Close the old server window before starting this version.':err.message);process.exit(1)});
app.server.listen(port,'0.0.0.0',()=>{
 console.log('LATIF LPG AGENCY private server running on port '+port);
 if(app.setupCode){console.log('Create your owner account in the browser. Your private one-time setup code:');console.log(app.setupCode);}
 console.log('Business database: '+app.dataDir);
});
