import React, {type ReactNode} from 'react';
import GuideSearch from '@site/src/components/GuideSearch';

// The classic theme renders @theme/SearchBar in the navbar of every page; it ships none by default.
export default function SearchBar(): ReactNode {
  return <GuideSearch variant="navbar" id="docs-search-navbar" label="Search guides" />;
}
