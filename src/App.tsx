import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  FileText,
  Home,
  Menu,
  Minimize2,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ContentIndex } from './components/ContentIndex';
import { Dashboard } from './components/Dashboard';
import { IssueOverview } from './components/IssueOverview';
import { ArticleReader } from './components/ArticleReader';
import {
  deleteAnnotation,
  deleteBookmark,
  deleteFolder,
  exportPersonalData,
  loadAllPersonalData,
  saveAnnotation,
  saveArticleNote,
  saveBookmark,
  saveCategoryOverride,
  saveFolder,
  saveReadingProgress,
} from './db/indexedDb';
import {
  fetchAllArticlesForSearch,
  fetchIssueArticles,
  fetchIssuesIndex,
} from './utils/dataLoader';
import type {
  Annotation,
  Article,
  ArticlePersonalNote,
  Bookmark,
  BookmarkFolder,
  Category,
  IssueMeta,
  IssuesIndex,
  LayoutState,
  MiddleViewMode,
  MobilePane,
  ReadingProgress,
  RightViewMode,
  SearchFilters,
  YearGroup,
} from './types';

const LAYOUT_STORAGE_KEY = 'weekly-reader-layout-v1';

const DEFAULT_LAYOUT: LayoutState = {
  leftWidth: 256,
  middleWidth: 340,
  leftCollapsed: false,
  middleCollapsed: false,
  focusMode: false,
  theme: 'light',
  fontSize: 'md',
  lineWidth: 'medium',
  tocVisible: true,
};

