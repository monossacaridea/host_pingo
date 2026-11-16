import React, { useEffect, useState } from 'react';
import { Text, View, TextInput, Switch, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../hooks/useDevice';
import { sendConfig, DeviceConfig } from '../services/deviceService';
import { addCycle } from '../services/cyclesService';
import { Screen, Hero, Badge, Icon, common } from '../components/ui';
import { colors, shadow } from '../theme';

type FlowKey = 'reuseRinse' | 'reuseMainWash' | 'reuseFinalSpin';

export default function FlowsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { deviceId, device, online } = useDevice();
  const [flows, setFlows] = useState<Record<FlowKey, boolean>>({ reuseRinse: true, reuseMainWash: false, reuseFinalSpin: false });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (device) {
      const { reuseRinse, reuseMainWash, reuseFinalSpin } = device.config;
      setFlows({ reuseRinse, reuseMainWash, reuseFinalSpin });
    }
  }, [device?.config.reuseRinse, device?.config.reuseMainWash, device?.config.reuseFinalSpin]);

  const toggle = async (key: FlowKey, value: boolean) => {
    setFlows((f) => ({ ...f, [key]: value }));
    if (!deviceId) return;
    try { await sendConfig(deviceId, { [key]: value } as Partial<DeviceConfig>); } // US10
    catch { Alert.alert('Erro', 'Não foi possível enviar ao dispositivo.'); }
  };

  const save = async () => {
    const minutes = Number(duration);
    if (!name.trim() || !minutes || minutes <= 0) {
      Alert.alert('Atenção', 'Preencha o nome e uma duração válida (em minutos).');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await addCycle(user.uid, { name: name.trim(), description: description.trim(), durationMin: Math.round(minutes) });
      setName(''); setDescription(''); setDuration('');
      Alert.alert('Sucesso', 'Novo ciclo criado! Ative-o na tela Início.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o ciclo.');
    } finally {
      setSaving(false);
    }
  };

  const conn = !deviceId ? 'SEM DISPOSITIVO' : online ? 'VÁLVULA IOT CONECTADA' : 'DISPOSITIVO OFFLINE';

  return (
    <Screen navigation={navigation} active="Flows" subtitle="Fluxos">
      <Hero>
        <View style={s.connPill}>
          <View style={[s.dot, { backgroundColor: online ? '#fff' : '#FCA5A5' }]} />
          <Text style={s.connText}>{conn}</Text>
        </View>
        <Text style={s.heroTitle}>Fluxos & Ciclos</Text>
        <Text style={s.heroSub}>Gerencie as etapas de filtragem e crie automações para seu reservatório inteligente.</Text>
      </Hero>

      <View style={[common.card, s.sensor, { marginTop: -16 }]}>
        <View style={s.sensorIcon}><Icon name="sync" size={22} /></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.sensorTitle}>SENSOR ATIVO</Text>
          <Text style={s.sensorText}>O direcionamento para a cisterna é automático via sensor de fluxo.</Text>
        </View>
      </View>

      <View style={{ marginHorizontal: 20, marginTop: 24 }}>
        <Text style={common.sectionTitle}>Seleção de Fluxos</Text>
        <Text style={common.sectionSub}>Escolha quais etapas da lavagem a caixa inteligente deve direcionar para o reservatório:</Text>
      </View>

      <FlowCard icon="water-outline" title="Água do Enxágue"
        badge={flows.reuseRinse ? 'Ativo' : 'Pausa'} on={flows.reuseRinse}
        desc="Pouco sabão, ideal para lavar pisos e calçadas."
        foot="Qualidade: Classe A (Alta Pureza)" footIcon="check-decagram-outline"
        onChange={(v: boolean) => toggle('reuseRinse', v)} />
      <FlowCard icon="washing-machine" title="Água da Lavagem Principal"
        badge={flows.reuseMainWash ? 'Reuso' : 'Descarte'} on={flows.reuseMainWash}
        desc="Contém sabão e sujidades do ciclo inicial. Encaminhar diretamente ao esgoto."
        foot="Direcionamento Padrão: Bypass Sanitário" footIcon="alert-outline"
        onChange={(v: boolean) => toggle('reuseMainWash', v)} />
      <FlowCard icon="sync" title="Água da Centrifugação"
        badge={flows.reuseFinalSpin ? 'Ativo' : 'Pausa'} on={flows.reuseFinalSpin}
        desc="Último escoamento com baixo nível de resíduos."
        foot="Volume estimado: 18L por batelada" footIcon="waves"
        onChange={(v: boolean) => toggle('reuseFinalSpin', v)} />

      <View style={[s.rowBetween, { marginHorizontal: 20, marginTop: 28 }]}>
        <View>
          <Text style={common.sectionTitle}>Novo Ciclo</Text>
          <Text style={common.sectionSub}>Configure um redirecionamento personalizado</Text>
        </View>
        <View style={s.plus}><Icon name="plus-circle-outline" size={26} /></View>
      </View>

      <View style={common.card}>
        <View style={s.rowBetween}>
          <Text style={common.label}>Nome do Ciclo</Text>
          <Text style={s.required}>Obrigatório</Text>
        </View>
        <TextInput style={[common.input, { marginTop: 8 }]} placeholder="Ex: Enxágue Pesado" placeholderTextColor="#94A3B8"
          value={name} onChangeText={setName} />

        <Text style={[common.label, { marginTop: 16 }]}>Descrição</Text>
        <TextInput style={[common.input, { marginTop: 8, height: 96, textAlignVertical: 'top' }]} multiline
          placeholder="Ex: Capta água do 3º ciclo para lavagem de piso" placeholderTextColor="#94A3B8"
          value={description} onChangeText={setDescription} />

        <View style={[s.rowBetween, { marginTop: 16 }]}>
          <Text style={[common.label, { flex: 1 }]}>Duração da Válvula Aberta (minutos)</Text>
          <Badge text="⏱ Temporizador" />
        </View>
        <View style={[common.input, s.durationBox]}>
          <TextInput style={{ flex: 1, fontSize: 15, color: colors.text }} placeholder="Ex: 15 minutos" placeholderTextColor="#94A3B8"
            keyboardType="numeric" value={duration} onChangeText={setDuration} />
          <Text style={s.unit}>min</Text>
        </View>

        <TouchableOpacity style={[common.primaryBtn, { marginTop: 20 }, saving && { opacity: 0.7 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
          <Icon name="check" size={20} color="#fff" />
          <Text style={common.primaryBtnText}>Salvar Ciclo</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tip}>
        <View style={s.tipIcon}><Icon name="lightning-bolt-outline" size={22} /></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.tipTitle}>Economia Média Semanal</Text>
          <Text style={s.tipText}>Usuários Pingo economizam até 140 litros por semana reutilizando águas de enxágue.</Text>
        </View>
      </View>
    </Screen>
  );
}

