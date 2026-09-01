"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPortalUrl = void 0;
// Attach `SQD_API_KEY` to gateway-path portal requests.
//
// The portal-api build of @subsquid/evm-processor constructs the portal's HttpClient
// internally with a fixed set of headers (`getArchiveDataSource` in processor.js), so its
// `setPortal()` gives us no way to pass one. Only `createEvmBatchProcessor` registers a url
// here; the portal path passes the key natively through
// `setPortal({url, http: {headers}})` and does not depend on this patch.
const http_client_1 = require("@subsquid/http-client");
const portalUrls = new Set();
/** Portal urls registered here get the `x-api-key` header attached to their requests. */
const registerPortalUrl = (url) => {
    portalUrls.add(url.replace(/\/$/, ''));
};
exports.registerPortalUrl = registerPortalUrl;
const isPortalRequest = (url) => {
    for (const portalUrl of portalUrls) {
        if (url === portalUrl || url.startsWith(`${portalUrl}/`))
            return true;
    }
    return false;
};
const apiKey = process.env.SQD_API_KEY;
if (apiKey) {
    const prepareRequest = http_client_1.HttpClient.prototype.prepareRequest;
    if (typeof prepareRequest !== 'function') {
        throw new Error('Unable to attach SQD_API_KEY: HttpClient.prototype.prepareRequest is missing');
    }
    ;
    http_client_1.HttpClient.prototype.prepareRequest = async function (method, url, options) {
        const req = await prepareRequest.call(this, method, url, options);
        if (isPortalRequest(req.url)) {
            req.headers.set('x-api-key', apiKey);
        }
        return req;
    };
}
//# sourceMappingURL=portal-api-key.js.map