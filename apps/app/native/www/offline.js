// The offline screen (offline.html). Runs after shell.js.
const ENGLISH = /^en\b/i;

(() => {
  const shell = window.IDEA_SHELL || {};
  const url = shell.url || "https://theideaiq.com";
  const english = ENGLISH.test(navigator.language || "");
  const locale = english ? "en" : "ar";
  const text = shell.messages?.[locale] || null;

  document.documentElement.lang = locale;
  document.documentElement.dir = english ? "ltr" : "rtl";
  if (text) {
    document.getElementById("title").textContent = text.title;
    document.getElementById("description").textContent = text.description;
    document.getElementById("retry").textContent = text.retry;
  }

  const retry = () => {
    if (navigator.onLine === false) {
      document.getElementById("status").textContent = text
        ? text.stillOffline
        : "";
      return;
    }
    window.location.replace(url);
  };

  document.getElementById("retry").addEventListener("click", retry);
  window.addEventListener("online", retry);
})();
