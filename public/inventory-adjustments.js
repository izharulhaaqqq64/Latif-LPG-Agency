state.gasAdjustments ??=[];
function gasInventoryRows(data=state){return data.stock.concat((data.gasAdjustments||[]).map(r=>({...r,inventoryAdjustment:true})))}
