import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Handyman as HandymanIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import type { SavedBuild } from '../store/saved_builds';
import { deleteSavedBuild, selectSavedBuilds } from '../store/saved_builds';
import { useAppDispatch } from '../store/useAppDispatch';
import { encodeBuildToURL } from '../utils/buildEncoding';

const CLASS_LABELS: Record<string, string> = {
  dragonknight: 'Dragonknight',
  sorcerer: 'Sorcerer',
  nightblade: 'Nightblade',
  templar: 'Templar',
  warden: 'Warden',
  necromancer: 'Necromancer',
  arcanist: 'Arcanist',
};

const ROLE_LABELS: Record<string, string> = {
  tank: 'Tank',
  healer: 'Healer',
  'magicka-dps': 'Mag DPS',
  'stamina-dps': 'Stam DPS',
  'hybrid-dps': 'Hybrid',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

interface DeleteDialogProps {
  open: boolean;
  buildName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ open, buildName, onConfirm, onCancel }) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle>Delete Build?</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Are you sure you want to delete <strong>{buildName}</strong>? This cannot be undone.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>Cancel</Button>
      <Button onClick={onConfirm} color="error" variant="contained">
        Delete
      </Button>
    </DialogActions>
  </Dialog>
);

interface BuildCardProps {
  saved: SavedBuild;
  onEdit: (saved: SavedBuild) => void;
  onView: (saved: SavedBuild) => void;
  onDelete: (saved: SavedBuild) => void;
  isDarkMode: boolean;
}

const BuildCardItem: React.FC<BuildCardProps> = ({
  saved,
  onEdit,
  onView,
  onDelete,
  isDarkMode,
}) => {
  const classLabel = CLASS_LABELS[saved.build.esoClass] ?? saved.build.esoClass;
  const roleLabel = ROLE_LABELS[saved.build.role] ?? saved.build.role;

  return (
    <Card
      elevation={0}
      sx={{
        border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
        borderRadius: 2,
        background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
        backdropFilter: 'blur(10px)',
        transition: 'border-color 0.2s ease',
        '&:hover': {
          borderColor: isDarkMode ? 'rgba(56,189,248,0.3)' : 'rgba(59,130,246,0.25)',
        },
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              color: isDarkMode ? '#f1f5f9' : '#0f172a',
              wordBreak: 'break-word',
            }}
          >
            {saved.build.name || 'Unnamed Build'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}>
            <Chip label={classLabel} size="small" sx={{ fontSize: '0.7rem' }} />
            <Chip label={roleLabel} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
          </Box>
        </Box>
        <Typography
          variant="caption"
          sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', mt: 0.5, display: 'block' }}
        >
          Saved {formatDate(saved.savedAt)}
        </Typography>
        {saved.build.shortDescription && (
          <Typography
            variant="body2"
            sx={{
              mt: 1,
              color: isDarkMode ? '#94a3b8' : '#64748b',
              fontSize: '0.8rem',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {saved.build.shortDescription}
          </Typography>
        )}
      </CardContent>
      <Divider sx={{ opacity: 0.5 }} />
      <CardActions sx={{ gap: 1, px: 2, py: 1 }}>
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => onEdit(saved)}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Edit
        </Button>
        <Button
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={() => onView(saved)}
          sx={{ textTransform: 'none', fontWeight: 500, color: isDarkMode ? '#94a3b8' : '#64748b' }}
        >
          View
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          startIcon={<DeleteIcon />}
          onClick={() => onDelete(saved)}
          color="error"
          sx={{ textTransform: 'none', fontWeight: 500 }}
        >
          Delete
        </Button>
      </CardActions>
    </Card>
  );
};

export const MyBuildsPage: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const savedBuilds = useSelector(selectSavedBuilds);
  const [pendingDelete, setPendingDelete] = useState<SavedBuild | null>(null);

  const handleEdit = async (saved: SavedBuild): Promise<void> => {
    const encoded = await encodeBuildToURL(saved.build);
    navigate(`/build-editor?b=${encoded}&id=${saved.id}`);
  };

  const handleView = async (saved: SavedBuild): Promise<void> => {
    const encoded = await encodeBuildToURL(saved.build);
    navigate(`/bv?b=${encoded}`);
  };

  const handleDeleteConfirm = (): void => {
    if (pendingDelete) {
      dispatch(deleteSavedBuild(pendingDelete.id));
      setPendingDelete(null);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              background: isDarkMode
                ? 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)'
                : 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            My Builds
          </Typography>
          <Typography variant="body2" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', mt: 0.5 }}>
            {savedBuilds.length === 0
              ? 'No saved builds yet. Create one in the Build Editor!'
              : `${savedBuilds.length} saved build${savedBuilds.length === 1 ? '' : 's'}`}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/build-editor')}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
        >
          New Build
        </Button>
      </Box>

      {savedBuilds.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 10,
            border: isDarkMode ? '2px dashed rgba(255,255,255,0.1)' : '2px dashed rgba(0,0,0,0.1)',
            borderRadius: 3,
          }}
        >
          <HandymanIcon sx={{ fontSize: 48, color: isDarkMode ? '#334155' : '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" sx={{ color: isDarkMode ? '#475569' : '#94a3b8', mb: 2 }}>
            No builds saved yet
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => navigate('/build-editor')}
            sx={{ textTransform: 'none' }}
          >
            Create your first build
          </Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {savedBuilds.map((saved) => (
            <BuildCardItem
              key={saved.id}
              saved={saved}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={setPendingDelete}
              isDarkMode={isDarkMode}
            />
          ))}
        </Stack>
      )}

      <DeleteDialog
        open={pendingDelete !== null}
        buildName={pendingDelete?.build.name ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />
    </Container>
  );
};
