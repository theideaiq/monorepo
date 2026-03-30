import re
from playwright.sync_api import sync_playwright

def verify_json_ld(page):
    page.goto("http://localhost:3000/en/product/logitech-g-pro-x-superlight", wait_until="networkidle")
    page.wait_for_timeout(2000)

    # We only care that it parses correctly in the DOM and doesn't visually break things
    json_ld_script = page.locator('script[type="application/ld+json"]').first
    json_ld_content = json_ld_script.inner_html()

    print("Found JSON-LD:")
    print(json_ld_content)

    page.screenshot(path="/tmp/product_page.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/tmp/videos"
        )
        page = context.new_page()
        try:
            verify_json_ld(page)
        finally:
            context.close()
            browser.close()
