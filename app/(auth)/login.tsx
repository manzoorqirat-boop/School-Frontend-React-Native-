import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { GradientButton } from '@/components/ui';
import { colors, radius, spacing, font, gradients, shadow } from '@/theme';

export default function Login() {
  const { signIn } = useAuth();
  const [slug, setSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!username || !password) {
      Alert.alert('Missing details', 'Enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(slug || undefined, username, password);
      // Guard in _layout redirects on session change.
    } catch (e: any) {
      Alert.alert('Login failed', e.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <LinearGradient colors={gradients.brandVivid} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <View style={styles.logo}>
            <Ionicons name="school" size={34} color={colors.primary} />
          </View>
          <Text style={styles.brand}>QMSoft School</Text>
          <Text style={styles.tag}>Everything your school runs on — in your pocket.</Text>
        </LinearGradient>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to continue</Text>

          <Field icon="business-outline" placeholder="School code (leave blank for platform admin)"
            value={slug} onChangeText={setSlug} autoCapitalize="none" />
          <Field icon="person-outline" placeholder="Username"
            value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Field icon="lock-closed-outline" placeholder="Password"
            value={password} onChangeText={setPassword} secureTextEntry={!show}
            right={
              <TouchableOpacity onPress={() => setShow(s => !s)}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
              </TouchableOpacity>
            } />

          <View style={{ height: spacing.lg }} />
          <GradientButton label="Sign In" onPress={submit} loading={loading} />

          <Text style={styles.foot}>Protected by QMSoft · Your data stays encrypted</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ icon, right, ...props }: any) {
  return (
    <View style={[styles.field, shadow.card]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: spacing.xxl * 2, paddingBottom: spacing.xxl, paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, alignItems: 'center' },
  logo: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, ...shadow.float },
  brand: { ...font.h1, color: '#fff' },
  tag: { ...font.body, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4 },

  form: { padding: spacing.xl, gap: spacing.md },
  heading: { ...font.h2, color: colors.ink },
  sub: { ...font.body, color: colors.slate, marginBottom: spacing.sm },

  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card,
    borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 54 },
  input: { flex: 1, ...font.body, color: colors.ink },

  foot: { ...font.label, color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
});
