import { t } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { navigate } from '@/lib/router';

interface NotFoundViewProps {
  lang: Language;
}

export function NotFoundView({ lang }: NotFoundViewProps) {
  return (
    <div className="empty-state">
      <i className="fa-solid fa-map-signs fa-3x"></i>
      <h1>404 — {lang === 'tr' ? 'Sayfa bulunamadı' : 'Page not found'}</h1>
      <p>
        {lang === 'tr'
          ? 'Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.'
          : 'The page you are looking for may have moved or never existed.'}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn-generate" onClick={() => navigate('/')}>
          <i className="fa-solid fa-house"></i>
          {t('nav_new', lang)}
        </button>
        <button className="btn-generate" onClick={() => navigate('/library')}>
          <i className="fa-solid fa-folder-tree"></i>
          {t('nav_library', lang)}
        </button>
      </div>
    </div>
  );
}
