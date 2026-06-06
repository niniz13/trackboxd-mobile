import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TBIcon } from '../components/TBIcon';
import { useAuth } from '../contexts/AuthContext';
import { apiJson } from '../constants/api';
import { C, F } from '../constants/theme';

const COLORS = [
  '#ff2d95', '#7b2dff', '#2d6bff', '#00c2a8',
  '#ff8c00', '#ffd23f', '#ff4444', '#22c55e',
];

interface ProfileData {
  name: string; handle: string; bio: string;
  color: string; email: string; hasPassword: boolean;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const { user, signOut, refresh } = useAuth();
  const insets = useSafeAreaInsets();

  const [profile, setProfile]   = useState<ProfileData | null>(null);
  const [name, setName]         = useState('');
  const [handle, setHandle]     = useState('');
  const [bio, setBio]           = useState('');
  const [color, setColor]       = useState('');
  const [email, setEmail]       = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    apiJson<ProfileData>('/api/user/profile')
      .then(p => {
        setProfile(p);
        setName(p.name);
        setHandle(p.handle);
        setBio(p.bio);
        setColor(p.color);
        setEmail(p.email);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError(''); setSuccess(false);
    if (!name.trim()) { setError('Le nom est requis.'); return; }
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) {
      setError('Handle invalide (3-30 caractères, lettres minuscules, chiffres, _).');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = { name: name.trim(), handle, bio: bio.trim(), color, email };
      if (newPw) { body.currentPassword = currentPw; body.newPassword = newPw; }
      await apiJson('/api/user/profile', { method: 'PUT', body: JSON.stringify(body) });
      await refresh();
      setCurrentPw(''); setNewPw('');
      setSuccess(true);
      setTimeout(() => router.back(), 800);
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la sauvegarde.');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.screen}>
        {/* header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <TBIcon name="back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paramètres</Text>
          <TouchableOpacity
            style={[styles.saveBtn, (saving || success) && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving || success}>
            {saving
              ? <ActivityIndicator size="small" color={C.bg} />
              : <Text style={styles.saveBtnText}>{success ? '✓ Sauvegardé' : 'Enregistrer'}</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 18 }} keyboardShouldPersistTaps="handled">
          {/* error banner */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* avatar preview */}
          <View style={styles.avatarSection}>
            {user?.image
              ? <Image source={{ uri: user.image }} style={{ width: 80, height: 80, borderRadius: 40 }} />
              : <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.headline, fontWeight: '800', fontSize: 34, color: '#0c0b0e' }}>
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>
            }
            <Text style={styles.avatarName}>{name || '…'}</Text>
            <Text style={styles.avatarHandle}>@{handle || '…'}</Text>
          </View>

          {/* profil */}
          <Text style={styles.sectionLabel}>Profil</Text>
          <View style={styles.card}>
            <Field label="Nom">
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="Ton nom" placeholderTextColor="rgba(255,255,255,0.3)" />
            </Field>

            <View style={styles.sep} />

