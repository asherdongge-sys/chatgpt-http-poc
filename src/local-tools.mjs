import fs from 'node:fs/promises';
import path from 'node:path';

const workspace = path.resolve(process.env.AGENT_WORKSPACE || process.cwd());

function resolveInsideWorkspace(input = '.') {
  const target = path.resolve(workspace, input);
  const relative = path.relative(workspace, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('path escapes AGENT_WORKSPACE');
  }
  return target;
}

export function listTools() {
  return [
    { name: 'fs.list', description: 'List entries in the selected workspace.', risk: 'read' },
    { name: 'fs.read', description: 'Read a UTF-8 file in the selected workspace.', risk: 'read' },
    { name: 'fs.write', description: 'Write a UTF-8 file in the selected workspace.', risk: 'write' },
    { name: 'fs.search', description: 'Search text recursively in common source files.', risk: 'read' },
  ];
}

async function fsList({ path: relativePath = '.' } = {}) {
  const target = resolveInsideWorkspace(relativePath);
  const entries = await fs.readdir(target, { withFileTypes: true });
  return entries.sort((a, b) => a.name.localeCompare(b.name)).map((entry) => `${entry.isDirectory() ? 'dir' : 'file'}\t${entry.name}`);
}

async function fsRead({ path: relativePath } = {}) {
  if (!relativePath) throw new Error('path is required');
  return await fs.readFile(resolveInsideWorkspace(relativePath), 'utf8');
}

async function fsWrite({ path: relativePath, content = '' } = {}) {
  if (!relativePath) throw new Error('path is required');
  const target = resolveInsideWorkspace(relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, 'utf8');
  return { path: path.relative(workspace, target), bytes: Buffer.byteLength(content, 'utf8') };
}

async function fsSearch({ query, extensions = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.md'] } = {}) {
  if (!query) throw new Error('query is required');
  const results = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (['.git', 'node_modules'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (extensions.includes(path.extname(entry.name))) {
        const text = await fs.readFile(full, 'utf8');
        if (text.includes(query)) results.push(path.relative(workspace, full));
      }
    }
  }
  await walk(workspace);
  return results;
}

export async function executeTool(name, args) {
  switch (name) {
    case 'fs.list': return fsList(args);
    case 'fs.read': return fsRead(args);
    case 'fs.write': return fsWrite(args);
    case 'fs.search': return fsSearch(args);
    default: throw new Error(`unknown tool: ${name}`);
  }
}
