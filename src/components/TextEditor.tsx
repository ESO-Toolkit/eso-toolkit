import { Box, Typography, Container, useTheme, alpha } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useState, useEffect, useRef, useCallback, JSX } from 'react';
import '../styles/pickr-theme.css';
import '../styles/pickr-radius.css';
import '../styles/pickr-background.css';
import '../styles/text-editor-page-background.css';
import { usePageBackground } from '../hooks/usePageBackground';
import backgroundImage from '../assets/text-editor/eso-ss-1.jpg';

// Types
declare global {
  interface Window {
    Pickr: unknown;
  }
}

interface PickrColor {
  toHEXA: () => { toString: () => string };
}

interface PickrInstance {
  create: (options: PickrOptions) => PickrInstance;
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
}));

const EditorTool = styled(Box)(({ theme }) => ({
  maxWidth: 900,
  margin: '2rem auto 2rem auto',
  background: theme.palette.mode === 'dark'
    ? 'rgba(0, 0, 0, 0.85)'
    : 'rgba(255, 255, 255, 0.9)',
  padding: '24px',
  borderRadius: '14px',
  border: `1px solid ${theme.palette.divider}`,
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: theme.palette.text.primary,
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(2px)',
  // Mobile styles - use grid for reordering (from latest commit)
  [theme.breakpoints.down('sm')]: {
    display: 'grid',
    gridTemplateRows: 'auto auto',
    gap: '16px',
  },
}));

// Desktop: Simple horizontal toolbar (from previous commit)
const Toolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: '12px',
  marginBottom: '20px',
  padding: '16px',
  background: theme.palette.mode === 'dark'
    ? 'rgba(0, 0, 0, 0.9)'
    : 'rgba(255, 255, 255, 0.95)',
  borderRadius: '12px',
  border: `1px solid ${theme.palette.divider}`,
  alignItems: 'center',
  transition: 'all 0.15s ease-in-out',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  overflowX: 'auto',
  backdropFilter: 'blur(4px)',
  // Mobile styles
  [theme.breakpoints.down('sm')]: {
    display: 'none', // Hide on mobile, use grid containers instead
  },
}));

const ToolbarButton = styled('button')(({ theme }) => ({
  background: theme.palette.background.paper,
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '8px',
  padding: '10px 16px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  transition: 'all 0.15s ease-in-out',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    background: theme.palette.primary.main,
    borderColor: theme.palette.primary.main,
    color: theme.palette.background.default,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  '&:active': {
    background: theme.palette.primary.dark,
    borderColor: theme.palette.primary.dark,
    color: theme.palette.background.default,
    transform: 'translateY(0px)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  '&:disabled': {
    background: 'transparent',
    color: theme.palette.text.disabled,
    borderColor: theme.palette.divider,
    opacity: 1,
    cursor: 'not-allowed',
  },
  // Mobile styles (from latest commit)
  [theme.breakpoints.down('sm')]: {
    padding: '10px 14px',
    fontSize: '14px',
    order: 3,
    flex: '1 1 calc(50% - 12px)',
    maxWidth: 'calc(50% - 12px)',
    minHeight: '44px',
  },
}));

const UndoRedoGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: '8px',
  // Mobile styles (from latest commit)
  [theme.breakpoints.down('sm')]: {
    gap: '6px',
    order: 1,
    justifyContent: 'center',
    width: '100%',
  },
}));

// Mobile-specific components (from latest commit)
const FormatContainer = styled(Box)(({ theme }) => ({
  display: 'none', // Hidden on desktop
  flexDirection: 'column',
  gap: '8px',
  marginBottom: '20px',
  // Mobile styles - position in grid
  [theme.breakpoints.down('sm')]: {
    display: 'flex',
    gridRow: 2,
  },
}));

const FormatRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: '8px',
  padding: '12px',
  background:
    theme.palette.mode === 'dark'
      ? theme.palette.background.default
      : alpha(theme.palette.background.default, 0.8),
  borderRadius: '12px',
  border: `1px solid ${theme.palette.divider}`,
  alignItems: 'center',
  flexWrap: 'nowrap',
}));

