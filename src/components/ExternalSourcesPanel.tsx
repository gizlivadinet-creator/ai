import { useState } from 'react';
import { EXTERNAL_SOURCES, searchExternalSources, type ExternalSourceId, type ExternalSourceResult } from '@/lib/search/externalSearch';

interface ExternalSourcesPanelProps {
  query: string;
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
                <li key={`${r.source}-${i}`}>
                  <a href={r.url} target="_blank" rel="noreferrer noopener">
                    <span className="source-tag">{r.source}</span>
                    <span className="result-title">{r.title}</span>
                  </a>
                  {r.snippet && <p className="result-snippet">{r.snippet}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
