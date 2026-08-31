/**
 * SetupTabBar
 * Glass-style setup switcher with gradient active pill,
 * animated glow underline, and glass add button.
 *
 * UX features:
 * - Drag-and-drop reordering via @dnd-kit (with DragOverlay for smooth preview)
 * - Delete confirmation dialog prevents accidental data loss
 * - Explicit rename action plus F2/double-click shortcuts
 * - Keyboard-accessible sorting via sortableKeyboardCoordinates
 *
 * Performance:
 * - Thin SortableSetupTab wrapper + React.memo'd SetupTabContent
 *   prevents useSortable's per-frame re-renders from touching inner UI
 * - Memoized setupIds / callbacks prevent SortableContext churn
 */

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DraggableAttributes, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Add as AddIcon,
  Close as CloseIcon,
  ContentCopy as DuplicateIcon,
  DragIndicator as DragIndicatorIcon,
  EditOutlined as EditIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';

import { selectActiveSetupIndex, selectBuildSetups } from '../store/buildEditorSelectors';
import {
  addSetup,
  deleteSetup,
  duplicateSetup,
  renameSetup,
  reorderSetups,
  setActiveSetupIndex,
} from '../store/buildEditorSlice';
import type { BuildSetup } from '../types/build.types';

export const BUILD_EDITOR_SETUP_PANEL_ID = 'build-editor-setup-panel';

export const getBuildSetupTabId = (setupId: string): string =>
  `build-editor-setup-tab-${encodeURIComponent(setupId)}`;

// ─── Accessibility ───────────────────────────────────────────────────────────

const screenReaderInstructions = {
  draggable:
    'To pick up a setup tab, press space or enter. ' +
    'Use the left and right arrow keys to move it. ' +
    'Press space or enter again to drop it in its new position, or press escape to cancel.',
};

// ─── Memoized Tab Content ────────────────────────────────────────────────────
// Separated from the useSortable wrapper so drag-frame re-renders only touch
// the thin outer <Box> (transform/transition), not the full MUI tree inside.

