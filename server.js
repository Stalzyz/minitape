const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3011;
const BASE_DIR = '/var/www/minitape';
const SHARES_DIR = path.join(BASE_DIR, 'shares');
const INBOX_DIR = path.join(SHARES_DIR, 'inbox');
const INBOX_NAMES_DIR = path.join(SHARES_DIR, 'inbox_names');

// Ensure directories exist
[SHARES_DIR, INBOX_DIR, INBOX_NAMES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Save standard mixtape
  if (req.method === 'POST' && req.url === '/api/mixtape') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.code || !data.id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid mixtape format' }));
          return;
        }
        const filepath = path.join(SHARES_DIR, `${data.code}.json`);
        fs.writeFile(filepath, JSON.stringify(data), err => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to save mixtape' }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          }
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }

  // 2. Register/Update user's inbox name mapping
  else if (req.method === 'POST' && req.url === '/api/inbox/register') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body); // { code, name, email }
        if (!data.code || !data.name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing code or name' }));
          return;
        }
        const filepath = path.join(INBOX_NAMES_DIR, `${data.code}.json`);
        fs.writeFile(filepath, JSON.stringify({ name: data.name, code: data.code }), err => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to register inbox' }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          }
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }

  // 3. Send anonymous clip to recipient inbox
  else if (req.method === 'POST' && req.url === '/api/inbox/send') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body); // { recipientCode, clip: { title, audioDataUrl, duration, createdAt } }
        if (!data.recipientCode || !data.clip) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing code or clip' }));
          return;
        }
        const filepath = path.join(INBOX_DIR, `${data.recipientCode}.json`);
        
        // Read existing inbox clips or start empty
        fs.readFile(filepath, 'utf8', (err, fileData) => {
          let inbox = [];
          if (!err && fileData) {
            try {
              inbox = JSON.parse(fileData);
            } catch (e) {}
          }
          
          // Append the anonymous note clip
          inbox.unshift(data.clip);
          
          fs.writeFile(filepath, JSON.stringify(inbox), writeErr => {
            if (writeErr) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to write note' }));
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            }
          });
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }

  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`MInitape storage API server running on port ${PORT}`);
});
