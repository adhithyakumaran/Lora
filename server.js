const express = require('express');
const path    = require('path');
const app     = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory store (persists while server is running) ──────
const messages = [];   // newest pushed to end
const MAX = 200;       // keep last 200 messages

// ── POST /api/message  ← ESP32 calls this ──────────────────
// Body: { "text": "Hello", "rssi": -72 }
app.post('/api/message', (req, res) => {
  const { text, rssi } = req.body;

  if (!text) return res.status(400).json({ error: 'text required' });

  const msg = {
    id:    Date.now(),
    text:  String(text).trim(),
    rssi:  Number(rssi) || 0,
    time:  new Date().toLocaleTimeString('en-GB'),
    date:  new Date().toLocaleDateString('en-GB'),
    isSOS: String(text).toUpperCase().startsWith('SOS')
  };

  messages.push(msg);
  if (messages.length > MAX) messages.shift();

  console.log(`[LoRa] "${msg.text}" | RSSI: ${msg.rssi} dBm`);
  res.json({ ok: true, id: msg.id });
});

// ── GET /api/messages  ← dashboard polls this ───────────────
app.get('/api/messages', (req, res) => {
  const total    = messages.length;
  const sosCount = messages.filter(m => m.isSOS).length;
  const avgRssi  = total
    ? Math.round(messages.reduce((s, m) => s + m.rssi, 0) / total)
    : 0;
  const last = messages[total - 1];

  res.json({
    total,
    sosCount,
    avgRssi,
    lastText: last ? last.text : '—',
    lastTime: last ? `${last.date} ${last.time}` : '—',
    messages: [...messages].reverse()   // newest first for dashboard
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LoRa server running on port ${PORT}`));
