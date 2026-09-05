
const API_BASE = "http://127.0.0.1:8001";
const CREATOR = "ALASI OLATUNDE | tuttyDev77";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const state = {
  persons: [],
  parents: [],
  marriages: [],
  photos: [],
  tab: "dashboard",
  search: "",
  gallerySearch: "",
  galleryFilter: "all",
  editingId: null,
  selectedPerson: null,
  selectedPhoto: null,
  galleryFile: null,
  galleryPreview: "",
  treeDirection: "TB",
  treeScale: 1,
  treePan: { x: 0, y: 0 },
  treeDragging: false,
  treeDragStart: null,
  message: "",
  error: "",
  loading: true,
  syncing: false,
};

const app = document.getElementById("app");

const esc = (value = "") =>
  String(value).replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;",
      }[char])
  );

const apiUrl = (path) => `${API_BASE}${path}`;

const fullName = (person) =>
  person
    ? `${person.first_name || ""} ${person.last_name || ""}`.trim() ||
      "Unnamed member"
    : "Unknown member";

const initials = (person) =>
  person
    ? `${person.first_name?.[0] || ""}${
        person.last_name?.[0] || ""
      }`.toUpperCase() || "?"
    : "?";

const imageUrl = (url) =>
  url ? (/^https?:\/\//i.test(url) ? url : apiUrl(url)) : "";

const formatDate = (value) => {
  if (!value) return "—";

  const d = new Date(value);

  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

const personById = (id) =>
  state.persons.find((p) => Number(p.id) === Number(id));

const photoForPerson = (id) => {
  const person = personById(id);

  if (person?.photo_url) {
    return person.photo_url;
  }

  return (
    state.photos.find(
      (p) => Number(p.person_id) === Number(id)
    )?.url || ""
  );
};

async function api(path, options = {}) {
  const response = await fetch(apiUrl(path), options);

  if (!response.ok) {
    let detail = "Request failed.";

    try {
      const data = await response.json();

      detail = Array.isArray(data.detail)
        ? data.detail.map((x) => x.msg).join("; ")
        : data.detail || detail;
    } catch {}

    throw new Error(detail);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function setMessage(message) {
  state.message = message;
  state.error = "";

  renderAlert();

  window.setTimeout(() => {
    if (state.message === message) {
      state.message = "";
      renderAlert();
    }
  }, 4500);
}

function setError(error) {
  state.error = error || "Something went wrong.";
  state.message = "";

  renderAlert();
}

function renderAlert() {
  const node = document.getElementById("alert-slot");

  if (!node) return;

  node.innerHTML =
    state.message || state.error
      ? `<div class="alert ${
          state.error ? "error" : "success"
        }">
          <span>${esc(state.error || state.message)}</span>
          <button data-action="dismiss-alert">✕</button>
        </div>`
      : "";
}

async function loadData(silent = false) {
  state.syncing = true;

  if (!silent) {
    state.loading = true;
    render();
  }

  try {
    const [persons, parents, marriages, photos] =
      await Promise.all([
        api("/persons"),
        api("/relationships/parents"),
        api("/relationships/marriages"),
        api("/gallery"),
      ]);

    state.persons = persons;
    state.parents = parents;
    state.marriages = marriages;
    state.photos = photos;

    if (state.selectedPerson) {
      state.selectedPerson =
        personById(state.selectedPerson.id) || null;
    }
  } catch (error) {
    setError(error.message);
  } finally {
    state.loading = false;
    state.syncing = false;
    render();
  }
}

function navButton(tab, label, icon, count) {
  return `<button class="${
    state.tab === tab ? "active" : ""
  }" data-tab="${tab}">
    <span>${icon}</span>
    <span>${label}</span>
    ${
      count !== undefined
        ? `<em class="badge">${count}</em>`
        : ""
    }
  </button>`;
}

function render() {
  if (state.loading) {
    app.innerHTML = `
      <div class="loading">
        <div class="loading-inner">
          <div class="loading-mark">🌳</div>
          <strong>Loading FamilyTree</strong>
          <div>Preparing your family archive…</div>
        </div>
      </div>`;
    return;
  }

  const titles = {
    dashboard: "Family Overview",
    persons: "Family Directory",
    tree: "Interactive Family Tree",
    relationships: "Family Connections",
    gallery: "Family Photo Archive",
  };

  app.innerHTML = `
    <div class="app-shell">

      <aside class="sidebar" id="sidebar">

        <div class="brand">
          <div class="brand-icon">🌳</div>
          <div>
            <strong>FamilyTree</strong>
            <small>Heritage archive</small>
          </div>
        </div>

        <nav class="nav">
          <p class="nav-caption">Workspace</p>

          ${navButton("dashboard", "Dashboard", "▦")}
          ${navButton(
            "persons",
            "Members",
            "♙",
            state.persons.length
          )}
          ${navButton("tree", "Visual tree", "⌘")}
          ${navButton(
            "relationships",
            "Connections",
            "↔"
          )}
          ${navButton(
            "gallery",
            "Gallery",
            "▧",
            state.photos.length
          )}
        </nav>

        <div class="author">
          <div class="author-avatar">AO</div>
          <div>
            <small>Created by</small>
            <strong>${CREATOR}</strong>
          </div>
        </div>

      </aside>

      <button
        class="mobile-backdrop"
        id="mobile-backdrop"
        hidden
      ></button>

      <section class="main">

        <header class="topbar">

          <div class="top-left">

            <button
              class="mobile-menu"
              data-action="open-menu"
            >
              ☰
            </button>

            <div>
              <span class="eyebrow">
                FAMILY HERITAGE SYSTEM
              </span>

              <h1>${titles[state.tab]}</h1>
            </div>

          </div>

          <div class="top-actions">

            <span class="status">
              <i class="dot"></i>
              Connected
            </span>

            <button
              class="icon-btn"
              data-action="sync"
              title="Synchronize"
            >
              ↻
            </button>

          </div>

        </header>

        <main class="content">

          <div id="alert-slot"></div>

          ${renderPage()}

        </main>

        <footer class="footer">
          <span>
            FamilyTree · ${CREATOR}
          </span>

          <span>
            ✓ Local-first family archive
          </span>
        </footer>

      </section>

      ${state.selectedPerson ? renderPersonModal() : ""}

      ${state.selectedPhoto ? renderPhotoModal() : ""}

    </div>`;
  
  renderAlert();
  bindEvents();
}

function renderPage() {
  if (state.tab === "dashboard") {
    return renderDashboard();
  }

  if (state.tab === "persons") {
    return renderPersons();
  }

  if (state.tab === "tree") {
    return renderTree();
  }

  if (state.tab === "relationships") {
    return renderRelationships();
  }

  return renderGallery();
}

function renderDashboard() {
  return `
    <div class="page">

      <section class="hero">

        <div class="hero-copy">

          <span class="hero-kicker">
            PRESERVE · CONNECT · REMEMBER
          </span>

          <h2>
            Your family story deserves a permanent home.
          </h2>

          <p>
            Build a living family tree, connect generations,
            and preserve the photographs that make your
            history tangible.
          </p>

          <div class="actions">

            <button
              class="btn primary"
              data-tab="persons"
            >
              ♙ Add family member
            </button>

            <button
              class="btn ghost"
              data-tab="tree"
            >
              ⌘ Explore family tree
            </button>

          </div>

        </div>

        <div class="hero-art">
          <span>🌿</span>
          <strong>${state.persons.length}</strong>
          <small>people documented</small>
        </div>

      </section>

      <section class="stats">

        ${[
          ["Family members", state.persons.length, "♙"],
          ["Parent links", state.parents.length, "⌘"],
          ["Marriages", state.marriages.length, "♥"],
          ["Photos", state.photos.length, "▧"],
        ]
          .map(
            ([label, value, icon]) => `
              <article class="stat">

                <div class="stat-icon">
                  ${icon}
                </div>

                <div>
                  <strong>${value}</strong>
                  <small>${label}</small>
                </div>

              </article>
            `
          )
          .join("")}

      </section>

      <section class="dashboard-grid">

        <article class="surface pad">

          <div class="section-head">

            <div>
              <span class="eyebrow">DIRECTORY</span>
              <h3>Recent members</h3>
            </div>

            <button
              class="text-btn"
              data-tab="persons"
            >
              View all ›
            </button>

          </div>

          ${
            state.persons.length
              ? `
                <div class="member-list">
                  ${state.persons
                    .slice(0, 6)
                    .map(memberRow)
                    .join("")}
                </div>
              `
              : emptyState(
                  "♙",
                  "Your tree starts here",
                  "Add your first family member to begin building the archive.",
                  "Add member",
                  "persons"
                )
          }

        </article>

        <article class="surface pad">

          <div class="section-head">

            <div>
              <span class="eyebrow">ARCHIVE</span>
              <h3>Photo memories</h3>
            </div>

            <button
              class="text-btn"
              data-tab="gallery"
            >
              Open gallery ›
            </button>

          </div>

          ${
            state.photos.length
              ? `
                <div class="mini-photos">

                  ${state.photos
                    .slice(0, 4)
                    .map(
                      (p) => `
                        <button data-photo="${p.id}">
                          <img
                            src="${esc(imageUrl(p.url))}"
                            alt="${esc(
                              p.title ||
                                "Family memory"
                            )}"
                          >
                        </button>
                      `
                    )
                    .join("")}

                </div>
              `
              : emptyState(
                  "▧",
                  "No memories yet",
                  "Upload family photographs and tag them to members.",
                  "Open gallery",
                  "gallery"
                )
          }

        </article>

      </section>

    </div>`;
}

function memberRow(person) {
  return `
    <button
      class="member-row"
      data-person="${person.id}"
    >

      <div class="avatar small">

        ${
          person.photo_url
            ? `
              <img
                src="${esc(
                  imageUrl(person.photo_url)
                )}"
                alt=""
              >
            `
            : initials(person)
        }

      </div>

      <span class="grow">

        <strong>
          ${esc(fullName(person))}
        </strong>

        <small>
          ${esc(
            person.occupation ||
              person.gender ||
              "Family member"
          )}
        </small>

      </span>

      <span>›</span>

    </button>`;
}

function emptyState(
  icon,
  title,
  text,
  action,
  tab
) {
  return `
    <div class="empty">

      <div class="empty-icon">
        ${icon}
      </div>

      <h3>${esc(title)}</h3>

      <p>${esc(text)}</p>

      ${
        action
          ? `
            <button
              class="btn primary"
              data-tab="${tab}"
            >
              ${esc(action)}
            </button>
          `
          : ""
      }

    </div>`;
}


/* =========================================================
   FAMILY MEMBERS
   ========================================================= */

function renderPersons() {
  const term = state.search.trim().toLowerCase();

  const persons = state.persons.filter((p) => {
    const searchableText = `
      ${fullName(p)}
      ${p.email || ""}
      ${p.gender || ""}
      ${p.phone || ""}
      ${p.occupation || ""}
      ${p.place_of_birth || ""}
      ${p.place_of_death || ""}
      ${p.biography || ""}
      ${p.id}
    `.toLowerCase();

    return !term || searchableText.includes(term);
  });

  const editing = personById(state.editingId);

  return `
    <div class="page">

      <div class="page-title">

        <div>
          <span class="eyebrow">PEOPLE</span>

          <h2>Family directory</h2>

          <p>
            Maintain complete member records and
            profile photographs.
          </p>
        </div>

        <span class="pill">
          ♙ ${state.persons.length} members
        </span>

      </div>


      <div class="two-col">


        <!-- MEMBER FORM -->

        <section class="surface form-card">

          <div class="card-title">

            <div class="title-icon">
              ♙
            </div>

            <div>

              <h3>
                ${editing ? "Edit member" : "Add member"}
              </h3>

              <p>
                ${
                  editing
                    ? "Update the selected family record."
                    : "Create a new family record."
                }
              </p>

            </div>

          </div>


          <form
            id="person-form"
            class="form"
          >


            <!-- BASIC INFORMATION -->

            <div class="form-section">

              <div class="form-section-title">
                Basic information
              </div>

              <div class="grid2">

                <label class="field">

                  <span>
                    First name<b>*</b>
                  </span>

                  <input
                    name="first_name"
                    required
                    value="${esc(
                      editing?.first_name || ""
                    )}"
                  >

                </label>


                <label class="field">

                  <span>
                    Last name<b>*</b>
                  </span>

                  <input
                    name="last_name"
                    required
                    value="${esc(
                      editing?.last_name || ""
                    )}"
                  >

                </label>

              </div>


              <div class="grid2">

                <label class="field">

                  <span>
                    Gender
                  </span>

                  <select name="gender">

                    <option value="">
                      Select gender
                    </option>

                    ${[
                      "Male",
                      "Female",
                      "Other",
                    ]
                      .map(
                        (x) => `
                          <option
                            value="${x}"
                            ${
                              editing?.gender === x
                                ? "selected"
                                : ""
                            }
                          >
                            ${x}
                          </option>
                        `
                      )
                      .join("")}

                  </select>

                </label>


                <label class="field">

                  <span>
                    Phone
                  </span>

                  <input
                    type="tel"
                    name="phone"
                    maxlength="50"
                    value="${esc(
                      editing?.phone || ""
                    )}"
                    placeholder="Phone number"
                  >

                </label>

              </div>


              <label class="field">

                <span>
                  Email
                </span>

                <input
                  type="email"
                  name="email"
                  value="${esc(
                    editing?.email || ""
                  )}"
                  placeholder="Email address"
                >

              </label>

            </div>


            <!-- BIRTH INFORMATION -->

            <div class="form-section">

              <div class="form-section-title">
                Birth information
              </div>

              <div class="grid2">

                <label class="field">

                  <span>
                    Date of birth
                  </span>

                  <input
                    type="date"
                    name="date_of_birth"
                    value="${esc(
                      editing?.date_of_birth || ""
                    )}"
                  >

                </label>


                <label class="field">

                  <span>
                    Place of birth
                  </span>

                  <input
                    name="place_of_birth"
                    maxlength="255"
                    value="${esc(
                      editing?.place_of_birth || ""
                    )}"
                    placeholder="Town, city or country"
                  >

                </label>

              </div>

            </div>


            <!-- DEATH INFORMATION -->

            <div class="form-section">

              <div class="form-section-title">
                Death information
              </div>

              <div class="grid2">

                <label class="field">

                  <span>
                    Date of death
                  </span>

                  <input
                    type="date"
                    name="date_of_death"
                    value="${esc(
                      editing?.date_of_death || ""
                    )}"
                  >

                </label>


                <label class="field">

                  <span>
                    Place of death
                  </span>

                  <input
                    name="place_of_death"
                    maxlength="255"
                    value="${esc(
                      editing?.place_of_death || ""
                    )}"
                    placeholder="Town, city or country"
                  >

                </label>

              </div>

            </div>


            <!-- PERSONAL INFORMATION -->

            <div class="form-section">

              <div class="form-section-title">
                Personal information
              </div>


              <label class="field">

                <span>
                  Occupation
                </span>

                <input
                  name="occupation"
                  maxlength="255"
                  value="${esc(
                    editing?.occupation || ""
                  )}"
                  placeholder="Profession or occupation"
                >

              </label>


              <label class="field">

                <span>
                  Biography
                </span>

                <textarea
                  name="biography"
                  rows="5"
                  placeholder="Write a short biography, memories, achievements or other important information about this family member..."
                >${esc(
                  editing?.biography || ""
                )}</textarea>

              </label>

            </div>


            <div class="form-actions">

              <button class="btn primary">

                ${
                  editing
                    ? "Save changes"
                    : "Create member"
                }

              </button>

              ${
                editing
                  ? `
                    <button
                      type="button"
                      class="btn light"
                      data-action="cancel-edit"
                    >
                      Cancel
                    </button>
                  `
                  : ""
              }

            </div>

          </form>

        </section>


        <!-- MEMBER DIRECTORY -->

        <section class="surface directory">

          <div class="toolbar">

            <div>

              <h3>
                Member registry
              </h3>

              <small>
                ${persons.length} shown
              </small>

            </div>


            <label class="search">

              ⌕

              <input
                id="member-search"
                value="${esc(state.search)}"
                placeholder="Search name, phone, occupation, email or ID…"
              >

            </label>

          </div>


          ${
            persons.length
              ? `
                <div class="table-wrap">

                  <table class="table">

                    <thead>

                      <tr>

                        <th>Member</th>

                        <th>Gender</th>

                        <th>Birth date</th>

                        <th>Occupation</th>

                        <th></th>

                      </tr>

                    </thead>


                    <tbody>

                      ${persons
                        .map(
                          (p) => `
                            <tr>

                              <td>

                                <button
                                  class="person-cell"
                                  data-person="${p.id}"
                                >

                                  <div class="avatar tiny">

                                    ${
                                      p.photo_url
                                        ? `
                                          <img
                                            src="${esc(
                                              imageUrl(
                                                p.photo_url
                                              )
                                            )}"
                                            alt=""
                                          >
                                        `
                                        : initials(p)
                                    }

                                  </div>


                                  <span>

                                    <strong>
                                      ${esc(
                                        fullName(p)
                                      )}
                                    </strong>

                                    <small>
                                      ${esc(
                                        p.email ||
                                          p.phone ||
                                          "No contact information"
                                      )}
                                    </small>

                                  </span>

                                </button>

                              </td>


                              <td>
                                ${esc(
                                  p.gender || "—"
                                )}
                              </td>


                              <td>
                                ${esc(
                                  formatDate(
                                    p.date_of_birth
                                  )
                                )}
                              </td>


                              <td>
                                ${esc(
                                  p.occupation || "—"
                                )}
                              </td>


                              <td>

                                <div class="row-actions">

                                  <button
                                    class="icon-btn"
                                    data-action="edit-person"
                                    data-id="${p.id}"
                                    title="Edit"
                                  >
                                    ✎
                                  </button>

                                  <button
                                    class="icon-btn danger"
                                    data-action="delete-person"
                                    data-id="${p.id}"
                                    title="Delete"
                                  >
                                    ⌫
                                  </button>

                                </div>

                              </td>

                            </tr>
                          `
                        )
                        .join("")}

                    </tbody>

                  </table>

                </div>
              `
              : emptyState(
                  "⌕",
                  "No matching members",
                  "Try another search or create a new record."
                )
          }

        </section>

      </div>

    </div>`;
}