interface SetupTabContentProps {
  setup: BuildSetup;
  index: number;
  active: boolean;
  isDark: boolean;
  isRenaming: boolean;
  renameValue: string;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  setupCount: number;
  prefersReduced: boolean | null;
  isDragging: boolean;
  dragAttributes: DraggableAttributes;
  dragListeners: SyntheticListenerMap | undefined;
  onSelect: (index: number) => void;
  onStartRename: (index: number) => void;
  onCommitRename: (restoreFocus?: boolean) => void;
  onCancelRename: (restoreFocus?: boolean) => void;
  onRenameChange: (value: string) => void;
  onDeleteRequest: (index: number) => void;
  onNavigate: (index: number, key: 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End') => void;
}

const SetupTabContent = React.memo<SetupTabContentProps>(function SetupTabContent({
  setup,
  index,
  active,
  isDark,
  isRenaming,
  renameValue,
  renameInputRef,
  setupCount,
  prefersReduced,
  isDragging,
  dragAttributes,
  dragListeners,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onRenameChange,
  onDeleteRequest,
  onNavigate,
}) {
  return (
    <>
      {/* Keep the tab mounted so the tabpanel's ARIA references remain valid while editing. */}
      {isRenaming && (
        // ── Inline rename input ────────────────────────────────────
        <TextField
          inputRef={renameInputRef}
          value={renameValue}
          size="small"
          autoFocus
          onChange={(e) => onRenameChange(e.target.value)}
          onBlur={() => onCommitRename(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommitRename(true);
            if (e.key === 'Escape') onCancelRename(true);
          }}
          slotProps={{ htmlInput: { maxLength: 32, 'aria-label': 'Rename setup' } }}
          sx={{
            position: 'absolute',
            top: '50%',
            left: 0,
            zIndex: 1,
            width: 120,
            transform: 'translateY(-50%)',
            '& .MuiOutlinedInput-root': {
              fontSize: 13,
              '@media (max-width: 600px)': { fontSize: 16 },
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              fontWeight: 600,
              borderRadius: '99px',
              height: 34,
              px: 1,
              background: isDark
                ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)'
                : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)',
              },
            },
          }}
        />
      )}
      {/* Regular tab button with drag handle */}
      <Tooltip title="Select setup · Drag to reorder" enterDelay={800}>
        <ButtonBase
          {...dragAttributes}
          {...dragListeners}
          role="tab"
          id={getBuildSetupTabId(setup.id)}
          aria-selected={active}
          aria-controls={BUILD_EDITOR_SETUP_PANEL_ID}
          aria-label={`Setup: ${setup.name}`}
          data-setup-tab-index={index}
          tabIndex={isRenaming ? -1 : active ? 0 : -1}
          onClick={() => onSelect(index)}
          onDoubleClick={() => onStartRename(index)}
          onKeyDown={(event) => {
            if (!isDragging && event.key === 'F2') {
              event.preventDefault();
              onStartRename(index);
              return;
            }

            if (
              !isDragging &&
              (event.key === 'ArrowLeft' ||
                event.key === 'ArrowRight' ||
                event.key === 'Home' ||
                event.key === 'End')
            ) {
              event.preventDefault();
              onNavigate(index, event.key);
              return;
            }

            dragListeners?.onKeyDown?.(event);
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 2,
            py: 0.85,
            borderRadius: '99px',
            cursor: isDragging ? 'grabbing' : 'grab',
            background: active
              ? isDark
                ? 'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.16) 0%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.06) 100%)'
                : 'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.10) 0%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.04) 100%)'
              : 'transparent',
            border: active
              ? '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)'
              : '1px solid transparent',
            boxShadow: active
              ? isDark
                ? '0 0 12px rgba(var(--be-accent-rgb, 56, 189, 248), 0.12), inset 0 1px 0 rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                : '0 2px 8px rgba(0,0,0,0.06)'
              : 'none',
            color: active ? 'var(--be-accent, #38bdf8)' : 'text.secondary',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isRenaming ? 0 : 1,
            pointerEvents: isRenaming ? 'none' : 'auto',
            fontWeight: active ? 700 : 500,
            fontSize: 13,
            backdropFilter: active ? 'blur(8px)' : 'none',
            WebkitBackdropFilter: active ? 'blur(8px)' : 'none',
            '&:hover': {
              background: active
                ? undefined
                : isDark
                  ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)'
                  : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.04)',
              border: active
                ? undefined
                : '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)',
            },
          }}
        >
          {/* Drag handle indicator */}
          {setupCount > 1 && (
            <DragIndicatorIcon
              className="drag-handle"
              sx={{
                fontSize: 14,
                opacity: 0,
                transition: 'opacity 0.15s',
                color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)',
                ml: -0.5,
                mr: -0.25,
              }}
            />
          )}
          {/* Active dot with glow */}
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: active
                ? 'var(--be-accent, #38bdf8)'
                : isDark
                  ? 'rgba(255,255,255,0.18)'
                  : 'rgba(0,0,0,0.14)',
              boxShadow: active ? '0 0 6px rgba(var(--be-accent-rgb, 56, 189, 248), 0.6)' : 'none',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: 'inherit',
              fontWeight: 'inherit',
              fontSize: 13,
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              letterSpacing: active ? 0.3 : 0,
              userSelect: 'none',
            }}
          >
            {setup.name}
          </Typography>
        </ButtonBase>
      </Tooltip>

      {active && !isRenaming && (
        <Tooltip title="Rename this setup">
          <IconButton
            size="small"
            onClick={() => onStartRename(index)}
            aria-label={`Rename ${setup.name}`}
            sx={{
              width: 32,
              height: 32,
              ml: 0.5,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
              color: 'text.secondary',
              transition: 'all 0.15s',
              '&:hover': {
                color: 'var(--be-accent, #38bdf8)',
                background: isDark
                  ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)'
                  : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.07)',
              },
            }}
          >
            <EditIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}

      {/* Delete button — only on active tab, requires confirmation */}
      {active && setupCount > 1 && !isRenaming && (
        <Tooltip title="Delete this setup">
          <IconButton
            size="small"
            onClick={() => onDeleteRequest(index)}
            aria-label={`Delete ${setup.name}`}
            sx={{
              width: 32,
              height: 32,
              ml: 0.5,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
              color: 'text.disabled',
              transition: 'all 0.15s',
              '&:hover': {
                color: 'error.main',
                background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)',
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}

      {/* Animated gradient glow underline */}
      {active && !isRenaming && !isDragging && (
        <motion.div
          layoutId="setup-active-indicator"
          transition={
            prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }
          }
          style={{
            position: 'absolute',
            bottom: -4,
            left: 12,
            right: 12,
            height: 2,
            borderRadius: 1,
            background:
              'linear-gradient(90deg, transparent, var(--be-accent, #38bdf8), transparent)',
            boxShadow: '0 0 8px rgba(var(--be-accent-rgb, 56, 189, 248), 0.4)',
          }}
        />
      )}
    </>
  );
});

