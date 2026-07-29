"""
The HTML for GET /wifi-setup — served directly by the FastAPI app (see
app/routers/wifi.py), reached at e.g. http://10.42.0.1:8000/wifi-setup once
a phone joins the Pi's fallback hotspot.

Deliberately a single dependency-free string, not a template file loaded
from disk or a CDN-linked asset: there is no internet in AP mode, so
anything this page needs (fonts, JS, CSS) has to be inlined right here.
"""

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AcController WiFi Setup</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 16px 48px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0b0f14; color: #e6edf3;
    max-width: 480px; margin-inline: auto;
  }
  h1 { font-size: 1.35rem; margin: 0 0 4px; }
  p.sub { color: #8b949e; margin-top: 0; font-size: 0.9rem; }
  .card {
    background: #161b22; border: 1px solid #30363d; border-radius: 12px;
    padding: 16px; margin-bottom: 16px;
  }
  .status-line { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .dot.ok { background: #3fb950; }
  .dot.warn { background: #d29922; }
  .dot.bad { background: #f85149; }
  button {
    font-size: 1rem; padding: 12px 16px; border-radius: 10px; border: none;
    background: #238636; color: white; font-weight: 600; width: 100%;
    margin-top: 8px; cursor: pointer;
  }
  button.secondary { background: #21262d; border: 1px solid #30363d; color: #e6edf3; }
  button:disabled { opacity: 0.5; }
  input {
    width: 100%; padding: 12px; margin-top: 8px; border-radius: 10px;
    border: 1px solid #30363d; background: #0d1117; color: #e6edf3; font-size: 1rem;
  }
  label { font-size: 0.85rem; color: #8b949e; margin-top: 12px; display: block; }
  .network {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 12px; border: 1px solid #30363d; border-radius: 8px;
    margin-top: 8px; cursor: pointer; background: #0d1117;
  }
  .network:active { background: #21262d; }
  .network .ssid { font-weight: 600; }
  .network .meta { font-size: 0.8rem; color: #8b949e; }
  .msg { font-size: 0.9rem; margin-top: 10px; padding: 10px; border-radius: 8px; }
  .msg.info { background: #1c2733; color: #79c0ff; }
  .msg.ok { background: #132e1a; color: #3fb950; }
  .msg.bad { background: #2d1214; color: #f85149; }
  .hidden { display: none; }
</style>
</head>
<body>
  <h1>AcController — WiFi Setup</h1>
  <p class="sub">You're connected to the Pi's fallback hotspot. Pick a network below (or type one in) so it can get back online.</p>

  <div class="card">
    <div class="status-line"><span class="dot warn" id="statusDot"></span><span id="statusText">Checking status…</span></div>
  </div>

  <div class="card">
    <button class="secondary" id="scanBtn" onclick="scan()">Scan for networks</button>
    <div id="networks"></div>
  </div>

  <div class="card">
    <label for="ssid">Network name (SSID)</label>
    <input id="ssid" placeholder="Your WiFi name" autocapitalize="off" autocorrect="off">
    <label for="password">Password</label>
    <input id="password" type="password" placeholder="Leave blank for open networks">
    <button id="connectBtn" onclick="connect()">Connect</button>
    <div id="connectMsg"></div>
  </div>

  <p class="sub" id="hint">
    If this page stops responding right after you tap Connect, that's expected —
    the Pi's WiFi radio switches away from the hotspot while it tries the new
    network. Wait about 30 seconds. If it worked, this hotspot will disappear
    and the Pi will be back on your app as usual. If it didn't, reconnect your
    phone to "AcController-Setup" and reopen this page to try again.
  </p>

<script>
async function getJSON(url, opts) {
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || res.statusText);
  return body;
}

async function refreshStatus() {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  try {
    const s = await getJSON('/api/wifi/status');
    if (!s.ap_mode) {
      dot.className = 'dot ok';
      text.textContent = s.connected_ssid
        ? `Connected to "${s.connected_ssid}" — you're back online, this page is no longer needed.`
        : 'Not in setup mode.';
    } else if (s.error) {
      dot.className = 'dot bad';
      text.textContent = `Setup hotspot active. Last attempt ("${s.attempted_ssid || '?'}") failed: ${s.error}`;
    } else {
      dot.className = 'dot warn';
      text.textContent = `Setup hotspot active (${s.ap_ssid || 'AcController-Setup'}). Pick a network below.`;
    }
  } catch (e) {
    dot.className = 'dot bad';
    text.textContent = 'Could not reach the Pi\\'s status API.';
  }
}

async function scan() {
  const btn = document.getElementById('scanBtn');
  const list = document.getElementById('networks');
  btn.disabled = true;
  btn.textContent = 'Scanning…';
  list.innerHTML = '';
  try {
    const r = await getJSON('/api/wifi/networks');
    if (!r.networks.length) {
      list.innerHTML = '<div class="msg info">No networks found. You can still type one in below.</div>';
    }
    r.networks.forEach(n => {
      const div = document.createElement('div');
      div.className = 'network';
      div.innerHTML = `<span class="ssid">${n.ssid || '(hidden)'}</span><span class="meta">${n.security || 'open'} · ${n.signal}%</span>`;
      div.onclick = () => { document.getElementById('ssid').value = n.ssid; document.getElementById('password').focus(); };
      list.appendChild(div);
    });
  } catch (e) {
    list.innerHTML = `<div class="msg bad">${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Scan for networks';
  }
}

async function connect() {
  const ssid = document.getElementById('ssid').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('connectMsg');
  const btn = document.getElementById('connectBtn');
  if (!ssid) { msg.innerHTML = '<div class="msg bad">Enter a network name first.</div>'; return; }
  btn.disabled = true;
  msg.innerHTML = '<div class="msg info">Sending to the Pi…</div>';
  try {
    await getJSON('/api/wifi/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid, password }),
    });
    msg.innerHTML = '<div class="msg ok">Queued. The Pi is attempting the connection now — see the hint below.</div>';
  } catch (e) {
    msg.innerHTML = `<div class="msg bad">${e.message}</div>`;
    btn.disabled = false;
  }
}

refreshStatus();
setInterval(refreshStatus, 4000);
</script>
</body>
</html>
"""