/* =========================================================
   FAMILY TREE
   ========================================================= */

function renderTree() {
  return `
    <div class="page">

      <div class="tree-head">

        <div>

          <span class="eyebrow">
            VISUALIZATION
          </span>

          <h2>
            Interactive family tree
          </h2>

          <p>
            Click a member to open their profile.
            Drag to pan and use the controls to zoom.
          </p>

        </div>


        <div class="segmented">

          <button
            data-tree-dir="TB"
            class="${
              state.treeDirection === "TB"
                ? "active"
                : ""
            }"
          >
            Vertical
          </button>

          <button
            data-tree-dir="LR"
            class="${
              state.treeDirection === "LR"
                ? "active"
                : ""
            }"
          >
            Horizontal
          </button>

        </div>

      </div>


      <div
        class="tree-wrap"
        id="tree-wrap"
      >

        ${
          state.persons.length
            ? `
              <svg
                id="tree-svg"
                viewBox="0 0 1200 700"
                preserveAspectRatio="xMidYMid meet"
              ></svg>

              <div
                style="
                  position:absolute;
                  right:12px;
                  bottom:12px;
                  display:flex;
                  gap:5px
                "
              >

                <button
                  class="icon-btn"
                  data-tree-action="zoom-out"
                >
                  −
                </button>

                <button
                  class="icon-btn"
                  data-tree-action="fit"
                >
                  Fit
                </button>

                <button
                  class="icon-btn"
                  data-tree-action="zoom-in"
                >
                  +
                </button>

              </div>
            `
            : emptyState(
                "⌘",
                "Nothing to visualize yet",
                "Add family members and connect their relationships first.",
                "Add member",
                "persons"
              )
        }

      </div>

    </div>`;
}