// ─── Sortable Wrapper ────────────────────────────────────────────────────────
// Thin shell that owns useSortable; only transform/transition change per frame.

interface SortableSetupTabProps {
  setup: BuildSetup;
  index: number;
  active: boolean;
  isDark: boolean;
  isRenaming: boolean;
  renameValue: string;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  setupCount: number;
  prefersReduced: boolean | null;
  onSelect: (index: number) => void;
  onStartRename: (index: number) => void;
  onCommitRename: (restoreFocus?: boolean) => void;
  onCancelRename: (restoreFocus?: boolean) => void;
  onRenameChange: (value: string) => void;
  onDeleteRequest: (index: number) => void;
  onNavigate: (index: number, key: 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End') => void;
}

const SortableSetupTab: React.FC<SortableSetupTabProps> = ({
  setup,
  index,
  active,
  isDark,
  isRenaming,
  renameValue,
  renameInputRef,
  setupCount,
  prefersReduced,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onRenameChange,
  onDeleteRequest,
  onNavigate,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: setup.id,
    disabled: isRenaming,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        '&:hover .drag-handle': {
          opacity: setupCount > 1 ? 0.5 : 0,
        },
      }}
    >
      <SetupTabContent
        setup={setup}
        index={index}
        active={active}
        isDark={isDark}
        isRenaming={isRenaming}
        renameValue={renameValue}
        renameInputRef={renameInputRef}
        setupCount={setupCount}
        prefersReduced={prefersReduced}
        isDragging={isDragging}
        dragAttributes={attributes}
        dragListeners={listeners}
        onSelect={onSelect}
        onStartRename={onStartRename}
        onCommitRename={onCommitRename}
        onCancelRename={onCancelRename}
        onRenameChange={onRenameChange}
        onDeleteRequest={onDeleteRequest}
        onNavigate={onNavigate}
      />
    </Box>
  );
};

// ─── Drag Overlay Preview ────────────────────────────────────────────────────
// Lightweight, non-interactive preview rendered in a portal during drag.

const DragPreview: React.FC<{ setup: BuildSetup; isDark: boolean }> = ({ setup, isDark }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 0.75,
      px: 2,
      py: 0.85,
      borderRadius: '99px',
      background: isDark
        ? 'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.22) 0%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.10) 100%)'
        : 'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.14) 0%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.06) 100%)',
      border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)',
      boxShadow: isDark
        ? '0 4px 20px rgba(var(--be-accent-rgb, 56, 189, 248), 0.25), 0 0 0 1px rgba(var(--be-accent-rgb, 56, 189, 248), 0.15)'
        : '0 4px 16px rgba(0,0,0,0.12)',
      color: 'var(--be-accent, #38bdf8)',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'grabbing',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      pointerEvents: 'none',
    }}
  >
    <DragIndicatorIcon
      sx={{
        fontSize: 14,
        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)',
        ml: -0.5,
        mr: -0.25,
      }}
    />
    <Box
      sx={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'var(--be-accent, #38bdf8)',
        boxShadow: '0 0 6px rgba(var(--be-accent-rgb, 56, 189, 248), 0.6)',
        flexShrink: 0,
      }}
    />
    <Typography
      variant="caption"
      sx={{
        fontSize: 13,
        fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
        fontWeight: 700,
        letterSpacing: 0.3,
        color: 'inherit',
        userSelect: 'none',
      }}
    >
      {setup.name}
    </Typography>
  </Box>
);

// ─── Main Component ──────────────────────────────────────────────────────────

