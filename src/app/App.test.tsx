import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('App', () => {
  it('NotMe 홈을 렌더링한다', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '게임 선택' })).toBeInTheDocument();
  });

  it.each([
    ['스톱워치', '/stopwatch'],
    ['사다리 타기', '/ladder'],
    ['마블 룰렛', '/marble'],
  ])('%s 링크가 올바른 경로를 가리킨다', (name, href) => {
    render(<App />);
    expect(screen.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', href);
  });

  it.each([
    ['/', '게임 선택'],
    ['/stopwatch', '스톱워치'],
    ['/ladder', '사다리 타기'],
    ['/marble', '마블 룰렛'],
  ])('%s 루트 배포 경로를 렌더링한다', (pathname, heading) => {
    window.history.replaceState({}, '', pathname);

    render(<App />);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
