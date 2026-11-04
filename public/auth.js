let setupMode=false;
const form=document.getElementById('auth-form'),error=document.getElementById('auth-error'),button=document.getElementById('auth-submit');
fetch('/api/session',{cache:'no-store'}).then(r=>r.json()).then(session=>{
 if(session.authenticated){location.replace('/');return}
 setupMode=session.needsSetup;
 if(setupMode){document.getElementById('auth-description').textContent='Create your private owner account';document.getElementById('setup-code-label').hidden=false;document.getElementById('confirm-password-label').hidden=false;form.elements.code.required=true;form.elements.confirmPassword.required=true;form.elements.password.autocomplete='new-password';button.textContent='Create owner account';document.getElementById('auth-note').textContent='Find the one-time setup code in your server window or hosting logs. Choose a password with at least 12 characters. There is no public registration.';}
}).catch(()=>{error.textContent='Cannot connect to the server. Check that it is running.';button.disabled=true});
form.addEventListener('submit',async e=>{
 e.preventDefault();error.textContent='';const values=Object.fromEntries(new FormData(form));if(setupMode&&values.password!==values.confirmPassword){error.textContent='Passwords do not match.';return}button.disabled=true;
 try{const response=await fetch(setupMode?'/api/setup':'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});const data=await response.json();if(!response.ok)throw Error(data.error||'Sign in failed.');location.replace('/');}catch(err){error.textContent=err.message;button.disabled=false}
});
