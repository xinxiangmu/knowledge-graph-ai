export function el(tag: string, options: { cls?: string; text?: string; attr?: Record<string, string>; dataset?: Record<string, string> } = {}): any {
  const element = (createEl as any)(tag, {
    cls: options.cls,
    text: options.text,
    attr: options.attr,
  });
  if (options.dataset) {
    for (const [key, value] of Object.entries(options.dataset)) {
      element.dataset[key] = value;
    }
  }
  return element;
}

export function svgEl(tag: string, options: { cls?: string; attr?: Record<string, string> } = {}): any {
  return (createSvg as any)(tag, {
    cls: options.cls,
    attr: options.attr,
  });
}

export function parseSvg(svgString: string): HTMLElement {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) {
    return el('span');
  }
  const wrapper = el('div');
  while (svg.firstChild) {
    wrapper.appendChild(svg.firstChild);
  }
  for (const attr of Array.from(svg.attributes)) {
    wrapper.setAttribute(attr.name, attr.value);
  }
  wrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return wrapper;
}

export function parseHtml(htmlString: string): DocumentFragment {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<!DOCTYPE html><html><body>${htmlString}</body></html>`, 'text/html');
  const fragment = document.createDocumentFragment();
  const body = doc.body;
  while (body.firstChild) {
    fragment.appendChild(body.firstChild);
  }
  return fragment;
}

export function applyCssText(el: HTMLElement, cssText: string): void {
  const props: Record<string, string> = {};
  const declarations = cssText.split(';');
  for (const decl of declarations) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.substring(0, colonIdx).trim();
    const value = trimmed.substring(colonIdx + 1).trim();
    const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    props[camelKey] = value;
  }
  el.setCssProps(props);
}

export function setStyles(el: HTMLElement, styles: Record<string, string>): void {
  el.setCssProps(styles);
}

export function setStyle(el: HTMLElement, prop: string, value: string): void {
  el.style.setProperty(prop, value);
}

export function buildElement(
  tag: string,
  options: {
    className?: string;
    textContent?: string;
    innerHTML?: string;
    attrs?: Record<string, string>;
    children?: HTMLElement[];
  } = {}
): HTMLElement {
  const el2 = (createEl as any)(tag, {
    cls: options.className,
    text: options.textContent,
    attr: options.attrs,
  }) as HTMLElement;
  if (options.innerHTML) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(options.innerHTML, 'text/html');
    const fragment = doc.body;
    while (fragment.firstChild) {
      el2.appendChild(fragment.firstChild);
    }
  }
  if (options.children) {
    for (const child of options.children) {
      el2.appendChild(child as unknown as Node);
    }
  }
  return el2;
}
