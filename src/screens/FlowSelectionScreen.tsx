import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getWaterConfig,
  saveWaterConfig,
  WaterUsageConfig,
} from '../services/economyService';

export default function FlowSelectionScreen() {
  const navigation = useNavigation();
  const [config, setConfig] = useState<WaterUsageConfig>({
    reuseRinse: true,
    reuseMainWash: false,
    reuseFinalSpin: false,
  });

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [])
  );

  const loadConfig = async () => {
    const currentConfig = await getWaterConfig();
    setConfig(currentConfig);
  };

  const toggleSwitch = async (key: keyof WaterUsageConfig) => {
    const updated = { ...config, [key]: !config[key] };
    setConfig(updated);
    await saveWaterConfig(updated);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fluxos de Reaproveitamento</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Seleção de Fluxos</Text>
        <Text style={styles.sectionDescription}>
          Escolha quais etapas da lavagem a caixa inteligente deve direcionar para o reservatório:
        </Text>

        <View style={styles.switchGroup}>
          
          {/* Opção 1: Enxágue */}
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Ionicons name="water-outline" size={22} color="#0284C7" />
              <View style={styles.textWrapper}>
                <Text style={styles.switchTitle}>Água do Enxágue</Text>
                <Text style={styles.switchSubtitle}>Pouco sabão, ideal para lavar pisos e calçadas.</Text>
              </View>
            </View>
            <Switch
              value={config.reuseRinse}
              onValueChange={() => toggleSwitch('reuseRinse')}
              trackColor={{ false: '#CBD5E1', true: '#38BDF8' }}
              thumbColor={config.reuseRinse ? '#0284C7' : '#F1F5F9'}
            />
          </View>

          {/* Opção 2: Lavagem Principal */}
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <MaterialCommunityIcons name="washing-machine" size={22} color="#0284C7" />
              <View style={styles.textWrapper}>
                <Text style={styles.switchTitle}>Água da Lavagem Principal</Text>
                <Text style={styles.switchSubtitle}>Contém sabão e sujidades do ciclo inicial.</Text>
              </View>
            </View>
            <Switch
              value={config.reuseMainWash}
              onValueChange={() => toggleSwitch('reuseMainWash')}
              trackColor={{ false: '#CBD5E1', true: '#38BDF8' }}
              thumbColor={config.reuseMainWash ? '#0284C7' : '#F1F5F9'}
            />
          </View>

          {/* Opção 3: Centrifugação Final */}
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Feather name="rotate-cw" size={22} color="#0284C7" />
              <View style={styles.textWrapper}>
                <Text style={styles.switchTitle}>Água da Centrifugação</Text>
                <Text style={styles.switchSubtitle}>Último escoamento com baixo nível de resíduos.</Text>
              </View>
            </View>
            <Switch
              value={config.reuseFinalSpin}
              onValueChange={() => toggleSwitch('reuseFinalSpin')}
              trackColor={{ false: '#CBD5E1', true: '#38BDF8' }}
              thumbColor={config.reuseFinalSpin ? '#0284C7' : '#F1F5F9'}
            />
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  sectionDescription: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  switchGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  switchLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 10 },
  textWrapper: { flex: 1 },
  switchTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  switchSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
});