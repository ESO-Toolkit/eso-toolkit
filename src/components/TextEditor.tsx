import {
  Box,
  Typography,
  Container,
  useTheme,
  alpha,
  Button,
  Portal,
  IconButton,
  Divider,
  ClickAwayListener,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/text-editor-page-background.css';
import '../styles/texteditor-theme-bridge.css';
import { HexColorPicker } from 'react-colorful';

import { usePageBackground } from '../hooks/usePageBackground';
// The background image is located in public/text-editor/text-editor-bg-light.jpg

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
  transition: 'all 0.2s ease-in-out',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  '&:not(:disabled):hover': {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: 'white !important',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  '&:not(:disabled):active': {
    background: 'var(--accent2)',
    borderColor: 'var(--accent2)',
    color: 'white !important',
    transform: 'translateY(0px)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  '&:disabled': {
    background: 'transparent',
    color: 'var(--muted)',
    borderColor: 'var(--border)',
    opacity: 1,
    cursor: 'not-allowed',
    '&:hover': {
      background: 'rgba(0, 0, 0, 0.05)',
      borderColor: 'var(--border)',
      color: 'var(--text)',
      transform: 'none',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
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
  // Prevent focus outline while maintaining accessibility
  '&:focus': {
    outline: '2px solid #3b82f6',
    outlineOffset: '2px',
  },
  '&:focus:not(:focus-visible)': {
    outline: 'none',
  },
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
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.1)',
    filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2))',
  },
});

const WysiwygEditor = styled('div')(({ theme }) => ({
  width: '100%',
  minHeight: '280px',
  padding: '20px',
  background: 'var(--panel)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: '12px 12px 0 0',
  fontSize: '15px',
  lineHeight: '1.6',
  boxSizing: 'border-box',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  outline: 'none',
  overflowY: 'auto',
  cursor: 'text',
  backdropFilter: 'blur(6px) saturate(140%)',
  WebkitBackdropFilter: 'blur(6px) saturate(140%)',
  '&:focus': {
    borderColor: 'var(--accent)',
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
  '&:empty::before': {
    content: 'attr(data-placeholder)',
    color: '#888',
    fontStyle: 'italic',
    pointerEvents: 'none',
  },
}));

const StatusBar = styled(Box)(({ theme: _theme }) => ({
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

const CharCounter = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 12px',
  borderRadius: '20px',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(226, 184, 77, 0.2) 0%, rgba(226, 184, 77, 0.1) 50%, rgba(226, 184, 77, 0.05) 100%)'
      : 'linear-gradient(135deg, rgba(120, 120, 120, 0.15) 0%, rgba(100, 100, 100, 0.12) 50%, rgba(80, 80, 80, 0.08) 100%)',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(226, 184, 77, 0.3)'
      : '1px solid rgba(226, 184, 77, 0.4)',
  backdropFilter: 'blur(8px) saturate(150%)',
  WebkitBackdropFilter: 'blur(8px) saturate(150%)',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 4px 12px rgba(226, 184, 77, 0.2)'
        : '0 4px 12px rgba(226, 184, 77, 0.25)',
  },
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
  transition: 'all 0.2s ease-in-out',
  marginLeft: 'auto',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    background: theme.palette.primary.dark,
    borderColor: theme.palette.primary.dark,
    color: theme.palette.background.default,
    transform: 'translateY(-1px)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 4px 16px rgba(0, 0, 0, 0.4)'
        : '0 4px 16px rgba(0, 0, 0, 0.2)',
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
  // Must be transparent so the ::before background image shows through
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

  // Background image layer
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url(${theme.palette.mode === 'dark' ? '/text-editor/text-editor-bg-dark.jpg' : '/text-editor/text-editor-bg-light.jpg'})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    zIndex: 0,
    pointerEvents: 'none',
    filter: 'blur(1px)',
    WebkitFilter: 'blur(1px)',
  },

  // Semi-transparent overlay for text readability
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
    pointerEvents: 'none',
  },

  '& span': {
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    position: 'relative',
    zIndex: 2,
  },

  '& span, & strong, & em, & i, & b': {
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

    '&::before': {
      backgroundPosition: 'center',
      backgroundAttachment: 'scroll',
    },
  },
}));

