'use strict';
/**
 * Polycule — a starter polyamory dating app.
 * Dependency-free Node.js (built-in http/fs/crypto/path only).
 * Run:  node server.js        (or: npm start)
 * Port: process.env.PORT || 3000
 *
 * NOTE: This is a learning/starter codebase. Passwords are hashed with
 * scrypt + per-user salt and sessions are random tokens, but it is NOT
 * production-hardened. See README.md before even thinking about going public.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

/* ------------------------------------------------------------------ */
/* Demo profiles (fictional — clearly labelled in the UI)              */
/* The first two demo profiles (demo-maya, demo-jordan) always like    */
/* the user back, so matching + messaging are testable out of the box. */
/* ------------------------------------------------------------------ */
const AUTO_LIKE_BACK = new Set(['demo-maya', 'demo-jordan']);

const DEMO_PROFILES = [
  {
    id: 'demo-maya', isDemo: true, isCouple: false,
    displayName: 'Maya (demo)', age: 32, pronouns: 'she/her',
    location: 'Jacksonville, FL', style: 'Kitchen table',
    lookingFor: 'A connection that can grow at its own pace',
    bio: 'Fictional demo profile. Gardener, terrible karaoke singer, great cook. Married to my nesting partner of 6 years; we host Sunday dinners and believe good communication beats jealousy every time.',
    boundaries: 'Partners meet before anything gets serious. Safer-sex agreements are non-negotiable.',
    interests: ['gardening', 'karaoke', 'cooking', 'hiking'],
    cannedReply: 'Hi! Thanks for messaging — tell me what a perfect low-key first date looks like to you?'
  },
  {
    id: 'demo-jordan', isDemo: true, isCouple: false,
    displayName: 'Jordan (demo)', age: 29, pronouns: 'they/them',
    location: 'Jacksonville Beach, FL', style: 'Non-hierarchical',
    lookingFor: 'Friends first, feelings welcome',
    bio: 'Fictional demo profile. Board-game strategist, beach walker, two cats. I date solo and keep my relationships independent and honest.',
    boundaries: 'I don\'t do veto arrangements. I need one solo night a week, no questions asked.',
    interests: ['board games', 'beach walks', 'cats', 'live music'],
    cannedReply: 'Hey! Fair warning, I will absolutely challenge you to a board game on date one.'
  },
  {
    id: 'demo-noor', isDemo: true, isCouple: false,
    displayName: 'Noor (demo)', age: 35, pronouns: 'she/her',
    location: 'Live Oak, FL', style: 'Parallel',
    lookingFor: 'A steady, kind second connection',
    bio: 'Fictional demo profile. Bookworm and stargazer. I prefer parallel poly — my partners know about each other, we\'re friendly, but we keep our time separate.',
    boundaries: 'No surprise group hangouts. Testing every 6 months, results shared.',
    interests: ['reading', 'astronomy', 'baking', 'podcasts'],
    cannedReply: 'Hello! What are you reading right now?'
  },
  {
    id: 'demo-wren', isDemo: true, isCouple: false,
    displayName: 'Wren (demo)', age: 27, pronouns: 'she/they',
    location: 'Gainesville, FL', style: 'Solo poly',
    lookingFor: 'Deep connection, my own apartment',
    bio: 'Fictional demo profile. Solo poly and proud of it — I\'m my own primary. Climber, potter, fiercely affectionate, fiercely independent.',
    boundaries: 'No escalator expectations (no moving in, no merging finances). Everything else is a conversation.',
    interests: ['climbing', 'pottery', 'camping', 'dogs'],
    cannedReply: 'Hi hi! Pottery night or climbing gym — pick your first date.'
  },
  {
    id: 'demo-alex-sam', isDemo: true, isCouple: true,
    displayName: 'Alex & Sam (demo couple)', age: 34, pronouns: 'he/him & she/her',
    location: 'Tallahassee, FL', style: 'Kitchen table',
    lookingFor: 'A third friend for game nights and maybe more',
    bio: 'Fictional demo couple profile. Together 8 years, open for 3. We date separately and together; friendship first, always. Nobody is a "unicorn" here — you\'re a whole person.',
    boundaries: 'We never present a united front in a disagreement. Anyone can pause anything, any time.',
    interests: ['game nights', 'road trips', 'cooking', 'kayaking'],
    cannedReply: 'Hey from both of us! Coffee first is our house rule — when works for you?'
  },
  {
    id: 'demo-river', isDemo: true, isCouple: false,
    displayName: 'River (demo)', age: 41, pronouns: 'he/him',
    location: 'St. Augustine, FL', style: 'Garden party',
    lookingFor: 'Companionship and the occasional adventure',
    bio: 'Fictional demo profile. Divorced, dating again, learning as I go. Garden party style: my partners are friendly acquaintances who enjoy a barbecue together a few times a year.',
    boundaries: 'Slow is fine. Honesty about other partners is not optional.',
    interests: ['fishing', 'bbq', 'history tours', 'photography'],
    cannedReply: 'Evening! I make a mean brisket — what\'s your barbecue order?'
  },
  {
    id: 'demo-ivy-tom', isDemo: true, isCouple: true,
    displayName: 'Ivy & Tom (demo couple)', age: 30, pronouns: 'she/her & he/him',
    location: 'Jacksonville, FL', style: 'Non-hierarchical',
    lookingFor: 'People to share festivals and Sunday markets with',
    bio: 'Fictional demo couple profile. Engaged, non-hierarchical, each of us dates independently too. Big on calendars, bigger on checking in.',
    boundaries: 'Shared calendar for dates. New connections are disclosed within a week, not asked for permission.',
    interests: ['festivals', 'markets', 'cycling', 'thrifting'],
    cannedReply: 'Hi! There\'s a night market this Friday — that\'s our natural habitat.'
  },
  {
    id: 'demo-casey', isDemo: true, isCouple: false,
    displayName: 'Casey (demo)', age: 26, pronouns: 'they/she',
    location: 'Lake City, FL', style: 'Kitchen table',
    lookingFor: 'Chosen family, built slowly',
    bio: 'Fictional demo profile. Kitchen-table dreamer who wants partners who can share a meal and a group chat. Barista, plant parent to 14 plants and counting.',
    boundaries: 'Metamours don\'t have to be friends, but basic warmth matters to me. Ask me anything — I\'d rather talk than guess.',
    interests: ['coffee', 'plants', 'journaling', 'swimming'],
    cannedReply: 'Hey! Important question: how many houseplants is too many? (Trick question.)'
  }
];

