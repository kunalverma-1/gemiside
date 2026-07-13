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
  
      // Parse and bind parent execution context elements if applicable
      const rootBlock = anchorElement.closest('message-content') || anchorElement.parentElement;
      const secondaryCodeBlocks = Array.from(rootBlock.querySelectorAll(DOM_TARGETS.codeBlocks.join(',')))
        .map(el => el.textContent.trim())
        .join('\n\n');
  
      renderActionChip(posX, posY, rawText, secondaryCodeBlocks);
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
          <button class="gemiside-icon-btn" title="New Thread">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button class="gemiside-icon-btn" title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
          <button class="gemiside-icon-btn" title="Minimize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M5 12h14"/></svg>
          </button>
          <button class="gemiside-icon-btn gemiside-close-btn" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
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
        <input type="text" class="gemiside-input-field" placeholder="Ask GemiSide">
      </div>
    `;
  
      // 1. APPEND ELEMENTS FIRST
      shadow.appendChild(container);
      document.body.appendChild(host);
  
      // 2. BIND LISTENERS AFTER APPENDING
      shadow.querySelector('.gemiside-close-btn').addEventListener('click', () => host.remove());
      enableDragCapabilities(container, host);
  
      // 3. BIND CHAT INPUT LOGIC
      const inputField = shadow.querySelector('.gemiside-input-field');
      const messageLog = shadow.querySelector('.gemiside-message-log');
  
      inputField.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter' && inputField.value.trim().length > 0) {
          const userQuery = inputField.value.trim();
          inputField.value = ''; 
  
          // --> NEW: Annihilate the empty state the moment they hit Enter
          const emptyState = shadow.querySelector('.gemiside-empty-state');
          if (emptyState) emptyState.remove();
  
          appendMessageToWorkspace(messageLog, 'User', userQuery);
          const indicatorNode = appendMessageToWorkspace(messageLog, 'GemiSide', 'Connecting to session data stream...');
  
          try {
            setTimeout(() => {
              indicatorNode.textContent = "Context bound. Ready to connect network parsing layers.";
            }, 800);
          } catch (error) {
            indicatorNode.textContent = "Error routing request loop.";
          }
        }
      });
    }
  
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
        setTimeout(removeExistingActionChip, 10);
      }
    }
  
    function appendMessageToWorkspace(logContainer, role, text) {
      const wrapper = document.createElement('div');
      wrapper.style.marginBottom = '12px';
      wrapper.style.borderLeft = role === 'User' ? '2px solid rgba(255,255,255,0.2)' : '2px solid #4285f4';
      wrapper.style.paddingLeft = '8px';
      
      const metaNode = document.createElement('strong');
      metaNode.style.display = 'block';
      metaNode.style.fontSize = '11px';
      metaNode.style.color = role === 'User' ? '#8e8e93' : '#8ab4f8';
      metaNode.textContent = role;
  
      const bodyNode = document.createElement('span');
      bodyNode.textContent = text;
  
      wrapper.appendChild(metaNode);
      wrapper.appendChild(bodyNode);
      logContainer.appendChild(wrapper);
      
      logContainer.parentElement.scrollTop = logContainer.parentElement.scrollHeight;
  
      return bodyNode; 
    }
  })();