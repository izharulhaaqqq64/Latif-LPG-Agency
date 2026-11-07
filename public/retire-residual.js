// Stop future residual estimates without restoring losses already deducted.
const residualBeforeRetirement=automaticResidual;
function retireResidual(data){
  if(data.residualRetired===true)return data;
  const result=residualBeforeRetirement(data);
  data.retiredResidualLosses=structuredClone(result.losses);
  data.residualRetired=true;
  return data;
}
retireResidual(state);
const backupBeforeRetirement=validateBackup;
validateBackup=function(payload){const data=backupBeforeRetirement(payload);if(data.residualRetired!=null&&typeof data.residualRetired!=='boolean')throw Error('Invalid residual retirement flag.');if(data.retiredResidualLosses!=null){if(!Array.isArray(data.retiredResidualLosses)||data.retiredResidualLosses.length>100000)throw Error('Invalid historical gas adjustments.');const ids=new Set();for(const r of data.retiredResidualLosses){if(!r||typeof r.id!=='string'||ids.has(r.id)||!Number.isFinite(r.qty)||r.qty<=0||!['Shop','Main godown','Supply vehicle'].includes(r.warehouse)||!/^\d{4}-\d{2}-\d{2}$/.test(r.date))throw Error('Invalid historical gas adjustment.');ids.add(r.id)}}return retireResidual(data)};
automaticResidual=function(data=state){return {losses:data.retiredResidualLosses||[],batches:[],shortages:[]}};
retailUsableGas=function(warehouse=null){return roundKg(Math.max(0,warehouse?locationStock(warehouse):gasStock()))};
validateAutomaticResidual=function(){};
residualPolicyFields=function(){return ''};
applyPurchaseResidual=function(receipt){if(!receipt.residualPolicy)receipt.residualPolicy={enabled:false,gramsPerCylinder:0}};
batchResidualPanel=function(){return ''};
const moneyBeforeRetirement=openMoneyForm;openMoneyForm=function(kind){if(kind==='loss'){toast('Gas wastage / residual entry has been removed.');return}moneyBeforeRetirement(kind)};
function removeResidualUI(root){
  root.querySelectorAll('.residual-policy,.residual-batches,.gas-loss-panel,.loss-report,#inventory-residual-details,#show-stock-residue,[data-money-action="loss"]').forEach(n=>n.remove());
  root.querySelectorAll('.stat').forEach(n=>{if(/Estimated retail-usable gas/.test(n.textContent))n.remove()});
  root.querySelectorAll('.card-subtitle').forEach(n=>{if(/Estimated retail-usable Shop gas/.test(n.textContent))n.textContent='Shop gas available: '+gasNumber(locationStock('Shop'))+' kg. Gas stock decreases by the KG sold. Only the received payment is counted in daily cash / online totals.'});
}
const inventoryBeforeRetirement=inventoryPage;inventoryPage=function(){const box=document.createElement('div');box.innerHTML=inventoryBeforeRetirement();removeResidualUI(box);return box.innerHTML};
const detailsBeforeRetirement=showDetail;showDetail=function(title,html){detailsBeforeRetirement(title,html);removeResidualUI(document.getElementById('form-fields'))};
const renderBeforeRetirement=render;render=function(){renderBeforeRetirement();removeResidualUI(document.getElementById('content'))};
render();
