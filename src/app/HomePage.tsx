import type { JSX } from 'react';
import { Link } from 'react-router-dom';

const games = [
  { to: '/stopwatch', title: '스톱워치', description: '두 숫자의 곱으로 결정' },
  { to: '/ladder', title: '사다리 타기', description: '결과를 타고 내려가요' },
  { to: '/marble', title: '마블 룰렛', description: '구슬들의 랜덤 레이스' },
] as const;

export function HomePage(): JSX.Element {
  return (
    <main className="app">
      <div className="app__content home-page">
        <h1>NOT ME</h1>
        <h2>게임 선택</h2>
        <ul className="game-list">
          {games.map((game, index) => (
            <li key={game.to}>
              <Link className="game-list__link" to={game.to}>
                <span className="game-list__icon" aria-hidden="true">{['×', '⌁', '●'][index]}</span>
                <span>
                  <strong>{game.title}</strong>
                  <span>{game.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
