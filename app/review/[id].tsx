import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TBIcon } from '../../components/TBIcon';
import { TBStars, TBStarInput } from '../../components/TBStars';
import { useAuth } from '../../contexts/AuthContext';
import { apiJson } from '../../constants/api';
import { C, F } from '../../constants/theme';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ReviewUser {
  _id: string; name: string; handle: string; color: string; image: string | null;
}

interface ReviewDetail {
  _id: string; userId: string; isOwner: boolean;
  albumId: string; albumTitle: string; albumArtist: string;
  albumCoverUrl: string | null; albumGenre: string | null;
  rating: number; liked: boolean; review: string; createdAt: string;
  likeCount: number; commentCount: number; isLiked: boolean;
  user: ReviewUser;
}

interface CommentData {
  _id: string; text: string; createdAt: string; user: ReviewUser;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fullDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'maintenant';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Avatar({ user, size }: { user: ReviewUser; size: number }) {
  if (user.image) {
    return <Image source={{ uri: user.image }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: user.color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.headline, fontWeight: '800', fontSize: size * 0.42, color: '#0c0b0e' }}>
        {user.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function AlbumCover({ url, title, size }: { url: string | null; title: string; size: number }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: 12 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: '#1e1e2e', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.headline, fontWeight: '800', fontSize: size * 0.38, color: 'rgba(255,255,255,0.4)' }}>
        {title.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [review, setReview]     = useState<ReviewDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  // like state
  const [liked, setLiked]   = useState(false);
  const [likes, setLikes]   = useState(0);
  const [liking, setLiking] = useState(false);

  // edit state (owner)
  const [editing, setEditing]       = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editLiked, setEditLiked]   = useState(false);
  const [editText, setEditText]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);

  // comments
  const [comments, setComments]       = useState<CommentData[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentCount, setCommentCount] = useState(0);
  const [commentText, setCommentText]   = useState('');
  const [posting, setPosting]           = useState(false);

