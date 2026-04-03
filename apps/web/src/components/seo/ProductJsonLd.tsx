import React from 'react';

type ProductJsonLdProps = {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    images?: string[];
    // Add other fields as necessary based on the schema
  };
  locale: string;
};

export const ProductJsonLd: React.FC<ProductJsonLdProps> = ({
  product,
  locale,
}) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    productID: product.id,
    name: product.name,
    description: product.description,
    image: product.images?.[0] || undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required for structured data
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};
