"use client";
import {readAccountResponse} from '../../lib/auth/client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ShieldCheck,KeyRound,Download,UserRound,LogOut} from 'lucide-react';
type User={id:string;username:string;name:string;created:number};
export default function AccountPage(){
 const [user,setUser]=useState<User|null>(null),[mode,setMode]=useState('login'),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[codes,setCodes]=useState<string[]>([]),[stats,setStats]=useState({activeSessions:0,recoveryCodesRemaining:0});
 const [form,setForm]=useState<Record<string,string>>({});
 async function refresh(){const r=await fetch('/api/account',{cache:'no-store'});const d=await readAccountResponse(r);if(!r.ok)throw Error(d.error);setUser(d.user||null);setStats(d);const current=d.user;if(current)setForm(f=>({...f,name:current.name}));}
 useEffect(()=>{refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 function switchMode(m:string){setMode(m);setForm({});setError('');setNotice('')}
 async function submit(action:string){
  if(action==='delete'&&!window.confirm('Permanently delete your account and all account-saved reports? This cannot be undone.'))return;
  if(action==='recovery-codes'&&!window.confirm('Replace every previous recovery code? Save the new codes after continuing.'))return;
  setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,action})});const d=await readAccountResponse(r);if(!r.ok)throw Error(d.error);
   setForm({});if(d.recoveryCodes)setCodes(d.recoveryCodes);
   if(['logout','logout-all','password','recover','delete'].includes(action)){setUser(null);setMode('login');setCodes([])}
   await refresh();setNotice(d.message||(action==='register'?'Your account is ready. Save your recovery codes now.':action==='delete'?'Account and stored reports deleted.':action==='recovery-codes'?'New recovery codes created. Previous codes no longer work.':'Changes saved.'));
  }catch(e){setError(e instanceof Error?e.message:'Please try again.')}finally{setBusy(false)}
 }
 function field(key:string,label:string,type='text',autoComplete='off'){
  return <label className="field"><span>{label}</span><input name={key} type={type} autoComplete={autoComplete} value={form[key]||''} required maxLength={key==='name'?80:key==='username'?32:256} minLength={key==='password'&&mode!=='login'?15:undefined} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/></label>
 }
 function downloadCodes(){const blob=new Blob([`Professional Toolkit recovery codes\nUsername: ${user?.username}\nEach code works once. Keep this file private and offline.\n\n${codes.join('\n')}\n`],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='toolkit-recovery-codes.txt';a.click();URL.revokeObjectURL(url)}
 const titles:Record<string,string>={login:'Welcome back.',register:'Make room for your next step.',recover:'Recover your account.'};
 return <main className="account-shell"><a className="account-back" href="/"><ArrowLeft size={17}/> Back to your toolkit</a><div className="account-heading"><span className="brandmark">P<span>•</span></span><span className="eyebrow">YOUR TOOLKIT. YOUR ACCOUNT.</span><h1>{user?'Your account, in your control.':titles[mode]}</h1><p>First-party accounts. No social login or external authentication provider.</p></div>
 {loading?<div className="card">Loading your account…</div>:<>
 {error&&<div role="alert" className="auth-message auth-error">{error}</div>}{notice&&<div role="status" className="auth-message">{notice}</div>}
 {codes.length>0&&<section className="card recovery-card"><KeyRound/><h2>Save these recovery codes now</h2><p>These codes are shown only once. Each code can reset your password once. Anyone with a code can access your account. Store them privately, away from this browser.</p><div className="recovery-grid">{codes.map(c=><code key={c}>{c}</code>)}</div><div className="button-row"><button className="primary" onClick={downloadCodes}><Download size={16}/> Download codes</button><button className="secondary" onClick={()=>{if(window.confirm('Have you saved the codes securely? They cannot be shown again.'))setCodes([])}}>I saved my codes</button></div></section>}
 {!user?<div className="account-grid"><section className="card account-form"><div className="button-row auth-tabs">{['login','register','recover'].map(m=><button key={m} className={mode===m?'primary':'secondary'} disabled={busy} onClick={()=>switchMode(m)}>{m==='login'?'Sign in':m==='register'?'Create account':'Recovery'}</button>)}</div><form onSubmit={e=>{e.preventDefault();submit(mode)}}>
 {mode==='register'&&field('name','Display name','text','nickname')}{field('username','Username','text','username')}
 {mode==='recover'&&field('code','One unused recovery code')}
 {field('password',mode==='recover'?'New passphrase':'Passphrase','password',mode==='login'?'current-password':'new-password')}
 {mode!=='login'&&<p className="fineprint">Use at least 15 characters. A long, unique passphrase or password manager works well. Maximum 256 bytes.</p>}
 <button disabled={busy} className="primary auth-submit">{busy?'Working…':mode==='login'?'Sign in':mode==='register'?'Create my account':'Reset password'}</button></form></section><section className="card account-explainer"><ShieldCheck size={30}/><h2>A private place for your work</h2><p>Create a username and passphrase to save reports across devices. Your display name does not need to be your legal name.</p><ul><li>Passwords are stored as salted scrypt hashes.</li><li>Sessions expire after seven days and can be revoked.</li><li>Six one-use codes let you recover without email.</li><li>Browser-only reports stay local until you choose to save them to your account.</li></ul><p className="fineprint">We do not collect or verify an email address. Without your password or a saved recovery code, account access cannot be restored. This review site still has its hosting access gate.</p></section></div>:
 <div className="account-grid"><section className="card account-form"><UserRound/><h2>{user.name}</h2><p>@{user.username} · Joined {new Date(user.created*1000).toLocaleDateString()}</p><div className="account-stats"><span><strong>{stats.activeSessions}</strong> active sessions</span><span><strong>{stats.recoveryCodesRemaining}</strong> recovery codes left</span></div>
 <form onSubmit={e=>{e.preventDefault();submit('profile')}}>{field('name','Display name','text','nickname')}<button className="primary" disabled={busy}>Update name</button></form><hr/><div className="button-row"><button className="secondary" disabled={busy} onClick={()=>submit('logout')}><LogOut size={15}/> Sign out</button><button className="secondary" disabled={busy} onClick={()=>submit('logout-all')}>Sign out all devices</button></div></section>
 <section className="card account-form"><KeyRound/><h2>Password & recovery</h2><form onSubmit={e=>{e.preventDefault();submit('password')}}>{field('currentPassword','Current passphrase','password','current-password')}{field('password','New passphrase','password','new-password')}<p className="fineprint">At least 15 characters. Changing it signs out every device.</p><button className="primary" disabled={busy}>Change passphrase</button></form><hr/><p>Enter your current passphrase above to replace your recovery codes or delete your account.</p><div className="button-row"><button className="secondary" disabled={busy||!form.currentPassword} onClick={()=>submit('recovery-codes')}>Replace recovery codes</button><button className="secondary danger" disabled={busy||!form.currentPassword} onClick={()=>submit('delete')}>Delete account & reports</button></div></section></div>}
 </> }<p className="account-footer">Open-source account system · Credentials and session tokens are never stored in browser local storage.</p></main>
}
