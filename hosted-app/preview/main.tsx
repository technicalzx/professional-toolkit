import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';
import './preview.css';
const banner=<div style={{padding:'12px 24px',background:'#fff4d6',color:'#493c20',textAlign:'center',fontSize:13}}>Temporary Cloudflare preview · Tools and browser saves work. Account sync, URL fetching and passkeys are not enabled here yet.</div>;
function App(){return <>{banner}{location.pathname==='/account'?<main className="account-shell"><a href="/">← Back to the toolkit</a><section className="card account-form" style={{marginTop:32}}><h1>Accounts are coming to this preview.</h1><p>Passkey sign-in and private report sync are still being implemented. No credentials are collected on this test site.</p><p>You can already test profile audits with pasted content, job matching, proposal outlines and the calculators. Saves stay in this browser.</p><a className="primary account-link" href="/">Try the tools</a></section></main>:<Home/>}</>};
createRoot(document.getElementById('root')!).render(<App/>);