  useEffect(() => {
    if (!id) return;
    apiJson<ReviewDetail>(`/api/reviews/${id}`)
      .then(d => {
        setReview(d);
        setLiked(d.isLiked);
        setLikes(d.likeCount);
        setCommentCount(d.commentCount);
        setEditRating(d.rating);
        setEditLiked(d.liked);
        setEditText(d.review);
      })
      .catch(() => setNotFound(true));

    apiJson<CommentData[]>(`/api/reviews/${id}/comments`)
      .then(d => Array.isArray(d) ? setComments(d) : [])
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [id]);

  const toggleLike = async () => {
    if (liking) return;
    const next = !liked;
    setLiked(next); setLikes(n => n + (next ? 1 : -1));
    setLiking(true);
    try {
      await apiJson(`/api/reviews/${id}/like`, { method: next ? 'POST' : 'DELETE' });
    } catch {
      setLiked(!next); setLikes(n => n + (next ? -1 : 1));
    } finally { setLiking(false); }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await apiJson(`/api/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ rating: editRating, liked: editLiked, review: editText }),
      });
      setReview(prev => prev ? { ...prev, rating: editRating, liked: editLiked, review: editText } : prev);
      setEditing(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications.');
    } finally { setSaving(false); }
  };

  const deleteReview = () => {
    Alert.alert(
      'Supprimer la critique',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await apiJson(`/api/reviews/${id}`, { method: 'DELETE' });
              router.back();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer la critique.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const postComment = async () => {
    if (!commentText.trim() || posting) return;
    setPosting(true);
    try {
      const comment = await apiJson<CommentData>(`/api/reviews/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: commentText.trim() }),
      });
      setComments(prev => [...prev, comment]);
      setCommentText('');
      setCommentCount(n => n + 1);
    } catch {
      Alert.alert('Erreur', 'Impossible de poster le commentaire.');
    } finally { setPosting(false); }
  };

  if (notFound) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.notFoundTitle}>Critique introuvable</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!review) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={styles.screen}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <TBIcon name="back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Critique</Text>
          {review.isOwner ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {!editing && (
                <TouchableOpacity style={styles.headerBtn} onPress={() => setEditing(true)}>
                  <TBIcon name="pen" size={17} color={C.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.headerBtn, styles.headerBtnDanger]} onPress={deleteReview} disabled={deleting}>
                {deleting
                  ? <ActivityIndicator size="small" color="#ff5e7d" />
                  : <TBIcon name="trash" size={17} color="#ff5e7d" />
                }
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 18 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Review card */}
          <View style={styles.card}>
            {/* Album row */}
            <TouchableOpacity
              style={styles.albumRow}
              onPress={() => router.push(`/album/${review.albumId}` as any)}
              activeOpacity={0.75}
            >
              <AlbumCover url={review.albumCoverUrl} title={review.albumTitle} size={80} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                {review.albumGenre && (
                  <Text style={styles.genreLabel}>{review.albumGenre}</Text>
                )}
                <Text style={styles.albumTitle} numberOfLines={2}>{review.albumTitle}</Text>
                <Text style={styles.albumArtist} numberOfLines={1}>{review.albumArtist}</Text>

                {/* Rating */}
                {editing ? (
                  <TBStarInput value={editRating} onChange={setEditRating} size={22} color={C.accent} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <TBStars rating={review.rating} size={16} color={C.accent} />
                    <Text style={styles.ratingNum}>{review.rating}★</Text>
                    {review.liked && <TBIcon name="heart" size={15} color={C.liked} fill={C.liked} />}
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Like toggle in edit mode */}
            {editing && (
              <TouchableOpacity
                style={[styles.editLikeBtn, editLiked && styles.editLikeBtnActive]}
                onPress={() => setEditLiked(v => !v)}
              >
                <TBIcon name="heart" size={15} color={editLiked ? C.liked : C.textMuted} fill={editLiked ? C.liked : 'none'} />
                <Text style={[styles.editLikeBtnText, editLiked && { color: C.liked }]}>Favori</Text>
              </TouchableOpacity>
            )}

            {/* Author row */}
            <View style={styles.authorRow}>
              <Avatar user={review.user} size={28} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.authorName}>{review.user.name}</Text>
                <Text style={styles.authorHandle}>@{review.user.handle}</Text>
              </View>
              <Text style={styles.dateText}>{fullDate(review.createdAt)}</Text>
            </View>

            {/* Review text */}
            {editing ? (
              <View style={{ marginTop: 4 }}>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  placeholder="Ta critique…"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline maxLength={5000} textAlignVertical="top"
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.editSaveBtn, saving && { opacity: 0.6 }]}
                    onPress={saveEdit} disabled={saving}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color="#0c0b0e" />
                      : <Text style={styles.editSaveBtnText}>Enregistrer</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editCancelBtn}
                    onPress={() => {
                      setEditing(false);
                      setEditRating(review.rating);
                      setEditLiked(review.liked);
                      setEditText(review.review);
                    }}
                  >
                    <Text style={styles.editCancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : review.review ? (
              <Text style={styles.reviewText}>"{review.review}"</Text>
            ) : null}

            {/* Like bar */}
            <View style={styles.likeBar}>
              <TouchableOpacity
                style={[styles.likeBtn, liked && styles.likeBtnActive]}
                onPress={toggleLike} disabled={liking}
              >
                <TBIcon name="heart" size={16} color={liked ? C.liked : 'rgba(255,255,255,0.55)'} fill={liked ? C.liked : 'none'} />
                <Text style={[styles.likeBtnText, liked && { color: C.liked }]}>
                  {liked ? 'Aimé' : 'Aimer'}{likes > 0 ? ` · ${likes}` : ''}
                </Text>
              </TouchableOpacity>
              <Text style={styles.commentCountText}>
                {commentCount} commentaire{commentCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Comments section */}
          <View style={styles.commentsCard}>
            <Text style={styles.commentsLabel}>Commentaires</Text>

            {commentsLoading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 12 }} />
            ) : (
              <>
                {comments.length === 0 && (
                  <Text style={styles.noComments}>Aucun commentaire — sois le premier.</Text>
                )}
                {comments.map(c => (
                  <View key={c._id} style={styles.commentRow}>
                    <Avatar user={c.user} size={28} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                        <Text style={styles.commentAuthor}>{c.user.name}</Text>
                        <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                      </View>
                      <Text style={styles.commentText}>{c.text}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        </ScrollView>

        {/* Comment input */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            ref={inputRef}
            style={styles.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Ajouter un commentaire…"
            placeholderTextColor="rgba(255,255,255,0.3)"
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={postComment}
          />
          <TouchableOpacity
            style={[styles.postBtn, (!commentText.trim() || posting) && { opacity: 0.35 }]}
            onPress={postComment}
            disabled={!commentText.trim() || posting}
          >
            {posting
              ? <ActivityIndicator size="small" color="#0c0b0e" />
              : <Text style={styles.postBtnText}>Poster</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 11,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerBtnDanger: { borderColor: 'rgba(255,94,125,0.3)', backgroundColor: 'rgba(255,94,125,0.08)' },
  headerTitle: {
    flex: 1, fontFamily: F.headline, fontWeight: '800', fontSize: 18,
    color: C.text, letterSpacing: -0.4, textAlign: 'center',
  },

  card: {
    marginTop: 20,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: C.border,
    padding: 18,
  },
  albumRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  genreLabel: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2, color: C.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  albumTitle: { fontFamily: F.headline, fontWeight: '800', fontSize: 18, color: C.text, letterSpacing: -0.4, lineHeight: 22 },
  albumArtist: { fontSize: 13.5, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  ratingNum: { fontFamily: F.headline, fontWeight: '800', fontSize: 18, color: C.accent },

  editLikeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'flex-start', marginBottom: 14,
  },
  editLikeBtnActive: { borderColor: 'rgba(255,45,107,0.4)', backgroundColor: 'rgba(255,45,107,0.1)' },
  editLikeBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13, color: C.textMuted },

  authorRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border,
    marginBottom: 14,
  },
  authorName: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13, color: C.text },
  authorHandle: { fontFamily: F.mono, fontSize: 10.5, color: C.textMuted, marginTop: 1 },
  dateText: { fontFamily: F.mono, fontSize: 10.5, color: C.textFaint },

  reviewText: { fontSize: 15.5, lineHeight: 24, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', marginBottom: 16 },

  editInput: {
    color: '#fff', fontSize: 15, lineHeight: 23,
    minHeight: 100, textAlignVertical: 'top',
    padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: C.border,
    marginBottom: 12,
  },
  editActions: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  editSaveBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: C.text, minWidth: 110, alignItems: 'center' },
  editSaveBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 14, color: C.bg },
  editCancelBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  editCancelBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 14, color: C.textMuted },

  likeBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border, gap: 12,
  },
  likeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  likeBtnActive: { borderColor: 'rgba(255,45,107,0.35)', backgroundColor: 'rgba(255,45,107,0.12)' },
  likeBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13.5, color: 'rgba(255,255,255,0.55)' },
  commentCountText: { fontFamily: F.mono, fontSize: 11, color: C.textFaint },

  commentsCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: C.border,
    padding: 18,
  },
  commentsLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.5, color: C.textMuted, textTransform: 'uppercase', marginBottom: 14 },
  noComments: { fontSize: 13, color: C.textFaint, paddingBottom: 4 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  commentAuthor: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13, color: C.text },
  commentTime: { fontFamily: F.mono, fontSize: 10.5, color: C.textFaint },
  commentText: { fontSize: 13.5, color: 'rgba(255,255,255,0.75)', lineHeight: 20, marginTop: 3 },

  inputBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: C.bg,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  commentInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: C.border,
    color: '#fff', fontSize: 14,
  },
  postBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, backgroundColor: C.text,
    minWidth: 64, alignItems: 'center',
  },
  postBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13.5, color: C.bg },

  notFoundTitle: { fontFamily: F.headline, fontWeight: '800', fontSize: 22, color: C.text, marginBottom: 20 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  backBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 14, color: C.textMuted },
});
