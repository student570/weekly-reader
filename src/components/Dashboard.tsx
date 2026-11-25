import React from 'react';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Highlighter,
  Search,
  Sparkles,
} from 'lucide-react';
import type {
  Bookmark as BookmarkItem,
  BookmarkFolder,
  IssueMeta,
  ReadingProgress,
} from '../types';

interface DashboardProps {
  totalIssues: number;
  totalArticles: number;
  latestIssues: IssueMeta[];
  bookmarks: BookmarkItem[];
  folders: BookmarkFolder[];
  progressList: ReadingProgress[];
  totalAnnotations: number;
  onSelectIssue: (issue: IssueMeta) => void;
  onContinueReading: (issueNumber: number, articleId?: string) => void;
  onOpenSearchWithCategory: (category: 'AI' | '开源项目') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  totalIssues,
  totalArticles,
  latestIssues,
  bookmarks,
  folders,
  progressList,
  totalAnnotations,
  onSelectIssue,
  onContinueReading,
  onOpenSearchWithCategory,
}) => {
  const sortedProgress = [...progressList].sort((a, b) => b.lastReadAt - a.lastReadAt);
  const lastRead = sortedProgress[0] || null;
  const fallbackIssue = latestIssues[0];

  const continueIssueNum = lastRead ? lastRead.issueNumber : fallbackIssue?.issueNumber || 420;
  const continueIssueMeta = latestIssues.find((i) => i.issueNumber === continueIssueNum);

  const readCountInContinueIssue = progressList.filter(
    (p) => p.issueNumber === continueIssueNum && p.read
  ).length;
  const continueIssueTotal = continueIssueMeta?.articleCount || 12;
  const continuePercent = lastRead
    ? Math.max(
        Math.round((readCountInContinueIssue / Math.max(1, continueIssueTotal)) * 100),
        Math.round(lastRead.scrollPercent)
      )
    : 0;

  const totalReadArticles = progressList.filter((p) => p.read).length;
  const recentBookmarks = [...bookmarks]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  return (
    <div className="dashboard-container">
      <header className="dashboard-hero">
        <div className="dashboard-kicker">YOUR PERSONAL KNOWLEDGE READER</div>
        <h1 className="dashboard-title">Weekly Reader</h1>
        <p className="dashboard-subtitle">
          沉淀自《科技爱好者周刊》的 {totalIssues} 期 · {totalArticles.toLocaleString()} 篇文章，所有收藏、批注与阅读进度均安全保存在本地 IndexedDB。
        </p>
      </header>

      <section className="continue-card">
        <div className="continue-card-left">
          <div className="continue-label">CONTINUE READING</div>
          <h2 className="continue-title">
            {lastRead
              ? `第 ${lastRead.issueNumber} 期 · ${lastRead.title}`
              : `第 ${continueIssueNum} 期 · ${fallbackIssue?.title || '开始阅读最新一期'}`}
          </h2>
          <div className="continue-progress-wrap">
            <div className="continue-progress-bar">
              <div
                className="continue-progress-fill"
                style={{ width: `${Math.min(100, continuePercent)}%` }}
              />
            </div>
            <span className="continue-progress-text">
              {lastRead ? `阅读进度 ${continuePercent}%` : '尚未开始阅读'}
            </span>
          </div>
        </div>
        <button
          className="primary-cta-btn"
          onClick={() =>
            onContinueReading(continueIssueNum, lastRead?.articleId)
          }
        >
          <span>{lastRead ? '继续阅读' : '开始阅读'}</span>
          <ArrowRight size={16} />
        </button>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <BookOpen size={18} />
          </div>
          <div className="stat-value">{totalIssues}</div>
          <div className="stat-label">Issues</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Bookmark size={18} />
          </div>
          <div className="stat-value">{bookmarks.length}</div>
          <div className="stat-label">Bookmarks</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle2 size={18} />
          </div>
          <div className="stat-value">{totalReadArticles}</div>
          <div className="stat-label">Read</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Highlighter size={18} />
          </div>
          <div className="stat-value">{totalAnnotations}</div>
          <div className="stat-label">Annotations</div>
        </div>
      </section>

      <div className="dashboard-columns">
        <section className="dashboard-panel">
          <div className="panel-head">
            <h3>最近更新</h3>
            <span className="panel-sub">Weekly Releases</span>
          </div>
          <div className="recent-issues-list">
            {latestIssues.slice(0, 4).map((issue, idx) => (
              <button
                key={issue.issueNumber}
                className="recent-issue-row"
                onClick={() => onSelectIssue(issue)}
              >
                <div className="recent-issue-left">
                  <div className="recent-issue-num">第 {issue.issueNumber} 期</div>
                  <div className="recent-issue-meta">
                    {issue.year} · {idx === 0 ? '最新一期' : issue.month || '往期'}
                  </div>
                </div>
                <div className="recent-issue-title">{issue.title}</div>
                <ArrowRight size={14} className="row-arrow" />
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-head">
            <h3>最近收藏</h3>
            <span className="panel-sub">Recent Bookmarks</span>
          </div>
          {recentBookmarks.length === 0 ? (
            <div className="empty-bookmarks-hint">
              <p>还没有收藏任何文章。试试快速探索：</p>
              <div className="quick-explore-btns">
                <button
                  className="pill-action-btn"
                  onClick={() => onOpenSearchWithCategory('AI')}
                >
                  <Sparkles size={13} />
                  <span>浏览 AI 专题</span>
                </button>
                <button
                  className="pill-action-btn"
                  onClick={() => onOpenSearchWithCategory('开源项目')}
                >
                  <Search size={13} />
                  <span>发现开源项目</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="recent-bookmarks-list">
              {recentBookmarks.map((bm) => {
                const folderName =
                  folders.find((f) => f.id === bm.folderId)?.name || '默认';
                return (
                  <button
                    key={bm.articleId}
                    className="recent-bookmark-row"
                    onClick={() => onContinueReading(bm.issueNumber, bm.articleId)}
                  >
                    <div className="bm-row-top">
                      <span className="folder-pill">{folderName}</span>
                      <span className="issue-tag">第 {bm.issueNumber} 期</span>
                    </div>
                    <div className="bm-row-title">{bm.title}</div>
                    {bm.tags.length > 0 && (
                      <div className="bm-row-tags">
                        {bm.tags.map((t) => `#${t}`).join(' ')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
