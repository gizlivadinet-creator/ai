import { useEffect, useState } from 'react';
import { supabase, fetchAllRows } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import type { Language, Profile, Comment, Project, SiteSetting, AuditLogEntry } from '@/lib/types';

type Tab = 'users' | 'comments' | 'projects' | 'settings' | 'audit';

export function AdminView({ lang }: { lang: Language }) {
  const { isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('users');

  if (authLoading) {
    return (
      <div className="loading-center">
        <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="empty-state">
        <i className="fa-solid fa-lock fa-3x"></i>
        <h3>{t('no_permission', lang)}</h3>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'users', label: t('admin_users', lang), icon: 'fa-users' },
    { id: 'comments', label: t('admin_comments', lang), icon: 'fa-comments' },
    { id: 'projects', label: t('admin_projects', lang), icon: 'fa-folder-tree' },
    { id: 'settings', label: t('admin_settings', lang), icon: 'fa-gear' },
    { id: 'audit', label: t('admin_audit', lang), icon: 'fa-clipboard-list' },
  ];

  return (
    <div className="admin-view container">
      <div className="admin-header">
        <h1><i className="fa-solid fa-shield-halved"></i> {t('admin_panel', lang)}</h1>
      </div>
      <div className="admin-tabs">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            className={`admin-tab ${tab === tb.id ? 'active' : ''}`}
            onClick={() => setTab(tb.id)}
          >
            <i className={`fa-solid ${tb.icon}`}></i> {tb.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab lang={lang} />}
      {tab === 'comments' && <CommentsTab lang={lang} />}
      {tab === 'projects' && <ProjectsTab lang={lang} />}
      {tab === 'settings' && <SettingsTab lang={lang} />}
      {tab === 'audit' && <AuditTab lang={lang} />}
    </div>
  );
}

function UsersTab({ lang }: { lang: Language }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as Profile[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleBan(u: Profile) {
    if (!u.is_banned && !confirm(t('confirm_ban', lang))) return;
    if (u.is_banned) {
      await supabase.rpc('admin_unban_user', { target_user: u.id });
    } else {
      const reason = prompt(lang === 'tr' ? 'Ban sebebi (opsiyonel):' : 'Ban reason (optional):') || '';
      await supabase.rpc('admin_ban_user', { target_user: u.id, reason });
    }
    load();
  }

  async function toggleRole(u: Profile) {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    await supabase.rpc('admin_set_role', { target_user: u.id, new_role: newRole });
    load();
  }

  if (loading) return <div className="admin-empty"><i className="fa-solid fa-circle-notch fa-spin"></i></div>;
  if (!users.length) return <div className="admin-empty">{t('no_results', lang)}</div>;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>{lang === 'tr' ? 'Kullanıcı' : 'User'}</th>
            <th>{lang === 'tr' ? 'Rol' : 'Role'}</th>
            <th>{lang === 'tr' ? 'Durum' : 'Status'}</th>
            <th>{lang === 'tr' ? 'Katılım' : 'Joined'}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <div className="admin-cell-user">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="user-avatar" alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="user-avatar user-avatar-fallback">{u.display_name?.charAt(0) || '?'}</span>
                  )}
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.display_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                </div>
              </td>
              <td>{u.role === 'admin' ? <span className="badge badge-admin">{t('admin_badge', lang)}</span> : '—'}</td>
              <td>{u.is_banned ? <span className="badge badge-banned">{t('banned_badge', lang)}</span> : '—'}</td>
              <td>{new Date(u.created_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}</td>
              <td>
                <div className="admin-actions">
                  <button className="admin-btn admin-btn-primary" onClick={() => toggleRole(u)}>
                    {u.role === 'admin' ? t('remove_admin', lang) : t('make_admin', lang)}
                  </button>
                  <button className="admin-btn admin-btn-danger" onClick={() => toggleBan(u)}>
                    {u.is_banned ? t('unban', lang) : t('ban', lang)}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommentsTab({ lang }: { lang: Language }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setComments((data as Comment[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm(t('confirm_delete_comment', lang))) return;
    await supabase.from('comments').delete().eq('id', id);
    load();
  }

  if (loading) return <div className="admin-empty"><i className="fa-solid fa-circle-notch fa-spin"></i></div>;
  if (!comments.length) return <div className="admin-empty">{t('no_results', lang)}</div>;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>{lang === 'tr' ? 'Yazan' : 'Author'}</th>
            <th>{lang === 'tr' ? 'İçerik' : 'Content'}</th>
            <th>{lang === 'tr' ? 'Tarih' : 'Date'}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {comments.map((c) => (
            <tr key={c.id}>
              <td>{c.display_name}{c.is_flagged && <span className="badge badge-banned" style={{ marginLeft: 6 }}>⚠</span>}</td>
              <td style={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.content}
              </td>
              <td>{new Date(c.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</td>
              <td>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(c.id)}>
                  {t('delete', lang)}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectsTab({ lang }: { lang: Language }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      // Previously hard-capped at the 200 most recent projects, which made
      // it impossible for an admin to find or clean up duplicates/older
      // records once the table grew past that. Paginate through all of it.
      const { rows, truncated } = await fetchAllRows<Project>((from, to) =>
        supabase.from('projects').select('*').order('created_at', { ascending: false }).range(from, to),
      );
      if (truncated) console.warn('AdminView.ProjectsTab: result set was truncated by the safety ceiling.');
      setProjects(rows);
    } catch (e) {
      console.error('AdminView.ProjectsTab load() failed:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm(t('confirm_delete', lang))) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) console.error('AdminView.ProjectsTab remove() failed:', error.message);
    load();
  }

  if (loading) return <div className="admin-empty"><i className="fa-solid fa-circle-notch fa-spin"></i></div>;
  if (!projects.length) return <div className="admin-empty">{t('no_results', lang)}</div>;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>{lang === 'tr' ? 'Başlık' : 'Title'}</th>
            <th>{t('category', lang)}</th>
            <th>{t('language', lang)}</th>
            <th>{t('created', lang)}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <a href={`#/p/${p.slug}`}>{p.title}</a>
              </td>
              <td>{p.category}</td>
              <td>{p.primary_language}</td>
              <td>{new Date(p.created_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}</td>
              <td>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(p.id)}>
                  {t('delete', lang)}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsTab({ lang }: { lang: Language }) {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('*').order('key');
    setSettings((data as SiteSetting[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function update(key: string, value: unknown) {
    await supabase.from('site_settings').update({ value }).eq('key', key);
    load();
  }

  if (loading) return <div className="admin-empty"><i className="fa-solid fa-circle-notch fa-spin"></i></div>;

  return (
    <div className="admin-settings-grid">
      {settings.map((s) => (
        <div className="admin-setting-row" key={s.key}>
          <span className="admin-setting-label">{s.key.replace(/_/g, ' ')}</span>
          {typeof s.value === 'boolean' ? (
            <button
              className={`admin-toggle ${s.value ? 'on' : ''}`}
              onClick={() => update(s.key, !s.value)}
              aria-label={s.key}
            />
          ) : (
            <input
              defaultValue={typeof s.value === 'string' ? s.value : JSON.stringify(s.value)}
              onBlur={(e) => {
                let v: unknown = e.target.value;
                try { v = JSON.parse(e.target.value); } catch { /* keep raw string */ }
                update(s.key, v);
              }}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', width: 160, textAlign: 'right' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function AuditTab({ lang }: { lang: Language }) {
  const [log, setLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setLog((data as AuditLogEntry[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="admin-empty"><i className="fa-solid fa-circle-notch fa-spin"></i></div>;
  if (!log.length) return <div className="admin-empty">{t('no_results', lang)}</div>;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>{lang === 'tr' ? 'İşlem' : 'Action'}</th>
            <th>{lang === 'tr' ? 'Hedef' : 'Target'}</th>
            <th>{lang === 'tr' ? 'Tarih' : 'Date'}</th>
          </tr>
        </thead>
        <tbody>
          {log.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.action}</td>
              <td>{entry.target_type} · {entry.target_id?.slice(0, 8)}</td>
              <td>{new Date(entry.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
