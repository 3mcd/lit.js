/**
 * Create a WeakMap. Falls back to naive map implementation if WeakMap is
 * unsupported.
 * @return {WeakMap}
 */
const map = () => {
  if ('WeakMap' in window) {
    return new WeakMap();
  }
  const keys = [];
  const values = [];
  const pos = obj => {
    for (let i = 0, len = keys.length; i < len; i++) {
      if (keys[i] === obj) {
        return i;
      }
    }
    return false;
  };
  const get = obj => values[pos(obj)];
  const set = (obj, val) => {
    const i = pos(obj);
    if (i) {
      values[i] = val;
    } else {
      keys.push(obj);
      values.push(obj);
    }
  };
  const _delete = obj => {
    const i = pos(obj);
    if (i) {
      keys.splice(i, 1);
      values.splice(i, 1);
    }
  };
  return { get, set, delete: _delete };
};

export default map;