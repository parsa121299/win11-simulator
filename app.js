"use strict";

/* ==========================================
   LIKO DESKTOP — ULTIMATE SIMULATOR
   Standalone browser implementation
========================================== */

const $ = (selector, root = document) =>
    root.querySelector(selector);

const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];


/* ---------- APP DEFINITIONS ---------- */

const APPS = {
    thispc: {
        title: "This PC",
        icon: "fa-solid fa-computer",
        color: "#3987e7"
    },

    explorer: {
        title: "File Explorer",
        icon: "fa-solid fa-folder",
        color: "#e8b74d"
    },

    browser: {
        title: "Browser",
        icon: "fa-brands fa-edge",
        color: "#319be9"
    },

    notepad: {
        title: "Notepad",
        icon: "fa-solid fa-file-lines",
        color: "#4696ec"
    },

    calculator: {
        title: "Calculator",
        icon: "fa-solid fa-calculator",
        color: "#4485df"
    },

    settings: {
        title: "Settings",
        icon: "fa-solid fa-gear",
        color: "#6f7f98"
    },

    photos: {
        title: "Photos",
        icon: "fa-solid fa-images",
        color: "#9c75e8"
    },

    store: {
        title: "Microsoft Store",
        icon: "fa-brands fa-microsoft",
        color: "#4388e9"
    },

    recycle: {
        title: "Recycle Bin",
        icon: "fa-solid fa-trash-can",
        color: "#7996bb"
    },

    terminal: {
        title: "Terminal",
        icon: "fa-solid fa-terminal",
        color: "#25344a"
    },

    about: {
        title: "About LIKO",
        icon: "fa-solid fa-circle-info",
        color: "#4388e9"
    }
};

const PINNED_APPS = [
    "browser",
    "explorer",
    "settings",
    "notepad",
    "calculator",
    "photos",
    "store",
    "thispc",
    "recycle",
    "terminal",
    "about"
];


/* ---------- DOM ---------- */

const desktop = $("#desktop");
const windowsArea = $("#windowsArea");

const startMenu = $("#startMenu");
const startButton = $("#startButton");
const startSearch = $("#startSearch");
const pinnedApps = $("#pinnedApps");

const searchPanel = $("#searchPanel");
const globalSearch = $("#globalSearch");
const searchResults = $("#searchResults");

const quickPanel = $("#quickPanel");
const contextMenu = $("#contextMenu");

const taskbarApps = $("#taskbarApps");

let zIndex = 100;
let windowCounter = 0;
let activeWindowId = null;
let contextTargetApp = null;

const openWindows = new Map();

const STORAGE_PREFIX = "liko-desktop-v1-";


/* ---------- SAFE STORAGE ---------- */

function readStorage(key, fallback = "") {
    try {
        const value = localStorage.getItem(STORAGE_PREFIX + key);
        return value === null ? fallback : value;
    } catch {
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, value);
        return true;
    } catch {
        toast("ذخیره‌سازی مرورگر در دسترس نیست.");
        return false;
    }
}


/* ---------- TOAST ---------- */

let toastTimer = null;

function toast(message) {
    const box = $("#toast");
    const text = $("#toastText");

    if (!box || !text) return;

    text.textContent = message;

    box.classList.remove("hidden");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        box.classList.add("hidden");
    }, 2600);
}


/* ---------- START MENU ---------- */

function renderPinnedApps(filter = "") {
    pinnedApps.innerHTML = "";

    const term = filter.trim().toLowerCase();

    PINNED_APPS
        .filter(id => {
            const app = APPS[id];

            return app &&
                (
                    app.title.toLowerCase().includes(term) ||
                    id.toLowerCase().includes(term)
                );
        })
        .forEach(id => {
            const app = APPS[id];

            const button = document.createElement("button");

            button.className = "pinned-app";
            button.dataset.app = id;

            button.innerHTML = `
                <i class="${app.icon}" style="color:${app.color}"></i>
                <span></span>
            `;

            $("span", button).textContent = app.title;

            button.addEventListener("click", () => {
                openApp(id);
                closePanels();
            });

            pinnedApps.appendChild(button);
        });

    if (!pinnedApps.children.length) {
        const message = document.createElement("div");

        message.style.gridColumn = "1 / -1";
        message.style.padding = "20px";
        message.style.textAlign = "center";
        message.style.color = "#78859a";
        message.textContent = "برنامه‌ای پیدا نشد.";

        pinnedApps.appendChild(message);
    }
}

function toggleStart() {
    const opening = startMenu.classList.contains("hidden");

    closePanels();

    if (opening) {
        startMenu.classList.remove("hidden");
        startSearch.value = "";
        renderPinnedApps();
        startSearch.focus();
    }
}

startButton.addEventListener("click", event => {
    event.stopPropagation();
    toggleStart();
});

startSearch.addEventListener("input", () => {
    renderPinnedApps(startSearch.value);
});

$("#allAppsButton").addEventListener("click", () => {
    renderPinnedApps("");
    startSearch.focus();
});

$("#powerButton").addEventListener("click", () => {
    toast("این یک شبیه‌ساز وب است؛ خاموش‌کردن واقعی دستگاه انجام نمی‌شود.");
});


/* ---------- PANELS ---------- */

function closePanels() {
    startMenu.classList.add("hidden");
    searchPanel.classList.add("hidden");
    quickPanel.classList.add("hidden");
    contextMenu.classList.add("hidden");
}

function togglePanel(panel) {
    const shouldOpen = panel.classList.contains("hidden");

    closePanels();

    if (shouldOpen) {
        panel.classList.remove("hidden");
    }
}

$("#taskbarSearchButton").addEventListener("click", () => {
    togglePanel(searchPanel);

    if (!searchPanel.classList.contains("hidden")) {
        globalSearch.focus();
        renderSearchResults("");
    }
});

