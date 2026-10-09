// Petit pilote Chrome headless par CDP, sans dependance (WebSocket natif de Node 24).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function attendre(ms) { return new Promise(r => setTimeout(r, ms)); }

async function lancer(opts) {
  const port = opts.port || 9333;
  const profil = opts.profil;
  if (opts.neuf && fs.existsSync(profil)) fs.rmSync(profil, { recursive: true, force: true });
  fs.mkdirSync(profil, { recursive: true });
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profil, '--window-size=' + (opts.taille || '1400,1000'), 'about:blank'],
    { stdio: 'ignore' });
  let cibles = null;
  for (let i = 0; i < 60; i++) {
    try { cibles = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); if (cibles.some(c => c.type === 'page')) break; } catch (e) {}
    await attendre(250);
  }
  if (!cibles) throw new Error('Chrome ne repond pas');
  const page = cibles.find(c => c.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const attente = new Map();
  const ecouteurs = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && attente.has(d.id)) { const a = attente.get(d.id); attente.delete(d.id); d.error ? a.rej(new Error(JSON.stringify(d.error))) : a.res(d.result); }
    else if (d.method) ecouteurs.forEach(f => f(d));
  };
  function envoyer(method, params) {
    return new Promise((res, rej) => { const i = ++id; attente.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  }
  const erreurs = [];
  ecouteurs.push(d => {
    if (d.method === 'Runtime.exceptionThrown') erreurs.push('EXCEPTION ' + (d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text));
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') erreurs.push('CONSOLE ' + d.params.args.map(a => a.value || a.description).join(' '));
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') erreurs.push('LOG ' + d.params.entry.text + ' ' + (d.params.entry.url || ''));
  });
  await envoyer('Runtime.enable');
  await envoyer('Log.enable');
  await envoyer('Page.enable');
  async function ev(expr) {
    const r = await envoyer('Runtime.evaluate', { expression: '(async () => { ' + expr + ' })()', awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('evaluation : ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    return r.result.value;
  }
  async function aller(url) {
    await envoyer('Page.navigate', { url });
    for (let i = 0; i < 80; i++) { await attendre(150); try { const ok = await ev('return document.readyState === "complete"'); if (ok) break; } catch (e) {} }
    await attendre(400);
  }
  async function capture(fichier, pleinePage) {
    const r = await envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!pleinePage });
    fs.writeFileSync(fichier, Buffer.from(r.data, 'base64'));
  }
  async function taille(l, h, mobile) {
    if (!l) return envoyer('Emulation.clearDeviceMetricsOverride');
    return envoyer('Emulation.setDeviceMetricsOverride', { width: l, height: h, deviceScaleFactor: 1, mobile: !!mobile });
  }
  async function fermer() { try { ws.close(); } catch (e) {} try { proc.kill(); } catch (e) {} }
  return { envoyer, ev, aller, capture, taille, fermer, erreurs, port };
}
module.exports = { lancer, attendre };
