import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TBStars } from '../../components/TBStars';
import { TBIcon } from '../../components/TBIcon';
import { apiJson } from '../../constants/api';
import { useAuth } from '../../contexts/AuthContext';
import { C, F } from '../../constants/theme';

interface Review {
  _id: string; albumId: string; albumTitle: string; albumArtist: string;
  albumCoverUrl: string | null; albumGenre: string | null;
  rating: number; liked: boolean; review: string; createdAt: string;
}

interface AlbumRef {
  albumId: string; albumTitle: string; albumArtist: string; albumCoverUrl?: string;
}

interface ListItem {
  _id: string; name: string; description: string;
  albums: AlbumRef[]; createdAt: string; updatedAt: string;
}

interface ProfileData {
  user: {
    _id: string; name: string; handle: string; bio: string;
    color: string; image: string | null; highlights: string[];
  };
  reviews: Review[];
  lists: ListItem[];
  isFollowing: boolean;
  isMe: boolean;
  stats: { total: number; thisYear: number; avgMark: string; likedCount: number; streak: number };
  followerCount: number;
  followingCount: number;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase();
}

function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function UserProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { user: me } = useAuth();
  const insets = useSafeAreaInsets();

  const [data, setData]         = useState<ProfileData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing]   = useState(false);
  const [toggling, setToggling]     = useState(false);
  const [tab, setTab] = useState<'diary' | 'favoris' | 'listes' | 'stats'>('diary');

  const load = async () => {
    try {
      const d = await apiJson<ProfileData>(`/api/users/profile/${handle}`);
      setData(d);
      setFollowing(d.isFollowing);
    } catch { setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [handle]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleFollow = async () => {
    if (!data || toggling) return;
    const next = !following;
    setFollowing(next);
    setToggling(true);
    try {
      await apiJson(`/api/users/${data.user._id}/follow`, { method: next ? 'POST' : 'DELETE' });
    } catch {
      setFollowing(!next);
    } finally { setToggling(false); }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <TBIcon name="profile" size={40} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptyText}>Utilisateur introuvable</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: C.accent, fontFamily: F.headlineSemi, fontSize: 14 }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If viewing own profile, redirect to the profile tab
  if (data.isMe) {
    router.replace('/(tabs)/profile');
    return null;
  }

  const { user, reviews, lists, stats, followerCount, followingCount } = data;
  const accentColor = user.color;
  const faves = reviews.filter(r => r.liked);
  const reviewMap = Object.fromEntries(reviews.map(r => [r.albumId, r]));
  const highlightAlbums = user.highlights.map(id => reviewMap[id]).filter(Boolean);

  const ratingDist = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }));
  const maxRating = Math.max(...ratingDist.map(d => d.count), 1);

  const artistCount: Record<string, number> = {};
  reviews.forEach(r => { artistCount[r.albumArtist] = (artistCount[r.albumArtist] ?? 0) + 1; });
  const topArtists = Object.entries(artistCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxArtist  = topArtists[0]?.[1] ?? 1;
  const barColors  = [C.accent, C.accentPurple, C.accentBlue, '#00e0c6', C.accentYellow];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
    >
      {/* banner */}
      <View style={{ height: 160, overflow: 'hidden', zIndex: 1 }}>
        <LinearGradient
          colors={[accentColor, accentColor + '88', '#0c0b0e']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', C.bg]}
          style={[StyleSheet.absoluteFill, { top: '40%' as any }]}
        />
        {/* back button */}
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 10 }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <TBIcon name="back" size={16} color="#fff" />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>

      {/* identity */}
      <View style={[styles.identity, { zIndex: 2 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, flex: 1 }}>
          <View style={styles.avatarBorder}>
            {user.image
              ? <Image source={{ uri: user.image }} style={{ width: 76, height: 76, borderRadius: 38 }} />
              : <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: accentColor, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.headline, fontWeight: '800', fontSize: 32, color: '#0c0b0e' }}>{user.name.charAt(0).toUpperCase()}</Text>
                </View>
            }
          </View>
          <View style={{ paddingBottom: 4 }}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={[styles.handle, { marginTop: 4 }]}>@{user.handle}</Text>
            {stats.streak > 0 && (
              <View style={[styles.streakBadge, { marginTop: 6, alignSelf: 'flex-start' }]}>
                <TBIcon name="flame" size={12} color="#ff6a14" fill="#ff6a14" />
                <Text style={styles.streakText}>{stats.streak} sem.</Text>
              </View>
            )}
          </View>
        </View>

        {/* follow button */}
        {me && (
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followBtnActive]}
            onPress={toggleFollow}
            disabled={toggling}
            activeOpacity={0.8}
          >
            {toggling
              ? <ActivityIndicator size="small" color={following ? C.textMuted : '#0c0b0e'} />
              : <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                  {following ? 'Suivi ✓' : 'Suivre'}
                </Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* followers / following */}
      <View style={styles.followRow}>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.followCount}>{formatCount(followerCount)}</Text>
          <Text style={styles.followLabel}>Abonnés</Text>
        </View>
        <View style={styles.followDivider} />
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.followCount}>{formatCount(followingCount)}</Text>
          <Text style={styles.followLabel}>Abonnements</Text>
        </View>
      </View>

      {/* bio */}
      {user.bio ? (
        <Text style={styles.bio}>{user.bio}</Text>
      ) : null}

      {/* highlights */}
      {user.highlights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Mis en avant</Text>
          <View style={styles.highlightGrid}>
            {[0, 1, 2, 3, 4].map(slot => {
              const r = highlightAlbums[slot];
              if (!r) return (
                <View key={slot} style={styles.highlightEmpty} />
              );
              return (
                <TouchableOpacity
                  key={r.albumId}
                  style={{ flex: 1 }}
                  onPress={() => router.push(`/album/${r.albumId}`)}
                  activeOpacity={0.8}
                >
                  {r.albumCoverUrl
                    ? <Image source={{ uri: r.albumCoverUrl }} style={styles.highlightCover} />
                    : <View style={[styles.highlightCover, { backgroundColor: '#2c0a3e' }]} />
                  }
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}
      >
        {([
          ['diary',   'Journal'],
          ['favoris', 'Favoris'],
          ['listes',  'Listes'],
          ['stats',   'Stats'],
        ] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* diary */}
      {tab === 'diary' && (
        <View style={{ paddingHorizontal: 20 }}>
          {reviews.length === 0 ? (
            <Text style={styles.emptyText}>Aucune écoute journalisée.</Text>
          ) : reviews.map(r => (
            <TouchableOpacity key={r._id} style={styles.diaryRow} onPress={() => router.push(`/album/${r.albumId}`)}>
              <Text style={styles.diaryDate}>{fmt(r.createdAt)}</Text>
              {r.albumCoverUrl
                ? <Image source={{ uri: r.albumCoverUrl }} style={{ width: 44, height: 44, borderRadius: 7 }} />
                : <View style={{ width: 44, height: 44, borderRadius: 7, backgroundColor: '#2c0a3e' }} />
              }
              <View style={{ flex: 1 }}>
                <Text style={styles.diaryTitle} numberOfLines={1}>{r.albumTitle}</Text>
                <Text style={styles.diaryArtist} numberOfLines={1}>{r.albumArtist}</Text>
              </View>
              <TBStars rating={r.rating} size={11} color={accentColor} />
              {r.liked && <TBIcon name="heart" size={13} color={C.liked} fill={C.liked} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* favoris */}
      {tab === 'favoris' && (
        <View style={{ paddingHorizontal: 20 }}>
          {faves.length === 0 ? (
            <Text style={styles.emptyText}>Aucun album favori.</Text>
          ) : (
            <View style={styles.favGrid}>
              {faves.map(r => (
                <TouchableOpacity
                  key={r._id}
                  style={styles.favItem}
                  onPress={() => router.push(`/album/${r.albumId}`)}
                  activeOpacity={0.8}
                >
                  {r.albumCoverUrl
                    ? <Image source={{ uri: r.albumCoverUrl }} style={styles.favCover} />
                    : <View style={[styles.favCover, { backgroundColor: '#2c0a3e' }]} />
                  }
                  <Text style={styles.favTitle} numberOfLines={1}>{r.albumTitle}</Text>
                  <Text style={styles.favArtist} numberOfLines={1}>{r.albumArtist}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* listes */}
      {tab === 'listes' && (
        <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
          {lists.length === 0 ? (
            <Text style={styles.emptyText}>Aucune liste.</Text>
          ) : lists.map(list => {
            const covers = list.albums.slice(0, 4);
            const coverW = covers.length === 0 ? 44 : 44 + (covers.length - 1) * 26;
            return (
              <TouchableOpacity
                key={list._id}
                style={styles.listCard}
                onPress={() => router.push(`/list/${list._id}` as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.listCoversStack, { width: coverW }]}>
                  {covers.length === 0 ? (
                    <View style={styles.listCoverEmpty}>
                      <TBIcon name="list" size={16} color="rgba(255,255,255,0.3)" />
                    </View>
                  ) : covers.map((a, i) => (
                    a.albumCoverUrl
                      ? <Image key={i} source={{ uri: a.albumCoverUrl }}
                          style={[styles.listStackCell, { left: i * 26 }]} />
                      : <View key={i} style={[styles.listStackCell, styles.listStackCellEmpty, { left: i * 26 }]} />
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listName} numberOfLines={1}>{list.name}</Text>
                  {list.description ? <Text style={styles.listDesc} numberOfLines={1}>{list.description}</Text> : null}
                  <Text style={styles.listCount}>{list.albums.length} album{list.albums.length !== 1 ? 's' : ''}</Text>
                </View>
                <TBIcon name="chevron" size={16} color="rgba(255,255,255,0.25)" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* stats */}
      {tab === 'stats' && (
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <View style={styles.statsCards}>
            <View style={styles.statsCard}>
              <Text style={[styles.statsCardBig, { color: '#fff' }]}>{stats.total}</Text>
              <Text style={styles.statsCardLabel}>Albums</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={[styles.statsCardBig, { color: accentColor }]}>{stats.thisYear}</Text>
              <Text style={styles.statsCardLabel}>Cette année</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={[styles.statsCardBig, { color: C.accentYellow }]}>{stats.avgMark}</Text>
              <Text style={styles.statsCardLabel}>Note moy.</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Notes · {stats.total}</Text>
          {stats.total === 0 ? (
            <Text style={styles.emptyText}>Aucune note pour l'instant.</Text>
          ) : (
            <View style={{ marginTop: 14, marginBottom: 24 }}>
              {ratingDist.map(({ star, count }) => {
                const isHalf = !Number.isInteger(star);
                const label = isHalf ? `${Math.floor(star)}½` : `${star}★`;
                const isMax = count === maxRating && count > 0;
                return (
                  <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Text style={[styles.ratingDistLabel, isMax && { color: accentColor }]}>{label}</Text>
                    <View style={styles.ratingDistBg}>
                      <View style={[styles.ratingDistFill, {
                        width: `${(count / maxRating) * 100}%` as any,
                        backgroundColor: isHalf ? `${accentColor}77` : accentColor,
                      }]} />
                    </View>
                    <Text style={styles.ratingDistCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={[styles.sectionLabel, { marginTop: 4 }]}>Artistes les plus écoutés</Text>
          {topArtists.length === 0 ? (
            <Text style={styles.emptyText}>Pas encore de données.</Text>
          ) : (
            <View style={{ marginTop: 14 }}>
              {topArtists.map(([artist, n], i) => (
                <View key={artist} style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={styles.genreName} numberOfLines={1}>{artist}</Text>
                    <Text style={styles.genreCount}>{n} album{n > 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${(n / maxArtist) * 100}%` as any, backgroundColor: barColors[i] }]} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  backBtn: {
    position: 'absolute', left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13.5, color: '#fff' },
  identity: {
    paddingHorizontal: 20, marginTop: -34,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  avatarBorder: { borderRadius: 40, borderWidth: 4, borderColor: C.bg },
  name: { fontFamily: F.headline, fontWeight: '800', fontSize: 22, color: C.text, letterSpacing: -0.6, lineHeight: 26 },
  handle: { fontFamily: F.mono, fontSize: 11, color: C.textMuted },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    backgroundColor: 'rgba(255,120,20,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,110,20,0.35)',
  },
  streakText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 11.5, color: '#ff8c3a' },
  followBtn: {
    paddingHorizontal: 20, paddingVertical: 9, borderRadius: 999,
    backgroundColor: C.text, minWidth: 80, alignItems: 'center',
    marginBottom: 4,
  },
  followBtnActive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  followBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13.5, color: '#0c0b0e' },
  followBtnTextActive: { color: C.textMuted },
  followRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 20, marginTop: 16,
  },
  followCount: { fontFamily: F.headline, fontWeight: '700', fontSize: 18, color: C.text, lineHeight: 22 },
  followLabel: { fontFamily: F.mono, fontSize: 8.5, color: C.textMuted, textTransform: 'uppercase', marginTop: 3 },
  followDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.12)' },
  bio: { marginHorizontal: 20, marginTop: 12, fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },
  section: { paddingHorizontal: 20, marginTop: 22 },
  sectionLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.5, color: C.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  highlightGrid: { flexDirection: 'row', gap: 8 },
  highlightCover: { width: '100%', aspectRatio: 1, borderRadius: 10 },
  highlightEmpty: {
    flex: 1, aspectRatio: 1, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tabScroll: { marginTop: 20 },
  tabRow: { paddingHorizontal: 20, gap: 6, flexDirection: 'row', paddingBottom: 16 },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  tabBtnActive: { backgroundColor: '#000', borderColor: '#fff' },
  tabText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 12.5, color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: '#fff' },
  diaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  diaryDate: { fontFamily: F.mono, fontSize: 11, color: C.textMuted, width: 44 },
  diaryTitle: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 14, color: C.text },
  diaryArtist: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  favGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  favItem: { width: '30%' },
  favCover: { width: '100%', aspectRatio: 1, borderRadius: 10 },
  favTitle: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 12.5, color: C.text, marginTop: 6 },
  favArtist: { fontSize: 11.5, color: C.textMuted, marginTop: 2 },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  listCoversStack: { position: 'relative', height: 44, flexShrink: 0 },
  listStackCell: { position: 'absolute', top: 0, width: 44, height: 44, borderRadius: 7, borderWidth: 2, borderColor: C.bg },
  listStackCellEmpty: { backgroundColor: 'rgba(255,255,255,0.07)' },
  listCoverEmpty: { width: 44, height: 44, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  listName: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: C.text },
  listDesc: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },
  listCount: { fontFamily: F.mono, fontSize: 11, color: C.textFaint, marginTop: 4 },
  statsCards: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statsCard: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  statsCardBig: { fontFamily: F.headline, fontWeight: '800', fontSize: 26, lineHeight: 30, letterSpacing: -0.8 },
  statsCardLabel: { fontFamily: F.mono, fontSize: 8.5, letterSpacing: 0.4, color: C.textMuted, textTransform: 'uppercase', marginTop: 6 },
  ratingDistLabel: { fontFamily: F.mono, fontSize: 11, color: 'rgba(255,255,255,0.35)', width: 28, textAlign: 'right' },
  ratingDistBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  ratingDistFill: { height: '100%', borderRadius: 3 },
  ratingDistCount: { fontFamily: F.mono, fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 20, textAlign: 'right' },
  barBg: { height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  genreName: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1, marginRight: 12 },
  genreCount: { fontFamily: F.mono, fontSize: 12, color: C.textMuted },
  emptyText: { marginTop: 16, fontSize: 15, color: C.textMuted, textAlign: 'center' },
});
