const fs = require("node:fs");
const path = require("node:path");

const htmlPath = path.join(__dirname, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");

const checks = [];

function check(name, predicate, detail) {
  checks.push({ name, ok: Boolean(predicate()), detail });
}

function present(patterns) {
  return patterns.filter((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(html);
    return html.includes(pattern);
  });
}

const personalTripLeaks = present([
  "执行日：2026-06-28 周日",
  "起点：武汉市第一医院附近酒店",
  "建议：16:30 前收线",
  "整理/维护：Eason",
  "个人发烧用户",
  "需求整理",
  "作者身份与使用说明",
  "你给",
  "你口述",
  "我查到",
  "你们",
  "明天",
  "昨天",
  "所谓“粉丝向”",
  "读者与使用方式",
  "资料底本与使用边界",
  "后续做网页可继续深挖的关键词",
  'class="subtitle"',
  'class="meta"',
]);

check(
  "public copy removes personal itinerary and internal project wording",
  () => personalTripLeaks.length === 0,
  `found: ${personalTripLeaks.join(", ")}`
);

check(
  "source credit uses the current public identity",
  () =>
    html.includes("序言与致谢") &&
    html.includes('href="https://space.bilibili.com/9862450?spm_id_from=333.337.0.0"') &&
    html.includes("B站用户 Eason-Situ 制作") &&
    html.includes("非官方整理") &&
    !html.includes("Ea-sons") &&
    !html.includes("B站用户 Ea-sons"),
  "expected Eason-Situ credit and no old Ea-sons spelling"
);

check(
  "intro is warmer but still concise",
  () =>
    html.includes("江汉路") &&
    html.includes("砖墙、柱廊、穹顶") &&
    html.includes("普通游客") &&
    html.includes("看过视频的观众"),
  "expected a human introduction with affection for Hankou architecture"
);

check(
  "top-level noise blocks are removed",
  () =>
    !html.includes('class="notice"') &&
    !html.includes('class="tool-hint"') &&
    !html.includes('id="mode-note"') &&
    !html.includes("关键词示例：") &&
    !html.includes("路线选择会直接改变下方显示的站点") &&
    html.includes('class="freshness-note"'),
  "expected notice/tool hint/mode note removed while keeping freshness note"
);

check(
  "intro is compact and does not keep internal requirement blocks",
  () =>
    html.includes('id="about-author"') &&
    !html.includes('id="guide-principles"') &&
    !html.includes('class="audience-list"') &&
    !html.includes('class="requirements-grid"') &&
    !html.includes('<nav class="toc"'),
  "expected compact introduction without reader taxonomy or toc"
);

check(
  "image defaults avoid oversized cropping on future media",
  () =>
    /img\s*\{[^}]*max-width:\s*100%[^}]*height:\s*auto[^}]*object-fit:\s*contain/s.test(html) &&
    /figure\s*\{[^}]*margin:/s.test(html) &&
    /figure\s+img\s*\{[^}]*max-height:/s.test(html),
  "expected responsive figure/img CSS defaults"
);

check(
  "search and route controls are compact",
  () =>
    html.includes("地点搜索") &&
    !html.includes('id="nav-toggle"') &&
    html.includes('id="clear-search"') &&
    html.includes("折叠搜索与跳转") &&
    html.includes("展开搜索与跳转") &&
    html.includes("is-collapsed") &&
    !html.includes('data-mode="all"') &&
    !html.includes(">完整路线</button>") &&
    html.includes("半日精华") &&
    html.includes("一日精华") &&
    html.includes("跟视频分集"),
  "expected three route modes and the search-panel collapse button"
);

check(
  "side jump list does not keep redundant category dividers",
  () => !html.includes('class="side-group-title"'),
  "expected the side jump list to be a flat list without 上午/沿江/街区 dividers"
);

check(
  "video route mode explains all four episodes",
  () =>
    html.includes('id="route-plan-video"') &&
    html.includes('data-plan="video"') &&
    html.includes("第1集") &&
    html.includes("江汉路近现代建筑群") &&
    html.includes("第2集") &&
    html.includes("沿江大道建筑群") &&
    html.includes("第3集") &&
    html.includes("胜利街到黎黄陂路") &&
    html.includes("第4集") &&
    html.includes("巴公房子到武汉美术馆"),
  "expected an episode-by-episode route summary in video mode"
);

check(
  "gaode map qr and source search link are placed correctly",
  () => {
    const searchIndex = html.indexOf("B站检索：艺术与设计史 汉口两万步");
    const sourceTailIndex = html.indexOf("补充检索入口");
    return (
      html.includes("assets/gaode-hankou-guide-qr-only.png") &&
      html.includes("高德地图扫码") &&
      html.includes("使用高德地图扫描二维码，可导入完整点位。") &&
      !html.includes("长按或使用高德地图扫码") &&
      sourceTailIndex !== -1 &&
      searchIndex > sourceTailIndex
    );
  },
  "expected compact gaode QR-only image and bilibili search link near the bottom of sources"
);

const bilibiliVideoUrls = [
  "https://www.bilibili.com/video/BV1w7CSYoEsY/",
  "https://www.bilibili.com/video/BV1SdmUY2Eit",
  "https://www.bilibili.com/video/BV1UGBFYEEUb",
  "https://www.bilibili.com/video/BV1hPQxYoE7k",
];

check(
  "all four source videos are linked directly",
  () => bilibiliVideoUrls.every((url) => html.includes(url)),
  "expected direct links for 汉口两万步 1-4"
);

check(
  "repo and feedback contact are published",
  () =>
    html.includes("https://github.com/EasonSitu/Hankou-20-thousand") &&
    html.includes("419824892@qq.com") &&
    html.includes("mailto:419824892@qq.com"),
  "expected GitHub repository and feedback email in the page footer"
);

const guideToneLeaks = present([
  "现场怎么看",
  "建议吃法",
  "现场阅读方式",
  "外观最稳",
  "入内看现场",
  "不知道叫什么",
  "保持安静，快速看，不拍人",
  "不要为了完整打卡牺牲体验",
  "如果天气闷热，优先保证",
]);

check(
  "building copy uses objective headings and avoids guide-like admonitions",
  () => guideToneLeaks.length === 0,
  `found: ${guideToneLeaks.join(", ")}`
);

check(
  "source links are compact footnotes",
  () => {
    const match = html.match(/\.source-links\s*\{([^}]+)\}/s);
    return Boolean(
      match &&
        /font-size:\s*12px/.test(match[1]) &&
        /background:\s*transparent/.test(match[1]) &&
        !/padding:\s*10px 12px/.test(match[1])
    );
  },
  "expected source-links to be visually quiet, small, and transparent"
);

const failed = checks.filter((item) => !item.ok);

if (failed.length) {
  console.error(`${failed.length} quality check(s) failed:`);
  for (const item of failed) {
    console.error(`- ${item.name}: ${item.detail}`);
  }
  process.exit(1);
}

console.log(`${checks.length} quality checks passed.`);
