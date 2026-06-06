import { Tabs, router } from 'expo-router';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TBIcon } from '../../components/TBIcon';
import { useAuth } from '../../contexts/AuthContext';
import { C, F } from '../../constants/theme';

function ProfileThumb({ size }: { size: number }) {
  const { user } = useAuth();
  if (!user) return <TBIcon name="profile" size={size} color="rgba(255,255,255,0.4)" />;
  if (user.image) return <Image source={{ uri: user.image }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: user.color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.headline, fontWeight: '800', fontSize: size * 0.42, color: '#0c0b0e' }}>
        {user.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function TabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const items = [
    { key: 'index',    icon: 'home' },
    { key: 'discover', icon: 'search' },
    { key: 'log',      icon: 'plus', center: true },
    { key: 'activity', icon: 'bell' },
    { key: 'profile',  icon: 'profile' },
  ];

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 8 }]}>
      {items.map((item, idx) => {
        if (item.center) {
          return (
            <TouchableOpacity key="log" style={styles.centerBtn} activeOpacity={0.85}
              onPress={() => router.push('/log')}>
              <View style={styles.logBtn}>
                <TBIcon name="plus" size={26} color="#fff" strokeWidth={3} />
              </View>
            </TouchableOpacity>
          );
        }
        // map item key to route index
        const routeIdx = ['index','discover','activity','profile'].indexOf(item.key);
        const stateIdx = item.key === 'index' ? 0 : item.key === 'discover' ? 1 : item.key === 'activity' ? 2 : 3;
        const active = state.index === stateIdx;
        if (item.key === 'profile') {
          return (
            <TouchableOpacity key="profile" style={styles.tab} activeOpacity={0.7}
              onPress={() => navigation.navigate('profile')}>
              <View style={[styles.avatarRing, active && { borderColor: C.accent }]}>
                <ProfileThumb size={24} />
              </View>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity key={item.key} style={styles.tab} activeOpacity={0.7}
            onPress={() => navigation.navigate(item.key)}>
            <TBIcon name={item.icon} size={25}
              color={active ? '#fff' : 'rgba(255,255,255,0.4)'}
              strokeWidth={active ? 2.4 : 2} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: C.bg, borderTopWidth: 0,
    paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.5, shadowRadius: 12,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  centerBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logBtn: {
    width: 52, height: 52, borderRadius: 17,
    backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14,
  },
  avatarRing: {
    borderRadius: 14, borderWidth: 2, borderColor: 'transparent', padding: 1,
  },
});
