import React, { useEffect, useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Switch, Alert, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../hooks/useDevice';
import { linkDevice, unlinkDevice, sendConfig } from '../services/deviceService';
import { logoutUser } from '../services/authService';
import { Screen, Hero, HeroTitle, Badge, Icon, common, timeAgo } from '../components/ui';
import { colors } from '../theme';

export default function SettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { deviceId, device, online } = useDevice();
  const [idInput, setIdInput] = useState('');
  const [autoMode, setAutoMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [kg, setKg] = useState<string | null>(null);

  useEffect(() => { if (device) setAutoMode(device.config.autoMode); }, [device?.config.autoMode]);
  useEffect(() => {
    AsyncStorage.getItem('@pingo_machine_capacity').then(setKg).catch(() => {});
  }, []);
  const capacity = device?.config.machineKg ? String(device.config.machineKg) : kg;

  const handleLink = async () => {
    if (!user) return;
    try {
      const id = await linkDevice(user.uid, idInput);
      setIdInput('');
      Alert.alert('Sucesso', `Dispositivo ${id} vinculado.`);
    } catch (e: any) {
      Alert.alert('Erro', e?.code === 'permission-denied' ? 'Não foi possível vincular este dispositivo.' : e?.message ?? 'Falha ao vincular.');
    }
  };

  const handleUnlink = () =>
    Alert.alert('Desvincular', 'Remover o dispositivo desta conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desvincular', style: 'destructive', onPress: () => user && unlinkDevice(user.uid) },
    ]);

  const toggleAuto = async (value: boolean) => {
    setAutoMode(value);
    if (!deviceId) return;
    try { await sendConfig(deviceId, { autoMode: value }); } // US10
    catch { Alert.alert('Erro', 'Não foi possível enviar ao dispositivo.'); }
  };

  const handleLogout = () =>
    Alert.alert('Sair', 'Deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logoutUser() },
    ]);

  const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

  return (
    <Screen navigation={navigation} active="Settings" subtitle="Ajustes">
      <Hero>
        <HeroTitle title="Ajustes" subtitle="Gerenciamento da válvula inteligente & rotinas" />
      </Hero>

      <View style={[common.card, { padding: 0, overflow: 'hidden' }]}>
        <View style={s.devHead}>
          <View style={s.chipIcon}><Icon name="chip" size={28} /></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Text style={s.devName}>ESP32</Text>
              <Badge text="ESP32-WROOM" bg={colors.chip} />
            </View>
            <Text style={[s.devId, { fontFamily: mono }]}>{deviceId ?? 'sem vínculo'}</Text>
          </View>
          <Badge text={deviceId ? (online ? '● ONLINE' : '● OFFLINE') : '● SEM VÍNCULO'}
            bg={online ? '#DCFCE7' : '#E4EAF1'} color={online ? colors.success : colors.sub} />
        </View>

        {deviceId ? (
          <View style={s.signalRow}>
            <Icon name={online ? 'wifi' : 'wifi-off'} size={20} color={colors.sub} />
            <Text style={s.signalText}>Último sinal {timeAgo(device?.status.lastSeen ?? null)}</Text>
            <TouchableOpacity style={s.unlink} onPress={handleUnlink} activeOpacity={0.8}>
              <Icon name="link-off" size={16} color={colors.danger} />
              <Text style={s.unlinkText}>Desvincular</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.linkBox}>
            <Text style={common.label}>ID do dispositivo</Text>
            <TextInput style={[common.input, { marginTop: 8 }]} value={idInput} onChangeText={setIdInput}
              autoCapitalize="none" placeholder="Ex: pingo-a1b2c3 (exibido no portal Wi-Fi)" placeholderTextColor="#94A3B8" />
            <TouchableOpacity style={[common.primaryBtn, { marginTop: 12 }]} onPress={handleLink} activeOpacity={0.85}>
              <Icon name="link-variant" size={20} color="#fff" />
              <Text style={common.primaryBtnText}>Vincular dispositivo</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.autoRow}>
          <View style={s.roundIcon}><Icon name="robot-outline" size={24} /></View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={s.rowTitle}>Modo Automático</Text>
            <Text style={s.rowSub}>Acionar válvula pelos sensores</Text>
          </View>
          <Switch value={autoMode} onValueChange={toggleAuto} trackColor={{ false: colors.track, true: colors.primary }} thumbColor="#fff" />
        </View>
      </View>

      <SectionHeader title="PREFERÊNCIAS" right="Notificações e Rotinas" />
      <View style={[common.card, { marginTop: 8, padding: 0 }]}>
        <View style={s.prefRow}>
          <View style={s.roundIcon}><Icon name="bell-ring-outline" size={24} /></View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={s.rowTitle}>Notificações do App</Text>
            <Text style={s.rowSub}>Alertas de reservatório cheio/ciclo</Text>
          </View>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: colors.track, true: colors.primary }} thumbColor="#fff" />
        </View>
        <TouchableOpacity style={s.prefRow} activeOpacity={0.7} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'History' }] })}>
          <View style={s.roundIcon}><Icon name="washing-machine" size={24} /></View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={s.rowTitle}>Capacidade da Máquina</Text>
            <Text style={s.rowSub}>Cadastrar quilos da máquina de lavar</Text>
          </View>
          {capacity ? <Badge text={`${capacity} kg`} style={{ marginRight: 8 }} /> : null}
          <Icon lib="ion" name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.prefRow, { borderBottomWidth: 0 }]} activeOpacity={0.7} onPress={() => navigation.navigate('Account')}>
          <View style={s.roundIcon}><Icon name="account-cog-outline" size={24} color={colors.sub} /></View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={s.rowTitle}>Minha Conta</Text>
            <Text style={s.rowSub}>Nome, e-mail e senha</Text>
          </View>
          <Icon lib="ion" name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <SectionHeader title="SOBRE O DISPOSITIVO" right="Firmware & Software" />
      <View style={[common.card, { marginTop: 8, padding: 0 }]}>
        <View style={s.prefRow}>
          <Icon name="download-box-outline" size={22} />
          <Text style={[s.rowTitle, { flex: 1, marginLeft: 12 }]}>Versão do Firmware</Text>
          <Badge text={device?.status.firmware ?? '-'} bg="#E4EAF1" color={colors.sub} />
        </View>
        <View style={[s.prefRow, { borderBottomWidth: 0 }]}>
          <Icon name="cellphone" size={22} />
          <Text style={[s.rowTitle, { flex: 1, marginLeft: 12 }]}>Versão do App</Text>
          <Badge text="1.0.0 (Protótipo)" />
        </View>
      </View>

      <TouchableOpacity style={[common.card, s.logout]} onPress={handleLogout} activeOpacity={0.8}>
        <Icon name="logout" size={22} color={colors.danger} />
        <Text style={s.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>

      <View style={{ alignItems: 'center', marginTop: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="access-point" size={16} color={colors.sub} />
          <Text style={s.footer}> Pingo Automation Systems</Text>
        </View>
        <Text style={s.footerSmall}>Conectado via Wi-Fi/Firebase • Todos os direitos reservados</Text>
      </View>
    </Screen>
  );
}

const SectionHeader = ({ title, right }: any) => (
  <View style={s.sectionHead}>
    <Text style={s.sectionTitle}>{title}</Text>
    <Text style={s.sectionRight}>{right}</Text>
  </View>
);

const s = StyleSheet.create({
  devHead: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  chipIcon: { width: 54, height: 54, borderRadius: 14, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  devName: { fontSize: 24, fontWeight: '800', color: colors.text },
  devId: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4 },
  signalRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F7FAFD', borderTopWidth: 1, borderTopColor: colors.border },
  signalText: { flex: 1, marginLeft: 8, fontSize: 14, color: colors.sub },
  unlink: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dangerSoft, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  unlinkText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  linkBox: { padding: 16, backgroundColor: '#F7FAFD', borderTopWidth: 1, borderTopColor: colors.border },
  autoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F2F6FB' },
  roundIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 14, color: colors.sub, marginTop: 2 },
  prefRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 28, marginTop: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#3D5A80', letterSpacing: 0.6 },
  sectionRight: { fontSize: 13, color: colors.sub },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, marginTop: 24 },
  logoutText: { color: colors.danger, fontSize: 18, fontWeight: '700' },
  footer: { fontSize: 15, color: colors.sub },
  footerSmall: { fontSize: 12, color: '#8A99AA', marginTop: 6, textAlign: 'center' },
});
