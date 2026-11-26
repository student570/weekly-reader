#!/usr/bin/env node
/**
 * Weekly Knowledge Reader — Content Parser
 * Parses ruanyf/weekly Markdown files into structured JSON indices & year chunks.
 *
 * Usage:
 *   node scripts/parse-weekly.mjs [path-to-weekly-repo]
 * Default source: ../student570/weekly (or WEEKLY_REPO_PATH env var)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_WEEKLY_DIR = path.resolve(ROOT_DIR, '..', 'student570', 'weekly');
const WEEKLY_DIR = path.resolve(process.argv[2] || process.env.WEEKLY_REPO_PATH || DEFAULT_WEEKLY_DIR);
const OUT_DIR = path.join(ROOT_DIR, 'public', 'data');
const CHUNKS_DIR = path.join(OUT_DIR, 'chunks');

const CATEGORIES = [
  '科技动态',
  '开源项目',
  '编程技术',
  'AI',
  '产品设计',
  '资源推荐',
  '其他',
];

const SKIP_SECTIONS = new Set([
  '订阅',
  '欢迎订阅',
  '鸣谢',
  '说明',
  '往年回顾',
  '回顾',
  '历史上的本周',
  '招聘信息',
  '谁在招人',
]);

function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLinks(md) {
  const urls = new Set();
  const githubRepos = new Set();
  const linkRegex = /https?:\/\/[^\s)>\]]+/g;
  let match;
  while ((match = linkRegex.exec(md)) !== null) {
    let url = match[0].replace(/[.,;:'"!?]+$/, '');
    if (url.includes('cdn.beekka.com')) continue;
    urls.add(url);
    const ghMatch = url.match(/^https?:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/);
    if (ghMatch) {
      const repo = ghMatch[1].replace(/\.git$/, '');
      if (!repo.startsWith('ruanyf/weekly')) {
        githubRepos.add(repo);
      }
    }
  }
  return {
    externalLinks: [...urls],
    githubRepos: [...githubRepos],
  };
}

function classifyArticle(section, title, body) {
  const text = `${section} ${title} ${body}`.toLowerCase();

  // 1. Explicit section-level classification first
  if (section === '工具' || section === '软件' || title.includes('[本周软件]')) {
    return '开源项目';
  }

  if (
    section === '资源' ||
    section === '本周图片' ||
    section === '图片' ||
    section === '图片和视频'
  ) {
    return '资源推荐';
  }

  if (
    section === '科技动态' ||
    section === '资讯' ||
    section === '新闻' ||
    section === '一句话消息' ||
    section === '新奇'
  ) {
    return '科技动态';
  }

  if (section === '教程' || section === '前端开发进阶手册') {
    return '编程技术';
  }

  if (section.includes('AI')) {
    return 'AI';
  }

  // 2. Open-source project with GitHub repo (exclude books/tutorials)
  if (
    /github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i.test(body) &&
    /(开源|工具|cli|命令行|插件|仪表板|客户端|服务端|替代品|框架|库|app|desktop|self-hosted)/i.test(text) &&
    !/(书籍|电子书|书单|免费读|在线阅读)/i.test(text)
  ) {
    return '开源项目';
  }

  // 3. AI category
  if (
    /\b(ai|llm|gpt|claude|gemini|openai|anthropic|deepseek|agent|mcp|rag|diffusion|transformer|hugging\s*face|copilot|cursor|ollama|token|大模型|智能体|人工智能|机器学习|深度学习|提示词|多模态)\b/i.test(text)
  ) {
    return 'AI';
  }

  // 编程技术
  if (
    section === '教程' ||
    section === '前端开发进阶手册' ||
    /\b(javascript|typescript|python|rust|golang|java|c\+\+|css|html|react|vue|node\.js|sql|postgres|sqlite|redis|docker|kubernetes|linux|git|api|unicode|regex|wasm|webassembly|http|tcp|算法|架构|编程|代码|编译|数据库|后端|前端|测试|重构|性能优化)\b/i.test(text)
  ) {
    return '编程技术';
  }

  // 产品设计
  if (
    /(产品|设计|ui|ux|交互|创业|商业模式|独立开发|saas|增长|营销|盈利|定价|用户体验|界面设计|工作流)/i.test(text)
  ) {
    return '产品设计';
  }

  // 资源推荐
  if (
    section === '资源' ||
    section === '本周图片' ||
    section === '图片' ||
    section === '图片和视频' ||
    /(免费|网站|书籍|手册|指南|文档|电子书|课程|数据集|在线工具|导航|图库|字体|壁纸)/i.test(text)
  ) {
    return '资源推荐';
  }

  // 科技动态
  if (
    section === '科技动态' ||
    section === '资讯' ||
    section === '新闻' ||
    section === '一句话消息' ||
    section === '新奇' ||
    /(芯片|算力|苹果|apple|谷歌|google|微软|microsoft|英伟达|nvidia|特斯拉|tesla|亚马逊|amazon|meta|太空|火箭|量子|半导体|机器人|自动驾驶|互联网|研究发现|科学家)/i.test(text)
  ) {
    return '科技动态';
  }

  // Fallback for Github repos
  if (/github\.com\//i.test(body)) {
    return '开源项目';
  }

  // Fallback for essays / articles
  if (section === '文章' || section === '卷首语' || section === '刊首语') {
    return '科技动态';
  }

  return '其他';
}

function parseReadmeIndex(readmePath) {
  const metaMap = new Map();
  if (!fs.existsSync(readmePath)) return metaMap;

  const content = fs.readFileSync(readmePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  let currentYear = '历史归档';
  let currentMonth = '';

  for (const line of lines) {
    const yearMatch = line.match(/^##\s+(\d{4})/);
    if (yearMatch) {
      currentYear = yearMatch[1];
      continue;
    }
    const monthMatch = line.match(/^\*\*(.+?)\*\*/);
    if (monthMatch) {
      currentMonth = monthMatch[1].trim();
      continue;
    }
    const issueMatch = line.match(/第\s*(\d+)\s*期[：:]\s*\[([^\]]+)\]\((docs\/issue-\d+\.md)\)/);
    if (issueMatch) {
      const issueNumber = Number(issueMatch[1]);
      metaMap.set(issueNumber, {
        issueNumber,
        year: currentYear,
        month: currentMonth,
        title: issueMatch[2].trim(),
        file: issueMatch[3],
      });
    }
  }
  return metaMap;
}

