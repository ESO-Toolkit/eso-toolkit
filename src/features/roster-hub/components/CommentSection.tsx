import { DeleteOutline, Reply, Send } from '@mui/icons-material';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React from 'react';

import { rosterHubApi } from '../api/roster-hub-api';
import type { HubComment } from '../types/roster-hub.types';

interface CommentSectionProps {
  rosterId: string;
  isLoggedIn: boolean;
  currentUserId: string;
  token?: string;
  onCountChange?: (count: number) => void;
}

const MAX_BODY_LENGTH = 1000;

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Single comment row ────────────────────────────────────────────────────

const SingleComment: React.FC<{
  comment: HubComment;
  isOwner: boolean;
  isLoggedIn: boolean;
  replyingToId: string | null;
  onReply: (commentId: string, authorName: string) => void;
  onDelete: (commentId: string) => void;
  isReply?: boolean;
}> = React.memo(({ comment, isOwner, isLoggedIn, replyingToId, onReply, onDelete, isReply = false }) => {
  // Generate a stable color from the author name
  const initial = (comment.author_name || '?')[0].toUpperCase();
  const hue = comment.author_name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const avatarColor = `hsl(${hue}, 55%, 55%)`;

  return (
  <Box
    sx={{
      pl: isReply ? 3 : 0,
      py: 0.75,
      borderLeft: isReply ? 2 : 0,
      borderColor: isReply ? `hsl(${hue}, 30%, 70%)` : 'transparent',
      ml: isReply ? 1 : 0,
      transition: 'background-color 0.15s ease',
      borderRadius: 1,
      '&:hover': { bgcolor: 'action.hover' },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          bgcolor: `${avatarColor}25`,
          border: `1px solid ${avatarColor}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: avatarColor, lineHeight: 1 }}>
          {initial}
        </Typography>
      </Box>
      <Typography variant="caption" fontWeight={600} color="text.secondary">
        {comment.author_name}
      </Typography>
      <Typography variant="caption" color="text.disabled">
        · {formatRelativeTime(comment.created_at)}
      </Typography>
      <Box sx={{ ml: 'auto', display: 'flex', gap: 0.25 }}>
        {isLoggedIn && !isReply && (
          <Tooltip title={`Reply to ${comment.author_name}`}>
            <IconButton
              size="small"
              onClick={() => onReply(comment.id, comment.author_name)}
              aria-label={`Reply to ${comment.author_name}`}
              sx={{ p: 0.5, minWidth: 32, minHeight: 32, color: replyingToId === comment.id ? 'primary.main' : 'text.disabled' }}
            >
              <Reply sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
        {isOwner && (
          <Tooltip title="Delete comment">
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete(comment.id)}
              aria-label="Delete comment"
              sx={{ p: 0.5, minWidth: 32, minHeight: 32 }}
            >
              <DeleteOutline sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', pl: 3.25, fontSize: '0.82rem' }}>
      {comment.body}
    </Typography>
  </Box>
  );
});

SingleComment.displayName = 'SingleComment';

// ─── Main component ────────────────────────────────────────────────────────

export const CommentSection: React.FC<CommentSectionProps> = ({
  rosterId,
  isLoggedIn,
  currentUserId,
  token,
  onCountChange,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [comments, setComments] = React.useState<HubComment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [body, setBody] = React.useState('');
  const [replyTo, setReplyTo] = React.useState<{ id: string; authorName: string } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  // Optimistic: track pending comment ids (used for cleanup on error)
  const pendingIdsRef = React.useRef<Set<string>>(new Set());

  const fetchComments = React.useCallback((): void => {
    setLoading(true);
    setError('');
    rosterHubApi
      .listComments(rosterId)
      .then((res) => setComments(res.comments))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load comments'),
      )
      .finally(() => setLoading(false));
  }, [rosterId]);

  React.useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleReply = React.useCallback((commentId: string, authorName: string): void => {
    setReplyTo((prev) => (prev?.id === commentId ? null : { id: commentId, authorName }));
  }, []);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!token || !body.trim() || submitting) return;

    // Optimistic: insert a temporary comment immediately
    const tempId = `pending-${Date.now()}`;
    const optimisticComment: HubComment = {
      id: tempId,
      roster_id: rosterId,
      parent_id: replyTo?.id ?? null,
      author_id: currentUserId,
      author_name: 'You',
      body: body.trim(),
      created_at: new Date().toISOString(),
      replies: [],
    };

    if (replyTo) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === replyTo.id
            ? { ...c, replies: [...c.replies, optimisticComment] }
            : c,
        ),
      );
    } else {
      setComments((prev) => [...prev, optimisticComment]);
    }
    pendingIdsRef.current.add(tempId);

    const submittedBody = body.trim();
    const submittedReplyTo = replyTo;
    setBody('');
    setReplyTo(null);
    setSubmitting(true);

    rosterHubApi
      .createComment(
        rosterId,
        { body: submittedBody, parent_id: submittedReplyTo?.id ?? undefined },
        token,
      )
      .then(() => {
        enqueueSnackbar('Comment posted!', { variant: 'success' });
        fetchComments(); // replace optimistic with real data
      })
      .catch((err: unknown) => {
        // Remove optimistic comment on failure
        setComments((prev) =>
          prev
            .filter((c) => c.id !== tempId)
            .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== tempId) })),
        );
        const msg = err instanceof Error ? err.message : 'Failed to post comment';
        enqueueSnackbar(msg, { variant: 'error', autoHideDuration: 8000 });
      })
      .finally(() => {
        pendingIdsRef.current.delete(tempId);
        setSubmitting(false);
      });
  };

  const handleDelete = (commentId: string): void => {
    if (!token) return;
    rosterHubApi
      .deleteComment(rosterId, commentId, token)
      .then(() => {
        enqueueSnackbar('Comment deleted', { variant: 'info' });
        fetchComments();
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to delete comment';
        enqueueSnackbar(msg, { variant: 'error', autoHideDuration: 8000 });
      });
  };

  const totalCount = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  // Notify parent of comment count changes
  React.useEffect(() => {
    onCountChange?.(totalCount);
  }, [totalCount, onCountChange]);

  const charsLeft = MAX_BODY_LENGTH - body.length;
  const isNearLimit = charsLeft <= 100;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Comments {totalCount > 0 && `(${totalCount})`}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Comment form */}
      {isLoggedIn ? (
        <Box sx={{ mb: 2 }}>
        <form onSubmit={handleSubmit}>
          {replyTo && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Reply sx={{ fontSize: 14, color: 'primary.main' }} />
              <Typography variant="caption" color="primary">
                Replying to {replyTo.authorName}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ cursor: 'pointer', ml: 0.5, '&:hover': { color: 'text.primary' } }}
                onClick={() => setReplyTo(null)}
              >
                · Cancel
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={replyTo ? `Reply to ${replyTo.authorName}…` : 'Add a comment…'}
              size="small"
              multiline
              maxRows={4}
              fullWidth
              aria-label="Comment text"
              slotProps={{ htmlInput: { maxLength: MAX_BODY_LENGTH } }}
              helperText={
                isNearLimit ? (
                  <Typography component="span" variant="caption" color={charsLeft <= 0 ? 'error' : 'warning.main'}>
                    {charsLeft} characters remaining
                  </Typography>
                ) : undefined
              }
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
            />
            <IconButton
              type="submit"
              color="primary"
              disabled={!body.trim() || submitting}
              aria-label="Post comment"
              sx={{ flexShrink: 0, minWidth: 44, minHeight: 44 }}
            >
              {submitting ? <CircularProgress size={20} /> : <Send />}
            </IconButton>
          </Box>
        </form>
        </Box>
      ) : (
        <Typography variant="caption" color="text.disabled" sx={{ mb: 2, display: 'block' }}>
          Log in to leave a comment.
        </Typography>
      )}

      {/* Comment list */}
      <Box role="region" aria-label="Comments" aria-live="polite">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : comments.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
            No comments yet — start the discussion!
          </Typography>
        ) : (
          comments.map((comment, i) => (
            <React.Fragment key={comment.id}>
              {i > 0 && <Divider sx={{ my: 0.5 }} />}
              <SingleComment
                comment={comment}
                isOwner={comment.author_id === currentUserId}
                isLoggedIn={isLoggedIn}
                replyingToId={replyTo?.id ?? null}
                onReply={handleReply}
                onDelete={handleDelete}
                isReply={false}
              />
              {comment.replies.map((reply) => (
                <SingleComment
                  key={reply.id}
                  comment={reply as HubComment}
                  isOwner={reply.author_id === currentUserId}
                  isLoggedIn={isLoggedIn}
                  replyingToId={null}
                  onReply={handleReply}
                  onDelete={handleDelete}
                  isReply
                />
              ))}
            </React.Fragment>
          ))
        )}
      </Box>
    </Box>
  );
};
