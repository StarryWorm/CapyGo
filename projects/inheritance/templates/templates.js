// Generic Template Loading
async function loadTemplate(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.text();
    }

/**
 * Simple {{key}} → data[key] replacer.
 * If a key is missing, replaces with empty string.
 */
function fillTemplate(tpl, data) {
    return tpl.replace(/{{(\w+)}}/g, (_, key) =>
        String(data[key] ?? '')
    );
}


// Node Section
let nodeTpl, emptyTpl;

export async function initNodeTemplates() {
  // fetch once, cache for reuse
  [nodeTpl, emptyTpl] = await Promise.all([
    loadTemplate('./templates/node.html'),
    loadTemplate('./templates/node_empty.html')
  ]);
}

export function createNodeElement(node, maxLevel, currentLevel, displayName) {
  if (!nodeTpl) throw new Error('Templates not initialized');

  // fill in the placeholders
  return fillTemplate(nodeTpl, {
    id: node.id,
    displayName,
    currentLevel,
    maxLevel
  });
}

export function createEmptyNodeElement() {
  if (!emptyTpl) throw new Error('Templates not initialized');
  return emptyTpl; // no placeholders to replace
}