function cleanArticleTitle(rawLine) {
  let line = rawLine.replace(/^\d+[、\.]\s*/, '').trim();
  const linkMatch = line.match(/^\[([^\]]+)\]\(([^)]+)\)(.*)$/);
  if (linkMatch) {
    return {
      title: linkMatch[1].trim(),
      url: linkMatch[2].trim(),
    };
  }
  const inlineLink = line.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
  const plain = stripMarkdown(line);
  const firstSentence = plain.split(/[。！？\n]/)[0].trim();
  return {
    title: firstSentence.length > 64 ? firstSentence.slice(0, 62) + '…' : firstSentence || '精选条目',
    url: inlineLink ? inlineLink[2] : null,
  };
}

function parseIssueFile(filePath, issueNumber, readmeMeta) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/);

  // Extract H1 title
  let h1Title = readmeMeta?.title || `第 ${issueNumber} 期`;
  for (const line of lines) {
    if (line.startsWith('# ')) {
      const t = line.replace(/^#\s+/, '').replace(/^科技爱好者周刊（第\s*\d+\s*期）[：:]\s*/, '').replace(/^每周分享第\s*\d+\s*期[：:]?\s*/, '').trim();
      if (t) h1Title = t;
      break;
    }
  }

  // Extract first image as coverImage
  let coverImage = null;
  const imgMatch = raw.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/);
  if (imgMatch) coverImage = imgMatch[1];

  // Infer year if missing from README
  let year = readmeMeta?.year;
  if (!year) {
    const dateImg = raw.match(/asset\/(\d{4})\d{2}\//);
    year = dateImg ? dateImg[1] : '历史归档';
  }
  const month = readmeMeta?.month || '';
  const yearGroup = ['2026', '2025', '2024'].includes(year) ? year : '历史归档';

  // Split into sections by ##
  const sections = [];
  let currentSection = { name: '__preamble__', lines: [] };

  for (const line of lines) {
    if (line.startsWith('# ') && sections.length === 0 && currentSection.lines.length === 0) {
      continue;
    }
    if (line.startsWith('## ')) {
      sections.push(currentSection);
      currentSection = { name: line.replace(/^##\s+/, '').trim(), lines: [] };
    } else {
      currentSection.lines.push(line);
    }
  }
  sections.push(currentSection);

  const articles = [];
  let artIndex = 1;

  for (const sec of sections) {
    if (SKIP_SECTIONS.has(sec.name)) continue;
    const secBody = sec.lines.join('\n').trim();
    if (!secBody) continue;

    if (sec.name === '封面图') {
      continue;
    }

    // Handle preamble (early issues had lead essay before first ##)
    if (sec.name === '__preamble__') {
      const cleanedLines = sec.lines.filter(
        (l) =>
          !l.startsWith('这里记录') &&
          !l.startsWith('本杂志[开源]') &&
          !l.startsWith('记录每周')
      );
      const preambleText = cleanedLines.join('\n').trim();
      const plain = stripMarkdown(preambleText);
      if (plain.length > 120) {
        const { externalLinks, githubRepos } = extractLinks(preambleText);
        articles.push({
          id: `issue-${issueNumber}-art-${artIndex++}`,
          issueNumber,
          year,
          yearGroup,
          month,
          title: h1Title || `第 ${issueNumber} 期卷首语`,
          url: externalLinks[0] || null,
          section: '卷首语',
          isLeadEssay: true,
          autoCategory: classifyArticle('卷首语', h1Title, preambleText),
          githubRepos,
          externalLinks,
          markdown: `## ${h1Title}\n\n${preambleText}`,
          plainText: plain,
          wordCount: plain.length,
          readingTimeMin: Math.max(1, Math.round(plain.length / 400)),
        });
      }
      continue;
    }

    // Check if section contains numbered items (1、 or 1.)
    const hasNumberedItems = /^\d+[、\.]\s+/m.test(secBody);

    if (!hasNumberedItems) {
      // Single long-form article / essay section (e.g., ## 最分心的一年, ## 《GTA6》的写实主义)
      const plain = stripMarkdown(secBody);
      if (plain.length < 30) continue;
      const { externalLinks, githubRepos } = extractLinks(secBody);
      const isLead = sec.name === h1Title || sec.name === '刊首语' || artIndex === 1;
      articles.push({
        id: `issue-${issueNumber}-art-${artIndex++}`,
        issueNumber,
        year,
        yearGroup,
        month,
        title: sec.name,
        url: externalLinks[0] || null,
        section: sec.name,
        isLeadEssay: isLead,
        autoCategory: classifyArticle(sec.name, sec.name, secBody),
        githubRepos,
        externalLinks,
        markdown: `## ${sec.name}\n\n${secBody}`,
        plainText: plain,
        wordCount: plain.length,
        readingTimeMin: Math.max(1, Math.round(plain.length / 400)),
      });
    } else {
      // Split numbered items
      const itemChunks = secBody.split(/^(?=\d+[、\.]\s+)/m).filter((c) => c.trim());
      for (const chunk of itemChunks) {
        const chunkLines = chunk.trim().split(/\r?\n/);
        const firstLine = chunkLines[0];
        if (!/^\d+[、\.]\s+/.test(firstLine)) {
          // Intro paragraph before item 1, skip if very short
          continue;
        }
        const { title, url } = cleanArticleTitle(firstLine);
        const bodyRest = chunkLines.slice(1).join('\n').trim();
        const fullItemMd = `### ${title}\n\n${firstLine.replace(/^\d+[、\.]\s+/, '')}\n\n${bodyRest}`.trim();
        const plain = stripMarkdown(`${title} ${firstLine} ${bodyRest}`);
        const { externalLinks, githubRepos } = extractLinks(chunk);

        articles.push({
          id: `issue-${issueNumber}-art-${artIndex++}`,
          issueNumber,
          year,
          yearGroup,
          month,
          title,
          url: url || externalLinks[0] || null,
          section: sec.name,
          isLeadEssay: false,
          autoCategory: classifyArticle(sec.name, title, chunk),
          githubRepos,
          externalLinks,
          markdown: fullItemMd,
          plainText: plain,
          wordCount: plain.length,
          readingTimeMin: Math.max(1, Math.round(plain.length / 400)),
        });
      }
    }
  }

  // Compute issue overview stats
  const categoryCounts = {};
  for (const cat of CATEGORIES) categoryCounts[cat] = 0;
  const issueRepos = new Set();
  const issueLinks = new Set();

  for (const art of articles) {
    categoryCounts[art.autoCategory] = (categoryCounts[art.autoCategory] || 0) + 1;
    art.githubRepos.forEach((r) => issueRepos.add(r));
    art.externalLinks.forEach((l) => issueLinks.add(l));
  }

  const lead = articles.find((a) => a.isLeadEssay) || articles[0];
  const summary = lead ? lead.plainText.slice(0, 140) + (lead.plainText.length > 140 ? '…' : '') : '';

  return {
    meta: {
      issueNumber,
      year,
      yearGroup,
      month,
      title: h1Title,
      coverImage,
      summary,
      articleCount: articles.length,
      categoryCounts,
      githubRepos: [...issueRepos],
      externalLinkCount: issueLinks.size,
      file: `docs/issue-${issueNumber}.md`,
    },
    articles,
  };
}

function main() {
  if (!fs.existsSync(WEEKLY_DIR)) {
    console.error(`Error: Weekly source directory not found at ${WEEKLY_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(CHUNKS_DIR, { recursive: true });

  const readmeMap = parseReadmeIndex(path.join(WEEKLY_DIR, 'README.md'));
  const docsDir = path.join(WEEKLY_DIR, 'docs');
  const files = fs
    .readdirSync(docsDir)
    .filter((f) => /^issue-\d+\.md$/.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/\d+/)[0]);
      const nb = Number(b.match(/\d+/)[0]);
      return nb - na; // newest first
    });

  const issuesMeta = [];
  const chunks = {
    '2026': {},
    '2025': {},
    '2024': {},
    'archive': {},
  };

  let totalArticles = 0;

  for (const file of files) {
    const issueNumber = Number(file.match(/\d+/)[0]);
    const readmeMeta = readmeMap.get(issueNumber);
    const { meta, articles } = parseIssueFile(path.join(docsDir, file), issueNumber, readmeMeta);
    issuesMeta.push(meta);
    totalArticles += articles.length;

    const chunkKey =
      meta.yearGroup === '2026' || meta.yearGroup === '2025' || meta.yearGroup === '2024'
        ? meta.yearGroup
        : 'archive';
    chunks[chunkKey][issueNumber] = articles;
  }

  const indexPayload = {
    generatedAt: new Date().toISOString(),
    sourceRepo: 'ruanyf/weekly',
    totalIssues: issuesMeta.length,
    totalArticles,
    categories: CATEGORIES,
    yearGroups: ['2026', '2025', '2024', '历史归档'],
    issues: issuesMeta,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'issues.json'), JSON.stringify(indexPayload));
  for (const [key, data] of Object.entries(chunks)) {
    fs.writeFileSync(path.join(CHUNKS_DIR, `${key}.json`), JSON.stringify(data));
  }

  console.log(
    `Parsed ${issuesMeta.length} issues (${totalArticles} articles) -> ${OUT_DIR}`
  );
}

main();
