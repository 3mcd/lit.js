import {
  applyConfig,
  escape,
  isArray,
  isFunction,
  isNode,
  isObject,
  isString
} from './utils';

import { map } from './types';

import {
  chunks,
  compileChunk,
  isChunk,
  renderChunk
} from './chunk';

import {
  emptyNode,
  moveChildNodes,
  replaceElements
} from './utils/dom';

import {
  CONFIG_TYPES,
  ERROR_PREFIX,
  HTML_WHITESPACE_REGEX,
  PLACEHOLDER_HTML,
  createDefaultConfig,
  htmlWhitespaceReplace
} from './const';

import parser from './parser';

const warn = (msg) => console.warn(ERROR_PREFIX, msg);

const warnings = {
  EXP_ARRAY: 'A deeply nested array was used inside of a template value. Adjust your template to remove redundant nesting of arrays.',
  EXP_OBJECT: 'An object was used inside of a template value. Objects other than views, Nodes and and chunks are ignored.',
  PARSED_NON_OBJECT: 'An array or value other than object was returned from parse(). parse() should return a view instance, usually an object. If you return an object other than a view instance, your views may not be disposed of correctly.'
};

// In theory, use of WeakMaps will prevent us from causing memory leaks.
// Sometimes we will hold on to many nodes at a time, and those nodes may be
// removed in functions outside of the library.

const chunkMap = map(); // <Node, Chunk>
const viewMap = map();  // <Component, View>

/**
 * Recursively destroy any objects we have associated with a DOM node.
 * @param  {Node} node
 * @param  {Function} destroy
 * @return {void}
 */
const teardown = (node, destroy) => {
  const ch = chunkMap.get(node);
  if (ch) {
    chunkMap.delete(ch);
    cleanup(ch, destroy);
  }
};

/**
 * Recursively remove the underlying views of DOM nodes, calling the supplied
 * remove() method along the way.
 * @param  {Component} c
 * @param  {Function} destroy
 * @return {void}
 */
const cleanup = (c, destroy) => {
  // Since a view's render() can return a chunk or an array of elements that
  // is then converted into a chunk, both chunks and nodes (aka components)
  // can have an underlying view.
  const view = viewMap.get(c);
  // If the component had an underlying view, destroy it.
  if (view) {
    destroy(view);
    viewMap.delete(c);
  }
  // Recurse into the chunk to attempt to clean up any child views.
  // Base case: component wasn't a chunk or chunk has no child components. 
  if (isChunk(c)) {
    for (let i = 0, len = c.components.length; i < len; i++) {
      cleanup(c.components[i], destroy);
    }
    return;
  }
  // Component wasn't a chunk, it was a node. The node could have an underlying
  // chunk. Recurse back into teardown to check if it has a chunk to attempt to
  // further clean up descendant views.
  // Base case: component is not a chunk.
  teardown(c, destroy);
};

const _createRenderer = (config) => {
  const { parse, render, destroy } = config;
  
  const chunk = function chunk(strings, ...values) {
    return compileChunk(strings, values, getComponent);
  };

  const getComponent = (val) => {
    var parsed = parse(val);
    // If the parse() function returns a falsey value, the component must not
    // be a view.
    if (!parsed) {
      return val;
    }
    // Supplied parse function returned a non-Object value.
    if (!isObject(parsed)) {
      warn(warnings.PARSED_NON_OBJECT);
    }
    // Render the view and return the element (or elements) therein. This
    // would potentially trigger other calls to componentRenderer which would
    // build up child content in a depth-first manner.
    let node = render(parsed);
    // Multiple elements can be returned from the render function. They are
    // combined into a chunk. It is assumed that the parent view will clean
    // them up with destroy() is called.
    if (isArray(node)) {
      node = chunk(node);
    }
    // Set the element (or chunk) to the View instance in viewMap. The
    // viewMap is accessed in cleanup() to reconcile an element or chunk
    // with its view.
    if (isObject(node)) {
      viewMap.set(node, parsed);
    }
    return node;
  };

  const componentRenderer = (node) => function renderer(strings, ...values) {
    teardown(node, destroy);
    const ch = isChunk(strings) ? strings : chunk(strings, ...values);
    // Remove all child components and store the incoming ones.
    chunkMap.set(node, ch);
    // Render the chunk to the node.
    renderChunk(ch, node);
    return ch;
  };

  return { componentRenderer, chunk };
}

const createRenderer = function createRenderer(options = {}) {
  const config = applyConfig(createDefaultConfig(), options, CONFIG_TYPES, ERROR_PREFIX);
  return _createRenderer(config);
};

export { createRenderer };