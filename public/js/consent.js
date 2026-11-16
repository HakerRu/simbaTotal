const CONSENT_KEY = 'simba_cookie_consent';

function readConsent() {
    try {
        return localStorage.getItem(CONSENT_KEY);
    } catch (error) {
        return null;
    }
}

function writeConsent(value) {
    try {
        localStorage.setItem(CONSENT_KEY, value);
    } catch (error) {}
    window.dispatchEvent(new CustomEvent('simba:consent', { detail: value }));
    document.getElementById('cookieBanner')?.remove();
    updateConsentStatus();
    if (value === 'all') loadAnalytics();
}

window.simbaConsent = {
    get: readConsent,
    analyticsAllowed() {
        return readConsent() === 'all';
    },
    reset() {
        try {
            localStorage.removeItem(CONSENT_KEY);
        } catch (error) {}
        showCookieBanner();
        updateConsentStatus();
    }
};

function loadAnalytics() {
    if (!window.simbaConsent.analyticsAllowed()) return;
    if (window.__simbaAnalyticsLoaded) return;
    window.__simbaAnalyticsLoaded = true;

    // Счётчики ещё не подключены. Когда появятся номера, загружайте их только здесь:
    // loadYandexMetrika(COUNTER_ID);
    // loadGoogleAnalytics(MEASUREMENT_ID);
}

function showCookieBanner() {
    if (document.getElementById('cookieBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'cookieBanner';
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Файлы cookie');
    banner.innerHTML = `
        <p class="mb-2">Сайт запоминает вход в двух технических cookie. Яндекс Метрика и Google Analytics включатся только после согласия. Сейчас счётчики не подключены и ничего в них не уходит.</p>
        <p class="mb-3"><a href="/cookies.html">Подробнее о cookie</a> · <a href="/privacy.html">Политика конфиденциальности</a></p>
        <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary rounded-pill px-3" data-consent="all">Принять аналитику</button>
            <button type="button" class="btn btn-outline-secondary rounded-pill px-3" data-consent="necessary">Только необходимые</button>
        </div>
    `;
    banner.querySelector('[data-consent="all"]').addEventListener('click', () => writeConsent('all'));
    banner.querySelector('[data-consent="necessary"]').addEventListener('click', () => writeConsent('necessary'));
    document.body.appendChild(banner);
}

function updateConsentStatus() {
    const status = document.getElementById('cookieChoiceStatus');
    if (!status) return;
    const choice = readConsent();
    if (choice === 'all') {
        status.textContent = 'Сейчас выбрано: необходимые cookie и аналитика. Счётчики заработают, когда их подключим.';
    } else if (choice === 'necessary') {
        status.textContent = 'Сейчас выбрано: только необходимые cookie. Аналитика выключена.';
    } else {
        status.textContent = 'Выбор ещё не сохранён.';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateConsentStatus();
    document.getElementById('cookieSettingsBtn')?.addEventListener('click', () => {
        window.simbaConsent.reset();
    });
    if (!readConsent()) showCookieBanner();
    else if (readConsent() === 'all') loadAnalytics();
});