globalSearch.addEventListener("input", () => {
    renderSearchResults(globalSearch.value);
});

function renderSearchResults(query) {
    searchResults.innerHTML = "";

    const term = query.trim().toLowerCase();

    const matches = Object.entries(APPS).filter(([id, app]) => {
        return !term ||
            app.title.toLowerCase().includes(term) ||
            id.toLowerCase().includes(term);
    });

    matches.forEach(([id, app]) => {
        const button = document.createElement("button");

        button.className = "search-result";

        button.innerHTML = `
            <i class="${app.icon}" style="color:${app.color}"></i>
            <span></span>
        `;

        $("span", button).textContent = app.title;

        button.addEventListener("click", () => {
            openApp(id);
            closePanels();
        });

        searchResults.appendChild(button);
    });
}

$("#quickSettingsButton").addEventListener("click", event => {
    event.stopPropagation();
    togglePanel(quickPanel);
});


/* ---------- QUICK SETTINGS ---------- */

$$(".quick-tile").forEach(button => {
    button.addEventListener("click", () => {
        const action = button.dataset.action;

        button.classList.toggle("active");

        if (action === "night") {
            document.body.classList.toggle("dark-mode");
            toast(
                document.body.classList.contains("dark-mode")
                    ? "حالت تاریک فعال شد."
                    : "حالت روشن فعال شد."
            );
            return;
        }

        const enabled = button.classList.contains("active");

        const names = {
            wifi: "Wi-Fi نمایشی",
            bluetooth: "Bluetooth نمایشی",
            focus: "حالت Focus"
        };

        toast(`${names[action] || action}: ${enabled ? "روشن" : "خاموش"}`);
    });
});

$("#brightnessSlider").addEventListener("input", event => {
    const value = Number(event.target.value);

    desktop.style.filter = `brightness(${value / 100})`;
});


/* ---------- CLOCK ---------- */

function updateClock() {
    const now = new Date();

    $("#clockTime").textContent = now.toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    $("#clockDate").textContent = now.toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}

updateClock();
setInterval(updateClock, 1000);


/* ---------- WINDOW MANAGER ---------- */

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function focusWindow(id) {
    const record = openWindows.get(id);

    if (!record) return;

    activeWindowId = id;

    record.window.classList.remove("minimized");
    record.window.style.zIndex = ++zIndex;

    $$(".taskbar-app-button").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.windowId === id
        );
    });
}

function renderTaskbarApps() {
    taskbarApps.innerHTML = "";

    for (const [id, record] of openWindows) {
        const button = createElement("button", "taskbar-app-button");

        button.dataset.windowId = id;
        button.title = record.title;

        const icon = createElement("i", record.icon);

        button.appendChild(icon);

        if (record.window.classList.contains("minimized")) {
            button.classList.remove("active");
        }

        button.addEventListener("click", () => {
            if (
                activeWindowId === id &&
                !record.window.classList.contains("minimized")
            ) {
                record.window.classList.add("minimized");
                activeWindowId = null;
                button.classList.remove("active");
            } else {
                focusWindow(id);
            }
        });

        taskbarApps.appendChild(button);
    }
}

function minimizeWindow(id) {
    const record = openWindows.get(id);

    if (!record) return;

    record.window.classList.add("minimized");

    if (activeWindowId === id) {
        activeWindowId = null;
    }

    renderTaskbarApps();
}

function maximizeWindow(id) {
    const record = openWindows.get(id);

    if (!record) return;

    const win = record.window;

    if (win.classList.contains("maximized")) {
        win.classList.remove("maximized");

        if (record.previousRect) {
            win.style.left = record.previousRect.left;
            win.style.top = record.previousRect.top;
            win.style.width = record.previousRect.width;
            win.style.height = record.previousRect.height;
            win.style.transform = record.previousRect.transform;
        }
    } else {
        record.previousRect = {
            left: win.style.left,
            top: win.style.top,
            width: win.style.width,
            height: win.style.height,
            transform: win.style.transform
        };

        win.classList.add("maximized");
    }

    focusWindow(id);
}

function closeWindow(id) {
    const record = openWindows.get(id);

    if (!record) return;

    record.window.remove();
    openWindows.delete(id);

    if (activeWindowId === id) {
        activeWindowId = null;
    }

    renderTaskbarApps();
}

function setupDragging(record) {
    const bar = record.titlebar;
    const win = record.window;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    bar.addEventListener("pointerdown", event => {
        if (event.target.closest(".window-controls")) return;

        focusWindow(record.id);

        if (win.classList.contains("maximized")) return;

        dragging = true;

        startX = event.clientX;
        startY = event.clientY;

        const rect = win.getBoundingClientRect();

        initialLeft = rect.left;
        initialTop = rect.top;

        win.style.left = `${rect.left}px`;
        win.style.top = `${rect.top}px`;
        win.style.transform = "none";

        try {
            bar.setPointerCapture(event.pointerId);
        } catch {}

        event.preventDefault();
    });

    bar.addEventListener("pointermove", event => {
        if (!dragging) return;

        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        const maxLeft = Math.max(0, window.innerWidth - win.offsetWidth);
        const maxTop = Math.max(
            0,
            window.innerHeight - win.offsetHeight - 48
        );

        const left = Math.min(
            maxLeft,
            Math.max(0, initialLeft + dx)
        );

        const top = Math.min(
            maxTop,
            Math.max(0, initialTop + dy)
        );

        win.style.left = `${left}px`;
        win.style.top = `${top}px`;
    });

    const stopDragging = () => {
        dragging = false;
    };

    bar.addEventListener("pointerup", stopDragging);
    bar.addEventListener("pointercancel", stopDragging);

    bar.addEventListener("dblclick", event => {
        if (event.target.closest(".window-controls")) return;
        maximizeWindow(record.id);
    });
}

