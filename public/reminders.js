state.paymentReminders ??= [];
let whatsappDraft=null;
function whatsappPhone(value){
 let phone=String(value||'').trim().replace(/[\s()\-]/g,'');
 if(phone.startsWith('+'))phone=phone.slice(1);else if(phone.startsWith('00'))phone=phone.slice(2);
 if(/^03\d{9}$/.test(phone))phone='92'+phone.slice(1);
 else if(/^3\d{9}$/.test(phone))phone='92'+phone;
 return /^[1-9]\d{7,14}$/.test(phone)?phone:'';
}
function reminderTimestamp(value){return new Date(value).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})}
function paymentReminderHistory(id){
 const rows=state.paymentReminders.filter(r=>r.customer===id).slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 return `<div class="reminder-status" id="ledger-reminder-status">${rows.length?'Last WhatsApp reminder marked sent: '+esc(reminderTimestamp(rows[0].createdAt)):'No WhatsApp reminder marked sent yet.'}</div>${rows.length?`<details class="simple-details"><summary>WhatsApp reminder history (${rows.length})</summary>${table(['MARKED SENT','PHONE','AMOUNT REQUESTED',''],rows.map(r=>`<tr data-record-kind="WhatsApp reminder" data-record-key="${esc(r.id)}"><td>${esc(reminderTimestamp(r.createdAt))}</td><td>+${esc(r.phone)}</td><td>Rs. ${money(r.amount)}</td><td><button class="card-link" type="button" data-reminder-history="${esc(r.id)}">View message</button></td></tr>`))}</details>`:''}`;
}
function openWhatsAppReminder(id){
 const c=customer(id);if(!c||balance(c)<=0){toast('This customer has no outstanding payment.');return}
 const phone=whatsappPhone(c.phone),amount=roundAmount(balance(c));
 reminderText=`Hello ${c.name}, your outstanding payment with LATIF LPG AGENCY is Rs. ${money(amount)}.${c.paymentDueDate?' Payment due date: '+c.paymentDueDate+'.':''} Please clear the pending payment. Cylinders outstanding: ${cylinderBreakdownText(c.id)}. For assistance call 03320981963. Thank you.`;
 whatsappDraft={customer:id,phone,amount,message:reminderText,opened:false};
 showDetail('WhatsApp payment reminder',`<p><strong>${esc(c.name)}</strong> · Outstanding: Rs. ${money(amount)}<br>WhatsApp: ${phone?'+'+esc(phone):'Valid mobile number needed'}</p>${phone?'':'<p role="alert">Add or correct the customer’s mobile using Edit contact / due date in the ledger. Pakistani numbers such as 03xx… and +92… are supported.</p>'}<label class="field">Payment reminder<textarea id="reminder-draft" readonly>${esc(reminderText)}</textarea></label><div class="reminder-actions"><button type="button" class="button primary" id="open-whatsapp" ${phone?'':'disabled'}>Open WhatsApp</button><button type="button" class="button secondary" id="mark-reminder-sent" disabled>Mark as sent</button><button type="button" class="button secondary" id="download-reminder">Download reminder</button></div><p class="card-subtitle">Press Send in WhatsApp yourself, then click Mark as sent. This status records your confirmation; it does not verify delivery or clear the customer’s balance. Record the received payment using Credit · payment received.</p>`);
}
function openReminderWhatsApp(){
 if(!whatsappDraft?.phone)return;
 window.open('https://wa.me/'+whatsappDraft.phone+'?text='+encodeURIComponent(whatsappDraft.message),'_blank','noopener,noreferrer');
 whatsappDraft.opened=true;document.getElementById('mark-reminder-sent').disabled=false;
}
function markReminderSent(){
 if(!whatsappDraft?.opened||!customer(whatsappDraft.customer))return;
 const before=state.paymentReminders.slice(),createdAt=new Date().toISOString();
 try{
  state.paymentReminders.push({id:crypto.randomUUID(),date:today(),createdAt,customer:whatsappDraft.customer,phone:whatsappDraft.phone,amount:whatsappDraft.amount,message:whatsappDraft.message,channel:'WhatsApp',status:'Marked sent'});
  save();whatsappDraft=null;document.getElementById('entry-dialog').close();render();toast('WhatsApp reminder marked as sent. Payment balance unchanged.');
 }catch(err){state.paymentReminders=before;document.getElementById('form-error').textContent=err.message}
}
document.addEventListener('click',e=>{
 if(e.target.closest('#open-whatsapp'))openReminderWhatsApp();
 if(e.target.closest('#mark-reminder-sent'))markReminderSent();
 const history=e.target.closest('[data-reminder-history]');if(history){const r=state.paymentReminders.find(row=>row.id===history.dataset.reminderHistory);if(r)showDetail('WhatsApp reminder · marked sent',`<p>${esc(customer(r.customer)?.name||'Customer')} · +${esc(r.phone)}<br>${esc(reminderTimestamp(r.createdAt))}</p><p class="reminder-message">${esc(r.message)}</p><p class="card-subtitle">Marked sent by you. Delivery is not verified. This is not a payment receipt.</p>`)}
});

function ledgerReminderBanner(c){
 return `<section class="ledger-reminder-banner" aria-label="WhatsApp payment reminders"><div><strong>Payment reminders</strong><p>${c&&balance(c)>0?'Remind '+esc(c.name)+' about the pending payment.':'Choose a customer to send a payment reminder.'}</p></div><button type="button" class="button whatsapp-button" id="ledger-whatsapp-reminder" ${c&&balance(c)>0?'data-reminder="'+esc(c.id)+'"':'data-reminder-picker'}><span aria-hidden="true">☏</span> WhatsApp reminder</button></section>`;
}
function openReminderCustomerPicker(){
 const customersDue=state.customers.filter(c=>balance(c)>0);
 showDetail('Choose customer for WhatsApp reminder',customersDue.length?`<label class="field">Customer with pending payment<select id="reminder-customer-picker">${customersDue.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · Rs. ${money(roundAmount(balance(c)))}</option>`).join('')}</select></label><button type="button" class="button whatsapp-button" id="preview-picked-reminder">Preview WhatsApp reminder</button>`:'<p>No customers have an outstanding payment.</p>');
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-reminder-picker]'))openReminderCustomerPicker();
 if(e.target.closest('#preview-picked-reminder'))openWhatsAppReminder(document.getElementById('reminder-customer-picker').value);
});
