import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../hooks/useDevice';
import { setValve, sendConfig } from '../services/deviceService';
import { CustomCycle, subscribeCycles, setCycleEnabled, removeCycle, toDeviceCycles } from '../services/cyclesService';
import { subscribeHistory } from '../services/historyService';
import { litersToBRL } from '../services/economyService';
import { Screen, Hero, HeroTitle, Badge, Icon, common } from '../components/ui';
import { colors, shadow } from '../theme';

const MONTH_GOAL_L = 250;

export default function ControlScreen({ navigation }: any) {
  const { user } = useAuth();
  const { deviceId, device, online } = useDevice();
  const [custom, setCustom] = useState<CustomCycle[]>([]);
  const [quick, setQuick] = useState(true);
  const [extra, setExtra] = useState(false);
  const [monthLiters, setMonthLiters] = useState(0);

  useEffect(() => {
    if (!user) return;
    return subscribeCycles(user.uid, setCustom);
  }, [user]);

  useEffect(() => {
    if (device) { setQuick(device.config.quickCycle); setExtra(device.config.extraCycle); }
  }, [device?.config.quickCycle, device?.config.extraCycle]);

  // água poupada do mês corrente, somada do histórico enviado pelo ESP32
  useEffect(() => {
    if (!deviceId) { setMonthLiters(0); return; }
    return subscribeHistory(deviceId, (list) => {
      const now = new Date();
      setMonthLiters(
        list.filter((i) => i.endedAt.getMonth() === now.getMonth() && i.endedAt.getFullYear() === now.getFullYear())
          .reduce((sum, i) => sum + i.liters, 0),
      );
    }, 200);
  }, [deviceId]);

  const guard = async (fn: () => Promise<void>) => {
    try { await fn(); } catch { Alert.alert('Erro', 'Não foi possível enviar ao dispositivo. Verifique sua conexão.'); }
  };

  const valveOn = device?.status.valveOn ?? false;
  const pending = !!device && device.commandValveOn !== valveOn;

  const toggleValve = () => {
    if (!deviceId || !device) {
      Alert.alert('Nenhum dispositivo', 'Vincule seu ESP32 em Ajustes.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir Ajustes', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Settings' }] }) },
      ]);
      return;
    }
    if (!online) Alert.alert('Dispositivo offline', 'O comando será aplicado quando o dispositivo voltar a se conectar.');
    guard(() => setValve(deviceId, !device.commandValveOn));
  };

  const toggleBuiltIn = (key: 'quickCycle' | 'extraCycle', value: boolean) => {
    (key === 'quickCycle' ? setQuick : setExtra)(value);
    if (deviceId) guard(() => sendConfig(deviceId, { [key]: value }));
  };

  const toggleCustom = (c: CustomCycle, value: boolean) => {
    if (!user) return;
    guard(async () => {
      await setCycleEnabled(user.uid, c.id, value);
      if (deviceId) {
        const next = custom.map((x) => (x.id === c.id ? { ...x, enabled: value } : x));
        await sendConfig(deviceId, { cycles: toDeviceCycles(next) });
      }
    });
  };

  const confirmDelete = (c: CustomCycle) =>
    Alert.alert('Excluir ciclo', `Excluir "${c.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: () => user && guard(async () => {
          await removeCycle(user.uid, c.id);
          if (deviceId) await sendConfig(deviceId, { cycles: toDeviceCycles(custom.filter((x) => x.id !== c.id)) });
        }),
      },
    ]);

  const statusText = !deviceId ? 'Sem dispositivo vinculado'
    : online ? `Online • ${device?.status.rssi ?? '--'} dBm` : 'Dispositivo offline';
  const statusColor = online ? colors.success : colors.danger;
  const pct = Math.min(100, (monthLiters / MONTH_GOAL_L) * 100);

  return (
    <Screen navigation={navigation} active="Home" subtitle="Início">
      <Hero>
        <View style={s.heroTop}>
          <HeroTitle title="Pingo" />
          <View style={s.heroPill}><Icon name="access-point" size={14} color="#fff" /><Text style={s.heroPillText}>Reciclagem IoT</Text></View>
        </View>
        <View style={s.moduleCard}>
          <View style={s.moduleIcon}><Icon name={deviceId ? 'chip' : 'qrcode-remove'} size={26} color="#7A8CA0" /></View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={s.moduleLabel}>MÓDULO ESP32</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[s.dot, { backgroundColor: statusColor }]} />
              <Text style={s.moduleStatus}>{statusText}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.pairBtn} activeOpacity={0.8}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Settings' }] })}>
            <Icon name="wifi" size={18} color="#fff" />
            <Text style={s.pairText}>{deviceId ? 'Gerenciar' : 'Parear'}</Text>
          </TouchableOpacity>
        </View>
      </Hero>

      {/* US05 */}
      <View style={common.card}>
        <View style={s.rowBetween}>
          <View style={s.rowCenter}>
            <Icon name="valve" size={26} color={colors.text} />
            <Text style={[common.sectionTitle, { marginLeft: 8 }]}>Válvula de Desvio</Text>
          </View>
          <Badge
            text={pending ? 'AGUARDANDO' : valveOn ? 'LIGADA' : 'DESLIGADA'}
            bg={valveOn && !pending ? '#DCFCE7' : colors.dangerSoft}
            color={valveOn && !pending ? colors.success : colors.danger} />
        </View>
        <Text style={s.desc}>Controle magnético direto do atuador solenoide. Em repouso, a água é drenada para a rede de esgoto.</Text>
        <TouchableOpacity style={common.primaryBtn} onPress={toggleValve} activeOpacity={0.85}>
          <Icon name="power" size={22} color="#fff" />
          <Text style={common.primaryBtnText}>{device?.commandValveOn ? 'Desligar Válvula' : 'Acionar Válvula'}</Text>
        </TouchableOpacity>
      </View>

      {/* US11 */}
      <View style={[s.rowBetween, { marginHorizontal: 20, marginTop: 28 }]}>
        <View style={s.rowCenter}>
          <Icon name="leaf" size={22} />
          <Text style={[common.sectionTitle, { marginLeft: 8 }]}>Impacto Ecológico</Text>
        </View>
        <Badge text="Este Mês" bg="#E4EAF1" color={colors.text} />
      </View>
      <View style={s.impactRow}>
        <View style={s.impactCard}>
          <View style={s.rowBetween}><Text style={s.impactLabel}>ÁGUA POUPADA</Text><View style={s.impactIcon}><Icon lib="ion" name="water-outline" size={18} /></View></View>
          <Text style={s.impactValue}>{monthLiters.toFixed(1)} <Text style={s.impactUnit}>Litros</Text></Text>
          <View style={s.bar}><View style={[s.barFill, { width: `${Math.max(pct, 2)}%` }]} /></View>
          <Text style={s.impactFoot}>Meta: {MONTH_GOAL_L} L/mês</Text>
        </View>
        <View style={s.impactCard}>
          <View style={s.rowBetween}><Text style={s.impactLabel}>ECONOMIA</Text><View style={s.impactIcon}><Icon name="cash-multiple" size={18} /></View></View>
          <Text style={s.impactValue}>R$ {litersToBRL(monthLiters).replace('.', ',')}</Text>
          <View style={s.bar}><View style={[s.barFill, { width: `${Math.max(pct, 2)}%` }]} /></View>
          <Text style={s.impactFoot}>Tarifa sanitária local</Text>
        </View>
      </View>

      <TouchableOpacity style={s.flowCard} activeOpacity={0.8}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Flows' }] })}>
        <View style={s.flowIcon}><Icon name="call-split" size={24} /></View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={s.flowTitle}>Fluxos de Reuso & Destino</Text>
          <Text style={s.flowSub} numberOfLines={1}>Rotas automáticas para caixas de retenção</Text>
        </View>
        <View style={s.chevron}><Icon lib="ion" name="chevron-forward" size={18} /></View>
      </TouchableOpacity>

      <View style={[s.rowBetween, { marginHorizontal: 20, marginTop: 28, marginBottom: 4 }]}>
        <View style={s.rowCenter}>
          <Icon name="washing-machine" size={22} />
          <Text style={[common.sectionTitle, { marginLeft: 8 }]}>Ciclos de Lavagem</Text>
          <Badge text={`${2 + custom.length} cadastrados`} bg="#E4EAF1" color={colors.sub} style={{ marginLeft: 8 }} />
        </View>
        <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Flows' }] })}>
          <Text style={s.link}>Gerenciar</Text>
        </TouchableOpacity>
      </View>

      <CycleRow icon="timer-outline" title="Ciclo Rápido" tag="1º Enxágue" meta="~45 min" value={quick} onChange={(v: boolean) => toggleBuiltIn('quickCycle', v)} />
      <CycleRow icon="autorenew" title="Ciclo Extra" tag="2º Enxágue" meta="~70 min" value={extra} onChange={(v: boolean) => toggleBuiltIn('extraCycle', v)} />
      {custom.map((c) => (
        <CycleRow key={c.id} icon="water-sync" title={c.name} tag={c.description || undefined}
          meta={`${c.durationMin} min`} value={c.enabled} onChange={(v: boolean) => toggleCustom(c, v)}
          onLongPress={() => confirmDelete(c)} />
      ))}
      {custom.length > 0 && <Text style={s.hint}>Segure um ciclo personalizado para excluir.</Text>}

      <TouchableOpacity style={s.newCycle} activeOpacity={0.8}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Flows' }] })}>
        <Icon name="plus-circle-outline" size={24} />
        <Text style={s.newCycleText}>Novo Ciclo</Text>
      </TouchableOpacity>
    </Screen>
  );
}

function CycleRow({ icon, title, tag, meta, value, onChange, onLongPress }: any) {
  return (
    <TouchableOpacity activeOpacity={1} onLongPress={onLongPress} delayLongPress={500}
      style={[s.cycleRow, shadow]}>
      <View style={s.cycleIcon}><Icon name={icon} size={24} color={colors.sub} /></View>
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <Text style={s.cycleTitle}>{title}</Text>
          {tag ? <Badge text={tag} bg={colors.chip} color={colors.primary} style={{ marginLeft: 8, paddingVertical: 2 }} /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Icon name="clock-outline" size={14} color={colors.sub} />
          <Text style={s.cycleMeta}> {meta}</Text>
        </View>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.track, true: colors.primary }} thumbColor="#fff" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  heroPillText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  moduleCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center' },
  moduleIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EEF3F9', alignItems: 'center', justifyContent: 'center' },
  moduleLabel: { fontSize: 11, fontWeight: '700', color: colors.sub, letterSpacing: 0.6 },
  moduleStatus: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  pairBtn: { backgroundColor: colors.primary, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pairText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  desc: { fontSize: 14, color: colors.sub, lineHeight: 20, marginVertical: 12 },
  impactRow: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 12 },
  impactCard: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 14, ...shadow },
  impactLabel: { fontSize: 12, fontWeight: '700', color: colors.text, letterSpacing: 0.4 },
  impactIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  impactValue: { fontSize: 30, fontWeight: '800', color: colors.primary, marginTop: 12 },
  impactUnit: { fontSize: 14, fontWeight: '500', color: colors.sub },
  bar: { height: 6, borderRadius: 3, backgroundColor: '#E4EAF1', marginTop: 12, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  impactFoot: { fontSize: 12, color: colors.sub, marginTop: 8 },
  flowCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCE9F8', borderRadius: 18, padding: 14, marginHorizontal: 20, marginTop: 24 },
  flowIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  flowTitle: { fontSize: 17, fontWeight: '700', color: colors.primary },
  flowSub: { fontSize: 13, color: colors.sub, marginTop: 2 },
  chevron: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  link: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  cycleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginHorizontal: 20, marginTop: 10 },
  cycleIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EEF3F9', alignItems: 'center', justifyContent: 'center' },
  cycleTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cycleMeta: { fontSize: 14, color: colors.sub },
  hint: { fontSize: 12, color: colors.sub, textAlign: 'center', marginTop: 8 },
  newCycle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 18, marginHorizontal: 20, marginTop: 12, ...shadow },
  newCycleText: { color: colors.primary, fontSize: 17, fontWeight: '700' },
});
