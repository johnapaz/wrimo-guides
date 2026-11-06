// Fails the build when a public page links into internal material: the private
// application repository (including repo docs/) or any file outside website/docs/.
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const publicDocsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs');
const privateRepo = /^(?:https?:)?\/\/(?:www\.)?(?:github\.com|raw\.githubusercontent\.com)\/johnapaz\/writemo(?:[/?#]|$)/i;

export function internalLinkReason(url, fromFile) {
  if (!url) return null;
  if (privateRepo.test(url)) return 'links to the private application repository';
  if (/^[a-z][a-z0-9+.-]*:|^\/\/|^#|^\//i.test(url)) return null;
  const target = path.resolve(path.dirname(fromFile), decodeURI(url.split(/[?#]/)[0]));
  const inside = path.relative(publicDocsDir, target);
  if (inside.startsWith('..') || path.isAbsolute(inside)) return 'resolves outside website/docs/ (for example into repo docs/)';
  return null;
}

function urlsOf(node) {
  if (['link', 'image', 'definition'].includes(node.type)) return [node.url];
  if (node.type?.startsWith('mdxJsx')) return (node.attributes || [])
    .filter(a => ['href', 'src', 'to'].includes(a.name) && typeof a.value === 'string').map(a => a.value);
  return [];
}

export default function noInternalLinks() {
  return (tree, file) => {
    const problems = [];
    const walk = node => {
      for (const url of urlsOf(node)) {
        const reason = internalLinkReason(url, file.path);
        if (reason) problems.push(`${url} ${reason}`);
      }
      node.children?.forEach(walk);
    };
    walk(tree);
    if (problems.length) throw new Error(`Internal link in public page ${file.path}:\n- ${problems.join('\n- ')}`);
  };
}
