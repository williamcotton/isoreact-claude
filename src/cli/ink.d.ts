declare module 'ink' {
  import type { FC, ReactNode, ReactElement } from 'react';

  interface BoxProps {
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    children?: ReactNode;
  }

  interface TextProps {
    bold?: boolean;
    children?: ReactNode;
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
  export function render(tree: ReactElement): RenderInstance;
}
