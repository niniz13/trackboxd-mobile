import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert, FlatList, Dimensions,
} from 'react-native';
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

interface UserProfile {
  followerCount: number; followingCount: number;
  highlights: string[]; streak: number; bio: string;
}

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase();
}

function ListCard({ list, onPress }: { list: ListItem; onPress: () => void }) {
  const covers = list.albums.slice(0, 4);
  const coverW = covers.length === 0 ? 44 : 44 + (covers.length - 1) * 26;
  return (
    <TouchableOpacity style={styles.listCard} onPress={onPress} activeOpacity={0.75}>
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
}

/* ── Highlight Picker bottom-sheet ── */
const PICKER_COLS = 4;
const PICKER_PAD  = 16;
const PICKER_GAP  = 10;
const PICKER_ITEM_W = (Dimensions.get('window').width - PICKER_PAD * 2 - PICKER_GAP * (PICKER_COLS - 1)) / PICKER_COLS;

function HighlightPicker({
  highlights, reviews, onToggle, onClose,
}: {
  highlights: string[];
  reviews: Review[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');

  // Deduplicate reviews by albumId, keeping the most recent
  const seen = new Set<string>();
  const albums = reviews.filter(r => { if (seen.has(r.albumId)) return false; seen.add(r.albumId); return true; });

  const filtered = q.trim()
    ? albums.filter(r =>
        r.albumTitle.toLowerCase().includes(q.toLowerCase()) ||
        r.albumArtist.toLowerCase().includes(q.toLowerCase())
      )
    : albums;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <View style={styles.pickerHeader}>
            <View>
              <Text style={styles.pickerTitle}>Mettre en avant</Text>
              <Text style={styles.pickerSub}>Jusqu'à 5 albums · {highlights.length}/5</Text>
            </View>
            <TouchableOpacity style={styles.pickerDone} onPress={onClose}>
              <Text style={styles.pickerDoneText}>Terminé</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerSearch}>
            <TBIcon name="search" size={15} color="rgba(255,255,255,0.35)" />
            <TextInput
              style={styles.pickerSearchInput}
              value={q}
              onChangeText={setQ}
              placeholder="Rechercher…"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCorrect={false}
            />
            {q ? (
              <TouchableOpacity onPress={() => setQ('')}>
                <TBIcon name="close" size={14} color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            ) : null}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={r => r.albumId}
            numColumns={PICKER_COLS}
            key={PICKER_COLS}
            contentContainerStyle={{ padding: PICKER_PAD, paddingBottom: 40 }}
            columnWrapperStyle={{ gap: PICKER_GAP, justifyContent: 'flex-start' }}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item: r }) => {
              const on = highlights.includes(r.albumId);
              const full = highlights.length >= 5 && !on;
              return (
                <TouchableOpacity
                  style={[styles.pickerItem, { opacity: full ? 0.35 : 1 }]}
                  onPress={() => !full && onToggle(r.albumId)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.pickerCoverWrap, on && styles.pickerCoverSelected]}>
                    {r.albumCoverUrl
                      ? <Image source={{ uri: r.albumCoverUrl }} style={styles.pickerCover} />
                      : <View style={[styles.pickerCover, { backgroundColor: '#2c0a3e' }]} />
                    }
                    {on && <View style={[StyleSheet.absoluteFill, styles.pickerOverlayTint]} />}
                    {on && (
                      <View style={styles.pickerCheck}>
                        <TBIcon name="check" size={11} color="#0c0b0e" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.pickerAlbumTitle} numberOfLines={1}>{r.albumTitle}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'diary' | 'favoris' | 'listes' | 'stats'>('diary');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Create list modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [reviewsData, listsData, profileData] = await Promise.all([
        apiJson<Review[]>('/api/feed?mode=mine'),
        apiJson<ListItem[]>('/api/lists'),
        apiJson<UserProfile>('/api/user/profile'),
      ]);
      setReviews(reviewsData);
      setLists(listsData);
      setProfile(profileData);
      setHighlights(profileData.highlights ?? []);
    } catch {
      setReviews([]); setLists([]);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const toggleHighlight = (albumId: string) => {
    setHighlights(prev => {
      const next = prev.includes(albumId)
        ? prev.filter(id => id !== albumId)
        : prev.length >= 5 ? prev : [...prev, albumId];
      apiJson('/api/user/highlights', {
        method: 'PUT',
        body: JSON.stringify({ highlights: next }),
      }).catch(() => {});
      return next;
    });
  };

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
  const faves    = reviews.filter(r => r.liked);

  // Build highlight album data from reviews
  const reviewMap = Object.fromEntries(reviews.map(r => [r.albumId, r]));
  const highlightAlbums = highlights.map(id => reviewMap[id]).filter(Boolean);

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

  const streak = profile?.streak ?? 0;
  const followerCount  = profile?.followerCount ?? 0;
  const followingCount = profile?.followingCount ?? 0;

  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {/* banner */}
        <View style={{ height: 150, overflow: 'hidden', zIndex: 1 }}>
          <LinearGradient
            colors={['#ff2d95', '#7b2dff', '#2d6bff']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', C.bg]}
            style={[StyleSheet.absoluteFill, { top: '40%' as any }]}
          />
          <TouchableOpacity
            style={[styles.settingsBtn, { top: insets.top + 16 }]}
            onPress={() => router.push('/settings' as any)}
          >
            <TBIcon name="settings" size={19} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* identity */}
        <View style={[styles.identity, { zIndex: 2 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, flex: 1 }}>
            <View style={styles.avatarBorder}>
              {user.image
                ? <Image source={{ uri: user.image }} style={{ width: 76, height: 76, borderRadius: 38 }} />
                : <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: user.color, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: F.headline, fontWeight: '800', fontSize: 32, color: '#0c0b0e' }}>{user.name.charAt(0).toUpperCase()}</Text>
                  </View>
              }
            </View>
            <View style={{ paddingBottom: 4 }}>
              <Text style={styles.name}>{user.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={styles.handle}>@{user.handle}</Text>
                {streak > 0 && (
                  <View style={styles.streakBadge}>
                    <TBIcon name="flame" size={12} color="#ff6a14" fill="#ff6a14" />
                    <Text style={styles.streakText}>{streak} sem.</Text>
                  </View>
                )}
              </View>
            </View>
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
        </View>

        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 20 }} />
        ) : (
          <>
            {/* mis en avant */}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>Mis en avant · {highlights.length}/5</Text>
                <TouchableOpacity style={styles.editBtn} onPress={() => setShowPicker(true)}>
                  <TBIcon name="settings" size={12} color="#fff" />
                  <Text style={styles.editBtnText}>Modifier</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.highlightGrid}>
                {[0, 1, 2, 3, 4].map(slot => {
                  const r = highlightAlbums[slot];
                  if (!r) return (
                    <TouchableOpacity
                      key={slot}
                      style={styles.highlightEmpty}
                      onPress={() => setShowPicker(true)}
                      activeOpacity={0.7}
                    >
                      <TBIcon name="plus" size={20} color="rgba(255,255,255,0.25)" />
                    </TouchableOpacity>
                  );
                  return (
                    <View key={r.albumId} style={styles.highlightSlot}>
                      <TouchableOpacity onPress={() => router.push(`/album/${r.albumId}`)} activeOpacity={0.8}>
                        {r.albumCoverUrl
                          ? <Image source={{ uri: r.albumCoverUrl }} style={styles.highlightCover} />
                          : <View style={[styles.highlightCover, { backgroundColor: '#2c0a3e' }]} />
                        }
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.highlightRemove} onPress={() => toggleHighlight(r.albumId)}>
                        <TBIcon name="close" size={11} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* tabs */}
            <View style={styles.tabRow}>
              {([
                ['diary',   'Journal'],
                ['favoris', 'Favoris'],
                ['listes',  `Listes · ${lists.length}`],
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

            {/* favoris tab */}
            {tab === 'favoris' && (
              <View style={{ paddingHorizontal: 20 }}>
                {faves.length === 0 ? (
                  <Text style={styles.emptyText}>Aucun album favori pour l'instant.</Text>
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

            {/* stats tab */}
            {tab === 'stats' && (
              <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
                {/* stat cards */}
                <View style={styles.statsCards}>
                  <View style={styles.statsCard}>
                    <Text style={[styles.statsCardBig, { color: '#fff' }]}>{total}</Text>
                    <Text style={styles.statsCardLabel}>Albums</Text>
                  </View>
                  <View style={styles.statsCard}>
                    <Text style={[styles.statsCardBig, { color: C.accent }]}>{thisYear}</Text>
                    <Text style={styles.statsCardLabel}>Cette année</Text>
                  </View>
                  <View style={styles.statsCard}>
                    <Text style={[styles.statsCardBig, { color: C.accentYellow }]}>{avgMark}</Text>
                    <Text style={styles.statsCardLabel}>Note moy.</Text>
                  </View>
                </View>

                {/* monthly bar chart */}
                <Text style={styles.sectionLabel}>Écoutes par mois · {currentYear}</Text>
                {reviews.length === 0 ? (
                  <Text style={styles.emptyText}>Aucune écoute journalisée pour l'instant.</Text>
                ) : (
                  <View style={styles.barChart}>
                    {monthBars.map(b => (
                      <View key={b.m} style={styles.barCol}>
                        {b.v > 0 && <Text style={styles.barCount}>{b.v}</Text>}
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

            {/* listes tab */}
            {tab === 'listes' && (
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

      {/* highlight picker */}
      {showPicker && (
        <HighlightPicker
          highlights={highlights}
          reviews={reviews}
          onToggle={toggleHighlight}
          onClose={() => setShowPicker(false)}
        />
      )}

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
  settingsBtn: {
    position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center',
  },
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
  followRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingBottom: 4 },
  followCount: { fontFamily: F.headline, fontWeight: '700', fontSize: 18, color: C.text, lineHeight: 22 },
  followLabel: { fontFamily: F.mono, fontSize: 8.5, color: C.textMuted, textTransform: 'uppercase', marginTop: 3 },
  followDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 2 },
  // mis en avant
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.5, color: C.textMuted, textTransform: 'uppercase' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  editBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 12, color: '#fff' },
  highlightGrid: { flexDirection: 'row', gap: 8 },
  highlightSlot: { flex: 1, position: 'relative' },
  highlightCover: { width: '100%', aspectRatio: 1, borderRadius: 10 },
  highlightEmpty: {
    flex: 1, aspectRatio: 1, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.13)',
    borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center', justifyContent: 'center',
  },
  highlightRemove: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20,
    borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
  },
  // tabs
  tabRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginTop: 22, marginBottom: 16, flexWrap: 'nowrap' },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  tabBtnActive: { backgroundColor: C.text, borderColor: 'transparent' },
  tabText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 12.5, color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: C.bg },
  // diary
  diaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  diaryDate: { fontFamily: F.mono, fontSize: 11, color: C.textMuted, width: 44 },
  diaryTitle: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 14, color: C.text },
  diaryArtist: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  // favoris
  favGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  favItem: { width: '30%' },
  favCover: { width: '100%', aspectRatio: 1, borderRadius: 10 },
  favTitle: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 12.5, color: C.text, marginTop: 6 },
  favArtist: { fontSize: 11.5, color: C.textMuted, marginTop: 2 },
  // stats
  statsCards: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statsCard: {
    flex: 1, padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  statsCardBig: { fontFamily: F.headline, fontWeight: '800', fontSize: 26, lineHeight: 30, letterSpacing: -0.8 },
  statsCardLabel: { fontFamily: F.mono, fontSize: 8.5, letterSpacing: 0.4, color: C.textMuted, textTransform: 'uppercase', marginTop: 6 },
  genreName: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1, marginRight: 12 },
  genreCount: { fontFamily: F.mono, fontSize: 12, color: C.textMuted },
  barBg: { height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, marginBottom: 4 },
  barCol: { width: 22, alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: { width: 12, height: 100, justifyContent: 'flex-end' },
  barFillGradient: { width: 12, borderRadius: 4 },
  barCount: { fontFamily: F.mono, fontSize: 9, color: C.textMuted, marginBottom: 3 },
  barLabel: { fontFamily: F.mono, fontSize: 8, color: C.textFaint, marginTop: 5, textTransform: 'uppercase' },
  // listes
  createListBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 13, paddingHorizontal: 16, borderRadius: 13,
    borderWidth: 1, borderColor: C.accent, marginBottom: 16,
    backgroundColor: 'rgba(255,45,149,0.07)',
  },
  createListText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 14.5, color: C.accent },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  listCoversStack: { position: 'relative', height: 44, flexShrink: 0 },
  listStackCell: { position: 'absolute', top: 0, width: 44, height: 44, borderRadius: 7, borderWidth: 2, borderColor: C.bg },
  listStackCellEmpty: { backgroundColor: 'rgba(255,255,255,0.07)' },
  listCoverEmpty: { width: 44, height: 44, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  listName: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: C.text },
  listDesc: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },
  listCount: { fontFamily: F.mono, fontSize: 11, color: C.textFaint, marginTop: 4 },
  // picker
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  pickerSheet: {
    maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    backgroundColor: '#1a191c', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 0,
  },
  pickerHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  pickerTitle: { fontFamily: F.headline, fontWeight: '800', fontSize: 17, color: '#fff' },
  pickerSub: { fontFamily: F.mono, fontSize: 10.5, color: C.textMuted, marginTop: 3 },
  pickerDone: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff' },
  pickerDoneText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13, color: '#0c0b0e' },
  pickerSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  pickerSearchInput: { flex: 1, color: '#fff', fontSize: 14 },
  pickerItem: { width: PICKER_ITEM_W },
  pickerCoverWrap: { borderRadius: 10, overflow: 'hidden' },
  pickerCoverSelected: { shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4, elevation: 4 },
  pickerCover: { width: '100%', aspectRatio: 1, borderRadius: 10 },
  pickerOverlayTint: { backgroundColor: 'rgba(255,45,149,0.2)', borderRadius: 10 },
  pickerCheck: {
    position: 'absolute', top: 5, right: 5, width: 20, height: 20,
    borderRadius: 10, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerAlbumTitle: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 11, color: '#fff', marginTop: 5 },
  // misc
  emptyText: { marginTop: 16, fontSize: 15, color: C.textMuted, textAlign: 'center' },
  loginBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, backgroundColor: C.accent },
  loginBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: '#fff' },
  // create list modal
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
