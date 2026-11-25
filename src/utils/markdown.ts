import { Marked } from 'marked';
import hljs from 'highlight.js';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function renderMarkdownWithToc(markdown: string): {
  html: string;
  toc: TocItem[];
} {
  const toc: TocItem[] = [];
  let headingCounter = 0;

  const marked = new Marked({
    gfm: true,
    breaks: false,
  });

  const renderer = {
    heading(token: { text: string; depth: number }) {
      const id = `heading-${++headingCounter}`;
      const cleanText = token.text.replace(/<[^>]+>/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      toc.push({ id, text: cleanText, level: token.depth });
      return `<h${token.depth} id="${id}">${marked.parseInline(token.text)}</h${token.depth}>`;
    },
    link(token: { href: string; title?: string | null; text: string }) {
      const isExternal = /^https?:\/\//i.test(token.href);
      const titleAttr = token.title ? ` title="${escapeHtml(token.title)}"` : '';
      const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${escapeHtml(token.href)}"${titleAttr}${targetAttr}>${marked.parseInline(token.text)}</a>`;
    },
    image(token: { href: string; title?: string | null; text: string }) {
      const alt = escapeHtml(token.text || '');
      const titleAttr = token.title ? ` title="${escapeHtml(token.title)}"` : '';
      return `<figure class="reader-figure"><img src="${escapeHtml(token.href)}" alt="${alt}"${titleAttr} loading="lazy" />${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`;
    },
    code(token: { text: string; lang?: string }) {
      const lang = (token.lang || '').trim();
      let highlighted: string;
      if (lang && hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(token.text, { language: lang }).value;
      } else {
        highlighted = hljs.highlightAuto(token.text).value;
      }
      const displayLang = lang || 'code';
      const encoded = encodeURIComponent(token.text);
      return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang">${escapeHtml(displayLang)}</span><button type="button" class="code-copy-btn" data-code="${encoded}">复制</button></div><pre><code class="hljs language-${escapeHtml(lang)}">${highlighted}</code></pre></div>`;
    },
  };

  marked.use({ renderer: renderer as never });
  const html = marked.parse(markdown) as string;
  return { html, toc };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
