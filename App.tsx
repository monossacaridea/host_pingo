import React from 'react';
import './src/utils/webAlert';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ControlScreen from './src/screens/ControlScreen';
import FlowsScreen from './src/screens/FlowsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AccountScreen from './src/screens/AccountScreen';

const Stack = createNativeStackNavigator();

function Routes() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#F4F8FD' }}>
        <ActivityIndicator size="large" color="#1565A0" />
      </View>
    );
  }

  // Abas (Início, Fluxos, Histórico, Ajustes) sem animação; Conta abre por cima.
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center', headerShown: false, animation: 'none' }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={ControlScreen} />
          <Stack.Screen name="Flows" component={FlowsScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Account" component={AccountScreen} options={{ animation: 'default' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'default' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Routes />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
