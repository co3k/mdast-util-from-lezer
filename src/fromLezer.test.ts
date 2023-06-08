import { test, expect } from 'vitest';
import { Tree, NodeSet, NodeType } from "@lezer/common";
import { parser } from "@lezer/markdown";
import { fromLezer } from './fromLezer.js';


const removeData = (node: any): any => {
  if (Array.isArray(node.children)) {
    node.children = node.children.map(removeData);
  }
  delete node.data;
  return node;
};

test('converts a document', async () => {
  const input = '# Heading\n\nParagraph';
  const tree = parser.parse(input);
  const result = fromLezer(input, tree);
  const expected = {
    type: 'root',
    children: [
      {
        type: 'heading',
        depth: 1,
        children: [{ type: 'text', value: 'Heading' }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', value: 'Paragraph' }],
      },
    ],
  };

  expect(removeData(result)).toEqual(expected);
});

test('converts a code block', async () => {
  const input = '```\nCode\nblock\n```';
  const tree = parser.parse(input);
  const result = fromLezer(input, tree);
  const expected = {
    type: 'root',
    children: [
      {
        type: 'code',
        lang: null,
        value: 'Code\nblock',
      },
    ],
  };
  expect(removeData(result)).toEqual(expected);
});

test('converts a fenced code block with language', async () => {
  const input = '```javascript\nconst a = 1;\nconst b = 2;\n```';
  const tree = parser.parse(input);
  const result = fromLezer(input, tree);
  const expected = {
    type: 'root',
    children: [
      {
        type: 'code',
        lang: 'javascript',
        value: 'const a = 1;\nconst b = 2;',
      },
    ],
  };
  expect(removeData(result)).toEqual(expected);
});

test('converts a list', async () => {
  const input = '- Item 1\n- Item 2';
  const tree = parser.parse(input);
  const result = fromLezer(input, tree);
  const expected = {
    type: 'root',
    children: [
      {
        type: 'list',
        ordered: false,
        start: undefined,
        children: [
          {
            type: 'listItem',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', value: 'Item 1' }],
              },
            ],
          },
          {
            type: 'listItem',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', value: 'Item 2' }],
              },
            ],
          },
        ],
      },
    ],
  };
  expect(removeData(result)).toEqual(expected);
});

test('converts a link', async () => {
  const input = '[Link](https://example.com)';
  const tree = parser.parse(input);
  const result = fromLezer(input, tree);
  const expected = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'link',
            url: 'https://example.com',
            title: undefined,
            children: [{ type: 'text', value: 'Link' }],
          },
        ],
      },
    ],
  };
  expect(removeData(result)).toEqual(expected);
});

test('converts an image', async () => {
  const input = '![Alt text](https://example.com/image.jpg "Image title")';
  const tree = parser.parse(input);
  const result = fromLezer(input, tree);
  const expected = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'image',
            url: 'https://example.com/image.jpg',
            title: 'Image title',
            alt: 'Alt text',
          },
        ],
      },
    ],
  };
  expect(removeData(result)).toEqual(expected);
});
