"use strict";

/*
 * LIKO VIRTUAL FILE SYSTEM
 * Version: 1.0.0
 *
 * Browser-based simulated filesystem.
 * Does not access the real operating system.
 */

(() => {
    const STORAGE_KEY = "liko-desktop-v1-filesystem";
    const VERSION = 1;

    const now = () => new Date().toISOString();

    const makeId = () =>
        "lk-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 9);

    const normalizePath = (path) => {
        const parts = String(path || "/")
            .replace(/\\/g, "/")
            .split("/")
            .filter(Boolean);

        const result = [];

        for (const part of parts) {
            if (part === ".") continue;

            if (part === "..") {
                result.pop();
                continue;
            }

            if (
                part.includes("\0") ||
                part.length > 255
            ) {
                throw new Error("نام مسیر نامعتبر است.");
            }

            result.push(part);
        }

        return "/" + result.join("/");
    };

    const parentPath = (path) => {
        const normalized = normalizePath(path);

        if (normalized === "/") return null;

        const index = normalized.lastIndexOf("/");

        return index <= 0
            ? "/"
            : normalized.slice(0, index);
    };

    const baseName = (path) => {
        const normalized = normalizePath(path);

        return normalized === "/"
            ? "/"
            : normalized.slice(
                normalized.lastIndexOf("/") + 1
            );
    };

    const createDirectory = (name, parent = null) => ({
        id: makeId(),
        name,
        type: "directory",
        parent,
        createdAt: now(),
        updatedAt: now(),
        children: {}
    });

    const createFile = (
        name,
        parent = null,
        content = ""
    ) => ({
        id: makeId(),
        name,
        type: "file",
        parent,
        createdAt: now(),
        updatedAt: now(),
        size: String(content).length,
        content: String(content)
    });

    function createInitialState() {
        const root = createDirectory("/", null);

        const folders = [
            "Desktop",
            "Documents",
            "Downloads",
            "Pictures",
            "Music",
            "Videos",
            "Recycle Bin"
        ];

        for (const name of folders) {
            root.children[name] = createDirectory(
                name,
                root.id
            );
        }

        root.children.Documents.children["Welcome.txt"] =
            createFile(
                "Welcome.txt",
                root.children.Documents.id,
                "به LIKO Desktop خوش آمدی!\n" +
                "این فایل در فایل‌سیستم مجازی ذخیره شده است."
            );

        return {
            version: VERSION,
            root,
            trash: []
        };
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return createInitialState();
            }

            const parsed = JSON.parse(raw);

            if (
                parsed.version !== VERSION ||
                !parsed.root ||
                parsed.root.type !== "directory"
            ) {
                return createInitialState();
            }

            return parsed;
        } catch (error) {
            console.warn(
                "LIKO filesystem: storage unavailable.",
                error
            );

            return createInitialState();
        }
    }

    let state = loadState();

    function save() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(state)
            );

            return true;
        } catch (error) {
            throw new Error(
                "ذخیره‌سازی فایل‌سیستم انجام نشد؛ " +
                "ممکن است فضای ذخیره‌سازی پر باشد."
            );
        }
    }

    function findDirectory(path) {
        const normalized = normalizePath(path);

        let current = state.root;

        if (normalized === "/") {
            return current;
        }

        for (const part of normalized
            .split("/")
            .filter(Boolean)) {

            const next = current.children[part];

            if (!next || next.type !== "directory") {
                throw new Error(
                    "پوشه پیدا نشد: " + normalized
                );
            }

            current = next;
        }

        return current;
    }

    function getNode(path) {
        const normalized = normalizePath(path);

        if (normalized === "/") {
            return state.root;
        }

        const parent = findDirectory(
            parentPath(normalized)
        );

        const node = parent.children[
            baseName(normalized)
        ];

        if (!node) {
            throw new Error(
                "فایل یا پوشه پیدا نشد: " + normalized
            );
        }

        return node;
    }

    function list(path = "/") {
        const directory = findDirectory(path);

        return Object.values(directory.children)
            .map(node => ({
                id: node.id,
                name: node.name,
                type: node.type,
                size: node.size || 0,
                createdAt: node.createdAt,
                updatedAt: node.updatedAt
            }))
            .sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === "directory"
                        ? -1
                        : 1;
                }

                return a.name.localeCompare(
                    b.name,
                    "fa"
                );
            });
    }

    function createFolder(path) {
        const normalized = normalizePath(path);

        if (normalized === "/") {
            throw new Error(
                "پوشه ریشه از قبل وجود دارد."
            );
        }

        const parent = findDirectory(
            parentPath(normalized)
        );

        const name = baseName(normalized);

        if (parent.children[name]) {
            throw new Error(
                "این نام از قبل وجود دارد."
            );
        }

        parent.children[name] = createDirectory(
            name,
            parent.id
        );

        save();

        return normalized;
    }

    function writeFile(path, content = "") {
        const normalized = normalizePath(path);

        if (normalized === "/") {
            throw new Error(
                "مسیر فایل معتبر نیست."
            );
        }

        const parent = findDirectory(
            parentPath(normalized)
        );

        const name = baseName(normalized);
        const existing = parent.children[name];

        if (existing && existing.type !== "file") {
            throw new Error(
                "یک پوشه با این نام وجود دارد."
            );
        }

        if (existing) {
            existing.content = String(content);
            existing.size = existing.content.length;
            existing.updatedAt = now();
        } else {
            parent.children[name] = createFile(
                name,
                parent.id,
                content
            );
        }

        save();

        return normalized;
    }

    function readFile(path) {
        const node = getNode(path);

        if (node.type !== "file") {
            throw new Error(
                "مسیر انتخاب‌شده یک فایل نیست."
            );
        }

        return node.content;
    }

    function rename(path, newName) {
        const normalized = normalizePath(path);

        if (normalized === "/") {
            throw new Error(
                "تغییر نام ریشه مجاز نیست."
            );
        }

        const name = String(newName || "").trim();

        if (
            !name ||
            name === "." ||
            name === ".." ||
            name.includes("/") ||
            name.includes("\\") ||
            name.includes("\0") ||
            name.length > 255
        ) {
            throw new Error(
                "نام جدید معتبر نیست."
            );
        }

        const parent = findDirectory(
            parentPath(normalized)
        );

        const oldName = baseName(normalized);

        if (!parent.children[oldName]) {
            throw new Error("فایل پیدا نشد.");
        }

        if (parent.children[name]) {
            throw new Error(
                "این نام از قبل وجود دارد."
            );
        }

        const node = parent.children[oldName];

        delete parent.children[oldName];

        node.name = name;
        node.updatedAt = now();

        parent.children[name] = node;

        save();

        return normalizePath(
            parentPath(normalized) + "/" + name
        );
    }

    function remove(path) {
        const normalized = normalizePath(path);

        if (normalized === "/") {
            throw new Error(
                "حذف ریشه مجاز نیست."
            );
        }

        const parent = findDirectory(
            parentPath(normalized)
        );

        const name = baseName(normalized);
        const node = parent.children[name];

        if (!node) {
            throw new Error(
                "فایل یا پوشه پیدا نشد."
            );
        }

        state.trash.push({
            deletedAt: now(),
            originalPath: normalized,
            node
        });

        delete parent.children[name];

        save();

        return true;
    }

    function search(query, startPath = "/") {
        const term = String(query || "")
            .trim()
            .toLocaleLowerCase("fa");

        if (!term) return [];

        const results = [];

        function walk(directory, currentPath) {
            for (const node of Object.values(
                directory.children
            )) {
                const path = currentPath === "/"
                    ? "/" + node.name
                    : currentPath + "/" + node.name;

                if (
                    node.name
                        .toLocaleLowerCase("fa")
                        .includes(term)
                ) {
                    results.push({
                        name: node.name,
                        type: node.type,
                        path
                    });
                }

                if (node.type === "directory") {
                    walk(node, path);
                }
            }
        }

        walk(findDirectory(startPath), normalizePath(startPath));

        return results;
    }

    function getInfo(path = "/") {
        const node = getNode(path);

        return {
            id: node.id,
            name: node.name,
            type: node.type,
            parent: node.parent,
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
            size: node.size || 0,
            children: node.type === "directory"
                ? Object.keys(node.children).length
                : undefined
        };
    }

    function getTrash() {
        return state.trash.map(item => ({
            deletedAt: item.deletedAt,
            originalPath: item.originalPath,
            name: item.node.name,
            type: item.node.type
        }));
    }

    function restoreTrash(index) {
        const item = state.trash[index];

        if (!item) {
            throw new Error(
                "این مورد در سطل زباله وجود ندارد."
            );
        }

        const parent = findDirectory(
            parentPath(item.originalPath)
        );

        const name = baseName(item.originalPath);

        if (parent.children[name]) {
            throw new Error(
                "نام قبلاً استفاده شده است."
            );
        }

        parent.children[name] = item.node;
        state.trash.splice(index, 1);

        save();

        return item.originalPath;
    }

    function getStats() {
        let files = 0;
        let directories = 0;
        let bytes = 0;

        function walk(directory) {
            for (const node of Object.values(
                directory.children
            )) {
                if (node.type === "directory") {
                    directories++;
                    walk(node);
                } else {
                    files++;
                    bytes += node.size || 0;
                }
            }
        }

        walk(state.root);

        return {
            files,
            directories,
            bytes,
            trashItems: state.trash.length
        };
    }

    function reset() {
        state = createInitialState();
        save();

        return true;
    }

    window.LIKOFileSystem = Object.freeze({
        version: "1.0.0",
        normalizePath,
        list,
        createFolder,
        writeFile,
        readFile,
        rename,
        remove,
        search,
        getInfo,
        getTrash,
        restoreTrash,
        getStats,
        reset
    });

    console.info(
        "LIKO Virtual File System initialized."
    );
})();