// Attach `SQD_API_KEY` to portal requests.
// The portal-api build of @subsquid/evm-processor constructs the portal's HttpClient
// internally with a fixed set of headers, so `setPortal()` gives us no way to pass one.
import { HttpClient } from '@subsquid/http-client'

const portalUrls = new Set<string>()

/** Portal urls registered here get the `x-api-key` header attached to their requests. */
export const registerPortalUrl = (url: string) => {
  portalUrls.add(url.replace(/\/$/, ''))
}

const isPortalRequest = (url: string) => {
  for (const portalUrl of portalUrls) {
    if (url === portalUrl || url.startsWith(`${portalUrl}/`)) return true
  }
  return false
}

const apiKey = process.env.SQD_API_KEY

if (apiKey) {
  const prepareRequest = (HttpClient.prototype as any).prepareRequest
  if (typeof prepareRequest !== 'function') {
    throw new Error('Unable to attach SQD_API_KEY: HttpClient.prototype.prepareRequest is missing')
  }
  ;(HttpClient.prototype as any).prepareRequest = async function (method: string, url: string, options: any) {
    const req = await prepareRequest.call(this, method, url, options)
    if (isPortalRequest(req.url)) {
      req.headers.set('x-api-key', apiKey)
    }
    return req
  }
}