const STYLES = ['Kitchen table', 'Parallel', 'Solo poly', 'Non-hierarchical', 'Garden party', 'Hierarchical', 'Relationship anarchy', 'Still figuring it out'];

/* ------------------------------------------------------------------ */
/* Tiny JSON file database                                             */
/* ------------------------------------------------------------------ */
function emptyDb() {
  return {
    users: [],        // {id, email, passwordHash, salt, createdAt, profile:{...}}
    sessions: {},     // token -> userId
    likes: [],        // {from, to, at}
    passes: [],       // {from, to, at}
    messages: [],     // {id, from, to, text, at}
    blocks: [],       // {from, target, at}
    reports: [],      // {from, target, reason, at}
    demoReplied: []   // "userId|demoId" pairs that already got a canned reply
  };
}

function loadDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(raw);
    return Object.assign(emptyDb(), db);
  } catch (_) {
    return emptyDb();
  }
}

function saveDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

if (!fs.existsSync(DB_FILE)) saveDb(emptyDb());
let db = loadDb();

/* ------------------------------------------------------------------ */
/* Auth helpers                                                        */
/* ------------------------------------------------------------------ */
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

function newId(prefix) {
  return prefix + '_' + crypto.randomBytes(8).toString('hex');
}

function authUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !db.sessions[token]) return null;
  return db.users.find(u => u.id === db.sessions[token]) || null;
}

/* ------------------------------------------------------------------ */
/* Profile shaping                                                     */
/* ------------------------------------------------------------------ */
function publicProfile(p, extra) {
  return Object.assign({
    id: p.id,
    isDemo: !!p.isDemo,
    isCouple: !!p.isCouple,
    displayName: p.displayName || '',
    age: p.age || null,
    pronouns: p.pronouns || '',
    location: p.location || '',
    bio: p.bio || '',
    style: p.style || '',
    lookingFor: p.lookingFor || '',
    boundaries: p.boundaries || '',
    interests: Array.isArray(p.interests) ? p.interests : []
  }, extra || {});
}

function userProfile(user) {
  return publicProfile(Object.assign({ id: user.id, isDemo: false }, user.profile));
}

function allProfiles() {
  const demos = DEMO_PROFILES.map(d => publicProfile(d));
  const users = db.users
    .filter(u => u.profile && u.profile.displayName)
    .map(userProfile);
  return demos.concat(users);
}

function findProfile(id) {
  const demo = DEMO_PROFILES.find(d => d.id === id);
  if (demo) return publicProfile(demo);
  const user = db.users.find(u => u.id === id);
  if (user && user.profile) return userProfile(user);
  return null;
}

