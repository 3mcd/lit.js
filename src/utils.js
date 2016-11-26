const matches = (node, regex) => {
  regex.lastIndex = 0;
  return regex.test(node.textContent);
};

const getPlaceholderId = (node) => Number(node.textContent.match(/[\w\.]+/)[0]);

const swap = (els, ref) => {
  const parent = ref.parentNode;
  if (Array.isArray(els)) {
    swap(els[0], ref);
    els.slice(1).forEach((el, i) => parent.insertBefore(el, els[i].nextSibling));
  } else {
    parent.replaceChild(els, ref);
  }
};

const empty = (parent) => {
  while (parent.firstChild) parent.removeChild(parent.firstChild);
};

const moveChildren = (from, to) => {
  while (from.childNodes.length > 0) {
    to.appendChild(from.childNodes[0]);
  }
}

const findTextNodes = (el) => {
  var n, a = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  while (n = walk.nextNode()) a.push(n);
  return a;
};

const tempElement = (html) => {
  const el = document.createElement('span');
  el.innerHTML = html || '';
  return el;
};

const replaceElements = (el, elements, regex) => {
  const placeholders = [];
  // Find placeholder groups. e.g. <% 1 %><% 2 %>
  const groups = findTextNodes(el).filter(p => matches(p, regex));
  groups.forEach((group) => {
    // Find sub-placeholders. e.g. <% 2 %>
    const matches = group.textContent.match(regex);
    // For each sub-placeholder
    var rest = group;
    matches.forEach((text, i) => {
      var start = rest.textContent.indexOf(text);
      var remaining = rest.splitText(start);
      rest = remaining.splitText(text.length);
      // Grab the newly isolated placeholder
      placeholders.push(remaining);
    });
  });
  // Swap each placeholder with its corresponding element in the(elements Array
  placeholders.forEach((placeholder) => {
    const pos = getPlaceholderId(placeholder);
    swap(elements[pos], placeholder);
  });
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
  empty,
  getPlaceholderId,
  replaceElements,
  moveChildren,
  escape,
  tempElement
};