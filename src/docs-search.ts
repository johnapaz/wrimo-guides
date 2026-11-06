export type Guide = {title: string; url: string; text: string};

const normalize = (text: string) => text.normalize('NFKD').toLocaleLowerCase().replace(/\p{M}/gu, '');

// Search only the rendered public guides; query text never leaves the browser.
export function searchGuides(guides: Guide[], query: string): Guide[] {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return guides.filter(guide => {
    const text = normalize(`${guide.title} ${guide.text}`);
    return terms.every(term => text.includes(term));
  });
}