function isMatch(dbRef, a, b) {
  const ab = dbRef.likes.some(l => l.from === a && l.to === b);
  const ba = dbRef.likes.some(l => l.from === b && l.to === a);
  return ab && ba;
}

/** Demo profiles in AUTO_LIKE_BACK "like back" as soon as the user likes them. */
function ensureDemoLikeBack(userId, profileId) {
  if (AUTO_LIKE_BACK.has(profileId)) {
    if (!db.likes.some(l => l.from === profileId && l.to === userId)) {
      db.likes.push({ from: profileId, to: userId, at: Date.now() });
    }
  }
}

/* ------------------------------------------------------------------ */
/* HTTP plumbing                                                       */
/* ------------------------------------------------------------------ */
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) { reject(new Error('body too large')); req.destroy(); }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function serveStatic(req, res, urlPath) {
  let rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, content) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(content);
  });
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */
async function api(req, res, url) {
  const route = url.pathname;

  /* ---- auth ---- */
  if (route === '/api/signup' && req.method === 'POST') {
    const { email, password } = await readBody(req);
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return sendJson(res, 400, { error: 'Enter a valid email address.' });
    if (!password || String(password).length < 6) return sendJson(res, 400, { error: 'Password must be at least 6 characters.' });
    if (db.users.some(u => u.email === cleanEmail)) return sendJson(res, 409, { error: 'That email already has an account. Try logging in.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const user = {
      id: newId('user'),
      email: cleanEmail,
      salt,
      passwordHash: hashPassword(String(password), salt),
      createdAt: Date.now(),
      profile: {}
    };
    db.users.push(user);
    const token = newToken();
    db.sessions[token] = user.id;
    saveDb(db);
    return sendJson(res, 201, { token, userId: user.id, email: user.email });
  }

  if (route === '/api/login' && req.method === 'POST') {
    const { email, password } = await readBody(req);
    const cleanEmail = String(email || '').trim().toLowerCase();
    const user = db.users.find(u => u.email === cleanEmail);
    if (!user) return sendJson(res, 401, { error: 'No account for that email.' });
    const attempt = hashPassword(String(password || ''), user.salt);
    const ok = crypto.timingSafeEqual(Buffer.from(attempt, 'hex'), Buffer.from(user.passwordHash, 'hex'));
    if (!ok) return sendJson(res, 401, { error: 'Wrong password.' });
    const token = newToken();
    db.sessions[token] = user.id;
    saveDb(db);
    return sendJson(res, 200, { token, userId: user.id, email: user.email });
  }

  if (route === '/api/logout' && req.method === 'POST') {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) delete db.sessions[token];
    saveDb(db);
    return sendJson(res, 200, { ok: true });
  }

  /* everything below requires auth */
  const me = authUser(req);
  if (!me) return sendJson(res, 401, { error: 'Not logged in.' });

  if (route === '/api/me' && req.method === 'GET') {
    return sendJson(res, 200, { userId: me.id, email: me.email, profile: userProfile(me) });
  }

  if (route === '/api/profile' && req.method === 'PUT') {
    const body = await readBody(req);
    const age = body.age === '' || body.age == null ? null : Number(body.age);
    if (age !== null && (!Number.isInteger(age) || age < 18 || age > 120)) {
      return sendJson(res, 400, { error: 'You must be 18 or older to use this app.' });
    }
    const interests = Array.isArray(body.interests)
      ? body.interests.map(String).slice(0, 12)
      : String(body.interests || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 12);
    me.profile = {
      displayName: String(body.displayName || '').slice(0, 60),
      age,
      pronouns: String(body.pronouns || '').slice(0, 40),
      location: String(body.location || '').slice(0, 80),
      bio: String(body.bio || '').slice(0, 1000),
      style: STYLES.includes(body.style) ? body.style : String(body.style || '').slice(0, 40),
      lookingFor: String(body.lookingFor || '').slice(0, 300),
      boundaries: String(body.boundaries || '').slice(0, 600),
      interests
    };
    saveDb(db);
    return sendJson(res, 200, { profile: userProfile(me) });
  }

  if (route === '/api/styles' && req.method === 'GET') {
    return sendJson(res, 200, { styles: STYLES });
  }

  if (route === '/api/discover' && req.method === 'GET') {
    const style = url.searchParams.get('style') || '';
    const blocked = new Set(db.blocks.filter(b => b.from === me.id).map(b => b.target));
    const reported = new Set(db.reports.filter(r => r.from === me.id).map(r => r.target));
    const liked = new Set(db.likes.filter(l => l.from === me.id).map(l => l.to));
    const passed = new Set(db.passes.filter(p => p.from === me.id).map(p => p.to));
    let list = allProfiles().filter(p =>
      p.id !== me.id &&
      !blocked.has(p.id) && !reported.has(p.id) &&
      !liked.has(p.id) && !passed.has(p.id)
    );
    if (style) list = list.filter(p => p.style === style);
    return sendJson(res, 200, { profiles: list });
  }

  if (route === '/api/like' && req.method === 'POST') {
    const { profileId } = await readBody(req);
    const target = findProfile(String(profileId || ''));
    if (!target || target.id === me.id) return sendJson(res, 404, { error: 'Profile not found.' });
    if (!db.likes.some(l => l.from === me.id && l.to === target.id)) {
      db.likes.push({ from: me.id, to: target.id, at: Date.now() });
    }
    ensureDemoLikeBack(me.id, target.id);
    saveDb(db);
    return sendJson(res, 200, { liked: target.id, match: isMatch(db, me.id, target.id) });
  }

  if (route === '/api/pass' && req.method === 'POST') {
    const { profileId } = await readBody(req);
    const target = findProfile(String(profileId || ''));
    if (!target) return sendJson(res, 404, { error: 'Profile not found.' });
    if (!db.passes.some(p => p.from === me.id && p.to === target.id)) {
      db.passes.push({ from: me.id, to: target.id, at: Date.now() });
    }
    saveDb(db);
    return sendJson(res, 200, { passed: target.id });
  }

  if (route === '/api/matches' && req.method === 'GET') {
    const blocked = new Set(db.blocks.filter(b => b.from === me.id).map(b => b.target));
    const matches = db.likes
      .filter(l => l.from === me.id && isMatch(db, me.id, l.to) && !blocked.has(l.to))
      .map(l => findProfile(l.to))
      .filter(Boolean);
    return sendJson(res, 200, { matches });
  }

  if (route === '/api/messages' && req.method === 'GET') {
    const withId = url.searchParams.get('with') || '';
    if (!isMatch(db, me.id, withId)) return sendJson(res, 403, { error: 'You can only message matches.' });
    const thread = db.messages
      .filter(m => (m.from === me.id && m.to === withId) || (m.from === withId && m.to === me.id))
      .sort((a, b) => a.at - b.at);
    return sendJson(res, 200, { messages: thread });
  }

  if (route === '/api/messages' && req.method === 'POST') {
    const { to, text } = await readBody(req);
    const target = findProfile(String(to || ''));
    if (!target) return sendJson(res, 404, { error: 'Profile not found.' });
    if (!isMatch(db, me.id, target.id)) return sendJson(res, 403, { error: 'You can only message matches.' });
    const clean = String(text || '').trim().slice(0, 2000);
    if (!clean) return sendJson(res, 400, { error: 'Message is empty.' });
    const msg = { id: newId('msg'), from: me.id, to: target.id, text: clean, at: Date.now() };
    db.messages.push(msg);
    /* Demo matches send one canned reply, after the user's first message. */
    let reply = null;
    const demo = DEMO_PROFILES.find(d => d.id === target.id);
    const key = me.id + '|' + target.id;
    if (demo && !db.demoReplied.includes(key)) {
      db.demoReplied.push(key);
      reply = { id: newId('msg'), from: target.id, to: me.id, text: demo.cannedReply, at: Date.now() + 1 };
      db.messages.push(reply);
    }
    saveDb(db);
    return sendJson(res, 201, { message: msg, reply });
  }

  if (route === '/api/block' && req.method === 'POST') {
    const { profileId } = await readBody(req);
    const target = findProfile(String(profileId || ''));
    if (!target) return sendJson(res, 404, { error: 'Profile not found.' });
    if (!db.blocks.some(b => b.from === me.id && b.target === target.id)) {
      db.blocks.push({ from: me.id, target: target.id, at: Date.now() });
    }
    saveDb(db);
    return sendJson(res, 200, { blocked: target.id });
  }

  if (route === '/api/report' && req.method === 'POST') {
    const { profileId, reason } = await readBody(req);
    const target = findProfile(String(profileId || ''));
    if (!target) return sendJson(res, 404, { error: 'Profile not found.' });
    db.reports.push({ from: me.id, target: target.id, reason: String(reason || '').slice(0, 300), at: Date.now() });
    /* Reporting also hides the profile for the reporter (same as block list check in /discover). */
    saveDb(db);
    return sendJson(res, 200, { reported: target.id });
  }

  return sendJson(res, 404, { error: 'Unknown API route.' });
}

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return serveStatic(req, res, url.pathname);
  } catch (err) {
    return sendJson(res, 500, { error: 'Server error: ' + err.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Polycule running at http://localhost:${PORT}`);
  });
}

module.exports = server;
