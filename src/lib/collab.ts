import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { ProjectFile, Profile } from '@/lib/types';

export interface CollaboratorPresence {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  active_path: string | null;
}

/**
 * Loads a project's files from `project_files`, keeps them in sync via
 * Postgres Realtime (for reloads / other tabs) and exposes a broadcast
 * channel so open editors reflect each other's keystrokes live, without
 * waiting for a full DB round-trip.
 */
export function useProjectFiles(projectId: string | undefined, profile: Profile | null) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const onRemoteEditRef = useRef<(fileId: string, content: string) => void>(() => {});

  useEffect(() => {
    if (!projectId) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('path');
      if (mounted) setFiles((data as ProjectFile[]) || []);
      setLoading(false);
    }
    load();

    const dbChannel = supabase
      .channel(`project_files_db:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_files', filter: `project_id=eq.${projectId}` },
        (payload) => {
          setFiles((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((f) => f.id !== (payload.old as ProjectFile).id);
            }
            const incoming = payload.new as ProjectFile;
            const exists = prev.some((f) => f.id === incoming.id);
            if (exists) return prev.map((f) => (f.id === incoming.id ? incoming : f));
            return [...prev, incoming].sort((a, b) => a.path.localeCompare(b.path));
          });
        },
      )
      .subscribe();

    const liveChannel = supabase.channel(`project_live:${projectId}`, {
      config: { presence: { key: profile?.id || `guest-${Math.random().toString(36).slice(2)}` } },
    });

    liveChannel
      .on('broadcast', { event: 'edit' }, ({ payload }) => {
        const { file_id, content, editor_id } = payload as { file_id: string; content: string; editor_id: string };
        if (editor_id === profile?.id) return; // ignore our own broadcasts
        setFiles((prev) => prev.map((f) => (f.id === file_id ? { ...f, content } : f)));
        onRemoteEditRef.current(file_id, content);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = liveChannel.presenceState<CollaboratorPresence>();
        const list = Object.values(state).flat();
        setCollaborators(list);
      });

    liveChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && profile) {
        await liveChannel.track({
          user_id: profile.id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          active_path: null,
        } as CollaboratorPresence);
      }
    });

    channelRef.current = liveChannel;

    return () => {
      mounted = false;
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(liveChannel);
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, [projectId, profile?.id]);

  const setActivePath = useCallback((path: string | null) => {
    if (!profile || !channelRef.current) return;
    channelRef.current.track({
      user_id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      active_path: path,
    } as CollaboratorPresence);
  }, [profile]);

  /** Called on every keystroke: updates local state, broadcasts instantly, persists debounced. */
  const editFile = useCallback((fileId: string, content: string) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, content } : f)));

    channelRef.current?.send({
      type: 'broadcast',
      event: 'edit',
      payload: { file_id: fileId, content, editor_id: profile?.id },
    });

    setSavingIds((prev) => new Set(prev).add(fileId));
    clearTimeout(saveTimers.current[fileId]);
    saveTimers.current[fileId] = setTimeout(async () => {
      await supabase.from('project_files').update({ content }).eq('id', fileId);
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }, 800);
  }, [profile?.id]);

  const addFile = useCallback(async (projId: string, path: string, content: string, language: string) => {
    // Without this check, creating a file whose path already exists in the
    // project silently inserted a second `project_files` row with an
    // identical `path`. Nothing downstream (the editor's file list, or the
    // ZIP export in download.ts) can tell those two rows apart by name —
    // the export ends up silently dropping one of them, and the editor
    // shows two indistinguishable entries. Reject the collision up front
    // instead.
    const normalizedPath = path.trim().replace(/^\/+/, '');
    if (files.some((f) => f.path === normalizedPath)) {
      throw new Error('duplicate_path');
    }

    const { data, error } = await supabase
      .from('project_files')
      .insert({ project_id: projId, path: normalizedPath, content, language })
      .select()
      .single();
    if (error) {
      console.error('addFile() failed:', error.message);
      throw error;
    }
    return data as ProjectFile;
  }, [files]);

  const deleteFile = useCallback(async (fileId: string) => {
    const { error } = await supabase.from('project_files').delete().eq('id', fileId);
    if (error) throw error;
  }, []);

  return { files, loading, collaborators, savingIds, editFile, addFile, deleteFile, setActivePath };
}

export function languageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    py: 'python', js: 'javascript', jsx: 'javascript', ts: 'typescript',
    tsx: 'typescript', php: 'php', html: 'html', css: 'css', json: 'json',
    md: 'markdown', sh: 'shell', yml: 'yaml', yaml: 'yaml', txt: 'plaintext',
    env: 'ini', xml: 'xml', sql: 'sql',
  };
  return map[ext] || 'plaintext';
}
