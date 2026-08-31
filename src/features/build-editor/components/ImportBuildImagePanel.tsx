/**
 * ImportBuildImagePanel — import a build from a screenshot / image.
 *
 * Flow: add image(s) (upload / drag-drop / paste) → OCR them client-side
 * (tesseract.js, lazy-loaded) → hand the extracted text to ImportBuildTextPanel,
 * where the user reviews/edits it and applies. Works best on guide infographics
 * and in-game gear sheets, which render the build as readable text.
 */

import {
  AddPhotoAlternateOutlined as AddImageIcon,
  Close as CloseIcon,
  ImageOutlined as ImageIcon,
} from '@mui/icons-material';
import { Alert, Box, Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ocrImages, type OcrProgress } from '../utils/imageOcr';

import { ImportBuildTextPanel } from './ImportBuildTextPanel';

interface ImportBuildImagePanelProps {
  onClose: () => void;
}

const isImage = (f: File): boolean => f.type.startsWith('image/');

const pillSx = {
  borderRadius: '99px',
  textTransform: 'none',
  fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
  fontWeight: 600,
  fontSize: 12,
} as const;

export const ImportBuildImagePanel: React.FC<ImportBuildImagePanelProps> = ({ onClose }) => {
  const isDark = useTheme().palette.mode === 'dark';

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrAbortRef = useRef<AbortController | null>(null);

  const abortActiveOcr = useCallback((): void => {
    ocrAbortRef.current?.abort();
    ocrAbortRef.current = null;
  }, []);

  const cancelOcrForSourceChange = useCallback((): void => {
    abortActiveOcr();
    setRunning(false);
    setProgress(null);
  }, [abortActiveOcr]);

  useEffect(() => abortActiveOcr, [abortActiveOcr]);

  // Object-URL previews, revoked on change/unmount to avoid leaks.
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const addFiles = useCallback(
    (incoming: File[]): void => {
      const imgs = incoming.filter(isImage);
      if (imgs.length === 0) return;
      cancelOcrForSourceChange();
      setError(null);
      setFiles((prev) => [...prev, ...imgs].slice(0, 8)); // cap to keep OCR bounded
    },
    [cancelOcrForSourceChange],
  );

  // Paste-an-image support while this panel is mounted.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent): void => {
      const imgs = [...(e.clipboardData?.items ?? [])]
        .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
        .map((it) => it.getAsFile())
        .filter((f): f is File => f !== null);
      if (imgs.length) {
        e.preventDefault();
        addFiles(imgs);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  const handleDrop = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault();
      addFiles([...(e.dataTransfer?.files ?? [])]);
    },
    [addFiles],
  );

  const removeFile = useCallback(
    (idx: number): void => {
      cancelOcrForSourceChange();
      setError(null);
      setFiles((prev) => prev.filter((_, i) => i !== idx));
    },
    [cancelOcrForSourceChange],
  );

  const handleExtract = useCallback(async (): Promise<void> => {
    if (files.length === 0) return;
    abortActiveOcr();
    const controller = new AbortController();
    ocrAbortRef.current = controller;
    setRunning(true);
    setError(null);
    setProgress(null);
    try {
      const text = await ocrImages(
        files,
        (nextProgress) => {
          if (ocrAbortRef.current === controller && !controller.signal.aborted) {
            setProgress(nextProgress);
          }
        },
        controller.signal,
      );
      if (ocrAbortRef.current !== controller || controller.signal.aborted) return;
      if (!text.trim()) {
        setError('No readable text found in the image(s). Try a clearer or larger screenshot.');
        return;
      }
      setOcrText(text);
    } catch (err) {
      if (
        ocrAbortRef.current !== controller ||
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === 'AbortError')
      ) {
        return;
      }
      setError(err instanceof Error ? err.message : 'OCR failed. Please try again.');
    } finally {
      if (ocrAbortRef.current === controller) {
        ocrAbortRef.current = null;
        setRunning(false);
      }
    }
  }, [abortActiveOcr, files]);

  // Once we have text, reuse the full text-review → Apply pipeline.
  if (ocrText !== null) {
    return <ImportBuildTextPanel onClose={onClose} initialText={ocrText} />;
  }

  return (
    <Stack spacing={1.5}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: 12,
          fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
        }}
      >
        Upload, drag, or paste a screenshot of a build (a guide&apos;s gear/skills panel, or your
        in-game gear sheet). We&apos;ll read the text and let you review it before applying. Works
        best on clear, text-based panels — pure icon grids can&apos;t be read.
      </Typography>

      {/* Dropzone */}
      <Box
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        aria-label="Add build screenshot"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          py: 3,
          px: 2,
          borderRadius: 2,
          cursor: 'pointer',
          border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`,
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
          transition: 'all 0.15s',
          '&:hover': {
            borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.5)',
            background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.05)',
          },
        }}
      >
        <AddImageIcon sx={{ fontSize: 28, color: 'var(--be-accent, #38bdf8)', opacity: 0.85 }} />
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
          }}
        >
          Click to upload, or drag &amp; drop / paste an image
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          PNG / JPG · up to 8 images
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles([...(e.target.files ?? [])]);
            e.target.value = '';
          }}
        />
      </Box>

      {/* Thumbnails */}
      {previews.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          {previews.map((src, i) => (
            <Box key={src} sx={{ position: 'relative' }}>
              <Box
                component="img"
                src={src}
                alt={`Screenshot ${i + 1}`}
                sx={{
                  width: 88,
                  height: 64,
                  objectFit: 'cover',
                  borderRadius: 1.5,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                }}
              />
              {!running && (
                <IconButton
                  aria-label={`Remove screenshot ${i + 1}`}
                  onClick={() => removeFile(i)}
                  sx={{
                    position: 'absolute',
                    top: -13,
                    right: -13,
                    width: 44,
                    height: 44,
                    p: 0,
                    borderRadius: '50%',
                    color: 'text.primary',
                    '&:focus-visible': {
                      outline: `2px solid ${isDark ? '#67e8f9' : '#0891b2'}`,
                      outlineOffset: 1,
                    },
                  }}
                >
                  <CloseIcon
                    sx={{
                      width: 20,
                      height: 20,
                      p: '3px',
                      borderRadius: '50%',
                      background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                    }}
                  />
                </IconButton>
              )}
            </Box>
          ))}
        </Stack>
      )}

      {/* OCR progress */}
      {running && (
        <Box>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              Reading image {progress?.index ?? 1} of {progress?.total ?? files.length}
              {progress?.status ? ` · ${progress.status}` : ''}…
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              {Math.round((progress?.progress ?? 0) * 100)}%
            </Typography>
          </Stack>
          <LinearProgress
            variant={progress ? 'determinate' : 'indeterminate'}
            value={(progress?.progress ?? 0) * 100}
            sx={{ borderRadius: 1, height: 6 }}
          />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ py: 0.25, fontSize: 11, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button variant="outlined" size="small" onClick={onClose} sx={pillSx} disabled={running}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<ImageIcon sx={{ fontSize: 16 }} />}
          disabled={files.length === 0 || running}
          onClick={handleExtract}
          sx={{
            ...pillSx,
            background:
              'linear-gradient(135deg, rgba(var(--be-accent-rgb, 56, 189, 248), 0.85), rgba(var(--be-accent-rgb, 56, 189, 248), 0.65))',
          }}
        >
          {running ? 'Reading…' : 'Read text'}
        </Button>
      </Stack>
    </Stack>
  );
};
