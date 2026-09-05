import type { JSX } from 'react';

type PlaceholderGamePageProps = {
  title: string;
};

export function PlaceholderGamePage({ title }: PlaceholderGamePageProps): JSX.Element {
  return (
    <main>
      <h1>{title}</h1>
    </main>
  );
}
