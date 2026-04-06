import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { commentsApi } from '../api/commentsApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface Comment {
  _id: string;
  movieId: number;
  type: 'movie' | 'tvshow';
  userId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
}

interface CommentsProps {
  movieId: number | string;
  type: 'movie' | 'tvshow';
  title?: string;
}

const COMMENTS_PER_PAGE = 3;

export default function Comments({ movieId, type, title }: CommentsProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAuthenticated = !!user;

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalComments, setTotalComments] = useState(0);

  // States for reply/edit
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const [showReplies, setShowReplies] = useState<Set<string>>(new Set());

  // Action Menu
  const [actionOpenId, setActionOpenId] = useState<string | null>(null);

  const fetchComments = async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) setIsLoading(true);
    try {
      const response = await commentsApi.getComments(movieId, type, sortBy, pageNum, COMMENTS_PER_PAGE);
      if (response.success) {
        if (append) {
          setComments(prev => [...prev, ...response.data]);
        } else {
          setComments(response.data);
        }
        setTotalComments(response.total);
        setHasMore(response.page < response.totalPages);
      }
    } catch (e: any) {
      showToast('Failed to load comments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchComments(1, false);
  }, [movieId, type, sortBy]);

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchComments(nextPage, true);
    }
  };

  const submitComment = async () => {
    if (!isAuthenticated) return showToast('Please log in to comment', 'error');
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await commentsApi.postComment({
        movieId,
        type,
        content: newComment.trim()
      });
      if (response.success) {
        setComments(prev => [response.data, ...prev]);
        setTotalComments(prev => prev + 1);
        setNewComment('');
        showToast('Comment added successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add comment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReply = async (parentId: string) => {
    if (!isAuthenticated) return showToast('Please log in to reply', 'error');
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await commentsApi.postComment({
        movieId,
        type,
        content: replyText.trim(),
        parentId
      });
      if (response.success) {
        setComments(prev =>
          prev.map(c =>
            c._id === parentId
              ? { ...c, replies: [...(c.replies || []), response.data] }
              : c
          )
        );
        setReplyText('');
        setReplyingTo(null);
        showToast('Reply added successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add reply', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitEdit = async () => {
    if (!editingId || !editText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await commentsApi.updateComment(editingId, editText.trim());
      if (res.success) {
        const updated = res.data;
        setComments(prev =>
          prev.map(c =>
            c._id === editingId ? { ...c, content: updated.content, updatedAt: updated.updatedAt } : c
          )
        );
        setEditingId(null);
        setEditText('');
        setActionOpenId(null);
        showToast('Comment updated', 'success');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await commentsApi.deleteComment(id);
            if (res.success) {
              setComments(prev => prev.filter(c => c._id !== id));
              setTotalComments(prev => Math.max(0, prev - 1));
              showToast('Deleted item successfully', 'success');
            }
          } catch (e) {
            showToast('Failed to delete comment', 'error');
          }
        }
      }
    ]);
  };

  const handleLike = async (commentId: string, isReply: boolean = false, parentId?: string) => {
    if (!isAuthenticated) return showToast('Please log in to like', 'error');
    try {
      const res = await commentsApi.likeComment(commentId);
      if (res.success) {
        const updated = res.data;
        if (isReply && parentId) {
          setComments(prev => prev.map(c =>
            c._id === parentId
              ? {
                  ...c,
                  replies: c.replies?.map(r => r._id === commentId ? { ...r, isLiked: updated.isLiked, likes: updated.likes } : r)
                }
              : c
          ));
        } else {
          setComments(prev => prev.map(c =>
            c._id === commentId ? { ...c, isLiked: updated.isLiked, likes: updated.likes } : c
          ));
        }
      }
    } catch (e) {
      // Like failed
    }
  };

  const toggleReplies = (id: string) => {
    setShowReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="chatbubbles-outline" size={24} color="#ef4444" />
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalComments}</Text>
        </View>
      </View>

      {/* Input section */}
      <View style={styles.inputCard}>
        <View style={styles.inputRow}>
          {isAuthenticated && user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : isAuthenticated ? (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
            </View>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#9ca3af" />
            </View>
          )}
          <TextInput
            style={styles.textInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder={isAuthenticated ? "Share your thoughts..." : "Please log in to comment"}
            placeholderTextColor="#9ca3af"
            editable={isAuthenticated}
            multiline
            maxLength={500}
          />
        </View>
        <View style={styles.inputActions}>
          <Text style={styles.charCount}>{newComment.length}/500</Text>
          <TouchableOpacity
            style={[styles.postButton, (!isAuthenticated || !newComment.trim() || isSubmitting) && styles.postButtonDisabled]}
            disabled={!isAuthenticated || !newComment.trim() || isSubmitting}
            onPress={submitComment}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Sorters */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {['newest', 'oldest', 'popular'].map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.sortBtn, sortBy === opt && styles.sortBtnActive]}
            onPress={() => setSortBy(opt as any)}
          >
            <Text style={[styles.sortBtnText, sortBy === opt && styles.sortBtnTextActive]}>
              {opt === 'popular' ? 'Most Liked' : opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Comment List */}
      {isLoading ? (
        <View style={{ padding: 20 }}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : (
        comments.map((comment) => (
          <View key={comment._id} style={styles.commentItem}>
            <View style={styles.commentHeader}>
              <View style={styles.commentUserRow}>
                {comment.userId?.avatar ? (
                  <Image source={{ uri: comment.userId.avatar }} style={styles.avatarSmall} />
                ) : (
                  <View style={styles.avatarPlaceholderSmall}>
                    <Text style={styles.avatarInitialSmall}>{comment.userId?.name?.charAt(0).toUpperCase() || '?'}</Text>
                  </View>
                )}
                <View style={styles.commentMeta}>
                  <Text style={styles.commentName}>{comment.userId?.name || 'Unknown User'}</Text>
                  <Text style={styles.commentTime}>{formatTime(comment.createdAt)}</Text>
                </View>
              </View>
              {isAuthenticated && user?.id === comment.userId?._id && (
                <TouchableOpacity onPress={() => setActionOpenId(actionOpenId === comment._id ? null : comment._id)}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            {/* Actions Menu */}
            {actionOpenId === comment._id && (
              <View style={styles.actionMenu}>
                <TouchableOpacity style={styles.actionMenuItem} onPress={() => { setEditingId(comment._id); setEditText(comment.content); }}>
                  <Text style={styles.actionMenuText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionMenuItem} onPress={() => handleDelete(comment._id)}>
                  <Text style={styles.actionMenuTextDelete}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Content */}
            {editingId === comment._id ? (
              <View style={styles.editCard}>
                <TextInput
                  style={styles.textInput}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                />
                <View style={styles.editActions}>
                  <TouchableOpacity onPress={() => { setEditingId(null); setEditText(''); setActionOpenId(null); }} style={styles.editBtnCancel}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={submitEdit} style={styles.editBtnSave}>
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.commentContent}>{comment.content}</Text>
            )}

            {/* Footer actions */}
            <View style={styles.commentActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(comment._id)}>
                <Ionicons name={comment.isLiked ? "heart" : "heart-outline"} size={16} color={comment.isLiked ? "#ef4444" : "#9ca3af"} />
                <Text style={styles.actionBtnText}>{comment.likes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}>
                <Ionicons name="chatbubble-outline" size={16} color="#9ca3af" />
                <Text style={styles.actionBtnText}>Reply</Text>
              </TouchableOpacity>
              {comment.replies && comment.replies.length > 0 && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => toggleReplies(comment._id)}>
                  <Text style={styles.actionBtnText}>
                    {showReplies.has(comment._id) ? 'Hide' : 'Show'} {comment.replies.length} replies
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Reply Input */}
            {replyingTo === comment._id && (
              <View style={styles.replyBox}>
                <TextInput
                  style={[styles.textInput, { fontSize: 13, height: 60 }]}
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Type your reply..."
                  placeholderTextColor="#9ca3af"
                  multiline
                />
                <View style={styles.editActions}>
                  <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.editBtnCancel}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => submitReply(comment._id)} style={styles.editBtnSave}>
                    <Text style={styles.saveText}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Replies items */}
            {showReplies.has(comment._id) && comment.replies && comment.replies.map(reply => (
              <View key={reply._id} style={styles.replyItem}>
                <View style={styles.commentUserRow}>
                  {reply.userId?.avatar ? (
                    <Image source={{ uri: reply.userId.avatar }} style={styles.avatarTiny} />
                  ) : (
                    <View style={styles.avatarPlaceholderTiny}>
                      <Text style={styles.avatarInitialTiny}>{reply.userId?.name?.charAt(0).toUpperCase() || '?'}</Text>
                    </View>
                  )}
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentNameSmall}>{reply.userId?.name || 'Unknown User'}</Text>
                    <Text style={styles.commentTimeSmall}>{formatTime(reply.createdAt)}</Text>
                  </View>
                </View>
                <Text style={styles.replyContent}>{reply.content}</Text>
                <View style={styles.commentActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(reply._id, true, comment._id)}>
                    <Ionicons name={reply.isLiked ? "heart" : "heart-outline"} size={14} color={reply.isLiked ? "#ef4444" : "#9ca3af"} />
                    <Text style={styles.actionBtnText}>{reply.likes}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))
      )}

      {hasMore && !isLoading && (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 10,
  },
  badgeText: {
    color: '#f3f4f6',
    fontSize: 12,
  },
  inputCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    color: '#fff',
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingLeft: 50,
  },
  charCount: {
    color: '#9ca3af',
    fontSize: 12,
  },
  postButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  postButtonDisabled: {
    backgroundColor: '#4b5563',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sortLabel: {
    color: '#d1d5db',
    fontSize: 14,
    marginRight: 10,
  },
  sortBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  sortBtnActive: {
    backgroundColor: '#ef4444',
  },
  sortBtnText: {
    color: '#d1d5db',
    fontSize: 12,
  },
  sortBtnTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  commentItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.3)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  avatarPlaceholderSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitialSmall: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentMeta: {
    justifyContent: 'center',
  },
  commentName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  commentTime: {
    color: '#9ca3af',
    fontSize: 12,
  },
  commentContent: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  actionBtnText: {
    color: '#9ca3af',
    fontSize: 12,
    marginLeft: 4,
  },
  actionMenu: {
    position: 'absolute',
    top: 30,
    right: 15,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 5,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  actionMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  actionMenuText: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  actionMenuTextDelete: {
    color: '#f87171',
    fontSize: 14,
  },
  editCard: {
    marginTop: 5,
    marginBottom: 10,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  editBtnCancel: {
    padding: 8,
    marginRight: 10,
  },
  cancelText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  editBtnSave: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  replyBox: {
    marginTop: 15,
    marginLeft: 42,
  },
  replyItem: {
    marginTop: 15,
    marginLeft: 42,
    borderLeftWidth: 2,
    borderLeftColor: '#374151',
    paddingLeft: 10,
  },
  avatarTiny: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  avatarPlaceholderTiny: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarInitialTiny: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  commentNameSmall: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 12,
  },
  commentTimeSmall: {
    color: '#9ca3af',
    fontSize: 10,
  },
  replyContent: {
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 15,
    borderColor: '#4b5563',
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 5,
  },
  loadMoreText: {
    color: '#d1d5db',
    fontWeight: '600',
  }
});
