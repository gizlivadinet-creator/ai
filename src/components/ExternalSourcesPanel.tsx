import { useState } from 'react';
import {
  EXTERNAL_SOURCES,
  searchExternalSources,
  fetchSourceContent,
  type ExternalSourceId,
  type ExternalSourceResult,
  type ExternalSourceFullContent,
} from '@/lib/search/externalSearch';

interface ExternalSourcesPanelProps {
  query: string;
}

interface ExternalResultRowProps {
  result: ExternalSourceResult;
}

// Renders one search hit with its (already Turkish) title/description, and
// lets the user pull the FULL page content on demand — fetched, organized
// into başlık/açıklama/içerik, and translated to Turkish in full, not
// summarized. Fetched lazily (only when expanded) so opening the panel
// with many hits stays fast; each result only pays the heavier
// fetch+translate cost if the user actually wants to read it in full.
function ExternalResultRow({ result }: ExternalResultRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [full, setFull] = useState<ExternalSourceFullContent | null>(null);
  const [failed, setFailed] = useState(false);

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !full && !loading) {
      setLoading(true);
      setFailed(false);
      try {
        const content = await fetchSourceContent(result.url);
        if (content) setFull(content);
        else setFailed(true);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <li className="external-result-row">
      <div className="external-result-head">
        <span className="source-tag">{result.source}</span>
        <span className="result-title">{full?.title || result.title}</span>
        <a href={result.url} target="_blank" rel="noreferrer noopener" className="result-open-link" title="Kaynağı yeni sekmede aç">
          <i className="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
      </div>

      {(full?.description || result.description) && (
        <p className="result-snippet">{full?.description || result.description}</p>
      )}

      <button type="button" className="result-expand-btn" onClick={toggleExpand}>
        {loading ? (
          <>
            <i className="fa-solid fa-circle-notch fa-spin"></i> İçerik getiriliyor ve Türkçeye çevriliyor...
          </>
        ) : expanded ? (
          <>
            <i className="fa-solid fa-chevron-up"></i> İçeriği gizle
          </>
        ) : (
          <>
            <i className="fa-solid fa-file-lines"></i> Tam içeriği getir (Türkçe)
          </>
        )}
      </button>

      {expanded && !loading && failed && (
        <p className="result-content-error">
          Tam içerik şu anda alınamadı. Kaynağı doğrudan görüntülemek için yukarıdaki bağlantıyı kullanabilirsiniz.
        </p>
      )}

      {expanded && !loading && full && (
        <div className="result-full-content">
          {full.content.split('\n').filter(Boolean).map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      )}
    </li>
  );
}

// All 17 sources search-sources/index.ts knows how to handle (see
// EXTERNAL_SOURCES above) are active by default — a source only stays out
// of a search if the user deliberately deselects its chip.
const DEFAULT_ACTIVE: ExternalSourceId[] = EXTERNAL_SOURCES.map((s) => s.id);

export function ExternalSourcesPanel({ query }: ExternalSourcesPanelProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Set<ExternalSourceId>>(new Set(DEFAULT_ACTIVE));
  const [results, setResults] = useState<ExternalSourceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function toggleSource(id: ExternalSourceId) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runSearch() {
    if (!query.trim() || active.size === 0) return;
    setLoading(true);
    setSearched(true);
    try {
      const r = await searchExternalSources(query, Array.from(active));
      setResults(r);
    } finally {
      setLoading(false);
    }
  }

  if (!query.trim()) return null;

  return (
    <div className="external-sources-panel">
      <button className="external-sources-toggle" onClick={() => setOpen((o) => !o)}>
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`}></i>
        Dış kaynaklarda ara ({EXTERNAL_SOURCES.length} kaynak)
      </button>

      {open && (
        <div className="external-sources-body">
          <div className="external-sources-chips">
            {EXTERNAL_SOURCES.map((s) => (
              <button
                key={s.id}
                className={`source-chip ${active.has(s.id) ? 'active' : ''}`}
                onClick={() => toggleSource(s.id)}
                type="button"
              >
                {s.label}
              </button>
            ))}
          </div>

          <button className="btn-generate external-search-btn" onClick={runSearch} disabled={loading}>
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i> Aranıyor...
              </>
            ) : (
              <>
                <i className="fa-solid fa-magnifying-glass"></i> "{query}" için ara
              </>
            )}
          </button>

          {searched && !loading && results.length === 0 && (
            <p className="external-sources-empty">Sonuç bulunamadı.</p>
          )}

          {results.length > 0 && (
            <ul className="external-sources-results">
              {results.map((r, i) => (
                <ExternalResultRow key={`${r.source}-${i}`} result={r} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
