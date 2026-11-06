import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import type {Props} from '@theme/NotFound/Content';
import GuideSearch from '@site/src/components/GuideSearch';

export default function NotFoundContent({className}: Props): ReactNode {
  return (
    <main className={clsx('container margin-vert--xl', className)}>
      <div className="row">
        <div className="col col--8 col--offset-2">
          <Heading as="h1">Oh dang! We couldn't find what you're after.</Heading>
          <GuideSearch variant="page" id="docs-search" label="Search the docs" />
          <ul>
            <li><Link to="/">Getting started</Link></li>
            <li><Link to="/saving-and-backup">Saving and backup</Link></li>
            <li><Link to="/limitations">Limitations</Link></li>
          </ul>
        </div>
      </div>
    </main>
  );
}
