# GemiSide

A lightweight, context-aware Chrome extension for deep-work developers.

GemiSide is a side-panel assistant that lets you query Gemini directly on top of your current browser tab. It is designed to remove the friction of context-switching when you are debugging code, reading technical documentation, or working through problems.

### Features
* **In-Page Context**: The extension scrapes the active tab's content and code blocks, so you do not have to copy-paste.
* **Transient UI**: The workspace slides into view when you need it and snaps away when you are done.
* **Preset Actions**: One-click shortcuts for common tasks:
    * **Explain Bug**: Pinpoints logic errors.
    * **Optimize**: Analyzes time and space complexity.
    * **Dry Run**: Provides a step-by-step trace of your code.
* **Local Storage**: API keys are saved securely via chrome.storage.local. They are never hardcoded or pushed to version control.

### Setup
1. Clone this repository.
2. Open chrome://extensions/ in your browser.
3. Toggle Developer mode in the top right.
4. Click Load unpacked and select the GemiSide project folder.
5. Once loaded, click the gear icon in the GemiSide panel to add your Google Gemini API key.

### How to use
Highlight any code or text on a page to trigger the "Ask GemiSide" chip. Clicking it opens the side workspace with that text pre-loaded as context.

### Security
This project does not store your API key in the source code. Keep your credentials secure by managing them only through the extension's internal settings menu.

## Why GemiSide instead of the built-in browser assistant?
- Open multiple independent AI workspaces on the same page.
- Keep different conversations for different problems.
- Drag panels anywhere instead of being locked to the browser sidebar.
- Keep an assistant next to the exact section of documentation or code you're reading.
- Automatically capture page context without constant copy-pasting.

### Why I built this
I wanted a way to query my technical documentation without constantly alt-tabbing to a browser window. GemiSide keeps my workspace focused and gets the AI out of the way.