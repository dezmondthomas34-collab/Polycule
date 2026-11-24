'use strict';
/* Polycule frontend — plain JS, talks to the API in server.js. */

const state = {
  token: localStorage.getItem('polycule_token') || null,
  email: localStorage.getItem('polycule_email') || '',
  userId: null,
  styles: [],
  currentChatWith: null,
  matches: []
};

const $ = id => document.getElementById(id);

async function api(path, options) {
  const opts = options || {};
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (state.token) headers.Authorization = 'Bearer ' + state.token;
  const res = await fetch(path, Object.assign({}, opts, { headers }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Request failed: ' + res.status));
  return data;
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2600);
}

function initials(name) {
  return (name || '?').replace(/\(demo.*$/i, '').trim().split(/\s+/)
    .slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------- profile card ---------------- */
function profileCard(p, withActions) {
  const tags = []
    .concat(p.style ? ['<span class="tag style">' + esc(p.style) + '</span>'] : [])
    .concat(p.isDemo ? ['<span class="tag demo">FICTIONAL DEMO</span>'] : [])
    .concat((p.interests || []).map(i => '<span class="tag">' + esc(i) + '</span>'))
    .join('');
  const meta = [p.age ? p.age : null, p.pronouns, p.location].filter(Boolean).map(esc).join(' · ');
  return '<article class="profile-card">' +
    '<div class="avatar' + (p.isCouple ? ' couple' : '') + '">' + esc(initials(p.displayName)) + '</div>' +
    '<h3>' + esc(p.displayName) + '</h3>' +
    '<p class="meta">' + meta + '</p>' +
    '<div>' + tags + '</div>' +
    (p.lookingFor ? '<p><strong>Looking for:</strong> ' + esc(p.lookingFor) + '</p>' : '') +
    (p.bio ? '<p>' + esc(p.bio) + '</p>' : '') +
    (p.boundaries ? '<p><strong>Boundaries &amp; agreements:</strong> ' + esc(p.boundaries) + '</p>' : '') +
    (withActions ?
      '<div class="card-actions">' +
        '<button class="btn btn-pass" data-action="pass" data-id="' + esc(p.id) + '">Pass</button>' +
        '<button class="btn btn-like" data-action="like" data-id="' + esc(p.id) + '">💜 Like</button>' +
        '<span class="spacer"></span>' +
        '<button class="btn btn-danger" data-action="report" data-id="' + esc(p.id) + '">Report</button>' +
        '<button class="btn btn-danger" data-action="block" data-id="' + esc(p.id) + '">Block</button>' +
      '</div>' : '') +
    '</article>';
}

/* ---------------- auth ---------------- */
let authMode = 'login';
function setAuthMode(mode) {
  authMode = mode;
  $('showLogin').classList.toggle('active', mode === 'login');
  $('showSignup').classList.toggle('active', mode === 'signup');
  $('authSubmit').textContent = mode === 'login' ? 'Log in' : 'Sign up';
  $('authError').classList.add('hidden');
}
$('showLogin').addEventListener('click', () => setAuthMode('login'));
$('showSignup').addEventListener('click', () => setAuthMode('signup'));

$('authForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;
  try {
    const data = await api('/api/' + (authMode === 'login' ? 'login' : 'signup'), {
      method: 'POST', body: JSON.stringify({ email, password })
    });
    state.token = data.token;
    state.email = data.email;
    state.userId = data.userId;
    localStorage.setItem('polycule_token', data.token);
    localStorage.setItem('polycule_email', data.email);
    await enterApp();
    toast(authMode === 'login' ? 'Welcome back!' : 'Account created — set up your profile next.');
  } catch (err) {
    const el = $('authError');
    el.textContent = err.message;
    el.classList.remove('hidden');
  }
});

$('logoutBtn').addEventListener('click', async () => {
  try { await api('/api/logout', { method: 'POST', body: '{}' }); } catch (_) {}
  state.token = null; state.userId = null; state.currentChatWith = null;
  localStorage.removeItem('polycule_token');
  localStorage.removeItem('polycule_email');
  $('appView').classList.add('hidden');
  $('sessionBox').classList.add('hidden');
  $('authView').classList.remove('hidden');
});

/* ---------------- app shell ---------------- */
async function enterApp() {
  const me = await api('/api/me');
  state.userId = me.userId;
  state.email = me.email;
  $('authView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  $('sessionBox').classList.remove('hidden');
  $('sessionEmail').textContent = me.email;
  fillProfileForm(me.profile);
  renderPreview(me.profile);
  await loadStyles();
  await loadDiscover();
  await loadMatches();
  if (!me.profile.displayName) showView('profile');
}

function showView(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  $('discoverView').classList.toggle('hidden', name !== 'discover');
  $('matchesView').classList.toggle('hidden', name !== 'matches');
  $('profileView').classList.toggle('hidden', name !== 'profile');
}
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => {
  showView(b.dataset.view);
  if (b.dataset.view === 'matches') loadMatches();
  if (b.dataset.view === 'discover') loadDiscover();
}));

async function loadStyles() {
  if (!state.styles.length) {
    const data = await api('/api/styles');
    state.styles = data.styles;
  }
  const filter = $('styleFilter');
  const current = filter.value;
  filter.innerHTML = '<option value="">All styles</option>' + state.styles.map(s => '<option>' + esc(s) + '</option>').join('');
  filter.value = current;
  $('pStyle').innerHTML = '<option value="">Choose…</option>' + state.styles.map(s => '<option>' + esc(s) + '</option>').join('');
}

/* ---------------- discover ---------------- */
async function loadDiscover() {
  const style = $('styleFilter').value;
  const data = await api('/api/discover' + (style ? '?style=' + encodeURIComponent(style) : ''));
  const grid = $('discoverGrid');
  grid.innerHTML = data.profiles.map(p => profileCard(p, true)).join('');
  $('discoverEmpty').classList.toggle('hidden', data.profiles.length > 0);
}
$('styleFilter').addEventListener('change', loadDiscover);
$('refreshDiscover').addEventListener('click', loadDiscover);

$('discoverGrid').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  try {
    if (action === 'like') {
      const r = await api('/api/like', { method: 'POST', body: JSON.stringify({ profileId: id }) });
      toast(r.match ? "It's a match! 💜 Find them in Matches." : 'Liked.');
      if (r.match) loadMatches();
    } else if (action === 'pass') {
      await api('/api/pass', { method: 'POST', body: JSON.stringify({ profileId: id }) });
    } else if (action === 'block') {
      if (!confirm('Block this profile? They will disappear from your feed and matches.')) return;
      await api('/api/block', { method: 'POST', body: JSON.stringify({ profileId: id }) });
      toast('Blocked.');
      loadMatches();
    } else if (action === 'report') {
      const reason = prompt('Report this profile? Tell us briefly why (they will be hidden from your feed):') || '';
      await api('/api/report', { method: 'POST', body: JSON.stringify({ profileId: id, reason }) });
      toast('Reported — thanks for keeping the community safe.');
    }
    loadDiscover();
  } catch (err) { toast(err.message); }
});

