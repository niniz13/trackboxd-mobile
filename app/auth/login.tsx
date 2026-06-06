import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../../components/Logo';
import { C, F } from '../../constants/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setError(''); setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Identifiants incorrects');
    } finally { setLoading(false); }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 32 }]}>
      <View style={styles.logoRow}>
        <Logo size={40} />
        <Text style={styles.wordmark}>Trackboxd</Text>
      </View>
      <Text style={styles.subtitle}>Connecte-toi pour continuer</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail}
          placeholder="you@example.com" placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" />

        <Text style={[styles.label, { marginTop: 16 }]}>Mot de passe</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword}
          placeholder="••••••••" placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#0c0b0e" />
            : <Text style={styles.submitText}>Se connecter</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push('/auth/register')} style={styles.switchRow}>
        <Text style={styles.switchText}>Pas encore de compte ? <Text style={styles.switchLink}>S'inscrire</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 10 },
  wordmark: { fontFamily: F.headline, fontWeight: '800', fontSize: 28, color: C.text, letterSpacing: -0.8 },
  subtitle: { fontFamily: F.mono, fontSize: 11.5, color: C.textMuted, textAlign: 'center', marginBottom: 32 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 22, padding: 24, borderWidth: 1, borderColor: C.border },
  label: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.4, color: C.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  input: { width: '100%', padding: 13, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: C.border, color: '#fff', fontSize: 15 },
  error: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,45,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,45,107,0.3)', color: '#ff5e7d', fontSize: 13.5 },
  submitBtn: { marginTop: 20, paddingVertical: 15, borderRadius: 13, backgroundColor: C.text, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.2)' },
  submitText: { fontFamily: F.headline, fontWeight: '800', fontSize: 15.5, color: C.bg },
  switchRow: { alignItems: 'center', marginTop: 20 },
  switchText: { fontSize: 14, color: C.textMuted },
  switchLink: { color: C.accent, fontWeight: '600' },
});
