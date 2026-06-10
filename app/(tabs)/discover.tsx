import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TBIcon } from '../../components/TBIcon';
import { C, F } from '../../constants/theme';
import { apiJson } from '../../constants/api';

interface SpotifyAlbum {
  id: string; title: string; artist: string; year: number;
  type: string; genre: string; coverUrl?: string;
  pal: { c1: string; c2: string; bg: string };
}

interface UserResult {
  _id: string; name: string; handle: string;
  color: string; image: string | null; isFollowing: boolean;
}

function AlbumCover({ album, size, radius = 12 }: { album: SpotifyAlbum; size: number; radius?: number }) {
  if (album.coverUrl) return <Image source={{ uri: album.coverUrl }} style={{ width: size, height: size, borderRadius: radius }} />;
  return <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: album.pal?.c1 ?? '#2c0a3e' }} />;
}

function PosterCard({ album, size = 124 }: { album: SpotifyAlbum; size: number }) {
  return (
    <TouchableOpacity style={{ width: size, marginRight: 12 }} onPress={() => router.push(`/album/${album.id}`)}>
      <AlbumCover album={album} size={size} radius={12} />
      <Text style={styles.posterTitle} numberOfLines={1}>{album.title}</Text>
      <Text style={styles.posterArtist} numberOfLines={1}>{album.artist}</Text>
    </TouchableOpacity>
  );
}

function UserAvatar({ user, size }: { user: UserResult; size: number }) {
  if (user.image) return <Image source={{ uri: user.image }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: user.color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.headline, fontWeight: '800', fontSize: size * 0.42, color: '#0c0b0e' }}>
        {user.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function UserRow({ user, isFollowing, onToggle, toggling }: {
  user: UserResult; isFollowing: boolean; onToggle: () => void; toggling: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => router.push(`/user/${user.handle}` as any)}
      activeOpacity={0.75}
    >
      <UserAvatar user={user} size={44} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userHandle}>@{user.handle}</Text>
      </View>
      {(!isFollowing || toggling) && (
        <TouchableOpacity
          style={styles.followBtn}
          onPress={e => { e.stopPropagation?.(); onToggle(); }}
          disabled={toggling}>
          {toggling
            ? <ActivityIndicator size="small" color={C.bg} />
            : <Text style={styles.followBtnText}>Suivre</Text>
          }
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const [q, setQ]               = useState('');
  const [albumResults, setAlbumResults] = useState<SpotifyAlbum[] | null>(null);
  const [userResults, setUserResults]   = useState<UserResult[] | null>(null);
  const [trending, setTrending]   = useState<SpotifyAlbum[]>([]);
  const [releases, setReleases]   = useState<SpotifyAlbum[]>([]);
  const [searching, setSearching] = useState(false);

  // per-user follow toggle state: userId → boolean | undefined (undefined = use server value)
  const [followState, setFollowState] = useState<Record<string, boolean>>({});
  const [togglingId, setTogglingId]   = useState<string | null>(null);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    apiJson<SpotifyAlbum[]>('/api/spotify/trending').then(setTrending).catch(() => {});
    apiJson<SpotifyAlbum[]>('/api/spotify/new-releases').then(setReleases).catch(() => {});
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setAlbumResults(null);
      setUserResults(null);
      setFollowState({});
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const [albums, users] = await Promise.all([
          apiJson<SpotifyAlbum[]>(`/api/spotify/search?q=${encodeURIComponent(q)}`),
          apiJson<UserResult[]>(`/api/users/search?q=${encodeURIComponent(q)}`),
        ]);
        setAlbumResults(albums);
        setUserResults(users);
      } catch {
        setAlbumResults([]);
        setUserResults([]);
      } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const toggleFollow = useCallback(async (user: UserResult) => {
    const currently = followState[user._id] ?? user.isFollowing;
    setFollowState(s => ({ ...s, [user._id]: !currently }));
    setTogglingId(user._id);
    try {
      await apiJson(`/api/users/${user._id}/follow`, { method: currently ? 'DELETE' : 'POST' });
    } catch {
      setFollowState(s => ({ ...s, [user._id]: currently }));
    } finally { setTogglingId(null); }
  }, [followState]);

  const hasResults = (userResults?.length ?? 0) > 0 || (albumResults?.length ?? 0) > 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.heading}>Découvrir</Text>
        <View style={styles.searchBox}>
          <TBIcon name="search" size={18} color="rgba(255,255,255,0.5)" />
          <TextInput style={styles.searchInput} value={q} onChangeText={setQ}
            placeholderTextColor="rgba(255,255,255,0.35)" placeholder="Albums, artistes, utilisateurs…" />
          {q ? <TouchableOpacity onPress={() => setQ('')}><TBIcon name="close" size={16} color="rgba(255,255,255,0.5)" /></TouchableOpacity> : null}
        </View>
      </View>

      {q.trim() ? (
        <View style={{ marginTop: 8 }}>
          {searching ? (
            <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
          ) : !hasResults ? (
            <Text style={styles.noResults}>Aucun résultat pour "{q}"</Text>
          ) : (
            <>
              {/* users section */}
              {userResults && userResults.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Utilisateurs</Text>
                  {userResults.map(u => (
                    <UserRow
                      key={u._id}
                      user={u}
                      isFollowing={followState[u._id] ?? u.isFollowing}
                      onToggle={() => toggleFollow(u)}
                      toggling={togglingId === u._id}
                    />
                  ))}
                </>
              )}

              {/* albums section */}
              {albumResults && albumResults.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: userResults?.length ? 24 : 0 }]}>Albums</Text>
                  {albumResults.map(a => (
                    <TouchableOpacity key={a.id} style={styles.resultRow} onPress={() => router.push(`/album/${a.id}`)}>
                      <AlbumCover album={a} size={52} radius={8} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.resultTitle} numberOfLines={1}>{a.title}</Text>
                        <Text style={styles.resultSub} numberOfLines={1}>{a.artist} · {a.genre || a.type}</Text>
                      </View>
                      <TBIcon name="chevron" size={18} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      ) : (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Tendances</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18 }}>
            {trending.map(a => <PosterCard key={a.id} album={a} size={124} />)}
          </ScrollView>

          <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Nouveautés</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18 }}>
            {releases.map(a => <PosterCard key={a.id} album={a} size={124} />)}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 18, paddingBottom: 6, backgroundColor: C.bg },
  heading: { fontFamily: F.headline, fontSize: 30, color: C.text, letterSpacing: -1, marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  sectionLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.5, color: C.textMuted, textTransform: 'uppercase', paddingHorizontal: 18, marginBottom: 10 },
  // users
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  userName: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: C.text },
  userHandle: { fontFamily: F.mono, fontSize: 11.5, color: C.textMuted, marginTop: 2 },
  followBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999, backgroundColor: C.text, minWidth: 72, alignItems: 'center' },
  followBtnActive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  followBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13, color: C.bg },
  followBtnTextActive: { color: C.textMuted },
  // albums
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: C.border },
  resultTitle: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: C.text },
  resultSub: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },
  noResults: { marginTop: 40, textAlign: 'center', color: C.textMuted, fontSize: 14 },
  // browse
  posterTitle: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13, color: C.text, marginTop: 8 },
  posterArtist: { fontSize: 11.5, color: C.textMuted, marginTop: 2 },
});