const ColorSection = styled(Box)(({ theme }) => ({
  display: 'none', // Hidden on desktop
  flexDirection: 'column',
  alignItems: 'center',
  gap: '40px',
  marginBottom: '4px',
  // Mobile styles - position in grid (move to top)
  [theme.breakpoints.down('sm')]: {
    display: 'flex',
    gridRow: 1,
    marginBottom: '2px',
  },
}));

// Desktop color components (from previous commit)
const PresetColors = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: '4px',
  marginLeft: '8px',
  // Mobile styles (from latest commit)
  [theme.breakpoints.down('sm')]: {
    gap: '8px',
    width: '100%',
    justifyContent: 'space-between',
    marginLeft: 0,
  },
}));

const PresetColor = styled('button')(({ theme }) => ({
  width: '24px',
  height: '24px',
  borderRadius: '3px',
  cursor: 'pointer',
  transition: 'transform 0.1s',
  // Mobile styles (from latest commit)
  [theme.breakpoints.down('sm')]: {
    width: 'calc(16.666% - 7px)',
    height: '40px',
    borderRadius: '6px',
    border: `1px solid ${theme.palette.divider}`,
    '&:hover': {
      transform: 'scale(1.05)',
    },
  },
  '&:hover': {
    transform: 'scale(1.1)',
  },
}));

const ColorPickerWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginLeft: 'auto',
  // Mobile styles (from latest commit)
  [theme.breakpoints.down('sm')]: {
    justifyContent: 'center',
    marginLeft: 0,
  },
}));

const EmojiButton = styled('button')(({ theme }) => ({
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
}));

