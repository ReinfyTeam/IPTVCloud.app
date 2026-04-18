import { describe, it, expect } from 'vitest';
import { parseM3U } from '../m3uParser';

describe('m3uParser', () => {
  it('parses a basic entry', () => {
    const sample = `#EXTM3U
#EXTINF:-1 tvg-id="test123" tvg-name="Test Channel" tvg-logo="https://logo.test/logo.png" group-title="News",Test Channel
http://example.com/stream.m3u8
`;
    const channels = parseM3U(sample);
    expect(channels.length).toBe(1);
    expect(channels[0].id).toBe('test123');
    expect(channels[0].name).toBe('Test Channel');
    expect(channels[0].logo).toBe('https://logo.test/logo.png');
    expect(channels[0].streamUrl).toBe('http://example.com/stream.m3u8');
  });
});
