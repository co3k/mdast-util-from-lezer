import { test, expect } from 'vitest';
import { Tree, NodeSet, NodeType } from "@lezer/common";
import { parser } from "@lezer/markdown";
import { fromLezer } from './fromLezer.js';

const nodeSet = new NodeSet([
  NodeType.define({id: 0, name: "Document"}),
]);

test('h1', () => {
  const text = "# foo";
  const parsed = parser.parse(text);
  const result = fromLezer(text, parsed);

  expect(result.type).toEqual("root");
  expect(result.children?.length).toEqual(1);
  expect(result.children[0].type).toEqual("heading");
  expect(result.children[0].depth).toEqual(1);
  expect(result.children[0].children?.length).toEqual(1);
  expect(result.children[0].children[0].value).toEqual("foo");
});
