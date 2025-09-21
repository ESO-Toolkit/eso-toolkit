import { Box, Typography, Container, useTheme, alpha } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useState, useEffect, useRef, useCallback, JSX } from 'react';

import '../styles/pickr-theme.css';
import '../styles/pickr-radius.css';
import '../styles/pickr-background.css';
import '../styles/text-editor-page-background.css';
import '../styles/texteditor-theme-bridge.css';
import { usePageBackground } from '../hooks/usePageBackground';
// The background image is located in public/text-editor/text-editor-bg-light.jpg

// Types
declare global {
  interface Window {
    Pickr: unknown;
  }
}

interface PickrColor {
  toHEXA: () => { toString: () => string };
}

interface PickrStatic {
  create: (options: PickrOptions) => PickrInstance;
}

interface PickrInstance {
  on: (event: string, callback: (color: PickrColor) => void) => PickrInstance;
  show: () => PickrInstance;
  hide: () => PickrInstance;
  destroy: () => void;
}

interface PickrOptions {
  el: HTMLElement;
  theme: 'classic' | 'monolith';
  default: string;
  swatches: string[];
  components: {
    preview: boolean;
    opacity: boolean;
    hue: boolean;
    interaction: {
      hex: boolean;
      rgba: boolean;
      hsla: boolean;
      hsva: boolean;
      cmyk: boolean;
      input: boolean;
      clear: boolean;
      save: boolean;
    };
  };
  position: string;
  closeOnScroll: boolean;
  appClass: string;
}

// Styled Components
const TextEditorContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: 'transparent',
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  position: 'relative',

  // Remove padding on mobile for full-width
  [theme.breakpoints.down('sm')]: {
    paddingTop: 0,
    paddingBottom: 0,
  },
}));

const EditorTool = styled(Box)(({ theme }) => ({
  maxWidth: 900,
  margin: '2rem auto 2rem auto',
  background: 'var(--panel)',
  padding: '24px',
  borderRadius: '14px',
  border: '1px solid var(--border)',
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: 'var(--text)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 8px 30px rgba(0, 0, 0, 0.6)'
      : '0 8px 30px rgba(0, 0, 0, 0.15)',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  position: 'relative',
  zIndex: 1,

  // Mobile styles - full width, no margins/borders
  [theme.breakpoints.down('sm')]: {
    display: 'grid',
    gridTemplateRows: 'auto auto',
    gap: '16px',
    margin: '0', // Remove all margins
    padding: '16px', // Reduce padding
    borderRadius: '0', // Remove border radius for full-width
    border: 'none', // Remove border
    backdropFilter: 'blur(8px) saturate(160%)',
    background: 'var(--panel)',
    minHeight: '100vh', // Full height on mobile
    maxWidth: '100%', // Full width
  },
}));

// Desktop: Simple horizontal toolbar (from previous commit)
const Toolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: '12px',
  marginBottom: '20px',
  padding: '16px',
  background: 'var(--panel2)',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  alignItems: 'center',
  transition: 'all 0.15s ease-in-out',
  boxShadow:
    theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
  overflowX: 'auto',
  backdropFilter: 'blur(8px) saturate(150%)',
  WebkitBackdropFilter: 'blur(8px) saturate(150%)',
  // Mobile styles
  [theme.breakpoints.down('sm')]: {
    display: 'none', // Hide on mobile, use grid containers instead
  },
}));

const ToolbarButton = styled('button')({
  background: 'var(--panel)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '10px 16px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  transition: 'all 0.15s ease-in-out',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: 'var(--bg)',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  '&:active': {
    background: 'var(--accent2)',
    borderColor: 'var(--accent2)',
    color: 'var(--bg)',
    transform: 'translateY(0px)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  '&:disabled': {
    background: 'transparent',
    color: 'var(--muted)',
    borderColor: 'var(--border)',
    opacity: 1,
    cursor: 'not-allowed',
  },
  // Mobile styles
  '@media (max-width: 768px)': {
    padding: '10px 14px',
    fontSize: '14px',
    order: 3,
    flex: '1 1 calc(50% - 12px)',
    maxWidth: 'calc(50% - 12px)',
    minHeight: '44px',
  },
});

const UndoRedoGroup = styled(Box)({
  display: 'flex',
  gap: '8px',
  // Mobile styles
  '@media (max-width: 768px)': {
    gap: '6px',
    order: 1,
    justifyContent: 'center',
    width: '100%',
  },
});

// Mobile-specific components
const FormatContainer = styled(Box)({
  display: 'none', // Hidden on desktop
  flexDirection: 'column',
  gap: '8px',
  marginBottom: '20px',
  // Mobile styles - position in grid
  '@media (max-width: 768px)': {
    display: 'flex',
    gridRow: 2,
  },
});

const FormatRow = styled(Box)({
  display: 'flex',
  gap: '8px',
  padding: '12px',
  background: 'var(--panel2)',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  alignItems: 'center',
  flexWrap: 'nowrap',
});

