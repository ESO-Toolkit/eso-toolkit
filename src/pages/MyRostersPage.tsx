import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Groups as GroupsIcon,
  Publish as PublishIcon,
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
import { useSnackbar } from 'notistack';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext';
import { PublishRosterDialog } from '../features/roster-hub/components/PublishRosterDialog';
import type { SavedRoster } from '../store/saved_rosters';
import { deleteRoster, selectSavedRosters } from '../store/saved_rosters';
import { useAppDispatch } from '../store/useAppDispatch';
import { encodeRosterToURL } from '../utils/rosterEncoding';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function countPlayers(roster: SavedRoster['roster']): number {
  const filledDps = roster.dpsSlots.filter((s) => s.playerName).length;
  const filledTanks = roster.tanks.filter((t) => !!t.playerName).length;
  const filledHealers = roster.healers.filter((h) => !!h.playerName).length;
  return filledTanks + filledHealers + filledDps;
}

interface DeleteDialogProps {
  open: boolean;
  rosterName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ open, rosterName, onConfirm, onCancel }) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle>Delete Roster?</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Are you sure you want to delete <strong>{rosterName}</strong>? This cannot be undone.
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

interface RosterCardProps {
  saved: SavedRoster;
  onEdit: (saved: SavedRoster) => void;
  onView: (saved: SavedRoster) => void;
  onPublish: (saved: SavedRoster) => void;
  onDelete: (saved: SavedRoster) => void;
  isDarkMode: boolean;
}

const RosterCard: React.FC<RosterCardProps> = ({
  saved,
  onEdit,
  onView,
  onPublish,
  onDelete,
  isDarkMode,
}) => {
  const playerCount = countPlayers(saved.roster);

  return (
    <Card
      elevation={0}
      sx={{
        border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
        borderRadius: 2,
        background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
            {saved.roster.rosterName || 'Unnamed Roster'}
          </Typography>
          <Chip
            icon={<GroupsIcon sx={{ fontSize: '14px !important' }} />}
            label={`${playerCount} players`}
            size="small"
            sx={{ ml: 1, flexShrink: 0, fontSize: '0.7rem' }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', mt: 0.5, display: 'block' }}
        >
          Saved {formatDate(saved.savedAt)}
        </Typography>
        {saved.roster.notes && (
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
            {saved.roster.notes}
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
        <Button
          size="small"
          startIcon={<PublishIcon />}
          onClick={() => onPublish(saved)}
          color="primary"
          sx={{ textTransform: 'none', fontWeight: 500 }}
        >
          Publish
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

export const MyRostersPage: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const savedRosters = useSelector(selectSavedRosters);
  const { accessToken } = useAuth();
  const [pendingDelete, setPendingDelete] = useState<SavedRoster | null>(null);
  const [publishTarget, setPublishTarget] = useState<{
    data: string;
    saved: SavedRoster;
  } | null>(null);

  const handleEdit = async (saved: SavedRoster): Promise<void> => {
    try {
      const encoded = await encodeRosterToURL(saved.roster);
      navigate(`/roster-builder?r=${encoded}&id=${saved.id}`);
    } catch {
      enqueueSnackbar('Failed to encode roster', { variant: 'error' });
    }
  };

  const handleView = async (saved: SavedRoster): Promise<void> => {
    try {
      const encoded = await encodeRosterToURL(saved.roster);
      navigate(`/rv?r=${encoded}`);
    } catch {
      enqueueSnackbar('Failed to encode roster', { variant: 'error' });
    }
  };

  const handlePublish = async (saved: SavedRoster): Promise<void> => {
    const data = await encodeRosterToURL(saved.roster);
    setPublishTarget({ data, saved });
  };

  const handlePublish = async (saved: SavedRoster): Promise<void> => {
    const data = await encodeRosterToURL(saved.roster);
    setPublishTarget({ data, saved });
  };

  const handleDeleteConfirm = (): void => {
    if (pendingDelete) {
      dispatch(deleteRoster(pendingDelete.id));
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
            My Rosters
          </Typography>
          <Typography variant="body2" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', mt: 0.5 }}>
            {savedRosters.length === 0
              ? 'No saved rosters yet. Build one in the Roster Builder!'
              : `${savedRosters.length} saved roster${savedRosters.length === 1 ? '' : 's'}`}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/roster-builder')}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
        >
          New Roster
        </Button>
      </Box>

      {savedRosters.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 10,
            border: isDarkMode ? '2px dashed rgba(255,255,255,0.1)' : '2px dashed rgba(0,0,0,0.1)',
            borderRadius: 3,
          }}
        >
          <GroupsIcon sx={{ fontSize: 48, color: isDarkMode ? '#334155' : '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" sx={{ color: isDarkMode ? '#475569' : '#94a3b8', mb: 2 }}>
            No rosters saved yet
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => navigate('/roster-builder')}
            sx={{ textTransform: 'none' }}
          >
            Create your first roster
          </Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {savedRosters.map((saved) => (
            <RosterCard
              key={saved.id}
              saved={saved}
              onEdit={handleEdit}
              onView={handleView}
              onPublish={handlePublish}
              onDelete={setPendingDelete}
              isDarkMode={isDarkMode}
            />
          ))}
        </Stack>
      )}

      <DeleteDialog
        open={pendingDelete !== null}
        rosterName={pendingDelete?.roster.rosterName ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />

      {publishTarget && (
        <PublishRosterDialog
          open={true}
          rosterData={publishTarget.data}
          token={accessToken}
          onClose={() => setPublishTarget(null)}
          onPublished={() => setPublishTarget(null)}
        />
      )}
    </Container>
  );
};
