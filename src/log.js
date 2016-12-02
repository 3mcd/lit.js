import { ERROR_PREFIX } from './const';

const warn = (msg) => console.warn(ERROR_PREFIX, msg);

const warnings = {
  EXP_ARRAY: 'A deeply nested array was used inside of a template value. Adjust your template to remove redundant nesting of arrays.',
  EXP_OBJECT: 'An object was used inside of a template value. Objects other than views, Nodes and and chunks are ignored.',
  PARSED_NON_OBJECT: 'An array or value other than object was returned from parse(). parse() should return a view instance, usually an object. If you return an object other than a view instance, your views may not be disposed of correctly.'
};

export { warn, warnings };