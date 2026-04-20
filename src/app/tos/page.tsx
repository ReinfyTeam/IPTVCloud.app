import InfoPage from '@/components/InfoPage';

export default function TOS() {
  const content = `
**Last Updated:** April 18, 2026

PLEASE READ THESE TERMS OF SERVICE ("AGREEMENT") CAREFULLY. THIS AGREEMENT CONSTITUTES A LEGALLY BINDING CONTRACT BETWEEN YOU ("USER" OR "YOU") AND **IPTVCLOUD.APP** ("WE," "US," OR "OUR"). BY ACCESSING, DOWNLOADING, OR USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS.

## 1. NATURE OF THE SERVICE

**IPTVCloud.app** is a technical software application designed as a media player.

  * **Technical Neutrality:** The Service acts strictly as a user-interface for organizing and playing media streams.
  * **No Content Provision:** We do not host, provide, archive, distribute, manage, or have any control over the media content, channels, or streams loaded into the application.
  * **User-Sourced Content:** All media content is sourced, added, and managed by the User via third-party M3U playlists or URLs. We are not affiliated with any third-party content providers.

## 2. ELIGIBILITY AND COMPLIANCE

  * **Global Access:** You may access this Service from anywhere in the world. You are solely responsible for ensuring that your use of the Service complies with the local laws, regulations, and copyright restrictions of your specific country or region.
  * **Age Requirement:** You must be at least 18 years of age (or the age of majority in your jurisdiction) to use this Service.

## 3. INTELLECTUAL PROPERTY RIGHTS

### A. Our Property

All software, code, designs, logos, and interface elements of IPTVCloud.app are the exclusive property of IPTVCloud.app and are protected by international intellectual property laws.

### B. Copyrighted Content

We do not condone or support the use of our software to access copyrighted material without the express permission of the rights holder.

  * **DMCA Notice:** Since we do not host any content, we cannot "remove" content from the internet. However, if you believe our software is facilitating access to infringing material in a specific, fixable way, please contact our legal department.

## 4. PROHIBITED USES

You agree **NOT** to use the Service to:

1.  Access, stream, or distribute any content that violates local or international laws.
2.  Infringe upon the intellectual property, privacy, or publicity rights of any third party.
3.  Modify, adapt, sublicense, translate, sell, reverse engineer, or decompile any portion of the software.
4.  Use the Service for any commercial purpose without our express written consent.
5.  Bypass any security measures or digital rights management (DRM) protocols.

## 5. DISCLAIMER OF WARRANTIES

THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. TO THE FULLEST EXTENT PERMITTED BY LAW, **IPTVCLOUD.APP** DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:

  * **Uptime:** We do not guarantee the Service will be uninterrupted or error-free.
  * **Content Quality:** We make no warranties regarding the quality, stability, or legality of any third-party streams accessed through the player.
  * **Security:** We do not guarantee that the Service is free of viruses or other harmful components introduced by third-party links.

## 6. LIMITATION OF LIABILITY

IN NO EVENT SHALL **IPTVCLOUD.APP**, ITS OWNERS, OR EMPLOYEES BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF PROFITS, DATA, OR USE) ARISING OUT OF OR IN CONNECTION WITH THE USE OF THE SERVICE, REGARDLESS OF THE LEGAL THEORY.

## 7. INDEMNIFICATION

You agree to indemnify, defend, and hold harmless **IPTVCloud.app** from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt (including attorney's fees) arising from:

1.  Your use of and access to the Service.
2.  Your violation of any term of this Agreement.
3.  Your violation of any third-party right, including without limitation any copyright, property, or privacy right.

## 8. NO FEES AND REFUND POLICY

  * **Service Cost:** IPTVCloud.app is a free utility.
  * **No Refunds:** As no payments are processed by us for subscriptions or content, no refund policy exists. Any "Premium" features offered by third-party M3U providers are independent of IPTVCloud.app.

## 9. SEVERABILITY AND WAIVER

If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that these Terms will otherwise remain in full force and effect.

## 10. GOVERNING LAW AND JURISDICTION

This Agreement shall be governed by and construed in accordance with the laws of the **Philippines**. You agree that any legal action or proceeding between you and IPTVCloud.app shall be brought exclusively in the courts of **Valenzuela, Metro Manila, Philippines**.

## 11. MODIFICATIONS TO TERMS

We reserve the right to modify these Terms at any time. Changes become effective immediately upon being posted on this page. Your continued use of the Service following the posting of changes constitutes your acceptance of such changes.

### CONTACT INFORMATION

If you have any questions regarding these detailed Terms of Service, please contact us at:

**Email:** [support@iptvcloud.app](mailto:support@iptvcloud.app)
**Official Website:** [iptvcloud.app](https://iptvcloud.app)
**DMCA Inquiries:** [dmca@iptvcloud.app](mailto:dmca@iptvcloud.app)`;

  return <InfoPage title="Terms of Service" content={content} />;
}
