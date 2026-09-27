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

export const RegisterScreen = ({ navigation }: { navigation?: any }) => {
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleRegister = async () => {
    if (!phone.trim() || !username.trim() || !password) {
      Alert.alert('Validation Error', 'Please enter your mobile phone number, username, and password');
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

      Alert.alert(
        '🎉 Registration Successful!',
        `Welcome ${user.username}! Your player account is ready. Proceed to deposit funds or start playing.`,
        [
          {
            text: '💳 Deposit Funds',
            onPress: () => {
              if (navigation) navigation.navigate('Wallet');
            },
          },
          {
            text: '🎮 Start Playing',
            onPress: () => {
              if (navigation) navigation.navigate('Main');
            },
          },
        ],
      );
    } catch (err: any) {
      Alert.alert(
        'Registration Failed',
        err.response?.data?.message || 'Could not register account. Check your details and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>⚡ KENO LIVE</Text>
      <Text style={styles.title}>Create Player Account</Text>

      <View style={styles.form}>
        <Text style={styles.label}>MOBILE PHONE NUMBER</Text>
        <TextInput
          style={styles.input}
          placeholder="+251 91 234 5678"
          placeholderTextColor="#64748B"
          value={phone}
          onChangeText={setPhone}
          autoCapitalize="none"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>PLAYER USERNAME</Text>
        <TextInput
          style={styles.input}
          placeholder="LuckyPlayer"
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
            <Text style={styles.buttonText}>REGISTER & DEPOSIT</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation?.navigate('Login')}
          style={styles.switchButton}
        >
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchHighlight}>Sign In</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (navigation?.canGoBack()) {
              navigation.goBack();
            } else {
              navigation?.navigate('Main');
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
    color: '#10B981',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 6,
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
    color: '#F8FAFC',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
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
    color: '#10B981',
    fontWeight: '800',
  },
  guestButton: {
    marginTop: 8,
    alignItems: 'center',
    padding: 8,
  },
  guestText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