const TextInput = styled('textarea')(({ theme }) => ({
  width: '100%',
  height: '280px',
  padding: '20px',
  background: theme.palette.mode === 'dark'
    ? 'rgba(0, 0, 0, 0.85)'
    : 'rgba(255, 255, 255, 0.95)',
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '12px 12px 0 0',
  fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
  resize: 'vertical',
  fontSize: '15px',
  fontWeight: 400,
  lineHeight: '1.5',
  boxSizing: 'border-box',
  transition: 'all 0.15s ease-in-out',
  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
  backdropFilter: 'blur(2px)',
  '&:focus': {
    outline: 'none',
    borderColor: theme.palette.primary.main,
    boxShadow: `inset 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
}));

const StatusBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  background: theme.palette.mode === 'dark'
    ? 'rgba(0, 0, 0, 0.85)'
    : 'rgba(255, 255, 255, 0.95)',
  border: `1px solid ${theme.palette.divider}`,
  borderTop: 'none',
  borderBottomLeftRadius: '12px',
  borderBottomRightRadius: '12px',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.15s ease-in-out',
  backdropFilter: 'blur(2px)',
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
  background: theme.palette.mode === 'dark'
    ? 'rgba(0, 0, 0, 0.8)'
    : 'rgba(255, 255, 255, 0.9)',
  border: `1px solid ${theme.palette.divider}`,
  fontSize: '1rem',
  lineHeight: '1.6',
  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.1)',
  position: 'relative',
  overflow: 'hidden',
  zIndex: 0,
  transition: 'all 0.15s ease-in-out',
  backdropFilter: 'blur(2px)',
  '& span': {
    textShadow: 'none',
  },
  // Mobile styles
  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    minHeight: '100px',
    fontSize: '0.9rem',
  },
}));

// Utility Functions
const presetColors = ['#FFFF00', '#00FF00', '#FF0000', '#0080FF', '#FF8000', '#FF00FF'];

// Main Component
export const TextEditor: React.FC = () => {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [charCount, setCharCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  // Apply page background when component mounts and react to theme changes
  usePageBackground('text-editor-page', theme.palette.mode === 'dark');

  // Set background image via CSS variable for better path resolution
  useEffect(() => {
    document.documentElement.style.setProperty('--page-bg-image', `url(${backgroundImage})`);

    // Debug: log to verify the hook is working
    console.log('TextEditor mounted, setting background image:', backgroundImage);
    console.log('Body classes after mount:', document.body.className);
    console.log('CSS variable set:', document.documentElement.style.getPropertyValue('--page-bg-image'));

    // Test if CSS is loaded by checking if we can find our styles
    const styles = document.styleSheets;
    console.log('Total stylesheets loaded:', styles.length);

    return () => {
      document.documentElement.style.removeProperty('--page-bg-image');
    };
  }, [backgroundImage]);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const pickrRef = useRef<PickrInstance | null>(null);
  const pickrAnchorRef = useRef<HTMLDivElement>(null);

  const maxHistory = 50;

  // Detect mobile device
  useEffect(() => {
    const checkMobile = (): void => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent,
      );
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileUA || (hasTouch && isSmallScreen));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  
  // Initialize Pickr with theme switching
  useEffect(() => {
    if (isMobile || !pickrAnchorRef.current) return;

    const initPickr = async (): Promise<void> => {
      try {
        const Pickr = (await import('@simonwep/pickr')).default;

        // Determine Pickr skin based on light/dark mode
        const isDarkMode = theme.palette.mode === 'dark' ||
                          document.documentElement.classList.contains('dark') ||
                          document.body.classList.contains('dark');
        const pickrTheme = isDarkMode ? 'monolith' : 'classic';

        if (pickrAnchorRef.current) {
          pickrRef.current = (Pickr as PickrInstance).create({
            el: pickrAnchorRef.current,
            theme: pickrTheme,
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
          position: 'bottom-middle',
          closeOnScroll: true,
          appClass: 'eso-pickr-app',
        });
        }

        if (pickrRef.current) {
          pickrRef.current.on('save', (color: PickrColor) => {
            if (color) {
              const hexColor = color.toHEXA().toString().substring(1, 7);
              applyColorToSelection(hexColor);
              pickrRef.current?.hide();
            }
          });

          pickrRef.current.on('show', () => {
            setTimeout(() => positionPickr(), 0);
          });
        }
      } catch (error) {
        // Failed to initialize Pickr - color picker will not be available
      }
    };

    initPickr();

    return () => {
      if (pickrRef.current) {
        pickrRef.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, theme.palette.mode]);

  const positionPickr = useCallback((): void => {
    const appEl = document.querySelector('.pcr-app');
    const emoji = document.getElementById('eso-native-emoji-btn');
    if (!emoji || !appEl) return;

    const rect = emoji.getBoundingClientRect();
    const gap = 8;
    appEl.setAttribute(
      'style',
      `
      position: fixed !important;
      left: ${Math.max(8, Math.min(window.innerWidth - 320 - 8, rect.right - 320))}px !important;
      top: ${rect.bottom + gap + 260 > window.innerHeight - 8 ? Math.max(8, rect.top - 260 - gap) : rect.bottom + gap}px !important;
      z-index: 99999 !important;
    `,
    );
  }, []);

  const saveToHistory = useCallback(
    (newText: string): void => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        if (newHistory.length === 0 || newHistory[newHistory.length - 1] !== newText) {
          const updatedHistory = [...newHistory, newText];
          if (updatedHistory.length > maxHistory) {
            updatedHistory.shift();
          }
          setHistoryIndex(updatedHistory.length - 1);
          return updatedHistory;
        }
        return prev;
      });
    },
    [historyIndex, maxHistory],
  );

  // Initialize with example text
  useEffect(() => {
    const exampleText = `|cFFFF00What We Offer:|r

|c00FF00Progressive Raiding & Teaching:|r Whether you're a seasoned veteran or new to trials, our experienced raiders are eager to teach, share strategies, and grow together. We run regular end-game content like veteran trials, arenas, and dungeons—focusing on fun, improvement, and epic loot!

|c00FF00Fully Equipped Guild Hall:|r Dive into @PatrickFoo's Hall of the Lunar Champion, our ultimate hub featuring:
- All crafting stations for seamless gear upgrades.
- Mundus stones for build optimization.
- Target dummies to hone your DPS, healing, and tanking skills.`;

    setText(exampleText);
    saveToHistory(exampleText);
  }, [saveToHistory]);

  // Event Handlers
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const newText = e.target.value;
    setText(newText);
    setCharCount(newText.length);
    saveToHistory(newText);
  };

  const undo = (): void => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setText(history[newIndex]);
    }
  };

  const redo = (): void => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setText(history[newIndex]);
    }
  };

  const getSelectedText = useCallback((): { text: string; start: number; end: number } => {
    if (!textAreaRef.current) return { text: '', start: 0, end: 0 };
    const start = textAreaRef.current.selectionStart;
    const end = textAreaRef.current.selectionEnd;
    return {
      text: text.substring(start, end),
      start,
      end,
    };
  }, [text]);

  const applyColorToSelection = useCallback(
    (colorHex: string): void => {
      const selection = getSelectedText();
      if (selection.text.length === 0) {
        alert('Please select some text first!');
        return;
      }

      const beforeText = text.substring(0, selection.start);
      const afterText = text.substring(selection.end);
      const newColoredText = `|c${colorHex}${selection.text}|r`;
      const newText = beforeText + newColoredText + afterText;

      setText(newText);
      saveToHistory(newText);

      // Keep selection
      setTimeout(() => {
        if (textAreaRef.current) {
          const newStart = selection.start;
          const newEnd = newStart + newColoredText.length;
          textAreaRef.current.setSelectionRange(newStart, newEnd);
          textAreaRef.current.focus();
        }
      }, 0);
    },
    [text, getSelectedText, setText, saveToHistory],
  );

  const applyQuickColor = (colorHex: string): void => {
    applyColorToSelection(colorHex);
  };

  const removeFormatFromSelection = (): void => {
    const selection = getSelectedText();
    if (selection.text.length === 0) {
      alert('Please select some text first!');
      return;
    }

    const cleanText = selection.text.replace(/\|c[0-9A-Fa-f]{6}(.*?)\|r/g, '$1');
    const beforeText = text.substring(0, selection.start);
    const afterText = text.substring(selection.end);
    const newText = beforeText + cleanText + afterText;

    setText(newText);
    saveToHistory(newText);
  };

  const clearFormatting = (): void => {
    const cleanText = text.replace(/\|c[0-9A-Fa-f]{6}(.*?)\|r/g, '$1');
    setText(cleanText);
    saveToHistory(cleanText);
  };

  const copyToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback('✓ Copied!');
      setTimeout(() => setCopyFeedback(''), 1500);
    } catch (err) {
      // Fallback for older browsers
      if (textAreaRef.current) {
        textAreaRef.current.select();
        // eslint-disable-next-line deprecation/deprecation
        document.execCommand('copy');
        setCopyFeedback('✓ Copied!');
        setTimeout(() => setCopyFeedback(''), 1500);
      }
    }
  };

  const handleEmojiClick = (): void => {
    if (isMobile) {
      // Use native color picker on mobile
      const input = document.createElement('input');
      input.type = 'color';
      input.value = '#ffffff';
      input.onchange = (e) => {
        const hex = (e.target as HTMLInputElement).value.replace('#', '').toUpperCase();
        applyColorToSelection(hex);
      };
      input.click();
    } else if (pickrRef.current) {
      pickrRef.current.show();
    }
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
      <Container maxWidth="lg">
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
              <div
                ref={pickrAnchorRef}
                id="eso-pickr-anchor-mobile"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: '0',
                  height: '0',
                  overflow: 'hidden',
                }}
              />
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
            placeholder="Type your text here or paste ESO/WoW formatted text. Select text and use the buttons above to format."
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