export const SetupTabBar: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const prefersReduced = useReducedMotion();

  // Narrow: setups array is stable across unrelated build edits (name,
  // description, guide, etc) because Immer preserves unchanged subtrees.
  // Compose a minimal `build`-like object for existing code below.
  const setups = useSelector(selectBuildSetups);
  const activeSetupIndex = useSelector(selectActiveSetupIndex);
  const build = useMemo(() => ({ setups }), [setups]);

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Hold 250ms + move 8px to drag on touch — restores page scrolling when
    // a swipe starts on a tab without triggering the drag.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const fromIndex = build.setups.findIndex((s) => s.id === active.id);
      const toIndex = build.setups.findIndex((s) => s.id === over.id);
      if (fromIndex !== -1 && toIndex !== -1) {
        dispatch(reorderSetups({ fromIndex, toIndex }));
      }
    },
    [build.setups, dispatch],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Memoize the id array so SortableContext doesn't re-initialize each render
  const setupIds = useMemo(() => build.setups.map((s) => s.id), [build.setups]);

  const draggedSetup = activeId ? build.setups.find((s) => s.id === activeId) : null;

  // ── Delete confirmation state ────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const pendingSetupFocusRef = useRef<number | null>(null);

  const focusSetupTab = useCallback((index: number): void => {
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-setup-tab-index="${index}"]`)?.focus();
    });
  }, []);

  const handleDeleteConfirm = useCallback((): void => {
    if (deleteTarget !== null) {
      pendingSetupFocusRef.current = Math.min(deleteTarget, build.setups.length - 2);
      dispatch(deleteSetup(deleteTarget));
      setDeleteTarget(null);
    }
  }, [build.setups.length, deleteTarget, dispatch]);

  const handleDeleteDialogExited = useCallback((): void => {
    if (pendingSetupFocusRef.current === null) return;
    focusSetupTab(pendingSetupFocusRef.current);
    pendingSetupFocusRef.current = null;
  }, [focusSetupTab]);

  // ── Inline rename state ──────────────────────────────────────────────────
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const startRename = useCallback(
    (index: number): void => {
      setRenamingIndex(index);
      setRenameValue(build.setups[index].name);
      requestAnimationFrame(() => renameInputRef.current?.select());
    },
    [build.setups],
  );

  const commitRename = useCallback(
    (restoreFocus = false): void => {
      if (renamingIndex !== null) {
        const index = renamingIndex;
        const trimmed = renameValue.trim();
        if (trimmed) {
          dispatch(renameSetup({ index, name: trimmed }));
        }
        setRenamingIndex(null);
        if (restoreFocus) focusSetupTab(index);
      }
    },
    [dispatch, focusSetupTab, renameValue, renamingIndex],
  );

  const cancelRename = useCallback(
    (restoreFocus = false): void => {
      if (renamingIndex !== null) {
        setRenamingIndex(null);
        if (restoreFocus) focusSetupTab(renamingIndex);
      }
    },
    [focusSetupTab, renamingIndex],
  );

  // Stable callback refs for SortableSetupTab props
  const handleSelect = useCallback((idx: number) => dispatch(setActiveSetupIndex(idx)), [dispatch]);

  const handleNavigate = useCallback(
    (index: number, key: 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'): void => {
      let nextIndex = index;
      if (key === 'Home') nextIndex = 0;
      if (key === 'End') nextIndex = build.setups.length - 1;
      if (key === 'ArrowLeft') nextIndex = (index - 1 + build.setups.length) % build.setups.length;
      if (key === 'ArrowRight') nextIndex = (index + 1) % build.setups.length;

      dispatch(setActiveSetupIndex(nextIndex));
      focusSetupTab(nextIndex);
    },
    [build.setups.length, dispatch, focusSetupTab],
  );

  // ── Add-setup menu (Blank vs Duplicate current) ──────────────────────────
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);
  const atMax = build.setups.length >= 5;
  const activeSetupName = build.setups[activeSetupIndex]?.name ?? 'current setup';

  const handleAddBlank = useCallback(() => {
    dispatch(addSetup());
    setAddMenuAnchor(null);
  }, [dispatch]);

  const handleDuplicateActive = useCallback(() => {
    dispatch(duplicateSetup(activeSetupIndex));
    setAddMenuAnchor(null);
  }, [dispatch, activeSetupIndex]);

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: { xs: 1.5, md: 2.5 },
          py: 1.25,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
          background: isDark ? 'rgba(8, 14, 26, 0.90)' : 'rgba(248, 250, 252, 0.92)',
          // Phase 3 M9: blur reduced from 16px → 8px; willChange promotes
          // this bar to its own compositing layer so the blur cost doesn't
          // leak into neighboring elements' composite passes.
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          willChange: 'transform',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          position: 'relative',
          // Subtle accent gradient bleed from left
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '30%',
            background: isDark
              ? 'linear-gradient(90deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.04) 0%, transparent 100%)'
              : 'linear-gradient(90deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.03) 0%, transparent 100%)',
            pointerEvents: 'none',
          },
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          accessibility={{ screenReaderInstructions }}
        >
          <Box role="tablist" aria-label="Build setups" sx={{ display: 'contents' }}>
            <SortableContext items={setupIds} strategy={horizontalListSortingStrategy}>
              {build.setups.map((setup, i) => (
                <SortableSetupTab
                  key={setup.id}
                  setup={setup}
                  index={i}
                  active={i === activeSetupIndex}
                  isDark={isDark}
                  isRenaming={renamingIndex === i}
                  renameValue={renameValue}
                  renameInputRef={renameInputRef}
                  setupCount={build.setups.length}
                  prefersReduced={prefersReduced}
                  onSelect={handleSelect}
                  onStartRename={startRename}
                  onCommitRename={commitRename}
                  onCancelRename={cancelRename}
                  onRenameChange={setRenameValue}
                  onDeleteRequest={setDeleteTarget}
                  onNavigate={handleNavigate}
                />
              ))}
            </SortableContext>
          </Box>

          {/* Portal-rendered drag preview — avoids layout shift and z-index issues */}
          {createPortal(
            <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
              {draggedSetup ? <DragPreview setup={draggedSetup} isDark={isDark} /> : null}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>

        {/* Add setup — glass circle with accent border; opens Blank/Duplicate menu */}
        <Tooltip title={atMax ? 'Max 5 setups' : 'Add setup'}>
          <Box>
            <IconButton
              size="small"
              onClick={(e) => setAddMenuAnchor(e.currentTarget)}
              disabled={atMax}
              aria-label="Add setup"
              aria-haspopup="menu"
              aria-expanded={Boolean(addMenuAnchor)}
              sx={{
                width: 32,
                height: 32,
                background: isDark
                  ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                  : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.05)',
                border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                color: 'var(--be-accent, #38bdf8)',
                transition: 'all 0.2s',
                '&:hover': {
                  background: isDark
                    ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.18)'
                    : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)',
                  borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.40)',
                  boxShadow: '0 0 10px rgba(var(--be-accent-rgb, 56, 189, 248), 0.18)',
                },
                '&.Mui-disabled': {
                  opacity: 0.3,
                  border: '1px solid transparent',
                },
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Tooltip>

        {/* Add-setup menu: blank or duplicate the active setup */}
        <Menu
          anchorEl={addMenuAnchor}
          open={Boolean(addMenuAnchor)}
          onClose={() => setAddMenuAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          slotProps={{
            paper: {
              sx: {
                mb: 0.5,
                minWidth: 220,
                borderRadius: 2,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                background: isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(255, 255, 255, 0.97)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
              },
            },
          }}
        >
          <MenuItem
            onClick={handleAddBlank}
            sx={{
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              fontSize: 13,
              py: 0.85,
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: 'var(--be-accent, #38bdf8)' }}>
              <AddIcon sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText
              primary="Blank setup"
              secondary="Start from scratch"
              slotProps={{
                primary: { sx: { fontSize: 13, fontWeight: 600 } },
                secondary: { sx: { fontSize: 11 } },
              }}
            />
          </MenuItem>
          <MenuItem
            onClick={handleDuplicateActive}
            sx={{
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              fontSize: 13,
              py: 0.85,
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: 'var(--be-accent, #38bdf8)' }}>
              <DuplicateIcon sx={{ fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText
              primary={`Duplicate “${activeSetupName}”`}
              secondary="Copy gear, skills, CP & more"
              slotProps={{
                primary: {
                  sx: {
                    fontSize: 13,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                },
                secondary: { sx: { fontSize: 11 } },
              }}
            />
          </MenuItem>
        </Menu>
      </Box>

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              background: isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(248, 250, 252, 0.98)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 3,
            },
          },
          transition: { onExited: handleDeleteDialogExited },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
            fontWeight: 700,
            fontSize: 15,
            pb: 0.5,
          }}
        >
          Delete setup?
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              fontSize: 13,
            }}
          >
            <strong>
              {deleteTarget !== null ? (build.setups[deleteTarget]?.name ?? 'this setup') : ''}
            </strong>{' '}
            and all its gear, skills, and champion points will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setDeleteTarget(null)}
            sx={{
              borderRadius: '99px',
              textTransform: 'none',
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            color="error"
            onClick={handleDeleteConfirm}
            sx={{
              borderRadius: '99px',
              textTransform: 'none',
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
