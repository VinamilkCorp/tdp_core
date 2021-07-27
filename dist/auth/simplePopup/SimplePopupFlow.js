import { I18nextManager } from 'phovea_core';
export async function simplePopupFlow({ id, url, tokenParameter, }) {
    console.log(`Openining popup window for ${id}`);
    // Allow a redirect_uri placeholder to automatically inject the location origin
    if (url.includes('{{redirect_uri}}')) {
        url = url.replace('{{redirect_uri}}', location.origin);
    }
    const popup = window.open(url, 'Authorization', 'toolbar=no,location=no,directories=no,status=no, menubar=no,scrollbars=no,resizable=no,width=600,height=300');
    return new Promise(async (resolve, reject) => {
        let i = 0;
        while (i < 300) {
            try {
                if (popup.closed) {
                    reject(I18nextManager.getInstance().i18n.t('tdp:core.tokenManager.flows.simplePopup.windowClosedError'));
                }
                if (popup.location.origin === window.location.origin) {
                    popup.close();
                    const token = new URLSearchParams(popup.location.search).get(tokenParameter);
                    if (!token) {
                        reject(I18nextManager.getInstance().i18n.t('tdp:core.tokenManager.flows.simplePopup.tokenNotFoundError', { location: popup.location.search }));
                    }
                    resolve(token);
                }
            }
            catch (e) {
                console.error(e);
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            i++;
        }
        reject(I18nextManager.getInstance().i18n.t('tdp:core.tokenManager.flows.simplePopup.timeoutError'));
    });
}
//# sourceMappingURL=SimplePopupFlow.js.map