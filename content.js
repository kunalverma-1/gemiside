function formatGemiSideMarkdown(text) {
    if (!text) return '';
  
    // 1. Escape HTML to prevent injection issues
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  
    // 2. Parse Code Blocks (```lang ... ```)
    // Enhanced Code Block Parsing (Handles any language tag like cpp, r, python, etc.)
    html = html.replace(/```([a-zA-Z0-9+#-]+)?([\s\S]*?)```/g, function(match, lang, code) {
        return `<pre class="gemiside-code-block"><code class="${lang || ''}">${code.trim()}</code></pre>`;
    });
  
    // 3. Parse Inline Code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code class="gemiside-inline-code">$1</code>');
  
    // 4. Parse Headers (### Header)
    html = html.replace(/^### (.*$)/gim, '<h3 class="gemiside-h3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="gemiside-h2">$1</h2>');
  
    // 5. Parse Bold Text (**text**)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
    // 6. Parse Mathematical Notation/Time Complexities safely
    html = html.replace(/\$([^$]+)\$/g, '<span class="gemiside-math">$1</span>');
    
    // --- ADD THESE NEW LATEX CLEANUP RULES HERE ---
    html = html.replace(/\\frac\{1\}\{2\}/g, '½');
    html = html.replace(/\\times/g, ' × ');
    html = html.replace(/\\approx/g, ' ≈ ');
    html = html.replace(/\\mu/g, 'μ');
    html = html.replace(/\^2/g, '²');
    html = html.replace(/\\/g, ''); // Strip out any remaining rogue backslashes
  
    // 7. Convert remaining newlines into real paragraph breaks
    html = html.split('\n').map(line => {
      if (line.trim().startsWith('<h') || line.trim().startsWith('<div') || line.trim() === '') {
        return line;
      }
      return `<p class="gemiside-text-line">${line}</p>`;
    }).join('');
  
    return html;
  }

(function () {
    'use strict';
  
    let activeActionChip = null;
  
    // Track global configuration targets inside Gemini DOM structure
    const DOM_TARGETS = {
      messageContainers: ['message-content', '.message', '.model-response', '.conversation-container'],
      codeBlocks: ['pre', 'code-block', '.code-code']
    };
  
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', clearActionChipOnOutsideClick);
  
    function handleTextSelection(event) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
  
      const rawText = selection.toString().trim();
      if (rawText.length === 0) return;
  
      const anchorElement = selection.anchorNode.parentElement;
      const isValidContainer = DOM_TARGETS.messageContainers.some(selector => 
        anchorElement.closest(selector)
      );
  
      if (!isValidContainer) return;
  
      // Determine target location boundaries
      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      if (rects.length === 0) return;
  
      const lastRect = rects[rects.length - 1];
      const posX = lastRect.left + window.scrollX + (lastRect.width / 2);
      const posY = lastRect.top + window.scrollY;
  
      // --- THE SMART CONTEXT ENGINE (DOM CRAWLER) ---
      let container = range.commonAncestorContainer;
      
      // If the browser returns a raw Text Node, step up to its HTML wrapper
      if (container.nodeType === 3) { 
          container = container.parentNode;
      }
  
      // Traverse UP the tree looking for code blocks
      const parentCodeBlock = container.closest('pre, code, .code-block, [class*="code"]');
      let smartContext = rawText;
  
      // If a parent block is found, package it together!
      if (parentCodeBlock) {
          const fullCodeContext = parentCodeBlock.innerText.trim();
          
          // Prevent duplicating text if you highlighted the whole block
          if (fullCodeContext !== rawText && fullCodeContext.includes(rawText)) {
              smartContext = `[Parent Code Context]:\n${fullCodeContext}\n\n[Highlighted Target]:\n${rawText}`;
          }
      }
  
      // Pass the perfectly packaged smartContext directly to the UI
      renderActionChip(posX, posY, smartContext, "");
    }
  
    function renderActionChip(x, y, contextText, associatedCode) {
        removeExistingActionChip();
    
        const chip = document.createElement('div');
        chip.className = 'gemiside-action-chip-wrapper';
        
        const shadow = chip.attachShadow({ mode: 'open' });
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = chrome.runtime.getURL('ui.css');
        shadow.appendChild(linkElement);
    
        const buttonNode = document.createElement('button');
        buttonNode.className = 'gemiside-action-chip';
        buttonNode.textContent = 'Ask GemiSide';
        
        chip.style.position = 'absolute';
        chip.style.left = `${x}px`;
        chip.style.top = `${y}px`;
    
        buttonNode.addEventListener('mousedown', (e) => {
          e.preventDefault(); 
          e.stopPropagation(); 
          
          instantiateWorkspaceWindow(x, y + 25, contextText, associatedCode);
          removeExistingActionChip();
        });
    
        shadow.appendChild(buttonNode);
        document.body.appendChild(chip);
        activeActionChip = chip;
      }
  
    function instantiateWorkspaceWindow(x, y, textContext, codeContext) {
        
        const host = document.createElement('div');
        host.className = 'gemiside-host-node';
        host.style.position = 'absolute';
        host.style.left = `${x}px`;
        host.style.top = `${y}px`;
        host.style.zIndex = '2147483647';
    
        const shadow = host.attachShadow({ mode: 'open' });
        
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = chrome.runtime.getURL('ui.css');
        shadow.appendChild(linkElement);
    
        const container = document.createElement('div');
        container.className = 'gemiside-workspace';
        container.innerHTML = `
  <div class="gemiside-header">
    <div class="gemiside-title">GemiSide</div>
    <div class="gemiside-header-controls">
      <button class="gemiside-icon-btn gemiside-reset-btn" title="New Thread">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <button class="gemiside-icon-btn gemiside-settings-btn" title="Settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      </button>
      <button class="gemiside-icon-btn gemiside-minimize-btn" title="Minimize">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M5 12h14"/></svg>
      </button>
      <button class="gemiside-icon-btn gemiside-close-btn" title="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  </div>

  <div class="gemiside-settings-overlay">
  <div class="gemiside-settings-title">Engine Configuration</div>
  <div class="gemiside-settings-sub">
    Enter your API Key to enable GemiSide. <a href="https://aistudio.google.com/" target="_blank">Get Key</a>
  </div>

  <div class="gemiside-settings-group">
    <label class="gemiside-settings-label">API Key</label>
    <input type="password" class="gemiside-settings-input" placeholder="Paste Gemini API Key...">
  </div>

  <div class="gemiside-settings-group">
    <label class="gemiside-settings-label">Model Selection</label>
    <select class="gemiside-select gemiside-model-select">
      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option>
      <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
    </select>
  </div>

  <button class="gemiside-settings-save">Save & Close</button>

  <div class="gemiside-about">
    Built by <a href="https://www.linkedin.com/in/kunalverma10/" target="_blank">Kunal Verma</a>
  </div>
</div>

  <div class="gemiside-scroller">
    <details class="gemiside-context-accordion">
      <summary>
        <div class="gemiside-summary-text">${textContext}</div>
        <div class="gemiside-summary-arrow">
          <span class="gemiside-summary-arrow-icon">▼</span>
        </div>
      </summary>
      <div class="gemiside-context-full">${textContext}</div>
    </details>
    <div class="gemiside-empty-state">
      <span>Hit me</span>
      <span>with a</span>
      <span>follow up...</span>
    </div>
    <div class="gemiside-message-log"></div>
  </div>
  
  <div class="gemiside-footer">
    <div class="gemiside-quick-actions">
       <button class="gemiside-action-btn" data-action="bug"> Explain Bug </button>
       <button class="gemiside-action-btn" data-action="optimize"> Optimize </button>
       <button class="gemiside-action-btn" data-action="dryrun"> Dry Run </button>
    </div>
    
    <div class="gemiside-input-wrapper">
      <input type="text" class="gemiside-input-field" placeholder="Ask GemiSide">
      <button class="gemiside-send-btn" title="Send message" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="19" x2="12" y2="5"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
      </button>
    </div>
  </div>
`;
    
        shadow.appendChild(container);
        document.body.appendChild(host);
    
        // --- HEADER PANEL ACTION HANDLERS ---
        shadow.querySelector('.gemiside-close-btn').addEventListener('click', () => host.remove());
        
        // 🔄 New Thread Action: Wipes active conversation and updates current context
        shadow.querySelector('.gemiside-reset-btn').addEventListener('click', () => {
            shadow.querySelector('.gemiside-message-log').innerHTML = '';
            
            const freshContext = getPageContext();
            shadow.querySelector('.gemiside-summary-text').textContent = freshContext;
            shadow.querySelector('.gemiside-context-full').textContent = freshContext;
  
            if (!shadow.querySelector('.gemiside-empty-state')) {
              const emptyStateElement = document.createElement('div');
              emptyStateElement.className = 'gemiside-empty-state';
              emptyStateElement.innerHTML = `<span>Hit me</span><span>with a</span><span>follow up...</span>`;
              shadow.querySelector('.gemiside-scroller').insertBefore(emptyStateElement, shadow.querySelector('.gemiside-message-log'));
            }
          });
  
        // ⚙️ Settings Action: Toggle Menu & Secure Storage
      const settingsOverlay = shadow.querySelector('.gemiside-settings-overlay');
      const settingsInput = shadow.querySelector('.gemiside-settings-input');
      const settingsSave = shadow.querySelector('.gemiside-settings-save');

      // Check if a key is already saved when the window opens
      chrome.storage.local.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) settingsInput.value = result.geminiApiKey;
      });

      // Toggle menu on gear click
      // Toggle menu on gear click AND manage background chat visibility
      shadow.querySelector('.gemiside-settings-btn').addEventListener('click', () => {
        const isActive = settingsOverlay.classList.toggle('active');
        const scroller = shadow.querySelector('.gemiside-scroller');
        const footer = shadow.querySelector('.gemiside-footer');

        if (isActive) {
          // Hide chat text so it doesn't bleed through the frosted glass
          if (scroller) scroller.style.display = 'none';
          if (footer) footer.style.display = 'none';
        } else {
          // Bring them back if closed via clicking the gear icon again
          if (scroller) scroller.style.display = 'flex';
          if (footer) footer.style.display = 'block';
        }
      });

      // Save preferences, reset background chat visibility, and show feedback
      settingsSave.addEventListener('click', () => {
        chrome.storage.local.set({ 
          geminiApiKey: settingsInput.value.trim(),
          geminiModel: modelSelect.value 
        }, () => { 
          settingsOverlay.classList.remove('active');
          
          // Restore the main interface views cleanly
          const scroller = shadow.querySelector('.gemiside-scroller');
          const footer = shadow.querySelector('.gemiside-footer');
          if (scroller) scroller.style.display = 'flex';
          if (footer) footer.style.display = 'block';
          
          // Visual feedback on the button
          const originalText = settingsSave.textContent;
          settingsSave.textContent = "Saved!";
          settingsSave.style.background = "#34a853"; // Green
          setTimeout(() => {
            settingsSave.textContent = originalText;
            settingsSave.style.background = "rgba(255, 255, 255, 0.1)"; // Back to your sleek design
          }, 1500);
        });
      });
  
        // 🔽 Smooth Minimize Action: Alternates heights cleanly
        let isMinimized = false;
        const minimizeBtn = shadow.querySelector('.gemiside-minimize-btn');
        minimizeBtn.addEventListener('click', () => {
          isMinimized = !isMinimized;
          if (isMinimized) {
            container.style.height = '45px';
            shadow.querySelector('.gemiside-scroller').style.display = 'none';
            shadow.querySelector('.gemiside-footer').style.display = 'none';
            minimizeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"/></svg>`;
          } else {
            container.style.height = '500px';
            shadow.querySelector('.gemiside-scroller').style.display = 'flex';
            shadow.querySelector('.gemiside-footer').style.display = 'block';
            minimizeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M5 12h14"/></svg>`;
          }
        });
  
        enableDragCapabilities(container, host);
    
        const inputField = shadow.querySelector('.gemiside-input-field');
        const sendButton = shadow.querySelector('.gemiside-send-btn');
        const messageLog = shadow.querySelector('.gemiside-message-log');
        // --- CHAT MEMORY: Load past conversation (URL Specific) ---
      const historyKey = 'gemiside_hist_' + window.location.hostname + window.location.pathname;
      chrome.storage.local.get([historyKey], (result) => {
        if (result[historyKey] && result[historyKey].length > 0) {
          const emptyState = shadow.querySelector('.gemiside-empty-state');
          if (emptyState) emptyState.remove();
          result[historyKey].forEach(msg => {
            appendMessageToWorkspace(messageLog, msg.role, msg.text); 
          });
          setTimeout(() => {
            messageLog.parentElement.scrollTop = messageLog.parentElement.scrollHeight;
          }, 50);
        }
      });
  
        // --- DYNAMIC SEND BUTTON CONTROLLER ---
        inputField.addEventListener('input', () => {
          const queryText = inputField.value.trim();
          if (queryText.length > 0) {
            sendButton.classList.add('active');
            sendButton.removeAttribute('disabled');
          } else {
            sendButton.classList.remove('active');
            sendButton.setAttribute('disabled', 'true');
          }
        });
  
        // Core triggering routing engine execution block
        // Core triggering routing engine execution block
        const triggerSubmission = () => {
            const userQuery = inputField.value.trim();
            if (userQuery.length === 0) return;
    
            inputField.value = ''; 
            sendButton.classList.remove('active');
            sendButton.setAttribute('disabled', 'true');
    
            const emptyState = shadow.querySelector('.gemiside-empty-state');
            if (emptyState) emptyState.remove();
    
            // 1. Append User Node (flushed completely right, text only)
            appendMessageToWorkspace(messageLog, 'user', userQuery);
            
            // 2. Append Custom Thinking Node with Bouncing Dots Structure
            const thinkingContainer = document.createElement('div');
            thinkingContainer.className = 'gemiside-message-wrapper';
            thinkingContainer.innerHTML = `
              <div class="gemiside-msg-model">
                <div class="gemiside-loader-container">
                  Thinking
                  <div class="gemiside-bouncing-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            `;
            messageLog.appendChild(thinkingContainer);
            messageLog.parentElement.scrollTop = messageLog.parentElement.scrollHeight;
    
            // --- Context Fix: Grab the locked-in text directly from the UI accordion ---
            const lockedContext = shadow.querySelector('.gemiside-context-full').textContent;
    
            chrome.runtime.sendMessage(
              {
                action: "generate_response",
                contextText: lockedContext, // Sends the exact text captured when the window opened
                codeContext: codeContext,
                userQuery: userQuery
              },
              (response) => {
                // Remove the active loading elements container cleanly
                thinkingContainer.remove();
    
                if (chrome.runtime.lastError) {
                  const errNode = appendMessageToWorkspace(messageLog, 'model', 'Error: Background service worker connection lost.');
                  return;
                }
    
                if (response && response.success) {
                  appendMessageToWorkspace(messageLog, 'model', response.text);
        
                } else {
                  const errorText = response ? response.text : "Error: Network disconnected.";
                  appendMessageToWorkspace(messageLog, 'model', errorText);
                }
              }
            );
          };
  
        // --- QUICK ACTION PRESETS ENGINE ---
        const actionBtns = shadow.querySelectorAll('.gemiside-action-btn');
        actionBtns.forEach(btn => {
          btn.addEventListener('click', (e) => {
            const actionType = e.target.getAttribute('data-action');
            let promptText = "";
            
            // Map the buttons to their heavy-lifting master prompts
            if (actionType === "bug") promptText = "Analyze the provided page context and code. Find and explain any bugs clearly.";
            if (actionType === "optimize") promptText = "Optimize the provided code context for better time and space complexity. Explain your changes.";
            if (actionType === "dryrun") promptText = "Provide a step-by-step trace breakdown or dry run of the provided code context.";
            
            // Inject the prompt and fire the submission instantly
            inputField.value = promptText;
            sendButton.classList.add('active');
            sendButton.removeAttribute('disabled');
            triggerSubmission();
          });
        });
          inputField.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') triggerSubmission();
        });
        sendButton.addEventListener('click', triggerSubmission);
      }

      function appendMessageToWorkspace(logContainer, role, text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'gemiside-message-wrapper';
        
        const bodyNode = document.createElement('div');
        
        if (role === 'user') {
          bodyNode.className = 'gemiside-msg-user';
          bodyNode.textContent = text;
        } else {
          bodyNode.className = 'gemiside-msg-model';
          // Run structured network payload strictly through markdown rendering parser logic
          bodyNode.innerHTML = formatGemiSideMarkdown(text);
        }
    
        // ... end of appendMessageToWorkspace function ...
        wrapper.appendChild(bodyNode);
        logContainer.appendChild(wrapper);
        
        // Contextual Smooth Scrolling
        if (role === 'user') {
          logContainer.parentElement.scrollTo({
            top: logContainer.parentElement.scrollHeight,
            behavior: 'smooth'
          });
        }
    
        return bodyNode; 
      }

  // 👇 PASTE THESE THREE MISSING FUNCTIONS HERE 👇

  function enableDragCapabilities(headerTrigger, elementTarget) {
    let activeDrag = false;
    let initialX, initialY, currentTransformX = 0, currentTransformY = 0;

    headerTrigger.querySelector('.gemiside-header').addEventListener('mousedown', (e) => {
      activeDrag = true;
      initialX = e.clientX - currentTransformX;
      initialY = e.clientY - currentTransformY;
    });

    document.addEventListener('mousemove', (e) => {
      if (!activeDrag) return;
      e.preventDefault();
      currentTransformX = e.clientX - initialX;
      currentTransformY = e.clientY - initialY;
      elementTarget.style.transform = `translate(${currentTransformX}px, ${currentTransformY}px)`;
    });

    document.addEventListener('mouseup', () => activeDrag = false);
  }

  function removeExistingActionChip() {
    if (activeActionChip) {
      activeActionChip.remove();
      activeActionChip = null;
    }
  }

  function clearActionChipOnOutsideClick(event) {
    if (!activeActionChip) return;

    const clickPath = event.composedPath();
    const clickedInsideChip = clickPath.some(node => 
      node === activeActionChip || (node.classList && node.classList.contains('gemiside-action-chip'))
    );

    if (!clickedInsideChip) {
      // REMOVE the setTimeout and call it directly for instant removal
      removeExistingActionChip();
    }
  }
  // --- CONTEXT ENGINE: Grabs page data to send to Gemini ---
  function getPageContext() {
    // 1. First, check if the user highlighted specific text
    let selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      return `[USER HIGHLIGHTED TEXT]: \n${selectedText}`;
    }
  
    // 2. If nothing is highlighted, grab the general page text (limit to 3000 chars to save tokens)
    let pageTitle = document.title;
    let bodyText = document.body.innerText.trim().substring(0, 3000); 
    
    return `[CURRENT PAGE: ${pageTitle}]\n\n[VISIBLE PAGE CONTEXT]:\n${bodyText}`;
  }
  // --- EXTENSION ICON CLICK LISTENER ---
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "open_gemiside_full_page") {
      // Grab the context (since nothing is highlighted, this grabs the whole page)
      const fullPageContext = getPageContext();
      
      // Open the window on the right side of the screen
      const startX = window.innerWidth - 450; 
      const startY = 50;
      
      instantiateWorkspaceWindow(startX, startY, fullPageContext, "");
    }
  });
})();