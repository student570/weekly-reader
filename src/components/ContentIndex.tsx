import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Bookmark,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  PanelLeftClose,
  Search,
  Sparkles,
  Tag,
} from 'lucide-react';
import {
  ALL_CATEGORIES,
  type Article,
  type ArticlePersonalNote,
  type Bookmark as BookmarkItem,
  type BookmarkFolder,
  type Category,
  type IssueMeta,
  type MiddleViewMode,
  type ReadingProgress,
  type SearchFilters,
  type YearGroup,
} from '../types';
import { extractSnippet } from '../utils/dataLoader';

interface ContentIndexProps {
  mode: MiddleViewMode;
  selectedIssue: IssueMeta | null;
  issueArticles: Article[];
  loadingIssue: boolean;
  selectedArticleId: string | null;
  getEffectiveCategory: (article: Article) => Category;
  progressMap: Map<string, ReadingProgress>;
  bookmarksMap: Map<string, BookmarkItem>;
  notesMap: Map<string, ArticlePersonalNote>;
  annotationCounts: Map<string, number>;
  folders: BookmarkFolder[];
  selectedFolderId: string | null;
  // Search
  searchFilters: SearchFilters;
  onUpdateSearchFilters: (next: SearchFilters) => void;
  searchResults: Article[];
  searchLoading: boolean;
  yearGroups: YearGroup[];
  allIssues: IssueMeta[];
  activeCategory: Category | 'ALL';
  onChangeActiveCategory: (cat: Category | 'ALL') => void;
  // Actions
  onSelectArticle: (article: Article) => void;
  onOpenOverview: () => void;
  onSelectIssueByNumber: (issueNumber: number, articleId?: string) => void;
  onCollapse?: () => void;
}

