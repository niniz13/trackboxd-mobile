import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, Modal, TextInput, Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TBIcon } from '../../components/TBIcon';
import { apiJson } from '../../constants/api';
import { C, F } from '../../constants/theme';

interface AlbumRef {
  albumId: string; albumTitle: string; albumArtist: string;
  albumCoverUrl?: string; albumGenre?: string;
}

interface ListDetail {
  _id: string; name: string; description: string;
  albums: AlbumRef[]; isOwner: boolean;
  user: { name: string; handle: string; color: string; image: string | null };
}

interface SpotifyAlbum {
  id: string; title: string; artist: string; year: number;
  type: string; genre: string; coverUrl?: string;
  pal: { c1: string; c2: string; bg: string };
}

function AlbumCover({ url, color, size, radius = 8 }: { url?: string; color?: string; size: number; radius?: number }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: radius }} />;
  return <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color ?? '#2c0a3e' }} />;
}

export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [list, setList]     = useState<ListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit]   = useState(false);
  const [editName, setEditName]   = useState('');
  const [editDesc, setEditDesc]   = useState('');

  // Add album search modal
  const [showSearch, setShowSearch]   = useState(false);
  const [searchQ, setSearchQ]         = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyAlbum[]>([]);
  const [searching, setSearching]     = useState(false);
  const [addingId, setAddingId]       = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiJson<ListDetail>(`/api/lists/${id}`);
      setList(data);
    } catch {
      Alert.alert('Erreur', 'Liste introuvable');
      router.back();
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Spotify search debounce
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiJson<SpotifyAlbum[]>(`/api/spotify/search?q=${encodeURIComponent(searchQ)}`);
        setSearchResults(data);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  const putList = async (patch: Partial<Pick<ListDetail, 'name' | 'description' | 'albums'>>) => {
    if (!list) return;
    const updated = { name: list.name, description: list.description, albums: list.albums, ...patch };
    await apiJson(`/api/lists/${list._id}`, {
      method: 'PUT',
      body: JSON.stringify(updated),
    });
    setList(prev => prev ? { ...prev, ...patch } : prev);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await putList({ name: editName.trim(), description: editDesc.trim() });
      setShowEdit(false);
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Impossible de modifier la liste');
    } finally { setSaving(false); }
  };

  const handleAddAlbum = async (album: SpotifyAlbum) => {
    if (!list) return;
    if (list.albums.some(a => a.albumId === album.id)) {
      setShowSearch(false); setSearchQ('');
      return;
    }
    setAddingId(album.id);
    const newAlbum: AlbumRef = {
      albumId: album.id, albumTitle: album.title, albumArtist: album.artist,
      albumCoverUrl: album.coverUrl, albumGenre: album.genre || undefined,
    };
    try {
      await putList({ albums: [...list.albums, newAlbum] });
      setShowSearch(false); setSearchQ(''); setSearchResults([]);
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Impossible d\'ajouter l\'album');
    } finally { setAddingId(null); }
  };

  const handleRemoveAlbum = (albumId: string) => {
    if (!list) return;
    Alert.alert('Retirer', 'Retirer cet album de la liste ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer', style: 'destructive',
        onPress: async () => {
          try {
            await putList({ albums: list.albums.filter(a => a.albumId !== albumId) });
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!list) return;
    Alert.alert('Supprimer la liste', `Supprimer "${list.name}" définitivement ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await apiJson(`/api/lists/${list._id}`, { method: 'DELETE' });
            router.back();
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!list) return null;

  return (
    <>
      <View style={styles.screen}>
        {/* header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <TBIcon name="back" size={22} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{list.name}</Text>
            <Text style={styles.headerSub}>par @{list.user.handle}</Text>
          </View>
          {list.isOwner && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.headerBtn}
                onPress={() => { setEditName(list.name); setEditDesc(list.description); setShowEdit(true); }}>
                <TBIcon name="settings" size={19} color={C.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} onPress={handleDelete}>
                <TBIcon name="close" size={19} color="#ff5e7d" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* description */}
          {list.description ? (
            <Text style={styles.description}>{list.description}</Text>
          ) : null}

          {/* add album button (owner only) */}
          {list.isOwner && (
            <TouchableOpacity style={styles.addAlbumBtn} onPress={() => setShowSearch(true)}>
              <TBIcon name="plus" size={16} color={C.accent} strokeWidth={2.5} />
              <Text style={styles.addAlbumText}>Ajouter un album</Text>
            </TouchableOpacity>
          )}

          {/* album list */}
          {list.albums.length === 0 ? (
            <View style={styles.empty}>
              <TBIcon name="music" size={32} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyText}>Aucun album dans cette liste</Text>
            </View>
          ) : list.albums.map((album, i) => (
            <View key={`${album.albumId}-${i}`} style={styles.albumRow}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}
                onPress={() => router.push(`/album/${album.albumId}`)}>
                <AlbumCover url={album.albumCoverUrl} size={56} radius={9} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.albumTitle} numberOfLines={1}>{album.albumTitle}</Text>
                  <Text style={styles.albumArtist} numberOfLines={1}>{album.albumArtist}</Text>
                  {album.albumGenre ? <Text style={styles.albumGenre}>{album.albumGenre}</Text> : null}
                </View>
              </TouchableOpacity>
              {list.isOwner && (
                <TouchableOpacity onPress={() => handleRemoveAlbum(album.albumId)} style={styles.removeBtn}>
                  <TBIcon name="close" size={15} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* edit modal */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Modifier la liste</Text>

            <Text style={styles.modalLabel}>Nom</Text>
            <TextInput style={styles.modalInput}
              value={editName} onChangeText={setEditName}
              placeholder="Nom de la liste" placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus maxLength={80} />

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Description</Text>
            <TextInput style={[styles.modalInput, { minHeight: 72, textAlignVertical: 'top' }]}
              value={editDesc} onChangeText={setEditDesc}
              placeholder="Description (optionnel)" placeholderTextColor="rgba(255,255,255,0.3)"
              multiline maxLength={300} />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowEdit(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!editName.trim() || saving) && styles.modalConfirmDisabled]}
                onPress={handleSaveEdit} disabled={!editName.trim() || saving}>
                {saving
                  ? <ActivityIndicator color={C.bg} size="small" />
                  : <Text style={styles.modalConfirmText}>Sauvegarder</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* add album search modal */}
      <Modal visible={showSearch} transparent animationType="slide" onRequestClose={() => { setShowSearch(false); setSearchQ(''); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16, maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>Ajouter un album</Text>
              <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQ(''); }}>
                <TBIcon name="close" size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <TBIcon name="search" size={17} color="rgba(255,255,255,0.4)" />
              <TextInput style={styles.searchInput}
                value={searchQ} onChangeText={setSearchQ}
                placeholder="Albums, artistes…" placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus />
              {searchQ ? (
                <TouchableOpacity onPress={() => setSearchQ('')}>
                  <TBIcon name="close" size={15} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView style={{ marginTop: 8 }} keyboardShouldPersistTaps="handled">
              {searching ? (
                <ActivityIndicator color={C.accent} style={{ marginTop: 20 }} />
              ) : searchResults.length > 0 ? (
                searchResults.map(a => {
                  const alreadyAdded = list?.albums.some(la => la.albumId === a.id);
                  return (
                    <TouchableOpacity key={a.id} style={[styles.searchRow, alreadyAdded && { opacity: 0.45 }]}
                      onPress={() => !alreadyAdded && handleAddAlbum(a)} disabled={alreadyAdded || addingId === a.id}>
                      <AlbumCover url={a.coverUrl} color={a.pal.c1} size={48} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.albumTitle} numberOfLines={1}>{a.title}</Text>
                        <Text style={styles.albumArtist} numberOfLines={1}>{a.artist} · {a.year}</Text>
                      </View>
                      {addingId === a.id
                        ? <ActivityIndicator color={C.accent} size="small" />
                        : alreadyAdded
                          ? <Text style={styles.alreadyAdded}>Ajouté</Text>
                          : <TBIcon name="plus" size={18} color={C.accent} strokeWidth={2.5} />
                      }
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.searchHint}>
                  {searchQ.trim() ? `Aucun résultat pour "${searchQ}"` : 'Tape pour rechercher…'}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerBtn: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  headerTitle: { fontFamily: F.headline, fontWeight: '800', fontSize: 18, color: C.text, letterSpacing: -0.4 },
  headerSub: { fontFamily: F.mono, fontSize: 11, color: C.textMuted, marginTop: 2 },
  description: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.65)' },
  addAlbumBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 16, marginBottom: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: C.accent, backgroundColor: 'rgba(255,45,149,0.07)' },
  addAlbumText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 14, color: C.accent },
  albumRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  albumTitle: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: C.text },
  albumArtist: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },
  albumGenre: { fontFamily: F.mono, fontSize: 10.5, color: C.textFaint, marginTop: 3 },
  removeBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: C.textMuted, textAlign: 'center' },
  // modal shared
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: '#1a1820', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: F.headline, fontWeight: '800', fontSize: 20, color: C.text, letterSpacing: -0.5 },
  modalLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.4, color: C.textMuted, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  modalInput: { padding: 13, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: C.border, color: '#fff', fontSize: 15 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 13, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  modalCancelText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: C.textMuted },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: C.text, alignItems: 'center' },
  modalConfirmDisabled: { backgroundColor: 'rgba(255,255,255,0.15)' },
  modalConfirmText: { fontFamily: F.headline, fontWeight: '800', fontSize: 15, color: C.bg },
  // search modal
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  searchHint: { marginTop: 32, textAlign: 'center', color: C.textMuted, fontSize: 14 },
  alreadyAdded: { fontFamily: F.mono, fontSize: 11, color: C.textFaint },
});
