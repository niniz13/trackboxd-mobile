import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Image, ActivityIndicator } from 'react-native';
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

function AlbumCover({ url, color, size, radius = 8 }: { url?: string; color?: string; size: number; radius?: number }) {
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
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const insets = useSafeAreaInsets();

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

  const handlePost = async () => {
    if (!selected || !rating) return;
    setSaving(true);
    setError('');
    try {
      await apiJson('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          albumId:      selected.id,
          albumTitle:   selected.title,
          albumArtist:  selected.artist,
          albumCoverUrl: selected.coverUrl ?? null,
          albumGenre:   selected.genre || null,
          rating,
          liked,
          review,
        }),
      });
      router.back();
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la sauvegarde');
      setSaving(false);
    }
  };

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.handle} />

      <View style={styles.header}>
        <Text style={styles.title}>{step === 'pick' ? 'Log an album' : 'Rate & review'}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <TBIcon name="close" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {step === 'pick' ? (
        <>
          <View style={styles.searchBox}>
            <TBIcon name="search" size={17} color="rgba(255,255,255,0.4)" />
            <TextInput style={styles.searchInput} value={q} onChangeText={setQ}
              placeholder="Search albums…" placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus />
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
                <TouchableOpacity key={a.id} style={styles.albumRow}
                  onPress={() => { setSelected(a); setStep('rate'); }}>
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
          <View style={styles.selectedAlbum}>
            <AlbumCover url={selected.coverUrl} color={selected.pal.c1} size={64} radius={10} />
            <View style={styles.flex}>
              <Text style={styles.albumTitle}>{selected.title}</Text>
              <Text style={styles.albumSub}>{selected.artist} · {selected.year}</Text>
            </View>
            <TouchableOpacity onPress={() => { setStep('pick'); setSelected(null); setRating(0); setLiked(false); setReview(''); }}>
              <TBIcon name="close" size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          <View style={styles.starsSection}>
            <Text style={styles.rateLabel}>Your rating</Text>
            <TBStarInput value={rating} onChange={setRating} size={44}
              color={rating > 0 ? selected.pal.c1 : 'rgba(255,255,255,0.4)'} />
          </View>

          <TouchableOpacity
            style={[styles.likedRow, liked && { borderColor: `${C.liked}60`, backgroundColor: `${C.liked}15` }]}
            onPress={() => setLiked(v => !v)}>
            <TBIcon name="heart" size={20} color={liked ? C.liked : 'rgba(255,255,255,0.5)'} fill={liked ? C.liked : 'none'} />
            <Text style={[styles.likedText, liked && { color: C.liked }]}>
              {liked ? 'Aimé ♥' : 'Marquer comme favori'}
            </Text>
          </TouchableOpacity>

          <TextInput style={styles.reviewInput} value={review} onChangeText={setReview}
            placeholder="Write a review… (optional)" placeholderTextColor="rgba(255,255,255,0.25)"
            multiline numberOfLines={4} textAlignVertical="top" />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.postBtn, (!rating || saving) && styles.postBtnDisabled]}
            onPress={handlePost} disabled={!rating || saving}>
            {saving
              ? <ActivityIndicator color={C.bg} size="small" />
              : (
                <>
                  <TBIcon name="check" size={18} color={rating ? C.bg : 'rgba(255,255,255,0.3)'} strokeWidth={3} />
                  <Text style={[styles.postText, !rating && styles.postTextDisabled]}>Ajouter au journal</Text>
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
  reviewInput: { marginHorizontal: 20, marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.border, color: '#fff', fontSize: 14.5, minHeight: 100 },
  error: { marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,45,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,45,107,0.3)', color: '#ff5e7d', fontSize: 13.5 },
  postBtn: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, backgroundColor: '#fff' },
  postBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.12)' },
  postText: { fontFamily: F.headline, fontWeight: '800', fontSize: 16, color: C.bg },
  postTextDisabled: { color: 'rgba(255,255,255,0.3)' },
});
