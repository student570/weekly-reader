import React from 'react';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  GitBranch,
} from 'lucide-react';
import {
  ALL_CATEGORIES,
  type Article,
  type Bookmark as BookmarkItem,
  type Category,
  type IssueMeta,
  type ReadingProgress,
} from '../types';

interface IssueOverviewProps {
  issue: IssueMeta;
  articles: Article[];
  getEffectiveCategory: (article: Article) => Category;
  progressMap: Map<string, ReadingProgress>;
  bookmarksMap: Map<string, BookmarkItem>;
  onStartReading: (article: Article) => void;
}

export const IssueOverview: React.FC<IssueOverviewProps> = ({
  issue,
  articles,
  getEffectiveCategory,
  progressMap,
  bookmarksMap,
  onStartReading,
}) => {
  const readCount = articles.filter((a) => progressMap.get(a.id)?.read).length;
  const bookmarkedCount = articles.filter((a) => bookmarksMap.has(a.id)).length;

  const categoryCounts: Record<Category, number> = {
    科技动态: 0,
    开源项目: 0,
    编程技术: 0,
    AI: 0,
    产品设计: 0,
    资源推荐: 0,
    其他: 0,
  };
  for (const art of articles) {
    const c = getEffectiveCategory(art);
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  }

  const maxCatCount = Math.max(1, ...Object.values(categoryCounts));

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div className="overview-kicker">
          ISSUE OVERVIEW · 第 {issue.issueNumber} 期 · {issue.year} {issue.month}
        </div>
        <h1 className="overview-title">{issue.title}</h1>
        {issue.summary && <p className="overview-summary">{issue.summary}</p>}
        {articles[0] && (
          <button
            className="primary-cta-btn"
            onClick={() => onStartReading(articles[0])}
          >
            <span>开始阅读本期</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>

      {issue.coverImage && (
        <div className="overview-cover">
          <img src={issue.coverImage} alt={issue.title} loading="lazy" />
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <BookOpen size={17} />
          </div>
          <div className="stat-value">{articles.length}</div>
          <div className="stat-label">本期文章</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle2 size={17} />
          </div>
          <div className="stat-value">{readCount}</div>
          <div className="stat-label">已读文章</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Bookmark size={17} />
          </div>
          <div className="stat-value">{bookmarkedCount}</div>
          <div className="stat-label">收藏文章</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <ExternalLink size={17} />
          </div>
          <div className="stat-value">{issue.externalLinkCount}</div>
          <div className="stat-label">外部链接</div>
        </div>
      </div>

      <div className="overview-section">
        <h3>分类分布</h3>
        <div className="cat-bars">
          {ALL_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat];
            if (count === 0) return null;
            const pct = Math.round((count / maxCatCount) * 100);
            return (
              <div key={cat} className="cat-bar-row">
                <span className="cat-bar-label">{cat}</span>
                <div className="cat-bar-track">
                  <div
                    className={`cat-bar-fill cat-bg-${cat}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="cat-bar-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {issue.githubRepos.length > 0 && (
        <div className="overview-section">
          <h3>涉及的 GitHub 项目 ({issue.githubRepos.length})</h3>
          <div className="repo-pills-grid">
            {issue.githubRepos.map((repo) => (
              <a
                key={repo}
                href={`https://github.com/${repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="repo-pill"
              >
                <GitBranch size={13} />
                <span>{repo}</span>
                <ExternalLink size={11} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