function FlowCard({ icon, title, badge, on, desc, foot, footIcon, onChange }: any) {
  return (
    <View style={[common.card, { marginTop: 14 }]}>
      <View style={s.rowBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
          <View style={s.flowIcon}><Icon name={icon} size={22} color={colors.sub} /></View>
          <Text style={s.flowTitle}>{title}</Text>
          <Badge text={badge} bg={on ? colors.chip : '#E4EAF1'} color={on ? colors.primary : colors.sub} style={{ marginLeft: 8 }} />
        </View>
        <Switch value={on} onValueChange={onChange} trackColor={{ false: colors.track, true: colors.primary }} thumbColor="#fff" />
      </View>
      <Text style={s.flowDesc}>{desc}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
        <Icon name={footIcon} size={16} />
        <Text style={s.flowFoot}> {foot}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  connPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14 },
  connText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  heroTitle: { fontSize: 32, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.92)', marginTop: 6, marginBottom: 16 },
  sensor: { flexDirection: 'row', alignItems: 'center' },
  sensorIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  sensorTitle: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  sensorText: { fontSize: 14, color: colors.text, marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEF3F9', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  flowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  flowDesc: { fontSize: 14, color: colors.sub, marginTop: 12, lineHeight: 20 },
  flowFoot: { fontSize: 13, fontWeight: '600', color: colors.primary },
  plus: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  required: { fontSize: 12, fontWeight: '600', color: colors.primary },
  durationBox: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingVertical: 4 },
  unit: { fontSize: 13, fontWeight: '700', color: colors.sub },
  tip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E4EAF1', borderRadius: 18, padding: 16, marginHorizontal: 20, marginTop: 24 },
  tipIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  tipText: { fontSize: 13, color: colors.sub, marginTop: 2, lineHeight: 18 },
});
