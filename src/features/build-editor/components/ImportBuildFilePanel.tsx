import { FileOpenOutlined as FileOpenIcon } from '@mui/icons-material';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React from 'react';
import { useDispatch } from 'react-redux';

import { loadDraftBuild } from '../store/buildEditorSlice';
import { parseBuildDocument } from '../utils/buildDocument';
import { parseBuildDocumentInWorker } from '../utils/parseBuildDocumentInWorker';

import { glassInputSx } from './primitives/glassInputSx';

interface ImportBuildFilePanelProps {
  onClose: () => void;
}

// Five setups can each contain eight 5 MiB screenshots. Base64 expansion puts
// a valid lossless document near 267 MiB, so the importer must accept its own
// worst-case exports while still rejecting clearly unreasonable input.
const MAX_FILE_BYTES = 320 * 1024 * 1024;
const MAX_PASTED_CHARACTERS = 4 * 1024 * 1024;

const createAbortError = (): DOMException =>
  new DOMException('The build file read was aborted.', 'AbortError');

const readFileAsArrayBuffer = (file: File, signal: AbortSignal): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }

    const reader = new FileReader();
    const cleanup = (): void => {
      signal.removeEventListener('abort', handleAbort);
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
    };
    const rejectWith = (error: unknown): void => {
      cleanup();
      reject(error);
    };
    const handleAbort = (): void => {
      if (reader.readyState === FileReader.LOADING) {
        reader.abort();
        return;
      }
      rejectWith(createAbortError());
    };

    reader.onload = () => {
      const { result } = reader;
      cleanup();
      if (result instanceof ArrayBuffer) {
        resolve(result);
        return;
      }
      reject(new Error('The build file did not produce binary data.'));
    };
    reader.onerror = () =>
      rejectWith(reader.error ?? new Error('The build file could not be read.'));
    reader.onabort = () => rejectWith(createAbortError());
    signal.addEventListener('abort', handleAbort, { once: true });

    try {
      reader.readAsArrayBuffer(file);
    } catch (error) {
      rejectWith(error);
    }
  });

const pillSx = {
  borderRadius: '99px',
  textTransform: 'none',
  fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
  fontWeight: 600,
  fontSize: 12,
} as const;

export const ImportBuildFilePanel: React.FC<ImportBuildFilePanelProps> = ({ onClose }) => {
  const dispatch = useDispatch();
  const isDark = useTheme().palette.mode === 'dark';
  const { enqueueSnackbar } = useSnackbar();
  const [source, setSource] = React.useState('');
  const [fileName, setFileName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const operationRef = React.useRef(0);
  const workerAbortRef = React.useRef<AbortController | null>(null);

  React.useEffect(
    () => () => {
      operationRef.current += 1;
      workerAbortRef.current?.abort();
    },
    [],
  );

  const importSource = async (value: string, operation = ++operationRef.current): Promise<void> => {
    workerAbortRef.current?.abort();
    workerAbortRef.current = null;
    setIsImporting(true);
    setError(null);
    try {
      const build = await parseBuildDocument(value);
      if (operationRef.current !== operation) return;
      if (!build) {
        setError('This is not a supported .esobuild document or legacy build export.');
        return;
      }
      dispatch(loadDraftBuild(build));
      enqueueSnackbar(`Imported “${build.name || 'Untitled Build'}”.`, { variant: 'success' });
      onClose();
    } catch {
      if (operationRef.current === operation) {
        setError('The build file could not be read. It may be damaged or incomplete.');
      }
    } finally {
      if (operationRef.current === operation) setIsImporting(false);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError('That file is larger than 320 MB. Remove embedded screenshots and try again.');
      return;
    }
    const operation = ++operationRef.current;
    workerAbortRef.current?.abort();
    const abortController = new AbortController();
    workerAbortRef.current = abortController;
    setFileName(file.name);
    setError(null);
    setIsImporting(true);
    try {
      const buffer = await readFileAsArrayBuffer(file, abortController.signal);
      if (operationRef.current !== operation || abortController.signal.aborted) return;
      const build = await parseBuildDocumentInWorker(buffer, abortController.signal);
      if (operationRef.current !== operation) return;
      if (!build) {
        setError('This is not a supported .esobuild document or legacy build export.');
        return;
      }
      dispatch(loadDraftBuild(build));
      enqueueSnackbar(`Imported “${build.name || 'Untitled Build'}”.`, { variant: 'success' });
      onClose();
    } catch {
      if (operationRef.current === operation && !abortController.signal.aborted) {
        setError('The build file could not be read. Try choosing it again.');
      }
    } finally {
      if (workerAbortRef.current === abortController) workerAbortRef.current = null;
      if (operationRef.current === operation) setIsImporting(false);
    }
  };

  const handleCancel = (): void => {
    operationRef.current += 1;
    workerAbortRef.current?.abort();
    workerAbortRef.current = null;
    setIsImporting(false);
    onClose();
  };

  return (
    <Stack spacing={1.5} aria-busy={isImporting}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: 12,
          fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
        }}
      >
        Open a lossless .esobuild document, including exports created by older versions of the
        editor. You can also paste the document contents below.
      </Typography>

      <Button
        component="label"
        variant="outlined"
        startIcon={<FileOpenIcon />}
        disabled={isImporting}
        sx={{ ...pillSx, alignSelf: 'flex-start' }}
      >
        Choose .esobuild file
        <input
          hidden
          type="file"
          accept=".esobuild,application/json,text/plain"
          onChange={(event) => void handleFile(event)}
        />
      </Button>

      {fileName && (
        <Typography variant="caption" color="text.secondary" role="status" aria-live="polite">
          Selected {fileName}
        </Typography>
      )}

      <TextField
        fullWidth
        size="small"
        label="Build document"
        placeholder="Paste .esobuild contents"
        value={source}
        onChange={(event) => {
          const nextSource = event.target.value;
          if (nextSource.length > MAX_PASTED_CHARACTERS) {
            setError('Pasted documents are limited to 4 MiB. Choose the .esobuild file instead.');
            return;
          }
          setSource(nextSource);
          if (error) setError(null);
        }}
        multiline
        minRows={4}
        maxRows={10}
        disabled={isImporting}
        sx={glassInputSx(isDark, false)}
      />

      {error && (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      )}
      <Typography
        component="span"
        role="status"
        aria-live="polite"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
        }}
      >
        {isImporting ? 'Importing build document.' : ''}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button variant="outlined" size="small" onClick={handleCancel} sx={pillSx}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          disabled={!source.trim() || isImporting}
          onClick={() => void importSource(source)}
          sx={pillSx}
        >
          {isImporting ? 'Importing…' : 'Import build'}
        </Button>
      </Stack>
    </Stack>
  );
};
