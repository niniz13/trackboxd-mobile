import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TBStarInput } from '../components/TBStars';
import { TBIcon } from '../components/TBIcon';
import { apiJson } from '../constants/api';
import { C, F } from '../constants/theme';

interface SpotifyAlbum {
  id: string; title: string; artist: string; year: number;
  type: string; genre: string; coverUrl?: string;
  pal: { c1: string; c2: string; bg: string };
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function AlbumCover({ url, color, size, radius = 8 }: {
  url?: string; color?: string; size: number; radius?: number;
}) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: radius }} />;
  return <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color ?? '#2c0a3e' }} />;
}

export default function LogScreen() {
  const [step, setStep]         = useState<'pick' | 'rate'>('pick');
  const [selected, setSelected] = useState<SpotifyAlbum | null>(null);
  const [rating, setRating]     = useState(0);
  const [liked, setLiked]       = useState(false);
  const [review, setReview]     = useState('');
  const [q, setQ]               = useState('');
  const [results, setResults]   = useState<SpotifyAlbum[]>([]);
  const [searching, setSearching] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError]   = useState('');
  const insets = useSafeAreaInsets();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the current state has been persisted
  const savedRef = useRef<{ rating: number; liked: boolean; review: string } | null>(null);

  // Search albums
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiJson<SpotifyAlbum[]>(`/api/spotify/search?q=${encodeURIComponent(q)}`);
        setResults(data);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const hasContent = rating > 0 || liked || review.trim().length > 0;

  const doSave = useCallback(async (
    album: SpotifyAlbum,
    r: number, l: boolean, rv: string
  ): Promise<boolean> => {
    if (!r && !l && !rv.trim()) return false;
    setSaveStatus('saving');
    setSaveError('');
    try {
      await apiJson('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          albumId:       album.id,
          albumTitle:    album.title,
          albumArtist:   album.artist,
          albumCoverUrl: album.coverUrl ?? null,
          albumGenre:    album.genre || null,
          rating: r,
          liked: l,
          review: rv,
        }),
      });
      savedRef.current = { rating: r, liked: l, review: rv };
      setSaveStatus('saved');
      return true;
    } catch (e: any) {
      setSaveError(e.message ?? 'Erreur lors de la sauvegarde');
      setSaveStatus('error');
      return false;
    }
  }, []);

  // Auto-save: debounce 900ms after any rating/liked/review change
  useEffect(() => {
    if (!selected || step !== 'rate') return;
    if (!hasContent) return;

    // Skip if nothing changed vs last save
    const last = savedRef.current;
    if (last && last.rating === rating && last.liked === liked && last.review === review) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus('idle');

    debounceRef.current = setTimeout(() => {
      doSave(selected, rating, liked, review);
    }, 900);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [rating, liked, review]);

  // Reset save state when album changes
  const selectAlbum = (album: SpotifyAlbum) => {
    setSelected(album);
    setRating(0);
    setLiked(false);
    setReview('');
    setSaveStatus('idle');
    setSaveError('');
    savedRef.current = null;
    setStep('rate');
  };

  const handleClose = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Flush any pending save before closing
    if (selected && hasContent) {
      const last = savedRef.current;
      const dirty = !last ||
        last.rating !== rating || last.liked !== liked || last.review !== review;
      if (dirty) {
        await doSave(selected, rating, liked, review);
      }
    }
    router.back();
  };

  const handleDiscard = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    router.back();
  };

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.handle} />

      <View style={styles.header}>
        <Text style={styles.title}>{step === 'pick' ? 'Log an album' : 'Rate & review'}</Text>
        <TouchableOpacity onPress={handleDiscard}>
          <TBIcon name="close" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {step === 'pick' ? (
        <>
          <View style={styles.searchBox}>
            <TBIcon name="search" size={17} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={styles.searchInput}
              value={q} onChangeText={setQ}
              placeholder="Search albums…"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus
            />
            {q ? (
              <TouchableOpacity onPress={() => setQ('')}>
                <TBIcon name="close" size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {searching ? (
              <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
            ) : results.length > 0 ? (
              results.map(a => (
                <TouchableOpacity key={a.id} style={styles.albumRow} onPress={() => selectAlbum(a)}>
                  <AlbumCover url={a.coverUrl} color={a.pal.c1} size={48} />
                  <View style={styles.flex}>
                    <Text style={styles.albumTitle} numberOfLines={1}>{a.title}</Text>
                    <Text style={styles.albumSub} numberOfLines={1}>{a.artist} · {a.year}</Text>
                  </View>
                  <TBIcon name="chevron" size={18} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.hint}>
                {q.trim() ? `Aucun résultat pour "${q}"` : 'Tape pour rechercher un album…'}
              </Text>
            )}
          </ScrollView>
        </>
      ) : selected ? (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {/* selected album row */}
          <View style={styles.selectedAlbum}>
            <AlbumCover url={selected.coverUrl} color={selected.pal.c1} size={64} radius={10} />
            <View style={styles.flex}>
              <Text style={styles.albumTitle}>{selected.title}</Text>
              <Text style={styles.albumSub}>{selected.artist} · {selected.year}</Text>
            </View>
            <TouchableOpacity onPress={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              setStep('pick');
              setSelected(null);
              setRating(0); setLiked(false); setReview('');
              setSaveStatus('idle'); setSaveError('');
              savedRef.current = null;
            }}>
              <TBIcon name="close" size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          {/* stars */}
          <View style={styles.starsSection}>
            <Text style={styles.rateLabel}>Note</Text>
            <TBStarInput
              value={rating}
              onChange={setRating}
              size={44}
              color={rating > 0 ? selected.pal.c1 : 'rgba(255,255,255,0.4)'}
            />
          </View>

          {/* liked toggle */}
          <TouchableOpacity
            style={[styles.likedRow, liked && { borderColor: `${C.liked}60`, backgroundColor: `${C.liked}15` }]}
            onPress={() => setLiked(v => !v)}
          >
            <TBIcon name="heart" size={20}
              color={liked ? C.liked : 'rgba(255,255,255,0.5)'}
              fill={liked ? C.liked : 'none'} />
            <Text style={[styles.likedText, liked && { color: C.liked }]}>
              {liked ? 'Aimé ♥' : 'Marquer comme favori'}
            </Text>
          </TouchableOpacity>

          {/* review text */}
          <TextInput
            style={styles.reviewInput}
            value={review}
            onChangeText={setReview}
            placeholder="Écrire une critique… (optionnel)"
            placeholderTextColor="rgba(255,255,255,0.25)"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* save status */}
          <View style={styles.statusRow}>
            {saveStatus === 'saving' && (
              <>
                <ActivityIndicator size="small" color={C.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.statusText}>Sauvegarde…</Text>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <TBIcon name="check" size={13} color="#4ade80" strokeWidth={2.5} />
                <Text style={[styles.statusText, { color: '#4ade80', marginLeft: 5 }]}>Sauvegardé</Text>
              </>
            )}
            {saveStatus === 'error' && (
              <Text style={[styles.statusText, { color: '#ff5e7d' }]}>{saveError}</Text>
            )}
          </View>

          {/* submit button — always enabled */}
          <TouchableOpacity
            style={[
              styles.postBtn,
              saveStatus === 'saving' && styles.postBtnSaving,
              saveStatus === 'saved' && styles.postBtnSaved,
            ]}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            {saveStatus === 'saving' ? (
              <ActivityIndicator color={C.bg} size="small" />
            ) : saveStatus === 'saved' ? (
              <>
                <TBIcon name="check" size={18} color={C.bg} strokeWidth={3} />
                <Text style={styles.postText}>Terminé</Text>
              </>
            ) : (
              <>
                <TBIcon name="check" size={18} color={hasContent ? C.bg : 'rgba(255,255,255,0.35)'} strokeWidth={3} />
                <Text style={[styles.postText, !hasContent && styles.postTextMuted]}>
                  Laisser une critique
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#1a1820', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontFamily: F.headline, fontWeight: '800', fontSize: 22, color: C.text, letterSpacing: -0.5 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  albumRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  flex: { flex: 1 },
  albumTitle: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: C.text },
  albumSub: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },
  hint: { marginTop: 40, textAlign: 'center', color: C.textMuted, fontSize: 14 },
  selectedAlbum: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 24, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', gap: 14 },
  starsSection: { alignItems: 'center', marginBottom: 20 },
  rateLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.5, color: C.textMuted, textTransform: 'uppercase', marginBottom: 14 },
  likedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  likedText: { fontFamily: F.headlineSemi, fontWeight: '600', fontSize: 14.5, color: 'rgba(255,255,255,0.6)' },
  reviewInput: { marginHorizontal: 20, marginBottom: 8, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.border, color: '#fff', fontSize: 14.5, minHeight: 100 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 24, marginBottom: 8 },
  statusText: { fontFamily: F.mono, fontSize: 12, color: C.textMuted },
  postBtn: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, backgroundColor: '#fff' },
  postBtnSaving: { backgroundColor: 'rgba(255,255,255,0.18)' },
  postBtnSaved: { backgroundColor: '#4ade80' },
  postText: { fontFamily: F.headline, fontWeight: '800', fontSize: 16, color: C.bg },
  postTextMuted: { color: 'rgba(0,0,0,0.4)' },
});