export const ContentIndex: React.FC<ContentIndexProps> = ({
  mode,
  selectedIssue,
  issueArticles,
  loadingIssue,
  selectedArticleId,
  getEffectiveCategory,
  progressMap,
  bookmarksMap,
  notesMap,
  annotationCounts,
  folders,
  selectedFolderId,
  searchFilters,
  onUpdateSearchFilters,
  searchResults,
  searchLoading,
  yearGroups,
  allIssues,
  activeCategory,
  onChangeActiveCategory,
  onSelectArticle,
  onOpenOverview,
  onSelectIssueByNumber,
  onCollapse,
}) => {
  const [bookmarkSort, setBookmarkSort] = useState<'newest' | 'oldest'>('newest');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  const filteredIssueArticles = useMemo(() => {
    if (activeCategory === 'ALL') return issueArticles;
    return issueArticles.filter((a) => getEffectiveCategory(a) === activeCategory);
  }, [issueArticles, activeCategory, getEffectiveCategory]);

  const bookmarkList = useMemo(() => {
    let list = Array.from(bookmarksMap.values());
    if (selectedFolderId) {
      list = list.filter((b) => b.folderId === selectedFolderId);
    }
    if (selectedTag !== 'ALL') {
      list = list.filter((b) => b.tags.includes(selectedTag));
    }
    list.sort((a, b) =>
      bookmarkSort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    );
    return list;
  }, [bookmarksMap, selectedFolderId, selectedTag, bookmarkSort]);

  const allBookmarkTags = useMemo(() => {
    const set = new Set<string>();
    bookmarksMap.forEach((b) => b.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [bookmarksMap]);

  const historyList = useMemo(() => {
    return Array.from(progressMap.values()).sort((a, b) => b.lastReadAt - a.lastReadAt);
  }, [progressMap]);

  const researchLaterList = useMemo(() => {
    return Array.from(notesMap.values())
      .filter((n) => n.researchLater)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notesMap]);

  const renderIssueMode = () => {
    if (!selectedIssue) {
      return (
        <div className="index-empty">
          <FileText size={28} />
          <p>从左侧选择一期周刊，或打开全文搜索</p>
        </div>
      );
    }

    const readCount = issueArticles.filter((a) => progressMap.get(a.id)?.read).length;

    return (
      <>
        <div className="index-header">
          <div className="index-header-top">
            <div>
              <div className="index-kicker">
                第 {selectedIssue.issueNumber} 期 · {selectedIssue.year}
                {selectedIssue.month ? ` ${selectedIssue.month}` : ''}
              </div>
              <h2 className="index-title">{selectedIssue.title}</h2>
            </div>
            <div className="index-header-actions">
              <button
                className="pill-action-btn"
                onClick={onOpenOverview}
                title="查看本期概览"
              >
                <BarChart3 size={14} />
                <span>概览</span>
              </button>
              {onCollapse && (
                <button className="icon-btn" onClick={onCollapse} title="折叠文章列表">
                  <PanelLeftClose size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="issue-progress-row">
            <div className="mini-progress-track">
              <div
                className="mini-progress-fill"
                style={{
                  width: `${
                    issueArticles.length > 0
                      ? Math.round((readCount / issueArticles.length) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="mini-progress-text">
              {readCount}/{issueArticles.length} 已读
            </span>
          </div>

          <div className="category-pills">
            <button
              className={`cat-pill ${activeCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => onChangeActiveCategory('ALL')}
            >
              全部 ({issueArticles.length})
            </button>
            {ALL_CATEGORIES.map((cat) => {
              const cnt = issueArticles.filter((a) => getEffectiveCategory(a) === cat).length;
              if (cnt === 0) return null;
              return (
                <button
                  key={cat}
                  className={`cat-pill ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => onChangeActiveCategory(cat)}
                >
                  {cat} ({cnt})
                </button>
              );
            })}
          </div>
        </div>

        <div className="index-list">
          {loadingIssue ? (
            <div className="index-empty">正在解析本期内容…</div>
          ) : (
            filteredIssueArticles.map((art) => {
              const cat = getEffectiveCategory(art);
              const prog = progressMap.get(art.id);
              const isBookmarked = bookmarksMap.has(art.id);
              const annCount = annotationCounts.get(art.id) || 0;
              const isActive = selectedArticleId === art.id;

              return (
                <button
                  key={art.id}
                  className={`article-card ${isActive ? 'active' : ''} ${prog?.read ? 'is-read' : ''}`}
                  onClick={() => onSelectArticle(art)}
                >
                  <div className="article-card-meta">
                    <span className={`cat-badge cat-${cat}`}>{cat}</span>
                    <span className="section-label">{art.section}</span>
                    <div className="article-card-icons">
                      {annCount > 0 && (
                        <span className="tiny-badge" title={`${annCount} 条批注`}>
                          {annCount} 批注
                        </span>
                      )}
                      {isBookmarked && <Bookmark size={12} className="icon-bookmarked" />}
                      {prog?.read && <CheckCircle2 size={12} className="icon-read" />}
                    </div>
                  </div>
                  <div className="article-card-title">{art.title}</div>
                  <div className="article-card-snippet">
                    {art.plainText.slice(0, 78)}
                    {art.plainText.length > 78 ? '…' : ''}
                  </div>
                  <div className="article-card-foot">
                    <span>约 {art.readingTimeMin} 分钟</span>
                    {art.githubRepos.length > 0 && (
                      <span className="gh-count">GitHub ×{art.githubRepos.length}</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </>
    );
  };

  const renderSearchMode = () => (
    <>
      <div className="index-header">
        <div className="index-header-top">
          <div>
            <div className="index-kicker">FULL-TEXT SEARCH</div>
            <h2 className="index-title">全文检索</h2>
          </div>
          {onCollapse && (
            <button className="icon-btn" onClick={onCollapse} title="折叠列表">
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        <div className="search-input-box">
          <Search size={15} />
          <input
            type="text"
            value={searchFilters.query}
            onChange={(e) =>
              onUpdateSearchFilters({ ...searchFilters, query: e.target.value })
            }
            placeholder="搜索标题、正文关键词、GitHub 项目名…"
            autoFocus
          />
        </div>

        <div className="search-filters-grid">
          <select
            value={searchFilters.category}
            onChange={(e) =>
              onUpdateSearchFilters({
                ...searchFilters,
                category: e.target.value as Category | 'ALL',
              })
            }
            aria-label="按分类筛选"
          >
            <option value="ALL">全部分类</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={searchFilters.yearGroup}
            onChange={(e) =>
              onUpdateSearchFilters({
                ...searchFilters,
                yearGroup: e.target.value as YearGroup | 'ALL',
              })
            }
            aria-label="按年份筛选"
          >
            <option value="ALL">全部年份</option>
            {yearGroups.map((yg) => (
              <option key={yg} value={yg}>
                {yg}
              </option>
            ))}
          </select>

          <select
            value={searchFilters.issueNumber}
            onChange={(e) =>
              onUpdateSearchFilters({
                ...searchFilters,
                issueNumber: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value),
              })
            }
            aria-label="按期数筛选"
          >
            <option value="ALL">全部期数</option>
            {allIssues.map((iss) => (
              <option key={iss.issueNumber} value={iss.issueNumber}>
                第 {iss.issueNumber} 期
              </option>
            ))}
          </select>
        </div>

        <div className="search-status-line">
          <Filter size={12} />
          <span>
            {searchLoading
              ? '正在加载全库索引…'
              : `找到 ${searchResults.length} 条结果${searchResults.length >= 120 ? '（显示前 120 条）' : ''}`}
          </span>
        </div>
      </div>

      <div className="index-list">
        {searchResults.length === 0 && !searchLoading ? (
          <div className="index-empty">
            <Search size={26} />
            <p>输入关键词或选择筛选条件开始搜索</p>
          </div>
        ) : (
          searchResults.map((art) => {
            const cat = getEffectiveCategory(art);
            const snippet = extractSnippet(art.plainText, searchFilters.query);
            return (
              <button
                key={art.id}
                className={`article-card ${selectedArticleId === art.id ? 'active' : ''}`}
                onClick={() => onSelectArticle(art)}
              >
                <div className="article-card-meta">
                  <span className="issue-tag">第 {art.issueNumber} 期</span>
                  <span className={`cat-badge cat-${cat}`}>{cat}</span>
                </div>
                <div className="article-card-title">{art.title}</div>
                <div className="article-card-snippet">{snippet}</div>
              </button>
            );
          })
        )}
      </div>
    </>
  );

  const renderBookmarksMode = () => {
    const folderName = selectedFolderId
      ? folders.find((f) => f.id === selectedFolderId)?.name || '收藏夹'
      : '全部收藏';

    return (
      <>
        <div className="index-header">
          <div className="index-header-top">
            <div>
              <div className="index-kicker">BOOKMARKS</div>
              <h2 className="index-title">{folderName}</h2>
            </div>
            <select
              className="compact-select"
              value={bookmarkSort}
              onChange={(e) => setBookmarkSort(e.target.value as 'newest' | 'oldest')}
            >
              <option value="newest">最新收藏</option>
              <option value="oldest">最早收藏</option>
            </select>
          </div>

          {allBookmarkTags.length > 0 && (
            <div className="category-pills">
              <button
                className={`cat-pill ${selectedTag === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedTag('ALL')}
              >
                <Tag size={11} /> 全部标签
              </button>
              {allBookmarkTags.map((tag) => (
                <button
                  key={tag}
                  className={`cat-pill ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => setSelectedTag(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="index-list">
          {bookmarkList.length === 0 ? (
            <div className="index-empty">
              <Bookmark size={26} />
              <p>暂无收藏文章，阅读时点击右上角收藏按钮即可添加</p>
            </div>
          ) : (
            bookmarkList.map((bm) => {
              const folder = folders.find((f) => f.id === bm.folderId);
              return (
                <button
                  key={bm.articleId}
                  className={`article-card ${selectedArticleId === bm.articleId ? 'active' : ''}`}
                  onClick={() => onSelectIssueByNumber(bm.issueNumber, bm.articleId)}
                >
                  <div className="article-card-meta">
                    <span className="issue-tag">第 {bm.issueNumber} 期</span>
                    <span className={`cat-badge cat-${bm.category}`}>{bm.category}</span>
                    {folder && <span className="folder-pill">{folder.name}</span>}
                  </div>
                  <div className="article-card-title">{bm.title}</div>
                  {bm.note && <div className="bookmark-note-preview">备注：{bm.note}</div>}
                  <div className="article-card-foot">
                    <span>{new Date(bm.createdAt).toLocaleDateString('zh-CN')}</span>
                    {bm.tags.length > 0 && (
                      <span className="tags-inline">
                        {bm.tags.map((t) => `#${t}`).join(' ')}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </>
    );
  };

  const renderResearchLaterMode = () => (
    <>
      <div className="index-header">
        <div className="index-header-top">
          <div>
            <div className="index-kicker">RESEARCH QUEUE</div>
            <h2 className="index-title">稍后研究</h2>
          </div>
        </div>
      </div>
      <div className="index-list">
        {researchLaterList.length === 0 ? (
          <div className="index-empty">
            <Sparkles size={26} />
            <p>暂无标记为“稍后研究”的文章</p>
          </div>
        ) : (
          researchLaterList.map((n) => {
            const issueNum = Number(n.articleId.match(/issue-(\d+)/)?.[1] || 0);
            const prog = progressMap.get(n.articleId);
            return (
              <button
                key={n.articleId}
                className={`article-card ${selectedArticleId === n.articleId ? 'active' : ''}`}
                onClick={() => onSelectIssueByNumber(issueNum, n.articleId)}
              >
                <div className="article-card-meta">
                  <span className="issue-tag">第 {issueNum} 期</span>
                  <span className="tiny-badge">稍后研究</span>
                </div>
                <div className="article-card-title">
                  {prog?.title || n.articleId}
                </div>
                {n.summary && <div className="article-card-snippet">{n.summary}</div>}
              </button>
            );
          })
        )}
      </div>
    </>
  );

  const renderHistoryMode = () => (
    <>
      <div className="index-header">
        <div className="index-header-top">
          <div>
            <div className="index-kicker">READING HISTORY</div>
            <h2 className="index-title">阅读历史</h2>
          </div>
        </div>
      </div>
      <div className="index-list">
        {historyList.length === 0 ? (
          <div className="index-empty">
            <Clock size={26} />
            <p>还没有阅读记录，挑一篇感兴趣的文章开始吧</p>
          </div>
        ) : (
          historyList.map((h) => (
            <button
              key={h.articleId}
              className={`article-card ${selectedArticleId === h.articleId ? 'active' : ''}`}
              onClick={() => onSelectIssueByNumber(h.issueNumber, h.articleId)}
            >
              <div className="article-card-meta">
                <span className="issue-tag">第 {h.issueNumber} 期</span>
                {h.read ? (
                  <span className="tiny-badge read">已读</span>
                ) : (
                  <span className="tiny-badge">{Math.round(h.scrollPercent)}%</span>
                )}
              </div>
              <div className="article-card-title">{h.title}</div>
              <div className="article-card-foot">
                <span>{new Date(h.lastReadAt).toLocaleString('zh-CN')}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );

  return (
    <section className="middle-pane">
      {mode === 'issue' && renderIssueMode()}
      {mode === 'search' && renderSearchMode()}
      {mode === 'bookmarks' && renderBookmarksMode()}
      {mode === 'research-later' && renderResearchLaterMode()}
      {mode === 'history' && renderHistoryMode()}
    </section>
  );
};
