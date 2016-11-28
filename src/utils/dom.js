const getPlaceholderId = (node) => Number(node.textContent.match(/[\w\.]+/)[0]);

const isMatch = (str, regex) => {
  regex.lastIndex = 0;
  return regex.test(str);
};

const swap = (el, ref) => {
  const parent = ref.parentNode;
  if (Array.isArray(el)) {
    swap(el[0], ref);
    for (let i = 1, len = el.length; i < len; i++) {
      parent.insertBefore(el[i], el[i - 1].nextSibling);
    }
  } else {
    parent.replaceChild(el, ref);
  }
};

const emptyNode = (parent) => {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
};

const moveChildNodes = (from, to) => {
  while (from.childNodes.length > 0) {
    to.appendChild(from.childNodes[0]);
  }
};

const tempElement = (html) => {
  const el = document.createElement('span');
  el.innerHTML = html || '';
  return el;
};

const replaceElements = (el, elements, regex) => {
  let p = [...el.getElementsByClassName('__lit')];
  for (let i = elements.length - 1; i >= 0; i--) {
    swap(elements[i], p[i]);
  }
};

export {
  emptyNode,
  tempElement,
  moveChildNodes,
  replaceElements
};