import React, {type ReactNode, useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useLocation} from '@docusaurus/router';
import {searchGuides, type Guide} from '@site/src/docs-search';

type Props = {
  // 'navbar' appears on every guide page; 'page' is the 404 page's inline search.
  variant: 'navbar' | 'page';
  id: string;
  label: string;
};

// Searches the generated public-only index. Each search fetches it again, so a failed fetch can be retried.
export default function GuideSearch({variant, id, label}: Props): ReactNode {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Guide[] | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const indexUrl = useBaseUrl('/search-index.json');
  const {pathname} = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const navbar = variant === 'navbar';
  const browse = navbar ? '' : ' or browse below';

  function close() {
    setResults(null);
    setMessage('');
  }

  // Following a result closes the navbar panel.
  useEffect(() => { if (navbar) close(); }, [pathname, navbar]);

  useEffect(() => {
    if (!navbar || !message) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [navbar, message]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || busy) return;
    setBusy(true);
    setMessage('Searching…');
    setResults(null);
    try {
      const response = await fetch(indexUrl);
      if (!response.ok) throw new Error('Search unavailable');
      const matches = searchGuides(await response.json(), query);
      setResults(matches);
      setMessage(matches.length ? `${matches.length} ${matches.length === 1 ? 'guide' : 'guides'} found.` : `No guides found. Try another search${browse}.`);
    } catch {
      setMessage(`Search is unavailable right now. Try again${browse}.`);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (navbar && event.key === 'Escape' && message) {
      close();
      input.current?.focus();
    }
  }

  const found = results && results.length > 0 && (
    <ul aria-label="Search results" className={navbar ? 'wrimo-docs-search__results' : undefined}>{results.map(guide => (
      <li key={guide.url}><Link to={guide.url}>{guide.title}</Link></li>
    ))}</ul>
  );

  return (
    <div ref={root} onKeyDown={onKeyDown} className={navbar ? 'wrimo-docs-search-navbar' : undefined}>
      <form role="search" onSubmit={search} className={navbar ? undefined : 'margin-vert--lg'}>
        <label htmlFor={id} className={navbar ? 'wrimo-visually-hidden' : undefined}>{label}</label>
        <div className="wrimo-docs-search">
          <input ref={input} id={id} type="search" placeholder={navbar ? 'Search guides' : 'What are you looking for?'}
            value={query} onChange={event => setQuery(event.target.value)} required />
          <button type="submit" className={clsx('button', navbar ? 'button--secondary button--sm' : 'button--primary')} disabled={busy}>Search</button>
        </div>
      </form>
      {navbar ? (
        <div className="wrimo-docs-search__panel" hidden={!message}>
          <p role="status" aria-live="polite">{message}</p>
          {found}
        </div>
      ) : (
        <>
          <p role="status" aria-live="polite">{message}</p>
          {found}
        </>
      )}
    </div>
  );
}
