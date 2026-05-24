import { DeleteOutlined, Reply, Send } from '@mui/icons-material';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  InputBase,
  Tooltip,
  Typography,
  useTheme,
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
}> = React.memo(
  ({ comment, isOwner, isLoggedIn, replyingToId, onReply, onDelete, isReply = false }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const initial = (comment.author_name || '?')[0].toUpperCase();
    const hue = comment.author_name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    const avatarColor = `hsl(${hue}, 55%, 55%)`;
    const isActive = replyingToId === comment.id;

    return (
      <Box
        sx={{
          display: 'flex',
          gap: 1.25,
          pl: isReply ? 5 : 0,
          py: 0.5,
          position: 'relative',
          '&:hover .comment-actions': { opacity: 1 },
        }}
      >
        {/* Thread connector for replies */}
        {isReply && (
          <Box
            sx={{
              position: 'absolute',
              left: 19,
              top: -8,
              height: 'calc(50% + 8px)',
              width: 20,
              borderLeft: isDark
                ? `2px solid rgba(120,130,180,0.35)`
                : `2px solid rgba(0,0,0,0.18)`,
              borderBottom: isDark
                ? `2px solid rgba(120,130,180,0.35)`
                : `2px solid rgba(0,0,0,0.18)`,
              borderBottomLeftRadius: '12px',
            }}
            aria-hidden="true"
          />
        )}

        {/* Avatar */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${avatarColor}35 0%, ${avatarColor}18 100%)`,
            border: `1.5px solid ${avatarColor}50`,
            boxShadow: `0 0 8px ${avatarColor}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            mt: 0.25,
          }}
        >
          <Typography
            sx={{ fontSize: '0.72rem', fontWeight: 800, color: avatarColor, lineHeight: 1 }}
          >
            {initial}
          </Typography>
        </Box>

        {/* Message bubble */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              py: 0.75,
              px: 1.25,
              borderRadius: '14px',
              borderTopLeftRadius: '4px',
              background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.07)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
              transition: 'all 0.15s ease',
              '&:hover': {
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.055)',
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.08)',
              },
            }}
          >
            {/* Author + time inside the bubble */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mb: 0.35 }}>
              <Typography
                sx={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: avatarColor,
                  lineHeight: 1.2,
                }}
              >
                {comment.author_name}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.62rem',
                  color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)',
                  lineHeight: 1.2,
                }}
              >
                {formatRelativeTime(comment.created_at)}
              </Typography>
            </Box>

            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '0.82rem',
                lineHeight: 1.55,
                color: isDark ? 'rgba(255,255,255,0.82)' : 'text.primary',
              }}
            >
              {comment.body}
            </Typography>
          </Box>

          {/* Action buttons — float below the bubble */}
          <Box
            className="comment-actions"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.35,
              ml: 0.75,
              opacity: isActive ? 1 : 0,
              transition: 'opacity 0.15s ease',
            }}
          >
            {isLoggedIn && !isReply && (
              <Tooltip title={`Reply`} arrow>
                <IconButton
                  size="small"
                  onClick={() => onReply(comment.id, comment.author_name)}
                  aria-label={`Reply to ${comment.author_name}`}
                  sx={{
                    p: 0.35,
                    borderRadius: '8px',
                    color: isActive ? 'primary.main' : 'text.disabled',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                    },
                  }}
                >
                  <Reply sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
            {isOwner && (
              <Tooltip title="Delete" arrow>
                <IconButton
                  size="small"
                  onClick={() => onDelete(comment.id)}
                  aria-label="Delete comment"
                  sx={{
                    p: 0.35,
                    borderRadius: '8px',
                    color: isDark ? 'rgba(239,68,68,0.6)' : 'rgba(239,68,68,0.5)',
                    '&:hover': {
                      color: '#ef4444',
                      bgcolor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                    },
                  }}
                >
                  <DeleteOutlined sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>
    );
  },
);

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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [comments, setComments] = React.useState<HubComment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [body, setBody] = React.useState('');
  const [replyTo, setReplyTo] = React.useState<{ id: string; authorName: string } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
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

    const tempId = `pending-${window.crypto.randomUUID()}`;
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
          c.id === replyTo.id ? { ...c, replies: [...c.replies, optimisticComment] } : c,
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
        fetchComments();
      })
      .catch((err: unknown) => {
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

  React.useEffect(() => {
    onCountChange?.(totalCount);
  }, [totalCount, onCountChange]);

  const charsLeft = MAX_BODY_LENGTH - body.length;
  const isNearLimit = charsLeft <= 100;

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 1, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Comment form — modern pill input */}
      {isLoggedIn ? (
        <Box sx={{ mb: 1.5 }}>
          {replyTo && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                mb: 0.75,
                px: 1.5,
                py: 0.5,
                borderRadius: '10px',
                background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
                border: isDark
                  ? '1px solid rgba(99,102,241,0.2)'
                  : '1px solid rgba(99,102,241,0.15)',
              }}
            >
              <Reply sx={{ fontSize: 14, color: 'primary.main' }} />
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'primary.main',
                }}
              >
                Replying to {replyTo.authorName}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  color: 'text.disabled',
                  cursor: 'pointer',
                  ml: 'auto',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: '6px',
                  '&:hover': {
                    color: 'text.secondary',
                    bgcolor: 'action.hover',
                  },
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </Typography>
            </Box>
          )}
          <form onSubmit={handleSubmit}>
            <div
              className="MuiCommentInput-root"
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '6px',
                padding: '4px',
                paddingLeft: '12px',
                borderRadius: '16px',
                backgroundColor: isDark ? 'rgb(40, 48, 72)' : 'rgba(255,255,255,0.7)',
                border: isDark ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(0,0,0,0.09)',
                transition: 'all 0.2s ease',
              }}
            >
              <InputBase
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={replyTo ? `Reply to ${replyTo.authorName}…` : 'Write a comment…'}
                multiline
                maxRows={4}
                fullWidth
                aria-label="Comment text"
                inputProps={{ maxLength: MAX_BODY_LENGTH }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
                sx={{
                  fontSize: '0.82rem',
                  py: 0.75,
                  '&.MuiInputBase-root': {
                    backgroundColor: 'transparent !important',
                    '&:hover': {
                      backgroundColor: 'transparent !important',
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    opacity: 0.5,
                  },
                }}
              />
              {isNearLimit && (
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    color: charsLeft <= 0 ? 'error.main' : 'warning.main',
                    whiteSpace: 'nowrap',
                    pb: 1,
                    pr: 0.5,
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {charsLeft}
                </Typography>
              )}
              <IconButton
                type="submit"
                disabled={!body.trim() || submitting}
                aria-label="Post comment"
                sx={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: '12px',
                  background:
                    body.trim() && !submitting
                      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                      : isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.04)',
                  color: body.trim() && !submitting ? '#fff' : 'text.disabled',
                  boxShadow:
                    body.trim() && !submitting ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background:
                      body.trim() && !submitting
                        ? 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)'
                        : 'action.hover',
                    transform: body.trim() ? 'scale(1.05)' : 'none',
                  },
                  '&:disabled': {
                    color: 'text.disabled',
                  },
                }}
              >
                {submitting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Send sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </div>
          </form>
        </Box>
      ) : (
        <Box
          sx={{
            mb: 1.5,
            py: 1,
            px: 1.5,
            borderRadius: '12px',
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)',
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.78rem',
              color: 'text.disabled',
            }}
          >
            Log in to join the conversation
          </Typography>
        </Box>
      )}

      {/* Comment list */}
      <Box role="region" aria-label="Comments" aria-live="polite">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={22} />
          </Box>
        ) : comments.length === 0 ? (
          <Box
            sx={{
              py: 2.5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '14px',
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ fontSize: '1.1rem', lineHeight: 1, opacity: 0.4 }}>💬</Typography>
            </Box>
            <Typography
              sx={{
                fontSize: '0.78rem',
                color: 'text.disabled',
                fontWeight: 500,
              }}
            >
              No comments yet
            </Typography>
            <Typography
              sx={{
                fontSize: '0.68rem',
                color: 'text.disabled',
                opacity: 0.6,
              }}
            >
              Be the first to share your thoughts
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            {comments.map((comment) => (
              <React.Fragment key={comment.id}>
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
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
