const PLACEHOLDER_REGEX = /<%([\s\S]+?)%>/g;
const placeholderTemplate = (id) => `<% ${id} %>`;

const HTML_WHITESPACE_REGEX = /(^\s+|\>[\s]+\<|\s+$)/g;
const htmlWhitespaceReplace = (str) => str.indexOf('>') === 0 ? '><' : '';

export {
  PLACEHOLDER_REGEX,
  placeholderTemplate,
  HTML_WHITESPACE_REGEX,
  htmlWhitespaceReplace
};