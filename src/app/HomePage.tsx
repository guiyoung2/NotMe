import type { JSX } from 'react';
import { Link } from 'react-router-dom';

const games = [
  { to: '/stopwatch', title: '스톱워치', description: '두 숫자의 곱으로 결정' },
  { to: '/ladder', title: '사다리 타기', description: '결과를 타고 내려가요' },
  { to: '/marble', title: '마블 룰렛', description: '구슬들의 랜덤 레이스' },
] as const;

export function HomePage(): JSX.Element {
  return (
    <main>
      <h1>NOT ME</h1>
      <h2>게임 선택</h2>
      <ul>
        {games.map((game) => (
          <li key={game.to}>
            <Link to={game.to}>{game.title}</Link>
            <p>{game.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
