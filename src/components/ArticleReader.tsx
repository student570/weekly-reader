import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Highlighter,
  Link2,
  List,
  Maximize2,
  Minimize2,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  Type,
} from 'lucide-react';
import {
  ALL_CATEGORIES,
  type Annotation,
  type Article,
  type ArticlePersonalNote,
  type Bookmark as BookmarkItem,
  type BookmarkFolder,
  type Category,
  type LayoutState,
  type ReadingProgress,
} from '../types';
import { renderMarkdownWithToc } from '../utils/markdown';

interface ArticleReaderProps {
  article: Article;
  effectiveCategory: Category;
  progress: ReadingProgress | undefined;
  bookmark: BookmarkItem | undefined;
  folders: BookmarkFolder[];
  annotations: Annotation[];
  personalNote: ArticlePersonalNote | undefined;
  layout: LayoutState;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onChangeCategory: (category: Category) => void;
  onToggleRead: () => void;
  onUpdateScrollPercent: (percent: number) => void;
  onSaveBookmark: (data: {
    folderId: string;
    tags: string[];
    note: string;
  }) => void;
  onDeleteBookmark: () => void;
  onAddAnnotation: (data: {
    quote: string;
    comment: string;
    color: Annotation['color'];
  }) => void;
  onDeleteAnnotation: (id: string) => void;
  onSavePersonalNote: (note: ArticlePersonalNote) => void;
  onUpdateLayout: (patch: Partial<LayoutState>) => void;
}

