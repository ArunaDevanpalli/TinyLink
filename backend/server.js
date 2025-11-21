// server.js
require('dotenv').config();
const express = require('express');
const pool = require('./db');
const cors = require('cors');
const validUrl = require('valid-url');

const app = express();
app.use(cors());
app.use(express.json());

const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;

app.get("/", (req, res) => {
  res.send("TinyLink Backend Running");
});


// Healthcheck
app.get('/healthz', (req, res) => {
  res.json({ ok: true, version: '1.0' });
});

// POST /api/links - create a link
// body: { url: string, code?: string }
app.post('/api/links', async (req, res) => {
  const { url, code } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }
  if (!validUrl.isWebUri(url)) {
    return res.status(400).json({ error: 'invalid url; must be absolute (http/https)' });
  }

  let finalCode = code;
  if (finalCode) {
    if (!CODE_REGEX.test(finalCode)) {
      return res.status(400).json({ error: 'code must match [A-Za-z0-9]{6,8}' });
    }
  } else {
    // generator: 7-char base36 (letters+numbers)
    const gen = () => Math.random().toString(36).replace(/[^A-Za-z0-9]/g, '').substring(2, 9);
    let attempts = 0;
    do {
      finalCode = gen();
      attempts++;
    } while (!CODE_REGEX.test(finalCode) && attempts < 10);

    if (!CODE_REGEX.test(finalCode)) {
      return res.status(500).json({ error: 'could not generate code' });
    }
  }

  try {
    const sql = 'INSERT INTO links (code, url) VALUES (?, ?)';
    await pool.execute(sql, [finalCode, url]);
    const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    return res.status(201).json({ code: finalCode, shortUrl: `${base}/${finalCode}`, url, clicks: 0 });
  } catch (err) {
    // Duplicate entry -> ER_DUP_ENTRY
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'code already exists' });
    }
    console.error('create error', err);
    return res.status(500).json({ error: 'internal_server_error' });
  }
});

// GET /api/links - list all links
app.get('/api/links', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT code, url, clicks, last_clicked, created_at FROM links ORDER BY created_at DESC');
    return res.json(rows);
  } catch (err) {
    console.error('list error', err);
    return res.status(500).json({ error: 'internal_server_error' });
  }
});

// GET /api/links/:code - single link stats
app.get('/api/links/:code', async (req, res) => {
  const { code } = req.params;
  if (!CODE_REGEX.test(code)) return res.status(400).json({ error: 'invalid code format' });
  try {
    const [rows] = await pool.execute('SELECT code, url, clicks, last_clicked, created_at FROM links WHERE code = ?', [code]);
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('single fetch error', err);
    return res.status(500).json({ error: 'internal_server_error' });
  }
});

// DELETE /api/links/:code - delete a link
app.delete('/api/links/:code', async (req, res) => {
  const { code } = req.params;
  if (!CODE_REGEX.test(code)) return res.status(400).json({ error: 'invalid code format' });
  try {
    const [result] = await pool.execute('DELETE FROM links WHERE code = ?', [code]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  } catch (err) {
    console.error('delete error', err);
    return res.status(500).json({ error: 'internal_server_error' });
  }
});

// Redirect route GET /:code  -> 302 redirect
// Skip reserved names (api, healthz, code)
app.get('/:code', async (req, res, next) => {
  const { code } = req.params;
  if (['api', 'healthz', 'code'].includes(code)) return next();
  if (!CODE_REGEX.test(code)) return res.status(404).send('Not found');

  // Use a connection and transaction to safely update clicks
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute('SELECT url FROM links WHERE code = ? FOR UPDATE', [code]);
    if (rows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).send('Not found');
    }

    const url = rows[0].url;
    await conn.execute('UPDATE links SET clicks = clicks + 1, last_clicked = CURRENT_TIMESTAMP WHERE code = ?', [code]);
    await conn.commit();
    conn.release();

    return res.redirect(302, url);
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('redirect error', err);
    return res.status(500).send('internal_server_error');
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
