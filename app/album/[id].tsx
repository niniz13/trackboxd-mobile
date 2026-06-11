import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Animated, Easing, View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TBStars, TBStarInput } from '../../components/TBStars';
import { TBIcon } from '../../components/TBIcon';
import { useAuth } from '../../contexts/AuthContext';
import { apiJson } from '../../constants/api';
import { C, F } from '../../constants/theme';

interface AlbumPalette { bg: string; ink: string; c1: string; c2: string; c3: string; style: string; }
interface AlbumData {
  id: string; title: string; artist: string; year: number;
  type: string; genre: string; len: number;
  pal: AlbumPalette; tracks: string[]; coverUrl?: string;
}
interface FeedEntry {
  _id: string; userId: string; albumId: string;
  albumTitle: string; albumArtist: string; albumCoverUrl: string | null;
  rating: number; liked: boolean; review: string;
  createdAt: string; likeCount: number; commentCount: number; isLiked: boolean;
  user: { name: string; handle: string; color: string; image?: string | null };
}

function UserAvatar({ user, size }: { user: FeedEntry['user']; size: number }) {
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

const DEFAULT_PAL: AlbumPalette = { bg: '#1a0a2e', ink: '#fff', c1: '#7b2dff', c2: '#ff2d95', c3: '#2d6bff', style: 'rings' };

interface DynamicPal { bg: string; c1: string; c2: string; ink: string; }

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const spotifyId = id?.replace(/^sp_/, '') ?? '';

  const [album, setAlbum]       = useState<AlbumData | null>(null);
  const [reviews, setReviews]   = useState<FeedEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [dynPal, setDynPal]     = useState<DynamicPal | null>(null);

  // my rating/like/review state
  const [myRating, setMyRating] = useState(0);
  const [myLiked, setMyLiked]   = useState(false);
  const [myReview, setMyReview] = useState('');
  const [saving, setSaving]     = useState(false);
  const [saveOk, setSaveOk]     = useState(false);

  // review modal state
  const [showModal, setShowModal]     = useState(false);
  const [ratingDraft, setRatingDraft] = useState(0);
  const [likedDraft, setLikedDraft]   = useState(false);
  const [reviewDraft, setReviewDraft] = useState('');

  // auto-save refs
  const userInteracted = useRef(false);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // animation refs
  const starBounce   = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const heartBounce  = useRef(new Animated.Value(1)).current;
  const particles    = useRef(Array.from({ length: 8 }, () => new Animated.Value(0))).current;

  const loadReviews = useCallback(async () => {
    const data = await apiJson<FeedEntry[]>(`/api/feed?albumId=${id}`);
    return data;
  }, [id]);

  const load = useCallback(async () => {
    try {
      const [albumData, feedData] = await Promise.all([
        apiJson<AlbumData>(`/api/spotify/album/${spotifyId}`),
        loadReviews(),
      ]);
      setAlbum(albumData);
      setReviews(feedData);
      const mine = feedData.find(r => r.userId === user?.id);
      if (mine) {
        setMyRating(mine.rating);
        setMyLiked(mine.liked);
        setMyReview(mine.review ?? '');
        setSaveOk(true);
      }
      // mark initial load complete so auto-save doesn't fire on pre-population
      userInteracted.current = false;
      // fetch dynamic palette from cover (non-blocking)
      apiJson<DynamicPal>(`/api/spotify/album/${spotifyId}/colors`)
        .then(setDynPal)
        .catch(() => {});
    } catch { /* show error state */ }
    finally { setLoading(false); }
  }, [id, spotifyId, user?.id, loadReviews]);

  useEffect(() => { load(); }, [load]);

  const saveToApi = useCallback(async (r: number, l: boolean, rv: string) => {
    if (!album) return;
    if (!r && !l && !rv.trim()) return;
    setSaving(true);
    setSaveOk(false);
    try {
      await apiJson('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          albumId: album.id, albumTitle: album.title, albumArtist: album.artist,
          albumCoverUrl: album.coverUrl ?? null, albumGenre: album.genre || null,
          rating: r, liked: l, review: rv,
        }),
      });
      setSaveOk(true);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [album]);

  // Auto-save when user changes rating or liked
  useEffect(() => {
    if (!userInteracted.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveToApi(myRating, myLiked, myReview);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [myRating, myLiked]);

  const triggerRatingAnimation = useCallback(() => {
    particles.forEach(p => p.setValue(0));
    starBounce.setValue(1.22);
    Animated.spring(starBounce, { toValue: 1, useNativeDriver: true, damping: 5, stiffness: 200, mass: 0.5 }).start();
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.22, duration: 55, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 480, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
    Animated.parallel(
      particles.map(p => Animated.timing(p, { toValue: 1, duration: 580, useNativeDriver: true, easing: Easing.out(Easing.cubic) }))
    ).start();
  }, []);

  const triggerHeartAnimation = useCallback((toLiked: boolean) => {
    heartBounce.setValue(toLiked ? 1.45 : 0.72);
    Animated.spring(heartBounce, { toValue: 1, useNativeDriver: true, damping: 5, stiffness: 260, mass: 0.45 }).start();
  }, []);

  const openModal = () => {
    setRatingDraft(myRating);
    setLikedDraft(myLiked);
    setReviewDraft(myReview);
    setShowModal(true);
  };

  const handleSubmitReview = async () => {
    if (!album || saving) return;
    setSaving(true);
    try {
      await apiJson('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          albumId: album.id, albumTitle: album.title, albumArtist: album.artist,
          albumCoverUrl: album.coverUrl ?? null, albumGenre: album.genre || null,
          rating: ratingDraft, liked: likedDraft, review: reviewDraft.trim(),
        }),
      });
      setMyRating(ratingDraft);
      setMyLiked(likedDraft);
      setMyReview(reviewDraft.trim());
      setSaveOk(true);
      userInteracted.current = false; // prevent auto-save re-trigger after modal update
      setShowModal(false);
      const fresh = await loadReviews();
      setReviews(fresh);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!album) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.textMuted }}>Album introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: C.accent }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p = album.pal ?? DEFAULT_PAL;
  const banner = dynPal ?? p;

  // Merge the user's live rating so stats update instantly without a reload
  const statsReviews = user
    ? [
        ...reviews.filter(r => r.userId !== user.id),
        ...(myRating > 0 ? [{ rating: myRating } as FeedEntry] : []),
      ]
    : reviews;
  const dist = [1, 2, 3, 4, 5].map(star => statsReviews.filter(r => Math.round(r.rating) === star).length);
  const maxDist = Math.max(...dist, 1);
  const avgRating = statsReviews.length
    ? (statsReviews.reduce((s, r) => s + r.rating, 0) / statsReviews.length).toFixed(1)
    : '—';
  const textReviews = reviews.filter(r => r.review?.trim());

  return (
    <>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {/* gradient header */}
          <LinearGradient colors={[banner.bg, banner.bg, C.bg]} locations={[0, 0.4, 1]} style={styles.headerGrad}>
            <LinearGradient colors={[`${banner.c1}44`, 'transparent']} style={[StyleSheet.absoluteFill, { height: 280 }]} />

            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity onPress={() => router.back()} style={[styles.glassBtn, { borderColor: `${banner.ink}30` }]}>
                <TBIcon name="back" size={22} color={banner.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.hero}>
              <View style={[styles.coverShadow, { shadowColor: banner.c1 }]}>
                {album.coverUrl
                  ? <Image source={{ uri: album.coverUrl }} style={{ width: 188, height: 188, borderRadius: 18 }} />
                  : <View style={{ width: 188, height: 188, borderRadius: 18, backgroundColor: banner.c1 }} />
                }
              </View>
              <Text style={[styles.albumTitle, { color: banner.ink }]}>{album.title}</Text>
              <Text style={[styles.albumArtist, { color: banner.ink }]}>{album.artist}</Text>
              <Text style={[styles.albumMeta, { color: banner.ink }]}>
                {album.type.toUpperCase()} · {album.year} · {album.len} TRACKS{album.genre ? ` · ${album.genre.toUpperCase()}` : ''}
              </Text>
            </View>
          </LinearGradient>

          {/* global rating */}
          <View style={styles.ratingRow}>
            <View style={styles.ratingBig}>
              <Text style={styles.ratingNum}>{avgRating}</Text>
              <Text style={styles.ratingVotes}>{statsReviews.length} rating{statsReviews.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.distBars}>
              {dist.slice().reverse().map((v, i) => (
                <View key={i} style={styles.distRow}>
                  <Text style={styles.distLabel}>{5 - i}</Text>
                  <View style={styles.distBarBg}>
                    <View style={[styles.distBarFill, { width: `${(v / maxDist) * 100}%` as any, backgroundColor: 'rgba(255,255,255,0.18)' }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* my rating card */}
          {user && (
            <View style={styles.myRatingCard}>
              {/* accent flash on rating */}
              <Animated.View
                style={[StyleSheet.absoluteFill, { borderRadius: 16, backgroundColor: banner.c1, opacity: flashOpacity }]}
                pointerEvents="none"
              />

              <View style={styles.myRatingLabelRow}>
                <Text style={styles.myRatingLabel}>{myRating > 0 ? 'Ma note' : 'Noter'}</Text>
                {saving && <ActivityIndicator size="small" color="rgba(255,255,255,0.35)" style={{ marginLeft: 6 }} />}
                {!saving && saveOk && <TBIcon name="check" size={11} color="#4ade80" strokeWidth={2.5} />}
              </View>

              <Animated.View style={{ transform: [{ scale: starBounce }] }}>
                <TBStarInput
                  value={myRating}
                  onChange={v => {
                    userInteracted.current = true;
                    setSaveOk(false);
                    setMyRating(v);
                    triggerRatingAnimation();
                  }}
                  size={36}
                  color={myRating > 0 ? '#fff' : 'rgba(255,255,255,0.35)'}
                />
              </Animated.View>

              <View style={styles.dividerV} />

              <TouchableOpacity
                onPress={() => {
                  userInteracted.current = true;
                  setSaveOk(false);
                  const next = !myLiked;
                  setMyLiked(next);
                  triggerHeartAnimation(next);
                }}
                style={styles.likeBtn}
              >
                <Animated.View style={{ transform: [{ scale: heartBounce }] }}>
                  <TBIcon name="heart" size={28} color={myLiked ? C.liked : 'rgba(255,255,255,0.4)'} fill={myLiked ? C.liked : 'none'} />
                </Animated.View>
                <Text style={[styles.likeLabel, myLiked && { color: C.liked }]}>{myLiked ? 'Aimé' : 'Aimer'}</Text>
              </TouchableOpacity>

              {/* particle burst */}
              <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
                {particles.map((anim, i) => {
                  const angle = (i / particles.length) * Math.PI * 2 - Math.PI / 2;
                  const d = 52;
                  const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * d] });
                  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * d] });
                  const opacity = anim.interpolate({ inputRange: [0, 0.12, 0.65, 1], outputRange: [0, 1, 1, 0] });
                  const scale = anim.interpolate({ inputRange: [0, 0.14, 1], outputRange: [0, 1.3, 0.6] });
                  const sz = i % 2 === 0 ? 7 : 5;
                  return (
                    <Animated.View
                      key={i}
                      style={{
                        position: 'absolute',
                        width: sz, height: sz, borderRadius: sz / 2,
                        backgroundColor: i % 2 === 0 ? banner.c1 : '#fff',
                        opacity, transform: [{ translateX: tx }, { translateY: ty }, { scale }],
                      }}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* write / edit review CTA — always visible when logged in */}
          {user && (
            <TouchableOpacity style={styles.reviewCta} onPress={openModal} activeOpacity={0.75}>
              {myReview ? (
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewCtaHint}>Ma critique</Text>
                  <Text style={styles.reviewCtaText} numberOfLines={2}>{myReview}</Text>
                </View>
              ) : (
                <>
                  <TBIcon name="pen" size={15} color={C.accent} />
                  <Text style={styles.reviewCtaWrite}>Écrire une critique</Text>
                </>
              )}
              <TBIcon name="pen" size={14} color="rgba(255,255,255,0.25)" />
            </TouchableOpacity>
          )}

          {/* tracklist */}
          {album.tracks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tracklist · {album.len}</Text>
              {album.tracks.map((t, i) => (
                <View key={i} style={styles.trackRow}>
                  <Text style={[styles.trackNum, { color: 'rgba(255,255,255,0.3)' }]}>{String(i + 1).padStart(2, '0')}</Text>
                  <Text style={styles.trackName} numberOfLines={1}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* reviews */}
          {textReviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Critiques · {textReviews.length}</Text>
              {textReviews.map(r => (
                <TouchableOpacity
                  key={r._id}
                  style={styles.reviewCard}
                  onPress={() => router.push(`/review/${r._id}` as any)}
                  activeOpacity={0.75}
                >
                  <View style={styles.reviewHeader}>
                    <UserAvatar user={r.user} size={32} />
                    <View style={styles.flex}>
                      <Text style={styles.reviewUser}>{r.user.name}</Text>
                      <Text style={styles.reviewHandle}>@{r.user.handle}</Text>
                    </View>
                    <TBStars rating={r.rating} size={12} color="#fff" />
                  </View>
                  <Text style={styles.reviewText}>{r.review}</Text>
                  <Text style={styles.reviewReplyBtn}>Répondre</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* review modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              {/* album preview */}
              <View style={styles.modalAlbumRow}>
                {album.coverUrl
                  ? <Image source={{ uri: album.coverUrl }} style={{ width: 48, height: 48, borderRadius: 8 }} />
                  : <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                }
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.modalAlbumTitle} numberOfLines={1}>{album.title}</Text>
                  <Text style={styles.modalAlbumArtist} numberOfLines={1}>{album.artist}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <TBIcon name="close" size={20} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>

              {/* rating + like inside modal */}
              <View style={styles.modalRatingRow}>
                <TBStarInput
                  value={ratingDraft}
                  onChange={setRatingDraft}
                  size={34}
                  color={ratingDraft > 0 ? '#fff' : 'rgba(255,255,255,0.35)'}
                />
                <View style={styles.modalDividerV} />
                <TouchableOpacity onPress={() => setLikedDraft(v => !v)} style={styles.modalLikeBtn}>
                  <TBIcon name="heart" size={26} color={likedDraft ? C.liked : 'rgba(255,255,255,0.35)'} fill={likedDraft ? C.liked : 'none'} />
                  <Text style={[styles.modalLikeLabel, likedDraft && { color: C.liked }]}>
                    {likedDraft ? 'Aimé' : 'Aimer'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* review textarea */}
              <TextInput
                style={styles.modalTextInput}
                value={reviewDraft}
                onChangeText={setReviewDraft}
                placeholder="Qu'est-ce que ça t'a fait ressentir ?"
                placeholderTextColor="rgba(255,255,255,0.25)"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={5000}
              />

              {/* buttons */}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowModal(false)}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirm, { backgroundColor: C.accent }, saving && styles.modalConfirmDisabled]}
                  onPress={handleSubmitReview}
                  disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.modalConfirmText}>Publier</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerGrad: { paddingBottom: 32 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  glassBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 4 },
  coverShadow: { shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.6, shadowRadius: 30 },
  albumTitle: { fontFamily: F.headline, fontWeight: '800', fontSize: 30, letterSpacing: -1, textAlign: 'center', marginTop: 18, lineHeight: 34 },
  albumArtist: { fontSize: 16, fontWeight: '600', marginTop: 8, opacity: 0.82 },
  albumMeta: { fontFamily: F.mono, fontSize: 11, letterSpacing: 0.5, marginTop: 6, opacity: 0.55, textAlign: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, gap: 18 },
  ratingBig: { alignItems: 'center' },
  ratingNum: { fontFamily: F.headline, fontWeight: '800', fontSize: 44, color: C.text, lineHeight: 48, letterSpacing: -1 },
  ratingVotes: { fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginTop: 2 },
  distBars: { flex: 1, gap: 4 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distLabel: { fontFamily: F.mono, fontSize: 10, color: C.textMuted, width: 10 },
  distBarBg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  distBarFill: { height: '100%', borderRadius: 2 },
  myRatingCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginTop: 20, padding: 16, paddingTop: 28, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.border, gap: 14 },
  myRatingLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, position: 'absolute', top: 10, left: 16 },
  myRatingLabel: { fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.2, color: C.textMuted, textTransform: 'uppercase' },
  dividerV: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.12)' },
  likeBtn: { alignItems: 'center', gap: 4 },
  likeLabel: { fontFamily: F.mono, fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 },
  // review CTA
  reviewCta: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginTop: 10, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.border, gap: 10 },
  reviewCtaHint: { fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1, color: C.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  reviewCtaText: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.75)' },
  reviewCtaWrite: { fontFamily: F.headlineSemi, fontWeight: '600', fontSize: 14, color: C.accent, flex: 1 },
  // sections
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.5, color: C.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  trackNum: { fontFamily: F.mono, fontSize: 12, width: 20 },
  trackName: { flex: 1, fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  reviewCard: { marginBottom: 16, padding: 16, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  flex: { flex: 1 },
  reviewUser: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 14, color: C.text },
  reviewHandle: { fontFamily: F.mono, fontSize: 10, color: C.textMuted },
  reviewText: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  reviewReplyBtn: { fontFamily: F.mono, fontSize: 11, color: C.textFaint },
  // modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  modalSheet: { backgroundColor: '#1a1820', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 32 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 },
  modalAlbumRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalAlbumTitle: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: C.text },
  modalAlbumArtist: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  modalRatingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.border, gap: 16 },
  modalDividerV: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.12)' },
  modalLikeBtn: { alignItems: 'center', gap: 4 },
  modalLikeLabel: { fontFamily: F.mono, fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 },
  modalTextInput: { padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.border, color: '#fff', fontSize: 15, lineHeight: 22, minHeight: 120, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, paddingVertical: 15, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  modalCancelText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: C.textMuted },
  modalConfirm: { flex: 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  modalConfirmDisabled: { opacity: 0.4 },
  modalConfirmText: { fontFamily: F.headline, fontWeight: '800', fontSize: 15, color: '#fff' },
});
