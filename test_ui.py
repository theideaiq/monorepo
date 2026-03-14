from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to home page
        page.goto('http://localhost:3000/')
        page.wait_for_load_state('networkidle')

        try:
            # Check WebNavbar buttons
            page.locator('button[aria-label="Search"]').wait_for(state="visible", timeout=2000)
            page.locator('a[aria-label="Account"]').wait_for(state="visible", timeout=2000)
            page.locator('button[aria-label="Shopping Cart"]').wait_for(state="visible", timeout=2000)
            print("Successfully found WebNavbar aria-labels.")
        except Exception as e:
            print(f"Error checking WebNavbar: {e}")

        page.screenshot(path='screenshot.png')
        browser.close()

if __name__ == '__main__':
    main()