// ─── WYSIWYG Helper Functions ─────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function deserializeFromESO(esoText: string): string {
  const escaped = escapeHtml(esoText);
  return escaped
    .replace(/\|c([0-9A-Fa-f]{6})([\s\S]*?)\|r/g, '<span style="color: #$1">$2</span>')
    .replace(/\n/g, '<br>');
}

function colorToHex(cssColor: string): string {
  const match = cssColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return cssColor.replace('#', '').toUpperCase();
  return [match[1], match[2], match[3]]
    .map((n) => parseInt(n).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function serializeToESO(element: HTMLElement): string {
  let result = '';
  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? '';
    } else if (node.nodeName === 'BR') {
      result += '\n';
    } else if (node.nodeName === 'SPAN' || node.nodeName === 'FONT') {
      const el = node as HTMLElement;
      const color = el.style.color || el.getAttribute('color') || '';
      if (color) {
        result += `|c${colorToHex(color)}${serializeToESO(el)}|r`;
      } else {
        result += serializeToESO(el);
      }
    } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
      result += '\n' + serializeToESO(node as HTMLElement);
    } else {
      result += serializeToESO(node as HTMLElement);
    }
  });
  return result;
}

// Utility Functions
const presetColors = ['#FFFF00', '#00FF00', '#FF0000', '#0080FF', '#FF8000', '#FF00FF'];

