import type { ReactElement } from 'react';
import { Text, Box, Newline } from 'ink';
import * as cheerio from 'cheerio';
import type { AnyNode, Element as DomElement } from 'domhandler';

export interface LinkInfo {
  href: string;
  text: string;
}

export type InteractiveItem =
  | { type: 'link'; href: string; text: string }
  | { type: 'field'; name: string; label: string; required: boolean }
  | { type: 'submit'; action: string; method: string };

export interface HtmlToInkOptions {
  interactive?: boolean;
  selectedItemIndex?: number;
  /** @deprecated Use selectedItemIndex instead */
  selectedLinkIndex?: number;
  fieldValues?: Record<string, string>;
  columns?: number;
}

export function extractLinks(html: string): LinkInfo[] {
  const $ = cheerio.load(html);
  const links: LinkInfo[] = [];
  $('a').each((_i, el) => {
    links.push({
      href: $(el).attr('href') ?? '',
      text: $(el).text(),
    });
  });
  return links;
}

export function extractInteractiveItems(html: string): InteractiveItem[] {
  const $ = cheerio.load(html);
  const items: InteractiveItem[] = [];

  function walk(nodes: cheerio.Cheerio<AnyNode>) {
    nodes.each((_i, node) => {
      if (node.type !== 'tag') return;
      const el = node as DomElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'a') {
        items.push({
          type: 'link',
          href: $(el).attr('href') ?? '',
          text: $(el).text(),
        });
      } else if (tag === 'form') {
        const action = $(el).attr('action') ?? '';
        const method = ($(el).attr('method') ?? 'GET').toUpperCase();

        // Extract fields from this form
        $(el).find('input[type="text"], input:not([type])').each((_j, inp) => {
          const name = $(inp).attr('name') ?? '';
          const id = $(inp).attr('id') ?? '';
          const required = $(inp).attr('required') !== undefined;
          // Find label by for attribute or parent label
          let label = '';
          if (id) {
            const labelEl = $(el).find(`label[for="${id}"]`);
            if (labelEl.length) {
              label = labelEl.text().replace(/\s*\*\s*$/, '').trim();
            }
          }
          if (!label) {
            const parentLabel = $(inp).closest('label');
            if (parentLabel.length) {
              label = parentLabel.text().replace(/\s*\*\s*$/, '').trim();
            }
          }
          if (!label) label = name;
          items.push({ type: 'field', name, label, required });
        });

        items.push({ type: 'submit', action, method });
      } else {
        walk($(el).contents());
      }
    });
  }

  walk($.root().contents());
  return items;
}

interface ConvertContext {
  interactive: boolean;
  selectedItemIndex: number;
  itemCounter: { value: number };
  fieldValues: Record<string, string>;
  columns: number;
}

function rule(columns: number): ReactElement {
  return <Text dimColor>{'─'.repeat(columns)}</Text>;
}