/* =========================================================
   RELATIONSHIPS
   ========================================================= */

function renderRelationships() {
  return `
    <div class="page">

      <div class="page-title">

        <div>

          <span class="eyebrow">
            KINSHIP
          </span>

          <h2>
            Family connections
          </h2>

          <p>
            Define parentage and marriage records
            used by the visual tree.
          </p>

        </div>

      </div>


      <div class="two-col">

        <div class="form-stack">


          <section class="surface form-card">

            <div class="card-title">

              <div class="title-icon">
                ⌘
              </div>

              <div>

                <h3>
                  Parent & child
                </h3>

                <p>
                  Create a verified family connection.
                </p>

              </div>

            </div>


            <form
              id="parent-form"
              class="form"
            >

              ${selectField(
                "Parent",
                "parent_id"
              )}

              ${selectField(
                "Child",
                "child_id"
              )}

              <button class="btn primary">
                ↔ Link relationship
              </button>

            </form>

          </section>


          <section class="surface form-card">

            <div class="card-title">

              <div class="title-icon">
                ♥
              </div>

              <div>

                <h3>
                  Marriage record
                </h3>

                <p>
                  Record a spouse relationship and
                  optional date.
                </p>

              </div>

            </div>


            <form
              id="marriage-form"
              class="form"
            >

              ${selectField(
                "Spouse 1",
                "person1_id"
              )}

              ${selectField(
                "Spouse 2",
                "person2_id"
              )}

              <label class="field">

                <span>
                  Marriage date
                </span>

                <input
                  type="date"
                  name="marriage_date"
                >

              </label>

              <button class="btn primary">
                ♥ Save marriage
              </button>

            </form>

          </section>

        </div>


        <div class="records">


          <section class="surface records-card">

            <div class="toolbar">

              <div>

                <h3>
                  Parent links
                </h3>

                <small>
                  ${state.parents.length} records
                </small>

              </div>

            </div>


            ${
              state.parents.length
                ? `
                  <ul class="record-list">

                    ${state.parents
                      .map(
                        (r) => `
                          <li>

                            <div class="record-icon">
                              ⌘
                            </div>

                            <div>

                              <strong>
                                ${esc(
                                  fullName(
                                    personById(
                                      r.parent_id
                                    )
                                  )
                                )}
                              </strong>

                              <span>
                                Parent of
                                ${esc(
                                  fullName(
                                    personById(
                                      r.child_id
                                    )
                                  )
                                )}
                              </span>

                            </div>

                            <button
                              class="icon-btn danger"
                              data-action="delete-parent"
                              data-id="${r.id}"
                            >
                              ⌫
                            </button>

                          </li>
                        `
                      )
                      .join("")}

                  </ul>
                `
                : emptyState(
                    "⌘",
                    "No parent links",
                    "Create your first parent-child connection."
                  )
            }

          </section>


          <section class="surface records-card">

            <div class="toolbar">

              <div>

                <h3>
                  Marriage records
                </h3>

                <small>
                  ${state.marriages.length} records
                </small>

              </div>

            </div>


            ${
              state.marriages.length
                ? `
                  <ul class="record-list">

                    ${state.marriages
                      .map(
                        (r) => `
                          <li>

                            <div class="record-icon heart">
                              ♥
                            </div>

                            <div>

                              <strong>
                                ${esc(
                                  fullName(
                                    personById(
                                      r.person1_id
                                    )
                                  )
                                )}
                                &
                                ${esc(
                                  fullName(
                                    personById(
                                      r.person2_id
                                    )
                                  )
                                )}
                              </strong>

                              <span>
                                ${
                                  r.marriage_date
                                    ? `Married ${esc(
                                        formatDate(
                                          r.marriage_date
                                        )
                                      )}`
                                    : "Marriage date not recorded"
                                }
                              </span>

                            </div>

                            <button
                              class="icon-btn danger"
                              data-action="delete-marriage"
                              data-id="${r.id}"
                            >
                              ⌫
                            </button>

                          </li>
                        `
                      )
                      .join("")}

                  </ul>
                `
                : emptyState(
                    "♥",
                    "No marriages",
                    "Marriage records will appear here."
                  )
            }

          </section>

        </div>

      </div>

    </div>`;
}

