(() => {
  "use strict";

  const MEASUREMENT_ID = "G-4F0STVL2EF";
  const CONSENT_KEY = "ai_advokat_analytics_consent_v1";
  const TAG_ID = "ai-advokat-google-tag";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };

  function readConsent() {
    try {
      const value = localStorage.getItem(CONSENT_KEY);
      return value === "granted" || value === "denied" ? value : null;
    } catch {
      return null;
    }
  }

  function writeConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch {}
  }

  const initialConsent = readConsent();

  window.gtag("consent", "default", {
    analytics_storage: initialConsent === "granted" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500
  });

  function loadGoogleTag() {
    if (document.getElementById(TAG_ID)) return;
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    const script = document.createElement("script");
    script.id = TAG_ID;
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
  }

  function clearAnalyticsCookies() {
    document.cookie.split(";").forEach((entry) => {
      const name = entry.split("=")[0].trim();
      if (!name.startsWith("_ga")) return;
      document.cookie = name + "=; Max-Age=0; path=/; SameSite=Lax";
    });
  }

  function setConsent(value, reloadAfter) {
    writeConsent(value);
    window.gtag("consent", "update", {
      analytics_storage: value === "granted" ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });

    if (value === "granted") {
      loadGoogleTag();
    } else {
      clearAnalyticsCookies();
      if (reloadAfter) window.location.reload();
    }
  }

  function makeButton(label, primary) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.cssText =
      "border:1px solid #d9e0e7;border-radius:10px;padding:9px 13px;font:600 14px/1.2 system-ui;cursor:pointer;" +
      (primary ? "background:#173d66;color:#fff;border-color:#173d66;" : "background:#fff;color:#132033;");
    return button;
  }

  function showConsentPanel(force) {
    if (!force && readConsent()) return;
    if (document.getElementById("ai-advokat-analytics-consent")) return;

    const mk = (document.documentElement.lang || "").toLowerCase().startsWith("mk");
    const panel = document.createElement("section");
    panel.id = "ai-advokat-analytics-consent";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-live", "polite");
    panel.setAttribute("aria-label", mk ? "Поставки за аналитика" : "Analytics settings");
    panel.style.cssText =
      "position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:760px;margin:auto;" +
      "background:#fff;color:#132033;border:1px solid #d9e0e7;border-radius:14px;padding:16px;" +
      "box-shadow:0 16px 46px rgba(12,32,56,.22);font:15px/1.5 system-ui;";

    const text = document.createElement("p");
    text.style.cssText = "margin:0 0 12px;";
    text.textContent = mk
      ? "AI Advokat користи Google Analytics само со ваша согласност, за основна статистика за посетеност и користење. Рекламно следење и персонализација се исклучени."
      : "AI Advokat uses Google Analytics only with your consent for basic traffic and usage statistics. Advertising tracking and personalisation are disabled.";

    const controls = document.createElement("div");
    controls.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;";

    const accept = makeButton(mk ? "Прифати аналитика" : "Accept analytics", true);
    const decline = makeButton(mk ? "Одбиј" : "Decline", false);

    accept.addEventListener("click", () => {
      setConsent("granted", false);
      panel.remove();
      updateSettingsButton();
    });
    decline.addEventListener("click", () => {
      setConsent("denied", false);
      panel.remove();
      updateSettingsButton();
    });

    controls.append(accept, decline);
    panel.append(text, controls);
    document.body.appendChild(panel);
  }

  function updateSettingsButton() {
    const mk = (document.documentElement.lang || "").toLowerCase().startsWith("mk");
    let button = document.getElementById("ai-advokat-analytics-settings");
    if (!button) {
      button = document.createElement("button");
      button.id = "ai-advokat-analytics-settings";
      button.type = "button";
      button.style.cssText =
        "position:fixed;right:12px;bottom:12px;z-index:2147482000;border:1px solid #d9e0e7;border-radius:999px;" +
        "padding:7px 10px;background:#fff;color:#132033;font:600 12px/1.2 system-ui;cursor:pointer;" +
        "box-shadow:0 6px 18px rgba(12,32,56,.12);";
      document.body.appendChild(button);
    }
    button.textContent = mk ? "Аналитика" : "Analytics";
    button.setAttribute("aria-label", mk ? "Промени поставки за аналитика" : "Change analytics settings");
    button.onclick = () => {
      const current = readConsent();
      if (current === "granted") {
        const revoke = window.confirm(mk
          ? "Да ја повлечеме согласноста за Google Analytics?"
          : "Withdraw consent for Google Analytics?");
        if (revoke) setConsent("denied", true);
      } else {
        showConsentPanel(true);
      }
    };
  }

  if (initialConsent === "granted") loadGoogleTag();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      updateSettingsButton();
      showConsentPanel(false);
    }, { once: true });
  } else {
    updateSettingsButton();
    showConsentPanel(false);
  }
})();
