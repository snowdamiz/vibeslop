/**
 * Generates a simple browser fingerprint for anonymous impression tracking.
 * This is a lightweight implementation that creates a relatively stable identifier
 * across sessions for the same browser/device combination.
 */

export function generateFingerprint(): string {
  // Check if we already have a stored fingerprint
  const stored = localStorage.getItem('vibeslop_fingerprint')
  if (stored) {
    return stored
  }

  // Generate new fingerprint from browser characteristics
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth.toString(),
    screen.width.toString() + 'x' + screen.height.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || '',
    navigator.platform,
  ]

  // Create a simple hash
  const fingerprint = simpleHash(components.join('|'))
  
  // Store for future use
  localStorage.setItem('vibeslop_fingerprint', fingerprint)
  
  return fingerprint
}

/**
 * Simple string hash function (djb2 algorithm)
 */
function simpleHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
