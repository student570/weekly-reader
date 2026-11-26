export type Category =
  | '卷首'
  | '科技动态'
  | 'AI'
  | '工具'
  | '资源'
  | '文章'
  | '图片'
  | '言论'
  | '其他';

export const ALL_CATEGORIES: Category[] = [
  '卷首',
  '科技动态',
  'AI',
  '工具',
  '资源',
  '文章',
  '图片',
  '言论',
  '其他',
];

export type YearGroup = '2026' | '2025' | '2024' | '历史归档';

export interface IssueMeta {
  issueNumber: number;
  year: string;
  yearGroup: YearGroup;
  month: string;
  title: string;
  coverImage: string | null;
  summary: string;
  articleCount: number;
  categoryCounts: Record<Category, number>;
  githubRepos: string[];
  externalLinkCount: number;
  file: string;
}

export interface IssuesIndex {
  generatedAt: string;
  sourceRepo: string;
  totalIssues: number;
  totalArticles: number;
  categories: Category[];
  yearGroups: YearGroup[];
  issues: IssueMeta[];
}

export interface Article {
  id: string;
  issueNumber: number;
  year: string;
  yearGroup: YearGroup;
  month: string;
  title: string;
  url: string | null;
  section: string;
  isLeadEssay: boolean;
  autoCategory: Category;
  githubRepos: string[];
  externalLinks: string[];
  markdown: string;
  plainText: string;
  wordCount: number;
  readingTimeMin: number;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface Bookmark {
  articleId: string;
  issueNumber: number;
  title: string;
  category: Category;
  folderId: string;
  tags: string[];
  note: string;
  createdAt: number;
  updatedAt: number;
}

export interface Annotation {
  id: string;
  articleId: string;
  issueNumber: number;
  quote: string;
  comment: string;
  color: 'amber' | 'teal' | 'rose' | 'slate';
  createdAt: number;
}

export interface ArticlePersonalNote {
  articleId: string;
  summary: string;
  viewpoint: string;
  extraLinks: { label: string; url: string }[];
  researchLater: boolean;
  updatedAt: number;
}

export interface ReadingProgress {
  articleId: string;
  issueNumber: number;
  title: string;
  read: boolean;
  scrollPercent: number;
  lastReadAt: number;
}

export interface CategoryOverride {
  articleId: string;
  category: Category;
  updatedAt: number;
}

export type MiddleViewMode =
  | 'issue'
  | 'search'
  | 'bookmarks'
  | 'research-later'
  | 'history';

export type RightViewMode = 'dashboard' | 'overview' | 'article';

export type MobilePane = 'dashboard' | 'index' | 'reader';

export interface LayoutState {
  leftWidth: number;
  middleWidth: number;
  leftCollapsed: boolean;
  middleCollapsed: boolean;
  focusMode: boolean;
  theme: 'light' | 'dark';
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  lineWidth: 'narrow' | 'medium' | 'wide';
  tocVisible: boolean;
}

export interface SearchFilters {
  query: string;
  category: Category | 'ALL';
  yearGroup: YearGroup | 'ALL';
  issueNumber: number | 'ALL';
}
