import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Logo } from '../../components/Logo';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { C, F } from '../../constants/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError('Remplis tous les champs (mot de passe ≥ 8 caractères).'); return;
    }
    setError(''); setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la création du compte');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={[styles.screen, { paddingTop: insets.top + 32 }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled">
      <View style={styles.logoRow}>
        <Logo size={40} />
        <Text style={styles.wordmark}>Trackboxd</Text>
      </View>
      <Text style={styles.subtitle}>Crée ton compte</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Nom</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName}
          placeholder="Ton prénom" placeholderTextColor="rgba(255,255,255,0.3)" />

        <Text style={[styles.label, { marginTop: 16 }]}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail}
          placeholder="you@example.com" placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="email-address" autoCapitalize="none" />

        <Text style={[styles.label, { marginTop: 16 }]}>Mot de passe</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword}
          placeholder="8 caractères minimum" placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#0c0b0e" />
            : <Text style={styles.submitText}>Créer mon compte</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.back()} style={styles.switchRow}>
        <Text style={styles.switchText}>Déjà un compte ? <Text style={styles.switchLink}>Se connecter</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 10 },
  wordmark: { fontFamily: F.headline, fontWeight: '800', fontSize: 28, color: C.text, letterSpacing: -0.8 },
  subtitle: { fontFamily: F.mono, fontSize: 11.5, color: C.textMuted, textAlign: 'center', marginBottom: 32 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 22, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  label: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.4, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 8 },
  input: { width: '100%', padding: 13, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 15 },
  error: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,45,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,45,107,0.3)', color: '#ff5e7d', fontSize: 13.5 },
  submitBtn: { marginTop: 20, paddingVertical: 15, borderRadius: 13, backgroundColor: C.accent, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.2)' },
  submitText: { fontFamily: F.headline, fontWeight: '800', fontSize: 15.5, color: '#fff' },
  switchRow: { alignItems: 'center', marginTop: 20 },
  switchText: { fontSize: 14, color: 'rgba(255,255,255,0.45)' },
  switchLink: { color: C.accent, fontWeight: '600' },
});
