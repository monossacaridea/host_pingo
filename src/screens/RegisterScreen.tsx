import React, { useState } from 'react';
import { Text, View, Alert } from 'react-native';
import { isValidEmail, isValidPassword } from '../utils/authValidation';
import { registerUser, authErrorMessage } from '../services/authService';
import { Icon } from '../components/ui';
import { AuthShell, IconInput, FieldLabel, AuthButton, OrDivider, authStyles as t } from '../components/AuthShell';
import { colors } from '../theme';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const clear = (k: keyof typeof errors) => setErrors((e) => ({ ...e, [k]: '' }));

  const handleRegister = async () => {
    const nameOk = name.trim().length >= 2;
    const emailOk = isValidEmail(email);
    const passOk = isValidPassword(password);
    const match = password === confirm;
    setErrors({
      name: nameOk ? '' : 'Informe seu nome.',
      email: emailOk ? '' : 'Informe um e-mail válido.',
      password: passOk ? '' : 'Use ao menos 8 caracteres, incluindo letra, número e caractere especial.',
      confirm: match ? '' : 'As senhas informadas não são iguais.',
    });
    if (!nameOk || !emailOk || !passOk || !match) return;

    setLoading(true);
    try {
      await registerUser(name, email, password); // login automático
    } catch (e) {
      Alert.alert('Não foi possível criar a conta', authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login'));

  return (
    <AuthShell title="CADASTRO" onBack={back} overlap subtitle="Preencha seus dados para gerenciar a válvula e o reúso de água">
      <Text style={t.cardTitle}>Criar conta</Text>
      <Text style={t.cardSub}>Preencha seus dados para se cadastrar no Sistema Hídrico</Text>

      <FieldLabel>Nome</FieldLabel>
      <IconInput icon="account-outline" placeholder="Seu nome" value={name} error={errors.name}
        onChangeText={(v: string) => { setName(v); clear('name'); }} autoComplete="name" accessibilityLabel="Nome" />

      <FieldLabel>E-mail</FieldLabel>
      <IconInput icon="email-outline" placeholder="exemplo@email.com" value={email} error={errors.email}
        onChangeText={(v: string) => { setEmail(v); clear('email'); }}
        autoCapitalize="none" keyboardType="email-address" autoComplete="email" accessibilityLabel="E-mail" />

      <FieldLabel>Senha</FieldLabel>
      <IconInput icon="lock-outline" secure placeholder="Mínimo de 8 caracteres" value={password} error={errors.password}
        onChangeText={(v: string) => { setPassword(v); clear('password'); }} autoComplete="new-password" accessibilityLabel="Senha" />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <Icon name="information-outline" size={18} color={colors.primary} />
        <Text style={[t.hint, { marginLeft: 6 }]}>Inclua uma letra, um número e um caractere especial.</Text>
      </View>

      <FieldLabel>Confirmar senha</FieldLabel>
      <IconInput icon="lock-outline" secure placeholder="Digite a senha novamente" value={confirm} error={errors.confirm}
        onChangeText={(v: string) => { setConfirm(v); clear('confirm'); }} autoComplete="new-password" accessibilityLabel="Confirmar senha"
        onSubmitEditing={handleRegister} />

      <AuthButton label="Criar conta" onPress={handleRegister} loading={loading} />

      <OrDivider text="CADASTRO RÁPIDO" />
      <Text style={t.bottomText}>
        Já tem uma conta?{' '}
        <Text style={t.link} onPress={back}>Entrar</Text>
      </Text>
    </AuthShell>
  );
}
