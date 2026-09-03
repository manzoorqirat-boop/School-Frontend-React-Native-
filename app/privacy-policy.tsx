import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/screen';
import { colors, spacing, font, radius } from '@/theme';

/**
 * Privacy policy — served in-app so it's readable with zero setup, from both
 * the login screen (Play Store reviewers, a prospective parent evaluating the
 * school) and Settings (an existing user).
 *
 * IMPORTANT — this is a functional DRAFT, not legal advice:
 *   1. This is a functional DRAFT of the policy text, not legal advice —
 *      have it reviewed by someone who can speak to your actual retention
 *      practices and, ideally, local counsel.
 *   2. The canonical public copy is hosted by the backend at
 *      /privacy-policy.html (see wwwroot/privacy-policy.html in the
 *      School.net repo) — that URL, not this in-app screen, is what goes in
 *      Google Play Console's "Privacy policy" field and Data Safety form.
 *      Keep the two in sync if either changes.
 *   3. PRIVACY_CONTACT_EMAIL below is noreply@qmsofts.com — confirm that
 *      inbox actually receives and is monitored, since this screen and the
 *      hosted page both promise people can email in a data request.
 */
const PRIVACY_CONTACT_EMAIL = 'noreply@qmsofts.com';
const LAST_UPDATED = 'September 2026';

export default function PrivacyPolicy() {
  const router = useRouter();
  return (
    <Screen title="Privacy Policy" subtitle="QMSoft School" onBack={() => router.back()}>
      <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

      <P>
        This app is provided to families and staff of a school using QMSoft School's
        management platform. Accounts are created and managed by your school's
        administration, not by self-registration — this policy explains what the
        app and its backend collect on the school's behalf, why, and what
        control you have over it.
      </P>

      <H>Information we collect</H>
      <P>Depending on your role, the app handles:</P>
      <Bullet>Identity and contact details — name, date of birth, gender, blood group, address, phone number, and email address.</Bullet>
      <Bullet>Family details — parent/guardian names, phone numbers, occupations, and relationship to the student.</Bullet>
      <Bullet>Enrollment records — class, section, roll number, admission details, and academic year.</Bullet>
      <Bullet>Government ID — only the last 4 digits of an Aadhaar number are ever stored; the full number is never written to our database.</Bullet>
      <Bullet>Academic records — attendance, exam marks, report cards, and timetables.</Bullet>
      <Bullet>Financial records — fee invoices and payment history connected to a student's account. Payments made by UPI go bank-to-bank between you and the school; the app never handles your bank credentials or UPI PIN.</Bullet>
      <Bullet>Device information — a push-notification token and device platform (iOS/Android), so the school can send you notices, invoice reminders, and poll alerts.</Bullet>
      <Bullet>Usage/security logs — sign-in timestamps, IP address, and the actions taken by administrative accounts, kept for audit and security purposes.</Bullet>

      <H>Children's information</H>
      <P>
        This app is used to manage school records for students, some of whom are
        children under 13. Student accounts and the records tied to them are
        created and controlled by the school, acting as the data controller —
        the school, not a parent acting alone, provisions student logins. In
        practice, a student's account is intended to be operated by, or
        together with, their parent or guardian rather than by a young child
        independently. Parents and guardians can contact the school directly,
        or use the contact details below, to review, correct, or request
        deletion of a child's data.
      </P>

      <H>How information is used</H>
      <Bullet>To operate core school functions — attendance, grading, fee collection, timetabling, and notices.</Bullet>
      <Bullet>To send push notifications for notices, fee reminders, and polls.</Bullet>
      <Bullet>To maintain security and accountability through sign-in and admin-action logs.</Bullet>
      <P>We do not sell personal information, and we do not use it for behavioral advertising.</P>

      <H>Who can see your information</H>
      <P>
        Data is scoped to your own school — staff and families at one school
        cannot see another school's records. Within a school, visibility
        follows role: teachers see their classes' academic data, office staff
        see fee and admission records, and parents see only their own
        children's records. All of this runs on infrastructure we operate; we
        do not share personal data with third parties except the payment and
        notification services described below.
      </P>

      <H>Third-party services</H>
      <Bullet>Push notifications are delivered via Expo's notification relay, which forwards to Apple (APNs) and Google (FCM) — only a device token and message content pass through it.</Bullet>
      <Bullet>Online payments, where enabled by a school, are processed by Razorpay; UPI payments go directly between payer and school bank accounts and never touch our servers.</Bullet>

      <H>Data retention</H>
      <P>
        Academic, attendance, and financial records are retained for as long as
        required by the school's own record-keeping obligations, which
        commonly extend beyond a student's enrollment. Push-notification
        tokens are removed automatically when a device is signed out or when
        Apple/Google report the token as no longer valid.
      </P>

      <H>Your choices</H>
      <Bullet>Change your password any time from Settings.</Bullet>
      <Bullet>Request a copy of, correction to, or deletion of your account and associated data — signed-in users can do this from Settings → Account → Delete my account. If you can't sign in, email us (below) from the address associated with your account, or contact your school's office directly.</Bullet>
      <Bullet>Because academic and financial records may be subject to the school's own legal retention requirements, a deletion request is reviewed by your school's administration rather than actioned instantly — we'll let you know once it's handled.</Bullet>

      <H>Security</H>
      <P>
        Data is encrypted in transit (TLS) between the app and our servers. On
        your device, your session token is stored using the operating
        system's secure, encrypted storage (Keychain on iOS, Keystore-backed
        storage on Android) rather than as plain text.
      </P>

      <H>Contact us</H>
      <P>
        Questions about this policy, or a request regarding your data, can be
        sent to:
      </P>
      <Text
        style={styles.link}
        onPress={() => Linking.openURL(`mailto:${PRIVACY_CONTACT_EMAIL}`)}
      >
        {PRIVACY_CONTACT_EMAIL}
      </Text>

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h}>{children}</Text>;
}
function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={[styles.p, { flex: 1, marginBottom: 0 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  updated: { ...font.caption, color: colors.muted, marginBottom: spacing.lg },
  h: { ...font.h3, color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.sm },
  p: { ...font.body, color: colors.slate, lineHeight: 21, marginBottom: spacing.sm },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, paddingRight: spacing.sm },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8 },
  link: { ...font.body, color: colors.primary, fontWeight: '700', marginTop: spacing.xs },
});
