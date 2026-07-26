import { useCallback, useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { supabase } from '@/lib/supabase';
import type { Comment, Profile } from '@/lib/types';

marked.setOptions({ breaks: true, gfm: true });

/** Renders user-authored comment markdown to sanitized, safe HTML. */
export function renderCommentHtml(raw: string): string {
  const html = marked.parse(raw, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt'],
  });
}

export interface EmbedInfo {
  platform: 'youtube' | 'vimeo' | 'dailymotion' | 'tiktok' | 'facebook' | 'instagram';
  embedUrl: string;
}

/** Detects a supported video/social URL and returns a safe iframe embed target. */
export function detectEmbed(url: string): EmbedInfo | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v');
      if (id) return { platform: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` };
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return { platform: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` };
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id) return { platform: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` };
    }
    if (host === 'dailymotion.com') {
      const match = u.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
      if (match) return { platform: 'dailymotion', embedUrl: `https://www.dailymotion.com/embed/video/${match[1]}` };
    }
    if (host === 'tiktok.com') {
      const match = u.pathname.match(/\/video\/(\d+)/);
      if (match) return { platform: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}` };
    }
    if (host === 'facebook.com' || host === 'fb.watch') {
      return { platform: 'facebook', embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u.toString())}&show_text=false` };
    }
    if (host === 'instagram.com') {
      const match = u.pathname.match(/\/(p|reel)\/([a-zA-Z0-9_-]+)/);
      if (match) return { platform: 'instagram', embedUrl: `https://www.instagram.com/${match[1]}/${match[2]}/embed` };
    }
  } catch {
    return null;
  }
  return null;
}

const PLATFORM_ICON: Record<EmbedInfo['platform'], string> = {
  youtube: 'fa-brands fa-youtube',
  vimeo: 'fa-brands fa-vimeo',
  dailymotion: 'fa-solid fa-play',
  tiktok: 'fa-brands fa-tiktok',
  facebook: 'fa-brands fa-facebook',
  instagram: 'fa-brands fa-instagram',
};

export function platformIcon(platform: EmbedInfo['platform']): string {
  return PLATFORM_ICON[platform] || 'fa-solid fa-link';
}

/** Loads comments for a project with realtime updates (new/edited/deleted). */
export function useComments(projectId: string | undefined) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    setComments((data as Comment[]) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
    if (!projectId) return;
    const channel = supabase
      .channel(`comments:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `project_id=eq.${projectId}` },
        (payload) => {
          setComments((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((c) => c.id !== (payload.old as Comment).id);
            }
            const incoming = payload.new as Comment;
            const exists = prev.some((c) => c.id === incoming.id);
            if (exists) return prev.map((c) => (c.id === incoming.id ? incoming : c));
            return [...prev, incoming].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            );
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, load]);

  return { comments, loading, reload: load };
}

/** Runs the server-side moderation check (banned word list never leaves the DB). */
export async function isContentAllowed(text: string): Promise<boolean> {
  if (!text.trim()) return true;
  const { data, error } = await supabase.rpc('contains_banned_word', { input: text });
  if (error) {
    console.error('moderation check failed:', error);
    return true; // fail-open on infra errors; RLS/backend remains the real gate
  }
  return !data;
}

export async function postComment(
  projectId: string,
  profile: Profile,
  content: string,
  media: Comment['media'],
  parentId: string | null,
): Promise<{ error: string | null }> {
  const allowed = await isContentAllowed(content);
  if (!allowed) return { error: 'moderation_blocked' };

  const { error } = await supabase.from('comments').insert({
    project_id: projectId,
    user_id: profile.id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    content: content.trim(),
    media,
    parent_id: parentId,
  });
  if (error) return { error: 'error_generic' };
  return { error: null };
}

export async function uploadCommentImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('comment-media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('comment-media').getPublicUrl(path);
  return data.publicUrl;
}
