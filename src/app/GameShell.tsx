import type { JSX, KeyboardEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
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
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const homeButtonRef = useRef<HTMLButtonElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreFocusRef = useRef(false);
  const isHomeConfirmation = confirmationAction === 'home';
  const dialogTitle = isHomeConfirmation ? '현재 게임을 종료할까요?' : '현재 게임을 초기화할까요?';

  useEffect(() => {
    if (confirmationAction) {
      cancelButtonRef.current?.focus();
      return;
    }

    if (shouldRestoreFocusRef.current) {
      triggerRef.current?.focus();
      shouldRestoreFocusRef.current = false;
    }
  }, [confirmationAction]);

  function handleHome() {
    if (dirty) {
      triggerRef.current = homeButtonRef.current;
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
      shouldRestoreFocusRef.current = true;
      onReset();
    }

    setConfirmationAction(null);
  }

  function handleCancel() {
    shouldRestoreFocusRef.current = true;
    setConfirmationAction(null);
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;

    const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
    const firstButton = buttons[0];
    const lastButton = buttons.at(-1);

    if (!firstButton || !lastButton) return;

    if (event.shiftKey && document.activeElement === firstButton) {
      event.preventDefault();
      lastButton.focus();
    }

    if (!event.shiftKey && document.activeElement === lastButton) {
      event.preventDefault();
      firstButton.focus();
    }
  }

  return (
    <div className="app">
      <div className="app__content game-shell">
        <header className="game-shell__header">
          <button ref={homeButtonRef} type="button" onClick={handleHome}>홈으로</button>
          <h1>{title}</h1>
          <button
            ref={resetButtonRef}
            type="button"
            onClick={() => {
              triggerRef.current = resetButtonRef.current;
              setConfirmationAction('reset');
            }}
          >
            초기화
          </button>
        </header>
        <main className="game-shell__main">{children}</main>
      </div>

      {confirmationAction && (
        <div className="dialog-backdrop">
          <section ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" onKeyDown={handleDialogKeyDown}>
            <h2 id="confirmation-title">{dialogTitle}</h2>
            <p>{isHomeConfirmation ? '진행 중인 내용은 사라집니다.' : '현재 게임을 처음부터 다시 시작합니다.'}</p>
            <div className="dialog__actions">
              <button ref={cancelButtonRef} type="button" onClick={handleCancel}>취소</button>
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
