/*! coi-serviceworker v0.1.7 - Modified for PWA Caching */
const CACHE_NAME = 'localcut-2025-01-08-v1';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'favicon.svg',
  'manifest.json',
  'coi-serviceworker.js',
  'lib/ffmpeg.js',
  'lib/ffmpeg-util.js',
  'lib/marked.js',
  'lib/ffmpeg-core.js',
  'lib/ffmpeg-core.wasm',
  'lib/814.ffmpeg.js'
];

let coepCredentialless = false;

if (typeof window === 'undefined') {
    self.addEventListener("install", (event) => {
        self.skipWaiting();
        event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
        );
        // Notify clients about update
        self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
        });
    });

    self.addEventListener("activate", (event) => {
        event.waitUntil(
            Promise.all([
                self.clients.claim(),
                caches.keys().then((keys) => Promise.all(
                    keys.map((key) => {
                        if (key !== CACHE_NAME) return caches.delete(key);
                    })
                ))
            ])
        );
    });

    self.addEventListener("message", (ev) => {
        if (!ev.data) {
            return;
        } else if (ev.data.type === "deregister") {
            self.registration
                .unregister()
                .then(() => {
                    return self.clients.matchAll();
                })
                .then(clients => {
                    clients.forEach((client) => client.navigate(client.url));
                });
        } else if (ev.data.type === "coepCredentialless") {
            coepCredentialless = ev.data.value;
        }
    });

    self.addEventListener("fetch", function (event) {
        const r = event.request;
        if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
            return;
        }

        const request = (coepCredentialless && r.mode === "no-cors")
            ? new Request(r, {
                credentials: "omit",
            })
            : r;

        event.respondWith(
            (async () => {
                const isLocal = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
                let response = isLocal ? null : await caches.match(request);
                let fetchedFromNetwork = false;

                if (!response) {
                    try {
                        response = await fetch(request);
                        fetchedFromNetwork = true;
                    } catch (e) {
                        console.error(e);
                        return;
                    }
                }

                if (!response) return;

                if (response.status === 0) {
                    if (fetchedFromNetwork && request.method === 'GET' && !isLocal) {
                        const cache = await caches.open(CACHE_NAME);
                        cache.put(request, response.clone());
                    }
                    return response;
                }

                const newHeaders = new Headers(response.headers);
                newHeaders.set("Cross-Origin-Embedder-Policy",
                    coepCredentialless ? "credentialless" : "require-corp"
                );
                if (!coepCredentialless) {
                    newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
                }
                newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                const processedResponse = new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });

                if (fetchedFromNetwork && request.method === 'GET' && response.status === 200 && !isLocal) {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(request, processedResponse.clone());
                }

                return processedResponse;
            })()
        );
    });

} else {
    (() => {
        const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
        window.sessionStorage.removeItem("coiReloadedBySelf");
        const coepDegrading = (reloadedBySelf == "coepdegrade");

        // You can customize the behavior of this script through a global `coi` variable.
        const coi = {
            shouldRegister: () => !reloadedBySelf,
            shouldDeregister: () => false,
            coepCredentialless: () => true,
            coepDegrade: () => true,
            doReload: () => window.location.reload(),
            quiet: false,
            ...window.coi
        };

        const n = navigator;
        const controlling = n.serviceWorker && n.serviceWorker.controller;

        // Record the failure if the page is served by serviceWorker.
        if (controlling && !window.crossOriginIsolated) {
            window.sessionStorage.setItem("coiCoepHasFailed", "true");
        }
        const coepHasFailed = window.sessionStorage.getItem("coiCoepHasFailed");

        if (controlling) {
            // Reload only on the first failure.
            const reloadToDegrade = coi.coepDegrade() && !(
                coepDegrading || window.crossOriginIsolated
            );
            n.serviceWorker.controller.postMessage({
                type: "coepCredentialless",
                value: (reloadToDegrade || coepHasFailed && coi.coepDegrade())
                    ? false
                    : coi.coepCredentialless(),
            });
            if (reloadToDegrade) {
                !coi.quiet && console.log("Reloading page to degrade COEP.");
                window.sessionStorage.setItem("coiReloadedBySelf", "coepdegrade");
                coi.doReload("coepdegrade");
            }

            if (coi.shouldDeregister()) {
                n.serviceWorker.controller.postMessage({ type: "deregister" });
            }
        }

        // If we're already coi: do nothing. Perhaps it's due to this script doing its job, or COOP/COEP are
        // already set from the origin server. Also if the browser has no notion of crossOriginIsolated, just give up here.
        if (window.crossOriginIsolated !== false || !coi.shouldRegister()) return;

        if (!window.isSecureContext) {
            !coi.quiet && console.log("COOP/COEP Service Worker not registered, a secure context is required.");
            return;
        }

        // In some environments (e.g. Firefox private mode) this won't be available
        if (!n.serviceWorker) {
            !coi.quiet && console.error("COOP/COEP Service Worker not registered, perhaps due to private mode.");
            return;
        }

        n.serviceWorker.register(window.document.currentScript.src).then(
            (registration) => {
                !coi.quiet && console.log("COOP/COEP Service Worker registered", registration.scope);

                registration.addEventListener("updatefound", () => {
                    !coi.quiet && console.log("Reloading page to make use of updated COOP/COEP Service Worker.");
                    window.sessionStorage.setItem("coiReloadedBySelf", "updatefound");
                    coi.doReload();
                });

                // If the registration is active, but it's not controlling the page
                if (registration.active && !n.serviceWorker.controller) {
                    !coi.quiet && console.log("Reloading page to make use of COOP/COEP Service Worker.");
                    window.sessionStorage.setItem("coiReloadedBySelf", "notcontrolling");
                    coi.doReload();
                }
            },
            (err) => {
                !coi.quiet && console.error("COOP/COEP Service Worker failed to register:", err);
            }
        );
    })();
}