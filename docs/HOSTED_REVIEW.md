# Hosted review

web/index.html is a self-contained browser version of the foundation. Serve it with a static host; calculators and profile audits run in the browser. No Python server is needed for this version.

Validation: eight browser-tool assertions passed and the embedded JavaScript passed node --check. Browser rendering and interaction tests were unavailable. Account authentication, AI and live integrations remain unimplemented.

Run node tests/test_browser_tools.js to check the browser tool engine.