function openApp(appId) {
    const app = APPS[appId];

    if (!app) return;

    closePanels();

    // If the app is already open, bring it forward.
    for (const [id, record] of openWindows) {
        if (record.appId === appId) {
            focusWindow(id);
            return;
        }
    }

    const id = `window-${++windowCounter}`;

    const win = createElement("section", "app-window");

    win.dataset.appId = appId;
    win.style.zIndex = ++zIndex;

    const titlebar = createElement("header", "window-titlebar");

    const appIcon = createElement("div", "window-app-icon");
    appIcon.innerHTML = `<i class="${app.icon}" style="color:${app.color}"></i>`;

    const title = createElement("div", "window-title", app.title);

    const controls = createElement("div", "window-controls");

    const minimize = createElement("button", "window-control");
    minimize.title = "Minimize";
    minimize.innerHTML = '<i class="fa-solid fa-minus"></i>';

    const maximize = createElement("button", "window-control");
    maximize.title = "Maximize / Restore";
    maximize.innerHTML = '<i class="fa-regular fa-square"></i>';

    const close = createElement("button", "window-control close");
    close.title = "Close";
    close.innerHTML = '<i class="fa-solid fa-xmark"></i>';

    controls.append(minimize, maximize, close);
    titlebar.append(appIcon, title, controls);

    const body = createElement("div", "window-body");

    win.append(titlebar, body);
    windowsArea.appendChild(win);

    const record = {
        id,
        appId,
        title: app.title,
        icon: app.icon,
        window: win,
        titlebar,
        body,
        previousRect: null
    };

    openWindows.set(id, record);

    minimize.addEventListener("click", event => {
        event.stopPropagation();
        minimizeWindow(id);
    });

    maximize.addEventListener("click", event => {
        event.stopPropagation();
        maximizeWindow(id);
    });

    close.addEventListener("click", event => {
        event.stopPropagation();
        closeWindow(id);
    });

    win.addEventListener("pointerdown", () => focusWindow(id));

    win.addEventListener("contextmenu", event => {
        event.preventDefault();
        showContextMenu(event.clientX, event.clientY, appId);
    });

    setupDragging(record);

    renderApp(appId, body, record);
    focusWindow(id);
    renderTaskbarApps();
}


/* ---------- APP RENDERER ---------- */

function renderApp(appId, body, record) {
    switch (appId) {
        case "thispc":
            renderThisPC(body);
            break;

        case "explorer":
            renderExplorer(body);
            break;

        case "browser":
            renderBrowser(body);
            break;

        case "notepad":
            renderNotepad(body);
            break;

        case "calculator":
            renderCalculator(body);
            break;

        case "settings":
            renderSettings(body);
            break;

        case "photos":
            renderPhotos(body);
            break;

        case "store":
            renderStore(body);
            break;

        case "recycle":
            renderRecycle(body);
            break;

        case "terminal":
            renderTerminal(body);
            break;

        case "about":
            renderAbout(body);
            break;

        default:
            body.innerHTML = `
                <div class="empty-app">
                    <i class="${APPS[appId]?.icon || "fa-solid fa-window-maximize"}"></i>
                    <h2>برنامه آماده نیست</h2>
                    <p>این بخش در نسخه‌های بعدی توسعه پیدا می‌کند.</p>
                </div>
            `;
    }
}


/* ---------- FILE EXPLORER ---------- */

function renderExplorer(body) {
    body.innerHTML = `
        <div class="app-toolbar">
            <button class="app-action" data-nav="back">
                <i class="fa-solid fa-arrow-left"></i>
            </button>

            <button class="app-action" data-nav="forward">
                <i class="fa-solid fa-arrow-right"></i>
            </button>

            <input id="explorerPath" value="Home" readonly>

            <button class="app-action" id="explorerRefresh">
                <i class="fa-solid fa-rotate-right"></i>
            </button>
        </div>

        <div class="explorer-layout">
            <aside class="explorer-sidebar">
                <button class="explorer-nav active" data-folder="Home">
                    <i class="fa-solid fa-house"></i> Home
                </button>

                <button class="explorer-nav" data-folder="Desktop">
                    <i class="fa-solid fa-desktop"></i> Desktop
                </button>

                <button class="explorer-nav" data-folder="Documents">
                    <i class="fa-solid fa-file-lines"></i> Documents
                </button>

                <button class="explorer-nav" data-folder="Pictures">
                    <i class="fa-solid fa-image"></i> Pictures
                </button>

                <button class="explorer-nav" data-folder="Downloads">
                    <i class="fa-solid fa-download"></i> Downloads
                </button>

                <button class="explorer-nav" data-folder="This PC">
                    <i class="fa-solid fa-computer"></i> This PC
                </button>
            </aside>

            <div class="explorer-content">
                <div class="explorer-heading" id="explorerHeading">Home</div>
                <div class="file-grid" id="fileGrid"></div>
            </div>
        </div>
    `;

    const fileGrid = $("#fileGrid", body);
    const path = $("#explorerPath", body);
    const heading = $("#explorerHeading", body);

    const files = {
        Home: [
            ["Desktop", "fa-solid fa-desktop", "folder"],
            ["Documents", "fa-solid fa-folder", "folder"],
            ["Pictures", "fa-solid fa-images", "folder"],
            ["Downloads", "fa-solid fa-download", "folder"],
            ["Readme.txt", "fa-solid fa-file-lines", "text"],
            ["Welcome.txt", "fa-solid fa-file-lines", "text"]
        ],

        Desktop: [
            ["Welcome.txt", "fa-solid fa-file-lines", "text"],
            ["Projects", "fa-solid fa-folder", "folder"],
            ["Screenshots", "fa-solid fa-images", "folder"]
        ],

        Documents: [
            ["Welcome.txt", "fa-solid fa-file-lines", "text"],
            ["Ideas.txt", "fa-solid fa-file-lines", "text"],
            ["Projects", "fa-solid fa-folder", "folder"]
        ],

        Pictures: [
            ["Bloom Wallpaper", "fa-solid fa-image", "photos"],
            ["Photos", "fa-solid fa-folder", "folder"]
        ],

        Downloads: [
            ["No downloads yet", "fa-solid fa-download", "info"]
        ],

        "This PC": [
            ["Local Disk (C:)", "fa-solid fa-hard-drive", "drive"],
            ["Documents", "fa-solid fa-folder", "folder"],
            ["Pictures", "fa-solid fa-images", "folder"]
        ]
    };

    function showFolder(name) {
        path.value = name;
        heading.textContent = name;
        fileGrid.innerHTML = "";

        $$(".explorer-nav", body).forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.folder === name
            );
        });

        (files[name] || files.Home).forEach(([label, icon, type]) => {
            const button = createElement("button", "file-item");

            button.innerHTML = `<i class="${icon}"></i><span></span>`;
            $("span", button).textContent = label;

            button.addEventListener("click", () => {
                if (type === "folder") {
                    showFolder(label in files ? label : "Home");
                } else if (type === "text") {
                    openApp("notepad");
                } else if (type === "photos") {
                    openApp("photos");
                } else if (type === "drive") {
                    toast("درایو نمایشی است؛ فایل‌های واقعی دستگاه را نشان نمی‌دهد.");
                } else {
                    toast(label);
                }
            });

            fileGrid.appendChild(button);
        });
    }

    $$(".explorer-nav", body).forEach(button => {
        button.addEventListener("click", () => {
            showFolder(button.dataset.folder);
        });
    });

    $("#explorerRefresh", body).addEventListener("click", () => {
        showFolder(path.value);
        toast("نمایش پوشه تازه شد.");
    });

    $$("[data-nav]", body).forEach(button => {
        button.addEventListener("click", () => {
            showFolder("Home");
        });
    });

    showFolder("Home");
}


