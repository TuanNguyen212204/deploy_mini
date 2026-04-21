import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.trim()) return fallback;
    return JSON.parse(content) as T;
  } catch (error) {
    const e = error as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeHtml(filePath: string, html: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, html, 'utf8');
}
