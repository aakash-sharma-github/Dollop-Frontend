import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@theme/index';
import { LegalScreen, LegalSection, LegalPara, LegalBullet } from './LegalScreen';
import type { PrivacyPolicyScreenProps } from '@app-types/navigation';

export function PrivacyPolicyScreen({ navigation }: PrivacyPolicyScreenProps): React.JSX.Element {
    const { colors, typography } = useTheme();

    return (
        <LegalScreen title="Privacy Policy" onBack={() => navigation.goBack()}>
            <Text style={[typography.labelSm, { color: colors.textTertiary, marginBottom: 24 }]}>
                Last updated: June 2025
            </Text>

            <LegalSection heading="1. Introduction">
                <LegalPara>
                    Welcome to Dollop ("we", "our", or "us"). This Privacy Policy explains how we collect,
                    use, disclose, and protect your personal information when you use the Dollop music
                    streaming application ("the App").
                </LegalPara>
                <LegalPara>
                    By using the App, you agree to the collection and use of information in accordance with
                    this policy. If you do not agree, please do not use the App.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="2. Information We Collect">
                <LegalPara>We collect the following types of information:</LegalPara>
                <LegalBullet>
                    <Text style={{ fontWeight: '600' }}>Account information</Text> — your email address,
                    display name, and profile picture when you create an account via magic link or Google
                    Sign-In.
                </LegalBullet>
                <LegalBullet>
                    <Text style={{ fontWeight: '600' }}>Listening history</Text> — tracks you play, skip,
                    or like, used to power personalised recommendations.
                </LegalBullet>
                <LegalBullet>
                    <Text style={{ fontWeight: '600' }}>Local music metadata</Text> — if you enable local
                    music access, we read file names and durations from your device's music library. Audio
                    files are never uploaded to our servers.
                </LegalBullet>
                <LegalBullet>
                    <Text style={{ fontWeight: '600' }}>Usage data</Text> — app interactions, crash reports,
                    and performance metrics to improve the App.
                </LegalBullet>
            </LegalSection>

            <LegalSection heading="3. How We Use Your Information">
                <LegalBullet>To provide and personalise the App's core features</LegalBullet>
                <LegalBullet>To generate music recommendations based on your listening behaviour</LegalBullet>
                <LegalBullet>To maintain and improve the App's performance and security</LegalBullet>
                <LegalBullet>To communicate with you about account and service updates</LegalBullet>
                <LegalBullet>To comply with legal obligations</LegalBullet>
            </LegalSection>

            <LegalSection heading="4. Data Storage and Security">
                <LegalPara>
                    Your account data is stored securely using Supabase infrastructure with row-level
                    security policies. Authentication tokens are stored in your device's secure enclave
                    (iOS Keychain / Android Keystore) and are never written to unencrypted storage.
                </LegalPara>
                <LegalPara>
                    We implement industry-standard security measures including TLS encryption for all
                    data in transit, JWT-based authentication with short-lived access tokens, and
                    rate limiting on all API endpoints.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="5. Third-Party Services">
                <LegalPara>
                    The App integrates with the following third-party services, each governed by their
                    own privacy policies:
                </LegalPara>
                <LegalBullet>
                    <Text style={{ fontWeight: '600' }}>Supabase</Text> — authentication and database hosting
                </LegalBullet>
                <LegalBullet>
                    <Text style={{ fontWeight: '600' }}>Google</Text> — optional sign-in via Google OAuth
                </LegalBullet>
            </LegalSection>

            <LegalSection heading="6. Local Music Access">
                <LegalPara>
                    When you enable local music, Dollop requests read-only access to your device's media
                    library. We read file names and durations to build your local library view. Local audio
                    files are played directly from your device — they are never transmitted to our servers
                    or any third party.
                </LegalPara>
                <LegalPara>
                    You can revoke this permission at any time in your device's Settings app, or by
                    disabling the local music toggle in Dollop's Settings screen.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="7. Data Retention and Deletion">
                <LegalPara>
                    We retain your account data for as long as your account is active. You may request
                    deletion of your account and all associated data by contacting us at
                    privacy@dollop.app. Deletion requests are processed within 30 days.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="8. Children's Privacy">
                <LegalPara>
                    The App is not directed to children under 13 years of age. We do not knowingly collect
                    personal information from children under 13. If you believe a child has provided us
                    with personal information, please contact us immediately.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="9. Changes to This Policy">
                <LegalPara>
                    We may update this Privacy Policy from time to time. We will notify you of any
                    significant changes by updating the date at the top of this page and, where appropriate,
                    by in-app notification. Continued use of the App after changes constitutes acceptance.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="10. Contact Us">
                <LegalPara>
                    If you have questions about this Privacy Policy or how we handle your data, please
                    contact us at privacy@dollop.app.
                </LegalPara>
            </LegalSection>
        </LegalScreen>
    );
}