function selectField(label, name) {
  return `
    <label class="field">

      <span>
        ${label}
      </span>

      <select
        name="${name}"
        required
      >

        <option value="">
          Select member
        </option>

        ${state.persons
          .map(
            (p) => `
              <option value="${p.id}">
                ${esc(fullName(p))}
              </option>
            `
          )
          .join("")}

      </select>

    </label>`;
}


/* =========================================================
   GALLERY
   ========================================================= */

function renderGallery() {
  const term = state.gallerySearch.trim().toLowerCase();

  const photos = state.photos.filter((p) => {
    const person = personById(p.person_id);

    const text = `
      ${p.title || ""}
      ${p.description || ""}
      ${p.original_filename || ""}
      ${person ? fullName(person) : ""}
    `.toLowerCase();

    const termMatch =
      !term || text.includes(term);

    const filterMatch =
      state.galleryFilter === "all" ||
      (state.galleryFilter === "tagged"
        ? !!p.person_id
        : !!p.is_profile);

    return termMatch && filterMatch;
  });

  return `
    <div class="page">

      <div class="page-title">

        <div>

          <span class="eyebrow">
            MEMORIES
          </span>

          <h2>
            Family photo archive
          </h2>

          <p>
            Upload, tag, view and manage the photographs
            that preserve your story.
          </p>

        </div>

        <span class="pill">
          ▧ ${state.photos.length} photos
        </span>

      </div>


      <section class="upload-card">

        <div class="upload-copy">

          <div class="upload-icon">
            ⇧
          </div>

          <div>

            <h3>
              Add a family memory
            </h3>

            <p>
              JPG, PNG, WEBP or GIF · maximum 10 MB
              per image.
            </p>

          </div>

        </div>


        <form
          id="gallery-form"
          class="upload-form"
        >

          <div
            class="dropzone ${
              state.galleryPreview
                ? "has-preview"
                : ""
            }"
            id="dropzone"
          >

            ${
              state.galleryPreview
                ? `
                  <img
                    src="${esc(
                      state.galleryPreview
                    )}"
                    alt="Upload preview"
                  >
                `
                : `
                  <strong>
                    ⇧ Choose a photo
                  </strong>

                  <small>
                    or drag and drop here
                  </small>
                `
            }

            <input
              id="gallery-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
            >

          </div>


          <div class="upload-fields">


            <label class="field">

              <span>
                Tag member (optional)
              </span>

              <select name="person_id">

                <option value="">
                  No member selected
                </option>

                ${state.persons
                  .map(
                    (p) => `
                      <option value="${p.id}">
                        ${esc(fullName(p))}
                      </option>
                    `
                  )
                  .join("")}

              </select>

            </label>


            <label class="field">

              <span>
                Title
              </span>

              <input
                name="title"
                placeholder="e.g. Grandpa's 70th birthday"
              >

            </label>


            <label class="field full">

              <span>
                Description
              </span>

              <textarea
                name="description"
                rows="2"
                placeholder="Add a little context…"
              ></textarea>

            </label>


            <button
              class="btn primary"
              ${state.galleryFile ? "" : "disabled"}
            >
              ⇧
              ${
                state.galleryFile
                  ? "Save to gallery"
                  : "Choose a photo first"
              }
            </button>

          </div>

        </form>

      </section>


      <div class="gallery-tools">

        <label class="search">

          ⌕

          <input
            id="gallery-search"
            value="${esc(
              state.gallerySearch
            )}"
            placeholder="Search your photo archive…"
          >

        </label>


        <div class="filters">

          <button
            class="${
              state.galleryFilter === "all"
                ? "active"
                : ""
            }"
            data-gallery-filter="all"
          >
            All
          </button>

          <button
            class="${
              state.galleryFilter === "tagged"
                ? "active"
                : ""
            }"
            data-gallery-filter="tagged"
          >
            Tagged
          </button>

          <button
            class="${
              state.galleryFilter === "profile"
                ? "active"
                : ""
            }"
            data-gallery-filter="profile"
          >
            Profile photos
          </button>

        </div>

      </div>


      ${
        photos.length
          ? `
            <div class="gallery-grid">

              ${photos
                .map((p) => {
                  const person = personById(
                    p.person_id
                  );

                  return `
                    <article class="gallery-card">

                      <button
                        class="gallery-img"
                        data-photo="${p.id}"
                      >

                        <img
                          src="${esc(
                            imageUrl(p.url)
                          )}"
                          alt="${esc(
                            p.title ||
                              "Family memory"
                          )}"
                          loading="lazy"
                        >

                        ${
                          p.is_profile
                            ? '<span class="profile-tag">Profile</span>'
                            : ""
                        }

                        <span class="overlay">
                          ⌕
                        </span>

                      </button>


                      <div class="gallery-meta">

                        <h3>
                          ${esc(
                            p.title ||
                              "Untitled memory"
                          )}
                        </h3>

                        <span>
                          ${esc(
                            person
                              ? `Tagged: ${fullName(
                                  person
                                )}`
                              : "Family archive"
                          )}
                        </span>


                        <div class="gallery-footer">

                          <small>
                            ${esc(
                              formatDate(
                                p.upload_date
                              )
                            )}
                          </small>

                          <button
                            class="icon-btn danger"
                            data-action="delete-photo"
                            data-id="${p.id}"
                          >
                            ⌫
                          </button>

                        </div>

                      </div>

                    </article>
                  `;
                })
                .join("")}

            </div>
          `
          : `
            <section class="surface">

              ${emptyState(
                "▧",
                state.photos.length
                  ? "No photos match your filter"
                  : "Your gallery is waiting",
                state.photos.length
                  ? "Try another search or filter."
                  : "Upload your first family photograph above.",
                state.photos.length
                  ? "Show all photos"
                  : "Choose a photo",
                state.photos.length
                  ? "gallery-all"
                  : "gallery-pick"
              )}

            </section>
          `
      }

    </div>`;
}


