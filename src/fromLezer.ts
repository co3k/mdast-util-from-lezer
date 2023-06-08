import { Tree, TreeCursor } from "@lezer/common";
import {
  Heading, PhrasingContent, PhrasingContentMap, StaticPhrasingContent,
  StaticPhrasingContentMap, BlockContent, BlockContentMap,
  Code, List, ListItem, Link, Image, InlineCode, HTML, Text,
} from "mdast";
import { Node as UnistNode, Parent } from "unist";

interface Node extends UnistNode {
  data: { from: number, to: number };
  children?: Node[];
}

export const fromLezer = (source: string, tree: Tree) => {
  const rootNode = tree.topNode;
  return convertNode(source, rootNode.cursor());
};

function getChildrenNodes(source: string, cursor: TreeCursor): Node[] {
  const children: Node[] = [];
  let leadingWhitespace = true;

  if (cursor.firstChild()) {
    do {
      const prevNodeEnd = children.length > 0 ? children[children.length - 1].data.to : cursor.from;
      if (prevNodeEnd < cursor.from) {
        const textCursor = cursor.node.cursor();
        textCursor.from = prevNodeEnd;
        textCursor.to = cursor.from;
        children.push(convertText(source, textCursor));
      }

      children.push(convertNode(source, cursor));
    } while (cursor.nextSibling());
    cursor.parent();

    const lastChildEnd = children[children.length - 1].data.to;
    if (lastChildEnd < cursor.to) {
      const textCursor = cursor.node.cursor();
      textCursor.from = lastChildEnd;
      textCursor.to = cursor.to;
      children.push(convertText(source, textCursor));
    }
  } else {
    children.push(convertText(source, cursor));
  }

  return children.filter((child) => {
    if (child.type === "text") {
      const textNode = child as Text & Node;

      if (leadingWhitespace) {
        textNode.value = textNode.value.replace(/^\s+/, "");
        leadingWhitespace = false;
      }
      if (children.indexOf(child) === children.length - 1) {
        textNode.value = textNode.value.replace(/\s+$/, "");
      }
      return textNode.value !== "";
    }
    return true;
  });
}

function convertNode(source: string, cursor: TreeCursor): Node {
  const type = cursor.type.name;
  switch (type) {
    case "Document": return convertDocument(source, cursor);
    case "Paragraph": return convertParagraph(source, cursor);
    case "ATXHeading1": return convertHeading(source, cursor, 1);
    case "ATXHeading2": return convertHeading(source, cursor, 2);
    case "ATXHeading3": return convertHeading(source, cursor, 3);
    case "ATXHeading4": return convertHeading(source, cursor, 4);
    case "ATXHeading5": return convertHeading(source, cursor, 5);
    case "ATXHeading6": return convertHeading(source, cursor, 6);
    case "SetextHeading1": return convertHeading(source, cursor, 1);
    case "SetextHeading2": return convertHeading(source, cursor, 2);
    case "Blockquote": return convertBlockquote(source, cursor);
    case "CodeBlock": return convertCodeBlock(source, cursor);
    case "FencedCode": return convertFencedCode(source, cursor);
    case "BulletList": return convertList(source, cursor, "bullet");
    case "OrderedList": return convertList(source, cursor, "ordered");
    case "ListItem": return convertListItem(source, cursor);
    case "Link": return convertLink(source, cursor);
    case "Image": return convertImage(source, cursor);
    case "Emphasis": return convertEmphasis(source, cursor);
    case "StrongEmphasis": return convertStrongEmphasis(source, cursor);
    case "InlineCode": return convertInlineCode(source, cursor);
    case "HardBreak": return convertHardBreak(source, cursor);
    case "HTMLBlock": return convertHTMLBlock(source, cursor);
    case "HTMLTag": return convertHTMLTag(source, cursor);
    case "URL": return convertURL(source, cursor);
    case "Text": return convertText(source, cursor);
    default: return convertLezerNode(source, cursor);
  }
}

const phrasingContentTypes: (keyof PhrasingContentMap)[] = [
  'link',
  'linkReference',
  'break',
  'emphasis',
  'html',
  'image',
  'imageReference',
  'inlineCode',
  'strong',
  'text',
];

const blockContentTypes: (keyof BlockContentMap)[] = [
    "paragraph",
    "heading",
    "thematicBreak",
    "blockquote",
    "list",
    "table",
    "html",
    "code",
];

