import { Alert, Platform } from 'react-native';

// No navegador o Alert.alert do React Native não faz nada. Este arquivo o substitui
// por window.alert / window.confirm apenas na web (no celular continua o Alert nativo).
if (Platform.OS === 'web') {
  (Alert as any).alert = (title: string, message?: string, buttons?: any[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    const cancel = buttons.find((b) => b.style === 'cancel');
    const action = buttons.find((b) => b !== cancel) ?? buttons[0];
    if (window.confirm(text)) action.onPress?.();
    else cancel?.onPress?.();
  };
}
