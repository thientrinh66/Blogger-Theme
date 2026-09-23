/* Power App Icons — Blogger theme + GitHub Pages standalone */
(function () {
  function isIconsPage() {
    try {
      if (document.body && document.body.getAttribute("data-ppi") === "standalone") return true;
      return /\/p\/[^"'?\s]*powerapp-icon/i.test(location.pathname) ||
        /powerapp-icon/i.test(location.href);
    } catch (e) {
      return false;
    }
  }

  function ensureRoot() {
    var root = document.getElementById("pp-icons");
    if (root) return root;
    if (!isIconsPage()) return null;
    if (document.body && document.body.getAttribute("data-ppi") === "standalone") {
      root = document.createElement("div");
      root.id = "pp-icons";
      document.body.appendChild(root);
      return root;
    }
    var host =
      document.querySelector(".pp-icons-body") ||
      document.querySelector(".single-post .post-body") ||
      document.querySelector("article .post-body") ||
      document.querySelector(".post-body");
    if (!host) return null;
    root = document.createElement("div");
    root.id = "pp-icons";
    host.innerHTML = "";
    host.appendChild(root);
    return root;
  }

  function boot() {
    var root = ensureRoot();
    if (!root || root.dataset.ready === "1") return;
    root.dataset.ready = "1";
    startApp(root);
  }

  function startApp(root) {
    var API = "https://api.iconify.design";
    var PAGE_SIZE = 48;
    var LIBS = [
      { id: "fluent", label: "Fluent 2", prefix: "fluent" },
      { id: "lucide", label: "Lucide", prefix: "lucide" },
      { id: "bi", label: "Bootstrap", prefix: "bi" },
      { id: "mdi", label: "Material", prefix: "mdi" },
      { id: "material-symbols", label: "Material Symbols", prefix: "material-symbols" },
      { id: "tabler", label: "Tabler", prefix: "tabler" }
    ];

    var state = {
      lib: "fluent",
      query: "",
      color: "#000000",
      size: 40,
      icons: [],
      page: 1,
      pageCount: 1,
      total: 0,
      selected: null,
      svg: "",
      loading: false,
      cache: {},
      collectionCache: {},
      allNames: []
    };

    root.innerHTML =
      '<div class="ppi-app">' +
      '<p class="ppi-lead">Click an icon to copy Power Apps YAML.</p>' +
      '<section class="ppi-panel">' +
      '<div class="ppi-toolbar">' +
      '<div class="ppi-libs" id="ppi-libs"></div>' +
      '<div class="ppi-search"><input id="ppi-q" type="search" placeholder="Search icons… (leave empty to browse)" autocomplete="off" value=""/></div>' +
      '<label class="ppi-color">Color <input id="ppi-color" type="color" value="#000000"/></label>' +
      '<label class="ppi-size">Size <input id="ppi-size" type="number" min="16" max="256" value="40"/></label>' +
      "</div>" +
      '<div id="ppi-grid" class="ppi-grid"></div>' +
      '<div id="ppi-status" class="ppi-status">Loading…</div>' +
      '<div id="ppi-pager" class="ppi-pager" hidden="hidden"></div>' +
      "</section></div>" +
      '<div class="ppi-toast" id="ppi-toast"></div>';

    var el = {
      libs: document.getElementById("ppi-libs"),
      q: document.getElementById("ppi-q"),
      color: document.getElementById("ppi-color"),
      size: document.getElementById("ppi-size"),
      grid: document.getElementById("ppi-grid"),
      status: document.getElementById("ppi-status"),
      pager: document.getElementById("ppi-pager"),
      toast: document.getElementById("ppi-toast")
    };

    function toast(msg) {
      el.toast.textContent = msg;
      el.toast.classList.add("show");
      clearTimeout(toast._t);
      toast._t = setTimeout(function () {
        el.toast.classList.remove("show");
      }, 1800);
    }

    function currentLib() {
      return LIBS.filter(function (l) {
        return l.id === state.lib;
      })[0];
    }

    function parseFull(full) {
      var i = full.indexOf(":");
      return { prefix: full.slice(0, i), name: full.slice(i + 1) };
    }

    function resolveIcon(data, name) {
      if (!data) return null;
      if (data.icons && data.icons[name]) return data.icons[name];
      var alias = data.aliases && data.aliases[name];
      if (alias && alias.parent && data.icons && data.icons[alias.parent]) {
        return data.icons[alias.parent];
      }
      return null;
    }

    function buildSvgFromData(data, name, color, size) {
      var icon = resolveIcon(data, name);
      if (!icon) return null;
      var w = icon.width || data.width || 24;
      var h = icon.height || data.height || 24;
      var body = (icon.body || "").replace(/currentColor/g, color);
      if (!body) return null;
      return (
        "<svg xmlns='http://www.w3.org/2000/svg' width='" +
        size +
        "px' height='" +
        size +
        "px' viewBox='0 0 " +
        w +
        " " +
        h +
        "' fill='" +
        color +
        "' stroke='none' stroke-width='0' stroke-linecap='round' stroke-linejoin='round'>" +
        body +
        "</svg>"
      );
    }

    function loadIconData(full) {
      if (state.cache[full] && resolveIcon(state.cache[full], parseFull(full).name)) {
        return Promise.resolve(state.cache[full]);
      }
      var p = parseFull(full);
      var url = API + "/" + p.prefix + ".json?icons=" + encodeURIComponent(p.name);
      return fetch(url)
        .then(function (r) {
          if (!r.ok) throw new Error("http " + r.status);
          return r.json();
        })
        .then(function (data) {
          state.cache[full] = data;
          if (!resolveIcon(data, p.name)) throw new Error("missing icon");
          return data;
        });
    }

    function loadIconsBatch(fulls) {
      var byPrefix = {};
      fulls.forEach(function (full) {
        var p = parseFull(full);
        if (state.cache[full] && resolveIcon(state.cache[full], p.name)) return;
        if (!byPrefix[p.prefix]) byPrefix[p.prefix] = [];
        byPrefix[p.prefix].push(p.name);
      });

      function fetchChunk(prefix, chunk) {
        var url = API + "/" + prefix + ".json?icons=" + chunk.map(encodeURIComponent).join(",");
        return fetch(url)
          .then(function (r) {
            if (!r.ok) throw new Error("http " + r.status);
            return r.json();
          })
          .then(function (data) {
            chunk.forEach(function (name) {
              state.cache[prefix + ":" + name] = data;
            });
          })
          .catch(function () {
            // Fallback: load each icon alone so one bad name doesn't kill the batch
            return Promise.all(
              chunk.map(function (name) {
                var full = prefix + ":" + name;
                return fetch(API + "/" + prefix + ".json?icons=" + encodeURIComponent(name))
                  .then(function (r) {
                    if (!r.ok) return null;
                    return r.json();
                  })
                  .then(function (data) {
                    if (data) state.cache[full] = data;
                  })
                  .catch(function () {});
              })
            );
          });
      }

      var jobs = Object.keys(byPrefix).map(function (prefix) {
        var names = byPrefix[prefix];
        var chunks = [];
        for (var i = 0; i < names.length; i += 40) chunks.push(names.slice(i, i + 40));
        return Promise.all(chunks.map(function (chunk) { return fetchChunk(prefix, chunk); }));
      });
      return Promise.all(jobs);
    }

    function getSvg(full) {
      return loadIconData(full).then(function (data) {
        var p = parseFull(full);
        return buildSvgFromData(data, p.name, state.color, state.size);
      });
    }

    function svgForPowerApps(svg) {
      var out = String(svg).replace(/\r?\n/g, "").replace(/\s+/g, " ").trim();
      out = out.replace(
        /\s(fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|xmlns|width|height|viewBox)="([^"]*)"/g,
        " $1='$2'"
      );
      return out.replace(/currentColor/g, state.color);
    }

    function buildYaml(svg) {
      var compact = svgForPowerApps(svg);
      return (
        "- SVG:\n" +
        "    Control: Image@2.2.3\n" +
        "    Properties:\n" +
        "      BorderColor: =RGBA(0, 0, 0, 1)\n" +
        "      Height: =150\n" +
        "      Image: |-\n" +
        '        ="data:image/svg+xml;utf8, "&EncodeUrl("' +
        compact +
        '")\n' +
        "      Width: =150\n" +
        "      X: =114\n" +
        "      Y: =Parent.Height/2 - Self.Height/2"
      );
    }

    function flattenCollection(data, prefix) {
      var names = [];
      var seen = {};
      function add(list) {
        if (!list) return;
        list.forEach(function (n) {
          if (seen[n]) return;
          seen[n] = 1;
          names.push(prefix + ":" + n);
        });
      }
      add(data.uncategorized);
      if (data.categories) {
        Object.keys(data.categories).forEach(function (k) {
          add(data.categories[k]);
        });
      }
      return names;
    }

    function loadCollection(prefix) {
      if (state.collectionCache[prefix]) {
        return Promise.resolve(state.collectionCache[prefix]);
      }
      return fetch(API + "/collection?prefix=" + encodeURIComponent(prefix))
        .then(function (r) {
          if (!r.ok) throw new Error("http " + r.status);
          return r.json();
        })
        .then(function (data) {
          var names = flattenCollection(data, prefix);
          state.collectionCache[prefix] = names;
          return names;
        });
    }

    function renderLibs() {
      el.libs.innerHTML = LIBS.map(function (l) {
        return (
          '<button type="button" data-lib="' +
          l.id +
          '" class="' +
          (state.lib === l.id ? "active" : "") +
          '">' +
          l.label +
          "</button>"
        );
      }).join("");
    }

    function paintCard(card, full) {
      var data = state.cache[full];
      var prev = card.querySelector(".ppi-prev");
      if (!prev) return false;
      if (!data) return false;
      var p = parseFull(full);
      var svg = buildSvgFromData(data, p.name, state.color, 28);
      if (!svg) return false;
      prev.innerHTML = svg;
      var svgEl = prev.querySelector("svg");
      if (svgEl) {
        svgEl.setAttribute("width", "28");
        svgEl.setAttribute("height", "28");
        svgEl.style.display = "block";
      }
      return true;
    }

    function pruneMissingCards() {
      Array.prototype.forEach.call(el.grid.querySelectorAll(".ppi-card"), function (card) {
        var full = card.getAttribute("data-icon");
        var data = state.cache[full];
        var p = parseFull(full);
        if (!data || !resolveIcon(data, p.name)) {
          card.remove();
          state.icons = state.icons.filter(function (x) { return x !== full; });
        }
      });
      if (!el.grid.querySelector(".ppi-card")) {
        el.status.hidden = false;
        el.status.textContent = "No icons found.";
      }
    }

    function renderPager() {
      if (state.pageCount <= 1) {
        el.pager.hidden = true;
        el.pager.innerHTML = "";
        return;
      }
      el.pager.hidden = false;
      var html = "";
      html +=
        '<button type="button" class="ppi-page-btn" data-page="prev"' +
        (state.page <= 1 ? " disabled" : "") +
        ">Prev</button>";

      var start = Math.max(1, state.page - 2);
      var end = Math.min(state.pageCount, start + 4);
      start = Math.max(1, end - 4);
      for (var i = start; i <= end; i++) {
        html +=
          '<button type="button" class="ppi-page-btn' +
          (i === state.page ? " active" : "") +
          '" data-page="' +
          i +
          '">' +
          i +
          "</button>";
      }
      html +=
        '<button type="button" class="ppi-page-btn" data-page="next"' +
        (state.page >= state.pageCount ? " disabled" : "") +
        ">Next</button>";
      html +=
        '<span class="ppi-page-info">' +
        state.page +
        " / " +
        state.pageCount +
        " (" +
        state.total +
        ")</span>";
      el.pager.innerHTML = html;
    }

    function renderGrid() {
      el.grid.innerHTML = "";
      var frag = document.createDocumentFragment();
      state.icons.forEach(function (full) {
        var name = full.split(":")[1] || full;
        var card = document.createElement("button");
        card.type = "button";
        card.className = "ppi-card" + (state.selected === full ? " active" : "");
        card.setAttribute("data-icon", full);
        card.title = name;
        card.setAttribute("aria-label", name);
        card.innerHTML = '<span class="ppi-prev"></span>';
        frag.appendChild(card);
      });
      el.grid.appendChild(frag);
      el.status.hidden = state.icons.length > 0;
      if (!state.icons.length) el.status.textContent = "No icons found.";
      renderPager();

      loadIconsBatch(state.icons)
        .then(function () {
          Array.prototype.forEach.call(el.grid.querySelectorAll(".ppi-card"), function (card) {
            paintCard(card, card.getAttribute("data-icon"));
          });
          pruneMissingCards();
        })
        .catch(function () {
          el.status.hidden = false;
          el.status.textContent = "Failed to load icons.";
        });
    }

    function applyBrowsePage() {
      var start = (state.page - 1) * PAGE_SIZE;
      state.icons = state.allNames.slice(start, start + PAGE_SIZE);
      state.total = state.allNames.length;
      state.pageCount = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
      renderGrid();
    }

    function fetchBrowse() {
      var lib = currentLib();
      return loadCollection(lib.prefix).then(function (names) {
        state.allNames = names;
        state.page = 1;
        applyBrowsePage();
      });
    }

    function fetchSearch() {
      var lib = currentLib();
      var q = state.query.trim();
      // Iconify caps `total` to `limit` and rejects start>=that cap (HTTP 400).
      // Fetch a large batch once, then paginate client-side.
      var url =
        API +
        "/search?query=" +
        encodeURIComponent(q) +
        "&prefix=" +
        encodeURIComponent(lib.prefix) +
        "&limit=999&start=0";
      return fetch(url)
        .then(function (r) {
          if (!r.ok) throw new Error("http " + r.status);
          return r.json();
        })
        .then(function (data) {
          state.allNames = data.icons || [];
          state.total = state.allNames.length;
          state.pageCount = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
          if (state.page > state.pageCount) state.page = state.pageCount;
          var start = (state.page - 1) * PAGE_SIZE;
          state.icons = state.allNames.slice(start, start + PAGE_SIZE);
          renderGrid();
        });
    }

    function fetchIcons() {
      if (state.loading) return;
      state.loading = true;
      el.status.hidden = false;
      el.status.textContent = "Loading…";
      el.grid.innerHTML = "";
      el.pager.hidden = true;

      var job = state.query.trim() ? fetchSearch() : fetchBrowse();
      job
        .catch(function () {
          el.status.hidden = false;
          el.status.textContent = "Failed to load icons.";
          el.pager.hidden = true;
        })
        .finally(function () {
          state.loading = false;
        });
    }

    function goPage(page) {
      var next = page;
      if (page === "prev") next = state.page - 1;
      if (page === "next") next = state.page + 1;
      next = Number(next);
      if (!next || next < 1 || next > state.pageCount || next === state.page) return;
      state.page = next;
      // Both browse + search keep full list in allNames
      if (state.allNames.length) {
        applyBrowsePage();
      } else {
        fetchIcons();
      }
    }

    function selectIcon(full) {
      state.selected = full;
      Array.prototype.forEach.call(el.grid.querySelectorAll(".ppi-card"), function (c) {
        c.classList.toggle("active", c.getAttribute("data-icon") === full);
      });
      getSvg(full)
        .then(function (svg) {
          if (!svg) throw new Error("no svg");
          state.svg = svg;
          return navigator.clipboard.writeText(buildYaml(svg)).then(function () {
            toast("Copied YAML");
          });
        })
        .catch(function () {
          toast("Copy failed");
        });
    }

    function debounce(fn, ms) {
      var t;
      return function () {
        var args = arguments;
        clearTimeout(t);
        t = setTimeout(function () {
          fn.apply(null, args);
        }, ms);
      };
    }

    el.libs.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-lib]");
      if (!btn) return;
      state.lib = btn.getAttribute("data-lib");
      state.page = 1;
      renderLibs();
      fetchIcons();
    });
    el.q.addEventListener(
      "input",
      debounce(function () {
        state.query = el.q.value;
        state.page = 1;
        fetchIcons();
      }, 280)
    );
    el.color.addEventListener("input", function () {
      state.color = el.color.value;
      Array.prototype.forEach.call(el.grid.querySelectorAll(".ppi-card"), function (card) {
        paintCard(card, card.getAttribute("data-icon"));
      });
    });
    el.size.addEventListener("change", function () {
      state.size = Math.min(256, Math.max(16, Number(el.size.value) || 40));
      el.size.value = state.size;
    });
    el.grid.addEventListener("click", function (e) {
      var card = e.target.closest(".ppi-card");
      if (!card) return;
      selectIcon(card.getAttribute("data-icon"));
    });
    el.pager.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-page]");
      if (!btn || btn.disabled) return;
      goPage(btn.getAttribute("data-page"));
    });

    renderLibs();
    fetchIcons();
  }

  boot();
  document.addEventListener("DOMContentLoaded", boot);
  setTimeout(boot, 300);
  setTimeout(boot, 1200);
  try {
    new MutationObserver(function () {
      if (isIconsPage() && !document.getElementById("pp-icons")) boot();
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
