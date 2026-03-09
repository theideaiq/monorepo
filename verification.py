from playwright.sync_api import sync_playwright, expect

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to a product page where formatting is used
        page.goto('http://localhost:3000/en/checkout')

        # Wait for page to load
        page.wait_for_timeout(3000)

        page.screenshot(path="verification.png")

        browser.close()

if __name__ == "__main__":
    verify()
