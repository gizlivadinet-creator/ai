import { t } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { navigate } from '@/lib/router';

interface HeaderProps {
  lang: Language;
  onLangChange: (l: Language) => void;
  current: 'home' | 'library' | 'about' | 'project';
  onSearch?: (q: string) => void;
}

export function Header({ lang, onLangChange, current, onSearch }: HeaderProps) {
  return (
    <header className="header" role="banner">
      <div className="header-inner">
        <a href="#/" className="logo" onClick={() => navigate('/')}>
          <i className="fa-solid fa-code logo-icon"></i>
          <span className="logo-text">Claudia<span className="logo-accent">AI</span></span>
        </a>

        <nav className="nav" aria-label={t('nav_library', lang)}>
          <a
            href="#/"
            className={`nav-link ${current === 'home' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span>{t('nav_new', lang)}</span>
          </a>
          <a
            href="#/library"
            className={`nav-link ${current === 'library' || current === 'project' ? 'active' : ''}`}
            onClick={() => navigate('/library')}
          >
            <i className="fa-solid fa-folder-tree"></i>
            <span>{t('nav_library', lang)}</span>
          </a>
          <a
            href="#/about"
            className={`nav-link ${current === 'about' ? 'active' : ''}`}
            onClick={() => navigate('/about')}
          >
            <i className="fa-solid fa-circle-info"></i>
            <span>{t('nav_about', lang)}</span>
          </a>
        </nav>

        <div className="header-right">
          {onSearch && (
            <div className="header-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="search"
                placeholder={t('search_placeholder', lang)}
                onChange={(e) => onSearch(e.target.value)}
                aria-label={t('search_placeholder', lang)}
              />
            </div>
          )}
          <button
            className="lang-toggle"
            onClick={() => onLangChange(lang === 'tr' ? 'en' : 'tr')}
            aria-label="Language"
            title={lang === 'tr' ? 'English' : 'Türkçe'}
          >
            <i className="fa-solid fa-globe"></i>
            <span>{lang === 'tr' ? 'TR' : 'EN'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
