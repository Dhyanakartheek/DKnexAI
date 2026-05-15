/* ── State ─────────────────────────────────────────────────────────────────── */
const state = { token: null, user: null, currentPage: 'dashboard' };
const API = '';

/* ── Helpers ───────────────────────────────────────────────────────────────── */
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { logout(); return null; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  if (res.headers.get('content-type')?.includes('json')) return res.json();
  return res;
}

function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  setTimeout(() => { el.className = 'toast'; }, 3500);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m/60)}h ago`;
  return `${Math.floor(m/1440)}d ago`;
}

function typeBadge(t) {
  const map = { RFP: 'rfp', RFI: 'rfi', JD: 'jd', OTHER: 'other' };
  return `<span class="badge badge-${map[t] || 'other'}">${t}</span>`;
}
function statusBadge(s) {
  const map = {
    'New': 'new', 'In Progress': 'in-progress', 'Submitted': 'submitted',
    'Closed': 'closed', 'Won': 'won', 'Lost': 'lost',
    'Pending': 'pending', 'Approved': 'approved', 'Sent': 'sent', 'Rejected': 'rejected',
    'Done': 'won'
  };
  const cls = map[s] || 'other';
  return `<span class="badge badge-${cls}">${s}</span>`;
}

/* ── Auth ───────────────────────────────────────────────────────────────────── */
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  btn.innerHTML = '<span class="spinner"></span>';
  btn.disabled = true;

  const form = new FormData();
  form.append('username', document.getElementById('login-email').value);
  form.append('password', document.getElementById('login-password').value);

  try {
    const res = await fetch('/api/auth/login', { method: 'POST', body: form });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.detail || 'Login failed');
    }
    const data = await res.json();
    state.token = data.access_token;
    state.user = data.user;
    localStorage.setItem('token', state.token);
    showApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    btn.innerHTML = '<span>Sign In</span><span class="btn-icon">→</span>';
    btn.disabled = false;
  }
});

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  if (state.user) {
    document.getElementById('user-name').textContent = state.user.name;
    document.getElementById('user-role').textContent = state.user.role;
    document.getElementById('user-avatar').textContent = state.user.name[0].toUpperCase();
    applyRoleBasedUI(state.user.role);
  }
  navigateTo('dashboard');
}

function applyRoleBasedUI(role) {
  const isAdmin = role === 'admin';

  // Admin-only nav items
  ['nav-drafts', 'nav-reports', 'nav-users'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? 'flex' : 'none';
  });

  // Admin-only topbar controls
  const pollBtn = document.getElementById('poll-btn');
  if (pollBtn) pollBtn.style.display = isAdmin ? 'inline-flex' : 'none';

  // Role pill colour in sidebar
  const roleEl = document.getElementById('user-role');
  if (roleEl) {
    roleEl.style.color = isAdmin ? 'var(--accent2)' : 'var(--green)';
    roleEl.textContent = isAdmin ? '⚙ Administrator' : '👤 Staff';
  }
}

function logout() {
  state.token = null; state.user = null;
  localStorage.removeItem('token');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

document.getElementById('logout-btn').addEventListener('click', logout);

// Auto-login from stored token
(async () => {
  const saved = localStorage.getItem('token');
  if (!saved) return;
  state.token = saved;
  try {
    const me = await api('/api/auth/me');
    if (me) { state.user = me; showApp(); }
  } catch { localStorage.removeItem('token'); }
})();

/* ── Navigation ─────────────────────────────────────────────────────────────── */
function navigateTo(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');
  document.getElementById('page-title').textContent = {
    dashboard: 'Dashboard', leads: 'Leads', emails: 'Email Log',
    tasks: 'Tasks', drafts: 'Drafts', reports: 'Reports', users: 'User Management'
  }[page] || page;
  loadPage(page);
  // close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); navigateTo(el.dataset.page); });
});
document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

async function loadPage(page) {
  if (page === 'dashboard') await loadDashboard();
  else if (page === 'leads') await loadLeads();
  else if (page === 'emails') await loadEmails();
  else if (page === 'tasks') await loadTasks();
  else if (page === 'drafts') await loadDrafts();
  else if (page === 'users') await loadUsers();
}

/* ── Poll Now ────────────────────────────────────────────────────────────────── */
document.getElementById('poll-btn').addEventListener('click', async () => {
  const btn = document.getElementById('poll-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Polling…';
  try {
    await api('/api/emails/trigger-poll', { method: 'POST' });
    toast('Email poll triggered — check back in a moment', 'success');
    setTimeout(() => loadPage(state.currentPage), 3000);
  } catch (e) { toast(e.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '↻ Poll Now'; }
});

/* ── DASHBOARD ───────────────────────────────────────────────────────────────── */
async function loadDashboard() {
  try {
    const [stats, logs] = await Promise.all([
      api('/api/reports/dashboard'),
      api('/api/reports/activity?limit=30'),
    ]);

    document.getElementById('stat-total-val').textContent = stats.total_leads;
    document.getElementById('stat-rfp-val').textContent = stats.by_type.RFP || 0;
    document.getElementById('stat-rfi-val').textContent = stats.by_type.RFI || 0;
    document.getElementById('stat-jd-val').textContent = stats.by_type.JD || 0;
    document.getElementById('stat-email-val').textContent = stats.emails_processed;
    document.getElementById('stat-draft-val').textContent = stats.pending_drafts;

    // Update badges
    document.getElementById('badge-leads').textContent = stats.total_leads || '';
    document.getElementById('badge-tasks').textContent = stats.pending_tasks || '';
    document.getElementById('badge-drafts').textContent = stats.pending_drafts || '';

    // Status bars
    const statusBars = document.getElementById('status-bars');
    const statuses = stats.by_status;
    const total = stats.total_leads || 1;
    const colors = {
      'New': '#3b82f6', 'In Progress': '#f59e0b', 'Submitted': '#6366f1',
      'Closed': '#64748b', 'Won': '#10b981', 'Lost': '#ef4444'
    };
    statusBars.innerHTML = Object.entries(statuses).map(([s, c]) => `
      <div class="status-bar-item">
        <div class="status-bar-label">${s}</div>
        <div class="status-bar-track">
          <div class="status-bar-fill" style="width:${Math.round(c/total*100)}%;background:${colors[s]||'#6366f1'}"></div>
        </div>
        <div class="status-bar-count">${c}</div>
      </div>
    `).join('');

    // Activity
    const actList = document.getElementById('activity-list');
    if (!logs || !logs.length) {
      actList.innerHTML = '<div class="empty-state">No activity yet</div>';
    } else {
      actList.innerHTML = logs.map(l => `
        <div class="activity-item">
          <div class="activity-dot"></div>
          <div class="activity-detail">
            <div class="activity-action">${l.action} · ${l.entity_type}</div>
            <div>${l.detail || ''}</div>
            <div class="activity-time">${timeAgo(l.created_at)}</div>
          </div>
        </div>
      `).join('');
    }
  } catch (e) { toast('Dashboard error: ' + e.message, 'error'); }
}

/* ── LEADS ───────────────────────────────────────────────────────────────────── */
async function loadLeads() {
  const status = document.getElementById('lead-status-filter').value;
  const type = document.getElementById('lead-type-filter').value;
  const tbody = document.getElementById('leads-tbody');
  tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><span class="spinner"></span></td></tr>`;

  try {
    let url = '/api/leads?limit=200';
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (type) url += `&type=${encodeURIComponent(type)}`;
    const leads = await api(url);

    if (!leads || !leads.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No leads found</td></tr>`;
      return;
    }
    tbody.innerHTML = leads.map(l => `
      <tr>
        <td><code style="font-family:'JetBrains Mono',monospace;font-size:0.8rem">${l.lead_id}</code></td>
        <td>${typeBadge(l.type)}</td>
        <td>${l.client_name || '—'}</td>
        <td>${l.project_name || l.role || '—'}</td>
        <td style="color:var(--text2);font-size:0.8rem">${fmtDate(l.submission_deadline)}</td>
        <td>${statusBadge(l.status)}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="openLeadModal('${l.id}')">Edit</button>
        </td>
      </tr>
    `).join('');
  } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('lead-status-filter').addEventListener('change', loadLeads);
document.getElementById('lead-type-filter').addEventListener('change', loadLeads);

/* ── LEAD MODAL ──────────────────────────────────────────────────────────────── */
let _editLeadId = null;

async function openLeadModal(leadId) {
  _editLeadId = leadId;
  const lead = await api(`/api/leads/${leadId}`);
  if (!lead) return;

  const users = await api('/api/auth/users').catch(() => []);
  const userOpts = users.map(u => `<option value="${u.id}" ${lead.assigned_to === u.id ? 'selected' : ''}>${u.name}</option>`).join('');

  document.getElementById('modal-lead-id').textContent = lead.lead_id;
  document.getElementById('modal-body').innerHTML = `
    <div class="modal-grid">
      <div class="form-group"><label>Client Name</label>
        <input id="m-client" value="${lead.client_name || ''}"/></div>
      <div class="form-group"><label>Project / Role</label>
        <input id="m-project" value="${lead.project_name || lead.role || ''}"/></div>
      <div class="form-group"><label>Skills</label>
        <input id="m-skills" value="${lead.skills || ''}"/></div>
      <div class="form-group"><label>Experience</label>
        <input id="m-exp" value="${lead.experience || ''}"/></div>
      <div class="form-group"><label>Contact Person</label>
        <input id="m-contact" value="${lead.contact_person || ''}"/></div>
      <div class="form-group"><label>Contact Email</label>
        <input id="m-contact-email" value="${lead.contact_email || ''}"/></div>
      <div class="form-group"><label>Deadline</label>
        <input id="m-deadline" type="date" value="${lead.submission_deadline ? lead.submission_deadline.split('T')[0] : ''}"/></div>
      <div class="form-group"><label>Status</label>
        <select id="m-status">
          ${['New','In Progress','Submitted','Closed','Won','Lost'].map(s =>
            `<option value="${s}" ${lead.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="grid-column:span 2"><label>Assigned To</label>
        <select id="m-assigned"><option value="">— Unassigned —</option>${userOpts}</select>
      </div>
    </div>
    <div class="form-group"><label>Notes</label>
      <textarea id="m-notes">${lead.notes || ''}</textarea>
    </div>
  `;
  document.getElementById('lead-modal').style.display = 'flex';
}

document.getElementById('modal-close').addEventListener('click', () => document.getElementById('lead-modal').style.display = 'none');
document.getElementById('modal-close-btn').addEventListener('click', () => document.getElementById('lead-modal').style.display = 'none');
document.getElementById('lead-modal').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.style.display = 'none'; });

document.getElementById('modal-save-btn').addEventListener('click', async () => {
  if (!_editLeadId) return;
  const deadline = document.getElementById('m-deadline').value;
  const data = {
    client_name: document.getElementById('m-client').value || null,
    project_name: document.getElementById('m-project').value || null,
    skills: document.getElementById('m-skills').value || null,
    experience: document.getElementById('m-exp').value || null,
    contact_person: document.getElementById('m-contact').value || null,
    contact_email: document.getElementById('m-contact-email').value || null,
    submission_deadline: deadline ? new Date(deadline).toISOString() : null,
    status: document.getElementById('m-status').value,
    assigned_to: document.getElementById('m-assigned').value || null,
    notes: document.getElementById('m-notes').value || null,
  };
  try {
    await api(`/api/leads/${_editLeadId}`, { method: 'PATCH', body: JSON.stringify(data) });
    toast('Lead updated', 'success');
    document.getElementById('lead-modal').style.display = 'none';
    loadLeads();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── EMAILS ──────────────────────────────────────────────────────────────────── */
async function loadEmails() {
  const tbody = document.getElementById('emails-tbody');
  tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><span class="spinner"></span></td></tr>`;
  try {
    const emails = await api('/api/emails?limit=200');
    if (!emails || !emails.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No emails processed yet</td></tr>`;
      return;
    }
    tbody.innerHTML = emails.map(e => `
      <tr>
        <td style="font-size:0.8rem;color:var(--text2)">${fmtTime(e.received_at)}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.sender || '—'}</td>
        <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.subject || '(no subject)'}</td>
        <td>${typeBadge(e.classification)}</td>
        <td style="font-size:0.78rem;color:var(--text3)">${e.lead_id ? '✓ Lead created' : '—'}</td>
      </tr>
    `).join('');
  } catch (err) { toast(err.message, 'error'); }
}

/* ── TASKS ───────────────────────────────────────────────────────────────────── */
async function loadTasks() {
  try {
    const tasks = await api('/api/tasks');
    const pending = tasks.filter(t => t.status === 'Pending');
    const inProg = tasks.filter(t => t.status === 'In Progress');
    const done = tasks.filter(t => t.status === 'Done');
    renderTaskColumn('tasks-pending', pending);
    renderTaskColumn('tasks-inprogress', inProg);
    renderTaskColumn('tasks-done', done);
  } catch (e) { toast(e.message, 'error'); }
}

function renderTaskColumn(elId, tasks) {
  const el = document.getElementById(elId);
  if (!tasks.length) { el.innerHTML = '<div class="empty-state">None</div>'; return; }
  el.innerHTML = tasks.map(t => `
    <div class="task-card">
      <div class="task-title">${t.title}</div>
      <div class="task-meta">
        ${t.due_date ? `<span>📅 ${fmtDate(t.due_date)}</span>` : ''}
        ${t.description ? `<span style="margin-top:2px">${t.description.slice(0,60)}…</span>` : ''}
      </div>
      <div class="task-actions">
        ${t.status === 'Pending' ? `<button class="btn btn-sm btn-secondary" onclick="updateTaskStatus('${t.id}','In Progress')">▶ Start</button>` : ''}
        ${t.status === 'In Progress' ? `<button class="btn btn-sm btn-success" onclick="updateTaskStatus('${t.id}','Done')">✓ Done</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function updateTaskStatus(taskId, status) {
  try {
    await api(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast(`Task marked as ${status}`, 'success');
    loadTasks();
  } catch (e) { toast(e.message, 'error'); }
}

/* ── DRAFTS ──────────────────────────────────────────────────────────────────── */
async function loadDrafts() {
  const el = document.getElementById('drafts-list');
  el.innerHTML = '<div class="empty-state"><span class="spinner"></span></div>';
  try {
    const drafts = await api('/api/drafts');
    if (!drafts || !drafts.length) { el.innerHTML = '<div class="empty-state">No drafts found</div>'; return; }
    el.innerHTML = drafts.map(d => `
      <div class="draft-card glass-card">
        <div class="draft-header">
          <div>
            <div class="draft-subject">${d.subject}</div>
            <div class="draft-to">To: ${d.to_email} · ${d.draft_type}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${statusBadge(d.status)}
            <span style="font-size:0.75rem;color:var(--text3)">${timeAgo(d.created_at)}</span>
          </div>
        </div>
        <div class="draft-body-preview">${d.body}</div>
        ${d.status === 'Pending' ? `
        <div class="draft-actions">
          <button class="btn btn-sm btn-success" onclick="draftAction('${d.id}','approve')">✓ Approve & Send</button>
          <button class="btn btn-sm btn-danger" onclick="draftAction('${d.id}','reject')">✕ Reject</button>
        </div>` : ''}
      </div>
    `).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function draftAction(draftId, action) {
  try {
    await api(`/api/drafts/${draftId}/action`, { method: 'POST', body: JSON.stringify({ action }) });
    toast(action === 'approve' ? 'Draft approved — sending…' : 'Draft rejected', action === 'approve' ? 'success' : 'info');
    loadDrafts();
  } catch (e) { toast(e.message, 'error'); }
}

// Download report links need auth header — inject token
document.querySelectorAll('#excel-download-btn, #pdf-download-btn').forEach(link => {
  link.addEventListener('click', async e => {
    e.preventDefault();
    const url = link.href;
    try {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${state.token}` } });
      if (!res.ok) { toast('Download failed', 'error'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = url.includes('excel') ? 'lead_report.xlsx' : 'lead_report.pdf';
      a.click();
    } catch (e) { toast(e.message, 'error'); }
  });
});

/* ── USERS (Admin) ───────────────────────────────────────────────────────────── */
async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><span class="spinner"></span></td></tr>`;
  try {
    const users = await api('/api/auth/users');
    if (!users || !users.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No users found</td></tr>`;
      return;
    }
    tbody.innerHTML = users.map(u => {
      const isMe = state.user && u.id === state.user.id;
      const roleBadge = u.role === 'admin'
        ? `<span class="badge badge-rfp">Admin</span>`
        : `<span class="badge badge-jd">Staff</span>`;
      const statusBadgeEl = u.is_active
        ? `<span class="badge badge-approved">Active</span>`
        : `<span class="badge badge-rejected">Inactive</span>`;
      return `
        <tr>
          <td style="font-weight:600">${u.name}${isMe ? ' <span style="color:var(--text3);font-size:0.72rem">(you)</span>' : ''}</td>
          <td style="color:var(--text2);font-size:0.82rem">${u.email}</td>
          <td>${roleBadge}</td>
          <td style="color:var(--text2);font-size:0.8rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${u.skills || '<span style="color:var(--text3)">—</span>'}
          </td>
          <td>${statusBadgeEl}</td>
          <td style="display:flex;gap:6px;flex-wrap:wrap">
            ${u.role !== 'admin' && !isMe ? `
              <button class="btn btn-sm btn-secondary"
                onclick="toggleUserRole('${u.id}','${u.role}')"
                title="Toggle admin/staff">
                ${u.role === 'admin' ? '↓ Make Staff' : '↑ Make Admin'}
              </button>` : ''}
            ${!isMe && u.is_active ? `
              <button class="btn btn-sm btn-danger"
                onclick="deactivateUser('${u.id}','${u.name}')">
                Deactivate
              </button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function toggleUserRole(userId, currentRole) {
  const newRole = currentRole === 'admin' ? 'staff' : 'admin';
  try {
    await api(`/api/auth/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole }),
    });
    toast(`Role updated to ${newRole}`, 'success');
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
}

async function deactivateUser(userId, name) {
  if (!confirm(`Deactivate ${name}? They will lose access.`)) return;
  try {
    await api(`/api/auth/users/${userId}`, { method: 'DELETE' });
    toast(`${name} deactivated`, 'info');
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
}

// Add User panel toggle
document.getElementById('toggle-add-user-btn')?.addEventListener('click', () => {
  const panel = document.getElementById('add-user-panel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('nu-cancel')?.addEventListener('click', () => {
  const panel = document.getElementById('add-user-panel');
  if (panel) panel.style.display = 'none';
});

document.getElementById('nu-submit')?.addEventListener('click', async () => {
  const errEl = document.getElementById('nu-error');
  errEl.style.display = 'none';
  const name = document.getElementById('nu-name').value.trim();
  const email = document.getElementById('nu-email').value.trim();
  const password = document.getElementById('nu-password').value;
  const role = document.getElementById('nu-role').value;
  const skills = document.getElementById('nu-skills').value.trim();

  if (!name || !email || !password) {
    errEl.textContent = 'Name, email and password are required.';
    errEl.style.display = 'block';
    return;
  }
  const btn = document.getElementById('nu-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, skills: skills || null }),
    });
    toast(`User ${name} created successfully`, 'success');
    // Reset form
    ['nu-name','nu-email','nu-password','nu-skills'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('nu-role').value = 'staff';
    document.getElementById('add-user-panel').style.display = 'none';
    loadUsers();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Create User';
  }
});
