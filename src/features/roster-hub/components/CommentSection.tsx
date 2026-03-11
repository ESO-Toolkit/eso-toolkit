import { DeleteOutline, Person, Reply, Send } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import { rosterHubApi } from '../api/roster-hub-api';
import type { HubComment } from '../types/roster-hub.types';

interface CommentSectionProps {
  rosterId: string;
  isLoggedIn: boolean;
  currentUserId: string;
  token?: string;
}

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

const SingleComment: React.FC<{
  comment: HubComment;
  isOwner: boolean;
  isLoggedIn: boolean;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  isReply?: boolean;
}> = ({ comment, isOwner, isLoggedIn, onReply, onDelete, isReply = false }) => (
  <Box sx={{ pl: isReply ? 4 : 0, py: 1 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
      <Person sx={{ fontSize: 14, color: 'text.disabled' }} />
      <Typography variant="caption" fontWeight={600} color="text.secondary">
        {comment.author_name}
      </Typography>
      <Typography variant="caption" color="text.disabled">
        {formatRelativeTime(comment.created_at)}
      </Typography>
      <Box sx={{ ml: 'auto', display: 'flex', gap: 0.25 }}>
        {isLoggedIn && !isReply && (
          <Tooltip title="Reply">
            <IconButton size="small" onClick={() => onReply(comment.id)} sx={{ p: 0.25 }}>
              <Reply sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
        {isOwner && (
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete(comment.id)}
              sx={{ p: 0.25 }}
            >
              <DeleteOutline sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {comment.body}
    </Typography>
  </Box>
);

export const CommentSection: React.FC<CommentSectionProps> = ({
  rosterId,
  isLoggedIn,
  currentUserId,
  token,
}) => {
  const [comments, setComments] = React.useState<HubComment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [body, setBody] = React.useState('');
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

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

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!token || !body.trim() || submitting) return;

    setSubmitting(true);
    setError('');
    rosterHubApi
      .createComment(rosterId, { body: body.trim(), parent_id: replyTo ?? undefined }, token)
      .then(() => {
        setBody('');
        setReplyTo(null);
        fetchComments();
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to post comment'),
      )
      .finally(() => setSubmitting(false));
  };

  const handleDelete = (commentId: string): void => {
    if (!token) return;
    if (!window.confirm('Delete this comment?')) return;
    rosterHubApi
      .deleteComment(rosterId, commentId, token)
      .then(() => fetchComments())
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to delete comment'),
      );
  };

  const totalCount = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

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
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
          {replyTo && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="caption" color="primary">
                Replying to comment
              </Typography>
              <Button size="small" onClick={() => setReplyTo(null)} sx={{ minWidth: 0, p: 0 }}>
                Cancel
              </Button>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
              size="small"
              multiline
              maxRows={4}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
            <IconButton
              type="submit"
              color="primary"
              disabled={!body.trim() || submitting}
              sx={{ flexShrink: 0 }}
            >
              {submitting ? <CircularProgress size={20} /> : <Send />}
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" color="text.disabled" sx={{ mb: 2, display: 'block' }}>
          Log in to leave a comment.
        </Typography>
      )}

      {/* Comment list */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : comments.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
          No comments yet. Be the first!
        </Typography>
      ) : (
        comments.map((comment, i) => (
          <React.Fragment key={comment.id}>
            {i > 0 && <Divider />}
            <SingleComment
              comment={comment}
              isOwner={comment.author_id === currentUserId}
              isLoggedIn={isLoggedIn}
              onReply={setReplyTo}
              onDelete={handleDelete}
            />
            {comment.replies.map((reply) => (
              <SingleComment
                key={reply.id}
                comment={reply as HubComment}
                isOwner={reply.author_id === currentUserId}
                isLoggedIn={isLoggedIn}
                onReply={setReplyTo}
                onDelete={handleDelete}
                isReply
              />
            ))}
          </React.Fragment>
        ))
      )}
    </Box>
  );
};
