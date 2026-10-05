import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/client';

export const RegisterScreen = ({ navigation }: { navigation?: any }) => {
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { setAuth } = useAuthStore();

  const scrollToOffset = (offset: number) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: offset, animated: true });
    }, 120);
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleRegister = async () => {
    setErrorMessage(null);
    setIsConflict(false);

    if (!phone.trim() || !username.trim() || !password || !confirmPassword) {
      const msg = 'Please enter your phone number, username, password, and confirm password.';
      setErrorMessage(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('Validation Error', msg);
      }
      return;
    }

    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      setErrorMessage(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('Validation Error', msg);
      }
      return;
    }

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match. Please verify your password.';
      setErrorMessage(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('Validation Error', msg);
      }
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

      if (Platform.OS === 'web') {
        if (navigation?.canGoBack()) {
          navigation.goBack();
        } else {
          navigation?.navigate('Main');
        }
        return;
      }

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
      const status = err.response?.status;
      const rawMsg = err.response?.data?.message;
      const msg = Array.isArray(rawMsg)
        ? rawMsg.join(', ')
        : rawMsg || 'Could not register account. Check your details and try again.';
      
      setErrorMessage(msg);
      setIsConflict(status === 409 || msg.toLowerCase().includes('already') || msg.toLowerCase().includes('taken'));

      if (Platform.OS !== 'web') {
        Alert.alert('Registration Failed', msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          {
            justifyContent: keyboardHeight > 0 ? 'flex-start' : 'center',
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 100 : 36,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.logo}>⚡ KENO LIVE</Text>
        <Text style={styles.title}>Create Player Account</Text>

        <View style={styles.form}>
          <Text style={styles.label}>MOBILE PHONE NUMBER</Text>
          <TextInput
            style={styles.input}
            placeholder="+251 91 234 5678"
            placeholderTextColor="#64748B"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (errorMessage) setErrorMessage(null);
            }}
            autoCapitalize="none"
            keyboardType="phone-pad"
            onFocus={() => scrollToOffset(0)}
          />

          <Text style={styles.label}>PLAYER USERNAME</Text>
          <TextInput
            style={styles.input}
            placeholder="LuckyPlayer"
            placeholderTextColor="#64748B"
            value={username}
            onChangeText={(t) => {
              setUsername(t);
              if (errorMessage) setErrorMessage(null);
            }}
            autoCapitalize="none"
            onFocus={() => scrollToOffset(70)}
          />

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errorMessage) setErrorMessage(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onFocus={() => scrollToOffset(160)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (errorMessage) setErrorMessage(null);
              }}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              onFocus={() => scrollToOffset(240)}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              style={styles.eyeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              accessibilityLabel={
                showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
              }
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#F87171" style={styles.errorIcon} />
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                {isConflict && (
                  <TouchableOpacity
                    style={styles.errorActionBtn}
                    onPress={() => navigation?.navigate('Login')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.errorActionText}>👉 Already registered? Sign In here →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
