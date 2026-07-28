import { Suspense, lazy, useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import type { Language, Project, GeneratedFile } from '@/lib/types';
import { navigate } from '@/lib/router';
import { CategoryBadge } from './CategoryBadge';
import { formatDate, formatTime, copyToClipboard } from '@/lib/utils';
import { downloadProjectZip, downloadProjectJson, downloadFilesZip, createShareUrl } from '@/lib/download';
import { generateTestSuite } from '@/lib/testgen/generateTests';
import { CodeBlock } from './CodeBlock';

const CodeEditorView = lazy(() => import('./CodeEditorView').then((m) => ({ default: m.CodeEditorView })));
const CommentSection = lazy(() => import('./CommentSection').then((m) => ({ default: m.CommentSection })));

function PanelLoader() {
  return (
    <div className="admin-empty"><i className="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>
  );
}

interface ProjectResultProps {
  project: Project;
  lang: Language;
}

type Tab = 'summary' | 'structure' | 'files' | 'install' | 'download' | 'analysis' | 'tests' | 'comments';

export function ProjectResult({ project, lang }: ProjectResultProps) {
  const [tab, setTab] = useState<Tab>('summary');
  const [shareCopied, setShareCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [testsGenerated, setTestsGenerated] = useState(false);
  const [selectedTestPath, setSelectedTestPath] = useState<string | null>(null);
  const [downloadingTests, setDownloadingTests] = useState(false);
  const [viewFile, setViewFile] = useState<GeneratedFile | null>(null);

  const testSuite = useMemo(
    () => (testsGenerated ? generateTestSuite(project.files) : null),
    [testsGenerated, project.files],
  );

  async function handleDownloadTests() {
    if (!testSuite || testSuite.files.length === 0) return;
    setDownloadingTests(true);
    try {
      await downloadFilesZip(testSuite.files, `${project.slug}-tests.zip`);
    } finally {
      setDownloadingTests(false);
    }
  }

  async function handleShare() {
    const url = createShareUrl(project);
    await copyToClipboard(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  }

  async function handleDownloadZip() {
    setDownloading(true);
    try {
      await downloadProjectZip(project);
    } finally {
      setDownloading(false);
    }
  }

  function handleDownloadJson() {
    downloadProjectJson(project);
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'summary', label: t('project_summary', lang), icon: 'fa-file-lines' },
    { id: 'structure', label: t('folder_structure', lang), icon: 'fa-folder-tree' },
    { id: 'files', label: `${t('code_files', lang)} (${project.files.length})`, icon: 'fa-code' },
    { id: 'install', label: t('install_guide', lang), icon: 'fa-list-check' },
    { id: 'download', label: t('download_package', lang), icon: 'fa-download' },
    { id: 'analysis', label: t('performance_seo', lang), icon: 'fa-chart-line' },
    { id: 'tests', label: lang === 'tr' ? 'Testler' : 'Tests', icon: 'fa-vial' },
    { id: 'comments', label: t('comments', lang), icon: 'fa-comments' },
  ];

  return (
    <div className="project-result">
      <div className="project-result-header">
        <div className="container">
          <button className="back-btn" onClick={() => navigate('/library')}>
            <i className="fa-solid fa-arrow-left"></i>
            {t('back', lang)}
          </button>
          <div className="project-result-title-row">
            <div>
              <CategoryBadge category={project.category} lang={lang} />
              <h1 className="project-result-title">{project.title}</h1>
              <p className="project-result-desc">{project.description}</p>
              <div className="project-result-meta">
                <span><i className="fa-regular fa-calendar"></i> {formatDate(project.created_at, lang)}</span>
                <span><i className="fa-regular fa-clock"></i> {formatTime(project.created_at, lang)}</span>
                <span><i className="fa-solid fa-code"></i> {project.primary_language}</span>
                <span><i className="fa-regular fa-file"></i> {project.files.length} {t('files', lang)}</span>
              </div>
            </div>
            <div className="project-result-actions">
              <button className="action-btn" onClick={handleShare} title={t('share', lang)}>
                <i className={`fa-solid ${shareCopied ? 'fa-check' : 'fa-share-nodes'}`}></i>
                {shareCopied ? t('copied', lang) : t('share', lang)}
              </button>
              <button className="action-btn primary" onClick={handleDownloadZip} disabled={downloading}>
                <i className={`fa-solid ${downloading ? 'fa-circle-notch fa-spin' : 'fa-download'}`}></i>
                {t('download_zip', lang)}
              </button>
            </div>
          </div>
          <div className="project-tags">
            {project.tags.map((tag) => (
              <span key={tag} className="tag-chip">#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="tabs" role="tablist">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              className={`tab ${tab === tb.id ? 'active' : ''}`}
              onClick={() => setTab(tb.id)}
              role="tab"
              aria-selected={tab === tb.id}
            >
              <i className={`fa-solid ${tb.icon}`}></i>
              <span>{tb.label}</span>
            </button>
          ))}
        </div>

        <div className="tab-content">
          {tab === 'summary' && (
            <div className="summary-panel">
              <div className="summary-grid">
                <div className="summary-item">
                  <i className="fa-solid fa-lightbulb"></i>
                  <div>
                    <h4>{t('project_summary', lang)}</h4>
                    <p>{project.description}</p>
                  </div>
                </div>
                <div className="summary-item">
                  <i className="fa-solid fa-terminal"></i>
                  <div>
                    <h4>{lang === 'tr' ? 'Orijinal Komut' : 'Original Prompt'}</h4>
                    <p className="prompt-text">{project.prompt}</p>
                  </div>
                </div>
                <div className="summary-item">
                  <i className="fa-solid fa-code"></i>
                  <div>
                    <h4>{t('language', lang)}</h4>
                    <p>{project.primary_language}</p>
                  </div>
                </div>
                <div className="summary-item">
                  <i className="fa-solid fa-folder"></i>
                  <div>
                    <h4>{t('files', lang)}</h4>
                    <p>{project.files.length} {t('files', lang)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'structure' && (
            <div className="structure-panel">
              <pre className="file-tree">
                <code>{project.file_structure}</code>
              </pre>
              {project.files.length > 0 && (
                <ul className="structure-file-list">
                  {project.files.map((f) => (
                    <li key={f.path}>
                      <button
                        type="button"
                        className="structure-file-item"
                        onClick={() => setViewFile(f)}
                      >
                        <i className="fa-regular fa-file-code"></i>
                        <span className="structure-file-path">{f.path}</span>
                        <i className="fa-solid fa-chevron-right structure-file-arrow"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'files' && (
            <div className="files-panel files-panel-editor">
              <Suspense fallback={<PanelLoader />}>
                <CodeEditorView project={project} lang={lang} />
              </Suspense>
            </div>
          )}

          {tab === 'install' && (
            <div className="install-panel">
              <div className="install-steps">
                <h3><i className="fa-solid fa-list-check"></i> {t('install_guide', lang)}</h3>
                {project.install_guide.split('\n').map((step, i) => (
                  <div key={i} className="install-step">
                    <span className="step-num">{i + 1}</span>
                    <div className="step-text" dangerouslySetInnerHTML={{ __html: step.replace(/`([^`]+)`/g, '<code>$1</code>') }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'download' && (
            <div className="download-panel">
              <div className="download-card">
                <div className="download-icon">
                  <i className="fa-solid fa-file-zipper fa-3x"></i>
                </div>
                <h3>{t('download_zip', lang)}</h3>
                <p>{project.files.length} {t('files', lang)} — .zip sıkıştırılmış paket</p>
                <button className="action-btn primary big" onClick={handleDownloadZip} disabled={downloading}>
                  <i className={`fa-solid ${downloading ? 'fa-circle-notch fa-spin' : 'fa-download'}`}></i>
                  {downloading ? t('loading', lang) : t('download_zip', lang)}
                </button>
              </div>
              <div className="download-card">
                <div className="download-icon">
                  <i className="fa-solid fa-file-code fa-3x"></i>
                </div>
                <h3>JSON Export</h3>
                <p>Yapılandırılmış veri formatı — .json</p>
                <button className="action-btn big" onClick={handleDownloadJson}>
                  <i className="fa-solid fa-download"></i>
                  {t('download', lang)} JSON
                </button>
              </div>
              <div className="download-card">
                <div className="download-icon">
                  <i className={`fa-solid ${shareCopied ? 'fa-check' : 'fa-link'} fa-3x`}></i>
                </div>
                <h3>{t('share', lang)}</h3>
                <p>{t('copy_link', lang)} — benzersiz URL</p>
                <button className="action-btn big" onClick={handleShare}>
                  <i className={`fa-solid ${shareCopied ? 'fa-check' : 'fa-share-nodes'}`}></i>
                  {shareCopied ? t('copied', lang) : t('copy_link', lang)}
                </button>
              </div>
            </div>
          )}

          {tab === 'analysis' && (
            <div className="analysis-panel">
              <div className="analysis-card">
                <div className="analysis-header">
                  <i className="fa-solid fa-gauge-high"></i>
                  <h3>{lang === 'tr' ? 'Performans Analizi' : 'Performance Analysis'}</h3>
                </div>
                <p>{project.performance_analysis || t('optimized', lang)}</p>
              </div>
              <div className="analysis-card">
                <div className="analysis-header">
                  <i className="fa-solid fa-magnifying-glass-chart"></i>
                  <h3>{lang === 'tr' ? 'SEO Analizi' : 'SEO Analysis'}</h3>
                </div>
                <p>{project.seo_analysis || t('ready', lang)}</p>
              </div>
              <div className="analysis-card">
                <div className="analysis-header">
                  <i className="fa-solid fa-shield-halved"></i>
                  <h3>{lang === 'tr' ? 'Güvenlik' : 'Security'}</h3>
                </div>
                <p>{lang === 'tr'
                  ? 'OWASP Top 10 koruması: SQL injection önlenmiş, XSS koruması, input validation, CORS yapılandırılmış.'
                  : 'OWASP Top 10 protection: SQL injection prevented, XSS protection, input validation, CORS configured.'}</p>
              </div>
            </div>
          )}

          {tab === 'tests' && (
            <div className="tests-panel">
              {!testsGenerated && (
                <div className="tests-empty">
                  <i className="fa-solid fa-vial fa-3x"></i>
                  <h3>{lang === 'tr' ? 'Test Üretici' : 'Test Generator'}</h3>
                  <p>
                    {lang === 'tr'
                      ? 'Proje dosyalarını statik analizle tarayıp fonksiyon/route/bileşenler için otomatik test iskeleti üretir. Tamamen yerel ve ücretsizdir — hiçbir AI/API çağrısı yapılmaz.'
                      : 'Scans the project files with static analysis and generates a test skeleton for functions/routes/components. Fully local and free — no AI/API calls involved.'}
                  </p>
                  <button className="btn-generate" onClick={() => setTestsGenerated(true)}>
                    <i className="fa-solid fa-flask-vial"></i>
                    {lang === 'tr' ? 'Testleri Üret' : 'Generate Tests'}
                  </button>
                </div>
              )}

              {testsGenerated && testSuite && testSuite.files.length === 0 && (
                <div className="tests-empty">
                  <i className="fa-solid fa-circle-info fa-3x"></i>
                  <p>
                    {lang === 'tr'
                      ? 'Bu proje için otomatik test üretilecek tanınan bir fonksiyon/route bulunamadı (desteklenen diller: Python, JS/TS, PHP).'
                      : 'No recognizable function/route was found to generate tests for (supported languages: Python, JS/TS, PHP).'}
                  </p>
                </div>
              )}

              {testsGenerated && testSuite && testSuite.files.length > 0 && (
                <>
                  <div className="tests-summary">
                    <div className="tests-summary-stat">
                      <strong>{testSuite.files.length}</strong>
                      <span>{lang === 'tr' ? 'test dosyası' : 'test files'}</span>
                    </div>
                    <div className="tests-summary-stat">
                      <strong>{testSuite.analyzed}</strong>
                      <span>{lang === 'tr' ? 'kaynak dosya tarandı' : 'source files scanned'}</span>
                    </div>
                    <div className="tests-summary-stat">
                      <strong>{testSuite.symbolCount}</strong>
                      <span>{lang === 'tr' ? 'fonksiyon/route bulundu' : 'functions/routes found'}</span>
                    </div>
                    <button className="action-btn primary" onClick={handleDownloadTests} disabled={downloadingTests}>
                      <i className={`fa-solid ${downloadingTests ? 'fa-circle-notch fa-spin' : 'fa-download'}`}></i>
                      {lang === 'tr' ? 'Testleri İndir (.zip)' : 'Download Tests (.zip)'}
                    </button>
                  </div>

                  <div className="tests-layout">
                    <ul className="tests-file-list">
                      {testSuite.files.map((f) => (
                        <li
                          key={f.path}
                          className={selectedTestPath === f.path || (!selectedTestPath && f === testSuite.files[0]) ? 'active' : ''}
                          onClick={() => setSelectedTestPath(f.path)}
                        >
                          <i className="fa-solid fa-flask"></i> {f.path}
                        </li>
                      ))}
                    </ul>
                    <div className="tests-file-view">
                      {(() => {
                        const active =
                          testSuite.files.find((f) => f.path === selectedTestPath) ?? testSuite.files[0];
                        return <CodeBlock path={active.path} content={active.content} language={active.language} lang={lang} />;
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'comments' && (
            <div className="comments-panel">
              <Suspense fallback={<PanelLoader />}>
                <CommentSection projectId={project.id} lang={lang} />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {viewFile && (
        <div className="modal-overlay" onClick={() => setViewFile(null)}>
          <div className="modal-card modal-card-lg modal-card-code" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <h3><i className="fa-solid fa-file-code"></i> {viewFile.path}</h3>
              <button className="editor-icon-btn" onClick={() => setViewFile(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <CodeBlock path={viewFile.path} content={viewFile.content} language={viewFile.language} lang={lang} />
          </div>
        </div>
      )}
    </div>
  );
}