/* =========================================================
   PERSON PROFILE MODAL
   ========================================================= */

function renderPersonModal() {
  const p = state.selectedPerson;

  return `
    <div
      class="modal-backdrop"
      id="person-modal"
    >

      <section class="modal">

        <button
          class="close"
          data-action="close-person"
        >
          ✕
        </button>


        <div class="profile-hero">


          <div class="profile-avatar">

            ${
              p.photo_url
                ? `
                  <img
                    src="${esc(
                      imageUrl(p.photo_url)
                    )}"
                    alt="${esc(
                      fullName(p)
                    )}"
                  >
                `
                : initials(p)
            }

          </div>


          <div>

            <span class="eyebrow">
              FAMILY MEMBER #${p.id}
            </span>

            <h2>
              ${esc(fullName(p))}
            </h2>

            <p>
              ${esc(
                p.occupation ||
                  p.gender ||
                  "Family member"
              )}
            </p>

          </div>


          <button
            class="btn light profile-upload"
            data-action="profile-photo"
          >

            ◉ Change photo

            <input
              id="profile-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
            >

          </button>

        </div>


        <div class="profile-details">


          <div>

            <span>
              Gender
            </span>

            <strong>
              ${esc(
                p.gender ||
                  "Not recorded"
              )}
            </strong>

          </div>


          <div>

            <span>
              Date of birth
            </span>

            <strong>
              ${esc(
                formatDate(
                  p.date_of_birth
                )
              )}
            </strong>

          </div>


          <div>

            <span>
              Place of birth
            </span>

            <strong>
              ${esc(
                p.place_of_birth ||
                  "Not recorded"
              )}
            </strong>

          </div>


          <div>

            <span>
              Date of death
            </span>

            <strong>
              ${esc(
                formatDate(
                  p.date_of_death
                )
              )}
            </strong>

          </div>


          <div>

            <span>
              Place of death
            </span>

            <strong>
              ${esc(
                p.place_of_death ||
                  "Not recorded"
              )}
            </strong>

          </div>


          <div>

            <span>
              Phone
            </span>

            <strong>
              ${esc(
                p.phone ||
                  "Not recorded"
              )}
            </strong>

          </div>


          <div>

            <span>
              Email
            </span>

            <strong>
              ${esc(
                p.email ||
                  "Not recorded"
              )}
            </strong>

          </div>


          <div>

            <span>
              Occupation
            </span>

            <strong>
              ${esc(
                p.occupation ||
                  "Not recorded"
              )}
            </strong>

          </div>

        </div>


        ${
          p.biography
            ? `
              <div class="profile-biography">

                <span>
                  Biography
                </span>

                <p>
                  ${esc(p.biography)}
                </p>

              </div>
            `
            : ""
        }


        <div class="modal-actions">

          <button
            class="btn light"
            data-action="edit-selected"
          >
            ✎ Edit record
          </button>

          <button
            class="btn primary"
            data-action="view-tagged"
          >
            View tagged photos ›
          </button>

        </div>

      </section>

    </div>`;
}


function renderPhotoModal() {
  const p = state.selectedPhoto;

  return `
    <div
      class="lightbox"
      id="photo-modal"
    >

      <button
        class="close"
        data-action="close-photo"
      >
        ✕
      </button>


      <div class="lightbox-content">

        <img
          src="${esc(imageUrl(p.url))}"
          alt="${esc(
            p.title ||
              "Family memory"
          )}"
        >


        <div class="lightbox-caption">

          <div>

            <h2>
              ${esc(
                p.title ||
                  "Untitled memory"
              )}
            </h2>

            <p>
              ${esc(
                p.description || ""
              )}
            </p>

            <span>
              ${esc(
                p.person_name
                  ? `Tagged to ${p.person_name}`
                  : "Family archive"
              )}
              ·
              ${esc(
                formatDate(
                  p.upload_date
                )
              )}
            </span>

          </div>


          <button
            class="btn light danger-text"
            data-action="delete-photo"
            data-id="${p.id}"
          >
            ⌫ Delete
          </button>

        </div>

      </div>

    </div>`;
}


/* =========================================================
   EVENT BINDING
   ========================================================= */

