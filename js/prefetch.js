// ===================================================================
// NATIVE ZERO-DEPENDENCY PREFETCHING
// Prefetches sibling suite subnav pages on idle & hover for instant navigation.
// ===================================================================

(function () {
  const prefetched = new Set();

  function prefetchUrl(url) {
    if (!url || prefetched.has(url) || url.startsWith("#") || url.startsWith("javascript:")) return;
    try {
      const target = new URL(url, window.location.href);
      if (target.origin !== window.location.origin) return;
      prefetched.add(url);

      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = target.href;
      document.head.appendChild(link);
    } catch (e) {}
  }

  // 1. Prefetch on link hover & pointer touch (subnav, top nav, dropdown items)
  const onPointerEvent = (e) => {
    const a = e.target.closest("a");
    if (a && a.href) {
      prefetchUrl(a.getAttribute("href"));
    }
  };

  document.addEventListener("mouseover", onPointerEvent, { passive: true });
  document.addEventListener("pointerdown", onPointerEvent, { passive: true });
  document.addEventListener("touchstart", onPointerEvent, { passive: true });

  // 2. Prefetch sibling sub-nav links during browser idle time
  function prefetchSubnav() {
    const subnavLinks = document.querySelectorAll(".suite-subnav a[href], .top-nav-links a[href]");
    subnavLinks.forEach(link => prefetchUrl(link.getAttribute("href")));
  }

  if ("requestIdleCallback" in window) {
    requestIdleCallback(prefetchSubnav);
  } else {
    setTimeout(prefetchSubnav, 800);
  }
})();
