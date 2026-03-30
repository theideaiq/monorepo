from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to home
        page.goto("http://localhost:3000/en/megastore")
        page.wait_for_timeout(4000)

        # We need to click "Claim Deal" or something to add item
        # Wait for "Claim Deal" to be present and click it
        btn = page.locator("text='Claim Deal'")
        if btn.count() > 0:
            btn.nth(0).click()
            page.wait_for_timeout(1000)
            btn.nth(0).click()
            page.wait_for_timeout(1000)

        # Take screenshot of the Navbar showing cart items count
        page.screenshot(path="verification_screenshot_2.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    verify_frontend()
