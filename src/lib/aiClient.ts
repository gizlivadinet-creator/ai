import { supabase } from '@/lib/supabase';
import type { GenerationResult } from '@/lib/types';

export class GenerationError extends Error {
  constructor(public code: string, message?: string) {
    super(message || code);
    this.name = 'GenerationError';
  }
}

/**
 * Calls the `generate-code` Supabase Edge Function, which uses a real LLM
 * (Anthropic Claude) grounded in live package/repo/docs research to produce
 * a complete project.
 *
 * IMPORTANT: this used to silently fall back to a local, keyword-matching
 * fake generator (src/lib/generator.ts) whenever the edge function errored
 * for ANY reason — not just "not configured yet", but also transient
 * failures, rate limits, or bugs. That fallback is indistinguishable from a
 * real AI result in the UI, and — because generate() unconditionally saves
 * whatever comes back here into the shared `projects` table, keyed by the
 * exact prompt text, with future identical prompts served straight from
 * that cached row — a single silent failure would get PERMANENTLY served
 * to everyone who submits that same prompt again, with no error, no retry,
 * and no way to tell it wasn't really Claude. That's what was happening
 * (any prompt the local matcher didn't recognize, e.g. a XenForo add-on
 * request, silently produced a generic Python CLI template forever).
 *
 * So: any failure here must throw a real, visible error instead of
 * quietly returning fake content. Check the generate-code function's logs
 * in the Supabase Dashboard (Edge Functions > generate-code > Logs) to see
 * the actual underlying error when this fires.
 */
export async function generateProjectRemote(prompt: string): Promise<GenerationResult> {
  const { data, error } = await supabase.functions.invoke('generate-code', {
    body: { prompt },
  });

  if (error) {
    // supabase-js surfaces non-2xx responses as a generic FunctionsHttpError;
    // the actual JSON body (with our error code) is on error.context.
    let code = 'error_generate';
    try {
      const body = await (error as { context?: Response }).context?.json?.();
      if (body?.error) code = body.error;
    } catch {
      /* ignore parse failure, keep generic code */
    }

    if (code === 'not_code_request') throw new GenerationError('not_code_request');
    if (code === 'moderation_blocked') throw new GenerationError('moderation_blocked');
    if (code === 'banned') throw new GenerationError('banned_notice');
    if (code === 'unauthorized') throw new GenerationError('login_required_generate');

    // Anything else (server_misconfigured, internal_error, network failure,
    // Anthropic API error, etc.) is a real failure — surface it honestly.
    console.error('generate-code function failed:', code);
    throw new GenerationError('error_generate');
  }

  if (!data?.result) {
    console.error('generate-code returned no result');
    throw new GenerationError('error_generate');
  }

  return data.result as GenerationResult;
}
