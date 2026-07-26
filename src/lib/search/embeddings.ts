/**
 * Free, local (in-browser) semantic embeddings via transformers.js.
 *
 * No API key, no server cost: the model (all-MiniLM-L6-v2, ~25MB quantized)
 * downloads once from the HuggingFace CDN and is cached by the browser.
 * Everything after that runs entirely on the client.
 */

let pipelinePromise: Promise<any> | null = null;

async function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers');
      // Don't try to load local ONNX files from our own server — always
      // pull from the (free, public) HF CDN.
      env.allowLocalModels = false;
      return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    })();
  }
  return pipelinePromise;
}

/** Embed a single string into a normalized vector. */
export async function embedText(text: string): Promise<Float32Array> {
  const extractor = await getPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return output.data as Float32Array;
}

/** Embed many strings, reusing the loaded model. */
export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  const extractor = await getPipeline();
  const results: Float32Array[] = [];
  for (const text of texts) {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    results.push(output.data as Float32Array);
  }
  return results;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  // Vectors are already normalized by the pipeline, so dot product == cosine similarity.
  return dot;
}

/** Whether the model has already been downloaded/cached in this browser. */
export function isModelReady(): boolean {
  return pipelinePromise !== null;
}

/**
 * Preload the model in the background (e.g. on app idle) so the first
 * real search doesn't have to wait for the download.
 */
export function preloadModel(): void {
  if (typeof window === 'undefined') return;
  const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1500));
  idle(() => {
    getPipeline().catch(() => {
      /* silent — falls back to fuzzy-only search */
    });
  });
}
