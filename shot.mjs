import { chromium } from "playwright";

const base = process.env.BASE || "http://localhost:4321";
const routes = process.argv.slice(2);
const targets = routes.length ? routes : ["/"];

const browser = await chromium.launch();

// Lenis owns the scroll position, so force the final reveal state directly
// for a deterministic capture (mirrors what a user sees after scrolling).
async function settle(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll(".reveal")
      .forEach((el) => el.classList.add("is-visible"));
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

for (const route of targets) {
  const slug = route === "/" ? "home" : route.replace(/\//g, "-").replace(/^-/, "");

  for (const [label, viewport] of [
    ["desktop", { width: 1440, height: 900 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(base + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    await settle(page);
    await page.screenshot({ path: `shots/${slug}-${label}.png`, fullPage: true });
    await page.close();
  }

  console.log(`shot: ${slug}`);
}

await browser.close();