function bindEvents() {

  document
    .querySelectorAll("[data-tab]")
    .forEach((button) => {

      button.addEventListener("click", () => {

        const tab = button.dataset.tab;

        if (tab === "gallery-all") {

          state.tab = "gallery";
          state.galleryFilter = "all";

        } else if (tab === "gallery-pick") {

          document
            .getElementById("gallery-file")
            ?.click();

          return;

        } else {

          state.tab = tab;

        }

        closeSidebar();

        render();

        if (tab === "tree") {
          requestAnimationFrame(drawTree);
        }

      });

    });


  document
    .querySelectorAll("[data-person]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          state.selectedPerson =
            personById(
              button.dataset.person
            );

          render();

        }
      );

    });


  document
    .querySelectorAll("[data-photo]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          state.selectedPhoto =
            state.photos.find(
              (p) =>
                p.id ===
                Number(
                  button.dataset.photo
                )
            );

          render();

        }
      );

    });


  document
    .querySelectorAll(
      "[data-gallery-filter]"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          state.galleryFilter =
            button.dataset.galleryFilter;

          render();

        }
      );

    });


  document
    .querySelectorAll("[data-tree-dir]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          state.treeDirection =
            button.dataset.treeDir;

          state.treeScale = 1;

          state.treePan = {
            x: 0,
            y: 0,
          };

          render();

          requestAnimationFrame(
            drawTree
          );

        }
      );

    });


  document
    .querySelectorAll("[data-action]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () =>
          handleAction(
            button.dataset.action,
            button
          )
      );

    });


  document
    .getElementById("member-search")
    ?.addEventListener(
      "input",
      (e) => {

        state.search =
          e.target.value;

        render();

        requestAnimationFrame(
          () => {

            const el =
              document.getElementById(
                "member-search"
              );

            el?.focus();

            el?.setSelectionRange(
              state.search.length,
              state.search.length
            );

          }
        );

      }
    );


  document
    .getElementById("gallery-search")
    ?.addEventListener(
      "input",
      (e) => {

        state.gallerySearch =
          e.target.value;

        render();

        requestAnimationFrame(
          () => {

            const el =
              document.getElementById(
                "gallery-search"
              );

            el?.focus();

            el?.setSelectionRange(
              state.gallerySearch.length,
              state.gallerySearch.length
            );

          }
        );

      }
    );


  document
    .getElementById("person-form")
    ?.addEventListener(
      "submit",
      savePerson
    );


  document
    .getElementById("parent-form")
    ?.addEventListener(
      "submit",
      saveParent
    );


  document
    .getElementById("marriage-form")
    ?.addEventListener(
      "submit",
      saveMarriage
    );


  document
    .getElementById("gallery-form")
    ?.addEventListener(
      "submit",
      saveGallery
    );


  const file =
    document.getElementById(
      "gallery-file"
    );

  if (file) {

    file.addEventListener(
      "change",
      (e) =>
        chooseGalleryFile(
          e.target.files?.[0]
        )
    );

  }


  const profileFile =
    document.getElementById(
      "profile-file"
    );

  if (profileFile) {

    profileFile.addEventListener(
      "change",
      (e) =>
        uploadProfilePhoto(
          e.target.files?.[0]
        )
    );

  }


  const dropzone =
    document.getElementById(
      "dropzone"
    );

  if (dropzone) {

    dropzone.addEventListener(
      "click",
      () => file?.click()
    );


    [
      "dragenter",
      "dragover",
    ].forEach((x) => {

      dropzone.addEventListener(
        x,
        (e) => {

          e.preventDefault();

          dropzone.classList.add(
            "has-preview"
          );

        }
      );

    });


    [
      "dragleave",
      "drop",
    ].forEach((x) => {

      dropzone.addEventListener(
        x,
        (e) => {

          e.preventDefault();

          if (x === "dragleave") {
            dropzone.classList.remove(
              "has-preview"
            );
          }

        }
      );

    });


    dropzone.addEventListener(
      "drop",
      (e) =>
        chooseGalleryFile(
          e.dataTransfer.files?.[0]
        )
    );

  }


  if (state.tab === "tree") {
    requestAnimationFrame(drawTree);
  }

  bindTreePanZoom();
}


/* =========================================================
   ACTION HANDLER
   ========================================================= */

async function handleAction(
  action,
  button
) {

  if (action === "dismiss-alert") {

    state.message = "";
    state.error = "";

    renderAlert();

    return;
  }


  if (action === "open-menu") {

    document
      .getElementById("sidebar")
      ?.classList.add("open");

    const b =
      document.getElementById(
        "mobile-backdrop"
      );

    if (b) {
      b.hidden = false;
    }

    return;
  }


  if (action === "sync") {

    await loadData(true);

    return;
  }


  if (action === "cancel-edit") {

    state.editingId = null;

    render();

    return;
  }


  if (action === "edit-person") {

    state.editingId =
      Number(button.dataset.id);

    render();

    return;
  }


  if (action === "delete-person") {

    await deletePerson(
      Number(button.dataset.id)
    );

    return;
  }


  if (action === "delete-parent") {

    await deleteParent(
      Number(button.dataset.id)
    );

    return;
  }


  if (action === "delete-marriage") {

    await deleteMarriage(
      Number(button.dataset.id)
    );

    return;
  }


  if (action === "delete-photo") {

    await deletePhoto(
      Number(button.dataset.id)
    );

    return;
  }


  if (action === "close-person") {

    state.selectedPerson = null;

    render();

    return;
  }


  if (action === "close-photo") {

    state.selectedPhoto = null;

    render();

    return;
  }


  if (action === "edit-selected") {

    state.editingId =
      state.selectedPerson.id;

    state.selectedPerson = null;

    state.tab = "persons";

    render();

    return;
  }


  if (action === "view-tagged") {

    const id =
      state.selectedPerson.id;

    state.selectedPerson = null;

    state.tab = "gallery";

    state.galleryFilter = "tagged";

    state.gallerySearch =
      fullName(
        personById(id)
      );

    render();

    return;
  }


  if (action === "profile-photo") {

    document
      .getElementById("profile-file")
      ?.click();

    return;
  }


  if (action === "zoom-in") {

    state.treeScale = Math.min(
      2.4,
      state.treeScale * 1.2
    );

    applyTreeTransform();

    return;
  }


  if (action === "zoom-out") {

    state.treeScale = Math.max(
      0.35,
      state.treeScale / 1.2
    );

    applyTreeTransform();

    return;
  }


  if (action === "fit") {

    state.treeScale = 1;

    state.treePan = {
      x: 0,
      y: 0,
    };

    applyTreeTransform();

    return;
  }


  if (action === "profile-file") {
    return;
  }
}


/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */

function closeSidebar() {

  document
    .getElementById("sidebar")
    ?.classList.remove("open");

  const b =
    document.getElementById(
      "mobile-backdrop"
    );

  if (b) {
    b.hidden = true;
  }
}

document.addEventListener(
  "click",
  (e) => {

    if (
      e.target.id ===
      "mobile-backdrop"
    ) {
      closeSidebar();
    }

  }
);


/* =========================================================
   SAVE PERSON
   ========================================================= */