const staticPhrasingContentTypes: (keyof StaticPhrasingContentMap)[] = [
    "text",
    "emphasis",
    "strong",
    "delete",
    "html",
    "inlineCode",
    "break",
    "image",
    "imageReference",
    "footnote",
    "footnoteReference",
];

function createBaseNode(type: string, cursor: TreeCursor): Node {
  return { type, data: {from: cursor.from, to: cursor.to} };
}

function isPhrasingContent(node: Node): node is PhrasingContent & Node {
  return phrasingContentTypes.includes(node.type as (keyof PhrasingContentMap));
}

function isStaticPhrasingContent(node: Node): node is StaticPhrasingContent & Node {
  return staticPhrasingContentTypes.includes(node.type as (keyof StaticPhrasingContentMap));
}

function isListItem(node: Node): node is ListItem & Node {
  return node.type === "listItem";
}

function isBlockContent(node: Node): node is BlockContent & Node {
  return blockContentTypes.includes(node.type as (keyof BlockContentMap));
}

function extractTextContent(source: string, position: {from: number, to: number}): string {
  return source.slice(position.from, position.to);
}

function findChildNodeByType(source: string, cursor: TreeCursor, type: string): Node | undefined {
  return getChildrenNodes(source, cursor).find(node => node.type === type);
}

function convertLezerNode(source: string, cursor: TreeCursor): Node {
  return { type: `Lezer${cursor.type.name}`, children: getChildrenNodes(source, cursor), data: {from: cursor.from, to: cursor.to} };
}

function convertDocument(source: string, cursor: TreeCursor): Parent & Node {
  return { ...createBaseNode("root", cursor), children: getChildrenNodes(source, cursor) };
}

function convertParagraph(source: string, cursor: TreeCursor): Parent & Node {
  return { ...createBaseNode("paragraph", cursor), children: getChildrenNodes(source, cursor) };
}

function convertHeading(source: string, cursor: TreeCursor, depth: 1 | 2 | 3 | 4 | 5 | 6): Heading & Node {
  return { type: "heading", depth, children: getChildrenNodes(source, cursor).filter(isPhrasingContent), data: {from: cursor.from, to: cursor.to} };
}

function convertBlockquote(source: string, cursor: TreeCursor): Parent & Node {
  return { ...createBaseNode("blockquote", cursor), children: getChildrenNodes(source, cursor) };
}

function convertCodeBlock(source: string, cursor: TreeCursor): Code & Node {
  const children = getChildrenNodes(source, cursor);
  const value = source.slice(children[0].data.from, children[children.length - 1].data.to);
  return { type: "code", lang: null, value, data: {from: cursor.from, to: cursor.to} };
}

function convertFencedCode(source: string, cursor: TreeCursor): Code & Node {
  const children = getChildrenNodes(source, cursor);

  const langNode = children.find(n => n.type === "LezerCodeInfo");
  const lang = langNode ? source.slice(langNode.data.from, langNode.data.to) : null;

  const codeNode = children.find(n => n.type === "LezerCodeText");
  const value = codeNode ? source.slice(codeNode.data.from, codeNode.data.to) : '';
  return { type: "code", lang, value, data: {from: cursor.from, to: cursor.to} };
}

function convertList(source: string, cursor: TreeCursor, listType: "bullet" | "ordered"): List & Node {
  const value = extractTextContent(source, {from: cursor.from, to: cursor.to});
  const start = listType === "ordered" ? parseInt(value, 10) : undefined;
  const ordered = listType === "ordered";
  const children = getChildrenNodes(source, cursor);
  const listItem = children.filter(isListItem);

  return { type: "list", ordered, start, children: listItem, data: {from: cursor.from, to: cursor.to} };
}

function convertListItem(source: string, cursor: TreeCursor): ListItem & Node {
  return { type: "listItem", children: getChildrenNodes(source, cursor).filter(isBlockContent), data: {from: cursor.from, to: cursor.to} };
}

