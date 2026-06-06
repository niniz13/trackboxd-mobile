import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TBStars } from '../../components/TBStars';
import { TBIcon } from '../../components/TBIcon';
import { useAuth } from '../../contexts/AuthContext';
import { apiJson } from '../../constants/api';
import { C, F } from '../../constants/theme';

interface Review {
  _id: string; albumId: string; albumTitle: string; albumArtist: string;
  albumCoverUrl: string | null; rating: number; liked: boolean; createdAt: string;
}

interface AlbumRef {
  albumId: string; albumTitle: string; albumArtist: string;
  albumCoverUrl?: string; albumGenre?: string;
}

interface ListItem {
  _id: string; name: string; description: string;
  albums: AlbumRef[]; createdAt: string; updatedAt: string;
}

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase();
}

function StatBox({ big, label, color }: { big: string; label: string; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statBig, color ? { color } : {}]}>{big}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ListCard({ list, onPress }: { list: ListItem; onPress: () => void }) {
  const slots = Array.from({ length: 4 }, (_, i) => list.albums[i]?.albumCoverUrl ?? null);
  return (
    <TouchableOpacity style={styles.listCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.listCovers}>
        {slots.map((url, i) => (
          url
            ? <Image key={i} source={{ uri: url }} style={styles.listCoverCell} />
            : <View key={i} style={[styles.listCoverCell, styles.listCoverEmpty]} />
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
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab]           = useState<'diary' | 'stats' | 'lists'>('diary');
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [lists, setLists]       = useState<ListItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create list modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState('');
  const [newDesc, setNewDesc]       = useState('');
  const [creating, setCreating]     = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [reviewsData, listsData] = await Promise.all([
        apiJson<Review[]>('/api/feed?mode=mine'),
        apiJson<ListItem[]>('/api/lists'),
      ]);
      setReviews(reviewsData);
      setLists(listsData);
    } catch {
      setReviews([]); setLists([]);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const handleCreateList = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await apiJson<ListItem>('/api/lists', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      });
      setLists(prev => [created, ...prev]);
      setShowCreate(false);
      setNewName(''); setNewDesc('');
      router.push(`/list/${created._id}` as any);
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Impossible de créer la liste');
    } finally { setCreating(false); }
  };

  if (!user) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <TBIcon name="grid" size={40} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptyText}>Connecte-toi pour voir ton profil</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
          <Text style={styles.loginBtnText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const total    = reviews.length;
  const thisYear = reviews.filter(r => new Date(r.createdAt).getFullYear() === new Date().getFullYear()).length;
  const avgMark  = total ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : '—';
  const faves    = reviews.filter(r => r.liked).slice(0, 4);

  const currentYear = new Date().getFullYear();
  const monthBars = MONTHS_FR.map((m, i) => ({
    m,
    v: reviews.filter(r => {
      const d = new Date(r.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === i;
    }).length,
  }));
  const maxBar = Math.max(...monthBars.map(b => b.v), 1);

  const artistCount: Record<string, number> = {};
  reviews.forEach(r => { artistCount[r.albumArtist] = (artistCount[r.albumArtist] ?? 0) + 1; });
  const topArtists = Object.entries(artistCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxArtist  = topArtists[0]?.[1] ?? 1;
  const barColors  = [C.accent, C.accentPurple, C.accentBlue, '#00e0c6', C.accentYellow];

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
        {/* banner */}
        <View style={{ height: 150, position: 'relative', overflow: 'hidden' }}>
          <LinearGradient colors={['#ff2d95', '#7b2dff', '#2d6bff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['transparent', C.bg]} style={[StyleSheet.absoluteFill, { top: '40%' as any }]} />
          <TouchableOpacity style={[styles.settingsBtn, { top: insets.top + 16 }]} onPress={() => router.push('/settings' as any)}>
            <TBIcon name="settings" size={19} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* identity */}
        <View style={styles.identity}>
          <View style={styles.avatarBorder}>
            {user.image
              ? <Image source={{ uri: user.image }} style={{ width: 76, height: 76, borderRadius: 38 }} />
              : <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: user.color, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.headline, fontWeight: '800', fontSize: 32, color: '#0c0b0e' }}>{user.name.charAt(0).toUpperCase()}</Text>
                </View>
            }
          </View>
          <View style={{ flex: 1, paddingBottom: 4 }}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.handle}>@{user.handle}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 20 }} />
        ) : (
          <>
            {/* stats boxes */}
            <View style={styles.statsRow}>
              <StatBox big={String(total)}    label="Albums" />
              <View style={styles.statDivider} />
              <StatBox big={String(thisYear)} label="Cette année" color={C.accent} />
              <View style={styles.statDivider} />
              <StatBox big={String(faves.length)} label="Favoris" />
              <View style={styles.statDivider} />
              <StatBox big={avgMark}          label="Moy." color={C.accentYellow} />
            </View>

            {/* faves */}
            {faves.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Favoris</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {faves.map(r => (
                    <TouchableOpacity key={r._id} onPress={() => router.push(`/album/${r.albumId}`)} style={{ marginRight: 10 }}>
                      {r.albumCoverUrl
                        ? <Image source={{ uri: r.albumCoverUrl }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                        : <View style={{ width: 80, height: 80, borderRadius: 10, backgroundColor: '#2c0a3e' }} />
                      }
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* tab row */}
            <View style={styles.tabRow}>
              {([['diary', 'Journal'], ['stats', 'Stats'], ['lists', 'Listes']] as const).map(([key, label]) => (
                <TouchableOpacity key={key} style={[styles.tabBtn, tab === key && styles.tabBtnActive]} onPress={() => setTab(key)}>
                  <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* diary tab */}
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
                    <TBStars rating={r.rating} size={11} color={C.accent} />
                    {r.liked && <TBIcon name="heart" size={13} color={C.liked} fill={C.liked} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* stats tab */}
            {tab === 'stats' && (
              <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
                {/* monthly bar chart */}
                <Text style={styles.sectionLabel}>Écoutes par mois · {currentYear}</Text>
                {reviews.length === 0 ? (
                  <Text style={styles.emptyText}>Aucune écoute journalisée pour l'instant.</Text>
                ) : (
                  <View style={styles.barChart}>
                    {monthBars.map(b => (
                      <View key={b.m} style={styles.barCol}>
                        {b.v > 0 && (
                          <Text style={styles.barCount}>{b.v}</Text>
                        )}
                        <View style={styles.barTrack}>
                          {b.v > 0 && (
                            <LinearGradient
                              colors={['#ff2d95', '#7b2dff']}
                              style={[styles.barFillGradient, { height: Math.max(6, Math.round((b.v / maxBar) * 100)) }]}
                            />
                          )}
                        </View>
                        <Text style={styles.barLabel}>{b.m}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Artistes les plus écoutés</Text>
                {topArtists.length === 0
                  ? <Text style={styles.emptyText}>Pas encore de données.</Text>
                  : topArtists.map(([artist, n], i) => (
                    <View key={artist} style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={styles.genreName} numberOfLines={1}>{artist}</Text>
                        <Text style={styles.genreCount}>{n} album{n > 1 ? 's' : ''}</Text>
                      </View>
                      <View style={styles.barBg}>
                        <View style={[styles.barFill, { width: `${(n / maxArtist) * 100}%` as any, backgroundColor: barColors[i] }]} />
                      </View>
                    </View>
                  ))
                }
              </View>
            )}

            {/* lists tab */}
            {tab === 'lists' && (
              <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
                <TouchableOpacity style={styles.createListBtn} onPress={() => setShowCreate(true)}>
                  <TBIcon name="plus" size={16} color={C.accent} strokeWidth={2.5} />
                  <Text style={styles.createListText}>Nouvelle liste</Text>
                </TouchableOpacity>

                {lists.length === 0 ? (
                  <Text style={styles.emptyText}>Aucune liste pour l'instant.</Text>
                ) : lists.map(list => (
                  <ListCard key={list._id} list={list} onPress={() => router.push(`/list/${list._id}` as any)} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* create list modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nouvelle liste</Text>

            <Text style={styles.modalLabel}>Nom</Text>
            <TextInput
              style={styles.modalInput}
              value={newName} onChangeText={setNewName}
              placeholder="Ex. Mes albums préférés" placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus maxLength={80} />

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Description <Text style={{ color: C.textFaint }}>(optionnel)</Text></Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 72, textAlignVertical: 'top' }]}
              value={newDesc} onChangeText={setNewDesc}
              placeholder="Une courte description…" placeholderTextColor="rgba(255,255,255,0.3)"
              multiline maxLength={300} />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowCreate(false); setNewName(''); setNewDesc(''); }}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!newName.trim() || creating) && styles.modalConfirmDisabled]}
                onPress={handleCreateList} disabled={!newName.trim() || creating}>
                {creating
                  ? <ActivityIndicator color={C.bg} size="small" />
                  : <Text style={styles.modalConfirmText}>Créer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  settingsBtn: { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  identity: { paddingHorizontal: 20, marginTop: -34, flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  avatarBorder: { borderRadius: 40, borderWidth: 4, borderColor: C.bg },
  name: { fontFamily: F.headline, fontWeight: '800', fontSize: 24, color: C.text, letterSpacing: -0.6, lineHeight: 28 },
  handle: { fontFamily: F.mono, fontSize: 12, color: C.textMuted, marginTop: 4 },
  statsRow: { flexDirection: 'row', marginHorizontal: 18, marginTop: 18, padding: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.border },
  statBox: { flex: 1, alignItems: 'center' },
  statBig: { fontFamily: F.headline, fontWeight: '800', fontSize: 24, color: C.text, lineHeight: 28, letterSpacing: -1 },
  statLabel: { fontFamily: F.mono, fontSize: 8.5, letterSpacing: 0.5, color: C.textMuted, textTransform: 'uppercase', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.5, color: C.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginTop: 24, marginBottom: 16 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  tabBtnActive: { backgroundColor: C.text, borderColor: 'transparent' },
  tabText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: C.bg },
  diaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  diaryDate: { fontFamily: F.mono, fontSize: 11, color: C.textMuted, width: 44 },
  diaryTitle: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 14, color: C.text },
  diaryArtist: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  genreName: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1, marginRight: 12 },
  genreCount: { fontFamily: F.mono, fontSize: 12, color: C.textMuted },
  barBg: { height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  // monthly chart
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, marginBottom: 4 },
  barCol: { width: 22, alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: { width: 12, height: 100, justifyContent: 'flex-end' },
  barFillGradient: { width: 12, borderRadius: 4 },
  barCount: { fontFamily: F.mono, fontSize: 9, color: C.textMuted, marginBottom: 3 },
  barLabel: { fontFamily: F.mono, fontSize: 8, color: C.textFaint, marginTop: 5, textTransform: 'uppercase' },
  emptyText: { marginTop: 16, fontSize: 15, color: C.textMuted, textAlign: 'center' },
  loginBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, backgroundColor: C.accent },
  loginBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: '#fff' },
  // lists
  createListBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 13, borderWidth: 1, borderColor: C.accent, marginBottom: 16, backgroundColor: 'rgba(255,45,149,0.07)' },
  createListText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 14.5, color: C.accent },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  listCovers: { width: 68, height: 68, flexDirection: 'row', flexWrap: 'wrap', gap: 3, borderRadius: 10, overflow: 'hidden' },
  listCoverCell: { width: 32, height: 32, borderRadius: 0 },
  listCoverEmpty: { backgroundColor: 'rgba(255,255,255,0.07)' },
  listName: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: C.text },
  listDesc: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },
  listCount: { fontFamily: F.mono, fontSize: 11, color: C.textFaint, marginTop: 4 },
  // modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: '#1a1820', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: F.headline, fontWeight: '800', fontSize: 22, color: C.text, letterSpacing: -0.5, marginBottom: 20 },
  modalLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.4, color: C.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  modalInput: { padding: 13, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: C.border, color: '#fff', fontSize: 15 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 13, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  modalCancelText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: C.textMuted },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: C.text, alignItems: 'center' },
  modalConfirmDisabled: { backgroundColor: 'rgba(255,255,255,0.15)' },
  modalConfirmText: { fontFamily: F.headline, fontWeight: '800', fontSize: 15, color: C.bg },
});
