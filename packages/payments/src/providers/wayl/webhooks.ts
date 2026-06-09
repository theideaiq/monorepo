import crypto from 'node:crypto';

/**
 * Asserts authenticity of oncoming payload parameters against known localized parameters
 */
export function verifyWaylWebhookSignature(
  rawBodyPayload: string | Buffer,
  incomingHeaderSignature: string,
  localWebhookSecretId: string
): boolean {
  if (!incomingHeaderSignature || !localWebhookSecretId) return false;

  // Render out hash using local criteria variables
  const calculatedSignature = crypto
    .createHmac('sha256', localWebhookSecretId)
    .update(rawBodyPayload)
    .digest('hex');

  const signatureBuffer = Buffer.from(incomingHeaderSignature, 'hex');
  const calculatedSignatureBuffer = Buffer.from(calculatedSignature, 'hex');

  if (signatureBuffer.length !== calculatedSignatureBuffer.length) {
    return false;
  }

  // Execute constant-time evaluation sequence to safely terminate computation
  return crypto.timingSafeEqual(signatureBuffer, calculatedSignatureBuffer);
}
