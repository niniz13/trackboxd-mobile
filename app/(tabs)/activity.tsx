import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TBIcon } from '../../components/TBIcon';
import { apiJson } from '../../constants/api';
import { C, F } from '../../constants/theme';

interface ActivityItem {
  id: string;
  kind: 'review' | 'follow' | 'like' | 'comment';
  user: { _id: string; name: string; handle: string; color: string; image: string | null };
  when: string;
  albumId?: string;
  albumTitle?: string;
  albumArtist?: string;
  albumCoverUrl?: string | null;
  commentText?: string;
  reviewId?: string;
  isFollowing?: boolean;
}

const iconForKind = {
  review:  { name: 'star',     color: '#ffd23f' },
  follow:  { name: 'userplus', color: '#00e0c6' },
  like:    { name: 'heart',    color: '#ff2d6b' },
  comment: { name: 'comment',  color: '#7b2dff' },
};

const actionText: Record<string, string> = {
  review:  'a reviewé',
  follow:  'a commencé à te suivre',
  like:    'a aimé ta review de',
  comment: 'a commenté ta review de',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

function UserAvatar({ user, size }: { user: ActivityItem['user']; size: number }) {
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

function AlbumThumb({ url, size }: { url?: string | null; size: number }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: 7 }} />;
  return <View style={{ width: size, height: size, borderRadius: 7, backgroundColor: '#2c0a3e' }} />;
}

function FollowBackBtn({ userId, initialFollowing }: { userId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [toggling, setToggling]   = useState(false);

  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    setToggling(true);
    try {
      await apiJson(`/api/users/${userId}/follow`, { method: next ? 'POST' : 'DELETE' });
    } catch {
      setFollowing(!next);
    } finally { setToggling(false); }
  };

  if (following && !toggling) return null;
  return (
    <TouchableOpacity
      style={styles.followBtn}
      onPress={toggle}
      disabled={toggling}
      activeOpacity={0.8}
    >
      {toggling
        ? <ActivityIndicator size="small" color={C.bg} />
        : <Text style={styles.followBtnText}>Suivre</Text>
      }
    </TouchableOpacity>
  );
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems]           = useState<ActivityItem[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [data, following] = await Promise.all([
        apiJson<ActivityItem[]>('/api/activity'),
        apiJson<{ _id: string }[]>('/api/users/me/following'),
      ]);
      setItems(data);
      setFollowingIds(new Set(following.map(u => u._id)));
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 18, paddingBottom: 16 }}>
        <Text style={styles.heading}>Activité</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} size="large" />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <TBIcon name="music" size={32} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>Aucune activité récente</Text>
        </View>
      ) : items.map(item => {
        const { name, color } = iconForKind[item.kind];
        const goToUser = () => {
          if (item.user.handle) router.push(`/user/${item.user.handle}` as any);
        };
        const goToTarget = item.albumId
          ? () => router.push(`/album/${item.albumId}`)
          : item.kind === 'follow'
            ? goToUser
            : undefined;

        return (
          <View key={item.id} style={styles.item}>
            <TouchableOpacity onPress={goToUser} activeOpacity={0.8}>
              <View style={styles.avatarWrap}>
                <UserAvatar user={item.user} size={44} />
                <View style={[styles.badge, { backgroundColor: color }]}>
                  <TBIcon name={name} size={11} color="#fff" fill={item.kind === 'like' ? '#fff' : 'none'} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.content} onPress={goToTarget} activeOpacity={0.7}>
              <Text style={styles.text} numberOfLines={2}>
                <Text style={styles.bold}>{item.user.name}</Text>
                {' '}{actionText[item.kind]}
                {item.albumTitle ? <Text style={styles.bold}> {item.albumTitle}</Text> : ''}
                {item.commentText ? <Text style={styles.comment}> "{item.commentText}"</Text> : ''}
              </Text>
              <Text style={styles.when}>{timeAgo(item.when)}</Text>
            </TouchableOpacity>

            {item.kind === 'follow' ? (
              <FollowBackBtn userId={item.user._id} initialFollowing={followingIds.has(item.user._id)} />
            ) : item.albumId ? (
              <TouchableOpacity onPress={() => router.push(`/album/${item.albumId}`)}>
                <AlbumThumb url={item.albumCoverUrl} size={44} />
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  heading: { fontFamily: F.headline, fontSize: 30, color: C.text, letterSpacing: -1 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 14 },
  avatarWrap: { position: 'relative', width: 44, height: 44 },
  badge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  content: { flex: 1 },
  text: { fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 20 },
  bold: { fontWeight: '700', color: C.text },
  comment: { fontStyle: 'italic', color: C.textMuted },
  when: { fontFamily: F.mono, fontSize: 11, color: C.textFaint, marginTop: 4 },
  empty: { paddingTop: 80, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: C.textMuted },
  followBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: C.text, minWidth: 72, alignItems: 'center',
  },
  followBtnActive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  followBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13, color: C.bg },
  followBtnTextActive: { color: C.textMuted },
});
