const esoTool = {
  history: [],
  historyIndex: -1,
  maxHistory: 50,

  init() {
    const input = document.getElementById('eso-input');

    // Example text on load
    const example = `|cFFFF00What We Offer:|r

|c00FF00Progressive Raiding & Teaching:|r Whether you're a seasoned veteran or new to trials, our experienced raiders are eager to teach, share strategies, and grow together. We run regular end-game content like veteran trials, arenas, and dungeons—focusing on fun, improvement, and epic loot!

|c00FF00Fully Equipped Guild Hall:|r Dive into @PatrickFoo's Hall of the Lunar Champion, our ultimate hub featuring:
- All crafting stations for seamless gear upgrades.
- Mundus stones for build optimization.
- Target dummies to hone your DPS, healing, and tanking skills.`;

    input.value = example;

    input.addEventListener('input', () => {
      this.updatePreview();
      this.updateCharCount();
      this.saveToHistory();
    });

    // Initial preview update
    this.updatePreview();
    this.updateCharCount();
    this.saveToHistory();

    // Initialize Pickr with better error handling
    this.initializeESOPickr();

    // Desktop-only safety net: if Pickr isn't available, clicking the picker
    // (or its wrapper) will open a fallback.
    const isMobileOrTablet = this.isMobileDevice();
    const containerBtn = document.getElementById('eso-native-emoji-btn');
    if (!isMobileOrTablet && containerBtn) {
      const triggerFallback = (e) => {
        if (!this.esoPickr) {
          e.preventDefault();
          e.stopPropagation();
          // Open fallback picker regardless of selection
          this.createESOFallbackPicker();
          const input = document.getElementById('eso-fallback-color-picker');
          if (input) input.click();
        }
      };
      containerBtn.addEventListener('click', triggerFallback);
      const wrap = containerBtn.closest('.color-picker-wrapper');
      if (wrap) wrap.addEventListener('click', triggerFallback);
    }

    // Robust: bind click for 🎨 emoji, retry until element exists
    const bindEmojiHandler = () => {
      const emojiBtn = document.getElementById('eso-native-emoji-btn');
      if (!emojiBtn) return false;
      const openColorPicker = (e) => {
        // Mobile/tablet: ensure native input exists and open
        if (this.isMobileDevice()) {
          this.setupNativeMobileColorInput();
          const native = document.getElementById('eso-native-color');
          if (native) {
            try {
              if (typeof native.showPicker === 'function') {
                native.showPicker();
                return;
              }
            } catch (_) {}
            native.click();
          }
          return;
        }
        // Desktop: prefer Pickr; fallback to native if not ready
        if (this.esoPickr && typeof this.esoPickr.show === 'function') {
          try {
            this.esoPickr.show();
            return;
          } catch (_) {}
        }
        this.createESOFallbackPicker();
        const fb = document.getElementById('eso-fallback-color-picker');
        if (fb) {
          try {
            if (typeof fb.showPicker === 'function') {
              fb.showPicker();
              return;
            }
          } catch (_) {}
          fb.click();
        }
      };
      emojiBtn.addEventListener('click', openColorPicker);
      return true;
    };
    if (!bindEmojiHandler()) {
      const retryId = setInterval(() => {
        if (bindEmojiHandler()) clearInterval(retryId);
      }, 200);
      // Also observe DOM in case it's injected later
      const mo = new MutationObserver(() => {
        if (bindEmojiHandler()) {
          mo.disconnect();
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Delegated handler as final safety: catch clicks on the emoji even if direct binding failed
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#eso-native-emoji-btn');
      if (!btn) return;
      // Reuse same logic
      if (this.isMobileDevice()) {
        this.setupNativeMobileColorInput();
        const native = document.getElementById('eso-native-color');
        if (native) {
          try {
            if (typeof native.showPicker === 'function') {
              native.showPicker();
              return;
            }
          } catch (_) {}
          native.click();
        }
        return;
      }
      if (this.esoPickr && typeof this.esoPickr.show === 'function') {
        try {
          this.esoPickr.show();
          return;
        } catch (_) {}
      }
      this.createESOFallbackPicker();
      const fb = document.getElementById('eso-fallback-color-picker');
      if (fb) {
        try {
          if (typeof fb.showPicker === 'function') {
            fb.showPicker();
            return;
          }
        } catch (_) {}
        fb.click();
      }
    });
  },

  // Position the Pickr panel adjacent to the emoji trigger and clamp within viewport
  positionPickrNearEmoji() {
    try {
      const emoji = document.getElementById('eso-native-emoji-btn');
      const appEl = document.querySelector('.pcr-app');
      if (!emoji || !appEl || appEl.style.display === 'none') return;
      const rect = emoji.getBoundingClientRect();
      const gap = 8;
      appEl.style.position = 'fixed';
      // Compute size; if zero, force a reflow by temporarily showing
      const panelW = appEl.offsetWidth || 320;
      const panelH = appEl.offsetHeight || 260;
      const desiredTop = rect.bottom + gap;
      let left = Math.max(8, Math.min(window.innerWidth - panelW - 8, rect.right - panelW));
      let top = desiredTop;
      if (desiredTop + panelH > window.innerHeight - 8) {
        top = Math.max(8, rect.top - panelH - gap);
      }
      appEl.style.left = `${left}px`;
      appEl.style.top = `${top}px`;
      appEl.style.zIndex = '99999';
    } catch (e) {
      console.warn('Failed to position Pickr:', e);
    }
  },

  // Universal opener wired from HTML onclick as a fail-safe
  openColorPickerUniversal(e) {
    console.log('[esoTool] emoji clicked -> openColorPickerUniversal');
    // Prefer mobile native when on small/touch devices
    if (this.isMobileDevice()) {
      console.log('[esoTool] using native mobile color input');
      this.setupNativeMobileColorInput();
      const native = document.getElementById('eso-native-color');
      if (native) {
        console.log('[esoTool] triggering native.showPicker/click');
        try {
          if (typeof native.showPicker === 'function') {
            native.showPicker();
            return;
          }
        } catch (_) {}
        native.click();
      }
      return;
    }
    // Desktop: Pickr if ready, else fallback
    if (this.esoPickr && typeof this.esoPickr.show === 'function') {
      console.log('[esoTool] opening Pickr');
      try {
        this.esoPickr.show();
        return;
      } catch (_) {}
    }
    console.log('[esoTool] Pickr not ready, creating fallback');
    this.createESOFallbackPicker();
    const fb = document.getElementById('eso-fallback-color-picker');
    if (fb) {
      console.log('[esoTool] triggering fallback.showPicker/click');
      try {
        if (typeof fb.showPicker === 'function') {
          fb.showPicker();
          return;
        }
      } catch (_) {}
      fb.click();
    }
  },

  initializeESOPickr() {
    // Desktop vs mobile/tablet
    const isMobileOrTablet = this.isMobileDevice();
    if (isMobileOrTablet) {
      console.log('Mobile/Tablet detected, using native <input type="color">');
      this.setupNativeMobileColorInput();
      return;
    }

    // Desktop/tablet - try to use Pickr
    console.log('Desktop device detected, attempting Pickr initialization');

    // Wait for DOM to be fully ready and scripts loaded
    const attemptPickrInit = () => {
      console.log('Attempting to initialize Pickr...');
      // Bind Pickr to a hidden anchor so it doesn't replace the emoji UI
      const container = document.getElementById('eso-pickr-anchor');
      if (!container) {
        console.error('Pickr container not found, retrying in 200ms...');
        setTimeout(attemptPickrInit, 200);
        return;
      }
      try {
        this.esoPickr = Pickr.create({
          el: container,
          theme: 'classic',
          default: '#ffffff',

          swatches: [
            '#FFFFFF',
            '#CCCCCC',
            '#999999',
            '#666666',
            '#333333',
            '#000000',
            '#FFFF00',
            '#FFD700',
            '#FF0000',
            '#FF4500',
            '#FF8000',
            '#FFA500',
            '#00FF00',
            '#32CD32',
            '#0080FF',
            '#0000FF',
            '#8A2BE2',
            '#FF00FF',
          ],

          components: {
            preview: true,
            opacity: false,
            hue: true,

            interaction: {
              hex: true,
              rgba: false,
              hsla: false,
              hsva: false,
              cmyk: false,
              input: true,
              clear: false,
              save: true,
            },
          },

          // Position relative to button
          position: 'bottom-middle',
          closeOnScroll: true,
          appClass: 'eso-pickr-app',
        });

        this.esoPickr.on('save', (color, instance) => {
          try {
            if (color) {
              const hexColor = color.toHEXA().toString().substring(1, 7);
              console.log('Pickr color selected:', hexColor);
              // Only apply if there is a selection; no alerts on desktop picker
              const sel = this.getSelectedText();
              if (sel.text && sel.text.length > 0) {
                this.applyColorToSelection(hexColor);
              }
              this.esoPickr.hide();
            }
          } catch (e) {
            console.error('Error handling Pickr save:', e);
          }
        });

        this.esoPickr.on('change', (color, instance) => {
          try {
            if (color && container) {
              const hexColor = color.toHEXA().toString();
              container.style.backgroundColor = hexColor;
            }
          } catch (e) {
            console.error('Error handling Pickr change:', e);
          }
        });

        this.esoPickr.on('show', () => {
          console.log('Pickr opened');
          // Position after a tick so DOM has measured dimensions
          setTimeout(() => this.positionPickrNearEmoji(), 0);
          // Keep it positioned on viewport changes
          this._pickrReposition = () => this.positionPickrNearEmoji();
          window.addEventListener('resize', this._pickrReposition);
          window.addEventListener('scroll', this._pickrReposition, true);
        });

        this.esoPickr.on('hide', () => {
          if (this._pickrReposition) {
            window.removeEventListener('resize', this._pickrReposition);
            window.removeEventListener('scroll', this._pickrReposition, true);
            this._pickrReposition = null;
          }
        });

        this.esoPickr.on('init', () => {
          console.log('Pickr initialized');
          // Showing is handled by universal handlers; nothing else needed here
        });
      } catch (err) {
        console.error('Failed to initialize Pickr, falling back to native input', err);
        this.setupNativeMobileColorInput();
      }
    };
    attemptPickrInit();
  },

  setupNativeMobileColorInput() {
    let native = document.getElementById('eso-native-color');
    const btn = document.getElementById('eso-native-emoji-btn');
    const emojiBtn = document.getElementById('eso-native-emoji-btn');
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // Create hidden native input if it's not present in the DOM
    if (!native) {
      native = document.createElement('input');
      native.type = 'color';
      native.id = 'eso-native-color';
      native.value = '#ffffff';
      // Default hidden placement (non-iOS)
      native.style.position = 'fixed';
      native.style.top = '0';
      native.style.left = '0';
      native.style.width = '1px';
      native.style.height = '1px';
      native.style.opacity = '0';
      native.style.pointerEvents = 'auto';
      document.body.appendChild(native);
    }
    // Ensure it's enabled/visible when CSS shows it
    native.disabled = false;

    // Apply selected color only if there is a text selection
    const onChange = (e) => {
      const value = e.target.value || '#FFFFFF';
      const hex = value.replace('#', '').toUpperCase();
      if (!this.requireSelectionOrAlert()) return;
      this.applyColorToSelection(hex);
      const valueEl = document.getElementById('native-color-value');
      if (valueEl) valueEl.textContent = value.toUpperCase();
    };
    // Avoid duplicate listeners if re-initialized
    native.removeEventListener('change', onChange);
    native.addEventListener('change', onChange);

    if (emojiBtn) {
      // iOS: Overlay the input over the emoji so a real tap opens the picker
      if (isIOS) {
        // Place input on top of the emoji button
        emojiBtn.style.position = 'relative';
        native.style.position = 'absolute';
        native.style.top = '0';
        native.style.left = '0';
        native.style.width = '100%';
        native.style.height = '100%';
        native.style.opacity = '0.01'; // minimally visible to satisfy iOS heuristics
        native.style.zIndex = '10';
        native.style.pointerEvents = 'auto';
        native.style.border = 'none';
        native.style.background = 'transparent';
        native.style.padding = '0';
        native.style.margin = '0';
        // Move into the emoji button
        if (native.parentElement !== emojiBtn) {
          emojiBtn.appendChild(native);
        }
      } else {
        // Non-iOS: programmatic open is fine
        const openNativePicker = (e) => {
          if (e) {
            e.stopPropagation(); /* no preventDefault to keep browsers happy */
          }
          try {
            if (typeof native.showPicker === 'function') {
              native.showPicker();
              return;
            }
          } catch (_) {}
          native.click();
        };
        emojiBtn.removeEventListener('click', openNativePicker);
        emojiBtn.addEventListener('click', openNativePicker);
        emojiBtn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') openNativePicker(e);
        });
      }
      // Initialize appearance (no background styling on emoji button)
    }
  },

  isMobileDevice() {
    // Check for mobile devices using multiple methods
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent,
    );

    // Check for touch capability and small screen
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;

    // Consider it mobile if it matches mobile user agent OR (has touch AND small screen)
    return isMobileUA || (hasTouch && isSmallScreen);
  },

  createESOFallbackPicker() {
    const container = document.getElementById('eso-native-emoji-btn');
    if (!container) return;

    // Create a hidden input outside the button for accessibility
    let colorInput = document.getElementById('eso-fallback-color-picker');
    if (!colorInput) {
      colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.id = 'eso-fallback-color-picker';
      colorInput.value = '#ffffff';
      // Keep it in the viewport but invisible for iOS/Safari permissions
      colorInput.style.position = 'fixed';
      colorInput.style.top = '0';
      colorInput.style.left = '0';
      colorInput.style.width = '1px';
      colorInput.style.height = '1px';
      colorInput.style.opacity = '0';
      colorInput.style.pointerEvents = 'auto';
      document.body.appendChild(colorInput);
    }

    colorInput.addEventListener('change', (e) => {
      const hexColor = e.target.value.replace('#', '').toUpperCase();
      this.applyColorToSelection(hexColor);
    });

    // Helper to open the native color picker, cross-browser
    const openNativePicker = (e) => {
      if (e) {
        /* avoid preventDefault to satisfy some mobile browsers */ e.stopPropagation();
      }
      try {
        if (typeof colorInput.showPicker === 'function') {
          colorInput.showPicker();
          return;
        }
      } catch (_) {}
      // Move input temporarily into the wrapper to satisfy iOS
      const originalParent = colorInput.parentElement;
      const wrapper = container.closest('.color-picker-wrapper') || container.parentElement;
      if (wrapper) wrapper.appendChild(colorInput);
      colorInput.click();
      // Return to original parent shortly after
      setTimeout(() => {
        if (originalParent && colorInput.parentElement !== originalParent) {
          originalParent.appendChild(colorInput);
        }
      }, 0);
    };

    // Only wire native fallback triggers on true mobile devices
    if (this.isMobileDevice()) {
      // Trigger input when the button is pressed
      // Accessibility
      container.setAttribute('role', 'button');
      container.setAttribute('tabindex', '0');
      container.addEventListener('click', openNativePicker);
      container.addEventListener('touchstart', openNativePicker, { passive: true });
      container.addEventListener('touchend', openNativePicker, { passive: true });
      container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') openNativePicker(e);
      });

      // Also make the whole wrapper area trigger the picker on mobile
      const wrapper = container.closest('.color-picker-wrapper');
      if (wrapper) {
        wrapper.style.cursor = 'pointer';
        const forward = (e) => {
          if (e.target !== container) openNativePicker(e);
        };
        wrapper.addEventListener('click', forward);
        wrapper.addEventListener('touchstart', forward, { passive: true });
        wrapper.addEventListener('touchend', forward, { passive: true });
      }
    }

    console.log('Fallback color picker created');
  },

  updateCharCount() {
    const input = document.getElementById('eso-input');
    const charCount = document.getElementById('char-count');
    charCount.textContent = input.value.length;
  },

  async copyToClipboard() {
    const input = document.getElementById('eso-input');
    const textToCopy = input.value;
    const srStatus = document.getElementById('sr-status');

    try {
      await navigator.clipboard.writeText(textToCopy);

      // Visual feedback - temporarily change button text
      const button = event.target;
      const originalText = button.textContent;
      button.textContent = '✓ Copied!';
      button.style.background = '#4CAF50';
      if (srStatus) srStatus.textContent = 'Copied to clipboard';

      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '#444';
        if (srStatus) srStatus.textContent = '';
      }, 1500);
    } catch (err) {
      // Fallback for older browsers
      input.select();
      input.setSelectionRange(0, 99999); // For mobile devices
      document.execCommand('copy');

      // Visual feedback for fallback
      const button = event.target;
      const originalText = button.textContent;
      button.textContent = '✓ Copied!';
      button.style.background = '#4CAF50';
      if (srStatus) srStatus.textContent = 'Copied to clipboard';

      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '#444';
        if (srStatus) srStatus.textContent = '';
      }, 1500);
    }
  },

  saveToHistory() {
    const input = document.getElementById('eso-input');
    const currentValue = input.value;

    // Don't save if it's the same as the last entry
    if (this.history.length > 0 && this.history[this.historyIndex] === currentValue) {
      return;
    }

    // Remove any history after current index
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Add new entry
    this.history.push(currentValue);

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }

    this.updateHistoryButtons();
  },

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const input = document.getElementById('eso-input');
      input.value = this.history[this.historyIndex];
      this.updatePreview();
      this.updateHistoryButtons();
    }
  },

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const input = document.getElementById('eso-input');
      input.value = this.history[this.historyIndex];
      this.updatePreview();
      this.updateHistoryButtons();
    }
  },

  updateHistoryButtons() {
    document.getElementById('undo-btn').disabled = this.historyIndex <= 0;
    document.getElementById('redo-btn').disabled = this.historyIndex >= this.history.length - 1;
  },

  getSelectedText() {
    const input = document.getElementById('eso-input');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    return {
      text: input.value.substring(start, end),
      start: start,
      end: end,
    };
  },

  // Ensure there is a selection before proceeding; mirror swatch behavior
  requireSelectionOrAlert() {
    const sel = this.getSelectedText();
    if (!sel.text || sel.text.length === 0) {
      alert('Please select some text first!');
      return false;
    }
    return true;
  },

  applyColorToSelection(colorHex) {
    const input = document.getElementById('eso-input');
    let selection = this.getSelectedText();

    if (selection.text.length === 0) {
      alert('Please select some text first!');
      return;
    }

    // Clean up the selection - remove leading/trailing whitespace and adjust positions
    const cleanedSelection = this.cleanAndAdjustSelection(input.value, selection);
    selection = cleanedSelection;

    const beforeText = input.value.substring(0, selection.start);
    const afterText = input.value.substring(selection.end);
    let selectedText = selection.text;
    let newColoredText;

    // Check if the selected text contains existing color formatting
    const colorFormatRegex = /^\|c[0-9A-Fa-f]{6}(.*?)\|r$/;
    const match = selectedText.match(colorFormatRegex);

    if (match) {
      // Selected text is already color formatted - replace the color but keep the content
      const existingContent = match[1];
      newColoredText = `|c${colorHex}${existingContent}|r`;
    } else {
      // Check if selection partially overlaps with color formatting or needs expansion
      const expandedSelection = this.smartExpandSelection(
        input.value,
        selection.start,
        selection.end,
      );

      if (expandedSelection.found) {
        // Use the expanded/corrected selection
        const expandedBefore = input.value.substring(0, expandedSelection.start);
        const expandedAfter = input.value.substring(expandedSelection.end);
        const expandedText = input.value.substring(expandedSelection.start, expandedSelection.end);

        // Extract content from the expanded selection
        const contentMatch = expandedText.match(/^\|c[0-9A-Fa-f]{6}(.*?)\|r$/);
        const content = contentMatch ? contentMatch[1] : expandedText;

        newColoredText = `|c${colorHex}${content}|r`;

        // Update input with the expanded selection
        input.value = expandedBefore + newColoredText + expandedAfter;

        // Keep the new formatted text selected
        const newStart = expandedSelection.start;
        const newEnd = newStart + newColoredText.length;
        input.setSelectionRange(newStart, newEnd);
        input.focus();

        this.updatePreview();
        this.saveToHistory();
        return;
      } else {
        // No existing formatting - apply new color normally
        newColoredText = `|c${colorHex}${selectedText}|r`;
      }
    }

    input.value = beforeText + newColoredText + afterText;

    // Keep the new formatted text selected
    const newStart = selection.start;
    const newEnd = newStart + newColoredText.length;
    input.setSelectionRange(newStart, newEnd);
    input.focus();

    this.updatePreview();
    this.saveToHistory();
  },

  cleanAndAdjustSelection(fullText, selection) {
    let { start, end } = selection;

    // Trim whitespace from the beginning
    while (start < end && /\s/.test(fullText[start])) {
      start++;
    }

    // Trim whitespace from the end
    while (end > start && /\s/.test(fullText[end - 1])) {
      end--;
    }

    return {
      start: start,
      end: end,
      text: fullText.substring(start, end),
    };
  },

  smartExpandSelection(text, start, end) {
    // First, try the original expansion logic
    const basicExpansion = this.expandSelectionToIncludeColorTags(text, start, end);
    if (basicExpansion.found) {
      return basicExpansion;
    }

    // Enhanced smart detection for partial selections
    const selectedText = text.substring(start, end);

    // Check if selection contains partial color tags and try to fix them
    const hasPartialStart =
      selectedText.includes('|c') && !selectedText.match(/^\|c[0-9A-Fa-f]{6}/);
    const hasPartialEnd = selectedText.includes('|r') && !selectedText.endsWith('|r');
    const hasPartialTags =
      hasPartialStart ||
      hasPartialEnd ||
      selectedText.match(/\|c[0-9A-Fa-f]{0,5}$/) ||
      selectedText.match(/^\|[^cr]/);

    if (hasPartialTags) {
      // Try to find the nearest complete color formatting
      const nearestComplete = this.findNearestCompleteColorFormatting(text, start, end);
      if (nearestComplete.found) {
        return nearestComplete;
      }
    }

    // NEW: Enhanced detection for partial text within color formatting
    const partialColorBlock = this.findEnclosingColorBlock(text, start, end);
    if (partialColorBlock.found) {
      return partialColorBlock;
    }

    // Check if we're selecting content inside color tags (without the tags themselves)
    const surroundingContext = text.substring(
      Math.max(0, start - 10),
      Math.min(text.length, end + 10),
    );
    const beforeContext = text.substring(Math.max(0, start - 10), start);
    const afterContext = text.substring(end, Math.min(text.length, end + 10));

    // Look for color tags in the surrounding context
    const colorStartMatch = beforeContext.match(/\|c[0-9A-Fa-f]{6}([^|]*)$/);
    const colorEndMatch = afterContext.match(/^([^|]*)\|r/);

    if (colorStartMatch && colorEndMatch) {
      // We're selecting content inside color tags
      const newStart = start - colorStartMatch[0].length + colorStartMatch[1].length;
      const newEnd = end + colorEndMatch[1].length + 2; // +2 for |r

      return {
        found: true,
        start: newStart,
        end: newEnd,
      };
    }

    return { found: false };
  },

  findEnclosingColorBlock(text, start, end) {
    // Look for color formatting that encloses or overlaps with the selection
    // This handles cases like selecting "Progressiv" from "|c00FF00Progressive Raiding|r"

    // Expand search area to look for complete color blocks
    const searchStart = Math.max(0, start - 100); // Look back up to 100 chars
    const searchEnd = Math.min(text.length, end + 100); // Look forward up to 100 chars
    const searchArea = text.substring(searchStart, searchEnd);

    // Find all complete color formatting blocks in the search area
    const colorBlockRegex = /\|c[0-9A-Fa-f]{6}[^|]*?\|r/g;
    const colorBlocks = [...searchArea.matchAll(colorBlockRegex)];

    for (const block of colorBlocks) {
      const blockStart = searchStart + block.index;
      const blockEnd = blockStart + block[0].length;

      // Check if our selection overlaps with this color block
      const hasOverlap = start < blockEnd && end > blockStart;

      // Check if our selection is partially inside this block
      const selectionInsideBlock =
        (start >= blockStart && start < blockEnd) ||
        (end > blockStart && end <= blockEnd) ||
        (start < blockStart && end > blockEnd);

      if (hasOverlap || selectionInsideBlock) {
        console.log(`Found enclosing color block: "${block[0]}" at ${blockStart}-${blockEnd}`);
        return {
          found: true,
          start: blockStart,
          end: blockEnd,
        };
      }
    }

    // If no complete blocks found, try to find a block that starts or ends near our selection
    return this.findNearbyPartialColorBlock(text, start, end);
  },

  findNearbyPartialColorBlock(text, start, end) {
    // Look for color tags that might be split by the selection
    // This handles cases where the selection cuts through color tags

    const searchStart = Math.max(0, start - 50);
    const searchEnd = Math.min(text.length, end + 50);

    // Look backwards for a color start tag
    let colorStartPos = -1;
    let colorStartMatch = null;
    for (let i = start; i >= searchStart; i--) {
      const checkText = text.substring(i, i + 8);
      if (/^\|c[0-9A-Fa-f]{6}$/.test(checkText)) {
        colorStartPos = i;
        colorStartMatch = checkText;
        break;
      }
    }

    // Look forwards for a color end tag
    let colorEndPos = -1;
    for (let i = end; i <= searchEnd - 2; i++) {
      const checkText = text.substring(i, i + 2);
      if (checkText === '|r') {
        colorEndPos = i + 2;
        break;
      }
    }

    // If we found both start and end tags, expand to include them
    if (colorStartPos !== -1 && colorEndPos !== -1) {
      console.log(`Found partial color block from ${colorStartPos} to ${colorEndPos}`);
      return {
        found: true,
        start: colorStartPos,
        end: colorEndPos,
      };
    }

    return { found: false };
  },

  findNearestCompleteColorFormatting(text, start, end) {
    // Look for the nearest complete |c......|r pattern that overlaps with our selection
    const searchStart = Math.max(0, start - 20);
    const searchEnd = Math.min(text.length, end + 20);
    const searchArea = text.substring(searchStart, searchEnd);

    // Find all complete color formatting in the search area
    const colorMatches = [...searchArea.matchAll(/\|c[0-9A-Fa-f]{6}.*?\|r/g)];

    for (const match of colorMatches) {
      const matchStart = searchStart + match.index;
      const matchEnd = matchStart + match[0].length;

      // Check if this color formatting overlaps with our selection
      if (matchStart <= end && matchEnd >= start) {
        return {
          found: true,
          start: matchStart,
          end: matchEnd,
        };
      }
    }

    return { found: false };
  },

  expandSelectionToIncludeColorTags(text, start, end) {
    // Look backwards to find |c tag
    let newStart = start;
    let foundStartTag = false;

    // Search backwards for |c tag
    for (let i = start - 1; i >= 0; i--) {
      if (text.substring(i, i + 2) === '|c' && i + 8 <= text.length) {
        // Found potential color start tag, check if it's valid
        const colorCode = text.substring(i, i + 8);
        if (/^\|c[0-9A-Fa-f]{6}$/.test(colorCode)) {
          newStart = i;
          foundStartTag = true;
          break;
        }
      }
      // Stop if we hit another |r or go too far
      if (text.substring(i, i + 2) === '|r' || start - i > 50) {
        break;
      }
    }

    // Look forwards to find |r tag
    let newEnd = end;
    let foundEndTag = false;

    if (foundStartTag) {
      for (let i = end; i < text.length - 1; i++) {
        if (text.substring(i, i + 2) === '|r') {
          newEnd = i + 2;
          foundEndTag = true;
          break;
        }
        // Stop if we hit another |c or go too far
        if (text.substring(i, i + 2) === '|c' || i - end > 50) {
          break;
        }
      }
    }

    return {
      found: foundStartTag && foundEndTag,
      start: newStart,
      end: newEnd,
    };
  },

  applyQuickColor(colorHex) {
    this.applyColorToSelection(colorHex);
    // Update Pickr to show the selected color
    try {
      if (this.esoPickr && this.esoPickr.setColor) {
        this.esoPickr.setColor('#' + colorHex);
      } else {
        // Update fallback picker if it exists
        const fallbackPicker = document.getElementById('eso-fallback-color-picker');
        const container = document.getElementById('eso-native-emoji-btn');
        if (fallbackPicker && container) {
          fallbackPicker.value = '#' + colorHex;
        }
      }
    } catch (e) {
      console.warn('Could not update color picker:', e);
    }
  },

  removeFormatFromSelection() {
    const input = document.getElementById('eso-input');
    const selection = this.getSelectedText();

    if (selection.text.length === 0) {
      alert('Please select some text first!');
      return;
    }

    // Remove color formatting from selected text
    const cleanText = selection.text.replace(/\|c[0-9A-Fa-f]{6}(.*?)\|r/g, '$1');

    const beforeText = input.value.substring(0, selection.start);
    const afterText = input.value.substring(selection.end);

    input.value = beforeText + cleanText + afterText;

    const newCursorPos = selection.start + cleanText.length;
    input.setSelectionRange(newCursorPos, newCursorPos);
    input.focus();

    this.updatePreview();
    this.saveToHistory();
  },

  clearFormatting() {
    const input = document.getElementById('eso-input');
    const cleanText = input.value.replace(/\|c[0-9A-Fa-f]{6}(.*?)\|r/g, '$1');
    input.value = cleanText;
    this.updatePreview();
    this.saveToHistory();
  },

  updatePreview() {
    const input = document.getElementById('eso-input');
    const preview = document.getElementById('eso-preview');

    let text = input.value;

    // If empty, show placeholder
    if (!text.trim()) {
      preview.innerHTML =
        '<span style="color: #888; font-style: italic;">Your formatted text will appear here...</span>';
      return;
    }

    // First escape all HTML to prevent XSS
    text = this.escapeHtml(text);

    // Then convert ESO/WoW color codes to HTML spans
    text = text.replace(/\|c([0-9A-Fa-f]{6})(.*?)\|r/g, (match, color, content) => {
      return `<span style="color: #${color}">${content}</span>`;
    });

    // Convert newlines to line breaks
    text = text.replace(/\n/g, '<br>');

    preview.innerHTML = text;
  },

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
};

// Initialize the tool when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    esoTool.init();
  });
} else {
  // DOM already loaded
  esoTool.init();
}
