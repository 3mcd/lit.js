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

const escapeChars = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
};

const ESCAPE_REGEX = /[&<>'"]/g;
const escape = (s) => s.replace(ESCAPE_REGEX, (m) => escapeChars[m]);

export {
  escape,
  applyConfig
};