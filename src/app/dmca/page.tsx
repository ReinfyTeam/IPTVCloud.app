import InfoPage from '@/components/InfoPage';
import { BRAND_NAME } from '@/components/Brand';

export default function DMCA() {
  const content = `
**Last Updated:** April 18, 2026

**IPTVCloud.app** ("Service") respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 ("DMCA"), we will respond to notices of alleged copyright infringement.

## 1. TECHNICAL ROLE

Please be advised that **${BRAND_NAME}** is a technical software application (a "media player"). 

* **No Hosting:** We do not host, provide, or store any media content, channels, or streams on our servers.
* **No Distribution:** We do not distribute or transmit any content to users.
* **User-Driven:** Users of the Service are solely responsible for the URLs and M3U playlists they choose to load into the application.

## 2. TAKEDOWN NOTICES

Since we do not host any content, we cannot "remove" or "disable" infringing material from the internet. A takedown notice sent to us will not result in the removal of the content from the source server.

However, if you are a copyright owner and believe that our software is being used in a way that facilitates infringement, you may send a notice to our DMCA Agent.

**Your notice must include:**
1. A physical or electronic signature of the copyright owner or a person authorized to act on their behalf.
2. Identification of the copyrighted work claimed to have been infringed.
3. Identification of the material that is claimed to be infringing (specifically the URL or playlist link being accessed).
4. Your contact information, including your address, telephone number, and email.
5. A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
6. A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the copyright owner.

## 3. CONTACT INFORMATION

Please send all DMCA-related inquiries to:

**DMCA Agent:** legal@iptvcloud.app
**Email:** [dmca@iptvcloud.app](mailto:dmca@iptvcloud.app)

## 4. COUNTER-NOTIFICATION

If you believe that your content was wrongly flagged or that you have the legal right to use the content, you may send a counter-notification to our agent containing the elements required by the DMCA.

## 5. REPEAT INFRINGERS

It is our policy, in appropriate circumstances, to terminate the accounts of users who are repeat infringers or who are repeatedly charged with infringement.

---
*Note: This document is for informational purposes only and does not constitute legal advice.*
`;

  return <InfoPage title="DMCA Disclaimer" content={content} />;
}