const ColorSection = styled(Box)({
  display: 'none', // Hidden on desktop
  flexDirection: 'column',
  alignItems: 'center',
  gap: '40px',
  marginBottom: '4px',
  // Mobile styles - position in grid (move to top)
  '@media (max-width: 768px)': {
    display: 'flex',
    gridRow: 1,
    marginBottom: '2px',
  },
});

// Desktop color components (from previous commit)
const PresetColors = styled(Box)({
  display: 'flex',
  gap: '4px',
  marginLeft: '8px',
  // Mobile styles
  '@media (max-width: 768px)': {
    gap: '8px',
    width: '100%',
    justifyContent: 'space-between',
    marginLeft: 0,
  },
});

const PresetColor = styled('button')({
  width: '24px',
  height: '24px',
  borderRadius: '3px',
  cursor: 'pointer',
  transition: 'transform 0.1s',
  // Mobile styles
  '@media (max-width: 768px)': {
    width: 'calc(16.666% - 7px)',
    height: '40px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    '&:hover': {
      transform: 'scale(1.05)',
    },
  },
  '&:hover': {
    transform: 'scale(1.1)',
  },
});

const ColorPickerWrapper = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginLeft: 'auto',
  // Mobile styles
  '@media (max-width: 768px)': {
    justifyContent: 'center',
    marginLeft: 0,
  },
});

const EmojiButton = styled('button')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '52px',
  height: '52px',
  padding: '0',
  border: 'none',
  borderRadius: '6px',
  background: 'transparent !important',
  backgroundColor: 'transparent !important',
  boxShadow: 'none',
  cursor: 'pointer',
  fontSize: '46px !important',
  lineHeight: '1',
  transition: 'transform 0.1s',
  '&:hover': {
    transform: 'scale(1.05)',
  },
});

