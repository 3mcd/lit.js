const CONFIG_TYPES = {
  parse: Function,
  render: Function,
  destroy: Function
};
const ERROR_PREFIX = 'lit-js: ';
const HTML_WHITESPACE_REGEX = /(^\s+|\>[\s]+\<|\s+$)/g;
const PLACEHOLDER_HTML = `<litpl></litpl>`;

const createDefaultConfig = () => ({
  parse(c) {
    if (c.nodeType) {
      return c;
    }
  },
  render(view) {
    return view;
  },
  destroy (view) {
    view.parentElement.removeChild(view);
  }
});

const htmlWhitespaceReplace = (str) => str.indexOf('>') === 0 ? '><' : '';

export {
  CONFIG_TYPES,
  ERROR_PREFIX,
  HTML_WHITESPACE_REGEX,
  PLACEHOLDER_HTML,
  htmlWhitespaceReplace,
  createDefaultConfig
};