async function savePerson(event) {

  event.preventDefault();

  const form =
    new FormData(event.target);


  const clean = (name) => {

    const value =
      form.get(name);

    return (
      String(value || "").trim() ||
      null
    );

  };


  const payload = {

    first_name:
      String(
        form.get("first_name") || ""
      ).trim(),

    last_name:
      String(
        form.get("last_name") || ""
      ).trim(),


    gender:
      clean("gender"),


    // Birth information
    date_of_birth:
      clean("date_of_birth"),

    place_of_birth:
      clean("place_of_birth"),


    // Death information
    date_of_death:
      clean("date_of_death"),

    place_of_death:
      clean("place_of_death"),


    // Personal information
    email:
      clean("email"),

    phone:
      clean("phone"),

    occupation:
      clean("occupation"),

    biography:
      clean("biography"),
  };


  if (
    !payload.first_name ||
    !payload.last_name
  ) {

    setError(
      "First name and last name are required."
    );

    return;
  }


  try {

    const editing =
      state.editingId !== null;


    await api(
      editing
        ? `/persons/${state.editingId}`
        : "/persons",
      {
        method:
          editing
            ? "PUT"
            : "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );


    state.editingId = null;


    setMessage(
      editing
        ? "Member record updated."
        : "New family member added."
    );


    await loadData(true);

  } catch (e) {

    setError(
      e.message
    );

    render();

  }
}


/* =========================================================
   DELETE PERSON
   ========================================================= */

async function deletePerson(id) {

  const p =
    personById(id);

  if (
    !p ||
    !confirm(
      `Delete ${fullName(
        p
      )}? Their relationships and tagged gallery records will also be removed.`
    )
  ) {
    return;
  }


  try {

    await api(
      `/persons/${id}`,
      {
        method: "DELETE",
      }
    );


    state.selectedPerson = null;


    setMessage(
      `${fullName(
        p
      )} was removed.`
    );


    await loadData(true);

  } catch (e) {

    setError(
      e.message
    );

    render();

  }
}


/* =========================================================
   SAVE PARENT
   ========================================================= */

async function saveParent(event) {

  event.preventDefault();

  const f =
    new FormData(event.target);


  const payload = {

    parent_id:
      Number(
        f.get("parent_id")
      ),

    child_id:
      Number(
        f.get("child_id")
      ),

  };


  if (
    !payload.parent_id ||
    !payload.child_id
  ) {

    setError(
      "Select both the parent and child."
    );

    return;
  }


  try {

    await api(
      "/relationships/parent",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );


    setMessage(
      "Parent-child relationship established."
    );


    await loadData(true);

  } catch (e) {

    setError(
      e.message
    );

    render();

  }
}


/* =========================================================
   DELETE PARENT
   ========================================================= */

async function deleteParent(id) {

  if (
    !confirm(
      "Remove this parent-child relationship?"
    )
  ) {
    return;
  }


  try {

    await api(
      `/relationships/parent/${id}`,
      {
        method: "DELETE",
      }
    );


    setMessage(
      "Parent-child relationship removed."
    );


    await loadData(true);

  } catch (e) {

    setError(
      e.message
    );

    render();

  }
}


/* =========================================================
   SAVE MARRIAGE
   ========================================================= */

async function saveMarriage(event) {

  event.preventDefault();

  const f =
    new FormData(event.target);


  const payload = {

    person1_id:
      Number(
        f.get("person1_id")
      ),

    person2_id:
      Number(
        f.get("person2_id")
      ),

    marriage_date:
      f.get("marriage_date") ||
      null,

  };


  if (
    !payload.person1_id ||
    !payload.person2_id
  ) {

    setError(
      "Select both spouses."
    );

    return;
  }


  try {

    await api(
      "/relationships/marriage",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );


    setMessage(
      "Marriage record saved."
    );


    await loadData(true);

  } catch (e) {

    setError(
      e.message
    );

    render();

  }
}


/* =========================================================
   DELETE MARRIAGE
   ========================================================= */

async function deleteMarriage(id) {

  if (
    !confirm(
      "Remove this marriage record?"
    )
  ) {
    return;
  }


  try {

    await api(
      `/relationships/marriage/${id}`,
      {
        method: "DELETE",
      }
    );


    setMessage(
      "Marriage record removed."
    );


    await loadData(true);

  } catch (e) {

    setError(
      e.message
    );

    render();

  }
}


/* =========================================================
   GALLERY FILE
   ========================================================= */

function chooseGalleryFile(file) {

  if (!file) {
    return;
  }


  if (!file.type.startsWith("image/")) {

    setError(
      "Please choose an image file."
    );

    return;
  }


  if (
    file.size >
    MAX_IMAGE_SIZE
  ) {

    setError(
      "Image is too large. Maximum size is 10 MB."
    );

    return;
  }


  if (state.galleryPreview) {

    URL.revokeObjectURL(
      state.galleryPreview
    );

  }


  state.galleryFile = file;

  state.galleryPreview =
    URL.createObjectURL(
      file
    );


  render();
}


/* =========================================================
   SAVE GALLERY
   ========================================================= */

async function saveGallery(event) {

  event.preventDefault();


  if (!state.galleryFile) {

    setError(
      "Choose a photo before uploading."
    );

    return;
  }


  const f =
    new FormData(event.target);

  const data =
    new FormData();


  data.append(
    "file",
    state.galleryFile
  );


  if (f.get("person_id")) {

    data.append(
      "person_id",
      f.get("person_id")
    );

  }


  if (
    String(
      f.get("title") || ""
    ).trim()
  ) {

    data.append(
      "title",
      String(
        f.get("title")
      ).trim()
    );

  }


  if (
    String(
      f.get("description") || ""
    ).trim()
  ) {

    data.append(
      "description",
      String(
        f.get("description")
      ).trim()
    );

  }


  try {

    await api(
      "/gallery/upload",
      {
        method: "POST",
        body: data,
      }
    );


    state.galleryFile =
      null;


    if (
      state.galleryPreview
    ) {

      URL.revokeObjectURL(
        state.galleryPreview
      );

    }


    state.galleryPreview =
      "";


    setMessage(
      "Photo added to the family archive."
    );


    await loadData(true);

  } catch (e) {

    setError(
      e.message
    );

    render();

  }
}


/* =========================================================
   PROFILE PHOTO
   ========================================================= */

async function uploadProfilePhoto(
  file
) {

  if (
    !file ||
    !state.selectedPerson
  ) {
    return;
  }


  if (
    !file.type.startsWith(
      "image/"
    )
  ) {

    setError(
      "Please choose an image file."
    );

    return;
  }


  if (
    file.size >
    MAX_IMAGE_SIZE
  ) {

    setError(
      "Image is too large. Maximum size is 10 MB."
    );

    return;
  }


  try {

    const data =
      new FormData();


    data.append(
      "file",
      file
    );


    await api(
      `/persons/${state.selectedPerson.id}/photo`,
      {
        method: "POST",
        body: data,
      }
    );


    setMessage(
      "Profile photo updated."
    );


    await loadData(true);

  } catch (e) {

    setError(
      e.message
    );

    render();

  }
}


/* =========================================================
   DELETE PHOTO
   ========================================================= */

async function deletePhoto(id) {

  const p =
    state.photos.find(
      (x) => x.id === id
    );


  if (
    !p ||
    !confirm(
      `Delete “${
        p.title ||
        p.original_filename ||
        "this photo"
      }” permanently?`
    )
  ) {
    return;
  }


  try {

    await api(
      `/gallery/${id}`,
      {
        method: "DELETE",
      }
    );


    if (
      state.selectedPhoto?.id === id
    ) {

      state.selectedPhoto =
        null;

    }


    setMessage(
      "Photo removed from the archive."
    );


    await loadData(true);

  } catch (e) {

    setError(
      e.message
    );

    render();

  }
}


/* =========================================================
   DRAW FAMILY TREE
   ========================================================= */

function drawTree() {

  const svg =
    document.getElementById(
      "tree-svg"
    );

  if (!svg) {
    return;
  }


  const width = 1400;

  const height = Math.max(
    720,
    Math.ceil(
      state.persons.length / 2
    ) * 180
  );


  svg.setAttribute(
    "viewBox",
    `0 0 ${width} ${height}`
  );


  const parentsByChild =
    new Map();


  state.parents.forEach(
    (r) => {

      if (
        !parentsByChild.has(
          r.child_id
        )
      ) {

        parentsByChild.set(
          r.child_id,
          []
        );

      }


      parentsByChild
        .get(r.child_id)
        .push(
          r.parent_id
        );

    }
  );


  const depth =
    new Map();

  const visiting =
    new Set();


  function getDepth(id) {

    if (
      depth.has(id)
    ) {
      return depth.get(id);
    }


    if (
      visiting.has(id)
    ) {
      return 0;
    }


    visiting.add(id);


    const ps =
      parentsByChild.get(id) ||
      [];


    const d =
      ps.length
        ? Math.min(
            8,
            Math.max(
              ...ps.map(
                getDepth
              )
            ) + 1
          )
        : 0;


    visiting.delete(id);

    depth.set(
      id,
      d
    );


    return d;
  }


  state.persons.forEach(
    (p) =>
      getDepth(p.id)
  );


  const levels = {};


  state.persons.forEach(
    (p) => {

      const d =
        depth.get(p.id) || 0;


      (levels[d] ??= []).push(
        p
      );

    }
  );


  const maxDepth =
    Math.max(
      0,
      ...Object.keys(
        levels
      ).map(Number)
    );


  const positions =
    new Map();


  const levelGap = 170;

  const gap = 250;


  Object.keys(levels).forEach(
    (d) => {

      const list =
        levels[d];

      list.forEach(
        (p, i) => {

          const total =
            (list.length - 1) *
            gap;


          const primary =
            (width - total) /
              2 +
            i * gap;


          const secondary =
            70 +
            Number(d) *
              levelGap;


          positions.set(
            p.id,
            state.treeDirection ===
              "TB"
              ? {
                  x: primary,
                  y: secondary,
                }
              : {
                  x: secondary,
                  y: primary,
                }
          );

        }
      );

    }
  );


  let markup =
    '<g id="tree-world">';


  /* Parent relationships */

  state.parents.forEach(
    (r) => {

      const a =
        positions.get(
          r.parent_id
        );

      const b =
        positions.get(
          r.child_id
        );


      if (!a || !b) {
        return;
      }


      const y1 =
        a.y + 52;

      const y2 =
        b.y - 52;


      markup +=
        state.treeDirection ===
        "TB"
          ? `
            <path
              class="edge-parent"
              d="
                M ${a.x} ${y1}
                C ${a.x} ${
                  y1 + 55
                },
                ${b.x} ${
                  y2 - 55
                },
                ${b.x} ${y2}
              "
            />
          `
          : `
            <path
              class="edge-parent"
              d="
                M ${a.x + 135} ${a.y}
                C ${a.x + 190} ${a.y},
                ${b.x - 190} ${b.y},
                ${b.x - 135} ${b.y}
              "
            />
          `;

    }
  );


  /* Marriage relationships */

  state.marriages.forEach(
    (r) => {

      const a =
        positions.get(
          r.person1_id
        );

      const b =
        positions.get(
          r.person2_id
        );


      if (!a || !b) {
        return;
      }


      markup +=
        state.treeDirection ===
        "TB"
          ? `
            <path
              class="edge-marriage"
              d="
                M ${a.x + 135} ${a.y}
                L ${b.x - 135} ${b.y}
              "
            />
          `
          : `
            <path
              class="edge-marriage"
              d="
                M ${a.x} ${a.y + 52}
                L ${b.x} ${b.y - 52}
              "
            />
          `;

    }
  );


  /* Person cards */

  state.persons.forEach(
    (p) => {

      const pos =
        positions.get(
          p.id
        );


      if (!pos) {
        return;
      }


      const x =
        pos.x - 135;

      const y =
        pos.y - 52;


      const photo =
        photoForPerson(
          p.id
        );


      const occupation =
        p.occupation ||
        p.gender ||
        "Family member";


      markup += `
        <g
          class="tree-card"
          data-tree-person="${p.id}"
          transform="
            translate(${x},${y})
          "
        >

          <rect
            width="270"
            height="104"
            rx="15"
          />

          <circle
            cx="50"
            cy="52"
            r="30"
          />

          ${
            photo
              ? `
                <clipPath
                  id="clip-${p.id}"
                >
                  <circle
                    cx="50"
                    cy="52"
                    r="28"
                  />
                </clipPath>

                <image
                  href="${esc(
                    imageUrl(photo)
                  )}"
                  x="22"
                  y="24"
                  width="56"
                  height="56"
                  preserveAspectRatio="xMidYMid slice"
                  clip-path="url(#clip-${p.id})"
                />
              `
              : `
                <text
                  class="initials"
                  x="50"
                  y="56"
                  text-anchor="middle"
                >
                  ${esc(
                    initials(p)
                  )}
                </text>
              `
          }


          <text
            class="name"
            x="92"
            y="40"
          >
            ${esc(
              fullName(
                p
              ).slice(
                0,
                25
              )
            )}
          </text>


          <text
            class="meta"
            x="92"
            y="58"
          >
            ${esc(
              occupation.slice(
                0,
                25
              )
            )}
          </text>


          <text
            class="meta"
            x="92"
            y="76"
          >
            ${
              p.date_of_birth
                ? `Born ${esc(
                    formatDate(
                      p.date_of_birth
                    )
                  )}`
                : "Birth date not recorded"
            }
          </text>

        </g>`;
    }
  );


  markup +=
    "</g>";


  svg.innerHTML =
    markup;


  svg
    .querySelectorAll(
      "[data-tree-person]"
    )
    .forEach(
      (n) =>
        n.addEventListener(
          "click",
          () => {

            state.selectedPerson =
              personById(
                n.dataset
                  .treePerson
              );

            render();

          }
        )
    );


  applyTreeTransform();
}


