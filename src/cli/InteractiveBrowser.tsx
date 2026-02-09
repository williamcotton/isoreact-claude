import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import type { CliApp } from './cli-app';
import { htmlToInk, extractInteractiveItems } from './html-to-ink';
import type { InteractiveItem } from './html-to-ink';

interface InteractiveBrowserProps {
  app: CliApp;
  initialPath: string;
}

interface PageState {
  url: string;
  html: string;
  items: InteractiveItem[];
  selectedIndex: number;
  statusCode: number;
  loading: boolean;
}

export function InteractiveBrowser({ app, initialPath }: InteractiveBrowserProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [page, setPage] = useState<PageState>({
    url: initialPath,
    html: '',
    items: [],
    selectedIndex: 0,
    statusCode: 200,
    loading: true,
  });
  const [mode, setMode] = useState<'browse' | 'edit'>('browse');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const navigate = useCallback(async (path: string, method?: string, body?: string) => {
    const result = await app.exec(path, method, body);
    setPage({
      url: path,
      html: result.html,
      items: extractInteractiveItems(result.html),
      selectedIndex: 0,
      statusCode: result.statusCode,
      loading: false,
    });
    setFieldValues({});
    setMode('browse');
  }, [app]);

  useEffect(() => {
    navigate(initialPath);
  }, []);

  // Browse mode input handler
  useInput((input, key) => {
    if (input === 'q') {
      exit();
      return;
    }

    if (page.items.length === 0) return;

    if (key.upArrow || key.leftArrow || input === 'k') {
      setPage((prev) => ({ ...prev, selectedIndex: prev.selectedIndex <= 0 ? prev.items.length - 1 : prev.selectedIndex - 1 }));
    } else if (key.downArrow || key.rightArrow || input === 'j') {
      setPage((prev) => ({ ...prev, selectedIndex: prev.selectedIndex >= prev.items.length - 1 ? 0 : prev.selectedIndex + 1 }));
    } else if (key.return) {
      const item = page.items[page.selectedIndex];
      if (!item) return;
      if (item.type === 'link') {
        navigate(item.href);
      } else if (item.type === 'field') {
        setMode('edit');
      } else if (item.type === 'submit') {
        const parts = Object.entries(fieldValues)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');
        navigate(item.action, item.method, parts);
      }
    }
  }, { isActive: mode === 'browse' });

  // Edit mode input handler
  useInput((input, key) => {
    const item = page.items[page.selectedIndex];
    if (!item || item.type !== 'field') {
      setMode('browse');
      return;
    }
    const fieldName = item.name;

    if (key.return || key.escape) {
      setMode('browse');
      return;
    }

    if (key.tab) {
      // Move to next field, stay in edit mode
      const nextIndex = page.selectedIndex + 1;
      if (nextIndex < page.items.length && page.items[nextIndex]!.type === 'field') {
        setPage((prev) => ({ ...prev, selectedIndex: nextIndex }));
      } else {
        setMode('browse');
      }
      return;
    }

    if (key.backspace || key.delete) {
      setFieldValues((prev) => ({
        ...prev,
        [fieldName]: (prev[fieldName] ?? '').slice(0, -1),
      }));
      return;
    }

    // Printable characters
    if (input && !key.ctrl && !key.meta) {
      setFieldValues((prev) => ({
        ...prev,
        [fieldName]: (prev[fieldName] ?? '') + input,
      }));
    }
  }, { isActive: mode === 'edit' });

  // Use terminal height so ink always uses its clearTerminal path,
  // which clears the whole screen on every render. Without this,
  // ink's log-update line counter gets stale when output exceeds
  // terminal height, leaving ghost content on navigation.
  const terminalHeight = stdout.rows || 24;
  const columns = stdout.columns || 80;

  if (page.loading) {
    return (
      <Box flexDirection="column" minHeight={terminalHeight}>
        <Text dimColor>Loading {page.url}...</Text>
      </Box>
    );
  }

  const content = htmlToInk(page.html, {
    interactive: true,
    selectedItemIndex: page.selectedIndex,
    fieldValues,
    columns,
  });
  const selectedItem = page.items[page.selectedIndex];
  const ruler = '─'.repeat(columns);

  let statusText: string;
  if (!selectedItem) {
    statusText = 'No interactive items';
  } else if (mode === 'edit' && selectedItem.type === 'field') {
    statusText = `  Editing: ${selectedItem.name}  │  Enter: done  Esc: cancel`;
  } else if (selectedItem.type === 'link') {
    statusText = `  ▸ ${selectedItem.href}  │  ${page.selectedIndex + 1}/${page.items.length}  │  ↑↓: navigate  Enter: follow  q: quit`;
  } else if (selectedItem.type === 'field') {
    statusText = `  ${page.selectedIndex + 1}/${page.items.length}  │  Enter: edit  ↑↓: navigate  q: quit`;
  } else if (selectedItem.type === 'submit') {
    statusText = `  ${page.selectedIndex + 1}/${page.items.length}  │  Enter: submit  ↑↓: navigate  q: quit`;
  } else {
    statusText = `  ${page.selectedIndex + 1}/${page.items.length}  │  ↑↓: navigate  q: quit`;
  }

  const statusColor = page.statusCode >= 400 ? 'red' : page.statusCode >= 300 ? 'yellow' : 'green';

  return (
    <Box flexDirection="column" minHeight={terminalHeight}>
      <Box flexDirection="row">
        <Text color={statusColor} bold>{page.statusCode} </Text>
        <Text bold>{page.url}</Text>
      </Box>
      {content}
      <Text dimColor>{ruler}</Text>
      <Text dimColor>{statusText}</Text>
    </Box>
  );
}