/* ---------- THIS PC ---------- */

function renderThisPC(body) {
    body.innerHTML = `
        <div class="pc-overview">

            <div class="pc-hero">
                <i class="fa-solid fa-computer"></i>
                <div>
                    <h2>This PC</h2>
                    <p>LIKO Desktop Simulator</p>
                </div>
            </div>

            <h3>Folders</h3>

            <div class="drive-card">
                <i class="fa-solid fa-folder"></i>
                <div class="drive-info">
                    <strong>Documents</strong>
                    <small>پوشهٔ نمایشی اسناد</small>
                </div>
                <button class="app-action" data-open="explorer">Open</button>
            </div>

            <div class="drive-card">
                <i class="fa-solid fa-images"></i>
                <div class="drive-info">
                    <strong>Pictures</strong>
                    <small>تصاویر نمونهٔ شبیه‌ساز</small>
                </div>
                <button class="app-action" data-open="photos">Open</button>
            </div>

            <h3>Devices and drives</h3>

            <div class="drive-card">
                <i class="fa-solid fa-hard-drive"></i>
                <div class="drive-info">
                    <strong>Local Disk (C:)</strong>
                    <small>درایو نمایشی — دسترسی به فایل‌های واقعی ندارد</small>
                </div>
            </div>

        </div>
    `;

    $$("[data-open]", body).forEach(button => {
        button.addEventListener("click", () => {
            openApp(button.dataset.open);
        });
    });
}


/* ---------- NOTEPAD ---------- */

function renderNotepad(body) {
    body.innerHTML = `
        <div class="notepad-app">

            <div class="notepad-toolbar">
                <button class="app-action" id="noteSave">
                    <i class="fa-solid fa-floppy-disk"></i> ذخیره
                </button>

                <button class="app-action" id="noteDownload">
                    <i class="fa-solid fa-download"></i> دانلود
                </button>

                <button class="app-action" id="noteClear">
                    <i class="fa-solid fa-trash"></i> پاک‌کردن
                </button>
            </div>

            <textarea
                class="notepad-editor"
                id="noteEditor"
                spellcheck="false"
                placeholder="اینجا بنویس..."></textarea>

            <div class="notepad-status" id="noteStatus">
                آماده | ذخیره‌سازی محلی
            </div>

        </div>
    `;

    const editor = $("#noteEditor", body);
    const status = $("#noteStatus", body);

    editor.value = readStorage("notepad", "");

    editor.addEventListener("input", () => {
        status.textContent = `${editor.value.length} characters`;
    });

    $("#noteSave", body).addEventListener("click", () => {
        const saved = writeStorage("notepad", editor.value);

        if (saved) {
            status.textContent = "ذخیره شد.";
            toast("متن در حافظهٔ مرورگر ذخیره شد.");
        }
    });

    $("#noteClear", body).addEventListener("click", () => {
        editor.value = "";
        status.textContent = "سند پاک شد.";
        editor.focus();
    });

    $("#noteDownload", body).addEventListener("click", () => {
        downloadText("LIKO-Note.txt", editor.value);
        toast("دانلود سند آغاز شد.");
    });
}

