import { useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { Language } from '@/lib/types';

interface CodeBlockProps {
  path: string;
  content: string;
  language: string;
  lang: Language;
}

export function CodeBlock({ path, content, language, lang }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  async function handleCopy() {
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const lineCount = content.split('\n').length;

  return (
    <div className="code-block">
      <div className="code-header">
        <div className="code-file-info">
          <i className={`fa-solid ${getFileIcon(path)}`}></i>
          <span className="code-path">{path}</span>
          <span className="code-lang-badge">{language}</span>
        </div>
        <div className="code-actions">
          <span className="code-lines">{lineCount} {t('lines', lang)}</span>
          <button onClick={handleCopy} className="code-copy-btn" aria-label={t('copy_code', lang)}>
            <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
            {copied ? t('copied', lang) : t('copy', lang)}
          </button>
        </div>
      </div>
      <pre ref={preRef} className="code-content">
        <code>{content}</code>
      </pre>
    </div>
  );
}

function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    py: 'fa-python', js: 'fa-js', jsx: 'fa-js', ts: 'fa-code',
    tsx: 'fa-code', php: 'fa-php', html: 'fa-html5', css: 'fa-css3-alt',
    json: 'fa-brackets-curly', md: 'fa-markdown', sh: 'fa-terminal',
    yml: 'fa-gear', yaml: 'fa-gear', txt: 'fa-file-lines',
    env: 'fa-key', xml: 'fa-code', sql: 'fa-database',
  };
  return map[ext] || 'fa-file-code';
}
