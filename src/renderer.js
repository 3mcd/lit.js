import {
  escape,
  applyConfig
} from './utils';

import {
  emptyNode,
  tempElement,
  moveChildNodes,
  replaceElements
} from './utils/dom';

import {
  ERROR_PREFIX,
  HTML_WHITESPACE_REGEX,
  PLACEHOLDER_HTML,
  htmlWhitespaceReplace,
  CONFIG_TYPES,
  createDefaultConfig
} from './const';

const warn = (msg) => console.warn(ERROR_PREFIX, msg);

const warnings = {
  TYPE: (a, b) => `${a} must be of type ${b}.`, 
  EXP_ARRAY: 'A deeply nested array was used inside of a template expression. Adjust your template to remove redundant nesting of arrays.',
  EXP_OBJECT: 'An object was used inside of a template expression. Objects other than views, Nodes and and chunks are ignored.',
  PARSED_NON_OBJECT: 'An array or value other than object was returned from parse(). parse() should return a view instance, usually an object. If you return an object other than a view instance, your views may not be disposed of correctly.'
};

const isChunk = (c) => chunks.has(c);
const isNode = (c) => c instanceof Node;
const isObject = (c) => typeof c === 'object' && !isArray(c);
const isArray = (c) => Array.isArray(c);
const isString = (c) => typeof c === 'string';
const isFunction = (c) => c instanceof Function;

// childMap stores all children of a Node that has been rendered to. The
// children are stored in an array of either chunks or Nodes, and are
// recursively cleaned up the next time the Node is rendered to.
// <Node, Array<Component>>
const childMap = new WeakMap(); 
// componentMap associates Nodes with their corresponding views.
// <Component, View>
const componentMap = new WeakMap();
// chunks keeps track of all chunks for verification.
// <chunk>
const chunks = new WeakSet();

// Recursively tear down child views and chunks
const teardown = (el, destroy) => {
  const child = childMap.get(el);
  if (child) {
    cleanup(child, destroy);
  }
};

const cleanup = (child, destroy) => {
  const view = componentMap.get(child);
  if (view) {
    destroy(view);
  }
  if (isNode(child)) {
    teardown(child, destroy);
    return;
  } 
  if (isChunk(child)) {
    child.components.forEach((c) => cleanup(c, destroy));
  }
};

const renderChunkToElement = (chunk, el) => {
  const ch = flattenChunk(chunk);
  const tt = tempElement(ch.html);
  replaceElements(tt, ch.components);
  emptyNode(el);
  moveChildNodes(tt, el);
};

let placeholderRegex = new RegExp(PLACEHOLDER_HTML, 'g');

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

const _createRenderer = (config) => {
  const { parse, render, destroy } = config;

  const componentRenderer = (el) => function renderer(segments, ...expressions) {
    const ch = isChunk(segments) ? segments : chunk(...arguments);
    // Remove all child components and store the incoming ones.
    teardown(el, destroy);
    childMap.set(el, ch);
    // Render the chunk to the el.
    renderChunkToElement(ch, el);
    return ch;
  };

  const createChunk = (segments, ...expressions) => {
    var html = '';
    const components = [];
    const asTag = !!segments.raw;

    if (!isArray(segments)) {
      segments = [segments];
    }

    if (asTag) {
      html += segments[0];
    }

    for (let i = asTag ? 1 : 0, len = segments.length; i < len; i++) { 
      let seg = segments[i];
      let exp = asTag ? expressions[i - 1] : seg;
      if (!asTag && isString(seg)) {
        html += escape(seg);
        continue;
      }
      let parsed = parseExpressions(exp);
      for (let i = 0, len = parsed.length; i < len; i++) {
        let c = parsed[i];
        if (isString(c)) {
          html += escape(c);
        } else {
          components.push(c);
          html += PLACEHOLDER_HTML;
        }
      }
      if (asTag) {
        html += seg;
      }
    }

    return { components, html };
  };

  const chunk = function chunk(segments, ...expressions) {
    const ch = createChunk(...arguments);
    chunks.add(ch);
    return ch;
  };

  const tryParse = (exp) => {
    var parsed = parse(exp);
    // If the parse() function returns a falsey value, the component must not
    // be a view.
    if (!parsed) {
      return exp;
    }
    // View library might organize views as arrays.
    if (!isObject(parsed)) {
      warn(warnings.PARSED_NON_OBJECT);
    }
    // Render the element and return the element (or elements) therein. This
    // would potentially trigger other calls to componentRenderer which would
    // recursively set up child content in a depth-first manner.
    let el = render(parsed);
    // Multiple elements can be returned from the render function. They are
    // combined into a chunk. It is assumed that the parent view will clean
    // them up with destroy() is called.
    if (isArray(el)) {
      el = chunk(el);
    }
    // Set the element (or chunk) to the View instance in componentMap. The
    // componentMap is accessed in cleanup() to reconcile an element or chunk
    // with its view.
    if (isObject(el)) {
      componentMap.set(el, parsed);
    }
    return el;
  };

  const parseExpression = (exp) => {
    if (isString(exp) || isChunk(exp)) {
      return exp;
    }
    // Yield control to the end-user. Attempt to render the component if it is
    // fact a view instance.
    exp = tryParse(exp);
    // If the component is still a function for whatever reason, execute it and
    // set the component to the return value of the function.
    if (isFunction(exp)) {
      exp = tryParse(exp());
    }
    // The function could have potentially returned a chunk. Either way, Node
    // instances and chunks are the last objects we will accept.
    if (isChunk(exp) || isNode(exp)) {
      return exp;
    }
    if (isArray(exp)) {
      warn(warnings.EXP_ARRAY);
      return null;
    }
    // Ignore all other objects.
    if (isObject(exp)) {
      warn(warnings.EXP_OBJECT);
      return null;
    }
    // Stringify all other values.
    exp = '' + exp;

    return exp;
  };

  const parseExpressions = (exp) => {
    const arr = [];
    if (isArray(exp)) {
      for (let i = 0, len = exp.length; i < len; i++) {
        let c = parseExpression(exp[i]);
        if (c) {
          arr.push(c);
        }
      }
    } else {
      let c = parseExpression(exp);
      if (c) {
        arr.push(c);
      }
    }
    return arr;
  }

  return { componentRenderer, chunk };
}

const createRenderer = function createRenderer(options = {}) {
  const config = applyConfig(createDefaultConfig(), options, CONFIG_TYPES, ERROR_PREFIX);
  return _createRenderer(config);
};

export { createRenderer };