export const ArticleReader: React.FC<ArticleReaderProps> = ({
  article,
  effectiveCategory,
  progress,
  bookmark,
  folders,
  annotations,
  personalNote,
  layout,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onChangeCategory,
  onToggleRead,
  onUpdateScrollPercent,
  onSaveBookmark,
  onDeleteBookmark,
  onAddAnnotation,
  onDeleteAnnotation,
  onSavePersonalNote,
  onUpdateLayout,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const articleBodyRef = useRef<HTMLDivElement>(null);

  const [showBookmarkMenu, setShowBookmarkMenu] = useState(false);
  const [bmFolderId, setBmFolderId] = useState(
    bookmark?.folderId || folders[0]?.id || 'folder-ai-agent'
  );
  const [bmTagsText, setBmTagsText] = useState(bookmark?.tags.join(', ') || '');
  const [bmNote, setBmNote] = useState(bookmark?.note || '');

  const [showTypography, setShowTypography] = useState(false);

  // Selection annotation popover state
  const [selectionBox, setSelectionBox] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);
  const [composingAnnotation, setComposingAnnotation] = useState(false);
  const [annComment, setAnnComment] = useState('');
  const [annColor, setAnnColor] = useState<Annotation['color']>('amber');

  // Personal notes local state
  const [summaryText, setSummaryText] = useState(personalNote?.summary || '');
  const [viewpointText, setViewpointText] = useState(personalNote?.viewpoint || '');
  const [extraLinkLabel, setExtraLinkLabel] = useState('');
  const [extraLinkUrl, setExtraLinkUrl] = useState('');
  const [noteSavedToast, setNoteSavedToast] = useState(false);

  useEffect(() => {
    setBmFolderId(bookmark?.folderId || folders[0]?.id || 'folder-ai-agent');
    setBmTagsText(bookmark?.tags.join(', ') || '');
    setBmNote(bookmark?.note || '');
  }, [bookmark, folders, article.id]);

  useEffect(() => {
    setSummaryText(personalNote?.summary || '');
    setViewpointText(personalNote?.viewpoint || '');
    setSelectionBox(null);
    setComposingAnnotation(false);
    setShowBookmarkMenu(false);
  }, [personalNote, article.id]);

  // Restore scroll position when opening article
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (progress && progress.scrollPercent > 2 && progress.scrollPercent < 98) {
      requestAnimationFrame(() => {
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll > 0) {
          el.scrollTop = (progress.scrollPercent / 100) * maxScroll;
        }
      });
    } else {
      el.scrollTop = 0;
    }
  }, [article.id]);

  const { html, toc } = useMemo(
    () => renderMarkdownWithToc(article.markdown),
    [article.markdown]
  );

  // Code copy button handler via event delegation
  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const copyBtn = target.closest('.code-copy-btn') as HTMLButtonElement | null;
    if (copyBtn) {
      const encoded = copyBtn.getAttribute('data-code') || '';
      const code = decodeURIComponent(encoded);
      navigator.clipboard.writeText(code).then(() => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = '已复制';
        setTimeout(() => {
          copyBtn.textContent = orig || '复制';
        }, 1500);
      });
    }
  };

  // Text selection for annotation
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      if (!composingAnnotation) setSelectionBox(null);
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 3 || !articleBodyRef.current?.contains(sel.anchorNode)) {
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = scrollContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setSelectionBox({
      text,
      top: rect.top - containerRect.top + (scrollContainerRef.current?.scrollTop || 0) - 44,
      left: Math.max(
        16,
        Math.min(rect.left - containerRect.left, containerRect.width - 260)
      ),
    });
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const pct = maxScroll <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / maxScroll) * 100));
    onUpdateScrollPercent(pct);
  };

  const handleSaveBmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = bmTagsText
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    onSaveBookmark({ folderId: bmFolderId, tags, note: bmNote.trim() });
    setShowBookmarkMenu(false);
  };

  const handleSaveAnnotationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectionBox) return;
    onAddAnnotation({
      quote: selectionBox.text,
      comment: annComment.trim(),
      color: annColor,
    });
    setAnnComment('');
    setComposingAnnotation(false);
    setSelectionBox(null);
    window.getSelection()?.removeAllRanges();
  };

  const persistPersonalNote = (patch: Partial<ArticlePersonalNote>) => {
    onSavePersonalNote({
      articleId: article.id,
      summary: summaryText,
      viewpoint: viewpointText,
      extraLinks: personalNote?.extraLinks || [],
      researchLater: personalNote?.researchLater || false,
      updatedAt: Date.now(),
      ...patch,
    });
    setNoteSavedToast(true);
    setTimeout(() => setNoteSavedToast(false), 1500);
  };

  const handleAddExtraLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraLinkUrl.trim()) return;
    const nextLinks = [
      ...(personalNote?.extraLinks || []),
      {
        label: extraLinkLabel.trim() || extraLinkUrl.trim(),
        url: extraLinkUrl.trim(),
      },
    ];
    persistPersonalNote({ extraLinks: nextLinks });
    setExtraLinkLabel('');
    setExtraLinkUrl('');
  };

  const handleRemoveExtraLink = (idx: number) => {
    const nextLinks = (personalNote?.extraLinks || []).filter((_, i) => i !== idx);
    persistPersonalNote({ extraLinks: nextLinks });
  };

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={`reader-shell font-${layout.fontSize} width-${layout.lineWidth}`}>
      {/* Sticky Top Reading Progress Bar */}
      <div className="reader-progress-track">
        <div
          className="reader-progress-fill"
          style={{ width: `${progress?.scrollPercent || 0}%` }}
        />
      </div>

      {/* Reader Toolbar */}
      <div className="reader-toolbar">
        <div className="reader-toolbar-left">
          <span className="reader-breadcrumb">
            第 {article.issueNumber} 期 · {article.section}
          </span>
          <select
            className={`cat-select cat-${effectiveCategory}`}
            value={effectiveCategory}
            onChange={(e) => onChangeCategory(e.target.value as Category)}
            title="修改文章分类（自动保存）"
          >
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="reader-toolbar-actions">
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="toolbar-btn"
              title="打开原文链接"
            >
              <ExternalLink size={15} />
              <span className="hide-sm">原文</span>
            </a>
          )}

          <button
            className={`toolbar-btn ${progress?.read ? 'active-success' : ''}`}
            onClick={onToggleRead}
            title="标记已读 / 未读 (M)"
          >
            <CheckCircle2 size={15} />
            <span className="hide-sm">{progress?.read ? '已读' : '标为已读'}</span>
          </button>

          <button
            className={`toolbar-btn ${personalNote?.researchLater ? 'active-accent' : ''}`}
            onClick={() =>
              persistPersonalNote({ researchLater: !personalNote?.researchLater })
            }
            title="标记为稍后研究"
          >
            <Sparkles size={15} />
            <span className="hide-sm">稍后研究</span>
          </button>

          <div className="popover-anchor">
            <button
              className={`toolbar-btn ${bookmark ? 'active-accent' : ''}`}
              onClick={() => setShowBookmarkMenu((v) => !v)}
              title="收藏到收藏夹 (B)"
            >
              <Bookmark size={15} fill={bookmark ? 'currentColor' : 'none'} />
              <span className="hide-sm">{bookmark ? '已收藏' : '收藏'}</span>
            </button>

            {showBookmarkMenu && (
              <form className="reader-popover bookmark-popover" onSubmit={handleSaveBmSubmit}>
                <div className="popover-title">收藏文章</div>
                <label className="popover-field">
                  <span>收藏夹</span>
                  <select
                    value={bmFolderId}
                    onChange={(e) => setBmFolderId(e.target.value)}
                  >
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="popover-field">
                  <span>标签（空格或逗号分隔）</span>
                  <input
                    type="text"
                    value={bmTagsText}
                    onChange={(e) => setBmTagsText(e.target.value)}
                    placeholder="例如：AI Agent MCP"
                  />
                </label>
                <label className="popover-field">
                  <span>个人备注</span>
                  <textarea
                    rows={2}
                    value={bmNote}
                    onChange={(e) => setBmNote(e.target.value)}
                    placeholder="记录为什么收藏这篇文章…"
                  />
                </label>
                <div className="popover-actions">
                  {bookmark && (
                    <button
                      type="button"
                      className="btn-danger-ghost"
                      onClick={() => {
                        onDeleteBookmark();
                        setShowBookmarkMenu(false);
                      }}
                    >
                      取消收藏
                    </button>
                  )}
                  <button type="submit" className="btn-primary-sm">
                    保存收藏
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="popover-anchor">
            <button
              className="toolbar-btn"
              onClick={() => setShowTypography((v) => !v)}
              title="排版与主题设置"
            >
              <Type size={15} />
            </button>

            {showTypography && (
              <div className="reader-popover typography-popover">
                <div className="popover-title">阅读排版</div>
                <div className="typo-row">
                  <span>字号</span>
                  <div className="segmented-ctrl">
                    {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={layout.fontSize === s ? 'active' : ''}
                        onClick={() => onUpdateLayout({ fontSize: s })}
                      >
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="typo-row">
                  <span>行宽</span>
                  <div className="segmented-ctrl">
                    {(
                      [
                        ['narrow', '窄'],
                        ['medium', '适中'],
                        ['wide', '宽'],
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={layout.lineWidth === val ? 'active' : ''}
                        onClick={() => onUpdateLayout({ lineWidth: val })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="typo-row">
                  <span>主题</span>
                  <button
                    type="button"
                    className="pill-action-btn"
                    onClick={() =>
                      onUpdateLayout({
                        theme: layout.theme === 'light' ? 'dark' : 'light',
                      })
                    }
                  >
                    {layout.theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
                    <span>{layout.theme === 'light' ? '切换深色' : '切换浅色'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {toc.length > 0 && (
            <button
              className={`toolbar-btn ${layout.tocVisible ? 'active-accent' : ''}`}
              onClick={() => onUpdateLayout({ tocVisible: !layout.tocVisible })}
              title="显示 / 隐藏目录"
            >
              <List size={15} />
            </button>
          )}

          <button
            className={`toolbar-btn ${layout.focusMode ? 'active-accent' : ''}`}
            onClick={() => onUpdateLayout({ focusMode: !layout.focusMode })}
            title="专注阅读模式 (F)"
          >
            {layout.focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      <div className="reader-body-layout">
        <div
          className="reader-scroll-area"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onMouseUp={handleMouseUp}
        >
          {/* Floating Selection Annotation Popover */}
          {selectionBox && (
            <div
              className="selection-popover"
              style={{ top: Math.max(8, selectionBox.top), left: selectionBox.left }}
            >
              {!composingAnnotation ? (
                <button
                  type="button"
                  className="selection-trigger-btn"
                  onClick={() => setComposingAnnotation(true)}
                >
                  <Highlighter size={13} />
                  <span>添加批注</span>
                </button>
              ) : (
                <form
                  className="annotation-composer"
                  onSubmit={handleSaveAnnotationSubmit}
                >
                  <div className="color-dots">
                    {(['amber', 'teal', 'rose', 'slate'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`color-dot dot-${c} ${annColor === c ? 'selected' : ''}`}
                        onClick={() => setAnnColor(c)}
                      />
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={annComment}
                    onChange={(e) => setAnnComment(e.target.value)}
                    placeholder="写下你的批注或想法…"
                    autoFocus
                  />
                  <div className="composer-actions">
                    <button
                      type="button"
                      className="btn-ghost-xs"
                      onClick={() => {
                        setComposingAnnotation(false);
                        setSelectionBox(null);
                      }}
                    >
                      取消
                    </button>
                    <button type="submit" className="btn-primary-xs">
                      保存批注
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <article className="reader-article-column">
            <header className="article-header">
              <div className="article-meta-line">
                <span>第 {article.issueNumber} 期</span>
                <span>·</span>
                <span>{article.year} {article.month}</span>
                <span>·</span>
                <span>约 {article.readingTimeMin} 分钟阅读</span>
              </div>
              <h1 className="article-main-title">{article.title}</h1>
              {article.githubRepos.length > 0 && (
                <div className="article-gh-repos">
                  {article.githubRepos.map((repo) => (
                    <a
                      key={repo}
                      href={`https://github.com/${repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="repo-pill"
                    >
                      <GitBranch size={12} />
                      <span>{repo}</span>
                      <ExternalLink size={11} />
                    </a>
                  ))}
                </div>
              )}
            </header>

            {/* Original Markdown Content (strictly read-only) */}
            <div
              ref={articleBodyRef}
              className="markdown-body"
              onClick={handleBodyClick}
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {/* Personal Annotations & Notes (strictly separated from original article) */}
            <section className="personal-workspace">
              <div className="workspace-header">
                <h3>个人批注与笔记</h3>
                <span className="workspace-hint">
                  与原文完全隔离，保存在本地 IndexedDB
                  {noteSavedToast && ' · 已保存'}
                </span>
              </div>

              {annotations.length > 0 && (
                <div className="annotations-list">
                  <div className="sub-label">划词批注 ({annotations.length})</div>
                  {annotations.map((ann) => (
                    <div key={ann.id} className={`annotation-card border-${ann.color}`}>
                      <blockquote className="annotation-quote">“{ann.quote}”</blockquote>
                      {ann.comment && <p className="annotation-comment">{ann.comment}</p>}
                      <div className="annotation-foot">
                        <span>{new Date(ann.createdAt).toLocaleString('zh-CN')}</span>
                        <button
                          type="button"
                          className="icon-btn-xs"
                          onClick={() => onDeleteAnnotation(ann.id)}
                          title="删除批注"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="notes-grid">
                <div className="note-field">
                  <label>文章摘要</label>
                  <textarea
                    rows={3}
                    value={summaryText}
                    onChange={(e) => setSummaryText(e.target.value)}
                    onBlur={() => persistPersonalNote({ summary: summaryText })}
                    placeholder="用自己的话总结核心要点…"
                  />
                </div>
                <div className="note-field">
                  <label>个人观点</label>
                  <textarea
                    rows={3}
                    value={viewpointText}
                    onChange={(e) => setViewpointText(e.target.value)}
                    onBlur={() => persistPersonalNote({ viewpoint: viewpointText })}
                    placeholder="记录你的思考、质疑或应用场景…"
                  />
                </div>
              </div>

              <div className="extra-links-box">
                <div className="sub-label">相关外部链接</div>
                {(personalNote?.extraLinks || []).length > 0 && (
                  <div className="extra-links-list">
                    {(personalNote?.extraLinks || []).map((lnk, idx) => (
                      <div key={idx} className="extra-link-row">
                        <Link2 size={13} />
                        <a href={lnk.url} target="_blank" rel="noopener noreferrer">
                          {lnk.label}
                        </a>
                        <button
                          type="button"
                          className="icon-btn-xs"
                          onClick={() => handleRemoveExtraLink(idx)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form className="extra-link-form" onSubmit={handleAddExtraLink}>
                  <input
                    type="text"
                    value={extraLinkLabel}
                    onChange={(e) => setExtraLinkLabel(e.target.value)}
                    placeholder="链接名称（可选）"
                  />
                  <input
                    type="url"
                    value={extraLinkUrl}
                    onChange={(e) => setExtraLinkUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <button type="submit" className="pill-action-btn">
                    <Plus size={13} /> 添加
                  </button>
                </form>
              </div>
            </section>

            {/* Prev / Next Navigation */}
            <footer className="article-footer-nav">
              <button
                className="footer-nav-btn"
                disabled={!hasPrev}
                onClick={onPrev}
              >
                <ChevronLeft size={16} />
                <span>上一篇 (K)</span>
              </button>
              <button
                className="footer-nav-btn"
                disabled={!hasNext}
                onClick={onNext}
              >
                <span>下一篇 (J)</span>
                <ChevronRight size={16} />
              </button>
            </footer>
          </article>
        </div>

        {/* Collapsible TOC */}
        {layout.tocVisible && toc.length > 0 && (
          <aside className="reader-toc">
            <div className="toc-title">目录</div>
            <nav className="toc-list">
              {toc.map((item) => (
                <button
                  key={item.id}
                  className={`toc-item level-${item.level}`}
                  onClick={() => scrollToHeading(item.id)}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </div>
  );
};
