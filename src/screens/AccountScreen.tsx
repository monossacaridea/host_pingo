import React, { useState } from 'react';
import { Text, View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { isValidEmail, isValidPassword } from '../utils/authValidation';
import { updateDisplayName, requestEmailChange, changePassword, deleteAccount, authErrorMessage } from '../services/authService';
import { Icon } from '../components/ui';
import { AuthShell, IconInput, FieldLabel, AuthButton, authStyles as t } from '../components/AuthShell';
import { colors } from '../theme';

export default function AccountScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  const run = async (fn: () => Promise<void>, okMsg: string) => {
    try {
      await fn();
      Alert.alert('Sucesso', okMsg);
    } catch (e) {
      Alert.alert('Erro', authErrorMessage(e));
    }
  };

  const needPassword = () => {
    if (!currentPassword) { Alert.alert('Atenção', 'Informe sua senha atual para confirmar.'); return false; }
    return true;
  };

  const saveName = () => {
    if (name.trim().length < 2) return Alert.alert('Atenção', 'Informe um nome válido.');
    run(() => updateDisplayName(name), 'Nome atualizado.');
  };

  const saveEmail = () => {
    if (!isValidEmail(newEmail)) return Alert.alert('Atenção', 'Informe um e-mail válido.');
    if (!needPassword()) return;
    run(async () => { await requestEmailChange(currentPassword, newEmail); setNewEmail(''); },
      'Enviamos um link de confirmação para o novo e-mail. A troca vale após você clicar nele.');
  };

  const savePassword = () => {
    if (!isValidPassword(newPassword)) {
      return Alert.alert('Atenção', 'Use ao menos 8 caracteres, incluindo letra, número e caractere especial.');
    }
    if (!needPassword()) return;
    run(async () => { await changePassword(currentPassword, newPassword); setNewPassword(''); setCurrentPassword(''); }, 'Senha alterada.');
  };

  const confirmDelete = () => {
    if (!needPassword()) return;
    Alert.alert('Excluir conta', 'Esta ação é permanente. Deseja continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => run(() => deleteAccount(currentPassword), 'Conta excluída.') },
    ]);
  };

  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.reset({ index: 0, routes: [{ name: 'Settings' }] }));

  return (
    <AuthShell title="MINHA CONTA" onBack={back} overlap heroColor="#3A86C8"
      subtitle="Gerencie seus dados pessoais, e-mail de acesso e credenciais de segurança">
      <Text style={t.sectionTitle}>Dados pessoais</Text>
      <View style={s.line} />
      <FieldLabel>Nome</FieldLabel>
      <IconInput icon="account-outline" value={name} onChangeText={setName} placeholder="Seu nome" />
      <FieldLabel>E-mail atual</FieldLabel>
      <IconInput icon="email-outline" value={user?.email ?? ''} readOnly />
      <AuthButton label="Salvar nome" onPress={saveName} icon={null} />

      <View style={t.separator} />
      <Text style={t.sectionTitle}>Confirmação de segurança</Text>
      <Text style={[t.hint, { marginTop: 6, marginBottom: 12 }]}>Para alterar e-mail, senha ou excluir a conta, informe sua senha atual.</Text>
      <IconInput icon="lock-outline" secure placeholder="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} />

      <View style={t.separator} />
      <Text style={t.sectionTitle}>Alterar e-mail</Text>
      <View style={{ height: 12 }} />
      <IconInput icon="at" placeholder="Novo e-mail" value={newEmail} onChangeText={setNewEmail}
        autoCapitalize="none" keyboardType="email-address" />
      <AuthButton label="Enviar confirmação" onPress={saveEmail} icon={null} />

      <View style={t.separator} />
      <Text style={t.sectionTitle}>Alterar senha</Text>
      <View style={{ height: 12 }} />
      <IconInput icon="lock-outline" secure placeholder="Nova senha" value={newPassword} onChangeText={setNewPassword} />
      <AuthButton label="Alterar senha" onPress={savePassword} icon={null} />

      <View style={t.separator} />
      <TouchableOpacity style={s.danger} onPress={confirmDelete} activeOpacity={0.8}>
        <Icon name="trash-can-outline" size={20} color={colors.danger} />
        <Text style={s.dangerText}>Excluir conta</Text>
      </TouchableOpacity>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  line: { height: 1, backgroundColor: colors.border, marginTop: 12 },
  danger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF0EF', borderWidth: 1, borderColor: '#F7D3D0', borderRadius: 18, height: 56 },
  dangerText: { color: colors.danger, fontSize: 17, fontWeight: '700' },
});
