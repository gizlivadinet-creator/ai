import JSZip from 'jszip';
import type { GeneratedFile, Project } from './types';
import { downloadBlob, slugify } from './utils';

export async function createZipBlob(files: GeneratedFile[]): Promise<Blob> {
  const zip = new JSZip();
  // JSZip silently overwrites an existing entry if two files share the
  // same `path`, so a stray duplicate anywhere upstream (a bad edit, a
  // race in collaborative editing, imported data, etc.) would quietly
  // drop content from the downloaded archive with no error and no trace.
  // Last line of defense: rename any collision with a numeric suffix
  // instead of overwriting, and log it so it's visible during debugging.
  const seenPaths = new Set<string>();
  files.forEach((file) => {
    let path = file.path;
    if (seenPaths.has(path)) {
      const dotIndex = path.lastIndexOf('.');
      const base = dotIndex > 0 ? path.slice(0, dotIndex) : path;
      const ext = dotIndex > 0 ? path.slice(dotIndex) : '';
      let suffix = 2;
      let candidate = `${base} (${suffix})${ext}`;
      while (seenPaths.has(candidate)) {
        suffix += 1;
        candidate = `${base} (${suffix})${ext}`;
      }
      console.warn(`createZipBlob: duplicate path "${path}" renamed to "${candidate}" to avoid data loss.`);
      path = candidate;
    }
    seenPaths.add(path);
    zip.file(path, file.content);
  });
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function downloadProjectZip(project: Project): Promise<void> {
  const blob = await createZipBlob(project.files);
  const filename = `${slugify(project.title)}.zip`;
  downloadBlob(blob, filename);
}

export async function downloadFilesZip(files: GeneratedFile[], filename: string): Promise<void> {
  const blob = await createZipBlob(files);
  downloadBlob(blob, filename);
}

export function createJsonBlob(project: Project): Blob {
  const exportData = {
    title: project.title,
    description: project.description,
    prompt: project.prompt,
    category: project.category,
    primary_language: project.primary_language,
    file_structure: project.file_structure,
    files: project.files,
    install_guide: project.install_guide,
    tags: project.tags,
    generated_at: project.created_at,
    generator: 'Immaculate AI',
  };
  return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
}

export function downloadProjectJson(project: Project): void {
  const blob = createJsonBlob(project);
  downloadBlob(blob, `${slugify(project.title)}.json`);
}

export function createShareUrl(project: Project): string {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#/p/${project.slug}`;
}