function convertChildren(
  nodes: cheerio.Cheerio<AnyNode>,
  $: cheerio.CheerioAPI,
  ctx: ConvertContext,
): ReactElement[] {
  const elements: ReactElement[] = [];

  nodes.each((i, node) => {
    if (node.type === 'text') {
      const text = (node as any).data as string;
      if (text) {
        if (ctx.interactive) {
          // Dim nav separators (pipes)
          const trimmed = text.trim();
          if (trimmed === '|') {
            elements.push(<Text key={i} dimColor> │ </Text>);
            return;
          }
        }
        elements.push(<Text key={i}>{text}</Text>);
      }
      return;
    }

    if (node.type !== 'tag') return;

    const el = node as DomElement;
    const tagName = el.tagName.toLowerCase();

    switch (tagName) {
      case 'nav':
        if (ctx.interactive) {
          const children = convertChildren($(el).contents(), $, ctx);
          elements.push(
            <Box key={i} flexDirection="column">
              <Box flexDirection="row">{children}</Box>
              {rule(ctx.columns)}
            </Box>
          );
        }
        // Non-interactive: skip nav
        break;

      case 'form':
        if (ctx.interactive) {
          // Render form fields and submit button as interactive items
          const formElements: ReactElement[] = [];
          const action = $(el).attr('action') ?? '';
          const method = ($(el).attr('method') ?? 'GET').toUpperCase();

          // Find error message
          const alertEl = $(el).find('[role="alert"]');
          if (alertEl.length) {
            formElements.push(
              <Text key="error" color="red">{'  ⚠ ' + alertEl.text()}</Text>
            );
          }

          // Render each input field
          $(el).find('input[type="text"], input:not([type])').each((_j, inp) => {
            const name = $(inp).attr('name') ?? '';
            const id = $(inp).attr('id') ?? '';
            const required = $(inp).attr('required') !== undefined;
            let label = '';
            if (id) {
              const labelEl = $(el).find(`label[for="${id}"]`);
              if (labelEl.length) {
                label = labelEl.text().replace(/\s*\*\s*$/, '').trim();
              }
            }
            if (!label) label = name;

            const fieldIndex = ctx.itemCounter.value++;
            const isSelected = fieldIndex === ctx.selectedItemIndex;
            const value = ctx.fieldValues[name] ?? '';
            const reqMark = required ? ' *' : '';
            const prefix = isSelected ? '▸ ' : '  ';
            const fieldDisplay = value || '___________';

            formElements.push(
              <Text key={`field-${name}`} inverse={isSelected}>
                {`${prefix}${label}${reqMark}: ${fieldDisplay}`}
              </Text>
            );
          });

          // Render submit button
          const buttonText = $(el).find('button[type="submit"], button').first().text() || 'Submit';
          const submitIndex = ctx.itemCounter.value++;
          const isSubmitSelected = submitIndex === ctx.selectedItemIndex;

          formElements.push(
            <Box key="submit-row" flexDirection="row">
              <Text color="green">{isSubmitSelected ? '▸ ' : '  '}</Text>
              <Text inverse={isSubmitSelected} bold color={isSubmitSelected ? undefined : 'green'}>
                {` ${buttonText} `}
              </Text>
            </Box>
          );

          elements.push(
            <Box key={i} flexDirection="column">{formElements}</Box>
          );
        }
        // Non-interactive: skip form
        break;

      case 'input':
      case 'label':
      case 'button':
        // Skip standalone form elements
        break;

      case 'div':
      case 'main':
        elements.push(
          <Box key={i} flexDirection="column">{convertChildren($(el).contents(), $, ctx)}</Box>
        );
        break;

      case 'h1':
        elements.push(
          <Box key={i} flexDirection="column">
            <Text bold color="green">{convertChildren($(el).contents(), $, ctx)}</Text>
          </Box>
        );
        break;

      case 'h2':
      case 'h3':
        elements.push(
          <Box key={i} flexDirection="column">
            <Text bold color="yellow">{convertChildren($(el).contents(), $, ctx)}</Text>
          </Box>
        );
        break;

      case 'p': {
        const pEl = $(el);
        if (pEl.attr('role') === 'alert') {
          elements.push(
            <Box key={i} flexDirection="column">
              <Text color="red">{convertChildren($(el).contents(), $, ctx)}</Text>
            </Box>
          );
        } else {
          elements.push(
            <Box key={i} flexDirection="column">
              <Text>{convertChildren($(el).contents(), $, ctx)}</Text>
              <Newline />
            </Box>
          );
        }
        break;
      }

      case 'ul':
        elements.push(
          <Box key={i} flexDirection="column">{convertChildren($(el).contents(), $, ctx)}</Box>
        );
        break;

      case 'li':
        elements.push(
          <Text key={i}>  <Text color="green">▸</Text> {convertChildren($(el).contents(), $, ctx)}</Text>
        );
        break;

      case 'dl':
        elements.push(
          <Box key={i} flexDirection="column">{convertChildren($(el).contents(), $, ctx)}</Box>
        );
        break;

      case 'dt':
        elements.push(
          <Text key={i} color="yellow" bold>{convertChildren($(el).contents(), $, ctx)}</Text>
        );
        break;

      case 'dd':
        elements.push(
          <Box key={i} flexDirection="column">
            <Text>  {convertChildren($(el).contents(), $, ctx)}</Text>
            <Newline />
          </Box>
        );
        break;

      case 'a': {
        const href = $(el).attr('href') ?? '';
        const children = convertChildren($(el).contents(), $, ctx);
        if (ctx.interactive) {
          const linkIndex = ctx.itemCounter.value++;
          const isSelected = linkIndex === ctx.selectedItemIndex;
          elements.push(
            <Text key={i} inverse={isSelected} color={isSelected ? undefined : 'cyan'} bold={isSelected} underline={!isSelected}>
              {children}
            </Text>
          );
        } else {
          elements.push(
            <Text key={i}>{children} ({href})</Text>
          );
        }
        break;
      }

      case 'span':
        elements.push(
          <Text key={i}>{convertChildren($(el).contents(), $, ctx)}</Text>
        );
        break;

      default:
        // Pass through any unknown tags as a column box
        elements.push(
          <Box key={i} flexDirection="column">{convertChildren($(el).contents(), $, ctx)}</Box>
        );
        break;
    }
  });

  return elements;
}

export function htmlToInk(html: string, options?: HtmlToInkOptions): ReactElement {
  const $ = cheerio.load(html);
  const selectedIndex = options?.selectedItemIndex ?? options?.selectedLinkIndex ?? -1;
  const ctx: ConvertContext = {
    interactive: options?.interactive ?? false,
    selectedItemIndex: selectedIndex,
    itemCounter: { value: 0 },
    fieldValues: options?.fieldValues ?? {},
    columns: options?.columns ?? 60,
  };
  const children = convertChildren($.root().contents(), $, ctx);
  return <Box flexDirection="column">{children}</Box>;
}