function downloadText(filename, text) {
    const blob = new Blob([text], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}


/* ---------- CALCULATOR ---------- */

function renderCalculator(body) {
    body.innerHTML = `
        <div class="calculator">

            <div class="calculator-display">
                <div class="calculator-expression" id="calcExpression"></div>
                <div class="calculator-result" id="calcResult">0</div>
            </div>

            <div class="calculator-grid" id="calcGrid"></div>

        </div>
    `;

    const grid = $("#calcGrid", body);

    const keys = [
        ["AC", "operator"], ["±", "operator"], ["%", "operator"], ["÷", "operator"],
        ["7", ""], ["8", ""], ["9", ""], ["×", "operator"],
        ["4", ""], ["5", ""], ["6", ""], ["−", "operator"],
        ["1", ""], ["2", ""], ["3", ""], ["+", "operator"],
        ["0", ""], [".", ""], ["⌫", "operator"], ["=", "equals"]
    ];

    let current = "0";
    let previous = null;
    let operation = null;
    let resetNext = false;

    const result = $("#calcResult", body);
    const expression = $("#calcExpression", body);

    function update() {
        result.textContent = current;
    }

    function calculate(a, b, op) {
        switch (op) {
            case "+": return a + b;
            case "−": return a - b;
            case "×": return a * b;
            case "÷":
                if (b === 0) throw new Error("تقسیم بر صفر مجاز نیست.");
                return a / b;
            default: return b;
        }
    }

    function press(key) {
        if (key === "AC") {
            current = "0";
            previous = null;
            operation = null;
            expression.textContent = "";
            resetNext = false;
            update();
            return;
        }

        if (key === "⌫") {
            current = current.length > 1 ? current.slice(0, -1) : "0";
            update();
            return;
        }

        if (key === "±") {
            current = String(Number(current) * -1);
            update();
            return;
        }

        if (key === "%") {
            current = String(Number(current) / 100);
            update();
            return;
        }

        if (["+", "−", "×", "÷"].includes(key)) {
            previous = Number(current);
            operation = key;
            expression.textContent = `${current} ${key}`;
            resetNext = true;
            return;
        }

        if (key === "=") {
            if (operation === null || previous === null) return;

            try {
                const answer = calculate(
                    previous,
                    Number(current),
                    operation
                );

                current = String(
                    Number.isFinite(answer)
                        ? Number(answer.toPrecision(12))
                        : "Error"
                );

                expression.textContent =
                    `${previous} ${operation} ${result.textContent} =`;

                previous = null;
                operation = null;
                resetNext = true;

                update();
            } catch (error) {
                current = "Error";
                update();
                toast(error.message);
            }

            return;
        }

        if (key === ".") {
            if (resetNext) {
                current = "0";
                resetNext = false;
            }

            if (!current.includes(".")) current += ".";
            update();
            return;
        }

        if (/^\d$/.test(key)) {
            if (resetNext || current === "0" || current === "Error") {
                current = key;
                resetNext = false;
            } else if (current.length < 16) {
                current += key;
            }

            update();
        }
    }

    keys.forEach(([key, type]) => {
        const button = createElement(
            "button",
            `calc-button ${type}`
        );

        button.textContent = key;

        button.addEventListener("click", () => press(key));

        grid.appendChild(button);
    });
}


/* ---------- BROWSER ---------- */

function renderBrowser(body) {
    body.innerHTML = `
        <div class="app-toolbar">
            <button class="app-action" id="browserBack" title="Back">
                <i class="fa-solid fa-arrow-left"></i>
            </button>

            <button class="app-action" id="browserReload" title="Reload">
                <i class="fa-solid fa-rotate-right"></i>
            </button>

            <input id="browserAddress"
                   value="https://www.bing.com"
                   aria-label="Address">

            <button class="app-action app-primary" id="browserGo">
                Go
            </button>
        </div>

        <div class="browser-home">

            <div class="browser-logo">
                <i class="fa-brands fa-edge"></i>
            </div>

            <h2>LIKO Browser</h2>
            <p>جست‌وجو کن یا یکی از سایت‌ها را باز کن.</p>

            <form class="browser-search" id="browserSearch">
                <input id="browserQuery"
                       placeholder="جست‌وجو در اینترنت..."
                       autocomplete="off">

                <button class="app-action app-primary" type="submit">
                    جست‌وجو
                </button>
            </form>

            <div class="browser-links">
                <button class="browser-link" data-url="https://www.bing.com">
                    <i class="fa-solid fa-magnifying-glass"></i> Bing
                </button>

                <button class="browser-link" data-url="https://github.com">
                    <i class="fa-brands fa-github"></i> GitHub
                </button>

                <button class="browser-link" data-url="https://developer.mozilla.org">
                    <i class="fa-brands fa-firefox-browser"></i> MDN
                </button>

                <button class="browser-link" data-url="https://www.wikipedia.org">
                    <i class="fa-solid fa-book"></i> Wikipedia
                </button>
            </div>

            <p class="browser-notice">
                این مرورگر، رابط نمایشی داخل شبیه‌ساز است.
                برای مشاهدهٔ واقعی وب‌سایت‌ها، آن‌ها را در تب جدید مرورگر دستگاه باز می‌کند.
            </p>

        </div>
    `;

    const address = $("#browserAddress", body);
    const query = $("#browserQuery", body);

    function normalizeAddress(value) {
        const text = value.trim();

        if (!text) return "https://www.bing.com";

        if (/^https?:\/\//i.test(text)) return text;

        if (/^[\w-]+\.[a-z]{2,}/i.test(text)) {
            return `https://${text}`;
        }

        return `https://www.bing.com/search?q=${encodeURIComponent(text)}`;
    }

    function navigate(value) {
        const url = normalizeAddress(value);

        try {
            const parsed = new URL(url);

            if (!["http:", "https:"].includes(parsed.protocol)) {
                toast("فقط نشانی‌های HTTP و HTTPS پشتیبانی می‌شوند.");
                return;
            }

            address.value = url;

            const opened = window.open(url, "_blank", "noopener,noreferrer");

            if (!opened) {
                toast("بازشدن تب جدید مسدود شد؛ اجازهٔ مرورگر را بررسی کن.");
            }
        } catch {
            toast("نشانی واردشده معتبر نیست.");
        }
    }

    $("#browserGo", body).addEventListener("click", () => {
        navigate(address.value);
    });

    address.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            navigate(address.value);
        }
    });

    $("#browserSearch", body).addEventListener("submit", event => {
        event.preventDefault();
        navigate(query.value);
    });

    $$(".browser-link", body).forEach(button => {
        button.addEventListener("click", () => {
            navigate(button.dataset.url);
        });
    });

    $("#browserReload", body).addEventListener("click", () => {
        toast("صفحهٔ نمایشی مرورگر آماده است.");
    });

    $("#browserBack", body).addEventListener("click", () => {
        toast("تاریخچهٔ داخلی مرورگر در این نسخه شبیه‌سازی نشده است.");
    });
}


