import React, { useState } from 'react';
import { Text, TouchableOpacity, Alert } from 'react-native';
import { isValidEmail } from '../utils/authValidation';
import { loginUser, resetPassword, authErrorMessage } from '../services/authService';
import { AuthShell, IconInput, FieldLabel, AuthButton, OrDivider, authStyles as t } from '../components/AuthShell';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const emailOk = isValidEmail(email);
    const passOk = password.length > 0; // a regra de força vale só no cadastro
    setEmailError(emailOk ? '' : 'Informe um e-mail válido.');
    setPasswordError(passOk ? '' : 'Informe sua senha.');
    if (!emailOk || !passOk) return;

    setLoading(true);
    try {
      await loginUser(email, password); // o AuthContext leva o usuário ao app
    } catch (e) {
      Alert.alert('Não foi possível entrar', authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!isValidEmail(email)) {
      setEmailError('Informe seu e-mail para redefinir a senha.');
      return;
    }
    try {
      await resetPassword(email);
      Alert.alert('E-mail enviado', 'Se o e-mail estiver cadastrado, você receberá o link de redefinição.');
    } catch (e) {
      Alert.alert('Erro', authErrorMessage(e));
    }
  };

  return (
    <AuthShell subtitle="Acesse para gerenciar a válvula e o reúso de água inteligente">
      <Text style={t.cardTitle}>Bem-vindo(a)!</Text>
      <Text style={t.cardSub}>Insira suas credenciais para continuar.</Text>

      <FieldLabel>E-mail</FieldLabel>
      <IconInput icon="email-outline" placeholder="exemplo@email.com" value={email} error={emailError}
        onChangeText={(v: string) => { setEmail(v); setEmailError(''); }}
        autoCapitalize="none" keyboardType="email-address" autoComplete="email" accessibilityLabel="E-mail" />

      <FieldLabel>Senha</FieldLabel>
      <IconInput icon="lock-outline" secure placeholder="••••••••" value={password} error={passwordError}
        onChangeText={(v: string) => { setPassword(v); setPasswordError(''); }}
        autoComplete="password" accessibilityLabel="Senha" onSubmitEditing={handleLogin} />

      <TouchableOpacity style={t.linkRight} onPress={handleForgot}>
        <Text style={t.link}>Esqueci minha senha</Text>
      </TouchableOpacity>

      <AuthButton label="Entrar" onPress={handleLogin} loading={loading} />

      <OrDivider text="ACESSO SEGURO" />
      <Text style={t.bottomText}>
        Não tem uma conta?{' '}
        <Text style={t.link} onPress={() => navigation.navigate('Register')}>Criar conta</Text>
      </Text>
    </AuthShell>
  );
}
