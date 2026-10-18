import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import Tools from '../app/tools/page';
import Capture from '../app/capture/page';
import Workflows from '../app/workflows/page';
import '../app/globals.css';
import './preview.css';
const banner=<div style={{padding:'12px 24px',background:'#fff4d6',color:'#493c20',textAlign:'center',fontSize:13}}>Cloudflare preview · Project workflows, captures, device saves and exports are available. Account sync, server URL fetching and AI require the full backend.</div>;
function AccountUnavailable(){return <main className="account-shell"><a href="/">← Project workspace</a><section className="card account-form" style={{marginTop:32}}><h1>Keep working on this device.</h1><p>This preview supports local project workflows and snapshot review. Accounts and private cross-device sync require the full backend and are unavailable here.</p><p>Save on this device or export JSON to keep your work. No credentials are collected by this preview.</p><a className="primary account-link" href="/">Open project workspace</a></section></main>;}
function App(){
  const path=location.pathname.replace(/\/$/,'')||'/';
  const routes:Record<string,React.ComponentType>={'/':Home,'/tools':Tools,'/capture':Capture,'/workflows':Workflows,'/account':AccountUnavailable};
  const Page=routes[path];
  return <>{banner}{Page?<Page/>:<main className="account-shell"><h1>Page unavailable</h1><a href="/">Open project workspace</a></main>}</>;
}
createRoot(document.getElementById('root')!).render(<App/>);
