/**
 * Create a WeakSet. Falls back to naive set implementation if WeakSet is
 * unsupported.
 * @return {WeakSet}
 */
const set = () => {
  if ('WeakSet' in window) {
    return new WeakSet();
  }
  const values = [];
  const add = obj => !has(obj) ? values.push(obj) : false;
  const has = obj => values.indexOf(obj) > -1;
  const _delete = obj => has(obj) ? values.splice(values.indexOf(obj), 1)[0] : false;
  return { add, has, delete: _delete };
};

export default set;