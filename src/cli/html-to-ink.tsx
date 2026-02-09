import React from 'react';
import type { ReactElement } from 'react';
import { Text, Box, Newline } from 'ink';
import * as cheerio from 'cheerio';
import type { AnyNode, Element as DomElement } from 'domhandler';

function convertChildren(nodes: cheerio.Cheerio<AnyNode>, $: cheerio.CheerioAPI): ReactElement[] {
  const elements: ReactElement[] = [];

  nodes.each((i, node) => {
    if (node.type === 'text') {
      const text = (node as any).data as string;
      if (text) {
        elements.push(<Text key={i}>{text}</Text>);
      }
      return;
    }

    if (node.type !== 'tag') return;

    const el = node as DomElement;
    const tagName = el.tagName.toLowerCase();
    const children = convertChildren($(el).contents(), $);

    switch (tagName) {
      case 'nav':
      case 'form':
      case 'input':
      case 'label':
      case 'button':
        // Skip non-interactive elements in CLI
        break;

      case 'div':
      case 'main':
        elements.push(
          <Box key={i} flexDirection="column">{children}</Box>
        );
        break;

      case 'h1':
      case 'h2':
      case 'h3':
        elements.push(
          <Box key={i} flexDirection="column">
            <Text bold>{children}</Text>
            <Newline />
          </Box>
        );
        break;

      case 'p':
        elements.push(
          <Box key={i} flexDirection="column">
            <Text>{children}</Text>
            <Newline />
          </Box>
        );
        break;

      case 'ul':
        elements.push(
          <Box key={i} flexDirection="column">{children}</Box>
        );
        break;

      case 'li':
        elements.push(
          <Text key={i}>  - {children}</Text>
        );
        break;

      case 'dl':
        elements.push(
          <Box key={i} flexDirection="column">{children}</Box>
        );
        break;

      case 'dt':
        elements.push(
          <Text key={i} bold>{children}: </Text>
        );
        break;

      case 'dd':
        elements.push(
          <Box key={i} flexDirection="column">
            <Text>  {children}</Text>
            <Newline />
          </Box>
        );
        break;

      case 'a': {
        const href = $(el).attr('href') ?? '';
        elements.push(
          <Text key={i}>{children} ({href})</Text>
        );
        break;
      }

      case 'span':
        elements.push(
          <Text key={i}>{children}</Text>
        );
        break;

      default:
        // Pass through any unknown tags as a column box
        elements.push(
          <Box key={i} flexDirection="column">{children}</Box>
        );
        break;
    }
  });

  return elements;
}

export function htmlToInk(html: string): ReactElement {
  const $ = cheerio.load(html);
  const children = convertChildren($.root().contents(), $);
  return <Box flexDirection="column">{children}</Box>;
}
