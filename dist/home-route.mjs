import {legacyStudioUrl} from './routes.mjs';
function forwardPreview() {
 const target = legacyStudioUrl(location.href);
 if (target) location.replace(target);
}
forwardPreview();
window.addEventListener('hashchange', forwardPreview);
