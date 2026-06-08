import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ClinixDev — Cinematic Clinic Management Platform';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 64,
          background: 'linear-gradient(135deg, #15121b 0%, #211e27 50%, #2c2832 100%)',
          color: '#e8e0ec',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(208, 188, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            +
          </div>
          <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }}>ClinixDev</span>
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            maxWidth: 900,
          }}
        >
          Run your clinic with cinematic clarity
        </div>
        <div style={{ fontSize: 24, marginTop: 24, color: 'rgba(232, 224, 236, 0.7)', maxWidth: 800 }}>
          Secure multi-tenant platform for veterinary clinics — appointments, consult, billing, and inventory.
        </div>
      </div>
    ),
    { ...size }
  );
}
