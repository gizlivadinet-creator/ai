import JSZip from 'jszip';
import type { GeneratedFile, Project } from './types';
import { downloadBlob, slugify } from './utils';

export async function createZipBlob(files: GeneratedFile[]): Promise<Blob> {
  const zip = new JSZip();
  files.forEach((file) => {
    zip.file(file.path, file.content);
  });
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function downloadProjectZip(project: Project): Promise<void> {
  const blob = await createZipBlob(project.files);
  const filename = `${slugify(project.title)}.zip`;
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
    generator: 'Claudia AI',
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
