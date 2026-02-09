declare module 'ink' {
  import type { FC, ReactNode, ReactElement } from 'react';

  interface BoxProps {
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    minHeight?: number | string;
    children?: ReactNode;
  }

  interface TextProps {
    bold?: boolean;
    color?: string;
    underline?: boolean;
    inverse?: boolean;
    dimColor?: boolean;
    children?: ReactNode;
  }

  interface Key {
    upArrow: boolean;
    downArrow: boolean;
    leftArrow: boolean;
    rightArrow: boolean;
    return: boolean;
    escape: boolean;
    backspace: boolean;
    delete: boolean;
    tab: boolean;
    shift: boolean;
    ctrl: boolean;
    meta: boolean;
  }

  interface RenderOptions {
    exitOnCtrlC?: boolean;
  }

  interface RenderInstance {
    unmount: () => void;
    waitUntilExit: () => Promise<void>;
    rerender: (tree: ReactElement) => void;
    clear: () => void;
  }

  export const Box: FC<BoxProps>;
  export const Text: FC<TextProps>;
  export const Newline: FC;
  export const Spacer: FC;
  export function render(tree: ReactElement, options?: RenderOptions): RenderInstance;
  interface UseInputOptions {
    isActive?: boolean;
  }

  export function useInput(handler: (input: string, key: Key) => void, options?: UseInputOptions): void;
  export function useApp(): { exit: () => void };
  export function useStdout(): { stdout: NodeJS.WriteStream; write: (data: string) => void };
}
