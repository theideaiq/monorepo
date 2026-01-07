import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'The IDEA IQ - Innovate. Create. Belong.';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  // We use standard CSS-in-JS for the image generation
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#050505', // Brand Dark
          position: 'relative',
        }}
      >
        {/* Background Gradients */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            height: '600px',
            width: '600px',
            background: '#E91E63', // Brand Pink
            filter: 'blur(140px)',
            opacity: 0.2,
            borderRadius: '100%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            height: '600px',
            width: '600px',
            background: '#FFD600', // Brand Yellow
            filter: 'blur(140px)',
            opacity: 0.2,
            borderRadius: '100%',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {/* Simple Icon Representation */}
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#FFD600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
             {/* Using a simple shape since we can't import SVGs easily here */}
             <div style={{ width: '30px', height: '30px', background: '#000', borderRadius: '50%' }} />
          </div>
          <h1
            style={{
              fontSize: '80px',
              fontWeight: 900,
              color: 'white',
              margin: 0,
              letterSpacing: '-4px',
            }}
          >
            THE IDEA
          </h1>
        </div>

        <p
          style={{
            fontSize: '32px',
            color: '#9CA3AF', // Slate 400
            margin: 0,
            fontWeight: 500,
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          Baghdad&apos;s Digital Headquarters
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
