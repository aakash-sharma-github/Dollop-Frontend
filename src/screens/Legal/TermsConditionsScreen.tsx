import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@theme/index';
import { LegalScreen, LegalSection, LegalPara, LegalBullet } from './LegalScreen';
import type { TermsConditionsScreenProps } from '@app-types/navigation';

export function TermsConditionsScreen({ navigation }: TermsConditionsScreenProps): React.JSX.Element {
    const { colors, typography } = useTheme();

    return (
        <LegalScreen title="Terms & Conditions" onBack={() => navigation.goBack()}>
            <Text style={[typography.labelSm, { color: colors.textTertiary, marginBottom: 24 }]}>
                Last updated: June 2025
            </Text>

            <LegalSection heading="1. Acceptance of Terms">
                <LegalPara>
                    By downloading, installing, or using the Dollop application ("the App"), you agree to
                    be bound by these Terms and Conditions. If you do not agree, please do not use the App.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="2. Use of the App">
                <LegalPara>
                    Dollop grants you a limited, non-exclusive, non-transferable, revocable licence to use
                    the App for your personal, non-commercial purposes. You agree not to:
                </LegalPara>
                <LegalBullet>Copy, modify, or distribute the App or any part of it</LegalBullet>
                <LegalBullet>Reverse engineer, decompile, or disassemble the App</LegalBullet>
                <LegalBullet>Use the App to distribute content you do not have rights to</LegalBullet>
                <LegalBullet>Attempt to gain unauthorised access to our systems or other users' accounts</LegalBullet>
                <LegalBullet>Use automated tools to scrape, crawl, or interact with the App</LegalBullet>
            </LegalSection>

            <LegalSection heading="3. User Accounts">
                <LegalPara>
                    You are responsible for maintaining the confidentiality of your account credentials
                    and for all activity that occurs under your account. You must notify us immediately
                    of any unauthorised use of your account.
                </LegalPara>
                <LegalPara>
                    We reserve the right to suspend or terminate accounts that violate these Terms or
                    that we reasonably believe are being used fraudulently.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="4. Content and Intellectual Property">
                <LegalPara>
                    Music content available through connected third-party providers (such as Spotify) is
                    subject to those providers' terms and licences. Dollop does not host or distribute
                    copyrighted music directly.
                </LegalPara>
                <LegalPara>
                    Local music files you access through the App remain your property. Dollop does not
                    claim any ownership over files stored on your device.
                </LegalPara>
                <LegalPara>
                    All App design elements, branding, and original software code are the exclusive
                    property of Dollop and protected by applicable intellectual property laws.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="5. Third-Party Services">
                <LegalPara>
                    The App may integrate with third-party services (Google, Spotify, etc.). Your use of
                    those services is governed by their respective terms of service. We are not responsible
                    for the availability, accuracy, or content of third-party services.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="6. Disclaimers">
                <LegalPara>
                    The App is provided "as is" and "as available" without any warranties of any kind,
                    either express or implied. We do not warrant that the App will be uninterrupted,
                    error-free, or free of viruses or other harmful components.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="7. Limitation of Liability">
                <LegalPara>
                    To the maximum extent permitted by law, Dollop and its affiliates shall not be liable
                    for any indirect, incidental, special, consequential, or punitive damages arising from
                    your use of the App, even if we have been advised of the possibility of such damages.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="8. Changes to Terms">
                <LegalPara>
                    We reserve the right to modify these Terms at any time. We will notify you of material
                    changes via the App or email. Continued use of the App after changes constitutes your
                    acceptance of the revised Terms.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="9. Governing Law">
                <LegalPara>
                    These Terms are governed by and construed in accordance with applicable laws.
                    Any disputes arising from these Terms shall be resolved through binding arbitration
                    or in the courts of competent jurisdiction.
                </LegalPara>
            </LegalSection>

            <LegalSection heading="10. Contact">
                <LegalPara>
                    For questions about these Terms, contact us at legal@dollop.app.
                </LegalPara>
            </LegalSection>
        </LegalScreen>
    );
}