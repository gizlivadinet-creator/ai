/**
 * sync-data.mjs
 *
 * Supabase "projects" tablosundaki tüm kayıtları public/data/ klasörüne
 * JSON ve gzip'lenmiş .json.gz olarak dışa aktarır.
 * GitHub Actions tarafından saatlik cron ile çalıştırılır.
 *
 * Çevre değişkenleri:
 *   SUPABASE_URL          - Supabase proje URL'i
 *   SUPABASE_SERVICE_ROLE_KEY - service role key (RLS'i bypass eder)
 */

import { createClient } from '@supabase/supabase-js';
import { gzipSync } from 'node:zlib';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://jjspourlctgyrtaxrxon.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const DATA_DIR = resolve(__dirname, '..', 'public', 'data');

async function main() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY eksik. Export atlandı.');
    process.exit(0);
  }

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Previously capped at `.limit(5000)`, a single request — PostgREST
  // returns at most one page's worth of rows regardless of `.limit()`
  // once the table exceeds it, so any project past the cap was silently
  // missing from the exported projects.json/.gz consumed by the static
  // site / GitHub Pages build. Page through the whole table instead.
  const PAGE_SIZE = 500;
  const projects = [];
  const seenIds = new Set();
  let from = 0;
  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error(`Supabase sorgu hatası (satır ${from}-${to}):`, error.message);
      process.exit(1);
    }

    const batch = data || [];
    for (const row of batch) {
      if (!seenIds.has(row.id)) {
        seenIds.add(row.id);
        projects.push(row);
      }
    }
    console.log(`Sayfa alındı: ${from}-${to} (${batch.length} kayıt, toplam ${projects.length}).`);

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`Toplam ${projects.length} proje bulundu.`);

  const manifest = {
    generated_at: new Date().toISOString(),
    total: projects.length,
    projects,
  };

  const jsonPath = resolve(DATA_DIR, 'projects.json');
  writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Yazıldı: ${jsonPath}`);

  const gzPath = resolve(DATA_DIR, 'projects.json.gz');
  writeFileSync(gzPath, gzipSync(Buffer.from(JSON.stringify(manifest))));
  console.log(`Yazıldı: ${gzPath}`);

  const index = {
    generated_at: new Date().toISOString(),
    total: projects.length,
    items: projects.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      category: p.category,
      primary_language: p.primary_language,
      created_at: p.created_at,
      tags: p.tags,
    })),
  };
  const indexPath = resolve(DATA_DIR, 'index.json');
  writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`Yazıldı: ${indexPath}`);

  console.log('Export tamam.');
}

main().catch((err) => {
  console.error('Beklenmeyen hata:', err);
  process.exit(1);
});
