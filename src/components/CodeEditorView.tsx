import { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { t } from '@/lib/i18n';
import type { Language, Project } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useProjectFiles, languageFromPath } from '@/lib/collab';
import { copyToClipboard } from '@/lib/utils';

interface Props {
  project: Project;
  lang: Language;
}

const WEB_EXTENSIONS = ['html', 'css', 'js'];

export function CodeEditorView({ project, lang }: Props) {
  const { user, profile, isAdmin, isBanned } = useAuth();
  const { files, loading, collaborators, savingIds, editFile, addFile, deleteFile, setActivePath } =
    useProjectFiles(project.id, profile);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddFile, setShowAddFile] = useState(false);
  const [addFileError, setAddFileError] = useState<string | null>(null);
  const [showSandbox, setShowSandbox] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && files.length && !activeId) {
      setActiveId(files[0].id);
    }
  }, [loading, files, activeId]);

  const activeFile = files.find((f) => f.id === activeId) || null;

  useEffect(() => {
    setActivePath(activeFile?.path || null);
  }, [activeFile?.path, setActivePath]);

  const canEdit = !!user && !isBanned;

  const hasWebFiles = useMemo(
    () => files.some((f) => WEB_EXTENSIONS.includes(f.path.split('.').pop()?.toLowerCase() || '')),
    [files],
  );

  async function handleCopy() {
    if (!activeFile) return;
    await copyToClipboard(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete(fileId: string) {
    if (!confirm(t('confirm_delete', lang))) return;
    await deleteFile(fileId);
    if (activeId === fileId) setActiveId(files.find((f) => f.id !== fileId)?.id || null);
  }

  if (loading) {
    return <div className="admin-empty"><i className="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>;
  }

  return (
    <div className="editor-view">
      <div className="editor-sidebar">
        <div className="editor-sidebar-header">
          <h4>{t('code_files', lang)}</h4>
          {canEdit && (
            <button
              className="editor-icon-btn"
              title={t('add_file', lang)}
              onClick={() => {
                setAddFileError(null);
                setShowAddFile(true);
              }}
            >
              <i className="fa-solid fa-plus"></i>
            </button>
          )}
        </div>
        <ul className="file-list">
          {files.map((f) => (
            <li
              key={f.id}
              className={`file-item ${activeId === f.id ? 'active' : ''}`}
              onClick={() => setActiveId(f.id)}
            >
              <i className="fa-regular fa-file-code"></i>
              <span className="file-item-path">{f.path}</span>
              {savingIds.has(f.id) && <i className="fa-solid fa-circle-notch fa-spin file-item-saving"></i>}
              {isAdmin && (
                <button
                  className="file-item-delete"
                  onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                  title={t('delete', lang)}
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              )}
            </li>
          ))}
        </ul>

        {collaborators.length > 0 && (
          <div className="editor-collaborators">
            <span className="editor-collaborators-label">{t('live_collaborators', lang)}</span>
            <div className="editor-collaborators-list">
              {collaborators.map((c) => (
                <div key={c.user_id} className="editor-collaborator" title={`${c.display_name}${c.active_path ? ' · ' + c.active_path : ''}`}>
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="user-avatar-fallback">{c.display_name?.charAt(0) || '?'}</span>
                  )}
                  <span className="editor-collaborator-dot" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="editor-main">
        <div className="editor-toolbar">
          <span className="editor-toolbar-path">
            {activeFile ? (
              <><i className="fa-regular fa-file-code"></i> {activeFile.path}</>
            ) : (
              <span className="text-muted">{t('empty_title', lang)}</span>
            )}
          </span>
          <div className="editor-toolbar-actions">
            {activeFile && savingIds.has(activeFile.id) && (
              <span className="editor-save-status saving"><i className="fa-solid fa-circle-notch fa-spin"></i> {t('saving', lang)}</span>
            )}
            {activeFile && !savingIds.has(activeFile.id) && (
              <span className="editor-save-status saved"><i className="fa-solid fa-check"></i> {t('save_saved', lang)}</span>
            )}
            <button className="action-btn" onClick={handleCopy} disabled={!activeFile}>
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i> {copied ? t('copied', lang) : t('copy', lang)}
            </button>
            {hasWebFiles && (
              <button className="action-btn primary" onClick={() => setShowSandbox(true)}>
                <i className="fa-solid fa-play"></i> {t('run_preview', lang)}
              </button>
            )}
          </div>
        </div>

        <div className="editor-monaco-wrap">
          {!canEdit && (
            <div className="editor-readonly-banner">
              <i className="fa-solid fa-eye"></i> {t('editor_readonly_notice', lang)}
            </div>
          )}
          {activeFile && (
            <Editor
              key={activeFile.id}
              height="560px"
              language={languageFromPath(activeFile.path)}
              value={activeFile.content}
              theme="vs-dark"
              options={{
                readOnly: !canEdit,
                fontSize: 13.5,
                minimap: { enabled: true },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 12 },
              }}
              onChange={(value) => {
                if (canEdit && activeFile) editFile(activeFile.id, value ?? '');
              }}
            />
          )}
        </div>
      </div>

      {showAddFile && (
        <AddFileModal
          lang={lang}
          error={addFileError}
          onClose={() => {
            setAddFileError(null);
            setShowAddFile(false);
          }}
          onCreate={async (path, language) => {
            setAddFileError(null);
            try {
              const created = await addFile(project.id, path, '', language);
              setActiveId(created.id);
              setShowAddFile(false);
            } catch (err) {
              const message =
                err instanceof Error && err.message === 'duplicate_path'
                  ? t('duplicate_path', lang)
                  : t('error_generic', lang);
              setAddFileError(message);
            }
          }}
        />
      )}

      {showSandbox && (
        <SandboxModal
          lang={lang}
          files={files}
          onClose={() => setShowSandbox(false)}
        />
      )}
    </div>
  );
}

function AddFileModal({
  lang,
  error,
  onClose,
  onCreate,
}: {
  lang: Language;
  error: string | null;
  onClose: () => void;
  onCreate: (path: string, language: string) => void;
}) {
  const [path, setPath] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3><i className="fa-solid fa-file-circle-plus"></i> {t('add_file', lang)}</h3>
        <input
          autoFocus
          className="modal-input"
          placeholder={t('file_path_placeholder', lang)}
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && path.trim()) onCreate(path.trim(), languageFromPath(path.trim()));
          }}
        />
        {error && (
          <p className="error-banner" style={{ marginTop: 8 }}>
            <i className="fa-solid fa-circle-exclamation"></i> {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="action-btn" onClick={onClose}>{t('back', lang)}</button>
          <button
            className="action-btn primary"
            disabled={!path.trim()}
            onClick={() => onCreate(path.trim(), languageFromPath(path.trim()))}
          >
            <i className="fa-solid fa-plus"></i> {t('add_file', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

function SandboxModal({ lang, files, onClose }: { lang: Language; files: { path: string; content: string }[]; onClose: () => void }) {
  const srcDoc = useMemo(() => {
    const html = files.find((f) => f.path.toLowerCase().endsWith('.html'));
    const css = files.filter((f) => f.path.toLowerCase().endsWith('.css')).map((f) => f.content).join('\n');
    const js = files.filter((f) => f.path.toLowerCase().endsWith('.js')).map((f) => f.content).join('\n');

    if (html) {
      let doc = html.content;
      if (!doc.includes('<style>') && css) doc = doc.replace('</head>', `<style>${css}</style></head>`);
      if (!doc.includes(js) && js) doc = doc.replace('</body>', `<script>${js}<\/script></body>`);
      return doc;
    }
    return `<!DOCTYPE html><html><head><style>${css}</style></head><body><script>${js}<\/script></body></html>`;
  }, [files]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card-header">
          <h3><i className="fa-solid fa-flask"></i> {t('sandbox_preview', lang)}</h3>
          <button className="editor-icon-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <p className="sandbox-note">{t('sandbox_unsupported', lang)}</p>
        <iframe
          className="sandbox-frame"
          title="sandbox-preview"
          sandbox="allow-scripts allow-forms allow-modals allow-popups"
          srcDoc={srcDoc}
        />
      </div>
    </div>
  );
}
