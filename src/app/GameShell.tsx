import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type GameShellProps = {
  title: string;
  dirty: boolean;
  onReset: () => void;
  children: ReactNode;
};

type ConfirmationAction = 'home' | 'reset' | null;

export function GameShell({ title, dirty, onReset, children }: GameShellProps): JSX.Element {
  const navigate = useNavigate();
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction>(null);
  const isHomeConfirmation = confirmationAction === 'home';
  const dialogTitle = isHomeConfirmation ? '현재 게임을 종료할까요?' : '현재 게임을 초기화할까요?';

  function handleHome() {
    if (dirty) {
      setConfirmationAction('home');
      return;
    }

    navigate('/');
  }

  function handleConfirm() {
    if (confirmationAction === 'home') {
      onReset();
      navigate('/');
    }

    if (confirmationAction === 'reset') {
      onReset();
    }

    setConfirmationAction(null);
  }

  return (
    <div className="app">
      <div className="app__content game-shell">
        <header className="game-shell__header">
          <button type="button" onClick={handleHome}>홈으로</button>
          <h1>{title}</h1>
          <button type="button" onClick={() => setConfirmationAction('reset')}>초기화</button>
        </header>
        <main className="game-shell__main">{children}</main>
      </div>

      {confirmationAction && (
        <div className="dialog-backdrop">
          <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
            <h2 id="confirmation-title">{dialogTitle}</h2>
            <p>{isHomeConfirmation ? '진행 중인 내용은 사라집니다.' : '현재 게임을 처음부터 다시 시작합니다.'}</p>
            <div className="dialog__actions">
              <button type="button" onClick={() => setConfirmationAction(null)}>취소</button>
              <button type="button" className="button--accent" onClick={handleConfirm}>
                {isHomeConfirmation ? '종료' : '초기화'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
