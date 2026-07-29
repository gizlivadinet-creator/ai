import { useEffect, useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { navigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';

interface HeaderProps {
  lang: Language;
  onLangChange: (l: Language) => void;
  current: 'home' | 'library' | 'about' | 'project' | 'admin';
  onSearch?: (q: string) => void;
}

export function Header({ lang, onLangChange, current, onSearch }: HeaderProps) {
  const { user, profile, loading, isAdmin, isBanned, signIn, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header className="header" role="banner">
      <div className="header-inner">
        <a href="/" className="logo" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <i className="fa-solid fa-code logo-icon"></i>
          <span className="logo-text">Immaculate<span className="logo-accent">AI</span></span>
        </a>

        <nav className="nav" aria-label={t('nav_library', lang)}>
          <a
            href="/"
            className={`nav-link ${current === 'home' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span>{t('nav_new', lang)}</span>
          </a>
          <a
            href="/library"
            className={`nav-link ${current === 'library' || current === 'project' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); navigate('/library'); }}
          >
            <i className="fa-solid fa-folder-tree"></i>
            <span>{t('nav_library', lang)}</span>
          </a>
          <a
            href="/about"
            className={`nav-link ${current === 'about' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); navigate('/about'); }}
          >
            <i className="fa-solid fa-circle-info"></i>
            <span>{t('nav_about', lang)}</span>
          </a>
          {isAdmin && (
            <a
              href="/admin"
              className={`nav-link nav-link-admin ${current === 'admin' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); navigate('/admin'); }}
            >
              <i className="fa-solid fa-shield-halved"></i>
              <span>{t('admin_panel', lang)}</span>
            </a>
          )}
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

          {!loading && !user && (
            <button className="btn-google-signin" onClick={() => signIn()}>
              <GoogleIcon />
              <span>{t('sign_in_google', lang)}</span>
            </button>
          )}

          {!loading && user && (
            <div className="user-menu" ref={menuRef}>
              <button
                className={`user-menu-trigger ${isBanned ? 'is-banned' : ''}`}
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="user-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <span className="user-avatar user-avatar-fallback">
                    {(profile?.display_name || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="user-name">{profile?.display_name || user.email}</span>
                {isAdmin && <span className="badge badge-admin">{t('admin_badge', lang)}</span>}
                {isBanned && <span className="badge badge-banned">{t('banned_badge', lang)}</span>}
                <i className={`fa-solid fa-chevron-down user-menu-caret ${menuOpen ? 'open' : ''}`}></i>
              </button>

              {menuOpen && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="user-avatar-lg" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="user-avatar-lg user-avatar-fallback">
                        {(profile?.display_name || user.email || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <div className="user-menu-name">{profile?.display_name}</div>
                      <div className="user-menu-email">{user.email}</div>
                    </div>
                  </div>
                  {isBanned && <div className="user-menu-banned-notice">{t('banned_notice', lang)}</div>}
                  {isAdmin && (
                    <button
                      className="user-menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/admin');
                      }}
                    >
                      <i className="fa-solid fa-shield-halved"></i> {t('admin_panel', lang)}
                    </button>
                  )}
                  <button
                    className="user-menu-item user-menu-item-danger"
                    onClick={() => {
                      setMenuOpen(false);
                      signOut();
                    }}
                  >
                    <i className="fa-solid fa-right-from-bracket"></i> {t('sign_out', lang)}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20.4H24v7.2h11.3C33.7 32 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C34 5.9 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l5.9 4.3C13.9 15.1 18.6 12 24 12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C34 5.9 29.3 4 24 4c-7.5 0-14 4.2-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.7 13.6-4.7l-6.3-5.3C29.3 35.9 26.8 36.8 24 36.8c-5.3 0-9.7-3.4-11.3-8.1l-6.2 4.8C10 39.6 16.5 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.3C39.4 36.4 44 30.8 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
