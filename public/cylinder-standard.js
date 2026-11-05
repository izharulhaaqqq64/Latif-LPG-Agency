// Normalize size labels without changing historical measured KG, money or loss.
function standardCylinderSize(value){return ['45','45.5'].includes(String(value))?'45.4':String(value)}
function oldFullStock(data,size,variant=null){
 const counts=(data.fullCylinderCounts||[]).filter(c=>String(c.capacity)===size),moves=(data.fullCylinderMovements||[]).filter(c=>String(c.capacity)===size);
 const calc=v=>{const c=counts.filter(c=>(c.variant||null)===v).at(-1);return {known:!!c,stamp:c?.createdAt||'',qty:(c?.qty||0)+moves.filter(m=>(!v||m.variant===v)&&(!c||m.createdAt>c.createdAt&&m.date>=c.date)).reduce((a,m)=>a+(m.direction==='In'?m.qty:-m.qty),0)}};
 if(variant){const t=calc(variant);if(calc(null).stamp>t.stamp)t.known=false;return t}const a=calc(null),o=calc('Original'),l=calc('Local');if(o.known&&l.known&&o.stamp>=a.stamp&&l.stamp>=a.stamp&&!moves.some(m=>!['Original','Local'].includes(m.variant)&&m.createdAt>(o.stamp<l.stamp?o.stamp:l.stamp)))return {known:true,qty:o.qty+l.qty};if(o.stamp>a.stamp||l.stamp>a.stamp)a.known=false;return a;
}
function normalizeCylinderData(data){
 if(!data||typeof data!=='object'||Array.isArray(data))return data;
 if(data.cylinderStandardVersion===1)return data;
 const old=['45','45.4','45.5'],stamp=new Date().toISOString(),date=today(),counts=data.fullCylinderCounts||[],moves=data.fullCylinderMovements||[],active=old.filter(size=>[...counts,...moves].some(r=>String(r.capacity)===size)),full=[];
 if(active.some(s=>s!=='45.4'))for(const variant of [null,'Original','Local']){if(variant&&!counts.some(c=>old.includes(String(c.capacity))&&c.variant===variant))continue;const rows=active.map(s=>oldFullStock(data,s,variant));full.push({id:crypto.randomUUID(),capacity:'45.4',...(variant?{variant}:{}),qty:Math.max(0,rows.reduce((a,r)=>a+r.qty,0)),stockDeficit:Math.max(0,-rows.reduce((a,r)=>a+r.qty,0)),estimated:!rows.every(r=>r.known),date,createdAt:stamp,note:'Combined cylinder size balance; historical gas KG unchanged'})}
 const audit=(full.length||Object.keys(data.emptyCylinderOpening||{}).some(s=>['45','45.5'].includes(s)))?{date,fullCounts:structuredClone(counts.filter(c=>old.includes(String(c.capacity)))),emptyOpenings:structuredClone(data.emptyCylinderOpening||{})}:null;
 const opening=data.emptyCylinderOpening||{},em=data.emptyCylinderMovements||[],emptyActive=old.filter(s=>opening[s]||em.some(m=>String(m.capacity)===s));let combinedEmpty=null;
 if(emptyActive.some(s=>s!=='45.4')){let qty=0,mass=0,weightKnown=true;for(const size of emptyActive){const o=opening[size],q=(o?.qty||0)+em.filter(m=>String(m.capacity)===size&&(!o?.asOf||m.createdAt>o.asOf)).reduce((a,m)=>a+(m.direction==='In'?m.qty:-m.qty),0);qty+=q;if(q&&o?.tareKg==null)weightKnown=false;else mass+=q*(o?.tareKg||0)}combinedEmpty={qty:Math.max(0,qty),stockDeficit:Math.max(0,-qty),tareKg:weightKnown&&qty?mass/qty:null,date,asOf:stamp,createdAt:stamp,incomplete:!emptyActive.every(s=>opening[s]&&!opening[s].incomplete)};}
 // Retain original physical counts as audit records; the new combined count supersedes them.
 if(full.length)for(const row of counts)if(old.includes(String(row.capacity)))row.migrationArchived=true;
 function walk(value){if(!value||typeof value!=='object')return;if(Array.isArray(value)){for(const row of value)walk(row);return}if('capacity' in value&&['45','45.5'].includes(String(value.capacity))){value.recordedCapacity??=value.capacity;value.capacity=typeof value.capacity==='number'?45.4:'45.4'}for(const key of ['cylinderCapacity','residualCapacity'])if(key in value)value[key]=standardCylinderSize(value[key]);for(const [key,item] of Object.entries(value))if(key!=='recordedCapacity')walk(item);if(Array.isArray(value.cylBySize)){const merged=new Map();for(const row of value.cylBySize){if(!merged.has(row.capacity))merged.set(row.capacity,{...row});else{const target=merged.get(row.capacity);for(const key of ['opening','out','inside','closing'])target[key]=(target[key]||0)+(row[key]||0)}}value.cylBySize=[...merged.values()]}}
 for(const sale of data.sales||[])if(sale.filledCylinderSale&&['45','45.5'].includes(String(sale.filledCylinderSale.capacity)))sale.filledCylinderSale.gasKgAtSale=sale.qty;
 for(const sale of data.sales||[])if((sale.filledCylinderSale||sale.cylinderSale)&&sale.item)sale.item=sale.item.replace(/(^|\s)45(?:\.5)?\s*kg/gi,'$1'+'45.4 kg');
 walk(data);
 if(full.length){data.fullCylinderCounts??=[];data.fullCylinderCounts.push(...full)}
 if(combinedEmpty){for(const size of old)delete opening[size];opening['45.4']=combinedEmpty;data.emptyCylinderOpening=opening}
 for(const name of ['cylinderAlertLevels'])if(data[name]){const map=data[name];map['45.4']??=map['45']??map['45.5']??5;delete map['45'];delete map['45.5']}
 if(data.securityRates){const next={};for(const [key,value] of Object.entries(data.securityRates)){const [size,variant]=key.split('|');const k=standardCylinderSize(size)+'|'+variant;if(!(k in next)||size==='45.4')next[k]=value}data.securityRates=next}
 if(audit||combinedEmpty)data.cylinderStandardAudit=audit||{date,emptyOpenings:structuredClone(opening)};
 data.cylinderStandardVersion=1;return data;
}
normalizeCylinderData(state);
