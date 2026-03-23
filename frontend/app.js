/**
 * PEA Data Retrieval — Frontend Application
 * Consumes the backend API at /api/v1
 */

const API_BASE = "/api/v1";

// ─── State ──────────────────────────────────────────────────────────
const state = {
  q: "",
  size: "",
  parent8: "",
  groupCode: "",
  page: 1,
  limit: 50,
  sort: "index",
  order: "asc",
  currentTab: "table",
  hierarchyData: null,
  statsData: null,
};

// ─── API Helpers ────────────────────────────────────────────────────
async function apiFetch(path, params = {}) {
  const url = new URL(API_BASE + path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ─── Debounce ───────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ─── Stats ──────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await apiFetch("/stats");
    state.statsData = res.data;
    renderStats(res.data);
    document.getElementById("headerSubtitle").textContent =
      `การไฟฟ้าส่วนภูมิภาค เขต 1 (ภาคตะวันออกเฉียงเหนือ) — ${res.data.totalOffices} สำนักงาน`;
  } catch (e) {
    console.error("Stats error:", e);
  }
}

function renderStats(data) {
  const row = document.getElementById("statsRow");
  const cards = [
    { label: "ทั้งหมด", value: data.totalOffices, cls: "" },
    { label: "L — ใหญ่", value: data.bySize.L, cls: "size-L" },
    { label: "M — กลาง", value: data.bySize.M, cls: "size-M" },
    { label: "S — เล็ก", value: data.bySize.S, cls: "size-S" },
    { label: "XS — เล็กพิเศษ", value: data.bySize.XS, cls: "size-XS" },
    { label: "8 กฟจ.", value: data.totalGroups8, cls: "" },
    { label: "17 จุดรวมงาน", value: data.totalGroups17, cls: "" },
    { label: "43 กฟฟ.", value: data.totalGroups43, cls: "" },
  ];
  row.innerHTML = cards
    .map(
      (c) => `
    <div class="stat-card ${c.cls}">
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${c.label}</div>
    </div>`
    )
    .join("");
}

// ─── Filter Dropdowns ───────────────────────────────────────────────
async function loadFilters() {
  try {
    // Load Group8 for filter
    const g8res = await apiFetch("/groups/8");
    const sel8 = document.getElementById("filterGroup8");
    g8res.data.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = `${g.shortName || g.name}`;
      sel8.appendChild(opt);
    });

    // Load Group17 for filter
    const g17res = await apiFetch("/groups/17");
    const selGC = document.getElementById("filterGroupCode");
    g17res.data.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.code;
      opt.textContent = `${g.shortName || g.name}`;
      selGC.appendChild(opt);
    });
  } catch (e) {
    console.error("Filter load error:", e);
  }
}

// ─── Table ──────────────────────────────────────────────────────────
async function loadTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = `<tr><td colspan="8" class="loading"><div class="spinner"></div><br>กำลังโหลด...</td></tr>`;

  try {
    const res = await apiFetch("/offices", {
      q: state.q,
      size: state.size,
      parent8: state.parent8,
      groupCode: state.groupCode,
      page: state.page,
      limit: state.limit,
      sort: state.sort,
      order: state.order,
    });

    const offices = res.data;
    const meta = res.meta;

    document.getElementById("resultCount").textContent =
      `${meta.total} รายการ`;

    if (offices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">ไม่พบข้อมูล</td></tr>`;
      document.getElementById("pagination").innerHTML = "";
      return;
    }

    tbody.innerHTML = offices
      .map(
        (o) => `
      <tr data-code="${o.code}">
        <td>${o.index ?? "-"}</td>
        <td style="color: var(--accent); font-weight: 500;">${o.code}</td>
        <td style="font-weight: 600;">${o.shortName}</td>
        <td>${o.fullName}</td>
        <td><span class="size-badge ${o.size}">${o.size}</span></td>
        <td>${o.parent43Name}</td>
        <td>${o.parent17Name}</td>
        <td>${o.parent8Name}</td>
      </tr>`
      )
      .join("");

    renderPagination(meta);
    updateSortHeaders();
  } catch (e) {
    console.error("Table error:", e);
    tbody.innerHTML = `<tr><td colspan="8" class="error-state">เกิดข้อผิดพลาด: ${e.message}</td></tr>`;
  }
}