            <Field label="Handle">
              <View style={styles.handleRow}>
                <Text style={styles.handleAt}>@</Text>
                <TextInput
                  style={[styles.input, styles.inputInline]}
                  value={handle}
                  onChangeText={t => setHandle(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="ton_handle"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  autoCapitalize="none"
                  maxLength={30}
                />
              </View>
            </Field>

            <View style={styles.sep} />

            <Field label="Bio" hint={`${bio.length}/200`}>
              <TextInput style={[styles.input, styles.inputMultiline]}
                value={bio} onChangeText={setBio}
                placeholder="Décris-toi en quelques mots…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline maxLength={200} textAlignVertical="top" />
            </Field>
          </View>

          {/* couleur */}
          <Text style={styles.sectionLabel}>Couleur</Text>
          <View style={[styles.card, styles.colorCard]}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
                onPress={() => setColor(c)}>
                {color === c && <TBIcon name="check" size={16} color="#fff" strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* compte */}
          <Text style={styles.sectionLabel}>Compte</Text>
          {profile?.hasPassword ? (
            <View style={styles.card}>
              <Field label="Email">
                <TextInput style={styles.input} value={email} onChangeText={setEmail}
                  placeholder="email@exemple.com" placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="email-address" autoCapitalize="none" />
              </Field>

              <View style={styles.sep} />

              <Field label="Mot de passe actuel" hint="Requis pour changer le mot de passe">
                <TextInput style={styles.input} value={currentPw} onChangeText={setCurrentPw}
                  placeholder="••••••••" placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry />
              </Field>

              <View style={styles.sep} />

              <Field label="Nouveau mot de passe" hint="8 caractères minimum">
                <TextInput style={styles.input} value={newPw} onChangeText={setNewPw}
                  placeholder="••••••••" placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry />
              </Field>
            </View>
          ) : (
            <View style={[styles.card, styles.googleCard]}>
              <TBIcon name="profile" size={20} color={C.textMuted} />
              <Text style={styles.googleText}>
                Connecté via Google — email et mot de passe non modifiables ici.
              </Text>
            </View>
          )}

          {/* déconnexion + suppression */}
          <Text style={styles.sectionLabel}>Session</Text>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() =>
              Alert.alert('Se déconnecter', 'Tu veux vraiment te déconnecter ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Se déconnecter', style: 'destructive', onPress: () => { router.back(); signOut(); } },
              ])
            }>
            <TBIcon name="close" size={18} color="#ff5e7d" />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() =>
              Alert.alert(
                'Supprimer le compte',
                'Cette action est irréversible. Toutes tes critiques, listes et abonnements seront supprimés définitivement.',
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Supprimer définitivement',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await apiJson('/api/user/delete', { method: 'DELETE' });
                        router.back();
                        signOut();
                      } catch {
                        Alert.alert('Erreur', 'Impossible de supprimer le compte. Réessaie plus tard.');
                      }
                    },
                  },
                ],
              )
            }>
            <Text style={styles.deleteBtnText}>Supprimer mon compte</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerBtn: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  headerTitle: { flex: 1, fontFamily: F.headline, fontWeight: '800', fontSize: 18, color: C.text, letterSpacing: -0.4, textAlign: 'center' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.text, minWidth: 90, alignItems: 'center', minHeight: 36, justifyContent: 'center' },
  saveBtnText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 13, color: C.bg },
  errorBox: { marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,45,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,45,107,0.3)' },
  errorText: { fontSize: 13.5, color: '#ff5e7d', lineHeight: 20 },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarName: { fontFamily: F.headline, fontWeight: '800', fontSize: 20, color: C.text, marginTop: 12, letterSpacing: -0.5 },
  avatarHandle: { fontFamily: F.mono, fontSize: 12, color: C.textMuted, marginTop: 4 },
  sectionLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.5, color: C.textMuted, textTransform: 'uppercase', marginBottom: 10, marginTop: 24 },
  card: { borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  sep: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },
  field: { paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2, color: C.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  fieldHint: { fontFamily: F.mono, fontSize: 10.5, color: C.textFaint, marginTop: 6 },
  input: { color: '#fff', fontSize: 15, paddingVertical: 0 },
  inputInline: { flex: 1 },
  inputMultiline: { minHeight: 64, lineHeight: 22 },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  handleAt: { fontSize: 15, color: C.textMuted },
  colorCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  swatchActive: { borderWidth: 3, borderColor: '#fff' },
  googleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  googleText: { flex: 1, fontSize: 13.5, color: C.textMuted, lineHeight: 20 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 14, backgroundColor: 'rgba(255,94,125,0.1)', borderWidth: 1, borderColor: 'rgba(255,94,125,0.25)', marginTop: 10 },
  logoutText: { fontFamily: F.headlineSemi, fontWeight: '700', fontSize: 15, color: '#ff5e7d' },
  deleteBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  deleteBtnText: { fontFamily: F.mono, fontSize: 12, color: 'rgba(255,94,125,0.45)', textDecorationLine: 'underline' },
});
