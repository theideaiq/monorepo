from playwright.sync_api import sync_playwright

def verify_json_ld(page):
    page.goto("http://localhost:3000/en/product/logitech-g-pro-x-superlight", wait_until="networkidle")
    page.wait_for_timeout(2000)

    # We need to find the specific script tag inside the product view block
    scripts = page.locator('script[type="application/ld+json"]')
    count = scripts.count()
    print(f"Found {count} JSON-LD scripts.")

    for i in range(count):
        print(f"\n--- Script {i} ---")
        print(scripts.nth(i).inner_html())

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_json_ld(page)
        finally:
            context.close()
            browser.close()