function renderPagination(meta) {
  const div = document.getElementById("pagination");
  if (meta.totalPages <= 1) {
    div.innerHTML = "";
    return;
  }
  div.innerHTML = `
    <button ${meta.page <= 1 ? "disabled" : ""} onclick="goPage(1)">&#171;</button>
    <button ${meta.page <= 1 ? "disabled" : ""} onclick="goPage(${meta.page - 1})">&#8249;</button>
    <span class="page-info">หน้า ${meta.page} / ${meta.totalPages}</span>
    <button ${meta.page >= meta.totalPages ? "disabled" : ""} onclick="goPage(${meta.page + 1})">&#8250;</button>
    <button ${meta.page >= meta.totalPages ? "disabled" : ""} onclick="goPage(${meta.totalPages})">&#187;</button>
  `;
}

function goPage(p) {
  state.page = p;
  loadTable();
}

function updateSortHeaders() {
  document.querySelectorAll(".results-table th[data-sort]").forEach((th) => {
    const key = th.dataset.sort;
    const arrow = th.querySelector(".sort-arrow");
    if (key === state.sort) {
      th.classList.add("sorted");
      arrow.textContent = state.order === "asc" ? "▲" : "▼";
    } else {
      th.classList.remove("sorted");
      arrow.textContent = "";
    }
  });
}

