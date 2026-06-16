import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #15121b 0%, #211e27 50%, #2c2832 100%)',
          borderRadius: 36,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 28,
            background: 'rgba(208, 188, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d0bcff',
            fontSize: 56,
            fontWeight: 800,
          }}
        >
          +
        </div>
      </div>
    ),
    { ...size }
  );
}
