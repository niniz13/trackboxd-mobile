import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TBStars } from '../../components/TBStars';
import { TBIcon } from '../../components/TBIcon';
import { C, F } from '../../constants/theme';
import { apiJson } from '../../constants/api';
import { useAuth } from '../../contexts/AuthContext';

interface FeedEntry {
  _id: string; userId: string; albumId: string;
  albumTitle: string; albumArtist: string;
  albumCoverUrl: string | null; albumGenre: string | null;
  rating: number; liked: boolean; review: string;
  createdAt: string; likeCount: number; commentCount: number;
  isLiked: boolean;
  user: { name: string; handle: string; color: string; image?: string | null };
}

import { Image } from 'react-native';

function CoverImage({ url, size, radius, accentColor }: { url: string | null; size: number; radius: number; accentColor?: string }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: radius }} />;
  return <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: accentColor ?? '#2c0a3e' }} />;
}

function UserAvatar({ user, size }: { user: FeedEntry['user']; size: number }) {
  if (user.image) return <Image source={{ uri: user.image }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: user.color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.headline, fontWeight: '800', fontSize: size * 0.42, color: '#0c0b0e' }}>
        {user.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

const FILTERS = ['Tout', 'Amis', 'Vous', 'Populaire'];
const MODES   = ['recent', 'friends', 'mine', 'popular'];

function FeedItem({ entry }: { entry: FeedEntry }) {
  const [liked, setLiked] = useState(entry.isLiked);
  const [likes, setLikes] = useState(entry.likeCount);
  const toggle = () => {
    const next = !liked;
    setLiked(next); setLikes(n => n + (next ? 1 : -1));
    apiJson(`/api/reviews/${entry._id}/like`, { method: next ? 'POST' : 'DELETE' }).catch(() => {
      setLiked(!next); setLikes(n => n + (next ? -1 : 1));
    });
  };

  const goToUser = () => {
    if (entry.user.handle) router.push(`/user/${entry.user.handle}` as any);
  };

  return (
    <View style={styles.item}>
      <View style={styles.row}>
        <TouchableOpacity onPress={goToUser} activeOpacity={0.8}>
          <UserAvatar user={entry.user} size={30} />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginLeft: 10 }}>
          <TouchableOpacity onPress={goToUser} activeOpacity={0.8}>
            <Text style={styles.userName}>{entry.user.name} </Text>
          </TouchableOpacity>
          <Text style={styles.action}>{entry.review ? 'a reviewé' : 'a noté'}</Text>
        </View>
        <Text style={styles.when}>{timeAgo(entry.createdAt)}</Text>
      </View>
      <View style={[styles.row, { marginTop: 14, alignItems: 'flex-start' }]}>
        <TouchableOpacity onPress={() => router.push(`/album/${entry.albumId}`)}>
          <CoverImage url={entry.albumCoverUrl} size={92} radius={12} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14, paddingTop: 2 }}>
          <TouchableOpacity onPress={() => router.push(`/album/${entry.albumId}`)}>
            <Text style={styles.albumTitle} numberOfLines={2}>{entry.albumTitle}</Text>
            <Text style={styles.albumMeta}>{entry.albumArtist}</Text>
          </TouchableOpacity>
          <View style={[styles.row, { marginTop: 9 }]}>
            <TBStars rating={entry.rating} size={14} color={C.accent} />
            {entry.liked && <View style={{ marginLeft: 8 }}><TBIcon name="heart" size={14} color={C.accent} fill={C.accent} /></View>}
            {entry.albumGenre && (
              <View style={styles.genrePill}><Text style={styles.genreText}>{entry.albumGenre}</Text></View>
            )}
          </View>
        </View>
      </View>
      {entry.review ? <Text style={styles.review} numberOfLines={3}>{entry.review}</Text> : null}
      <View style={[styles.row, { marginTop: 14 }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={toggle}>
          <TBIcon name="heart" size={17} color={liked ? C.liked : 'rgba(255,255,255,0.45)'} fill={liked ? C.liked : 'none'} />
          <Text style={[styles.actionText, liked && { color: C.liked }]}>{likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { marginLeft: 20 }]} onPress={() => router.push(`/review/${entry._id}` as any)}>
          <TBIcon name="comment" size={16} color="rgba(255,255,255,0.45)" />
          <Text style={styles.actionText}>{entry.commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState(0);
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async (mode: string) => {
    setLoading(true);
    try {
      const data = await apiJson<FeedEntry[]>(`/api/feed?mode=${mode}`);
      setEntries(data);
    } catch { setEntries([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFeed(MODES[activeFilter]); }, [activeFilter, fetchFeed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed(MODES[activeFilter]);
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.heading}>Fil d'actualité</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
          {FILTERS.map((f, i) => (
            <TouchableOpacity key={f} style={[styles.filterBtn, activeFilter === i && styles.filterBtnActive]}
              onPress={() => setActiveFilter(i)}>
              <Text style={[styles.filterText, activeFilter === i && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
          {entries.length === 0 ? (
            <View style={styles.empty}>
              <TBIcon name="music" size={32} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>Aucune review pour l'instant</Text>
              {!user && (
                <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
                  <Text style={styles.loginBtnText}>Se connecter</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            entries.map(e => <FeedItem key={e._id} entry={e} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 18, paddingBottom: 8, backgroundColor: C.bg },
  heading: { fontFamily: F.headline, fontSize: 30, color: C.text, letterSpacing: -1 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', marginRight: 8 },
  filterBtnActive: { backgroundColor: '#fff', borderColor: 'transparent' },
  filterText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  filterTextActive: { color: '#0c0b0e' },
  item: { paddingHorizontal: 18, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  row: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 14.5, color: C.text },
  action: { fontSize: 13, color: C.textMuted },
  when: { fontFamily: F.mono, fontSize: 11, color: C.textFaint },
  albumTitle: { fontFamily: F.headline, fontWeight: '800', fontSize: 18, color: C.text, letterSpacing: -0.4, lineHeight: 22 },
  albumMeta: { fontSize: 13.5, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  genrePill: { marginLeft: 8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.07)' },
  genreText: { fontFamily: F.mono, fontSize: 10.5, color: 'rgba(255,255,255,0.5)' },
  review: { marginTop: 12, fontSize: 14.5, lineHeight: 22, color: 'rgba(255,255,255,0.82)' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontFamily: F.mono, fontSize: 12.5, color: 'rgba(255,255,255,0.5)' },
  empty: { paddingTop: 80, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: C.textMuted },
  loginBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: C.accent },
  loginBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 14, color: '#fff' },
});
