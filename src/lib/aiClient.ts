import { supabase } from '@/lib/supabase';
import { generateProject } from '@/lib/generator';
import type { GenerationResult } from '@/lib/types';

export class GenerationError extends Error {
  constructor(public code: string, message?: string) {
    super(message || code);
    this.name = 'GenerationError';
  }
}

/**
 * Calls the `generate-code` Supabase Edge Function, which uses a real LLM
 * (Anthropic Claude) grounded in live npm/PyPI/Maven/GitHub package data to
 * produce a complete project. Falls back to the local rule-based generator
 * ONLY if the function is unreachable or not yet configured (missing
 * ANTHROPIC_API_KEY secret), so the site keeps working during setup.
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

    // Infra/config problem (e.g. ANTHROPIC_API_KEY not set yet) — degrade
    // gracefully instead of blocking the whole platform.
    console.warn('generate-code function unavailable, using local fallback generator:', code);
    return generateProject(prompt);
  }

  if (!data?.result) {
    console.warn('generate-code returned no result, using local fallback generator');
    return generateProject(prompt);
  }

  return data.result as GenerationResult;
}