const TextInput = styled('textarea')(({ theme }) => ({
  width: '100%',
  height: '280px',
  padding: '20px',
  background: 'var(--panel)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: '12px 12px 0 0',
  fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
  resize: 'vertical',
  fontSize: '15px',
  fontWeight: 400,
  lineHeight: '1.5',
  boxSizing: 'border-box',
  transition: 'all 0.15s ease-in-out',
  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
  backdropFilter: 'blur(6px) saturate(140%)',
  WebkitBackdropFilter: 'blur(6px) saturate(140%)',
  '&:focus': {
    outline: 'none',
    borderColor: 'var(--accent)',
    boxShadow: `inset 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
}));

const StatusBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  background: 'var(--panel2)',
  border: '1px solid var(--border)',
  borderTop: 'none',
  borderBottomLeftRadius: '12px',
  borderBottomRightRadius: '12px',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.15s ease-in-out',
  backdropFilter: 'blur(8px) saturate(150%)',
  WebkitBackdropFilter: 'blur(8px) saturate(150%)',
}));

const CharCounter = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const CopyButton = styled('button')(({ theme }) => ({
  background: theme.palette.primary.main,
  color: theme.palette.background.default,
  border: `1px solid ${theme.palette.primary.main}`,
  borderRadius: '8px',
  padding: '10px 20px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.15s ease-in-out',
  marginLeft: 'auto',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    background: theme.palette.primary.dark,
    borderColor: theme.palette.primary.dark,
    color: theme.palette.background.default,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  '&:active': {
    background: theme.palette.primary.main,
    transform: 'translateY(0px)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
}));

const PreviewArea = styled(Box)(({ theme }) => ({
  marginTop: '20px',
  padding: '20px',
  borderRadius: '12px',
  minHeight: '120px',
  background: 'transparent !important',
  backgroundColor: 'transparent !important',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.2)'
      : '1px solid rgba(0, 0, 0, 0.1)',
  fontSize: '1rem',
  lineHeight: '1.6',
  position: 'relative',
  overflow: 'hidden',
  zIndex: 1,
  transition: 'all 0.15s ease-in-out',
  color: '#ffffff',

  // Background image with mobile optimizations
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url(${theme.palette.mode === 'dark' ? '/eso-log-aggregator/text-editor/text-editor-bg-dark.jpg' : '/eso-log-aggregator/text-editor/text-editor-bg-light.jpg'})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center', // Back to original center positioning
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed', // Back to original fixed
    opacity: 0.3,
    zIndex: -1,
    pointerEvents: 'none',
  },

  // Semi-transparent overlay for text readability
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
    zIndex: -1,
    pointerEvents: 'none',
  },

  '& span': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    position: 'relative',
    zIndex: 2,
  },

  '& *': {
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
  },

  '& span[style*="color: #888"], & span[style*="italic"]': {
    color: 'rgba(255, 255, 255, 0.7) !important',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9) !important',
  },

  '& span[style*="color: #"]': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
    fontWeight: '500',
  },

  // Mobile specific adjustments
  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
    borderRadius: '8px',
    margin: '16px 0',

    // Adjust background position for mobile
    '&::before': {
      backgroundPosition: 'center', // Keep center positioning
      backgroundAttachment: 'scroll',
    },

    // RESTORE ORIGINAL OVERLAY on mobile too
    '&::after': {
      background: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)',
    },
  },
}));

// Utility Functions
const presetColors = ['#FFFF00', '#00FF00', '#FF0000', '#0080FF', '#FF8000', '#FF00FF'];

// Main Component
export const TextEditor: React.FC = () => {
  const theme = useTheme();
  // Apply page-specific background and theme management
  usePageBackground('text-editor-page', theme.palette.mode === 'dark');
  const [text, setText] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [charCount, setCharCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [savedSelection, setSavedSelection] = useState<{
    start: number;
    end: number;
    text: string;
  } | null>(null);

  // Simple fix for light mode background loading
  useEffect(() => {
    // Simple fix for light mode background loading
    if (theme.palette.mode === 'light') {
      const body = document.body;
      // Force light mode background image
      setTimeout(() => {
        body.style.backgroundImage =
          'url("/eso-log-aggregator/text-editor/text-editor-bg-light.jpg")';
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundRepeat = 'no-repeat';
        body.style.backgroundAttachment = 'fixed';
        // eslint-disable-next-line no-console
        console.log('Force applied light mode background');
      }, 100); // Small delay to ensure it applies
    }
  }, [theme.palette.mode]);

  // Add this useEffect AFTER your existing theme/background useEffects
  useEffect(() => {
    const root = document.documentElement;

    // Convert hex to rgba with transparency for background paper
    const hexToRgba = (hex: string, alpha: number): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Apply transparency to background paper based on theme mode
    const backgroundPaper =
      theme.palette.mode === 'dark'
        ? hexToRgba(theme.palette.background.paper, 0.709804) // #0f172ab5
        : hexToRgba(theme.palette.background.paper, 0.741176); // #ffffffbd

    // Map Material UI theme values to CSS variables
    root.style.setProperty('--mui-palette-background-default', theme.palette.background.default);
    root.style.setProperty('--mui-palette-background-paper', backgroundPaper);
    root.style.setProperty('--mui-palette-text-primary', theme.palette.text.primary);
    root.style.setProperty('--mui-palette-text-secondary', theme.palette.text.secondary);
    root.style.setProperty('--mui-palette-primary-main', theme.palette.primary.main);
    root.style.setProperty('--mui-palette-primary-dark', theme.palette.primary.dark);
    root.style.setProperty('--mui-palette-divider', theme.palette.divider);
  }, [theme]);

  // Debug useEffect for background loading issue
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('=== DEBUG INFO ===');
    // eslint-disable-next-line no-console
    console.log('Theme mode:', theme.palette.mode);
    // eslint-disable-next-line no-console
    console.log('Body classes:', document.body.className);
    // eslint-disable-next-line no-console
    console.log('HTML classes:', document.documentElement.className);
    // eslint-disable-next-line no-console
    console.log(
      'Background image path:',
      '/eso-log-aggregator/text-editor/text-editor-bg-light.jpg',
    );

    // Check computed styles
    const bodyStyles = window.getComputedStyle(document.body);
    // eslint-disable-next-line no-console
    console.log('Body background-image:', bodyStyles.backgroundImage);
    // eslint-disable-next-line no-console
    console.log('Body background-size:', bodyStyles.backgroundSize);

    // Check if CSS files are loaded
    const stylesheets = Array.from(document.styleSheets);
    // eslint-disable-next-line no-console
    console.log('Loaded stylesheets:', stylesheets.length);

    // Force inspect the usePageBackground hook
    // eslint-disable-next-line no-console
    console.log(
      'usePageBackground should have been called with:',
      'text-editor-page',
      theme.palette.mode === 'dark',
    );
  }, [theme.palette.mode]);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const pickrRef = useRef<PickrInstance | null>(null);
  const pickrAnchorRef = useRef<HTMLDivElement>(null);
  const [isPickrInitializing, setIsPickrInitializing] = useState(false);

  const maxHistory = 50;

  // Update character count whenever text changes
  useEffect(() => {
    setCharCount(text.length);
  }, [text]);

  const getSelectedText = useCallback((): { text: string; start: number; end: number } => {
    if (!textAreaRef.current) return { text: '', start: 0, end: 0 };

    const textarea = textAreaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Use the actual textarea value instead of state
    const actualText = textarea.value;

    return {
      text: actualText.substring(start, end),
      start,
      end,
    };
  }, []); // Remove text dependency

  // Simple debounce utility
  function debounce<T extends (arg: string) => void>(
    func: T,
    wait: number,
  ): (arg: string) => void {
    let timeoutId: NodeJS.Timeout | undefined;
    return (arg: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(arg), wait);
    };
  }

  // Selection validation
  const isMobileDevice = useCallback((): boolean => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent,
    );
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    return isMobileUA || (hasTouch && isSmallScreen);
  }, []);

  // State for mobile detection
  useEffect(() => {
    setIsMobile(isMobileDevice());
    const handleResize = (): void => setIsMobile(isMobileDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileDevice]);

  // Enhanced selection highlighting
  const highlightSelectedText = useCallback((): void => {
    if (!textAreaRef.current) return;

    const textarea = textAreaRef.current;
    const selection = getSelectedText();

    if (selection.text.length > 0) {
      // Save selection
      setSavedSelection(selection);
      setIsColorPickerOpen(true);

      // Add visual highlighting with stronger styles
      textarea.style.boxShadow = '0 0 0 3px #3b82f6, inset 0 0 0 2px #60a5fa';
      textarea.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      textarea.style.transition = 'all 0.2s ease';

      console.log('✨ Highlighted selection:', selection.text);
    }
  }, [getSelectedText]);

  const restoreSelection = useCallback((): void => {
    if (!textAreaRef.current) return;

    const textarea = textAreaRef.current;

    // Remove highlighting
    textarea.style.boxShadow = '';
    textarea.style.backgroundColor = '';
    setIsColorPickerOpen(false);

    // Restore selection if saved
    if (savedSelection) {
      setTimeout(() => {
        textarea.setSelectionRange(savedSelection.start, savedSelection.end);
        textarea.focus();
        console.log('🔄 Restored selection');
      }, 100);
    }

    setSavedSelection(null);
  }, [savedSelection]);

  // Debounced history saving
  const debouncedSaveHistory = useCallback(
    debounce((newText: string) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        if (newHistory.length === 0 || newHistory[newHistory.length - 1] !== newText) {
          const updatedHistory = [...newHistory, newText];
          if (updatedHistory.length > maxHistory) {
            updatedHistory.shift();
          } else {
            setHistoryIndex((prev) => prev + 1);
          }
          return updatedHistory;
        }
        return prev;
      });
    }, 500),
    [historyIndex, maxHistory],
  );
  const validateSelection = useCallback((): boolean => {
    const selection = getSelectedText();
    if (!selection.text || selection.text.length === 0) {
      alert('Please select some text first!');
      return false;
    }
    return true;
  }, [getSelectedText]);

  // Enhanced color application logic that uses saved selection
  const applyColorToSelection = useCallback(
    (colorHex: string): void => {
      console.log('🎯 applyColorToSelection called with:', colorHex);
      if (!textAreaRef.current) {
        console.error('❌ No textarea ref');
        return;
      }

      const textarea = textAreaRef.current;
      console.log('📝 Current textarea value length:', textarea.value.length);
      let start: number, end: number, selectedText: string;

      // Use saved selection if available, otherwise get current
      if (savedSelection && savedSelection.text.length > 0) {
        start = savedSelection.start;
        end = savedSelection.end;
        selectedText = savedSelection.text;
        console.log('🎯 Using saved selection:', { start, end, text: selectedText });
      } else {
        start = textarea.selectionStart;
        end = textarea.selectionEnd;
        selectedText = textarea.value.substring(start, end);
        console.log('🎯 Using current selection:', { start, end, text: selectedText });
      }

      if (selectedText.length === 0) {
        console.error('❌ No text selected');
        alert('Please select some text first!');
        return;
      }

      // Clear visual indication
      restoreSelection();

      const beforeText = textarea.value.substring(0, start);
      const afterText = textarea.value.substring(end);

      // Check if already formatted
      const colorFormatRegex = /^\|c[0-9A-Fa-f]{6}(.*?)\|r$/;
      const match = selectedText.match(colorFormatRegex);

      const newColoredText = match
        ? `|c${colorHex}${match[1]}|r`
        : `|c${colorHex}${selectedText}|r`;

      console.log('🔄 Building new text:', {
        beforeLength: beforeText.length,
        coloredLength: newColoredText.length,
        afterLength: afterText.length,
        newColoredText
      });

      const newText = beforeText + newColoredText + afterText;

      // Update both textarea and state
      console.log('💾 Updating textarea and state');
      textarea.value = newText;
      setText(newText);
      debouncedSaveHistory(newText);

      // Restore selection to the newly colored text
      setTimeout(() => {
        const newStart = start;
        const newEnd = newStart + newColoredText.length;
        textarea.setSelectionRange(newStart, newEnd);
        textarea.focus();
        console.log('✅ Color applied successfully');
      }, 0);
    },
    [debouncedSaveHistory, savedSelection],
  );

  // Native color picker setup for mobile only
  const setupNativeColorPicker = useCallback((): void => {
    if (!isMobile) return;

    // Remove any existing desktop color input
    const existingInput = document.getElementById('native-color-input');
    if (existingInput) {
      existingInput.remove();
    }

    // Create hidden native color input for mobile only
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.id = 'native-color-input';
    colorInput.value = '#ffffff';
    colorInput.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: auto;
      visibility: hidden;
    `;
    document.body.appendChild(colorInput);

    colorInput.addEventListener('change', (e) => {
      const hex = (e.target as HTMLInputElement).value.replace('#', '').toUpperCase();
      if (validateSelection()) {
        applyColorToSelection(hex);
      }
    });
  }, [isMobile, validateSelection, applyColorToSelection]);

  // Setup native color picker for mobile only
  useEffect(() => {
    if (isMobile) {
      setupNativeColorPicker();
    } else {
      // Remove native color input on desktop
      const colorInput = document.getElementById('native-color-input');
      if (colorInput) {
        colorInput.remove();
      }
    }

    return () => {
      const colorInput = document.getElementById('native-color-input');
      if (colorInput) {
        colorInput.remove();
      }
    };
  }, [isMobile, setupNativeColorPicker]);

  // Apply quick color (wrapper for applyColorToSelection)
  const applyQuickColor = (colorHex: string): void => {
    if (validateSelection()) {
      applyColorToSelection(colorHex);
    }
  };

  // Updated color picker click handler with validation and highlighting
  const handleColorPickerClick = useCallback((): void => {
    console.log('🎨 Color picker clicked');

    // Validate selection first
    const selection = getSelectedText();
    if (selection.text.length === 0) {
      alert('Please select some text first!');
      return;
    }

    // Highlight the selection
    highlightSelectedText();

    if (isMobile) {
      // Mobile: Use native color picker
      const colorInput = document.getElementById('native-color-input') as HTMLInputElement;
      if (colorInput) {
        try {
          if (typeof colorInput.showPicker === 'function') {
            colorInput.showPicker();
          } else {
            colorInput.click();
          }
        } catch (error) {
          console.warn('Native color picker failed:', error);
          colorInput.click();
        }
      } else {
        console.warn('Native color input not found');
      }
    } else {
      // Desktop: Use Pickr
      if (pickrRef.current) {
        try {
          console.log('📱 Opening Pickr...');
          pickrRef.current.show();
        } catch (error) {
          console.error('❌ Failed to open Pickr:', error);
          createFallbackColorPicker();
        }
      } else {
        console.warn('⚠️ Pickr not initialized, this should not happen');
        createFallbackColorPicker();
      }
    }
  }, [isMobile, getSelectedText, highlightSelectedText]);

  // Add fallback color picker function
  const createFallbackColorPicker = useCallback((): void => {
    const fallbackColorInput = document.createElement('input');
    fallbackColorInput.type = 'color';
    fallbackColorInput.value = '#ffffff';
    fallbackColorInput.style.cssText = `
      position: fixed;
      top: -9999px;
      opacity: 0;
      pointer-events: auto;
    `;
    document.body.appendChild(fallbackColorInput);

    fallbackColorInput.addEventListener('change', (e) => {
      const hex = (e.target as HTMLInputElement).value.replace('#', '').toUpperCase();
      if (validateSelection()) {
        applyColorToSelection(hex);
      }
      document.body.removeChild(fallbackColorInput);
    });

    try {
      if (typeof fallbackColorInput.showPicker === 'function') {
        fallbackColorInput.showPicker();
      } else {
        fallbackColorInput.click();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Fallback color picker failed:', error);
      fallbackColorInput.click();
    }
  }, [validateSelection, applyColorToSelection]);

  // Remove format from selection (with validation)
  const removeFormatFromSelection = (): void => {
    if (!textAreaRef.current) return;

    const textarea = textAreaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    if (selectedText.length === 0) {
      alert('Please select some text first!');
      return;
    }

    const cleanText = selectedText.replace(/\|c[0-9A-Fa-f]{6}(.*?)\|r/g, '$1');
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    const newText = beforeText + cleanText + afterText;

    textarea.value = newText;
    setText(newText);
    debouncedSaveHistory(newText);

    // Restore cursor position
    const newCursorPos = start + cleanText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.focus();
  };

  // Enhanced Pickr initialization with proper error handling
  useEffect(() => {
    if (isMobile || !pickrAnchorRef.current) return;

    let mounted = true;
    let pickrInstance: PickrInstance | null = null;

    const initPickr = async (): Promise<void> => {
      console.log('🔧 initPickr called, mounted:', mounted);
      setIsPickrInitializing(true);
      try {
        console.log('🚀 Initializing Pickr...');

        // Load Pickr library
        const PickrModule = await import('@simonwep/pickr');
        const Pickr = PickrModule.default;

        if (!mounted || !pickrAnchorRef.current) return;

        // Ensure anchor element is ready and visible
        const anchor = pickrAnchorRef.current;
        if (!anchor.isConnected) {
          throw new Error('Anchor element not in DOM');
        }

        // Hide anchor element to prevent visual issues
        anchor.style.position = 'absolute';
        anchor.style.left = '-9999px';
        anchor.style.top = '-9999px';
        anchor.style.width = '1px';
        anchor.style.height = '1px';
        anchor.style.overflow = 'hidden';
        anchor.style.visibility = 'hidden';

        console.log('📦 Pickr module loaded:', typeof Pickr);
        console.log('🎯 Creating Pickr instance with anchor:', anchor);

        try {
          pickrInstance = (Pickr as PickrStatic).create({
            el: anchor,
            theme: theme.palette.mode === 'dark' ? 'monolith' : 'classic',
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
                clear: true,  // ✅ Enable clear button
                save: true,
              },
            },
            position: 'bottom-middle',
            closeOnScroll: true,
            appClass: 'eso-pickr-app',
          });
        } catch (createError) {
          console.error('❌ Pickr create() failed:', createError);
          throw createError;
        }

        console.log('✅ Pickr instance created:', pickrInstance ? 'SUCCESS' : 'FAILED');

        if (pickrInstance) {
          // DEBUG VERSION - Color selection handler
          pickrInstance.on('save', (color: PickrColor) => {
            console.log('🎨 Pickr save event triggered!', color);
            if (color && mounted) {
              let hexColor: string;
              try {
                const hexa = color.toHEXA();
                console.log('🎨 HEXA object:', hexa);
                const fullHex = hexa.toString();
                console.log('🎨 Full hex string:', fullHex);
                hexColor = fullHex.substring(1, 7); // Remove # prefix
                console.log('✅ Color extracted:', hexColor);
              } catch (colorError) {
                console.error('❌ Error extracting color:', colorError);
                // Fallback to white
                hexColor = 'FFFFFF';
              }
              console.log('📝 Current savedSelection:', savedSelection);

              // Force apply color even if selection seems empty
              if (savedSelection && savedSelection.text) {
                console.log('🎯 Applying color to saved selection');
                applyColorToSelection(hexColor);
              } else {
                console.log('⚠️ No saved selection, trying current selection');
                const currentSelection = getSelectedText();
                if (currentSelection.text) {
                  applyColorToSelection(hexColor);
                } else {
                  console.error('❌ No text selected at all!');
                  alert('No text selected! Please select text first.');
                }
              }

              pickrInstance?.hide();
            } else {
              console.error('❌ No color received or component unmounted');
            }
          });

          // Clear/cancel handler
          pickrInstance.on('clear', () => {
            console.log('❌ Color picker cancelled');
            pickrInstance?.hide();
            restoreSelection();
          });

          // DEBUG VERSION - Show handler with click debugging
          pickrInstance.on('show', () => {
            console.log('👁️ Pickr shown');
            // Add click listeners to debug
            setTimeout(() => {
              const swatches = document.querySelectorAll('.pcr-swatches button');
              console.log('🎨 Found', swatches.length, 'color swatches');

              swatches.forEach((swatch, index) => {
                swatch.addEventListener('click', (e) => {
                  console.log(`🎨 Swatch ${index} clicked!`, e);
                });
              });
            }, 100);

            // Position with multiple attempts
            setTimeout(() => positionPickr(), 10);
            setTimeout(() => positionPickr(), 100);
            setTimeout(() => positionPickr(), 250);

            // Add escape key handler
            const handleEscape = (e: KeyboardEvent) => {
              if (e.key === 'Escape') {
                console.log('⚡ Escape pressed, closing Pickr');
                pickrInstance?.hide();
                document.removeEventListener('keydown', handleEscape);
              }
            };
            document.addEventListener('keydown', handleEscape);
          });

          // Hide handler
          pickrInstance.on('hide', () => {
            if (mounted) {
              console.log('👋 Pickr closed');
              restoreSelection();
            }
          });

          pickrInstance.on('init', () => {
            console.log('✅ Pickr initialized successfully');
          });
        }

        if (mounted && pickrInstance) {
          pickrRef.current = pickrInstance;
          console.log('✅ Pickr initialized successfully');
          console.log('📝 pickrRef.current set:', pickrRef.current ? 'YES' : 'NO');
        } else if (pickrInstance) {
          console.log('❌ Component not mounted, destroying Pickr');
          pickrInstance.destroy();
        } else {
          console.log('❌ No pickrInstance to store in ref');
        }
      } catch (error) {
        console.error('❌ Pickr initialization failed:', error);
        console.log('⚠️ Will use fallback color picker');
      }
    };

    // Start initialization
    initPickr();

    return () => {
      console.log('🧹 Cleanup called, destroying existing Pickr');
      mounted = false;
      setIsPickrInitializing(false);
      if (pickrRef.current) {
        try {
          pickrRef.current.destroy();
          // eslint-disable-next-line no-console
          console.log('Pickr destroyed');
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Error destroying Pickr:', error);
        }
        pickrRef.current = null;
      }
    };
  }, [isMobile]); // Removed theme.palette.mode to prevent unnecessary recreation

  // Emergency fix positioning - center picker below emoji and keep on screen
  const positionPickr = useCallback((): void => {
    const appEl = document.querySelector('.pcr-app') as HTMLElement;
    const emoji = document.getElementById('eso-native-emoji-btn');

    if (!emoji || !appEl) {
      console.warn('Cannot position Pickr - missing elements');
      return;
    }

    const rect = emoji.getBoundingClientRect();
    const gap = 12;

    // Force Pickr to be visible first
    appEl.style.display = 'block';
    appEl.style.visibility = 'visible';

    // Use standard Pickr dimensions
    const pickrWidth = 320;  // Standard Pickr width
    const pickrHeight = 280; // Standard Pickr height

    // Calculate position - CENTER the picker below the emoji
    let left = rect.left + (rect.width / 2) - (pickrWidth / 2);
    let top = rect.bottom + gap;

    // Keep within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position
    if (left < gap) {
      left = gap; // Too far left
    } else if (left + pickrWidth > viewportWidth - gap) {
      left = viewportWidth - pickrWidth - gap; // Too far right
    }

    // Adjust vertical position
    if (top + pickrHeight > viewportHeight - gap) {
      // Try positioning above the emoji
      top = rect.top - pickrHeight - gap;

      // If still doesn't fit, place in center of screen
      if (top < gap) {
        top = (viewportHeight - pickrHeight) / 2;
        left = (viewportWidth - pickrWidth) / 2;
      }
    }

    // Apply positioning with important flags
    appEl.style.position = 'fixed';
    appEl.style.left = `${Math.max(0, left)}px`;
    appEl.style.top = `${Math.max(0, top)}px`;
    appEl.style.zIndex = '999999';
    appEl.style.maxWidth = 'none';
    appEl.style.maxHeight = 'none';
    appEl.style.margin = '0';
    appEl.style.transform = 'none';

    console.log(`✅ Positioned Pickr at ${left}, ${top} (viewport: ${viewportWidth}x${viewportHeight})`);
  }, []);

  // Handle theme changes without destroying Pickr
  useEffect(() => {
    if (pickrRef.current) {
      console.log('🎨 Theme changed, updating Pickr theme to:', theme.palette.mode);
      // For now, we'll just update the positioning since Pickr doesn't support dynamic theme changes
      // The user will need to close and reopen the picker to see the new theme
      positionPickr();
    }
  }, [theme.palette.mode, positionPickr]);

  // Initialize with example text - fix the useEffect
  useEffect(() => {
    const exampleText = `|cFFFF00What We Offer:|r

|c00FF00Progressive Raiding & Teaching:|r Whether you're a seasoned veteran or new to trials, our experienced raiders are eager to teach, share strategies, and grow together. We run regular end-game content like veteran trials, arenas, and dungeons—focusing on fun, improvement, and epic loot!

|c00FF00Fully Equipped Guild Hall:|r Dive into @PatrickFoo's Hall of the Lunar Champion, our ultimate hub featuring:
- All crafting stations for seamless gear upgrades.
- Mundus stones for build optimization.
- Target dummies to hone your DPS, healing, and tanking skills.`;

    setText(exampleText);
    setHistory([exampleText]);
    setHistoryIndex(0);
  }, []); // Empty dependency array - only run once

  // DEBUG VERSION - Monitor text state
  useEffect(() => {
    console.log('📝 Text state changed:', text.length, 'characters');
    if (textAreaRef.current) {
      const actual = textAreaRef.current.value;
      if (actual !== text) {
        console.warn('⚠️ State/DOM mismatch!', {
          state: text.length,
          dom: actual.length
        });
      }
    }
  }, [text]);

  // DEBUG VERSION - Event Handlers
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    console.log('⌨️ Text change event:', e.target.value.length, 'characters');
    const newText = e.target.value;
    setText(newText);
    debouncedSaveHistory(newText);
  };

  // Add keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'z':
          if (e.shiftKey) {
            e.preventDefault();
            redo();
          } else {
            e.preventDefault();
            undo();
          }
          break;
        case 'y':
          e.preventDefault();
          redo();
          break;
        case 'a':
          // Allow default Ctrl+A behavior
          break;
        default:
          break;
      }
    }
  };

  // TEMPORARILY DISABLED - emergency close handler for Pickr (debugging)
  // useEffect(() => {
  //   const handlePickrClose = (e: MouseEvent) => {
  //     const target = e.target as HTMLElement;
  //     // Check if click is on the emergency close button
  //     if (target.closest('.pcr-app') && e.target instanceof Element && e.target.classList.contains('pcr-app')) {
  //       // Check if the click is near the top-right corner (emergency close area)
  //       const rect = (e.target as HTMLElement).getBoundingClientRect();
  //       const x = e.clientX - rect.left;
  //       const y = e.clientY - rect.top;

  //       // If click is in top-right corner area
  //       if (x > rect.width - 40 && y < 40) {
  //         console.log('⚡ Emergency close triggered');
  //         if (pickrRef.current) {
  //           pickrRef.current.hide();
  //           restoreSelection();
  //         }
  //       }
  //     }
  //   };

  //   document.addEventListener('click', handlePickrClose);
  //   return () => document.removeEventListener('click', handlePickrClose);
  // }, []);

  const undo = (): void => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const newText = history[newIndex];
      setText(newText);
      // Character count will be updated by the useEffect above
    }
  };

  const redo = (): void => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const newText = history[newIndex];
      setText(newText);
      // Character count will be updated by the useEffect above
    }
  };

  const clearFormatting = (): void => {
    if (!textAreaRef.current) return;

    const textarea = textAreaRef.current;
    const cleanText = textarea.value.replace(/\|c[0-9A-Fa-f]{6}(.*?)\|r/g, '$1');

    textarea.value = cleanText;
    setText(cleanText);
    debouncedSaveHistory(cleanText);
    textarea.focus();
  };

  const copyToClipboard = async (): Promise<void> => {
    if (!textAreaRef.current) return;

    const textToCopy = textAreaRef.current.value;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback('✓ Copied!');
      setTimeout(() => setCopyFeedback(''), 1500);
    } catch (err) {
      // Fallback for older browsers
      textAreaRef.current.select();
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand('copy');
      setCopyFeedback('✓ Copied!');
      setTimeout(() => setCopyFeedback(''), 1500);
    }
  };

  // Update emoji button handler to use unified handler with debug logging
  const handleEmojiClick = (): void => {
    // eslint-disable-next-line no-console
    console.log('🎨 Emoji clicked!');
    // eslint-disable-next-line no-console
    console.log('Current selection:', getSelectedText());
    handleColorPickerClick();
  };

  const renderPreview = (): JSX.Element => {
    if (!text.trim()) {
      return (
        <span style={{ color: '#888', fontStyle: 'italic' }}>
          Your formatted text will appear here...
        </span>
      );
    }

    const previewText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\|c([0-9A-Fa-f]{6})(.*?)\|r/g, '<span style="color: #$1">$2</span>')
      .replace(/\n/g, '<br>');

    return <span dangerouslySetInnerHTML={{ __html: previewText }} />;
  };

  return (
    <TextEditorContainer>
      <Container
        maxWidth="lg"
        sx={{
          // Remove container padding on mobile
          [theme.breakpoints.down('sm')]: {
            padding: '0 !important',
            margin: '0 !important',
            maxWidth: '100% !important',
          },
        }}
      >
        <EditorTool>
          {/* Desktop Layout (from previous commit f1071c2) */}
          <Toolbar>
            <UndoRedoGroup>
              <ToolbarButton
                onClick={undo}
                disabled={historyIndex <= 0}
                aria-label="Undo last change"
              >
                Undo
              </ToolbarButton>
              <ToolbarButton
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                aria-label="Redo last change"
              >
                Redo
              </ToolbarButton>
            </UndoRedoGroup>

            <ToolbarButton onClick={clearFormatting} aria-label="Clear all formatting from text">
              Clear All Formatting
            </ToolbarButton>
            <ToolbarButton
              onClick={removeFormatFromSelection}
              aria-label="Remove formatting from selection"
            >
              Remove Format
            </ToolbarButton>

            <PresetColors role="group" aria-label="Quick color choices">
              {presetColors.map((color, index) => (
                <PresetColor
                  key={index}
                  type="button"
                  style={{ background: color }}
                  onClick={() => applyQuickColor(color.substring(1))}
                  aria-label={`Apply ${color} color`}
                />
              ))}
            </PresetColors>

            <ColorPickerWrapper>
              <EmojiButton
                id="eso-native-emoji-btn"
                type="button"
                onClick={handleEmojiClick}
                aria-label="Choose custom color"
              >
                🎨
              </EmojiButton>
              <div
                ref={pickrAnchorRef}
                id="eso-pickr-anchor"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: '0',
                  height: '0',
                  overflow: 'hidden',
                }}
              />
            </ColorPickerWrapper>
          </Toolbar>

          {/* Mobile Layout (from latest commit d94de66) */}
          <FormatContainer>
            {/* Row 1: Undo/Redo */}
            <FormatRow>
              <UndoRedoGroup>
                <ToolbarButton
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  aria-label="Undo last change"
                >
                  Undo
                </ToolbarButton>
                <ToolbarButton
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  aria-label="Redo last change"
                >
                  Redo
                </ToolbarButton>
              </UndoRedoGroup>
            </FormatRow>

            {/* Row 2: Clear/Remove Format */}
            <FormatRow>
              <ToolbarButton onClick={clearFormatting} aria-label="Clear all formatting from text">
                Clear All
              </ToolbarButton>
              <ToolbarButton
                onClick={removeFormatFromSelection}
                aria-label="Remove formatting from selection"
              >
                Remove Format
              </ToolbarButton>
            </FormatRow>
          </FormatContainer>

          {/* Color section with emoji above swatches */}
          <ColorSection>
            <ColorPickerWrapper>
              <EmojiButton
                id="eso-native-emoji-btn-mobile"
                type="button"
                onClick={handleEmojiClick}
                aria-label="Choose custom color"
              >
                🎨
              </EmojiButton>
            </ColorPickerWrapper>

            <PresetColors role="group" aria-label="Quick color choices">
              {presetColors.map((color, index) => (
                <PresetColor
                  key={index}
                  type="button"
                  style={{ background: color }}
                  onClick={() => applyQuickColor(color.substring(1))}
                  aria-label={`Apply ${color} color`}
                />
              ))}
            </PresetColors>
          </ColorSection>

          <TextInput
            ref={textAreaRef}
            id="eso-input"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your text here or paste ESO/WoW formatted text. Select text and use the buttons above to format."
            aria-describedby="char-count"
          />

          <StatusBar>
            <CharCounter>
              <span style={{ color: '#ccc', fontSize: '12px' }}>Characters: </span>
              <span style={{ color: '#e2b84d', fontWeight: 600 }}>{charCount}</span>
            </CharCounter>
            <CopyButton onClick={copyToClipboard}>{copyFeedback || '📋 Copy Text'}</CopyButton>
          </StatusBar>

          <PreviewArea id="eso-preview">{renderPreview()}</PreviewArea>
        </EditorTool>
      </Container>
    </TextEditorContainer>
  );
};
