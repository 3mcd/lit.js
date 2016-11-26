const { createRenderer } = lit;

// A simple jQuery component renderer.
const domComponentRenderer = createRenderer({
  parse(view) {
    if (view.$el instanceof jQuery) {
      return view;
    }
  },
  render(view) {
    if (view.render) view.render();
    return [...view.$el];
  },
  destroy(view) {
    view.$el.remove();
  }
});

const { componentRenderer, chunk } = domComponentRenderer;

const dlGroup = ([t, d]) => chunk`
  <dt>${Red(t)}</dt>
  <dd>${d}</dd>
`;

const dl = (...pairs) => chunk`
  <dl>${pairs.map(dlGroup)}</dl>
`;

const Red = (text) => {
  const css = {
    'color': 'red',
    'font-family': 'sans-serif'
  };
  const $el = $(`<span/>`, { text, css });
  return { $el };
};

const Clicker = (n) => {
  const $el = $(`<button/>`, { text: n });
  const inc = () => $el.text(++n);
  $el.on('click', inc);
  return { $el };
};

const Person = (name, age, money) => {
  var $el = $(`<div />`);
  const render = () =>
    componentRenderer($el[0])`
      ${
        chunk(['<a>', Red('bananas'), '</a>'])
      }
        ${dl(
          [ 'Name'  , '<strong>' + name + '</strong>'          ],
          [ 'Age'   , Clicker(age)   ],
          [ 'Money' , Clicker(money) ]
        )}
      `;
  return { $el, render };
} 

const app = (people) => {
  const $el = $(`<main/>`);
  const render = () =>
    componentRenderer($el[0])`
      <ul>
        ${people.map(
            (d) => chunk`<li>${ Person(d.name, d.age, d.money) }</li>`
        )}
      </ul>
    `;
  return { $el, render };
};

const a = app([
  { name: 'Brad', age: 28, money: 9000 },
  { name: 'Lori', age: 12, money: 12 }
]);

a.$el.appendTo(document.body);

a.render();