import { useState } from 'react';
import { t } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { useGenerate, useStats } from '@/lib/hooks';
import { navigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { ProjectResult } from './ProjectResult';

interface HomeViewProps {
  lang: Language;
}

const QUICK_PROMPTS: Record<string, { tr: string; en: string; icon: string }> = {
  scraper: {
    tr: 'Python ile web scraper oluştur, CSV çıktı versin',
    en: 'Build a Python web scraper that outputs CSV',
    icon: 'fa-spider',
  },
  telegram_bot: {
    tr: 'Telegram bot framework oluştur, komut yönetimi olsun',
    en: 'Create a Telegram bot framework with command handling',
    icon: 'fa-robot',
  },
  fastapi: {
    tr: 'FastAPI ile REST API oluştur, CRUD işlemleri olsun',
    en: 'Build a REST API with FastAPI including CRUD operations',
    icon: 'fa-server',
  },
  express: {
    tr: 'Express.js REST API sunucusu oluştur',
    en: 'Create an Express.js REST API server',
    icon: 'fa-node-js',
  },
  landing: {
    tr: 'Modern responsive landing page oluştur, SEO uyumlu',
    en: 'Create a modern responsive SEO-friendly landing page',
    icon: 'fa-globe',
  },
  automation: {
    tr: 'Python otomasyon zamanlayıcı oluştur, cron benzeri',
    en: 'Build a Python automation scheduler like cron',
    icon: 'fa-gears',
  },
  php_api: {
    tr: 'PHP REST API oluştur, JSON yanıtlar versin',
    en: 'Create a PHP REST API with JSON responses',
    icon: 'fa-php',
  },
  prompt: {
    tr: 'AI için optimize sistem prompt şablonu oluştur',
    en: 'Create an optimized AI system prompt template',
    icon: 'fa-comment-dots',
  },
};

export function HomeView({ lang }: HomeViewProps) {
  const [prompt, setPrompt] = useState('');
  const { loading, error, duplicate, result, generate } = useGenerate();
  const { stats } = useStats();
  const { user, isBanned, signIn, loading: authLoading } = useAuth();

  async function handleGenerate() {
    if (!user) return;
    const project = await generate(prompt);
    if (project) {
      setPrompt('');
    }
  }

  function handleQuickPrompt(text: string) {
    setPrompt(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  }

  if (result) {
    return <ProjectResult project={result} lang={lang} />;
  }

  return (
    <div className="home-view">
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">
            <i className="fa-solid fa-bolt"></i>
            <span>{t('research_sources', lang)}</span>
          </div>
          <h1 className="hero-title">{t('welcome_title', lang)}</h1>
          <p className="hero-desc">{t('welcome_desc', lang)}</p>

          <div className="prompt-box" style={{ position: 'relative' }}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('prompt_placeholder', lang)}
              rows={3}
              aria-label={t('prompt_placeholder', lang)}
              disabled={!user || isBanned}
            />
            <div className="prompt-footer">
              <span className="prompt-hint">
                <i className="fa-solid fa-keyboard"></i>
                {lang === 'tr' ? 'Ctrl+Enter ile gönder' : 'Ctrl+Enter to submit'}
              </span>
              <button
                className="btn-generate"
                onClick={handleGenerate}
                disabled={loading || !prompt.trim() || !user || isBanned}
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    {t('generating', lang)}
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                    {t('generate', lang)}
                  </>
                )}
              </button>
            </div>

            {!authLoading && !user && (
              <div className="auth-gate-overlay">
                <i className="fa-brands fa-google"></i>
                <p>{t('login_required_generate', lang)}</p>
                <button className="btn-generate" onClick={() => signIn()}>
                  {t('sign_in_google', lang)}
                </button>
              </div>
            )}
            {isBanned && (
              <div className="auth-gate-overlay auth-gate-overlay-banned">
                <i className="fa-solid fa-ban"></i>
                <p>{t('banned_notice', lang)}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="error-banner">
              <i className="fa-solid fa-circle-exclamation"></i>
              {t(error, lang)}
            </div>
          )}

          {!error && duplicate && (
            <div className="info-banner">
              <i className="fa-solid fa-circle-info"></i>
              {t('duplicate_found', lang)}
            </div>
          )}

          {loading && (
            <div className="loading-bar">
              <div className="loading-bar-fill"></div>
            </div>
          )}

          {loading && (
            <div className="sources-loading">
              <p>{t('generating_desc', lang)}</p>
              <div className="sources-list">
                {['Best Practices', 'Security Rules', 'Style Guides', 'GitHub', 'GitLab', 'NPM', 'PyPI'].map((s) => (
                  <span key={s} className="source-chip">
                    <i className="fa-solid fa-circle-check"></i> {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="quick-prompts-section">
        <div className="container">
          <h2 className="section-title-small">{t('quick_prompts', lang)}</h2>
          <div className="quick-prompts-grid">
            {Object.entries(QUICK_PROMPTS).map(([key, qp]) => (
              <button
                key={key}
                className="quick-prompt-card"
                onClick={() => handleQuickPrompt(lang === 'tr' ? qp.tr : qp.en)}
              >
                <i className={`fa-solid ${qp.icon}`}></i>
                <span>{lang === 'tr' ? qp.tr : qp.en}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {stats.total > 0 && (
        <section className="stats-section">
          <div className="container">
            <div className="stats-row">
              <div className="stat-item">
                <i className="fa-solid fa-folder-open"></i>
                <div>
                  <div className="stat-value">{stats.total}</div>
                  <div className="stat-label">{t('stats_projects', lang)}</div>
                </div>
              </div>
              <div className="stat-item">
                <i className="fa-solid fa-layer-group"></i>
                <div>
                  <div className="stat-value">{stats.categories}</div>
                  <div className="stat-label">{t('stats_categories', lang)}</div>
                </div>
              </div>
              <div className="stat-item">
                <i className="fa-solid fa-code"></i>
                <div>
                  <div className="stat-value">{stats.languages}</div>
                  <div className="stat-label">{t('stats_languages', lang)}</div>
                </div>
              </div>
              <button className="stat-cta" onClick={() => navigate('/library')}>
                {t('nav_library', lang)}
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
