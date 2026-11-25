import React, { useState } from 'react';
import {
  BookOpen,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Folder,
  FolderPlus,
  Home,
  Moon,
  Search,
  Sparkles,
  Sun,
  Trash2,
  PanelLeftClose,
} from 'lucide-react';
import type {
  Bookmark as BookmarkItem,
  BookmarkFolder,
  IssueMeta,
  MiddleViewMode,
  ReadingProgress,
  YearGroup,
} from '../types';

interface SidebarProps {
  yearGroups: YearGroup[];
  issuesByYearGroup: Record<YearGroup, IssueMeta[]>;
  selectedIssueNumber: number | null;
  middleViewMode: MiddleViewMode;
  selectedFolderId: string | null;
  folders: BookmarkFolder[];
  bookmarks: BookmarkItem[];
  researchLaterCount: number;
  historyCount: number;
  progressMap: Map<string, ReadingProgress>;
  theme: 'light' | 'dark';
  onSelectDashboard: () => void;
  onSelectIssue: (issue: IssueMeta) => void;
  onOpenSearch: () => void;
  onSelectBookmarks: (folderId: string | null) => void;
  onSelectResearchLater: () => void;
  onSelectHistory: () => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onToggleTheme: () => void;
  onExportData: () => void;
  onCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  yearGroups,
  issuesByYearGroup,
  selectedIssueNumber,
  middleViewMode,
  selectedFolderId,
  folders,
  bookmarks,
  researchLaterCount,
  historyCount,
  progressMap,
  theme,
  onSelectDashboard,
  onSelectIssue,
  onOpenSearch,
  onSelectBookmarks,
  onSelectResearchLater,
  onSelectHistory,
  onCreateFolder,
  onDeleteFolder,
  onToggleTheme,
  onExportData,
  onCollapse,
}) => {
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({
    '2026': true,
    '2025': false,
    '2024': false,
    '历史归档': false,
  });
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const toggleYear = (yg: string) => {
    setExpandedYears((prev) => ({ ...prev, [yg]: !prev[yg] }));
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    onCreateFolder(trimmed);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const getIssueReadCount = (issueNumber: number) => {
    let count = 0;
    progressMap.forEach((p) => {
      if (p.issueNumber === issueNumber && p.read) count++;
    });
    return count;
  };

  return (
    <aside className="sidebar-pane">
      <div className="sidebar-header">
        <button className="brand-btn" onClick={onSelectDashboard} title="返回工作台首页">
          <BookOpen size={18} className="brand-icon" />
          <span className="brand-title">Weekly Reader</span>
        </button>
        {onCollapse && (
          <button className="icon-btn" onClick={onCollapse} title="折叠侧边栏">
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      <div className="sidebar-quick-actions">
        <button
          className="search-trigger-btn"
          onClick={onOpenSearch}
          title="全文搜索 (⌘K 或 /)"
        >
          <Search size={14} />
          <span>全文搜索…</span>
          <kbd>⌘K</kbd>
        </button>
      </div>

      <div className="sidebar-scroll">
        <nav className="sidebar-section">
          <button
            className={`nav-item ${middleViewMode === 'issue' && selectedIssueNumber === null ? 'active' : ''}`}
            onClick={onSelectDashboard}
          >
            <Home size={15} />
            <span>阅读工作台</span>
          </button>
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-section-label">
            <span>个人知识库</span>
          </div>
          <button
            className={`nav-item ${middleViewMode === 'bookmarks' && selectedFolderId === null ? 'active' : ''}`}
            onClick={() => onSelectBookmarks(null)}
          >
            <Bookmark size={15} />
            <span>全部收藏</span>
            <span className="nav-badge">{bookmarks.length}</span>
          </button>

          <div className="folders-group">
            <div className="folders-header">
              <span>收藏夹</span>
              <button
                className="icon-btn-xs"
                onClick={() => setShowNewFolder((v) => !v)}
                title="新建收藏夹"
              >
                <FolderPlus size={13} />
              </button>
            </div>

            {showNewFolder && (
              <form onSubmit={handleCreateFolder} className="new-folder-form">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="收藏夹名称…"
                  autoFocus
                />
                <button type="submit">创建</button>
              </form>
            )}

            {folders.map((folder) => {
              const count = bookmarks.filter((b) => b.folderId === folder.id).length;
              const isActive =
                middleViewMode === 'bookmarks' && selectedFolderId === folder.id;
              return (
                <div key={folder.id} className={`nav-item folder-item ${isActive ? 'active' : ''}`}>
                  <button
                    className="folder-select-btn"
                    onClick={() => onSelectBookmarks(folder.id)}
                  >
                    <Folder size={14} />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <span className="nav-badge">{count}</span>
                  {folders.length > 1 && (
                    <button
                      className="folder-del-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(folder.id);
                      }}
                      title="删除收藏夹"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            className={`nav-item ${middleViewMode === 'research-later' ? 'active' : ''}`}
            onClick={onSelectResearchLater}
          >
            <Sparkles size={15} />
            <span>稍后研究</span>
            <span className="nav-badge">{researchLaterCount}</span>
          </button>

          <button
            className={`nav-item ${middleViewMode === 'history' ? 'active' : ''}`}
            onClick={onSelectHistory}
          >
            <Clock size={15} />
            <span>阅读历史</span>
            <span className="nav-badge">{historyCount}</span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">
            <span>周刊归档</span>
          </div>
          {yearGroups.map((yg) => {
            const list = issuesByYearGroup[yg] || [];
            const isOpen = !!expandedYears[yg];
            return (
              <div key={yg} className="year-group">
                <button className="year-toggle" onClick={() => toggleYear(yg)}>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="year-name">{yg}</span>
                  <span className="nav-badge">{list.length}</span>
                </button>
                {isOpen && (
                  <div className="issue-tree-list">
                    {list.map((issue) => {
                      const isActive =
                        middleViewMode === 'issue' &&
                        selectedIssueNumber === issue.issueNumber;
                      const readCount = getIssueReadCount(issue.issueNumber);
                      const isComplete =
                        issue.articleCount > 0 && readCount >= issue.articleCount;
                      return (
                        <button
                          key={issue.issueNumber}
                          className={`issue-tree-item ${isActive ? 'active' : ''}`}
                          onClick={() => onSelectIssue(issue)}
                          title={`第 ${issue.issueNumber} 期：${issue.title}`}
                        >
                          <span className="issue-num">#{issue.issueNumber}</span>
                          <span className="issue-name truncate">{issue.title}</span>
                          {readCount > 0 && (
                            <span
                              className={`issue-progress-dot ${isComplete ? 'done' : 'partial'}`}
                              title={`已读 ${readCount}/${issue.articleCount}`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="footer-action-btn" onClick={onToggleTheme} title="切换明暗主题">
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          <span>{theme === 'light' ? '深色模式' : '浅色模式'}</span>
        </button>
        <button className="footer-action-btn" onClick={onExportData} title="导出个人收藏与批注 JSON">
          <Download size={15} />
          <span>备份数据</span>
        </button>
      </div>
    </aside>
  );
};
