import InfoPage from '@/components/InfoPage';

export default function Privacy() {
  const content = `

**Last Updated:** April 18, 2026

**IPTVCloud.app** ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy describes how we collect, use, process, and share your information when you use our application and website (the "Service").

By using the Service, you agree to the collection and use of information in accordance with this policy.

## 1. LEGAL BASIS FOR PROCESSING (GDPR COMPLIANCE)

For users in the European Economic Area (EEA), our legal basis for collecting and using the personal information described below depends on the context:

  * **Performance of a Contract:** To provide the Service features you request (e.g., syncing favorites).
  * **Consent:** When you voluntarily create an account or accept cookies.
  * **Legitimate Interests:** To analyze app performance, prevent fraud, and improve our interface.

## 2. INFORMATION WE COLLECT

### A. Information You Provide (Optional)

  * **Account Information:** If you choose to create an account, we collect your **Email Address** and **Username**. This is required only for features such as cross-device synchronization of favorites, watch history, and personalized settings.
  * **Support Communications:** If you contact us for technical support, we collect the information you provide (e.g., your email and the details of your inquiry).

### B. Information Collected Automatically

  * **Usage Data:** Through third-party analytics providers, we collect data on how the Service is accessed (e.g., session duration, pages visited, feature engagement).
  * **Device Information:** We may collect information about your device, including model, operating system, unique device identifiers, and browser type.
  * **Log Data:** Our servers automatically record your **IP Address** temporarily for security monitoring and troubleshooting purposes.

### C. Cookies and Tracking Technologies

We use cookies and similar technologies to:

  * Authenticate your session and keep you logged in.
  * Remember your preferences (e.g., language, player theme).
  * Analyze aggregate traffic patterns.
  * *Note: You can control cookie settings in your browser, but disabling them may limit account-based features.*

## 3. THIRD-PARTY CONTENT AND LINKS

IPTVCloud.app is a technical player that interacts with third-party M3U repositories.

  * **External Privacy:** We do not own or control the content of third-party streams. Once you access an external link or M3U source, you are subject to that provider's privacy policy.
  * **Data Exposure:** Adding a third-party M3U URL may expose your IP address to that third-party provider's server. We recommend using a VPN for enhanced privacy when streaming from public repositories.

## 4. HOW WE USE YOUR INFORMATION

We use the data we collect for the following purposes:

1.  **To maintain the Service:** Ensuring the player functions correctly on your device.
2.  **To sync your experience:** Allowing logged-in users to access their "Favorites" across multiple devices.
3.  **To improve the Service:** Using anonymized analytics to identify bugs and popular features.
4.  **To ensure security:** Protecting our infrastructure from abuse and cyber-attacks.

## 5. DATA SHARING AND DISCLOSURE

  * **Service Providers:** We may share anonymous usage data with third-party analytics providers (e.g., Google Analytics, Firebase).
  * **No Sale of Data:** We do not sell, rent, or trade your personal information to third parties for marketing purposes.
  * **Legal Obligations:** We may disclose your information if required by law or in response to valid requests by public authorities (e.g., a court or government agency).

## 6. DATA RETENTION

  * **Account Data:** We retain your account information for as long as your account is active. You may delete your account at any time.
  * **Log Data:** Technical logs are purged on a rolling basis (typically every 30-90 days) unless required for an ongoing security investigation.

## 7. INTERNATIONAL DATA TRANSFERS

Your information may be transferred to and maintained on computers located outside of your state or country. By using the Service, you consent to the transfer of your information to the **Philippines** and other locations where our service providers operate, ensuring that your data is protected by standard contractual clauses.

## 8. YOUR GLOBAL PRIVACY RIGHTS

Regardless of your location, you have the following rights:

  * **Access/Update:** The right to see or correct your data.
  * **Deletion:** The right to request that we delete your personal information.
  * **Opt-Out:** The right to opt-out of non-essential data collection.
  * **Data Portability:** The right to request a copy of your data in a machine-readable format.

To exercise these rights, please contact us at the email address provided below.

## 9. CHILDREN'S PRIVACY

Our Service is not intended for use by children under the age of 13 (or the relevant age of majority). We do not knowingly collect personal information from children. If we become aware of such collection, we will take steps to delete the data immediately.

## 10. GOVERNING LAW

This Privacy Policy is governed by the laws of the **Philippines** and the **Data Privacy Act of 2012**. Any disputes arising under this policy shall be subject to the jurisdiction of the courts in **Valenzuela, Metro Manila**.

### CONTACT US

If you have any questions about this Privacy Policy or wish to make a data request, please contact our Data Protection Officer at:

**Email:** [support@iptvcloud.app](mailto:support@iptvcloud.app)
**Official Website:** [iptvcloud.app](https://iptvcloud.app)
**Privacy Officer:** [privacy@iptvcloud.app](mailto:privacy@iptvcloud.app)`;

  return <InfoPage title="Privacy Policy" content={content} />;
}
