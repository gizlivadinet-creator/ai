import { t } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { useStats } from '@/lib/hooks';
import { navigate } from '@/lib/router';

interface AboutViewProps {
  lang: Language;
}

export function AboutView({ lang }: AboutViewProps) {
  const { stats } = useStats();
  return (
    <div className="about-view">
      <div className="container">
        <h1 className="page-title">
          <i className="fa-solid fa-circle-info"></i>
          {t('nav_about', lang)}
        </h1>
        <div className="about-content">
          <section className="about-section">
            <h2><i className="fa-solid fa-robot"></i> Immaculate AI</h2>
            <p>{t('welcome_desc', lang)}</p>
          </section>

          <section className="about-section">
            <h2><i className="fa-solid fa-microscope"></i> {t('research_sources', lang)}</h2>
            <p>{t('sources_desc', lang)}</p>
            <div className="sources-grid">
              {['Best Practices', 'Security Standards', 'Style Guides', 'GitHub', 'GitLab', 'Bitbucket', 'NPM', 'PyPI', 'Maven Central'].map((s) => (
                <span key={s} className="source-tag">{s}</span>
              ))}
            </div>
          </section>

          <section className="about-section">
            <h2><i className="fa-solid fa-folder-tree"></i> {t('knowledge_pool', lang)}</h2>
            <p>{lang === 'tr'
              ? 'Oluşturulan her kod paketi bilgi havuzuna kaydedilir. Aynı kod tekrar oluşturulmaz. Sistem zamanla kendi kütüphanesini oluşturur.'
              : 'Every generated code package is saved to the knowledge pool. Duplicate code is not regenerated. The system builds its own library over time.'}</p>
            <div className="about-stats">
              <div><strong>{stats.total}</strong> {t('stats_projects', lang)}</div>
              <div><strong>{stats.categories}</strong> {t('stats_categories', lang)}</div>
              <div><strong>{stats.languages}</strong> {t('stats_languages', lang)}</div>
            </div>
          </section>

          <section className="about-section">
            <h2><i className="fa-solid fa-list-ol"></i> {lang === 'tr' ? 'Süreç' : 'Process'}</h2>
            <ol className="process-list">
              <li>{lang === 'tr' ? 'Kullanıcı komut girer' : 'User enters a command'}</li>
              <li>{lang === 'tr' ? 'Kaynaklar taranır ve analiz edilir' : 'Sources are scanned and analyzed'}</li>
              <li>{lang === 'tr' ? 'Kod optimize edilir ve üretilir' : 'Code is optimized and generated'}</li>
              <li>{lang === 'tr' ? 'Bilgi havuzuna kaydedilir' : 'Saved to the knowledge pool'}</li>
              <li>{lang === 'tr' ? 'İndir ve paylaş' : 'Download and share'}</li>
            </ol>
          </section>

          <button className="btn-generate" onClick={() => navigate('/')}>
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            {t('nav_new', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
