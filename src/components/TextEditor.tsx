import { Box, Typography, Container, useTheme, alpha, Button, Portal, IconButton, Divider, ClickAwayListener } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/text-editor-page-background.css';
import '../styles/texteditor-theme-bridge.css';
import { HexColorPicker, HexColorInput } from 'react-colorful';

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
  const [copyFeedback, setCopyFeedback] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const [selectedTextInfo, setSelectedTextInfo] = useState<{
    start: number;
    end: number;
    text: string;
    originalText: string; // Store original text for cancel
  } | null>(null);
  const [previewColor, setPreviewColor] = useState<string>('#ffffff'); // Live preview color
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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

  // Set initial picker position to center of viewport
  useEffect(() => {
    resetPickerPosition();
  }, []);

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

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const maxHistory = 50;

  // Update character count whenever text changes
  useEffect(() => {
    setCharCount(text.length);
  }, [text]);

  // Remove unused functions - these are handled by the textAreaRef and existing state
  // const getSelectedText is removed as it's unused
  // const isMobileDevice is removed as it's unused

  // Simple debounce utility
  function debounce(func: (arg: string) => void, wait: number): (arg: string) => void {
    let timeoutId: NodeJS.Timeout | undefined;
    return (arg: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(arg), wait);
    };
  }

  // Enhanced selection restoration with visual feedback
  const restoreTextSelection = useCallback(
    (start: number, end: number, forceVisual = true): void => {
      if (!textAreaRef.current) return;

      const textarea = textAreaRef.current;

      // Ensure textarea is focused first
      textarea.focus();

      // Small delay to ensure focus is established
      setTimeout(() => {
        // Set the selection range
        textarea.setSelectionRange(start, end);

        if (forceVisual) {
          // Force visual highlight by briefly blurring and refocusing
          textarea.blur();
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start, end);

            // Additional visual feedback with CSS
            textarea.style.outline = '2px solid #3b82f6';
            textarea.style.outlineOffset = '2px';

            // Remove CSS highlight after a moment
            setTimeout(() => {
              textarea.style.outline = '';
              textarea.style.outlineOffset = '';
            }, 300);
          }, 10);
        }
      }, 10);
    },
    [textAreaRef],
  );

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

  // Add visual feedback for selected text during preview
  useEffect(() => {
    if (!textAreaRef.current) return;

    const textarea = textAreaRef.current;

    if (isPreviewMode && selectedTextInfo) {
      // Highlight selected text area
      textarea.style.boxShadow = '0 0 0 2px #3b82f6';
      textarea.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';

      // Force maintain selection even when focus is lost
      const maintainSelection = (): void => {
        if (selectedTextInfo && isPreviewMode) {
          const { start, end } = selectedTextInfo;
          // Only restore if textarea doesn't currently have a selection
          if (textarea.selectionStart === textarea.selectionEnd) {
            textarea.setSelectionRange(start, end);
          }
        }
      };

      // Maintain selection periodically and on focus events
      const selectionInterval = setInterval(maintainSelection, 100);
      textarea.addEventListener('focus', maintainSelection);

      return () => {
        clearInterval(selectionInterval);
        textarea.removeEventListener('focus', maintainSelection);
        textarea.style.boxShadow = '';
        textarea.style.backgroundColor = '';
      };
    } else {
      // Remove highlighting
      textarea.style.boxShadow = '';
      textarea.style.backgroundColor = '';
    }

    return () => {
      textarea.style.boxShadow = '';
      textarea.style.backgroundColor = '';
    };
  }, [isPreviewMode, selectedTextInfo]);

  // Manage visual states with CSS classes
  useEffect(() => {
    if (!textAreaRef.current) return;

    const textarea = textAreaRef.current;

    if (isPreviewMode) {
      textarea.classList.add('color-picking');
    } else {
      textarea.classList.remove('color-picking');
    }

    return () => {
      textarea.classList.remove('color-picking');
    };
  }, [isPreviewMode]);

  // Apply the selected color
  const applyPreviewColor = useCallback((): void => {
    if (!textAreaRef.current || !selectedTextInfo) return;

    const textarea = textAreaRef.current;
    const { start, end } = selectedTextInfo;
    const selectedText = selectedTextInfo.originalText.substring(start, end);

    const beforeText = selectedTextInfo.originalText.substring(0, start);
    const afterText = selectedTextInfo.originalText.substring(end);

    // Check if already formatted
    const colorFormatRegex = /^\|c([0-9A-Fa-f]{6})(.*?)\|r$/;
    const match = selectedText.match(colorFormatRegex);

    const colorHex = previewColor.replace('#', '').toUpperCase();
    const newColoredText = match ? `|c${colorHex}${match[1]}|r` : `|c${colorHex}${selectedText}|r`;

    const newText = beforeText + newColoredText + afterText;

    // Apply to actual text
    textarea.value = newText;
    setText(newText);
    debouncedSaveHistory(newText);

    // Calculate new selection bounds for the colored text
    const newStart = start;
    const newEnd = newStart + newColoredText.length;

    // Close color picker first
    closeColorPicker();

    // Restore selection with visual feedback
    setTimeout(() => {
      restoreTextSelection(newStart, newEnd, true);
    }, 50);
  }, [selectedTextInfo, previewColor, debouncedSaveHistory, restoreTextSelection]);

  // Cancel color selection
  const cancelColorSelection = useCallback((): void => {
    if (selectedTextInfo && textAreaRef.current) {
      const textarea = textAreaRef.current;

      // Restore original text
      textarea.value = selectedTextInfo.originalText;
      setText(selectedTextInfo.originalText);

      // Restore original selection
      const { start, end } = selectedTextInfo;

      closeColorPicker();

      // Restore selection with visual feedback
      setTimeout(() => {
        restoreTextSelection(start, end, true);
      }, 50);
    } else {
      closeColorPicker();
    }
  }, [selectedTextInfo, restoreTextSelection]);

  // Reset picker position to center of viewport
  const resetPickerPosition = (): void => {
    const pickerWidth = 320;
    const pickerHeight = 500;
    const centerX = (window.innerWidth - pickerWidth) / 2;
    const centerY = (window.innerHeight - pickerHeight) / 2;

    setColorPickerPosition({
      x: Math.max(16, centerX),
      y: Math.max(16, centerY),
    });
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
        } else if (event.key === 'r' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          resetPickerPosition();
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

  // Simple color application function
  const applySelectedColor = useCallback(
    (color: string): void => {
      if (!textAreaRef.current || !selectedTextInfo) {
        return;
      }

      const textarea = textAreaRef.current;
      const { start, end, text: selectedText } = selectedTextInfo;

      if (selectedText.length === 0) {
        alert('Please select some text first!');
        return;
      }

      // Check if current text at positions matches what we saved
      const currentTextAtPosition = textarea.value.substring(start, end);

      // Use the current text at the position (in case it changed)
      const textToColor = currentTextAtPosition;

      const beforeText = textarea.value.substring(0, start);
      const afterText = textarea.value.substring(end);

      // Check if already formatted - more robust regex
      const colorFormatRegex = /^\|c([0-9A-Fa-f]{6})(.*?)\|r$/;
      const match = textToColor.match(colorFormatRegex);

      let newColoredText;
      if (match) {
        // Already has color formatting, replace the color code but keep the text
        newColoredText = `|c${color}${match[2]}|r`;
      } else {
        // No existing color formatting, add it
        newColoredText = `|c${color}${textToColor}|r`;
      }

      const newText = beforeText + newColoredText + afterText;

      // Update text
      textarea.value = newText;
      setText(newText);
      debouncedSaveHistory(newText);

      // Close color picker after applying
      setShowColorPicker(false);
      setSelectedTextInfo(null);

      // Calculate new selection bounds and restore with visual feedback
      const newStart = start;
      const newEnd = newStart + newColoredText.length;

      setTimeout(() => {
        restoreTextSelection(newStart, newEnd, true);
      }, 50);
    },
    [selectedTextInfo, debouncedSaveHistory, restoreTextSelection],
  );

  // Create preview text with live color
  const createPreviewText = useCallback(
    (colorHex?: string): string => {
      if (!selectedTextInfo || !isPreviewMode) return text;

      const { start, end, originalText } = selectedTextInfo;
      const beforeText = originalText.substring(0, start);
      const afterText = originalText.substring(end);
      const selectedText = originalText.substring(start, end);

      if (colorHex) {
        // Apply preview color
        const cleanColorHex = colorHex.replace('#', '').toUpperCase();
        const colorFormatRegex = /^\|c[0-9A-Fa-f]{6}(.*?)\|r$/;
        const match = selectedText.match(colorFormatRegex);
        const newColoredText = match
          ? `|c${cleanColorHex}${match[1]}|r`
          : `|c${cleanColorHex}${selectedText}|r`;

        return beforeText + newColoredText + afterText;
      }

      return originalText;
    },
    [text, selectedTextInfo, isPreviewMode],
  );

  // Handle color change for preview (not applied yet)
  const handleColorPreview = (color: string): void => {
    const hexColor = color.replace('#', '').toUpperCase();
    setPreviewColor(hexColor);
  };

  // Handle color picker open
  const openColorPicker = useCallback(
    (event: React.MouseEvent): void => {
      if (!textAreaRef.current) {
        return;
      }

      const textarea = textAreaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);

      if (selectedText.length === 0) {
        alert('Please select some text first!');
        return;
      }

      // Save original text for cancel functionality
      setSelectedTextInfo({
        start,
        end,
        text: selectedText,
        originalText: textarea.value, // Store complete original text
      });

      // Calculate optimal position
      const anchorElement = event.currentTarget;
      const position = calculateOptimalPosition(anchorElement);

      setColorPickerAnchor(anchorElement as HTMLElement);
      setColorPickerPosition(position);

      // Check if selected text already has a color and use it as default
      const colorFormatRegex = /^\|c([0-9A-Fa-f]{6})(.*?)\|r$/;
      const match = selectedText.match(colorFormatRegex);
      const defaultColor = match ? `#${match[1]}` : '#ffffff';
      setPreviewColor(defaultColor);
      setIsPreviewMode(true);
      setShowColorPicker(true);

      
      // Maintain visual selection during picker open
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus();
          textAreaRef.current.setSelectionRange(start, end);

          // Add persistent visual indicator during color picking
          textAreaRef.current.style.boxShadow = '0 0 0 2px #3b82f6';
          textAreaRef.current.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        }
      }, 100);
    },
    [textAreaRef, calculateOptimalPosition],
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

  const handleDrag = useCallback((e: MouseEvent): void => {
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
  }, [isDragging, dragOffset]);

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

      setColorPickerPosition(prev => ({
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
    // Remove visual indicators first
    if (textAreaRef.current) {
      textAreaRef.current.style.boxShadow = '';
      textAreaRef.current.style.backgroundColor = '';
    }

    setShowColorPicker(false);
    setColorPickerAnchor(null);
    setSelectedTextInfo(null);
    setPreviewColor('#ffffff');
    setIsPreviewMode(false);

    // Ensure textarea regains focus
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
      }
    }, 10);
  };

  // Enhanced quick color function for toolbar swatches with selection persistence
  const handleQuickColorClick = (colorHex: string): void => {
    if (!textAreaRef.current) return;

    const textarea = textAreaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      alert('Please select some text first!');
      return;
    }

    // Store selection info before applying color
    const selectedText = textarea.value.substring(start, end);
    setSelectedTextInfo({
      start,
      end,
      text: selectedText,
      originalText: textarea.value,
    });

    // Apply the color with a slight delay to ensure selection is maintained
    setTimeout(() => {
      applySelectedColor(colorHex);

      // Ensure selection is maintained after application
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus();
          textAreaRef.current.setSelectionRange(start, end);
        }
      }, 50);
    }, 10);
  };

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

  // Event Handlers
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
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

  const renderPreview = (): React.ReactElement => {
    // Use preview text if in preview mode, otherwise use actual text
    const displayText = isPreviewMode ? createPreviewText(previewColor) : text;

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
                  onClick={() => handleQuickColorClick(color.substring(1))}
                  onMouseDown={(e) => {
                    // Prevent focus loss when clicking preset colors
                    e.preventDefault();
                    // Maintain textarea selection
                    if (textAreaRef.current) {
                      const textarea = textAreaRef.current;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      if (start !== end) {
                        textarea.focus();
                        textarea.setSelectionRange(start, end);
                      }
                    }
                  }}
                  aria-label={`Apply ${color} color`}
                />
              ))}
            </PresetColors>

            <ColorPickerWrapper>
              <EmojiButton
                id="eso-native-emoji-btn"
                type="button"
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
                  onClick={() => handleQuickColorClick(color.substring(1))}
                  onMouseDown={(e) => {
                    // Prevent focus loss when clicking preset colors
                    e.preventDefault();
                    // Maintain textarea selection
                    if (textAreaRef.current) {
                      const textarea = textAreaRef.current;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      if (start !== end) {
                        textarea.focus();
                        textarea.setSelectionRange(start, end);
                      }
                    }
                  }}
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
                    boxShadow: theme.palette.mode === 'dark'
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
                  onMouseDown={handleDragStart}
                >
                  {/* Header */}
                  <Box sx={{
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
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          resetPickerPosition();
                        }}
                        sx={{
                          fontSize: '12px',
                          color: theme.palette.text.secondary,
                          opacity: 0.7,
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 1,
                            color: theme.palette.primary.main,
                          },
                          ml: 1,
                        }}
                        title="Reset position (Ctrl+R)"
                      >
                        ↺
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={cancelColorSelection}
                      aria-label="Close color picker"
                      sx={{
                        opacity: 0.7,
                        '&:hover': { opacity: 1 },
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
                      "{selectedTextInfo?.text ? selectedTextInfo.text.substring(0, 30) : ''}{selectedTextInfo?.text && selectedTextInfo.text.length > 30 ? '...' : ''}"
                    </Typography>
                  </Box>

                  <Divider />

                  {/* Color Picker */}
                  <Box sx={{
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
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (textAreaRef.current && selectedTextInfo) {
                      const { start, end } = selectedTextInfo;
                      textAreaRef.current.focus();
                      textAreaRef.current.setSelectionRange(start, end);
                    }
                  }}
                  >
                    <HexColorPicker
                      color={previewColor}
                      onChange={handleColorPreview}
                    />
                  </Box>

                  {/* Hex Input */}
                  <Box sx={{ px: 2, pb: 2 }}>
                    <HexColorInput
                      color={previewColor}
                      onChange={handleColorPreview}
                      prefixed
                      placeholder="Enter hex color"
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
                      }}
                      aria-label="Hex color input"
                      onFocus={(e) => {
                        e.stopPropagation();
                        if (textAreaRef.current && selectedTextInfo) {
                          const { start, end } = selectedTextInfo;
                          textAreaRef.current.focus();
                          textAreaRef.current.setSelectionRange(start, end);
                        }
                      }}
                    />
                  </Box>

                  <Divider />

                  {/* Action Buttons */}
                  <Box sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.02)'
                      : 'rgba(0, 0, 0, 0.02)',
                  }}>
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
                        sx={{ minWidth: 70 }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={applyPreviewColor}
                        sx={{ minWidth: 70 }}
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
