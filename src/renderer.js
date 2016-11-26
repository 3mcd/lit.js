import {
  empty,
  replaceElements,
  moveChildren,
  tempElement,
  escape
} from './utils';

import {
  PLACEHOLDER_REGEX,
  placeholderTemplate,
  HTML_WHITESPACE_REGEX,
  htmlWhitespaceReplace
} from './const';

const warn = (msg) => console.warn('lit-js:', msg);

const warnings = {
  TYPE: (a, b) => `${a} must be of type ${b}`, 
  EXP_ARRAY: 'A deeply nested array was used inside of a template expression. Adjust your template to remove redundant nesting of arrays.',
  EXP_OBJECT: 'An object was used inside of a template expression. Objects other than views, Nodes and and chunks are ignored.',
  PARSED_NON_OBJECT: 'An array or value other than object was returned from parse(). parse() should return a view instance, usually an object. If you return an object other than a view instance, your views may not be disposed of correctly.'
};

const isChunk = (c) => chunks.has(c);
const isNode = (c) => c instanceof Node;
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
  if (isArray(child)) {
    child.forEach((c) => cleanup(c, destroy));
    return;
  }
  const view = componentMap.get(child);
  if (view) {
    destroy(view);
  }
  if (isNode(child)) {
    teardown(child, destroy);
    return;
  } 
  if (isChunk(child)) {
    child.children.forEach((c) => cleanup(c, destroy));
  }
};

const renderChunkToElement = (chunk, el, placeholderMatch) => {
  const { html, children } = chunk;
  // Create an element with the child content of the view.
  const temp = inject(children, html, placeholderMatch);
  // Empty the view element.
  empty(el);
  // Move new elements from temp to view element.
  moveChildren(temp, el);
};

const inject = (children, html, placeholderMatch) => {
  const chunked = children.map((child) => {
    if (isChunk(child)) {
      return [...inject(child.children, child.html, placeholderMatch).childNodes];
    }
    return child;
  });
  // Build DOM.
  const temp = tempElement(html);
  replaceElements(temp, chunked, placeholderMatch);
  return temp;
};

const _createRenderer = (config) => {
  const { parse, render, destroy, placeholder: { match, template } } = config;

  const removePlaceholders = (s) => {
    return s.replace(match, '');
  };

  const componentRenderer = (el) => function renderer(segments, ...expressions) {
    const ch = isChunk(segments) ? segments : chunk(...arguments);
    // Remove all child components and store the incoming ones.
    teardown(el, destroy);
    childMap.set(el, ch);
    // Render the chunk to the el.
    renderChunkToElement(ch, el, match);
    return ch;
  };

  const chunk = function chunk(segments, ...expressions) {
    // Placeholder index
    var p = 0;
    var html = '';
    const children = [];
    const components = getComponents(...arguments);
    components.forEach((c) => {
      if (!isString(c)) {
        children.push(c);
        c = template(p++);
      }
      html += c;
    });
    const ch = { children, html };
    chunks.add(ch);
    return ch;
  };

  const getComponent = (exp) => {
    const arr = [];
    if (isArray(exp)) {
      for (let i = 0; i < exp.length; i++) {
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

  const getComponents = (segments, ...expressions) => {
    // componentRenderer() or chunk() was not called as a tag
    if (!segments.raw) {
      if (!isArray(segments)) {
        segments = [segments];
      }
      return [...segments, ...expressions].reduce((arr, exp, i) => {
        return arr.concat(getComponent(exp));
      }, []);
    }
    return expressions.reduce((arr, exp, i) => {
      const seg = segments[i + 1];
      arr = arr.concat(getComponent(exp));
      arr.push(parseSegment(seg));
      return arr;
    }, [segments[0]]);
  };

  const parseSegment = (s) => {
    s = removePlaceholders(s);
    return s.replace(
      HTML_WHITESPACE_REGEX,
      htmlWhitespaceReplace
    );
  };

  const parseExpression = (c) => {
    const tryParse = (c) => {
      var parsed = parse(c);
      // If the parse() function returns a falsey value, the component must not
      // be a view.
      if (!parsed) {
        return c;
      }
      // View library might organize views as arrays.
      if (typeof parsed !== 'object' || isArray(parsed)) {
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
      if (typeof el === 'object') {
        componentMap.set(el, parsed);
      }
      return el;
    };
    if (isString(c)) {
      return escape(removePlaceholders(c));
    }
    // Component is already a chunk.
    if (isChunk(c)) {
      return c;
    }
    // Yield control to the end-user. Attempt to render the component if it is
    // fact a view instance.
    c = tryParse(c);
    // If the component is still a function for whatever reason, execute it and
    // set the component to the return value of the function.
    if (isFunction(c)) {
      c = tryParse(c());
    }
    // The function could have potentially returned a chunk. Either way, Node
    // instances and chunks are the last objects we will accept.
    if (isNode(c) || isChunk(c)) {
      return c;
    }
    if (isArray(c)) {
      warn(warnings.EXP_ARRAY);
      return null;
    }
    // Ignore all other objects.
    if (typeof c === 'object') {
      warn(warnings.EXP_OBJECT);
      return null;
    }
    // Stringify all other values.
    c = '' + c;

    return c;
  };

  return { componentRenderer, chunk };
}

const createRenderer = function createRenderer(options = {}) {
  const config = {
    parse: (view) => view,
    render: (view) => view,
    destroy: (view) => view.parentElement.removeChild(view),
    placeholder: {
      match: PLACEHOLDER_REGEX,
      template: placeholderTemplate
    }
  };

  const {
    parse = config.parse,
    render = config.render,
    destroy = config.destroy,
    placeholder = config.placeholder
  } = options;

  if (!isFunction(render)) {
    warn(warnings.TYPE('createRenderer option render', 'Function'));
  } else {
    config.render = render;
  }

  if (!isFunction(destroy)) {
    warn(warnings.TYPE('createRenderer option destroy', 'Function.'));
  } else {
    config.destroy = destroy;
  }

  if (!isFunction(parse)) {
    warn(warnings.TYPE('createRenderer option parse', 'Function.'));
  } else {
    config.parse = parse;
  }

  let { match, template } = placeholder;

  placeholder.match = match;
  placeholder.template = template;

  return _createRenderer(config);
};

export { createRenderer };