// ─── Detail Modal ───────────────────────────────────────────────────
async function showDetail(code) {
  const overlay = document.getElementById("detailOverlay");
  const card = document.getElementById("detailCard");

  card.innerHTML = `<div class="loading"><div class="spinner"></div><br>กำลังโหลด...</div>`;
  overlay.classList.add("show");

  try {
    const [officeRes, pathRes] = await Promise.all([
      apiFetch(`/offices/${code}`),
      apiFetch(`/offices/${code}/path`),
    ]);

    const o = officeRes.data;
    const p = pathRes.data;

    card.innerHTML = `
      <button class="close-btn" onclick="closeDetail()">&times;</button>
      <h2>${o.fullName}</h2>
      <div class="detail-code">${o.code} &middot; <span class="size-badge ${o.size}">${o.size}</span></div>
      
      <div class="detail-section">
        <h3>ข้อมูลพื้นฐาน</h3>
        <div class="detail-grid">
          <span class="label">รหัส</span><span class="value">${o.code}</span>
          <span class="label">ชื่อย่อ</span><span class="value">${o.shortName}</span>
          <span class="label">ชื่อเต็ม</span><span class="value">${o.fullName}</span>
          <span class="label">ระดับ</span><span class="value"><span class="size-badge ${o.size}">${o.size}</span></span>
          <span class="label">ลำดับ</span><span class="value">${o.index ?? "-"}</span>
          <span class="label">ชื่อย่ออื่น</span><span class="value">${o.aliases.length ? o.aliases.join(", ") : "-"}</span>
          <span class="label">รหัสกลุ่ม</span><span class="value">${o.groupCode} (กลุ่ม ${o.groupNum ?? "-"})</span>
        </div>
      </div>

      <div class="detail-section">
        <h3>สายสังกัด (เล็ก → ใหญ่)</h3>
        <div class="hierarchy-path">
          <div class="path-item" style="--depth: 4">
            <div class="path-dot" style="background: var(--size-${o.size})"></div>
            <span class="path-type">สำนักงาน</span>
            <strong>${o.shortName}</strong> — ${o.fullName}
          </div>
          ${p.group43 ? `
          <div class="path-item" style="--depth: 3">
            <div class="path-dot" style="background: #60a5fa"></div>
            <span class="path-type">43 กฟฟ.</span>
            ${p.group43.shortName || p.group43.name}
          </div>` : ""}
          ${p.group17 ? `
          <div class="path-item" style="--depth: 2">
            <div class="path-dot" style="background: #a78bfa"></div>
            <span class="path-type">17 จุดรวม</span>
            ${p.group17.shortName || p.group17.name}
          </div>` : ""}
          ${p.group8 ? `
          <div class="path-item" style="--depth: 1">
            <div class="path-dot" style="background: #818cf8"></div>
            <span class="path-type">8 กฟจ.</span>
            ${p.group8.shortName || p.group8.name}
          </div>` : ""}
          <div class="path-item" style="--depth: 0">
            <div class="path-dot" style="background: var(--accent)"></div>
            <span class="path-type">เขต</span>
            ${p.region.shortName}
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    card.innerHTML = `<button class="close-btn" onclick="closeDetail()">&times;</button>
      <div class="error-state">ไม่สามารถโหลดข้อมูล: ${e.message}</div>`;
  }
}

function closeDetail() {
  document.getElementById("detailOverlay").classList.remove("show");
}

// ─── Hierarchy Tree ─────────────────────────────────────────────────
async function loadTree() {
  const container = document.getElementById("treeContainer");
  if (state.hierarchyData) {
    renderTree(state.hierarchyData);
    return;
  }

  container.innerHTML = `<div class="loading"><div class="spinner"></div><br>กำลังโหลดโครงสร้าง...</div>`;

  try {
    const res = await apiFetch("/hierarchy");
    state.hierarchyData = res.data;
    renderTree(res.data);
  } catch (e) {
    container.innerHTML = `<div class="error-state">เกิดข้อผิดพลาด: ${e.message}</div>`;
  }
}

function renderTree(data) {
  const container = document.getElementById("treeContainer");
  let html = `<div class="tree-node-header" style="padding-left: 0; font-weight: 600; color: var(--accent);">
    &#9733; ${data.region.shortName} — ${data.region.name}
  </div>`;

  for (const g8 of data.children || []) {
    html += renderTreeNode(g8, 0);
  }
  container.innerHTML = html;
}

function renderTreeNode(node, depth) {
  const hasChildren = node.children && node.children.length > 0;
  const id = `tree_${node.id || node.code || Math.random().toString(36).substr(2, 6)}`;
  const typeBadge = node.type ? `<span class="tree-type-badge ${node.type}">${getTypeLabel(node.type)}</span>` : "";
  const sizeHtml = node.size ? `<span class="size-badge ${node.size}">${node.size}</span>` : "";
  const name = node.fullName || node.name || node.shortName;
  const short = node.shortName && node.shortName !== name ? `(${node.shortName})` : "";
  const codeHtml = node.code ? `<span style="color: var(--text-muted); font-size: 11px;">${node.code}</span>` : "";

  let html = `
    <div class="tree-node" style="margin-left: ${depth * 12}px">
      <div class="tree-node-header" onclick="${hasChildren ? `toggleTree('${id}')` : `showDetail('${node.code}')`}">
        ${hasChildren ? `<span class="tree-toggle" id="toggle_${id}">&#9654;</span>` : `<span style="width:16px; display:inline-block"></span>`}
        ${typeBadge} ${sizeHtml} ${name} ${short} ${codeHtml}
      </div>`;

  if (hasChildren) {
    html += `<div class="tree-children" id="children_${id}">`;
    for (const child of node.children) {
      html += renderTreeNode(child, depth + 1);
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function getTypeLabel(type) {
  const labels = { group8: "กฟจ.", group17: "17", group43: "43", office: "สนง." };
  return labels[type] || type;
}

function toggleTree(id) {
  const children = document.getElementById("children_" + id);
  const toggle = document.getElementById("toggle_" + id);
  if (children) {
    children.classList.toggle("open");
    toggle.classList.toggle("open");
  }
}

// ─── Event Listeners ────────────────────────────────────────────────
function init() {
  // Search
  const searchInput = document.getElementById("searchInput");
  const debouncedSearch = debounce(() => {
    state.q = searchInput.value;
    state.page = 1;
    loadTable();
  }, 300);
  searchInput.addEventListener("input", debouncedSearch);

  // Filters
  document.getElementById("filterSize").addEventListener("change", (e) => {
    state.size = e.target.value;
    state.page = 1;
    loadTable();
  });
  document.getElementById("filterGroup8").addEventListener("change", (e) => {
    state.parent8 = e.target.value;
    state.page = 1;
    loadTable();
  });
  document.getElementById("filterGroupCode").addEventListener("change", (e) => {
    state.groupCode = e.target.value;
    state.page = 1;
    loadTable();
  });

  // Sort
  document.querySelectorAll(".results-table th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.sort === key) {
        state.order = state.order === "asc" ? "desc" : "asc";
      } else {
        state.sort = key;
        state.order = "asc";
      }
      state.page = 1;
      loadTable();
    });
  });

  // Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      state.currentTab = tab;
      document.getElementById("tableView").style.display = tab === "table" ? "" : "none";
      document.getElementById("treeView").style.display = tab === "tree" ? "" : "none";
      document.getElementById("controlsPanel").style.display = tab === "table" ? "" : "none";
      if (tab === "tree") loadTree();
    });
  });

  // Table row click
  document.getElementById("tableBody").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-code]");
    if (tr) showDetail(tr.dataset.code);
  });

  // Close modal on overlay click
  document.getElementById("detailOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeDetail();
  });

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetail();
  });

  // Initial load
  loadStats();
  loadFilters();
  loadTable();
}

// Make functions available globally for inline onclick handlers
window.goPage = goPage;
window.showDetail = showDetail;
window.closeDetail = closeDetail;
window.toggleTree = toggleTree;

document.addEventListener("DOMContentLoaded", init);
