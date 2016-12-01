import { set } from './types';

import {
  escapeHTML,
  isArray,
  isString
} from './utils';

import {
  emptyNode,
  moveChildNodes,
  replaceElements,
  tempElement
} from './utils/dom';

import { PLACEHOLDER_HTML } from './const';

import parser from './parser';

const chunks = set(); // <Chunk>

const isChunk = (obj) => chunks.has(obj);

const compileChunk = (strings, values, getComponent) => {
  var html = '';
  const components = [];
  const asTag = !!strings.raw;

  if (!isArray(strings)) {
    strings = [strings];
  }

  if (asTag) {
    html += strings[0];
  }

  for (let i = asTag ? 1 : 0, len = strings.length; i < len; i++) { 
    let str = strings[i];
    let val = asTag ? values[i - 1] : str;
    if (!asTag && isString(str)) {
      html += escapeHTML(str);
      continue;
    }
    let parsed = parser(val, getComponent);
    for (let i = 0, len = parsed.length; i < len; i++) {
      let c = parsed[i];
      if (isString(c)) {
        html += escapeHTML(c);
      } else {
        components.push(c);
        html += PLACEHOLDER_HTML;
      }
    }
    if (asTag) {
      html += str;
    }
  }

  const ch = { components, html };

  chunks.add(ch);

  return ch;
};

/**
 * Render a chunk to an Element.
 * @param  {Chunk} chunk
 * @param  {Element} el
 * @return {void}
 */
const renderChunk = (chunk, el) => {
  // Flatten chunk in order to speed up compilation of the template.
  const ch = flattenChunk(chunk);
  const temp = tempElement(ch.html);
  replaceElements(temp, ch.components);
  emptyNode(el);
  moveChildNodes(temp, el);
};

let placeholderRegex = new RegExp(PLACEHOLDER_HTML, 'g');

/**
 * Create a new chunk that is the flattened version of a chunk. Any placeholder
 * generated for a chunk will be swapped out by that chunk's html string.
 *   html       -> All descendant template content recursively embedded in
 *   components -> All descendant nodes in a flat array.
 * @param  {Chunk} chunk
 * @return {Chunk}
 */
const flattenChunk = (chunk) => {
  var i = 0;
  const newChunk = { components: [] };
  newChunk.html = chunk.html.replace(placeholderRegex, (match) => {
    const c = chunk.components[i++];
    if (isChunk(c)) {
      let flat = flattenChunk(c);
      newChunk.components = newChunk.components.concat(flat.components);
      return flat.html;
    } else {
      newChunk.components.push(c);
    }
    return match;
  });
  return newChunk;
};

export {
  chunks,
  isChunk,
  compileChunk,
  renderChunk
};