/* ---------- SETTINGS ---------- */

function renderSettings(body) {
    body.innerHTML = `
        <div class="settings-layout">

            <aside class="settings-sidebar">
                <h3>Settings</h3>

                <button class="settings-nav active" data-settings="system">
                    <i class="fa-solid fa-display"></i> System
                </button>

                <button class="settings-nav" data-settings="personal">
                    <i class="fa-solid fa-palette"></i> Personalization
                </button>

                <button class="settings-nav" data-settings="about">
                    <i class="fa-solid fa-circle-info"></i> About
                </button>
            </aside>

            <section class="settings-content" id="settingsContent"></section>

        </div>
    `;

    const content = $("#settingsContent", body);

    function showSettings(section) {
        $$(".settings-nav", body).forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.settings === section
            );
        });

        if (section === "system") {
            content.innerHTML = `
                <h2>System</h2>

                <div class="settings-card">
                    <div>
                        <strong>Dark mode</strong>
                        <small>تغییر ظاهر شبیه‌ساز به حالت تاریک.</small>
                    </div>

                    <input id="settingsDark" type="checkbox">
                </div>

                <div class="settings-card">
                    <div>
                        <strong>Brightness</strong>
                        <small>تنظیم روشنایی نمایشی دسکتاپ.</small>
                    </div>

                    <input id="settingsBrightness"
                           type="range"
                           min="60"
                           max="120"
                           value="100">
                </div>

                <div class="settings-card">
                    <div>
                        <strong>Display mode</strong>
                        <small>این صفحه برای نمایش افقی بهینه شده است.</small>
                    </div>
                </div>
            `;

            const dark = $("#settingsDark", content);

            dark.checked = document.body.classList.contains("dark-mode");

            dark.addEventListener("change", () => {
                document.body.classList.toggle("dark-mode", dark.checked);
                toast(dark.checked ? "حالت تاریک روشن شد." : "حالت تاریک خاموش شد.");
            });

            $("#settingsBrightness", content).addEventListener("input", event => {
                desktop.style.filter =
                    `brightness(${Number(event.target.value) / 100})`;

                $("#brightnessSlider").value = event.target.value;
            });
        }

        if (section === "personal") {
            content.innerHTML = `
                <h2>Personalization</h2>

                <div class="settings-card">
                    <div>
                        <strong>Color mode</strong>
                        <small>ظاهر روشن یا تاریک را انتخاب کن.</small>
                    </div>

                    <button class="app-action" id="toggleTheme">تغییر تم</button>
                </div>

                <h3>Wallpapers</h3>

                <div class="wallpaper-options">
                    <button class="wallpaper-option selected"
                            data-wallpaper="bloom"
                            title="Bloom"
                            style="background-image:url('https://msftstories.thesourcemediaassets.com/sites/620/2021/09/Windows-11-Bloom-Screensaver-Light-1.jpg')">
                    </button>

                    <button class="wallpaper-option"
                            data-wallpaper="blue"
                            title="Blue"
                            style="background:linear-gradient(135deg,#091c48,#168bce,#c3e6ff)">
                    </button>

                    <button class="wallpaper-option"
                            data-wallpaper="purple"
                            title="Purple"
                            style="background:linear-gradient(135deg,#201443,#6947b9,#d4a5ff)">
                    </button>

                    <button class="wallpaper-option"
                            data-wallpaper="sunset"
                            title="Sunset"
                            style="background:linear-gradient(135deg,#f5a25d,#d64e85,#432b76)">
                    </button>
                </div>
            `;

            $("#toggleTheme", content).addEventListener("click", () => {
                document.body.classList.toggle("dark-mode");
            });

            $$(".wallpaper-option", content).forEach(button => {
                button.addEventListener("click", () => {
                    $$(".wallpaper-option", content).forEach(item => {
                        item.classList.remove("selected");
                    });

                    button.classList.add("selected");

                    const wallpapers = {
                        bloom: 'url("https://msftstories.thesourcemediaassets.com/sites/620/2021/09/Windows-11-Bloom-Screensaver-Light-1.jpg")',
                        blue: "linear-gradient(135deg,#091c48,#168bce,#c3e6ff)",
                        purple: "linear-gradient(135deg,#201443,#6947b9,#d4a5ff)",
                        sunset: "linear-gradient(135deg,#f5a25d,#d64e85,#432b76)"
                    };

                    desktop.style.backgroundImage =
                        wallpapers[button.dataset.wallpaper];

                    writeStorage("wallpaper", button.dataset.wallpaper);

                    toast("پس‌زمینه تغییر کرد.");
                });
            });
        }

        if (section === "about") {
            content.innerHTML = `
                <h2>About</h2>

                <div class="settings-card">
                    <div>
                        <strong>LIKO Desktop</strong>
                        <small>نسخهٔ 1.0 — Interactive Web Simulator</small>
                    </div>
                    <i class="fa-solid fa-desktop"></i>
                </div>

                <div class="settings-card">
                    <div>
                        <strong>Platform</strong>
                        <small>HTML, CSS and JavaScript</small>
                    </div>
                </div>

                <div class="settings-card">
                    <div>
                        <strong>Compatibility</strong>
                        <small>مرورگرهای جدید دسکتاپ و موبایل</small>
                    </div>
                </div>

                <p style="font-size:11px;line-height:2">
                    این پروژه مستقل و غیررسمی است و محصول Microsoft نیست.
                    رابط کاربری برخی برنامه‌ها برای اهداف آموزشی شبیه‌سازی شده است.
                </p>
            `;
        }
    }

    $$(".settings-nav", body).forEach(button => {
        button.addEventListener("click", () => {
            showSettings(button.dataset.settings);
        });
    });

    showSettings("system");
}


