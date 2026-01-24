from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})

    # Verify Plus Page
    print("Navigating to /plus")
    try:
        page.goto("http://localhost:3000/en/plus", timeout=60000)
        page.wait_for_selector("h1", timeout=10000) # Wait for hero

        # Scroll down to tiers to make sure they are in view
        # The tiers section id="tiers"
        page.locator("#tiers").scroll_into_view_if_needed()
        page.wait_for_timeout(2000) # Wait for animations

        page.screenshot(path="verification/plus_page.png")
        print("Screenshot saved to verification/plus_page.png")
    except Exception as e:
        print(f"Error on /plus: {e}")

    # Verify Megastore Page
    print("Navigating to /megastore")
    try:
        page.goto("http://localhost:3000/en/megastore", timeout=60000)
        page.wait_for_selector("h1", timeout=10000) # Wait for hero

        # Scroll to Flash Deals (bottom)
        # It has "FLASH DEAL" text (uppercase in UI? "FLASH DEAL" is in JSX)
        # <div ...> ... FLASH DEAL ... </div>
        page.get_by_text("FLASH DEAL").scroll_into_view_if_needed()
        page.wait_for_timeout(2000)

        page.screenshot(path="verification/megastore_page.png")
        print("Screenshot saved to verification/megastore_page.png")
    except Exception as e:
        print(f"Error on /megastore: {e}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