function convertLink(source: string, cursor: TreeCursor): Link & Node {
  const allChildren = getChildrenNodes(source, cursor);

  // Extract link children between the first and second LezerLinkMark nodes
  const linkChildrenStart = allChildren.findIndex(child => child.type === 'LezerLinkMark') + 1;
  const linkChildrenEnd = allChildren.findIndex((child, index) => child.type === 'LezerLinkMark' && index > linkChildrenStart);
  const children = allChildren.slice(linkChildrenStart, linkChildrenEnd).filter(isStaticPhrasingContent);

  // Extract URL between the third and fourth LezerLinkMark nodes
  const urlStart = allChildren.findIndex((child, index) => child.type === 'LezerLinkMark' && index > linkChildrenEnd) + 1;
  const urlEnd = allChildren.findIndex((child, index) => child.type === 'LezerLinkMark' && index > urlStart);
  const url = allChildren.slice(urlStart, urlEnd).map(child => (child.type === "text") ? (child as Node & Text).value : "").join('');

  const titleNode = findChildNodeByType(source, cursor, "LezerLinkTitle");
  let title = titleNode ? extractTextContent(source, titleNode.data) : undefined;
  if (title) {
    const singleQuotes = /^'(.*)'$/;
    const doubleQuotes = /^"(.*)"$/;

    if (singleQuotes.test(title)) {
      title = title.replace(singleQuotes, '$1');
    } else if (doubleQuotes.test(title)) {
      title = title.replace(doubleQuotes, '$1');
    }
  }

  return { type: 'link', url, title, children, data: { from: cursor.from, to: cursor.to } };

}

function convertImage(source: string, cursor: TreeCursor): Image & Node {
  const allChildren = getChildrenNodes(source, cursor);

  const titleNode = findChildNodeByType(source, cursor, "LezerLinkTitle");
  let title = titleNode ? extractTextContent(source, titleNode.data) : undefined;
  if (title) {
    const singleQuotes = /^'(.*)'$/;
    const doubleQuotes = /^"(.*)"$/;

    if (singleQuotes.test(title)) {
      title = title.replace(singleQuotes, '$1');
    } else if (doubleQuotes.test(title)) {
      title = title.replace(doubleQuotes, '$1');
    }
  }

  const altStart = allChildren.findIndex(child => child.type === 'LezerLinkMark') + 1;
  const altEnd = allChildren.findIndex((child, index) => child.type === 'LezerLinkMark' && index > altStart);
  const alt = allChildren.slice(altStart, altEnd).map(child => (child.type === "text") ? (child as Node & Text).value : "").join('');


  const urlStart = allChildren.findIndex((child, index) => child.type === 'LezerLinkMark' && index > altEnd) + 1;
  const urlEnd = allChildren.findIndex((child, index) => child.type === 'LezerLinkMark' && index > urlStart);
  const url = allChildren.slice(urlStart, urlEnd).map(child => (child.type === "text") ? (child as Node & Text).value : "").join('');
  return { type: "image", url, title, alt, data: {from: cursor.from, to: cursor.to} };
}

function convertEmphasis(source: string, cursor: TreeCursor): Parent & Node {
  return { type: "emphasis", children: getChildrenNodes(source, cursor), data: {from: cursor.from, to: cursor.to} };
}

function convertStrongEmphasis(source: string, cursor: TreeCursor): Parent & Node {
  return { type: "strong", children: getChildrenNodes(source, cursor), data: {from: cursor.from, to: cursor.to} };
}

function convertInlineCode(source: string, cursor: TreeCursor): InlineCode & Node {
  const value = extractTextContent(source, {from: cursor.from, to: cursor.to});
  return { type: "inlineCode", value, data: {from: cursor.from, to: cursor.to} };
}

function convertHardBreak(_source: string, cursor: TreeCursor): Node {
  return { type: "break", data: {from: cursor.from, to: cursor.to} };
}

function convertHTMLBlock(source: string, cursor: TreeCursor): HTML & Node {
  const value = extractTextContent(source, {from: cursor.from, to: cursor.to});
  return { type: "html", value, data: {from: cursor.from, to: cursor.to} };
}

function convertHTMLTag(source: string, cursor: TreeCursor): HTML & Node {
  const value = extractTextContent(source, {from: cursor.from, to: cursor.to});
  return { type: "html", value, data: {from: cursor.from, to: cursor.to} };
}

function convertURL(source: string, cursor: TreeCursor): Text & Node {
  const value = extractTextContent(source, {from: cursor.from, to: cursor.to});
  return { type: "text", value, data: {from: cursor.from, to: cursor.to} };
}

function convertText(source: string, cursor: TreeCursor): Text & Node {
  const value = source.slice(cursor.from, cursor.to).trim();
  return { type: "text", value, data: {from: cursor.from, to: cursor.to} };
}
