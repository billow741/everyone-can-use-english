import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1400, "height": 900})
        page = await context.new_page()

        print("Navigating to Homepage...")
        await page.goto("https://app.sunnybridge.qzz.io/#/", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        # Check if guest login button exists
        guest_btn = page.locator("text=暂不登录，先体验一下").first
        if await guest_btn.is_visible():
            print("Clicking guest login...")
            await guest_btn.click()
            await page.wait_for_timeout(3000)

        # Screenshot homepage
        home_shot = r"C:\Users\roger\.gemini\antigravity\brain\9eabbc76-142d-46a5-9efc-56d30ac18edd\daily_sentence_home.png"
        await page.screenshot(path=home_shot, full_page=True)
        print(f"Saved homepage screenshot to {home_shot}")

        # Find the "立即开口跟读评测" button
        eval_btn = page.locator("text=立即开口跟读评测").first
        if await eval_btn.is_visible():
            print("Found 立即开口跟读评测 button, clicking...")
            await eval_btn.click()
            await page.wait_for_timeout(4000)
            
            drawer_shot = r"C:\Users\roger\.gemini\antigravity\brain\9eabbc76-142d-46a5-9efc-56d30ac18edd\daily_sentence_drawer_opened.png"
            await page.screenshot(path=drawer_shot)
            print(f"Saved drawer opened screenshot to {drawer_shot}")
        else:
            print("立即开口跟读评测 button NOT found on home page!")

        # Navigate to pronunciation assessments page directly
        print("Navigating to /pronunciation_assessments...")
        await page.goto("https://app.sunnybridge.qzz.io/#/pronunciation_assessments", wait_until="networkidle")
        await page.wait_for_timeout(3000)
        pron_shot = r"C:\Users\roger\.gemini\antigravity\brain\9eabbc76-142d-46a5-9efc-56d30ac18edd\daily_sentence_pron_page.png"
        await page.screenshot(path=pron_shot)
        print(f"Saved pronunciation page screenshot to {pron_shot}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
