import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveMachineCapacity } from '../services/economyService';

type IconProps = { name: string; size: number; color: string };

const ScreenIcon = ({ name, size, color }: IconProps) => {
  const glyphs: Record<string, string> = {
    arrowLeft: '←',
  };

  return <Text style={{ fontSize: size, color }}>{glyphs[name] ?? '•'}</Text>;
};

const Ionicons = ScreenIcon;

export default function MachineSetupScreen({ navigation }: any) {
  const [capacity, setCapacity] = useState('');

  // Carrega a capacidade da máquina já salva no AsyncStorage
  useEffect(() => {
    const loadCapacity = async () => {
      try {
        const savedCapacity = await AsyncStorage.getItem('@pingo_machine_capacity');
        if (savedCapacity) {
          setCapacity(savedCapacity);
        }
      } catch (error) {
        console.error('Erro ao carregar capacidade da máquina:', error);
      }
    };

    loadCapacity();
  }, []);

  // Salva o valor da capacidade
  const handleSaveCapacity = async () => {
    if (!capacity.trim() || isNaN(Number(capacity)) || Number(capacity) <= 0) {
      Alert.alert('Atenção', 'Insira um valor numérico válido em kg (ex: 10, 12, 15).');
      return;
    }

    try {
      await saveMachineCapacity(Number(capacity)); // salva local + envia ao ESP32 (US10)
      Alert.alert('Sucesso', 'Capacidade da máquina salva com sucesso!');
      navigation?.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a capacidade.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
          <Ionicons name="arrowLeft" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capacidade da Máquina</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cadastro da Máquina</Text>
          <Text style={styles.cardDescription}>
            Informe a capacidade total da sua máquina em quilos (kg) para calcular a estimativa de água reaproveitada.
          </Text>

          <Text style={styles.inputLabel}>Capacidade (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 11"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={capacity}
            onChangeText={setCapacity}
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveCapacity}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>Salvar Capacidade</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  content: { padding: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  cardDescription: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 18,
  },
  saveButton: {
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
