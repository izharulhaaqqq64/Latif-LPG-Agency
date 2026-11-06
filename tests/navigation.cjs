// Exercise the five-tab UI, then its contextual section links.
exports.navigate=async(p,route)=>{
 const groups={'Overview':'Dashboard','Sales':'Sales','Invoices':'Sales','Receipts':'Sales','Expenses':'Sales','Money & cylinder ledger':'Khata','Supplier credit':'Khata','Gas & inventory':'Stock','Cylinder tracking':'Stock','Gas parts':'Stock','Gas calculator':'Stock','Reports':'Reports'};
 await p.locator(`nav [data-main="${groups[route]}"]`).click();
 if(route==='Sales'){await p.evaluate(()=>{simplePaymentDetailsOpen=true;render();document.querySelector('.simple-sales-tools')?.setAttribute('open','')})}
 if(!['Overview','Sales','Money & cylinder ledger','Gas & inventory','Reports'].includes(route))await p.locator(`.simple-section-tabs [data-page="${route}"]`).click();
};
exports.settingsClick=async(p,id)=>{
 const s=p.locator('#simple-settings');if(!await s.evaluate(el=>el.open))await s.locator('summary').click();
 await p.locator('#'+id).click();
};
