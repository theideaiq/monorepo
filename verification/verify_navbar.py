
from playwright.sync_api import sync_playwright

def verify_navbar():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to the homepage
        page.goto("http://localhost:3000")

        # Wait for the navbar to be visible
        page.wait_for_selector("nav")

        # Take a screenshot of the navbar
        # Navbar height is 80px (h-20), taking a bit more to see context
        page.screenshot(path="verification/navbar.png", clip={"x": 0, "y": 0, "width": 1280, "height": 100})

        # Hover over an item to check hover state
        page.hover("text=Megastore")
        page.screenshot(path="verification/navbar_hover.png", clip={"x": 0, "y": 0, "width": 1280, "height": 100})

        browser.close()

if __name__ == "__main__":
    verify_navbar()
