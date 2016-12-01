const $VALUE_REJECTED = {};

import { isChunk } from './chunk';

import {
  isArray,
  isFunction,
  isNode,
  isObject,
  isString
} from './utils';

const parseValue = (val, getComponent) => {
  // Ignore null/undefined.
  if (val == void(0)) {
    return $VALUE_REJECTED;
  }
  if (isString(val) || isChunk(val)) {
    return val;
  }
  val = getComponent(val);
  // If the component is still a function for whatever reason, execute it and
  // set the component to the return value of the function.
  if (isFunction(val)) {
    val = getComponent(val());
  }
  // The function could have potentially returned a chunk. Either way, Node
  // instances and chunks are the last objects we will accept.
  if (isChunk(val) || isNode(val)) {
    return val;
  }
  if (isArray(val)) {
    warn(warnings.EXP_ARRAY);
    return $VALUE_REJECTED;
  }
  // Ignore all other objects.
  if (isObject(val)) {
    warn(warnings.EXP_OBJECT);
    return $VALUE_REJECTED;
  }
  // Stringify all other values.
  val = '' + val;

  return val;
};

const parser = (val, getComponent) => {
  const arr = [];
  const tryParse = (val) => {
    const c = parseValue(val, getComponent);
    if (c !== $VALUE_REJECTED) {
      arr.push(c);
    }
  };
  if (isArray(val)) {
    val.forEach(tryParse);
  } else {
    tryParse(val);
  }
  return arr;
};

export default parser;