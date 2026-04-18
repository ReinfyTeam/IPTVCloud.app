import InfoPage from '@/components/InfoPage';
import { BRAND_NAME } from '@/components/Brand';

export default function DMCA() {
  return (
    <InfoPage
      title="DMCA Disclaimer"
      content={`${BRAND_NAME} operates as a technical player and does not host, provide, or distribute any media content. All streams are sourced from public M3U repositories. We respect copyright and will comply with valid takedown notices.`}
    />
  );
}
