import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, shadow } from '../theme';

export const Icon = ({ lib = 'mci', name, size = 22, color = colors.primary, style }: any) => {
  const C: any = lib === 'ion' ? Ionicons : MaterialCommunityIcons;
  return <C name={name} size={size} color={color} style={style} />;
};

export const timeAgo = (d: Date | null) => {
  if (!d) return 'nunca';
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `há ${s} s`;
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} horas`;
  return `há ${Math.round(s / 86400)} dias`;
};

export function AppHeader({ subtitle, navigation }: any) {
  const { user } = useAuth();
  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();
  return (
    <View style={s.header}>
      <View style={s.logo}><Icon lib="ion" name="water" size={22} /></View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={s.brand}>Pingo</Text>
        <Text style={s.brandSub}>{subtitle}</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'History' }] })} style={s.hIcon}>
        <Icon name="bell-ring-outline" size={22} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Account')} style={s.avatar}>
        <Text style={s.avatarText}>{initial}</Text>
      </TouchableOpacity>
    </View>
  );
}

const drops = [
  { t: 8, l: 18, z: 34 }, { t: 40, l: 150, z: 46 }, { t: 0, l: 270, z: 30 },
  { t: 90, l: 320, z: 50 }, { t: 120, l: 70, z: 36 },
];

export function Hero({ children }: any) {
  return (
    <View style={s.hero}>
      {drops.map((d, i) => (
        <Ionicons key={i} name="water" size={d.z} color="rgba(255,255,255,0.14)"
          style={{ position: 'absolute', top: d.t, left: d.l }} />
      ))}
      {children}
    </View>
  );
}

export const HeroTitle = ({ title, subtitle }: any) => (
  <View>
    <Text style={s.heroTitle}>{title}<Text style={{ fontSize: 22 }}> ●</Text></Text>
    {subtitle ? <Text style={s.heroSub}>{subtitle}</Text> : null}
  </View>
);

export const Badge = ({ text, bg = colors.chip, color = colors.primary, style }: any) => (
  <View style={[s.badge, { backgroundColor: bg }, style]}>
    <Text style={[s.badgeText, { color }]}>{text}</Text>
  </View>
);

const TABS = [
  { key: 'Home', label: 'Início', icon: 'home-outline' },
  { key: 'Flows', label: 'Fluxos', icon: 'waves' },
  { key: 'History', label: 'Histórico', icon: 'history' },
  { key: 'Settings', label: 'Ajustes', icon: 'tune-variant' },
];

export function BottomNav({ active, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.nav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <TouchableOpacity key={t.key} style={s.tab} activeOpacity={0.7}
            onPress={() => !on && navigation.reset({ index: 0, routes: [{ name: t.key }] })}>
            <Icon name={t.icon} size={24} color={on ? colors.primary : '#44566A'} />
            <Text style={[s.tabLabel, on && { color: colors.primary, fontWeight: '700' }]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Screen({ navigation, active, subtitle, children }: any) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <AppHeader subtitle={subtitle} navigation={navigation} />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      <BottomNav active={active} navigation={navigation} />
    </SafeAreaView>
  );
}

export const common = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 16, marginHorizontal: 20, marginTop: 16, ...shadow },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  sectionSub: { fontSize: 13, color: colors.sub, marginTop: 2 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 28, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  input: { backgroundColor: '#EEF3F9', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
});

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.bg },
  logo: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 20, fontWeight: '800', color: colors.primary, lineHeight: 22 },
  brandSub: { fontSize: 12, fontWeight: '600', color: colors.sub },
  hIcon: { padding: 8, marginRight: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 16 },
  hero: { backgroundColor: colors.hero, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, overflow: 'hidden' },
  heroTitle: { fontSize: 38, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.92)', marginTop: 4 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  nav: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  tab: { alignItems: 'center', paddingHorizontal: 12, minWidth: 70 },
  tabLabel: { fontSize: 12, color: '#44566A', marginTop: 2, fontWeight: '500' },
});