/* =========================================================
   TREE TRANSFORM
   ========================================================= */

function applyTreeTransform() {

  const world =
    document.getElementById(
      "tree-world"
    );

  if (!world) {
    return;
  }


  world.setAttribute(
    "transform",
    `translate(
      ${state.treePan.x}
      ${state.treePan.y}
    )
    scale(
      ${state.treeScale}
    )`
  );
}


/* =========================================================
   TREE PAN / ZOOM
   ========================================================= */

function bindTreePanZoom() {

  const svg =
    document.getElementById(
      "tree-svg"
    );

  if (!svg) {
    return;
  }


  svg.addEventListener(
    "wheel",
    (e) => {

      e.preventDefault();


      state.treeScale =
        Math.max(
          0.35,
          Math.min(
            2.4,
            state.treeScale *
              (e.deltaY < 0
                ? 1.1
                : 0.9)
          )
        );


      applyTreeTransform();

    },
    {
      passive: false,
    }
  );


  svg.addEventListener(
    "pointerdown",
    (e) => {

      if (
        e.target.closest(
          ".tree-card"
        )
      ) {
        return;
      }


      state.treeDragging =
        true;


      state.treeDragStart = {
        x:
          e.clientX -
          state.treePan.x,

        y:
          e.clientY -
          state.treePan.y,
      };


      svg.setPointerCapture(
        e.pointerId
      );

    }
  );


  svg.addEventListener(
    "pointermove",
    (e) => {

      if (
        !state.treeDragging
      ) {
        return;
      }


      state.treePan = {

        x:
          e.clientX -
          state.treeDragStart.x,

        y:
          e.clientY -
          state.treeDragStart.y,

      };


      applyTreeTransform();

    }
  );


  svg.addEventListener(
    "pointerup",
    () => {

      state.treeDragging =
        false;

    }
  );

  svg.addEventListener(
    "pointercancel",
    () => {

      state.treeDragging =
        false;

    }
  );
}


/* =========================================================
   APPLICATION START
   ========================================================= */

(async function init() {

  await loadData();

})();
