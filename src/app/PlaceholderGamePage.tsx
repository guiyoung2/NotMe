import type { JSX } from 'react';
import { GameShell } from './GameShell';

type PlaceholderGamePageProps = {
  title: string;
};

export function PlaceholderGamePage({ title }: PlaceholderGamePageProps): JSX.Element {
  return (
    <GameShell title={title} dirty={false} onReset={() => {}}>
      <p className="placeholder-game">게임을 준비하고 있어요.</p>
    </GameShell>
  );
}
