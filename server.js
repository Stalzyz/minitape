const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3011;
const BASE_DIR = '/var/www/minitape';
const SHARES_DIR = path.join(BASE_DIR, 'shares');
const INBOX_DIR = path.join(SHARES_DIR, 'inbox');
const INBOX_NAMES_DIR = path.join(SHARES_DIR, 'inbox_names');
const ADMIN_EMAILS = ['stalinkumar18@gmail.com', 'team@grafty.pro'];

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
        fs.writeFile(filepath, JSON.stringify({ name: data.name, code: data.code, email: data.email || '', createdAt: Date.now() }), err => {
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

  // 4. Delete mixtape by code
  else if (req.method === 'DELETE' && req.url.startsWith('/api/mixtape/')) {
    const code = req.url.substring('/api/mixtape/'.length).trim().toUpperCase();
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing code' }));
      return;
    }
    const filepath = path.join(SHARES_DIR, `${code}.json`);
    fs.unlink(filepath, err => {
      if (err && err.code !== 'ENOENT') {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to delete file' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      }
    });
  }

  // 5. Dynamic HTML server-side injection for Social Open Graph (OG) sharing previews
  else if (req.method === 'GET' && req.url.startsWith('/m/')) {
    const parts = req.url.split('/');
    const code = parts[2] ? parts[2].split('?')[0].split('#')[0].trim().toUpperCase() : '';
    if (!code) {
      serveStaticIndex(res);
      return;
    }

    const mixtapePath = path.join(SHARES_DIR, `${code}.json`);
    fs.readFile(mixtapePath, 'utf8', (err, mixtapeData) => {
      if (err) {
        serveStaticIndex(res);
        return;
      }

      try {
        const mixtape = JSON.parse(mixtapeData);
        const indexPath = path.join(BASE_DIR, 'index.html');
        fs.readFile(indexPath, 'utf8', (htmlErr, htmlData) => {
          if (htmlErr) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Template Error');
            return;
          }

          const title = mixtape.title ? `${mixtape.title} - MInitape` : 'Retro Voicemail Mixtape';
          const author = mixtape.author || 'Someone';
          const clipCount = mixtape.clips?.length || 0;
          const desc = `Listen to a custom retro mixtape created by ${author} containing ${clipCount} voice clips!`;

          let modifiedHtml = htmlData
            .replace(/<title>[^<]*<\/title>/g, `<title>${title}</title>`)
            .replace(/<meta property="og:title" content="[^"]*"/g, `<meta property="og:title" content="${title}"`)
            .replace(/<meta property="og:description" content="[^"]*"/g, `<meta property="og:description" content="${desc}"`)
            .replace(/<meta name="twitter:title" content="[^"]*"/g, `<meta name="twitter:title" content="${title}"`)
            .replace(/<meta name="twitter:description" content="[^"]*"/g, `<meta name="twitter:description" content="${desc}"`);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(modifiedHtml);
        });
      } catch (e) {
        serveStaticIndex(res);
      }
    });
  }

  // 6. Admin aggregation data
  else if (req.method === 'GET' && req.url === '/api/admin/data') {
    const adminEmail = req.headers['x-admin-email'] || '';
    if (!ADMIN_EMAILS.includes(adminEmail)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized admin access' }));
      return;
    }

    fs.readdir(INBOX_NAMES_DIR, (err, userFiles) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read users' }));
        return;
      }

      const users = [];
      let pendingUsers = userFiles.length;

      const finishAndRespond = () => {
        fs.readdir(SHARES_DIR, (err2, shareFiles) => {
          if (err2) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ users, mixtapes: [] }));
            return;
          }

          const mixtapes = [];
          const jsonFiles = shareFiles.filter(f => f.endsWith('.json'));
          let pendingTapes = jsonFiles.length;

          if (pendingTapes === 0) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ users, mixtapes }));
            return;
          }

          jsonFiles.forEach(file => {
            fs.readFile(path.join(SHARES_DIR, file), 'utf8', (err3, tapeData) => {
              if (!err3 && tapeData) {
                try {
                  const tape = JSON.parse(tapeData);
                  if (tape.clips) {
                    tape.clipCount = tape.clips.length;
                    delete tape.clips;
                  }
                  mixtapes.push(tape);
                } catch (e) {}
              }
              pendingTapes--;
              if (pendingTapes === 0) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ users, mixtapes }));
              }
            });
          });
        });
      };

      if (pendingUsers === 0) {
        finishAndRespond();
        return;
      }

      userFiles.forEach(file => {
        fs.readFile(path.join(INBOX_NAMES_DIR, file), 'utf8', (err3, userData) => {
          if (!err3 && userData) {
            try {
              const u = JSON.parse(userData);
              users.push(u);
            } catch (e) {}
          }
          pendingUsers--;
          if (pendingUsers === 0) {
            finishAndRespond();
          }
        });
      });
    });
  }

  // 7. Admin delete user mapping
  else if (req.method === 'DELETE' && req.url.startsWith('/api/admin/user/')) {
    const adminEmail = req.headers['x-admin-email'] || '';
    if (!ADMIN_EMAILS.includes(adminEmail)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    const code = req.url.substring('/api/admin/user/'.length).trim().toUpperCase();
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing code' }));
      return;
    }
    const filepath = path.join(INBOX_NAMES_DIR, `${code}.json`);
    fs.unlink(filepath, err => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  }

  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

function serveStaticIndex(res) {
  const indexPath = path.join(BASE_DIR, 'index.html');
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    }
  });
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`MInitape storage API server running on port ${PORT}`);
});
