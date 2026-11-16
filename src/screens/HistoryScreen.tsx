import React, { useEffect, useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDevice } from '../hooks/useDevice';
import { HistoryEntry, subscribeHistory } from '../services/historyService';
import { litersToBRL, saveMachineCapacity } from '../services/economyService';
import { Screen, Hero, Badge, Icon, common } from '../components/ui';
import { colors, shadow } from '../theme';

const LITERS_PER_KG = 9; // estimativa: ~9 L de água por kg por ciclo completo
const CHIPS = [11, 13, 15, 17];

const fmt = (d: Date) =>
  d.toLocaleDateString('pt-BR') + ', ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function HistoryScreen({ navigation }: any) {
  const { deviceId, device } = useDevice();
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [kg, setKg] = useState('');

  useEffect(() => {
    if (!deviceId) { setItems([]); return; }
    return subscribeHistory(deviceId, setItems); // US09
  }, [deviceId]);

  useEffect(() => {
    AsyncStorage.getItem('@pingo_machine_capacity').then((v) => v && setKg((cur) => cur || v)).catch(() => {});
  }, []);
  useEffect(() => {
    const k = device?.config.machineKg;
    if (k) setKg((cur) => cur || String(k));
  }, [device?.config.machineKg]);

  const total = items.reduce((sum, i) => sum + i.liters, 0);
  const kgNum = Number(kg);

  const saveCapacity = async () => {
    if (!kg.trim() || isNaN(kgNum) || kgNum <= 0) {
      Alert.alert('Atenção', 'Insira um valor numérico válido em kg (ex: 10, 12, 15).');
      return;
    }
    try {
      await saveMachineCapacity(kgNum); // salva local + envia ao ESP32 (US10)
      Alert.alert('Sucesso', 'Capacidade da máquina salva com sucesso!');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a capacidade.');
    }
  };

  return (
    <Screen navigation={navigation} active="History" subtitle="Histórico">
      <Hero>
        <View style={s.rowBetween}>
          <View style={s.pill}><View style={s.pillDot} /><Text style={s.pillText}>{deviceId ? 'TELEMETRIA ATIVA' : 'SEM TELEMETRIA'}</Text></View>
          {device?.status.firmware ? <View style={s.pill}><Text style={s.pillText}>ESP32 {device.status.firmware}</Text></View> : null}
        </View>
        <Text style={s.heroLabel}>Histórico de Reuso</Text>
        <Text style={s.heroValue}>{total.toFixed(1)} L <Text style={s.heroMoney}>● R$ {litersToBRL(total).replace('.', ',')}</Text></Text>
        <Text style={s.heroSub}>Total consolidado dos últimos {items.length} registros</Text>
        <View style={s.glassRow}>
          <View style={s.glass}>
            <View style={s.glassHead}><Icon name="waves" size={16} color="#fff" /><Text style={s.glassLabel}> Água Poupada</Text></View>
            <Text style={s.glassValue}>{total.toFixed(0)} <Text style={s.glassUnit}>Litros</Text></Text>
          </View>
          <View style={s.glass}>
            <View style={s.glassHead}><Icon name="cash-multiple" size={16} color="#fff" /><Text style={s.glassLabel}> Valor Estimado</Text></View>
            <Text style={s.glassValue}>R$ {litersToBRL(total).replace('.', ',')}</Text>
          </View>
        </View>
      </Hero>

      {items.length === 0 ? (
        <View style={[common.card, { alignItems: 'center', paddingVertical: 28 }]}>
          <View style={s.bigDrop}><Icon name="water" size={34} color="#fff" /></View>
          <Text style={s.emptyTitle}>Nenhum ciclo registrado ainda.</Text>
          <Text style={s.emptyText}>
            {deviceId ? 'Os ciclos aparecem aqui assim que o dispositivo concluir o primeiro reuso.'
              : 'Vincule seu dispositivo ESP32 para acompanhar cada litro reutilizado em tempo real.'}
          </Text>
          {!deviceId && (
            <>
              <TouchableOpacity style={[common.primaryBtn, { alignSelf: 'stretch', marginTop: 20, backgroundColor: colors.hero }]}
                onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Settings' }] })} activeOpacity={0.85}>
                <Icon name="lightning-bolt-outline" size={20} color="#fff" />
                <Text style={common.primaryBtnText}>Conectar dispositivo</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                <Icon name="wifi" size={14} />
                <Text style={s.smallNote}> Wi-Fi pronto para parear</Text>
              </View>
            </>
          )}
        </View>
      ) : (
        items.map((i) => (
          <View key={i.id} style={[common.card, { marginTop: 12 }]}>
            <View style={s.rowBetween}>
              <Text style={s.itemTitle}>{i.cycleName}</Text>
              <Badge text={`${i.durationMin} min`} />
            </View>
            <Text style={s.itemSub}>{fmt(i.endedAt)}</Text>
            <Text style={s.itemDetail}>Água reusada: ~{i.liters.toFixed(1)} L • R$ {litersToBRL(i.liters).replace('.', ',')}</Text>
          </View>
        ))
      )}

      {/* US03: cadastro da máquina */}
      <View style={common.card}>
        <View style={s.rowBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={s.machineIcon}><Icon name="washing-machine" size={22} /></View>
            <Text style={[common.sectionTitle, { fontSize: 19, marginLeft: 10 }]}>Cadastro da Máquina</Text>
          </View>
        </View>
        <Badge text="Estimativas" style={{ alignSelf: 'flex-start', marginTop: 8 }} />
        <Text style={s.machineDesc}>Informe a capacidade total da sua máquina em quilos (kg) para calcular a estimativa de água reaproveitada com precisão.</Text>

        <View style={s.rowBetween}>
          <Text style={common.label}>Capacidade Nominal</Text>
          <Text style={s.smallNote}>Padrão nacional: 11kg a 17kg</Text>
        </View>
        <View style={[common.input, s.kgBox]}>
          <Icon name="scale-bathroom" size={22} color={colors.sub} />
          <TextInput style={s.kgInput} keyboardType="numeric" value={kg} onChangeText={setKg} placeholder="Ex: 11" placeholderTextColor="#94A3B8" />
          <Badge text="KG" bg={colors.chip} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
          <Text style={s.commonLabel}>Comuns:</Text>
          {CHIPS.map((c) => (
            <TouchableOpacity key={c} onPress={() => setKg(String(c))}
              style={[s.chip, Number(kg) === c && { backgroundColor: colors.chip }]}>
              <Text style={[s.chipText, Number(kg) === c && { color: colors.primary }]}>{c} kg</Text>
            </TouchableOpacity>
          ))}
        </View>

        {kgNum > 0 && (
          <View style={s.info}>
            <Icon name="information-outline" size={20} />
            <Text style={s.infoText}>
              Cada ciclo de lavagem completa em uma máquina de <Text style={{ fontWeight: '800' }}>{kgNum}kg</Text> consome
              aproximadamente <Text style={{ fontWeight: '800' }}>{Math.round(kgNum * LITERS_PER_KG)} litros</Text> de água limpa.
            </Text>
          </View>
        )}

        <TouchableOpacity style={[common.primaryBtn, { marginTop: 18 }]} onPress={saveCapacity} activeOpacity={0.85}>
          <Icon name="check" size={20} color="#fff" />
          <Text style={common.primaryBtnText}>Salvar Capacidade</Text>
        </TouchableOpacity>
      </View>

      <View style={s.footer}>
        <View style={s.leaf}><Icon name="leaf" size={20} /></View>
        <Text style={s.footerText}>Pingo inteligente: 100% ecológico</Text>
        <TouchableOpacity onPress={() => Alert.alert('Ajuda', 'Vincule o ESP32 em Ajustes, informe a capacidade da máquina e ative os ciclos na tela Início.')}>
          <Text style={s.link}>Ajuda & FAQs</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', marginRight: 6 },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  heroLabel: { fontSize: 15, color: '#fff', fontWeight: '600', marginTop: 18 },
  heroValue: { fontSize: 48, fontWeight: '800', color: '#fff' },
  heroMoney: { fontSize: 20, fontWeight: '700' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  glassRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  glass: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: 14 },
  glassHead: { flexDirection: 'row', alignItems: 'center' },
  glassLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  glassValue: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 8 },
  glassUnit: { fontSize: 15, fontWeight: '500' },
  bigDrop: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 10, borderColor: colors.soft },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 18, textAlign: 'center' },
  emptyText: { fontSize: 15, color: colors.sub, textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: 8 },
  smallNote: { fontSize: 12, color: colors.sub },
  itemTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 13, color: colors.sub, marginTop: 6 },
  itemDetail: { fontSize: 14, color: colors.primary, fontWeight: '600', marginTop: 6 },
  machineIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  machineDesc: { fontSize: 15, color: colors.sub, lineHeight: 22, marginVertical: 12 },
  kgBox: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingVertical: 6 },
  kgInput: { flex: 1, fontSize: 18, color: colors.text, marginHorizontal: 10, paddingVertical: 6 },
  commonLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  chip: { backgroundColor: '#EEF3F9', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.sub },
  info: { flexDirection: 'row', backgroundColor: '#EEF3F9', borderRadius: 14, padding: 14, marginTop: 16, gap: 10 },
  infoText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E4EAF1', borderRadius: 16, padding: 12, marginHorizontal: 20, marginTop: 20 },
  leaf: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  footerText: { flex: 1, fontSize: 13, color: colors.text },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