// Main Component
export const TextEditor: React.FC = () => {
  const theme = useTheme();
  // Apply page-specific background and theme management
  usePageBackground('text-editor-page', theme.palette.mode === 'dark');
  const [charCount, setCharCount] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const [selectedTextInfo, setSelectedTextInfo] = useState<{ text: string } | null>(null);
  const [previewColor, setPreviewColor] = useState<string>('#ffffff');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Calculate optimal position for color picker
  const calculateOptimalPosition = useCallback((anchorElement: Element) => {
    const anchorRect = (anchorElement as HTMLElement).getBoundingClientRect();
    const pickerWidth = 320;
    const pickerHeight = 500;
    const padding = 16;

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let x = anchorRect.left;
    let y = anchorRect.bottom + 8;

    // Horizontal positioning
    if (x + pickerWidth > viewport.width - padding) {
      // Try positioning to the left of anchor
      x = anchorRect.right - pickerWidth;

      // If still doesn't fit, position at right edge of viewport
      if (x < padding) {
        x = viewport.width - pickerWidth - padding;
      }
    }

    // Ensure minimum left padding
    x = Math.max(padding, x);

    // Vertical positioning
    if (y + pickerHeight > viewport.height - padding) {
      // Try positioning above anchor
      y = anchorRect.top - pickerHeight - 8;

      // If still doesn't fit, center vertically
      if (y < padding) {
        y = (viewport.height - pickerHeight) / 2;
      }
    }

    // Ensure minimum top padding
    y = Math.max(padding, y);

    return { x, y };
  }, []);

  // Simple fix for light mode background loading
  useEffect(() => {
    // Simple fix for light mode background loading
    if (theme.palette.mode === 'light') {
      const body = document.body;
      // Force light mode background image
      setTimeout(() => {
        body.style.backgroundImage = 'url("/text-editor/text-editor-bg-light.jpg")';
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundRepeat = 'no-repeat';
        body.style.backgroundAttachment = 'fixed';
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

  // ─── WYSIWYG handlers ────────────────────────────────────────────────────────

  const handleInput = useCallback((): void => {
    if (!editorRef.current) return;
    const esoText = serializeToESO(editorRef.current);
    setCharCount(esoText.length);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain');
    if (plain.includes('|c')) {
      document.execCommand('insertHTML', false, deserializeFromESO(plain));
    } else {
      document.execCommand('insertText', false, plain);
    }
  }, []);

  const saveSelectionBeforeBlur = (): void => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      // Only save if the selection is within the editor
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  };

  const applyColorToEditor = useCallback(
    (colorHex: string, rangeOverride?: Range): void => {
      if (!editorRef.current) return;

      const sel = window.getSelection();
      if (!sel) return;

      const rangeToUse = rangeOverride ?? savedRangeRef.current;
      if (!rangeToUse || rangeToUse.collapsed) {
        alert('Please select some text first!');
        return;
      }

      // Restore the range as the active selection
      sel.removeAllRanges();
      sel.addRange(rangeToUse);

      // Ensure editor has focus for execCommand to work
      editorRef.current.focus();

      // Use native browser command — handles span splitting/merging automatically
      // and integrates with browser's undo stack
      document.execCommand('foreColor', false, `#${colorHex}`);

      // Clear saved range after use
      savedRangeRef.current = null;

      handleInput();
    },
    [handleInput],
  );

  const removeFormatFromEditor = useCallback((): void => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      alert('Please select some text first!');
      return;
    }

    // Get the plain text of the selection, then replace with unformatted text
    const plainText = sel.toString();
    editorRef.current.focus();
    document.execCommand('insertText', false, plainText);

    handleInput();
  }, [handleInput]);

  // Apply the selected color from the color picker
  const applyPreviewColor = useCallback((): void => {
    if (!savedRangeRef.current) {
      closeColorPicker();
      return;
    }
    const colorHex = previewColor.replace('#', '').toUpperCase();
    applyColorToEditor(colorHex, savedRangeRef.current);
    closeColorPicker();
  }, [previewColor, applyColorToEditor]);

  // Cancel color selection — just close the picker
  const cancelColorSelection = useCallback((): void => {
    closeColorPicker();
  }, []);

  // Get clean preview text (remove color formatting codes)
  const getCleanPreviewText = (): string => {
    if (!selectedTextInfo?.text) return '';
    const cleanText = selectedTextInfo.text
      .replace(/\|c[0-9A-Fa-f]{6}/g, '')
      .replace(/\|r/g, '')
      .replace(/\|[a-zA-Z]/g, '');
    return cleanText.length > 30 ? cleanText.substring(0, 30) + '...' : cleanText;
  };

  // Handle window resize to reposition picker
  useEffect(() => {
    if (!showColorPicker || !colorPickerAnchor) return;

    const handleResize = (): void => {
      if (colorPickerAnchor) {
        const newPosition = calculateOptimalPosition(colorPickerAnchor);
        setColorPickerPosition(newPosition);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showColorPicker, colorPickerAnchor, calculateOptimalPosition]);

  // Keyboard navigation for color picker
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (showColorPicker) {
        if (event.key === 'Escape') {
          cancelColorSelection();
        } else if (event.key === 'Enter') {
          applyPreviewColor();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showColorPicker, applyPreviewColor, cancelColorSelection]);

  // Enhanced selection restoration with visual feedback
  // Duplicate functions removed - moved above to avoid use-before-define errors
  // const validateSelection = useCallback((): boolean => {
  //   const selection = getSelectedText();
  //   if (!selection.text || selection.text.length === 0) {
  //     alert('Please select some text first!');
  //     return false;
  //   }
  //   return true;
  // }, [getSelectedText]);

  // Handle color change for preview (not applied yet)
  const handleColorPreview = (color: string): void => {
    setPreviewColor(color.startsWith('#') ? color : `#${color}`);
  };

  // Handle color picker open
  const openColorPicker = useCallback(
    (event: React.MouseEvent): void => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        alert('Please select some text first!');
        return;
      }

      const range = sel.getRangeAt(0).cloneRange();
      savedRangeRef.current = range;
      const selectedText = sel.toString();

      // Detect existing color for default picker value
      let defaultColor = '#ffffff';
      const container = range.commonAncestorContainer as HTMLElement;
      const parentSpan =
        container.nodeType === Node.ELEMENT_NODE
          ? (container as HTMLElement).closest('span[style*="color"]')
          : container.parentElement?.closest('span[style*="color"]');
      if (parentSpan) {
        const existingColor = (parentSpan as HTMLElement).style.color;
        if (existingColor) defaultColor = `#${colorToHex(existingColor)}`;
      }

      setSelectedTextInfo({ text: selectedText });
      setPreviewColor(defaultColor);

      const anchorElement = event.currentTarget as HTMLElement;
      setColorPickerAnchor(anchorElement);
      setColorPickerPosition(calculateOptimalPosition(anchorElement));
      setShowColorPicker(true);
    },
    [calculateOptimalPosition],
  );

  // Drag handlers for color picker
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>): void => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    e.preventDefault();
  };

  const handleDrag = useCallback(
    (e: MouseEvent): void => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep picker within full viewport bounds (not just text editor container)
      const pickerWidth = 320; // picker width
      const pickerHeight = 500; // approximate picker height
      const maxX = window.innerWidth - pickerWidth;
      const maxY = window.innerHeight - pickerHeight;

      setColorPickerPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    },
    [isDragging, dragOffset],
  );

  const handleDragEnd = (): void => {
    setIsDragging(false);
  };

  // Handle window resize to keep picker in viewport when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleResize = (): void => {
      const pickerWidth = 320;
      const pickerHeight = 500;
      const maxX = window.innerWidth - pickerWidth;
      const maxY = window.innerHeight - pickerHeight;

      setColorPickerPosition((prev) => ({
        x: Math.max(0, Math.min(prev.x, maxX)),
        y: Math.max(0, Math.min(prev.y, maxY)),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDragging]);

  // Add global event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, dragOffset, handleDrag]);

  // Close color picker
  const closeColorPicker = (): void => {
    setShowColorPicker(false);
    setColorPickerAnchor(null);
    setSelectedTextInfo(null);
    setPreviewColor('#ffffff');
    savedRangeRef.current = null;
    setTimeout(() => editorRef.current?.focus(), 10);
  };

  const handleQuickColorClick = (colorHex: string): void => {
    applyColorToEditor(colorHex);
  };

  // Initialize with example text on mount
  useEffect(() => {
    if (!editorRef.current) return;
    const exampleText = `|cFFFF00What We Offer:|r

|c00FF00Progressive Raiding & Teaching:|r Whether you're a seasoned veteran or new to trials, our experienced raiders are eager to teach, share strategies, and grow together. We run regular end-game content like veteran trials, arenas, and dungeons—focusing on fun, improvement, and epic loot!

|c00FF00Fully Equipped Guild Hall:|r Dive into @PatrickFoo's Hall of the Lunar Champion, our ultimate hub featuring:
- All crafting stations for seamless gear upgrades.
- Mundus stones for build optimization.
- Target dummies to hone your DPS, healing, and tanking skills.`;

    editorRef.current.innerHTML = deserializeFromESO(exampleText);
    setCharCount(exampleText.length);
  }, []); // Run once on mount

  const clearFormatting = (): void => {
    if (!editorRef.current) return;
    const esoText = serializeToESO(editorRef.current);
    // Strip all color codes independently (handles nested codes safely)
    const cleaned = esoText.replace(/\|c[0-9A-Fa-f]{6}/g, '').replace(/\|r/g, '');
    editorRef.current.innerHTML = deserializeFromESO(cleaned);
    setCharCount(cleaned.length);
  };

  const copyToClipboard = async (): Promise<void> => {
    if (!editorRef.current) return;
    const textToCopy = serializeToESO(editorRef.current);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback('✓ Copied!');
      setTimeout(() => setCopyFeedback(''), 1500);
    } catch {
      setCopyFeedback('✓ Copied!');
      setTimeout(() => setCopyFeedback(''), 1500);
    }
  };

  const renderPreview = (): React.ReactElement => {
    if (!editorRef.current) {
      return (
        <span style={{ color: '#888', fontStyle: 'italic' }}>
          Your formatted text will appear here...
        </span>
      );
    }
    const displayText = serializeToESO(editorRef.current);
    if (!displayText.trim()) {
      return (
        <span style={{ color: '#888', fontStyle: 'italic' }}>
          Your formatted text will appear here...
        </span>
      );
    }
    const previewText = displayText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\|c([0-9A-Fa-f]{6})([\s\S]*?)\|r/g, '<span style="color: #$1">$2</span>')
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
          {/* Desktop Toolbar */}
          <Toolbar>
            <UndoRedoGroup>
              <ToolbarButton
                onClick={() => document.execCommand('undo')}
                aria-label="Undo last change"
              >
                Undo
              </ToolbarButton>
              <ToolbarButton
                onClick={() => document.execCommand('redo')}
                aria-label="Redo last change"
              >
                Redo
              </ToolbarButton>
            </UndoRedoGroup>

            <ToolbarButton onClick={clearFormatting} aria-label="Clear all formatting from text">
              Clear All Formatting
            </ToolbarButton>
            <ToolbarButton
              onClick={removeFormatFromEditor}
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
                  onMouseDown={saveSelectionBeforeBlur}
                  onClick={() => handleQuickColorClick(color.substring(1))}
                  aria-label={`Apply ${color} color`}
                />
              ))}
            </PresetColors>

            <ColorPickerWrapper>
              <EmojiButton
                id="eso-native-emoji-btn"
                type="button"
                onMouseDown={saveSelectionBeforeBlur}
                onClick={openColorPicker}
                aria-label="Choose custom color"
                style={{
                  backgroundColor: showColorPicker ? '#3b82f6' : 'transparent',
                  color: showColorPicker ? 'white' : 'inherit',
                }}
              >
                🎨
              </EmojiButton>
            </ColorPickerWrapper>
          </Toolbar>

          {/* Mobile Layout */}
          <FormatContainer>
            <FormatRow>
              <UndoRedoGroup>
                <ToolbarButton
                  onClick={() => document.execCommand('undo')}
                  aria-label="Undo last change"
                >
                  Undo
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => document.execCommand('redo')}
                  aria-label="Redo last change"
                >
                  Redo
                </ToolbarButton>
              </UndoRedoGroup>
            </FormatRow>

            <FormatRow>
              <ToolbarButton onClick={clearFormatting} aria-label="Clear all formatting from text">
                Clear All
              </ToolbarButton>
              <ToolbarButton
                onClick={removeFormatFromEditor}
                aria-label="Remove formatting from selection"
              >
                Remove Format
              </ToolbarButton>
            </FormatRow>
          </FormatContainer>

          {/* Color section */}
          <ColorSection>
            <ColorPickerWrapper>
              <EmojiButton
                id="eso-native-emoji-btn-mobile"
                type="button"
                onMouseDown={saveSelectionBeforeBlur}
                onClick={openColorPicker}
                aria-label="Choose custom color"
                style={{
                  backgroundColor: showColorPicker ? '#3b82f6' : 'transparent',
                  color: showColorPicker ? 'white' : 'inherit',
                }}
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
                  onMouseDown={saveSelectionBeforeBlur}
                  onClick={() => handleQuickColorClick(color.substring(1))}
                  aria-label={`Apply ${color} color`}
                />
              ))}
            </PresetColors>
          </ColorSection>

          {/* WYSIWYG Editor */}
          <WysiwygEditor
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onPaste={handlePaste}
            data-placeholder="Type your text here. Select text and use buttons above to format."
          />

          <StatusBar>
            <CharCounter>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  fontSize: '12px',
                  color: theme.palette.mode === 'dark' ? 'rgba(226, 184, 77, 0.9)' : '#b8860b',
                  mr: '4px',
                }}
              >
                #️⃣
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: theme.palette.mode === 'dark' ? 'rgba(226, 184, 77, 0.8)' : '#8b6914',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  [theme.breakpoints.down('sm')]: {
                    fontSize: '10px',
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Characters
                </Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  Chars
                </Box>
              </Typography>
              <Box
                sx={{
                  width: '1px',
                  height: '16px',
                  background:
                    theme.palette.mode === 'dark'
                      ? 'rgba(226, 184, 77, 0.3)'
                      : 'rgba(226, 184, 77, 0.5)',
                  mx: '4px',
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: theme.palette.mode === 'dark' ? '#e2b84d' : '#333333',
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {charCount.toLocaleString()}
              </Typography>
            </CharCounter>
            <CopyButton onClick={copyToClipboard}>{copyFeedback || '📋 Copy Text'}</CopyButton>
          </StatusBar>

          <PreviewArea id="eso-preview">{renderPreview()}</PreviewArea>

          {/* Portal-Based Color Picker */}
          {showColorPicker && (
            <Portal>
              <ClickAwayListener onClickAway={cancelColorSelection}>
                <Box
                  sx={{
                    position: 'fixed',
                    left: `${colorPickerPosition.x}px`,
                    top: `${colorPickerPosition.y}px`,
                    zIndex: theme.zIndex.modal + 100, // Ensure it's above everything
                    bgcolor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 8px 32px rgba(0, 0, 0, 0.6)'
                        : '0 8px 32px rgba(0, 0, 0, 0.2)',
                    width: 280,
                    maxHeight: '90vh', // Prevent cutting off on small screens
                    overflow: 'hidden',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    // Animation
                    animation: 'colorPickerFadeIn 0.2s ease-out',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                    transition: isDragging ? 'none' : 'all 0.2s ease-out',
                  }}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="color-picker-title"
                  onMouseDown={(e) => {
                    // Don't start drag if clicking on the hex input
                    if ((e.target as HTMLElement).tagName === 'INPUT') {
                      return;
                    }
                    handleDragStart(e);
                  }}
                >
                  {/* Header */}
                  <Box
                    sx={{
                      p: 2,
                      pb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'grab',
                      '&:active': {
                        cursor: 'grabbing',
                      },
                    }}
                    onMouseDown={handleDragStart}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          fontSize: '14px',
                          color: theme.palette.text.secondary,
                          opacity: 0.6,
                          display: 'flex',
                          alignItems: 'center',
                          height: '100%',
                          marginBottom: '-4px',
                        }}
                      >
                        ⠿
                      </Box>
                      <Typography
                        id="color-picker-title"
                        variant="subtitle1"
                        sx={{ fontWeight: 600 }}
                      >
                        Choose Text Color
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={cancelColorSelection}
                      aria-label="Close color picker"
                      sx={{
                        opacity: 1,
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333',
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(0, 0, 0, 0.4)'
                            : 'rgba(0, 0, 0, 0.06)',
                        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'}`,
                        minWidth: '32px',
                        minHeight: '32px',
                        width: '32px',
                        height: '32px',
                        padding: '4px',
                        '&:hover': {
                          opacity: 1,
                          color: theme.palette.mode === 'dark' ? '#ff6666' : '#cc0000',
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(255, 102, 102, 0.15)'
                              : 'rgba(204, 0, 0, 0.08)',
                          borderColor: theme.palette.mode === 'dark' ? '#ff6666' : '#cc0000',
                          transform: 'scale(1.05)',
                          boxShadow:
                            theme.palette.mode === 'dark'
                              ? '0 2px 12px rgba(255, 102, 102, 0.3)'
                              : '0 2px 8px rgba(0, 0, 0, 0.2)',
                        },
                        '&:active': {
                          transform: 'scale(0.95)',
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(255, 102, 102, 0.25)'
                              : 'rgba(204, 0, 0, 0.12)',
                        },
                        '&:focus-visible': {
                          outline: `2px solid ${theme.palette.mode === 'dark' ? '#ff6666' : '#cc0000'}`,
                          outlineOffset: '2px',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      ✕
                    </IconButton>
                  </Box>

                  {/* Selected Text Preview */}
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: theme.palette.text.secondary,
                        bgcolor: theme.palette.background.default,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        display: 'inline-block',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      &quot;{getCleanPreviewText()}&quot;
                    </Typography>
                  </Box>

                  <Divider />

                  {/* Color Picker */}
                  <Box
                    sx={{
                      p: 2,
                      '& .react-colorful': {
                        width: '100% !important',
                        height: '180px !important',
                      },
                      '& .react-colorful__saturation': {
                        borderRadius: '6px 6px 0 0 !important',
                      },
                      '& .react-colorful__hue': {
                        height: '20px !important',
                        borderRadius: '0 0 6px 6px !important',
                      },
                      '& .react-colorful__pointer': {
                        width: '16px !important',
                        height: '16px !important',
                        border: '2px solid white !important',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3) !important',
                      },
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <HexColorPicker color={previewColor} onChange={handleColorPreview} />
                  </Box>

                  {/* Hex Input */}
                  <Box sx={{ px: 2, pb: 2 }}>
                    <input
                      type="text"
                      value={previewColor}
                      onChange={(e) => {
                        // Validate and update hex color
                        const value = e.target.value;
                        if (value.startsWith('#') && /^[#0-9A-Fa-f]{0,7}$/.test(value)) {
                          handleColorPreview(value);
                        } else if (value === '') {
                          handleColorPreview('#ffffff');
                        }
                      }}
                      placeholder="#RRGGBB"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '6px',
                        backgroundColor: theme.palette.background.default,
                        color: theme.palette.text.primary,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      aria-label="Hex color input"
                      onKeyDown={(e) => {
                        // Allow all keyboard input for hex color input
                        e.stopPropagation();
                      }}
                      onPaste={(e) => {
                        // Allow pasting for hex color input
                        e.stopPropagation();
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        e.target.select(); // Select all text when focused
                      }}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent drag when clicking on input
                      }}
                    />
                  </Box>

                  <Divider />

                  {/* Action Buttons */}
                  <Box
                    sx={{
                      p: 2,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      bgcolor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.02)'
                          : 'rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: theme.palette.text.secondary,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                      }}
                    >
                      Preview: {previewColor.toUpperCase()}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={cancelColorSelection}
                        sx={{
                          minWidth: 70,
                          borderColor: theme.palette.divider,
                          color: theme.palette.text.primary,
                          backgroundColor: theme.palette.background.default,
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            backgroundColor: theme.palette.action.hover,
                            color: theme.palette.primary.main,
                            transform: 'translateY(-1px)',
                            boxShadow:
                              theme.palette.mode === 'dark'
                                ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                                : '0 4px 12px rgba(0, 0, 0, 0.15)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={applyPreviewColor}
                        sx={{
                          minWidth: 70,
                          backgroundColor: theme.palette.primary.main,
                          color: theme.palette.primary.contrastText,
                          '&:hover': {
                            backgroundColor: theme.palette.primary.dark,
                            transform: 'translateY(-1px)',
                            boxShadow:
                              theme.palette.mode === 'dark'
                                ? '0 4px 16px rgba(0, 0, 0, 0.4)'
                                : '0 4px 16px rgba(0, 0, 0, 0.2)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Apply
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </ClickAwayListener>
            </Portal>
          )}
        </EditorTool>
      </Container>
    </TextEditorContainer>
  );
};
