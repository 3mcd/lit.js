const ERROR_PREFIX = 'litjs: ';

const CONFIG_TYPES = {
  parse: Function,
  render: Function,
  destroy: Function
};

const createDefaultConfig = () => ({
  parse: (view) => view,
  render: (view) => view,
  destroy: (view) => view.parentElement.removeChild(view)
});

const PLACEHOLDER_HTML = `<span class="__lit"></span>`;

const HTML_WHITESPACE_REGEX = /(^\s+|\>[\s]+\<|\s+$)/g;
const htmlWhitespaceReplace = (str) => str.indexOf('>') === 0 ? '><' : '';

export {
  CONFIG_TYPES,
  ERROR_PREFIX,
  HTML_WHITESPACE_REGEX,
  PLACEHOLDER_HTML,
  htmlWhitespaceReplace,
  createDefaultConfig
};