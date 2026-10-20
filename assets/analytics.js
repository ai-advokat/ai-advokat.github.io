(() => {
  "use strict";

  const MEASUREMENT_ID = "G-4F0STVL2EF";
  const CONSENT_KEY = "ai_advokat_analytics_consent_v1";
  const TAG_ID = "ai-advokat-google-tag";
  const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@ZoranStojankich";
  const AUTHOR_HUB_URL = "/authors/zoran-stojankic/";

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

  function makeOfficialChannelLink(location) {
    const mk = (document.documentElement.lang || "").toLowerCase().startsWith("mk");
    const link = document.createElement("a");
    link.href = YOUTUBE_CHANNEL_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.aiAdvokatYoutube = location;
    link.textContent = location === "footer" ? "▶ YouTube · Zoran Stojankich" : "▶ YouTube";
    link.setAttribute(
      "aria-label",
      mk ? "Официјален YouTube канал на Зоран Стојанкиќ и AI Advokat" : "Official YouTube channel of Zoran Stojankich and AI Advokat"
    );
    link.title = mk ? "Отвори го официјалниот YouTube канал" : "Open the official YouTube channel";
    link.style.fontWeight = "850";
    link.style.color = "var(--gold, #b9985b)";
    return link;
  }

  function makeAuthorHubLink(location) {
    const mk = (document.documentElement.lang || "").toLowerCase().startsWith("mk");
    const link = document.createElement("a");
    link.href = AUTHOR_HUB_URL;
    link.dataset.aiAdvokatAuthorHub = location;
    link.textContent = location === "footer"
      ? (mk ? "Трудови на Зоран Стојанкиќ" : "Zoran Stojankich · Publications")
      : (mk ? "Трудови на Зоки" : "Zoran’s Publications");
    link.setAttribute("aria-label", mk ? "Отвори го авторскиот центар на Зоран Стојанкиќ" : "Open Zoran Stojankich’s author hub");
    link.title = mk ? "DOI, Zenodo, книги, коментари и Academy" : "DOI, Zenodo, books, commentaries and Academy";
    link.style.fontWeight = "850";
    link.style.color = "var(--gold, #b9985b)";
    return link;
  }

  function installOfficialLinks() {
    const targets = [
      { root: document.querySelector("header .links"), location: "header" },
      { root: document.querySelector("#mobileMenu > div"), location: "mobile" },
      { root: document.querySelector('footer nav[aria-label="Навигација во подножје"]') || document.querySelector("footer nav"), location: "footer" }
    ];

    targets.forEach(({ root, location }) => {
      if (!root) return;
      const hasAuthorHub = root.querySelector('[href="/authors/zoran-stojankic/"], [href="/authors/zoran-stojankic/#publications"]');
      const hasYoutube = root.querySelector('a[href="https://www.youtube.com/@ZoranStojankich"]');
      if (!hasAuthorHub && !root.querySelector(`[data-ai-advokat-author-hub="${location}"]`)) root.appendChild(makeAuthorHubLink(location));
      if (!hasYoutube && !root.querySelector(`[data-ai-advokat-youtube="${location}"]`)) root.appendChild(makeOfficialChannelLink(location));
    });
  }

  function injectHomeAuthorHub() {
    if (!/^\/(?:index\.html)?$/.test(location.pathname)) return;
    if (document.getElementById("zoran-publications-hub")) return;
    const main = document.querySelector("main");
    if (!main) return;
    const section = document.createElement("section");
    section.id = "zoran-publications-hub";
    section.setAttribute("aria-labelledby", "zoranHubTitle");
    section.innerHTML = `
      <div class="container">
        <div class="sectionHead">
          <div><span class="tag">AUTHOR HUB · DOI · ZENODO · ACADEMY</span><h2 id="zoranHubTitle">Трудови на Зоран Стојанкиќ</h2><p>Еден проверлив авторски центар за научно-стручните трудови, професионалните прирачници, правните коментари, DOI/Zenodo записите и нивната образовна примена.</p></div>
          <a class="btn primary" href="${AUTHOR_HUB_URL}">Отвори го авторскиот центар</a>
        </div>
        <div class="grid3">
          <a class="card actionCard" href="${AUTHOR_HUB_URL}#publications"><div class="icon" aria-hidden="true">⌘</div><h3>Трудови и DOI</h3><p>Филтриран каталог со цитати, Zenodo и целосни текстови.</p></a>
          <a class="card actionCard" href="/professional-library/"><div class="icon" aria-hidden="true">▤</div><h3>Стручна библиотека</h3><p>Коментари, прирачници, права и Human Gate.</p></a>
          <a class="card actionCard" href="/academy/#research-library"><div class="icon" aria-hidden="true">◆</div><h3>Academy-примена</h3><p>Предавања, masterclass, симулации и практични материјали.</p></a>
        </div>
      </div>`;
    const about = main.querySelector("#about");
    if (about) main.insertBefore(section, about); else main.appendChild(section);
  }

  function injectAcademyBridge() {
    if (!location.pathname.startsWith("/academy/")) return;
    if (document.getElementById("zoran-academy-bridge")) return;
    const anchor = document.getElementById("research-library") || document.querySelector("main section:nth-of-type(2)");
    if (!anchor || !anchor.parentNode) return;
    const section = document.createElement("section");
    section.id = "zoran-academy-bridge";
    section.innerHTML = `<div class="wrap"><div class="panel gold"><span class="tag" style="color:#775e31">AUTHOR LIBRARY · ZENODO · DOI</span><h2>Од трудовите на Зоран Стојанкиќ до практична Academy-програма</h2><p>Централниот авторски каталог ги поврзува објавените научно-стручни трудови, професионалните прирачници и правните коментари со предавања, masterclass-сесии, симулации и работни материјали под Human Gate.</p><div class="actions"><a class="btn primary" href="${AUTHOR_HUB_URL}">Отвори ги трудовите</a><a class="btn" href="/professional-library/">Стручна библиотека</a></div></div></div>`;
    anchor.parentNode.insertBefore(section, anchor);
  }

  function injectScholarBridge() {
    if (!/^\/scholar\/?(?:index\.html)?$/.test(location.pathname)) return;
    if (document.getElementById("zoran-scholar-bridge")) return;
    const article = document.querySelector("main article") || document.querySelector("main");
    if (!article) return;
    const box = document.createElement("aside");
    box.id = "zoran-scholar-bridge";
    box.style.cssText = "margin:18px 0;padding:18px;border:2px solid #b9985b;border-radius:14px;background:linear-gradient(135deg,#fff8e8,#fff);";
    box.innerHTML = `<strong style="display:block;font-size:1.15rem;margin-bottom:6px">Трудови на Зоран Стојанкиќ · Author Hub</strong><span style="display:block;color:#5b6979;margin-bottom:12px">DOI, Zenodo, отворени трудови, професионални прирачници и директна врска со Nenad Lex Nova Academy.</span><a href="${AUTHOR_HUB_URL}" style="font-weight:800">Отвори го централниот авторски каталог →</a>`;
    const firstParagraph = article.querySelector("p");
    if (firstParagraph && firstParagraph.nextSibling) article.insertBefore(box, firstParagraph.nextSibling); else article.appendChild(box);
  }

  function installAuthorHubSurfaces() {
    installOfficialLinks();
    injectHomeAuthorHub();
    injectAcademyBridge();
    injectScholarBridge();
  }

  if (initialConsent === "granted") loadGoogleTag();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      installAuthorHubSurfaces();
      updateSettingsButton();
      showConsentPanel(false);
    }, { once: true });
  } else {
    installAuthorHubSurfaces();
    updateSettingsButton();
    showConsentPanel(false);
  }
})();
