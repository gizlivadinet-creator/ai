import { useMemo, useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import type { Language, Comment } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import {
  useComments,
  renderCommentHtml,
  detectEmbed,
  platformIcon,
  postComment,
  uploadCommentImage,
} from '@/lib/comments';
import { supabase } from '@/lib/supabase';
import { formatDate, formatTime } from '@/lib/utils';

interface Props {
  projectId: string;
  lang: Language;
}

export function CommentSection({ projectId, lang }: Props) {
  const { comments, loading } = useComments(projectId);
  const { user, profile, isAdmin, isBanned, signIn } = useAuth();

  const roots = useMemo(() => comments.filter((c) => !c.parent_id), [comments]);
  const repliesFor = (id: string) => comments.filter((c) => c.parent_id === id);

  async function handleDelete(id: string) {
    if (!confirm(t('confirm_delete_comment', lang))) return;
    await supabase.from('comments').delete().eq('id', id);
  }

  return (
    <div className="comments-section">
      <h3 className="comments-title">
        <i className="fa-solid fa-comments"></i> {t('comments', lang)} ({comments.length})
      </h3>

      {user && profile && !isBanned && (
        <Composer projectId={projectId} profile={profile} lang={lang} parentId={null} />
      )}
      {!user && (
        <div className="comment-login-gate">
          <i className="fa-brands fa-google"></i>
          <span>{t('login_required_comment', lang)}</span>
          <button className="btn-generate" onClick={() => signIn()}>{t('sign_in_google', lang)}</button>
        </div>
      )}
      {isBanned && (
        <div className="comment-login-gate comment-login-gate-banned">
          <i className="fa-solid fa-ban"></i>
          <span>{t('banned_notice', lang)}</span>
        </div>
      )}

      {loading ? (
        <div className="admin-empty"><i className="fa-solid fa-circle-notch fa-spin"></i></div>
      ) : roots.length === 0 ? (
        <div className="admin-empty">{t('no_comments_yet', lang)}</div>
      ) : (
        <div className="comment-list">
          {roots.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              replies={repliesFor(c.id)}
              lang={lang}
              projectId={projectId}
              isAdmin={isAdmin}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  replies,
  lang,
  projectId,
  isAdmin,
  onDelete,
}: {
  comment: Comment;
  replies: Comment[];
  lang: Language;
  projectId: string;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}) {
  const { user, profile, isBanned } = useAuth();
  const [replying, setReplying] = useState(false);

  return (
    <div className="comment-item">
      <CommentBody comment={comment} lang={lang} isAdmin={isAdmin} onDelete={onDelete} />
      <div className="comment-actions">
        {user && !isBanned && (
          <button className="comment-action-btn" onClick={() => setReplying((v) => !v)}>
            <i className="fa-solid fa-reply"></i> {t('reply', lang)}
          </button>
        )}
      </div>
      {replying && profile && (
        <div className="comment-reply-composer">
          <Composer
            projectId={projectId}
            profile={profile}
            lang={lang}
            parentId={comment.id}
            onDone={() => setReplying(false)}
          />
        </div>
      )}
      {replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((r) => (
            <CommentBody key={r.id} comment={r} lang={lang} isAdmin={isAdmin} onDelete={onDelete} nested />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentBody({
  comment,
  lang,
  isAdmin,
  onDelete,
  nested,
}: {
  comment: Comment;
  lang: Language;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  nested?: boolean;
}) {
  const html = useMemo(() => renderCommentHtml(comment.content), [comment.content]);

  return (
    <div className={`comment-body ${nested ? 'nested' : ''}`}>
      {comment.avatar_url ? (
        <img src={comment.avatar_url} alt="" className="user-avatar" referrerPolicy="no-referrer" />
      ) : (
        <span className="user-avatar user-avatar-fallback">{comment.display_name?.charAt(0) || '?'}</span>
      )}
      <div className="comment-content">
        <div className="comment-meta">
          <span className="comment-author">{comment.display_name}</span>
          <span className="comment-date">
            {formatDate(comment.created_at, lang)} · {formatTime(comment.created_at, lang)}
          </span>
          {isAdmin && (
            <button
              className="comment-admin-delete"
              title={t('admin_delete_comment', lang)}
              onClick={() => onDelete(comment.id)}
            >
              <i className="fa-solid fa-trash"></i>
            </button>
          )}
        </div>
        <div className="comment-text" dangerouslySetInnerHTML={{ __html: html }} />
        {comment.media?.length > 0 && (
          <div className="comment-media-grid">
            {comment.media.map((m, i) =>
              m.type === 'image' ? (
                <img key={i} src={m.url} alt="" className="comment-media-image" loading="lazy" />
              ) : m.type === 'embed' ? (
                <EmbedFrame key={i} url={m.url} />
              ) : null,
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmbedFrame({ url }: { url: string }) {
  const info = detectEmbed(url);
  if (!info) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="comment-embed-fallback">
        <i className="fa-solid fa-link"></i> {url}
      </a>
    );
  }
  return (
    <div className="comment-embed-wrap">
      <div className="comment-embed-badge"><i className={platformIcon(info.platform)}></i> {info.platform}</div>
      <iframe
        src={info.embedUrl}
        className="comment-embed-frame"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        title="embedded-media"
      />
    </div>
  );
}

function Composer({
  projectId,
  profile,
  lang,
  parentId,
  onDone,
}: {
  projectId: string;
  profile: NonNullable<ReturnType<typeof useAuth>['profile']>;
  lang: Language;
  parentId: string | null;
  onDone?: () => void;
}) {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<Comment['media']>([]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyFormat(prefix: string, suffix: string = prefix) {
    setContent((c) => `${c}${prefix}metin${suffix}`);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadCommentImage(file, profile.id);
      setMedia((m) => [...m, { type: 'image', url }]);
    } catch {
      setError('error_generic');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function addMediaUrl() {
    if (!mediaUrl.trim()) return;
    const embed = detectEmbed(mediaUrl.trim());
    setMedia((m) => [...m, { type: embed ? 'embed' : 'image', url: mediaUrl.trim() }]);
    setMediaUrl('');
    setShowUrlInput(false);
  }

  async function handleSubmit() {
    if (!content.trim() && media.length === 0) return;
    setPosting(true);
    setError(null);
    const { error: postError } = await postComment(projectId, profile, content, media, parentId);
    setPosting(false);
    if (postError) {
      setError(postError);
      return;
    }
    setContent('');
    setMedia([]);
    onDone?.();
  }

  return (
    <div className="comment-composer">
      <div className="comment-composer-toolbar">
        <button type="button" title="Bold" onClick={() => applyFormat('**')}><i className="fa-solid fa-bold"></i></button>
        <button type="button" title="Italic" onClick={() => applyFormat('_')}><i className="fa-solid fa-italic"></i></button>
        <button type="button" title="Link" onClick={() => setContent((c) => `${c}[metin](https://)`)}><i className="fa-solid fa-link"></i></button>
        <button type="button" title={t('add_image', lang)} onClick={() => fileInputRef.current?.click()}>
          <i className="fa-solid fa-image"></i>
        </button>
        <button type="button" title={t('add_media_url', lang)} onClick={() => setShowUrlInput((v) => !v)}>
          <i className="fa-solid fa-photo-film"></i>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />
      </div>

      {showUrlInput && (
        <div className="comment-media-url-row">
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder={t('media_url_placeholder', lang)}
            onKeyDown={(e) => e.key === 'Enter' && addMediaUrl()}
          />
          <button className="action-btn primary" onClick={addMediaUrl}>{t('add', lang)}</button>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('comment_placeholder', lang)}
        rows={3}
      />

      {uploading && <div className="comment-uploading"><i className="fa-solid fa-circle-notch fa-spin"></i> {t('uploading', lang)}</div>}

      {media.length > 0 && (
        <div className="comment-media-preview">
          {media.map((m, i) => (
            <div key={i} className="comment-media-preview-item">
              {m.type === 'image' ? <img src={m.url} alt="" /> : <i className="fa-solid fa-photo-film"></i>}
              <button onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <div className="error-banner">{t(error, lang)}</div>}

      <div className="comment-composer-footer">
        {onDone && (
          <button className="action-btn" onClick={onDone}>{t('cancel', lang)}</button>
        )}
        <button
          className="action-btn primary"
          onClick={handleSubmit}
          disabled={posting || (!content.trim() && media.length === 0)}
        >
          {posting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
          {t('post_comment', lang)}
        </button>
      </div>
    </div>
  );
}
