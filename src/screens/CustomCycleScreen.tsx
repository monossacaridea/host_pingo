import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { addCycle } from '../services/cyclesService';

export default function CustomCycleScreen({ navigation }: any) {
  const { user } = useAuth();
  const [cycleName, setCycleName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const minutes = Number(duration);
    if (!cycleName.trim() || !minutes || minutes <= 0) {
      Alert.alert('Atenção', 'Preencha o nome e uma duração válida (em minutos).');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await addCycle(user.uid, { name: cycleName.trim(), description: description.trim(), durationMin: Math.round(minutes) });
      Alert.alert('Sucesso', 'Novo ciclo criado com sucesso!');
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o ciclo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.form}>
        <Text style={styles.label}>Nome do Ciclo</Text>
        <TextInput style={styles.input} placeholder="Ex: Enxágue Pesado" placeholderTextColor="#94A3B8" value={cycleName} onChangeText={setCycleName} />
        <Text style={styles.label}>Descrição</Text>
        <TextInput style={styles.input} placeholder="Ex: Capta água do 3º ciclo para lavagem de piso" placeholderTextColor="#94A3B8" value={description} onChangeText={setDescription} />
        <Text style={styles.label}>Duração da Válvula Aberta (em minutos)</Text>
        <TextInput style={styles.input} placeholder="Ex: 15" placeholderTextColor="#94A3B8" keyboardType="numeric" value={duration} onChangeText={setDuration} />
        <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>Salvar Ciclo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveButton: { backgroundColor: '#0284C7', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 28 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
