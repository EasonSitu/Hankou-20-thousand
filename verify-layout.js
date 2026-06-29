const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const htmlUrl = pathToFileURL(path.join(__dirname, "index.html")).href;
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";

async function inspectViewport(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(htmlUrl, { waitUntil: "load" });
  await page.waitForSelector("h1");

  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const content = document.querySelector(".content-main");
    const nav = document.querySelector(".side-nav");
    const figures = Array.from(document.querySelectorAll("figure img"));
    const imgs = Array.from(document.querySelectorAll("img"));

    return {
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim(),
      introHeading: document.querySelector("#about-author h2")?.textContent?.trim(),
      headerHeight: document.querySelector("header")?.getBoundingClientRect().height || 0,
      overflowX: Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth,
      contentWidth: content?.getBoundingClientRect().width || 0,
      navDisplay: nav ? getComputedStyle(nav).display : "missing",
      imageCount: imgs.length,
      figureImageCount: figures.length,
      imageRulesOk: imgs.every((img) => {
        const style = getComputedStyle(img);
        return style.maxWidth === "100%" && style.objectFit === "contain";
      }),
    };
  });
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const desktop = await inspectViewport(page, { width: 1366, height: 900 });
  const mobile = await inspectViewport(page, { width: 390, height: 844 });

  const routeState = await page.evaluate(() => ({
    activeButton: document.querySelector(".mode-btn.active")?.textContent?.trim(),
    navCollapsed: document.querySelector(".side-nav")?.classList.contains("is-collapsed"),
    toggleLabel: document.querySelector("#clear-search")?.getAttribute("aria-label"),
    navToggleExists: Boolean(document.querySelector("#nav-toggle")),
    videoPlanHidden: document.querySelector("#route-plan-video")?.classList.contains("hidden-by-filter"),
    dayPlanHidden: document.querySelector("#route-plan-day")?.classList.contains("hidden-by-filter"),
    halfPlanHidden: document.querySelector("#route-plan-half")?.classList.contains("hidden-by-filter"),
    allModeExists: Boolean(document.querySelector('[data-mode="all"]')),
    modeNoteExists: Boolean(document.querySelector("#mode-note")),
    toolHintExists: Boolean(document.querySelector(".tool-hint")),
    visibleStops: Array.from(document.querySelectorAll(".stop")).filter((stop) => !stop.classList.contains("hidden-by-filter")).length,
  }));

  await page.click("#clear-search");
  await page.waitForTimeout(100);
  const collapsedNavState = await page.evaluate(() => ({
    collapsed: document.querySelector(".side-nav")?.classList.contains("is-collapsed"),
    toggleLabel: document.querySelector("#clear-search")?.getAttribute("aria-label"),
    panelDisplay: getComputedStyle(document.querySelector(".search-panel")).display,
    inputDisplay: getComputedStyle(document.querySelector("#site-search")).display,
    linksDisplay: getComputedStyle(document.querySelector(".side-nav-inner")).display,
  }));

  await page.click("#clear-search");
  await page.waitForTimeout(100);
  const expandedNavState = await page.evaluate(() => ({
    collapsed: document.querySelector(".side-nav")?.classList.contains("is-collapsed"),
    toggleLabel: document.querySelector("#clear-search")?.getAttribute("aria-label"),
    inputDisplay: getComputedStyle(document.querySelector("#site-search")).display,
  }));

  await page.click('button[data-mode="day"]');
  await page.waitForTimeout(100);
  const dayState = await page.evaluate(() => ({
    videoPlanHidden: document.querySelector("#route-plan-video")?.classList.contains("hidden-by-filter"),
    dayPlanHidden: document.querySelector("#route-plan-day")?.classList.contains("hidden-by-filter"),
    halfPlanHidden: document.querySelector("#route-plan-half")?.classList.contains("hidden-by-filter"),
    visibleStops: Array.from(document.querySelectorAll(".stop")).filter((stop) => !stop.classList.contains("hidden-by-filter")).length,
  }));

  await page.click('button[data-mode="half"]');
  await page.waitForTimeout(100);
  const halfState = await page.evaluate(() => ({
    videoPlanHidden: document.querySelector("#route-plan-video")?.classList.contains("hidden-by-filter"),
    dayPlanHidden: document.querySelector("#route-plan-day")?.classList.contains("hidden-by-filter"),
    halfPlanHidden: document.querySelector("#route-plan-half")?.classList.contains("hidden-by-filter"),
    visibleStops: Array.from(document.querySelectorAll(".stop")).filter((stop) => !stop.classList.contains("hidden-by-filter")).length,
  }));

  await page.fill("#site-search", "银行");
  await page.waitForTimeout(100);
  const searchText = await page.locator("#search-count").textContent();

  await browser.close();

  const failures = [];
  for (const [label, result] of [
    ["desktop", desktop],
    ["mobile", mobile],
  ]) {
    if (result.title !== "汉口近代建筑扫街口袋手册") failures.push(`${label}: title mismatch`);
    if (result.h1 !== "汉口近代建筑扫街口袋手册") failures.push(`${label}: h1 mismatch`);
    if (result.introHeading !== "序言与致谢") failures.push(`${label}: intro heading missing`);
    if (result.overflowX > 1) failures.push(`${label}: horizontal overflow ${result.overflowX}px`);
    if (result.contentWidth < 300) failures.push(`${label}: content too narrow ${result.contentWidth}px`);
    if (result.imageCount < 1) failures.push(`${label}: expected gaode QR image`);
    if (!result.imageRulesOk) failures.push(`${label}: image CSS rules not applied`);
  }

  if (routeState.activeButton !== "跟视频分集") failures.push(`default route mode mismatch: ${routeState.activeButton}`);
  if (routeState.navCollapsed) failures.push("navigation should be expanded by default");
  if (desktop.headerHeight > 90) failures.push(`desktop header too tall: ${desktop.headerHeight}px`);
  if (mobile.headerHeight > 86) failures.push(`mobile header too tall: ${mobile.headerHeight}px`);
  if (routeState.modeNoteExists || routeState.toolHintExists) failures.push("route helper text should be removed");
  if (routeState.navToggleExists) failures.push("separate nav toggle should be removed");
  if (routeState.allModeExists) failures.push("duplicate full-route mode should be removed");
  if (routeState.toggleLabel !== "折叠搜索与跳转") failures.push(`unexpected expanded toggle label: ${routeState.toggleLabel}`);
  if (routeState.videoPlanHidden) failures.push("video route plan should be visible by default");
  if (!routeState.dayPlanHidden || !routeState.halfPlanHidden) failures.push("day/half route plans should be hidden by default");
  if (!collapsedNavState.collapsed) failures.push("navigation did not collapse");
  if (collapsedNavState.toggleLabel !== "展开搜索与跳转") failures.push(`unexpected collapsed toggle label: ${collapsedNavState.toggleLabel}`);
  if (collapsedNavState.panelDisplay === "none") failures.push("collapsed navigation should keep the small toggle visible");
  if (collapsedNavState.inputDisplay !== "none" || collapsedNavState.linksDisplay !== "none") failures.push("collapsed navigation still shows input or links");
  if (expandedNavState.collapsed || expandedNavState.toggleLabel !== "折叠搜索与跳转" || expandedNavState.inputDisplay === "none") failures.push("navigation did not expand again");
  if (!dayState.videoPlanHidden || dayState.dayPlanHidden || !dayState.halfPlanHidden) failures.push("day route plan visibility mismatch");
  if (!halfState.videoPlanHidden || !halfState.dayPlanHidden || halfState.halfPlanHidden) failures.push("half route plan visibility mismatch");
  if (!(halfState.visibleStops < dayState.visibleStops)) failures.push("half route should show fewer stops than day route");

  if (!/找到\s+\d+\s+个相关地点/.test(searchText || "")) {
    failures.push(`search did not return results: ${searchText}`);
  }

  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join(" | ")}`);

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(JSON.stringify({ desktop, mobile, routeState, collapsedNavState, expandedNavState, dayState, halfState, searchText }, null, 2));
})();
