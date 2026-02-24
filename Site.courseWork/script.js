

 const TOTAL_PAGES = 5;

  // ---------- helpers ----------
  function escapeHtml(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slugify(text = "") {
    return text
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // ---------- paging: figure out which page we are on ----------
  function getCurrentPageNumber() {
    const file = location.pathname.split("/").pop() || "";
    const m = file.match(/page(\d+)\.html$/i); // page1.html, page2.html, ...
    const n = m ? Number(m[1]) : 1;
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, TOTAL_PAGES);
  }

  function setupPager(page) {
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const pageLabel = document.getElementById("pageLabel");

    if (pageLabel) pageLabel.textContent = `Page ${page} / ${TOTAL_PAGES}`;

    if (prevBtn) {
      if (page <= 1) {
        prevBtn.classList.add("disabled");
        prevBtn.removeAttribute("href");
      } else {
        prevBtn.classList.remove("disabled");
        prevBtn.href = `page${page - 1}.html`;
      }
    }

    if (nextBtn) {
      if (page >= TOTAL_PAGES) {
        nextBtn.classList.add("disabled");
        nextBtn.removeAttribute("href");
      } else {
        nextBtn.classList.remove("disabled");
        nextBtn.href = `page${page + 1}.html`;
      }
    }
  }

  // ---------- renderer ----------
  function renderBlock(b) {
    switch (b.type) {
      case "h1":
        return `<h1>${escapeHtml(b.text)}</h1>`;

      case "h2":
        return `<h2 id="h2-${slugify(b.text)}">${escapeHtml(b.text)}</h2>`;

      case "h3":
        return `<h3 id="h3-${slugify(b.text)}">${escapeHtml(b.text)}</h3>`;

      case "p":
        return `<p>${escapeHtml(b.text)}</p>`;
        
        case "em":
  return `<p><em>${escapeHtml(b.text)}</em></p>`;

      case "ul":
        return `<ul>${(b.items || [])
          .map(i => `<li>${escapeHtml(i)}</li>`)
          .join("")}</ul>`;

      case "quote": {
        const by = b.by ? `<footer>— ${escapeHtml(b.by)}</footer>` : "";
        return `<blockquote><p>${escapeHtml(b.text)}</p>${by}</blockquote>`;
      }

      case "links":
        return `<ul>${(b.items || [])
          .map(u => `<li><a href="${escapeHtml(u)}" target="_blank" rel="noreferrer">${escapeHtml(u)}</a></li>`)
          .join("")}</ul>`;

      default:
        return "";
    }
  }

  // ---------- hash scrolling (your retry logic) ----------
  function scrollToHashWithRetry(retries = 40) {
    const hash = location.hash;
    if (!hash) return;

    const id = hash.slice(1);
    const el = document.getElementById(id);

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (retries > 0) {
      setTimeout(() => scrollToHashWithRetry(retries - 1), 50);
    }
  }

  window.addEventListener("hashchange", () => scrollToHashWithRetry());

  // ---------- main loader ----------
  async function loadArticle() {
    const app = document.getElementById("app");
    if (!app) return;

    const page = getCurrentPageNumber();
    setupPager(page);

    const JSON_URL = `/content/internet-ukraine-pages/page${page}.json`;

    try {
      const res = await fetch(JSON_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load JSON (${res.status})`);
      const data = await res.json();

app.innerHTML = (data.content || []).map(renderBlock).join("\n");
      
      // show notes saved inside page5.json
if (page === 5 && Array.isArray(data.userNotes) && data.userNotes.length) {
  const html = `
    <hr />
    <h2 id="user-notes">Your saved notes</h2>
    ${data.userNotes
      .map(n => `<p>${escapeHtml(n.text).replaceAll("\n", "<br/>")}</p>`)
      .join("")}
  `;
  app.insertAdjacentHTML("beforeend", html);
}
      
highlightFromQueryParam(app);
scrollToHashWithRetry();

      // scroll AFTER render
      scrollToHashWithRetry();
    } catch (e) {
      app.innerHTML = `
        <div class="error">
          <b>Could not load article.</b><br/>
          ${escapeHtml(e.message)}<br/><br/>
          Check that <code>${escapeHtml(JSON_URL)}</code> exists and is accessible.
        </div>
      `;
    }
  }


function highlightFromQueryParam(root) {
  const q = new URLSearchParams(location.search).get("q");
  if (!q) return;

  const term = q.trim();
  if (!term) return;

  highlightText(root, term);
}

// Highlight text nodes only (safe). No manual editing pages.
function highlightText(root, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // regex escape
  const re = new RegExp(escaped, "gi");

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentNode;
      // don't highlight inside script/style or inside existing mark tags
      if (!parent || ["SCRIPT", "STYLE", "MARK"].includes(parent.nodeName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return re.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const textNode of nodes) {
    const text = textNode.nodeValue;
    const span = document.createElement("span");
    span.innerHTML = text.replace(re, (m) => `<mark class="hit">${m}</mark>`);
    textNode.parentNode.replaceChild(span, textNode);
  }

  // optional: scroll to first hit (only if no #hash)
  if (!location.hash) {
    const first = root.querySelector("mark.hit");
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

  loadArticle();