/* ---------------- matches & messages ---------------- */
async function loadMatches() {
  const data = await api('/api/matches');
  state.matches = data.matches;
  const badge = $('matchCount');
  badge.textContent = data.matches.length;
  badge.classList.toggle('hidden', data.matches.length === 0);
  $('matchesEmpty').classList.toggle('hidden', data.matches.length > 0);
  $('matchList').innerHTML = data.matches.map(p =>
    '<button class="match-item' + (state.currentChatWith === p.id ? ' selected' : '') + '" data-id="' + esc(p.id) + '">' +
      '<span class="avatar' + (p.isCouple ? ' couple' : '') + '">' + esc(initials(p.displayName)) + '</span>' +
      '<span>' + esc(p.displayName) + (p.isDemo ? ' <span class="tag demo">DEMO</span>' : '') + '<br><span class="muted">' + esc(p.style || '') + '</span></span>' +
    '</button>').join('');
  document.querySelectorAll('.match-item').forEach(el => el.addEventListener('click', () => openChat(el.dataset.id)));
}

async function openChat(profileId) {
  state.currentChatWith = profileId;
  const match = state.matches.find(m => m.id === profileId);
  $('chatTitle').textContent = 'Messages — ' + (match ? match.displayName : '');
  $('chatForm').classList.remove('hidden');
  await loadMatches();
  await loadThread();
}

async function loadThread() {
  if (!state.currentChatWith) return;
  const data = await api('/api/messages?with=' + encodeURIComponent(state.currentChatWith));
  const log = $('chatLog');
  if (!data.messages.length) {
    log.innerHTML = '<p class="muted">No messages yet — say hi!</p>';
    return;
  }
  log.innerHTML = data.messages.map(m =>
    '<div class="bubble ' + (m.from === state.userId ? 'mine' : 'theirs') + '">' + esc(m.text) + '</div>').join('');
  log.scrollTop = log.scrollHeight;
}

$('chatForm').addEventListener('submit', async e => {
  e.preventDefault();
  const text = $('chatInput').value.trim();
  if (!text || !state.currentChatWith) return;
  try {
    await api('/api/messages', { method: 'POST', body: JSON.stringify({ to: state.currentChatWith, text }) });
    $('chatInput').value = '';
    await loadThread();
  } catch (err) { toast(err.message); }
});

/* ---------------- my profile ---------------- */
function fillProfileForm(p) {
  $('pDisplayName').value = p.displayName || '';
  $('pAge').value = p.age || '';
  $('pPronouns').value = p.pronouns || '';
  $('pLocation').value = p.location || '';
  $('pLookingFor').value = p.lookingFor || '';
  $('pBio').value = p.bio || '';
  $('pBoundaries').value = p.boundaries || '';
  $('pInterests').value = (p.interests || []).join(', ');
  if (p.style) $('pStyle').value = p.style;
}

function renderPreview(p) {
  $('profilePreview').innerHTML = p.displayName
    ? profileCard(Object.assign({ id: state.userId }, p), false)
    : '<p class="muted">Fill in and save your profile to preview it.</p>';
}

$('profileForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('profileError').classList.add('hidden');
  $('profileSaved').classList.add('hidden');
  const payload = {
    displayName: $('pDisplayName').value.trim(),
    age: $('pAge').value ? Number($('pAge').value) : null,
    pronouns: $('pPronouns').value.trim(),
    location: $('pLocation').value.trim(),
    style: $('pStyle').value,
    lookingFor: $('pLookingFor').value.trim(),
    bio: $('pBio').value.trim(),
    boundaries: $('pBoundaries').value.trim(),
    interests: $('pInterests').value
  };
  try {
    const data = await api('/api/profile', { method: 'PUT', body: JSON.stringify(payload) });
    renderPreview(data.profile);
    $('profileSaved').classList.remove('hidden');
    toast('Profile saved.');
  } catch (err) {
    const el = $('profileError');
    el.textContent = err.message;
    el.classList.remove('hidden');
  }
});

/* ---------------- boot ---------------- */
(async function boot() {
  if (state.token) {
    try { await enterApp(); return; } catch (_) {
      localStorage.removeItem('polycule_token');
      state.token = null;
    }
  }
  $('authView').classList.remove('hidden');
})();