/* ---------- PHOTOS ---------- */

function renderPhotos(body) {
    body.innerHTML = `
        <div class="photos-content">

            <img class="photos-image"
                 src="https://msftstories.thesourcemediaassets.com/sites/620/2021/09/Windows-11-Bloom-Screensaver-Light-1.jpg"
                 alt="Bloom wallpaper">

            <div class="photos-caption">
                Bloom Wallpaper · تصویر از منبع رسانه‌ای Microsoft
            </div>

            <div style="margin-top:15px">
                <button class="app-action" id="photosOpen">
                    بازکردن تصویر در تب جدید
                </button>
            </div>

        </div>
    `;

    $("#photosOpen", body).addEventListener("click", () => {
        window.open(
            "https://msftstories.thesourcemediaassets.com/sites/620/2021/09/Windows-11-Bloom-Screensaver-Light-1.jpg",
            "_blank",
            "noopener,noreferrer"
        );
    });
}


/* ---------- STORE ---------- */

function renderStore(body) {
    body.innerHTML = `
        <div class="store-hero">
            <h2>LIKO App Store</h2>
            <p>
                مجموعه‌ای از کارت‌های برنامه برای نمایش ظاهر فروشگاه.
                این فروشگاه نمایشی است و برنامه نصب نمی‌کند.
            </p>
        </div>

        <div class="store-grid" id="storeGrid"></div>
    `;

    const cards = [
        ["fa-solid fa-calculator", "Calculator", "ابزار محاسباتی", "calculator"],
        ["fa-solid fa-file-lines", "Notepad", "یادداشت‌های متنی", "notepad"],
        ["fa-solid fa-folder-open", "File Explorer", "مدیریت فایل نمایشی", "explorer"],
        ["fa-solid fa-images", "Photos", "نمایش تصویر", "photos"],
        ["fa-solid fa-gear", "Settings", "شخصی‌سازی دسکتاپ", "settings"],
        ["fa-brands fa-edge", "Browser", "بازکردن وب‌سایت‌ها", "browser"]
    ];

    const grid = $("#storeGrid", body);

    cards.forEach(([icon, title, description, appId]) => {
        const card = createElement("article", "store-card");

        card.innerHTML = `
            <i class="${icon}"></i>
            <h3></h3>
            <p></p>
            <button class="app-action">بازکردن</button>
        `;

        $("h3", card).textContent = title;
        $("p", card).textContent = description;

        $("button", card).addEventListener("click", () => {
            openApp(appId);
        });

        grid.appendChild(card);
    });
}


/* ---------- RECYCLE BIN ---------- */

function renderRecycle(body) {
    body.innerHTML = `
        <div class="empty-app">
            <i class="fa-solid fa-trash-can"></i>
            <h2>Recycle Bin is empty</h2>
            <p>
                سطل بازیافت نمایشی است.
                این شبیه‌ساز به فایل‌های واقعی دستگاه دسترسی ندارد.
            </p>

            <button class="app-action" id="recycleInfo">
                اطلاعات بیشتر
            </button>
        </div>
    `;

    $("#recycleInfo", body).addEventListener("click", () => {
        toast("سطل بازیافت فقط برای نمایش رابط کاربری ساخته شده است.");
    });
}


/* ---------- TERMINAL ---------- */

function renderTerminal(body) {
    body.innerHTML = `
        <div style="
            min-height:100%;
            padding:18px;
            background:#101722;
            color:#b7f7ce;
            font-family:Consolas,monospace;
        ">
            <div>LIKO Terminal [Web Simulator]</div>
            <div style="color:#94a3b8;margin-top:5px">
                Type help to see demo commands.
            </div>

            <div id="terminalOutput"
                 style="white-space:pre-wrap;margin-top:16px"></div>

            <form id="terminalForm"
                  style="display:flex;gap:8px;margin-top:12px">
                <span>LIKO&gt;</span>
                <input id="terminalInput"
                       autocomplete="off"
                       style="
                           flex:1;min-width:0;
                           border:0;outline:0;
                           background:transparent;color:#fff;
                           font-family:inherit
                       ">
            </form>
        </div>
    `;

    const output = $("#terminalOutput", body);
    const input = $("#terminalInput", body);

    function print(text) {
        output.textContent += `${text}\n`;
    }

    print("Welcome to LIKO Terminal.");
    print("This is a safe demo terminal, not a real system shell.");

    $("#terminalForm", body).addEventListener("submit", event => {
        event.preventDefault();

        const command = input.value.trim();
        input.value = "";

        if (!command) return;

        print(`LIKO> ${command}`);

        switch (command.toLowerCase()) {
            case "help":
                print("Commands: help, clear, date, about, apps");
                break;

            case "clear":
                output.textContent = "";
                break;

            case "date":
                print(new Date().toString());
                break;

            case "about":
                print("LIKO Desktop Web Simulator v1.0");
                break;

            case "apps":
                print(Object.keys(APPS).join(", "));
                break;

            default:
                print("Command not found. Type help.");
        }
    });
}


/* ---------- ABOUT ---------- */