function loadSavedLayout(): LayoutState {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    return { ...DEFAULT_LAYOUT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function App() {
  const [layout, setLayout] = useState<LayoutState>(loadSavedLayout);
  const [indexData, setIndexData] = useState<IssuesIndex | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Navigation state
  const [middleViewMode, setMiddleViewMode] = useState<MiddleViewMode>('issue');
  const [rightViewMode, setRightViewMode] = useState<RightViewMode>('dashboard');
  const [selectedIssueNumber, setSelectedIssueNumber] = useState<number | null>(null);
  const [issueArticles, setIssueArticles] = useState<Article[]>([]);
  const [loadingIssue, setLoadingIssue] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Mobile single-pane state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>('dashboard');

  // Personal data from IndexedDB
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [articleNotes, setArticleNotes] = useState<ArticlePersonalNote[]>([]);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>([]);
  const [categoryOverrides, setCategoryOverrides] = useState<Map<string, Category>>(
    new Map()
  );

  // Search state
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    category: 'ALL',
    yearGroup: 'ALL',
    issueNumber: 'ALL',
  });
  const [searchCorpus, setSearchCorpus] = useState<Article[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Persist layout state
  const updateLayout = useCallback((patch: Partial<LayoutState>) => {
    setLayout((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  }, []);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', layout.theme);
  }, [layout.theme]);

  // Initial load: issues index + IndexedDB personal data
  useEffect(() => {
    fetchIssuesIndex()
      .then((data) => {
        setIndexData(data);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : '加载失败');
      });

    loadAllPersonalData().then((pdata) => {
      setFolders(pdata.folders);
      setBookmarks(pdata.bookmarks);
      setAnnotations(pdata.annotations);
      setArticleNotes(pdata.articleNotes);
      setReadingProgress(pdata.readingProgress);
      const ovMap = new Map<string, Category>();
      pdata.categoryOverrides.forEach((o) => ovMap.set(o.articleId, o.category));
      setCategoryOverrides(ovMap);
    });
  }, []);

  // Derived maps
  const issuesByNumber = useMemo(() => {
    const map = new Map<number, IssueMeta>();
    indexData?.issues.forEach((i) => map.set(i.issueNumber, i));
    return map;
  }, [indexData]);

  const issuesByYearGroup = useMemo(() => {
    const grouped: Record<YearGroup, IssueMeta[]> = {
      '2026': [],
      '2025': [],
      '2024': [],
      历史归档: [],
    };
    indexData?.issues.forEach((i) => {
      grouped[i.yearGroup].push(i);
    });
    return grouped;
  }, [indexData]);

  const progressMap = useMemo(() => {
    const m = new Map<string, ReadingProgress>();
    readingProgress.forEach((p) => m.set(p.articleId, p));
    return m;
  }, [readingProgress]);

  const bookmarksMap = useMemo(() => {
    const m = new Map<string, Bookmark>();
    bookmarks.forEach((b) => m.set(b.articleId, b));
    return m;
  }, [bookmarks]);

  const notesMap = useMemo(() => {
    const m = new Map<string, ArticlePersonalNote>();
    articleNotes.forEach((n) => m.set(n.articleId, n));
    return m;
  }, [articleNotes]);

  const annotationCounts = useMemo(() => {
    const m = new Map<string, number>();
    annotations.forEach((a) => m.set(a.articleId, (m.get(a.articleId) || 0) + 1));
    return m;
  }, [annotations]);

  const getEffectiveCategory = useCallback(
    (article: Article): Category => {
      return categoryOverrides.get(article.id) || article.autoCategory;
    },
    [categoryOverrides]
  );

  // Load issue articles
  const openIssue = useCallback(
    async (issue: IssueMeta, targetArticleId?: string, showOverview = false) => {
      setMiddleViewMode('issue');
      setSelectedIssueNumber(issue.issueNumber);
      setLoadingIssue(true);
      setMobileDrawerOpen(false);
      if (showOverview) {
        setRightViewMode('overview');
        setMobilePane('reader');
      } else if (!targetArticleId) {
        setMobilePane('index');
      }

      try {
        const arts = await fetchIssueArticles(issue.issueNumber, issue.yearGroup);
        setIssueArticles(arts);
        if (targetArticleId) {
          const found = arts.find((a) => a.id === targetArticleId) || arts[0];
          if (found) {
            setSelectedArticle(found);
            setRightViewMode('article');
            setMobilePane('reader');
          }
        }
      } finally {
        setLoadingIssue(false);
      }
    },
    []
  );

  const openIssueByNumber = useCallback(
    (issueNumber: number, targetArticleId?: string) => {
      const meta = issuesByNumber.get(issueNumber);
      if (meta) {
        openIssue(meta, targetArticleId);
      }
    },
    [issuesByNumber, openIssue]
  );

  // Select article & record initial reading progress
  const handleSelectArticle = useCallback((art: Article) => {
    setSelectedArticle(art);
    setRightViewMode('article');
    setMobilePane('reader');

    setReadingProgress((prev) => {
      const existing = prev.find((p) => p.articleId === art.id);
      const nextItem: ReadingProgress = {
        articleId: art.id,
        issueNumber: art.issueNumber,
        title: art.title,
        read: existing?.read || false,
        scrollPercent: existing?.scrollPercent || 0,
        lastReadAt: Date.now(),
      };
      saveReadingProgress(nextItem);
      return [nextItem, ...prev.filter((p) => p.articleId !== art.id)];
    });
  }, []);

  // Load search corpus when entering search mode
  const ensureSearchCorpus = useCallback(async () => {
    if (searchCorpus || searchLoading) return;
    setSearchLoading(true);
    try {
      const all = await fetchAllArticlesForSearch();
      setSearchCorpus(all);
    } finally {
      setSearchLoading(false);
    }
  }, [searchCorpus, searchLoading]);

  const handleOpenSearch = useCallback(
    (presetCategory?: Category) => {
      setMiddleViewMode('search');
      setMobileDrawerOpen(false);
      setMobilePane('index');
      if (layout.middleCollapsed) {
        updateLayout({ middleCollapsed: false });
      }
      if (presetCategory) {
        setSearchFilters((prev) => ({ ...prev, category: presetCategory }));
      }
      ensureSearchCorpus();
    },
    [ensureSearchCorpus, layout.middleCollapsed, updateLayout]
  );

  const searchResults = useMemo(() => {
    if (!searchCorpus) return [];
    const q = searchFilters.query.trim().toLowerCase();
    const hasFilter =
      q.length > 0 ||
      searchFilters.category !== 'ALL' ||
      searchFilters.yearGroup !== 'ALL' ||
      searchFilters.issueNumber !== 'ALL';
    if (!hasFilter) return [];

    const matches: Article[] = [];
    for (const art of searchCorpus) {
      if (
        searchFilters.category !== 'ALL' &&
        getEffectiveCategory(art) !== searchFilters.category
      ) {
        continue;
      }
      if (
        searchFilters.yearGroup !== 'ALL' &&
        art.yearGroup !== searchFilters.yearGroup
      ) {
        continue;
      }
      if (
        searchFilters.issueNumber !== 'ALL' &&
        art.issueNumber !== searchFilters.issueNumber
      ) {
        continue;
      }
      if (q) {
        const hay = `${art.title} ${art.plainText} ${art.githubRepos.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      matches.push(art);
      if (matches.length >= 120) break;
    }
    return matches;
  }, [searchCorpus, searchFilters, getEffectiveCategory]);

  // Throttled scroll progress saver
  const scrollTimerRef = useRef<number | null>(null);
  const handleUpdateScrollPercent = useCallback(
    (percent: number) => {
      if (!selectedArticle) return;
      if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = window.setTimeout(() => {
        setReadingProgress((prev) => {
          const existing = prev.find((p) => p.articleId === selectedArticle.id);
          const autoRead = existing?.read || percent >= 90;
          const nextItem: ReadingProgress = {
            articleId: selectedArticle.id,
            issueNumber: selectedArticle.issueNumber,
            title: selectedArticle.title,
            read: autoRead,
            scrollPercent: percent,
            lastReadAt: Date.now(),
          };
          saveReadingProgress(nextItem);
          return [
            nextItem,
            ...prev.filter((p) => p.articleId !== selectedArticle.id),
          ];
        });
      }, 250);
    },
    [selectedArticle]
  );

  const handleToggleRead = useCallback(() => {
    if (!selectedArticle) return;
    setReadingProgress((prev) => {
      const existing = prev.find((p) => p.articleId === selectedArticle.id);
      const nextItem: ReadingProgress = {
        articleId: selectedArticle.id,
        issueNumber: selectedArticle.issueNumber,
        title: selectedArticle.title,
        read: !(existing?.read || false),
        scrollPercent: existing?.scrollPercent || 0,
        lastReadAt: Date.now(),
      };
      saveReadingProgress(nextItem);
      return [nextItem, ...prev.filter((p) => p.articleId !== selectedArticle.id)];
    });
  }, [selectedArticle]);

  // Prev / Next article in current issue
  const currentArticleIdx = useMemo(() => {
    if (!selectedArticle) return -1;
    return issueArticles.findIndex((a) => a.id === selectedArticle.id);
  }, [issueArticles, selectedArticle]);

  const handlePrevArticle = useCallback(() => {
    if (currentArticleIdx > 0) {
      handleSelectArticle(issueArticles[currentArticleIdx - 1]);
    }
  }, [currentArticleIdx, issueArticles, handleSelectArticle]);

  const handleNextArticle = useCallback(() => {
    if (currentArticleIdx >= 0 && currentArticleIdx < issueArticles.length - 1) {
      handleSelectArticle(issueArticles[currentArticleIdx + 1]);
    }
  }, [currentArticleIdx, issueArticles, handleSelectArticle]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleOpenSearch();
        return;
      }

      if (e.key === 'Escape' && layout.focusMode) {
        updateLayout({ focusMode: false });
        return;
      }

      if (isInput) return;

      if (e.key === '/') {
        e.preventDefault();
        handleOpenSearch();
      } else if (e.key.toLowerCase() === 'f' && rightViewMode === 'article') {
        e.preventDefault();
        updateLayout({ focusMode: !layout.focusMode });
      } else if (e.key.toLowerCase() === 'j' && rightViewMode === 'article') {
        handleNextArticle();
      } else if (e.key.toLowerCase() === 'k' && rightViewMode === 'article') {
        handlePrevArticle();
      } else if (e.key.toLowerCase() === 'm' && rightViewMode === 'article') {
        handleToggleRead();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleOpenSearch,
    layout.focusMode,
    updateLayout,
    rightViewMode,
    handleNextArticle,
    handlePrevArticle,
    handleToggleRead,
  ]);

  // Resizable splitters
  const startResize = (which: 'left' | 'middle', startX: number) => {
    const initialWidth = which === 'left' ? layout.leftWidth : layout.middleWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      if (which === 'left') {
        updateLayout({
          leftWidth: Math.max(200, Math.min(360, initialWidth + delta)),
        });
      } else {
        updateLayout({
          middleWidth: Math.max(260, Math.min(520, initialWidth + delta)),
        });
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Personal data mutations
  const handleCreateFolder = async (name: string) => {
    const newFolder: BookmarkFolder = {
      id: `folder-${Date.now()}`,
      name,
      createdAt: Date.now(),
    };
    await saveFolder(newFolder);
    setFolders((prev) => [...prev, newFolder]);
  };

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolder(folderId);
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    if (selectedFolderId === folderId) setSelectedFolderId(null);
  };

  const handleSaveBookmark = async (data: {
    folderId: string;
    tags: string[];
    note: string;
  }) => {
    if (!selectedArticle) return;
    const existing = bookmarksMap.get(selectedArticle.id);
    const bm: Bookmark = {
      articleId: selectedArticle.id,
      issueNumber: selectedArticle.issueNumber,
      title: selectedArticle.title,
      category: getEffectiveCategory(selectedArticle),
      folderId: data.folderId,
      tags: data.tags,
      note: data.note,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    await saveBookmark(bm);
    setBookmarks((prev) => [
      bm,
      ...prev.filter((b) => b.articleId !== bm.articleId),
    ]);
  };

  const handleDeleteBookmark = async () => {
    if (!selectedArticle) return;
    await deleteBookmark(selectedArticle.id);
    setBookmarks((prev) =>
      prev.filter((b) => b.articleId !== selectedArticle.id)
    );
  };

  const handleAddAnnotation = async (data: {
    quote: string;
    comment: string;
    color: Annotation['color'];
  }) => {
    if (!selectedArticle) return;
    const ann: Annotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      articleId: selectedArticle.id,
      issueNumber: selectedArticle.issueNumber,
      quote: data.quote,
      comment: data.comment,
      color: data.color,
      createdAt: Date.now(),
    };
    await saveAnnotation(ann);
    setAnnotations((prev) => [ann, ...prev]);
  };

  const handleDeleteAnnotation = async (id: string) => {
    await deleteAnnotation(id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSavePersonalNote = async (note: ArticlePersonalNote) => {
    await saveArticleNote(note);
    setArticleNotes((prev) => [
      note,
      ...prev.filter((n) => n.articleId !== note.articleId),
    ]);
  };

  const handleChangeCategory = async (category: Category) => {
    if (!selectedArticle) return;
    await saveCategoryOverride(selectedArticle.id, category);
    setCategoryOverrides((prev) => {
      const next = new Map(prev);
      next.set(selectedArticle.id, category);
      return next;
    });
  };

  const handleExportData = async () => {
    const json = await exportPersonalData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-reader-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadError) {
    return (
      <div className="app-loading">
        <p>加载失败：{loadError}</p>
      </div>
    );
  }

  if (!indexData) {
    return (
      <div className="app-loading">
        <BookOpen size={28} />
        <p>正在初始化 Weekly Knowledge Reader…</p>
      </div>
    );
  }

  const selectedIssueMeta =
    selectedIssueNumber !== null ? issuesByNumber.get(selectedIssueNumber) || null : null;

  const researchLaterCount = articleNotes.filter((n) => n.researchLater).length;

  return (
    <div
      className={`app-shell ${layout.focusMode ? 'focus-mode' : ''} mobile-pane-${mobilePane}`}
    >
      {/* Mobile Top Bar */}
      <header className="mobile-topbar">
        <button
          className="icon-btn"
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="打开导航菜单"
        >
          <Menu size={20} />
        </button>
        <div className="mobile-topbar-tabs">
          <button
            className={mobilePane === 'dashboard' ? 'active' : ''}
            onClick={() => {
              setRightViewMode('dashboard');
              setMobilePane('dashboard');
            }}
          >
            <Home size={14} /> 工作台
          </button>
          <button
            className={mobilePane === 'index' ? 'active' : ''}
            onClick={() => setMobilePane('index')}
          >
            <FileText size={14} /> 列表
          </button>
          <button
            className={mobilePane === 'reader' ? 'active' : ''}
            onClick={() => setMobilePane('reader')}
          >
            <BookOpen size={14} /> 阅读
          </button>
        </div>
        <button
          className="icon-btn"
          onClick={() => handleOpenSearch()}
          aria-label="搜索"
        >
          <Search size={18} />
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="mobile-drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="mobile-drawer-close"
              onClick={() => setMobileDrawerOpen(false)}
            >
              <X size={18} />
            </button>
            <Sidebar
              yearGroups={indexData.yearGroups}
              issuesByYearGroup={issuesByYearGroup}
              selectedIssueNumber={selectedIssueNumber}
              middleViewMode={middleViewMode}
              selectedFolderId={selectedFolderId}
              folders={folders}
              bookmarks={bookmarks}
              researchLaterCount={researchLaterCount}
              historyCount={readingProgress.length}
              progressMap={progressMap}
              theme={layout.theme}
              onSelectDashboard={() => {
                setRightViewMode('dashboard');
                setSelectedIssueNumber(null);
                setMobilePane('dashboard');
                setMobileDrawerOpen(false);
              }}
              onSelectIssue={(iss) => openIssue(iss)}
              onOpenSearch={() => handleOpenSearch()}
              onSelectBookmarks={(fid) => {
                setSelectedFolderId(fid);
                setMiddleViewMode('bookmarks');
                setMobilePane('index');
                setMobileDrawerOpen(false);
              }}
              onSelectResearchLater={() => {
                setMiddleViewMode('research-later');
                setMobilePane('index');
                setMobileDrawerOpen(false);
              }}
              onSelectHistory={() => {
                setMiddleViewMode('history');
                setMobilePane('index');
                setMobileDrawerOpen(false);
              }}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onToggleTheme={() =>
                updateLayout({
                  theme: layout.theme === 'light' ? 'dark' : 'light',
                })
              }
              onExportData={handleExportData}
            />
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      {!layout.focusMode && !layout.leftCollapsed && (
        <>
          <div
            className="pane-wrapper left-wrapper"
            style={{ width: layout.leftWidth }}
          >
            <Sidebar
              yearGroups={indexData.yearGroups}
              issuesByYearGroup={issuesByYearGroup}
              selectedIssueNumber={selectedIssueNumber}
              middleViewMode={middleViewMode}
              selectedFolderId={selectedFolderId}
              folders={folders}
              bookmarks={bookmarks}
              researchLaterCount={researchLaterCount}
              historyCount={readingProgress.length}
              progressMap={progressMap}
              theme={layout.theme}
              onSelectDashboard={() => {
                setRightViewMode('dashboard');
                setSelectedIssueNumber(null);
                setMiddleViewMode('issue');
              }}
              onSelectIssue={(iss) => openIssue(iss)}
              onOpenSearch={() => handleOpenSearch()}
              onSelectBookmarks={(fid) => {
                setSelectedFolderId(fid);
                setMiddleViewMode('bookmarks');
                if (layout.middleCollapsed) updateLayout({ middleCollapsed: false });
              }}
              onSelectResearchLater={() => {
                setMiddleViewMode('research-later');
                if (layout.middleCollapsed) updateLayout({ middleCollapsed: false });
              }}
              onSelectHistory={() => {
                setMiddleViewMode('history');
                if (layout.middleCollapsed) updateLayout({ middleCollapsed: false });
              }}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onToggleTheme={() =>
                updateLayout({
                  theme: layout.theme === 'light' ? 'dark' : 'light',
                })
              }
              onExportData={handleExportData}
              onCollapse={() => updateLayout({ leftCollapsed: true })}
            />
          </div>
          <div
            className="resizer"
            onMouseDown={(e) => startResize('left', e.clientX)}
            title="拖拽调整侧边栏宽度"
          />
        </>
      )}

      {/* Desktop Middle Content Index */}
      {!layout.focusMode && !layout.middleCollapsed && (
        <>
          <div
            className="pane-wrapper middle-wrapper"
            style={{ width: layout.middleWidth }}
          >
            <ContentIndex
              mode={middleViewMode}
              selectedIssue={selectedIssueMeta}
              issueArticles={issueArticles}
              loadingIssue={loadingIssue}
              selectedArticleId={selectedArticle?.id || null}
              getEffectiveCategory={getEffectiveCategory}
              progressMap={progressMap}
              bookmarksMap={bookmarksMap}
              notesMap={notesMap}
              annotationCounts={annotationCounts}
              folders={folders}
              selectedFolderId={selectedFolderId}
              searchFilters={searchFilters}
              onUpdateSearchFilters={setSearchFilters}
              searchResults={searchResults}
              searchLoading={searchLoading}
              yearGroups={indexData.yearGroups}
              allIssues={indexData.issues}
              onSelectArticle={handleSelectArticle}
              onOpenOverview={() => {
                setRightViewMode('overview');
                setMobilePane('reader');
              }}
              onSelectIssueByNumber={openIssueByNumber}
              onCollapse={() => updateLayout({ middleCollapsed: true })}
            />
          </div>
          <div
            className="resizer"
            onMouseDown={(e) => startResize('middle', e.clientX)}
            title="拖拽调整列表宽度"
          />
        </>
      )}

      {/* Right Reader Pane */}
      <main className="pane-wrapper right-wrapper">
        {/* Collapsed Pane Restore Buttons */}
        {!layout.focusMode && (layout.leftCollapsed || layout.middleCollapsed) && (
          <div className="restore-panes-bar">
            {layout.leftCollapsed && (
              <button
                className="pill-action-btn"
                onClick={() => updateLayout({ leftCollapsed: false })}
              >
                <PanelLeftOpen size={14} /> 展开导航
              </button>
            )}
            {layout.middleCollapsed && (
              <button
                className="pill-action-btn"
                onClick={() => updateLayout({ middleCollapsed: false })}
              >
                <PanelLeftOpen size={14} /> 展开列表
              </button>
            )}
          </div>
        )}

        {/* Focus Mode Exit Floating Pill */}
        {layout.focusMode && (
          <button
            className="focus-exit-pill"
            onClick={() => updateLayout({ focusMode: false })}
            title="退出专注模式 (Esc)"
          >
            <Minimize2 size={14} />
            <span>退出专注模式</span>
          </button>
        )}

        {rightViewMode === 'dashboard' && (
          <Dashboard
            totalIssues={indexData.totalIssues}
            totalArticles={indexData.totalArticles}
            latestIssues={indexData.issues}
            bookmarks={bookmarks}
            folders={folders}
            progressList={readingProgress}
            totalAnnotations={annotations.length}
            onSelectIssue={(iss) => openIssue(iss, undefined, true)}
            onContinueReading={(issueNum, artId) => openIssueByNumber(issueNum, artId)}
            onOpenSearchWithCategory={(cat) => handleOpenSearch(cat)}
          />
        )}

        {rightViewMode === 'overview' && selectedIssueMeta && (
          <IssueOverview
            issue={selectedIssueMeta}
            articles={issueArticles}
            getEffectiveCategory={getEffectiveCategory}
            progressMap={progressMap}
            bookmarksMap={bookmarksMap}
            onStartReading={(art) => handleSelectArticle(art)}
          />
        )}

        {rightViewMode === 'article' && selectedArticle && (
          <ArticleReader
            article={selectedArticle}
            effectiveCategory={getEffectiveCategory(selectedArticle)}
            progress={progressMap.get(selectedArticle.id)}
            bookmark={bookmarksMap.get(selectedArticle.id)}
            folders={folders}
            annotations={annotations.filter(
              (a) => a.articleId === selectedArticle.id
            )}
            personalNote={notesMap.get(selectedArticle.id)}
            layout={layout}
            hasPrev={currentArticleIdx > 0}
            hasNext={
              currentArticleIdx >= 0 &&
              currentArticleIdx < issueArticles.length - 1
            }
            onPrev={handlePrevArticle}
            onNext={handleNextArticle}
            onChangeCategory={handleChangeCategory}
            onToggleRead={handleToggleRead}
            onUpdateScrollPercent={handleUpdateScrollPercent}
            onSaveBookmark={handleSaveBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            onAddAnnotation={handleAddAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
            onSavePersonalNote={handleSavePersonalNote}
            onUpdateLayout={updateLayout}
          />
        )}
      </main>
    </div>
  );
}

export default App;
