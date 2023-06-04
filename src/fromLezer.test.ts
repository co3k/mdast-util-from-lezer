import { test, expect } from 'vitest';
import { Tree, NodeSet, NodeType } from "@lezer/common";
import { fromLezer } from './fromLezer.js';

const nodeSet = new NodeSet([
  NodeType.define({id: 0, name: "Document"}),
]);

test('fromLezer', () => {
  const result = fromLezer("", new Tree(nodeSet.types[0], [], [0], 2));
  console.log(result);
  expect(result.type).toEqual("root");
});
