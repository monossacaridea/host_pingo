import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Icon } from './ui';
import { colors, shadow } from '../theme';

const GRID = Array.from({ length: 80 });

type ShellProps = {
  subtitle: string;
  title?: string;          // texto pequeno no topo (ex.: CADASTRO)
  onBack?: () => void;
  overlap?: boolean;       // cartão sobrepõe o banner
  heroColor?: string;
  children: React.ReactNode;
};

export function AuthShell({ subtitle, title, onBack, overlap, heroColor = colors.hero, children }: ShellProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[a.hero, { backgroundColor: heroColor, paddingTop: insets.top + 14, paddingBottom: overlap ? 64 : 36 }]}>
          <View style={a.pattern} pointerEvents="none">
            {GRID.map((_, i) => (
              <View key={i} style={a.cell}>
                <Ionicons name="water" size={22} color="rgba(255,255,255,0.17)" />
              </View>
            ))}
          </View>

          {(onBack || title) && (
            <View style={a.topBar}>
              {onBack ? (
                <TouchableOpacity style={a.back} onPress={onBack} activeOpacity={0.7}>
                  <Icon lib="ion" name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
              ) : <View style={{ width: 44 }} />}
              <Text style={a.topTitle}>{title}</Text>
              <View style={{ width: 44 }} />
            </View>
          )}

          <View style={{ alignItems: 'center', marginTop: onBack || title ? 12 : 28 }}>
            <View style={a.logoRow}>
              <Text style={a.logo}>Pingo</Text>
              <Ionicons name="water" size={26} color="rgba(255,255,255,0.85)" style={{ marginLeft: 2, marginTop: 6 }} />
            </View>
            <View style={a.pill}>
              <Icon name="water-sync" size={18} color="#fff" />
              <Text style={a.pillText}>Sistema Hídrico</Text>
            </View>
            <Text style={a.heroSub}>{subtitle}</Text>
          </View>
        </View>

        <View style={[a.card, { marginTop: overlap ? -40 : 28 }]}>{children}</View>

        <View style={a.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={a.greenDot} />
            <Text style={a.footerMain}>Ambiente Seguro</Text>
          </View>
          <Text style={a.footerSmall}>Pingo Automation Systems • IoT Water Valve</Text>
        </View>
      </ScrollView>
    </View>
  );
}

export function IconInput({ icon, secure, error, readOnly, ...props }: any) {
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View>
      <View style={[a.inputWrap, readOnly && { backgroundColor: '#EEF3F9' }, error && { borderColor: colors.danger }]}>
        <Icon name={icon} size={20} color={colors.primary} />
        <TextInput
          style={[a.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          placeholderTextColor="#9AA9BA"
          secureTextEntry={hidden}
          editable={!readOnly}
          {...props}
        />
        {secure ? (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color="#8A99AA" />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={a.err}>{error}</Text> : null}
    </View>
  );
}

export const FieldLabel = ({ children }: any) => <Text style={a.label}>{children}</Text>;

export function AuthButton({ label, onPress, loading, icon = 'arrow-forward', disabledLook }: any) {
  return (
    <TouchableOpacity style={[a.button, (loading || disabledLook) && { opacity: 0.7 }]} onPress={onPress} disabled={loading} activeOpacity={0.85}>
      {loading ? <ActivityIndicator color="#fff" /> : (
        <>
          <Text style={a.buttonText}>{label}</Text>
          {icon ? <Icon lib="ion" name={icon} size={20} color="#fff" /> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

export const OrDivider = ({ text }: { text: string }) => (
  <View style={a.divWrap}>
    <View style={a.divLine} />
    <Text style={a.divText}>{text}</Text>
    <View style={a.divLine} />
  </View>
);

export const authStyles = StyleSheet.create({
  cardTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
  cardSub: { fontSize: 15, color: colors.sub, marginTop: 4, marginBottom: 8, lineHeight: 21 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  hint: { fontSize: 13, color: colors.sub, lineHeight: 19 },
  linkRight: { alignSelf: 'flex-end', marginTop: 14 },
  link: { color: '#0A78BD', fontWeight: '700', fontSize: 15 },
  bottomText: { textAlign: 'center', color: colors.sub, fontSize: 15 },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 22 },
});

const a = StyleSheet.create({
  hero: { borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingHorizontal: 24, overflow: 'hidden' },
  pattern: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', flexWrap: 'wrap', paddingTop: 6 },
  cell: { width: '11.11%', alignItems: 'center', paddingVertical: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.4 },
  logoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  logo: { fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 16, paddingVertical: 7, marginTop: 8 },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  heroSub: { color: 'rgba(255,255,255,0.95)', fontSize: 16, textAlign: 'center', marginTop: 14, lineHeight: 23, maxWidth: 340 },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24, marginHorizontal: 20, alignSelf: 'center', width: '92%', maxWidth: 480, ...shadow },
  label: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 18, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F9FC', borderWidth: 1, borderColor: '#DCE6F0', borderRadius: 18, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, fontSize: 16, color: colors.text, marginLeft: 12, height: '100%' },
  err: { color: colors.danger, fontSize: 12, marginTop: 6, marginLeft: 4 },
  button: { height: 58, borderRadius: 20, backgroundColor: '#0A78BD', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 26, shadowColor: '#0A78BD', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  divWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 14 },
  divLine: { flex: 1, height: 1, backgroundColor: colors.border },
  divText: { marginHorizontal: 12, fontSize: 13, letterSpacing: 1.4, color: '#8A99AA' },
  footer: { alignItems: 'center', marginTop: 'auto', paddingVertical: 28 },
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginRight: 8 },
  footerMain: { fontSize: 15, color: colors.sub },
  footerSmall: { fontSize: 12, color: '#8A99AA', marginTop: 6 },
});
