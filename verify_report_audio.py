import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1400, "height": 1200})
        page = await context.new_page()

        print("Navigating to Homepage...")
        await page.goto("https://app.sunnybridge.qzz.io/#/", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        # Handle guest mode if needed
        guest_btn = page.locator("text=暂不登录，先体验一下").first
        if await guest_btn.is_visible():
            await guest_btn.click()
            await page.wait_for_timeout(3000)

        print("Navigating to pronunciation assessments...")
        await page.goto("https://app.sunnybridge.qzz.io/#/pronunciation_assessments", wait_until="networkidle")
        await page.wait_for_timeout(3000)

        # Click on an assessment history record if available to view detail report
        history_record = page.locator("div.border-b, div[class*='cursor-pointer']").filter(has_text="分").first
        if await history_record.is_visible():
            print("Found history record, clicking...")
            await history_record.click()
            await page.wait_for_timeout(3000)
            
            # Scroll down to see PitchContourOverlay
            await page.evaluate("window.scrollTo(0, 1000)")
            await page.wait_for_timeout(2000)

        report_shot = r"C:\Users\roger\.gemini\antigravity\brain\9eabbc76-142d-46a5-9efc-56d30ac18edd\report_audio_verified.png"
        await page.screenshot(path=report_shot, full_page=True)
        print(f"Saved screenshot to {report_shot}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
