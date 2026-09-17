import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/client';

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleRegister = async () => {
    if (!phone.trim() || !username.trim() || !password) {
      Alert.alert('Validation', 'Please enter your phone number, username, and password');
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiClient.post('/api/v1/auth/register', {
        phone: phone.trim(),
        username: username.trim(),
        password,
        dateOfBirth: '2000-01-01',
        acceptTerms: true,
      });

      const { user, tokens } = res.data;
      await setAuth(user, tokens.accessToken, tokens.refreshToken);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Main');
      }
    } catch (err: any) {
      Alert.alert(
        'Registration Failed',
        err.response?.data?.message || 'Could not register account. Check your details.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>KENO</Text>
      <Text style={styles.title}>Create Player Account</Text>

      <View style={styles.form}>
        <Text style={styles.label}>MOBILE PHONE NUMBER</Text>
        <TextInput
          style={styles.input}
          placeholder="+1 555 123 4567"
          placeholderTextColor="#64748B"
          value={phone}
          onChangeText={setPhone}
          autoCapitalize="none"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>PLAYER USERNAME</Text>
        <TextInput
          style={styles.input}
          placeholder="LuckyWinner99"
          placeholderTextColor="#64748B"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#64748B"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          onPress={handleRegister}
          disabled={isLoading}
          style={styles.button}
        >
          {isLoading ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <Text style={styles.buttonText}>REGISTER & CLAIM $500 DEMO</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.switchButton}
        >
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchHighlight}>Sign In</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Main');
            }
          }}
          style={styles.guestButton}
        >
          <Text style={styles.guestText}>👀 Watch Live as Guest</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0A0F1D',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    color: '#F59E0B',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  form: {
    gap: 12,
  },
  label: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  switchButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  switchText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  switchHighlight: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  guestButton: {
    marginTop: 12,
    alignItems: 'center',
    padding: 10,
  },
  guestText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
