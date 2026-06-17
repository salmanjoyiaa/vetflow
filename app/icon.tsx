import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #15121b 0%, #2c2832 100%)',
          borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: 'rgba(208, 188, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d0bcff',
            fontSize: 14,
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
