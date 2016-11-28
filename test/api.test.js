import { expect } from 'chai';
import sinon from 'sinon';

import View from './view.mock';

import { PLACEHOLDER_HTML } from '../src/const';
import { escape } from '../src/utils';
import { createRenderer } from '../src/api';

const interleave = (a1, a2) => {
  var arr = [];
  for (var i = 0, len = Math.max(a1.length, a2.length); i < len; i++) {
    if (i < a1.length) {
      arr.push(a1[i]);
    }
    if (i < a2.length) {
      arr.push(a2[i]);
    }
  }
  return arr;
}

const { chunk, componentRenderer } = createRenderer({
  parse(view) {
    if (view instanceof View) return view;
  },
  render(view) {
    view.render();
    return view.el;
  },
  destroy(view) {
    view.remove();
  }
});

const runTestsWithMode = (tests, tag) =>
  Object.keys(tests).forEach(t => it(t, () => tests[t](true)));

describe('API', () => {

  describe('chunk', () => {
    const tests = {
      'embeds primitive values as text content': (tag) => {
        var primitives = ['ABC', 123, true];
        primitives.forEach((x) => {
          const ch = tag ? chunk`${x}` : chunk(x);
          expect(ch.html).to.equal(x.toString());
        });
      },
      'embeds single components': (tag) => {
        const child = new View();
        const ch = tag ? chunk`${child}` : chunk(child);
        expect(ch.components[0]).to.equal(child.el);
      },
      'embeds an array of components': (tag) => {
        const components = [new View(), chunk('abc'), document.createElement('div'), chunk(123)];
        const ch = tag ? chunk`${components}` : chunk(components);
        // Each component should be added to the chunk's children, in an identical order:
        expect(ch.components.length).to.equal(components.length);
        components.forEach(
          (child, i) => {
            if (child instanceof View) {
              // Either a view:
              expect(ch.components[i]).to.equal(child.el);
            } else {
              // Or a chunk:
              expect(ch.components[i]).to.equal(child);
            }
          }
        );
      },
      'embeds an array of primitives and components in the correct order': (tag) => {
        const components = [new View(), chunk('abc'), document.createElement('div'), chunk(123)];
        const primitives = ['ABC', 123, false, 'DEF'];
        const children = interleave(primitives, components);
        const ch = tag ? chunk`${children}` : chunk(children);
        const placeholders = components.map(() => PLACEHOLDER_HTML);
        // Each component should be preceded by any primitives before it, e.g. HTML content:
        let next = ch.html;
        placeholders.forEach((p, i) => {
          let prev = next.slice(next.indexOf(primitives[i]), next.indexOf(p));
          expect(prev).to.equal(primitives[i].toString());
          next = next.slice(next.indexOf(prev) + prev.length + PLACEHOLDER_HTML.length);
        });
      }
    };
    describe('as a function', () => {
      it('turns non-object expressions into HTML-escaped text content', () => {
        const children = ['<div>', new View(), '</div>'];
        const ch = chunk(children);
        const output = children.map((c) => typeof c === 'string' ? escape(c) : PLACEHOLDER_HTML).join('');
        expect(ch.html).to.equal(output);
      });
    });
    describe('as a function (cont.)', () => runTestsWithMode(tests, false));
    describe('as a tag', () => runTestsWithMode(tests, true));
  });

  describe('renderer', () => {
    var app;
    var children;
    var nestedView;
    var deepNestedViewInChunk;
    var descendants;

    beforeEach(() => {
      app = new View();
      children = [new View(), new View()];
      nestedView = new View();
      deepNestedViewInChunk = new View();
      nestedView.id = 'nested';
      deepNestedViewInChunk.id = 'deep';
      descendants = [...children, nestedView, deepNestedViewInChunk];
      children[0].render = () => componentRenderer(children[0].el)(nestedView);
      nestedView.render = () => componentRenderer(nestedView.el)(
        chunk`<div>${deepNestedViewInChunk}</div>`
      );
      descendants.forEach((c) => sinon.spy(c, 'render'));
      descendants.forEach((c) => sinon.spy(c, 'remove'));
    });

    const tests = {
      'generates and injects elements generated from template into view': (tag) => {
        if (tag) {
          componentRenderer(app.el)(chunk`<main>${children}</main>`);
        } else {
          componentRenderer(app.el)`<main>${children}</main>`;
        }
        let main = app.el.children[0];
        [...main.children].forEach(
          (el, i) => expect(el).to.equal(children[i].el)
        );
        expect(main.children[0].children[0]).to.equal(nestedView.el);
        expect(main.children[0].children[0].children[0].children[0]).to.equal(deepNestedViewInChunk.el);
      },
      'calls the render method of all descendant views': (tag) => {
        if (tag) {
          componentRenderer(app.el)(children);
        } else {
          componentRenderer(app.el)`${children}`;
        }
        descendants.forEach(c => expect(c.render.called).to.be.true);
      },
      'calls the remove method of all descendant views upon subsequent executions': (tag) => {
        // Initial render:
        const c = componentRenderer(app.el)(children);
        // Re-render:
        if (tag) {
          componentRenderer(app.el)(children);
        } else {
          componentRenderer(app.el)`${children}`;
        }
        descendants.forEach(c => expect(c.remove.called).to.be.true);
      }
    };
    describe('as a tag', () => runTestsWithMode(tests, true));
    describe('as a function', () => runTestsWithMode(tests, false));
  });

});