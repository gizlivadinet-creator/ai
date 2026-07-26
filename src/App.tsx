import { useEffect, useState } from 'react';
import { useFontAwesome } from '@/lib/fontawesome';
import { useRouter } from '@/lib/router';
import { t } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { Header } from '@/components/Header';
import { HomeView } from '@/components/HomeView';
import { LibraryView } from '@/components/LibraryView';
import { ProjectResult } from '@/components/ProjectResult';
import { AboutView } from '@/components/AboutView';
import { useProject } from '@/lib/hooks';

function App() {
  useFontAwesome();
  const route = useRouter();
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('claudia-lang') as Language) || 'tr';
  });

  useEffect(() => {
    localStorage.setItem('claudia-lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const currentView = route.name === 'home' ? 'home'
    : route.name === 'library' ? 'library'
    : route.name === 'about' ? 'about'
    : route.name === 'project' ? 'project' : 'home';

  function renderRoute() {
    switch (route.name) {
      case 'home':
        return <HomeView lang={lang} />;
      case 'library':
        return <LibraryView lang={lang} />;
      case 'about':
        return <AboutView lang={lang} />;
      case 'project': {
        return <ProjectLoader slug={route.slug} lang={lang} />;
      }
      default:
        return <HomeView lang={lang} />;
    }
  }

  return (
    <div className="app">
      <Header lang={lang} onLangChange={setLang} current={currentView as 'home' | 'library' | 'about' | 'project'} />
      <main role="main" className="main">
        {renderRoute()}
      </main>
      <footer className="footer" role="contentinfo">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <i className="fa-solid fa-code"></i>
              <span>Claudia<span className="logo-accent">AI</span></span>
            </div>
            <p>{t('footer_text', lang)}</p>
            <p className="footer-sources">{t('sources_desc', lang)}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProjectLoader({ slug, lang }: { slug: string; lang: Language }) {
  const { project, loading, error } = useProject(slug);

  if (loading) {
    return (
      <div className="loading-center">
        <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
        <p>{t('loading', lang)}</p>
      </div>
    );
  }
  if (error || !project) {
    return (
      <div className="empty-state">
        <i className="fa-solid fa-circle-exclamation fa-3x"></i>
        <h3>{t('error_generic', lang)}</h3>
        <button className="btn-generate" onClick={() => (window.location.hash = '/library')}>
          {t('back', lang)}
        </button>
      </div>
    );
  }
  return <ProjectResult project={project} lang={lang} />;
}

export default App;
