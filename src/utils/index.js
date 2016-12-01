const applyConfig = (config, next, types = null, errorPrefix = '') => {
  for (let prop in next) {
    let type = types ? types[prop] : null;
    let setting = next[prop];
    if (typeof setting === 'object' && setting !== null) {
      applyConfig(config[prop], setting, type);
    } else {
      if (!types || (type === 'string' ? typeof setting === type : setting instanceof type)) {
        config[prop] = next[prop];
      } else {
        throw new TypeError(`${errorPrefix}Setting "${prop}" must be of type ${type instanceof Function ? type.name : type}.`);
      }
    }
  }
  return config;
};

const isArray = (obj) => Array.isArray(obj);
const isFunction = (obj) => obj instanceof Function;
const isNode = (obj) => obj instanceof Node;
const isObject = (obj) => typeof obj === 'object' && !isArray(obj);
const isString = (obj) => typeof obj === 'string';

const htmlEscapeChars = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
};

const ESCAPE_REGEX = /[&<>'"]/g;
const escapeHTML = (s) => s.replace(ESCAPE_REGEX, (m) => htmlEscapeChars[m]);

export {
  escapeHTML,
  applyConfig,
  isArray,
  isFunction,
  isNode,
  isObject,
  isString
};