function renderAbout(body) {
    body.innerHTML = `
        <div class="empty-app">
            <i class="fa-brands fa-windows" style="color:#1684e8"></i>
            <h2>LIKO Desktop</h2>
            <p>
                یک شبیه‌ساز دسکتاپ تحت وب ساخته‌شده با HTML، CSS و JavaScript.
                این پروژه مستقل و غیررسمی است و وابستگی سازمانی به Microsoft ندارد.
            </p>

            <button class="app-action app-primary" id="aboutSettings">
                تنظیمات
            </button>
        </div>
    `;

    $("#aboutSettings", body).addEventListener("click", () => {
        openApp("settings");
    });
}


/* ---------- CONTEXT MENU ---------- */

function showContextMenu(x, y, appId = null) {
    contextTargetApp = appId;

    contextMenu.classList.remove("hidden");

    const width = contextMenu.offsetWidth || 215;
    const height = contextMenu.offsetHeight || 210;

    const left = Math.max(5, Math.min(x, window.innerWidth - width - 5));
    const top = Math.max(5, Math.min(y, window.innerHeight - height - 5));

    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
}

document.addEventListener("contextmenu", event => {
    event.preventDefault();

    const icon = event.target.closest(".desktop-icon");
    const appId = icon?.dataset.app || null;

    showContextMenu(event.clientX, event.clientY, appId);
});

contextMenu.addEventListener("click", event => {
    const button = event.target.closest("[data-context]");

    if (!button) return;

    const action = button.dataset.context;

    contextMenu.classList.add("hidden");

    switch (action) {
        case "refresh":
            toast("دسکتاپ تازه‌سازی شد.");
            break;

        case "newnote":
            openApp("notepad");
            break;

        case "settings":
        case "display":
            openApp("settings");
            break;

        case "about":
            openApp("about");
            break;
    }
});


/* ---------- DESKTOP ICONS ---------- */

$$(".desktop-icon").forEach(icon => {
    let lastClick = 0;

    icon.addEventListener("click", () => {
        $$(".desktop-icon").forEach(item => {
            item.classList.remove("selected");
        });

        icon.classList.add("selected");

        const now = Date.now();

        if (now - lastClick < 350) {
            openApp(icon.dataset.app);
        }

        lastClick = now;
    });

    icon.addEventListener("dblclick", event => {
        event.preventDefault();
        openApp(icon.dataset.app);
    });
});

desktop.addEventListener("click", event => {
    if (
        event.target === desktop ||
        event.target.classList.contains("desktop-overlay")
    ) {
        $$(".desktop-icon").forEach(icon => {
            icon.classList.remove("selected");
        });
    }
});


/* ---------- KEYBOARD SHORTCUTS ---------- */

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closePanels();
    }

    if (event.ctrlKey && event.key === "Escape") {
        event.preventDefault();
        toggleStart();
    }

    if (event.key === "Meta") {
        toggleStart();
    }

    if (event.altKey && event.key === "F4") {
        event.preventDefault();

        if (activeWindowId) {
            closeWindow(activeWindowId);
        }
    }

    if (event.shiftKey && event.key === "F10") {
        event.preventDefault();
        showContextMenu(
            Math.round(window.innerWidth / 2),
            Math.round(window.innerHeight / 2)
        );
    }

    if (event.ctrlKey && event.key.toLowerCase() === "l") {
        const active = openWindows.get(activeWindowId);

        if (active?.appId === "browser") {
            const address = $("#browserAddress", active.body);

            if (address) {
                event.preventDefault();
                address.focus();
                address.select();
            }
        }
    }
});


/* ---------- OUTSIDE CLICKS ---------- */

document.addEventListener("click", event => {
    if (
        !event.target.closest("#startMenu") &&
        !event.target.closest("#startButton") &&
        !event.target.closest("#searchPanel") &&
        !event.target.closest("#taskbarSearchButton") &&
        !event.target.closest("#quickPanel") &&
        !event.target.closest("#quickSettingsButton") &&
        !event.target.closest("#contextMenu")
    ) {
        startMenu.classList.add("hidden");
        searchPanel.classList.add("hidden");
        quickPanel.classList.add("hidden");
        contextMenu.classList.add("hidden");
    }
});


/* ---------- SMALL TASKBAR ACTIONS ---------- */

$("#widgetsButton").addEventListener("click", () => {
    toast("به بخش ابزارهای LIKO خوش آمدی!");
});

$("#clockButton").addEventListener("click", () => {
    togglePanel(quickPanel);
});


/* ---------- RESTORE WALLPAPER ---------- */

function restoreWallpaper() {
    const saved = readStorage("wallpaper", "bloom");

    const wallpapers = {
        bloom: 'url("https://msftstories.thesourcemediaassets.com/sites/620/2021/09/Windows-11-Bloom-Screensaver-Light-1.jpg")',
        blue: "linear-gradient(135deg,#091c48,#168bce,#c3e6ff)",
        purple: "linear-gradient(135deg,#201443,#6947b9,#d4a5ff)",
        sunset: "linear-gradient(135deg,#f5a25d,#d64e85,#432b76)"
    };

    desktop.style.backgroundImage = wallpapers[saved] || wallpapers.bloom;
}


/* ---------- BOOT SEQUENCE ---------- */

function startBoot() {
    const screen = $("#bootScreen");
    const status = $("#bootStatus");

    const messages = [
        "در حال آماده‌سازی دسکتاپ...",
        "در حال بارگذاری برنامه‌ها...",
        "در حال راه‌اندازی LIKO Desktop..."
    ];

    let index = 0;

    const messageTimer = setInterval(() => {
        index++;

        if (index < messages.length) {
            status.textContent = messages[index];
        }
    }, 500);

    setTimeout(() => {
        clearInterval(messageTimer);
        screen.classList.add("finished");

        setTimeout(() => {
            screen.remove();
            toast("به LIKO Desktop خوش آمدی!");
        }, 700);
    }, 1900);
}


/* ---------- INIT ---------- */

function init() {
    renderPinnedApps();
    renderSearchResults("");
    restoreWallpaper();
    updateClock();
    startBoot();
}

init();