import { useState, useEffect } from "react";

export default function Home() {
    const [files, setFiles] = useState([]); // ✅ start as empty array
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState("images");
    const [sortKey, setSortKey] = useState("dateDesc"); // dateDesc, dateAsc, sizeAsc, sizeDesc, nameAsc, nameDesc
    const [viewMode, setViewMode] = useState("grid"); // grid | list
    const [hoverUpload, setHoverUpload] = useState(false);
    const [hoverTab, setHoverTab] = useState(null);
    const [theme, setTheme] = useState("light");
    const [lightboxFile, setLightboxFile] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [customName, setCustomName] = useState("");
    const [binFiles, setBinFiles] = useState([]);

    async function fetchFiles() {
        try {
            const res = await fetch("/api/list");
            const data = await res.json();
            setFiles(data.files || []); // ✅ fallback to []
        } catch (err) {
            console.error("Error fetching files:", err);
            setFiles([]); // ✅ never leave it undefined
        }
    }

    useEffect(() => {
        fetchFiles();
    }, []);

    useEffect(() => {
        if (activeTab === "bin") {
            fetchTrash();
        }
    }, [activeTab]);

    useEffect(() => {
        try {
            const current = document.documentElement.getAttribute("data-theme") || "light";
            setTheme(current);
        } catch { }
    }, []);

    function toggleTheme() {
        const next = theme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try {
            localStorage.setItem("theme", next);
        } catch { }
        setTheme(next);
    }

    // Close lightbox on Escape
    useEffect(() => {
        function onKeyDown(e) {
            if (e.key === "Escape") setLightboxFile(null);
            if (!lightboxFile) return;
            if (e.key === "ArrowRight") moveLightbox(1);
            if (e.key === "ArrowLeft") moveLightbox(-1);
        }
        if (lightboxFile) {
            window.addEventListener("keydown", onKeyDown);
            return () => window.removeEventListener("keydown", onKeyDown);
        }
    }, [lightboxFile]);

    // Helpers to navigate lightbox
    function getVisibleList() {
        // Only images open a lightbox in this UI
        return sortFilesBy(imageFiles, sortKey);
    }

    function moveLightbox(delta) {
        const list = getVisibleList();
        if (!lightboxFile || !list.length) return;
        const idx = list.findIndex((f) => f.key === lightboxFile.key);
        if (idx === -1) return;
        const nextIdx = (idx + delta + list.length) % list.length;
        setLightboxFile(list[nextIdx]);
    }

    async function handleUpload(e) {
        e.preventDefault();
        const input = e.target.file;
        const files = Array.from(input?.files || []);
        const isMulti = files.length > 1;
        const formData = new FormData();
        if (!files.length) return;
        if (isMulti) {
            for (const f of files) formData.append("files", f);
        } else {
            const fileFromInput = selectedFile || files[0];
            formData.append("file", fileFromInput);
            if (customName && customName.trim()) formData.append("key", customName.trim());
        }

        setUploading(true);
        await fetch(`/api/upload${isMulti ? "?multi=1" : ""}`, { method: "POST", body: formData });
        setUploading(false);

        // Reset form state to default view
        setSelectedFile(null);
        setCustomName("");
        e.target.reset();

        fetchFiles();
    }

    async function handleDelete(key) {
        await fetch(`/api/trash-move?key=${encodeURIComponent(key)}`, { method: "POST" });
        fetchFiles();
    }

    async function fetchTrash() {
        try {
            const res = await fetch("/api/trash-list");
            const data = await res.json();
            setBinFiles(data.files || []);
        } catch (err) {
            console.error("Error fetching trash:", err);
            setBinFiles([]);
        }
    }

    async function handleRestore(key) {
        await fetch(`/api/trash-restore?key=${encodeURIComponent(key)}`, { method: "POST" });
        fetchTrash();
        fetchFiles();
    }

    async function handleDeletePermanent(key) {
        await fetch(`/api/trash-delete?key=${encodeURIComponent(key)}`, { method: "DELETE" });
        fetchTrash();
    }

    const isVideo = (name) => /\.(mp4|mov|webm|avi|mkv)$/i.test(name || "");
    const imageFiles = (files || []).filter((f) => !isVideo(f.key));
    const videoFiles = (files || []).filter((f) => isVideo(f.key));

    function sortFilesBy(list, key) {
        const arr = [...list];
        const byName = (a, b) => a.key.localeCompare(b.key, undefined, { sensitivity: "base" });
        const toSize = (f) => (typeof f.size === "number" ? f.size : -1);
        const toTime = (f) => {
            if (!f.lastModified) return 0;
            const t = new Date(f.lastModified).getTime();
            return Number.isFinite(t) ? t : 0;
        };
        switch (key) {
            case "nameAsc":
                arr.sort(byName);
                break;
            case "nameDesc":
                arr.sort((a, b) => -byName(a, b));
                break;
            case "sizeAsc":
                arr.sort((a, b) => toSize(a) - toSize(b));
                break;
            case "sizeDesc":
                arr.sort((a, b) => toSize(b) - toSize(a));
                break;
            case "dateAsc":
                arr.sort((a, b) => toTime(a) - toTime(b));
                break;
            case "dateDesc":
            default:
                arr.sort((a, b) => toTime(b) - toTime(a));
        }
        return arr;
    }

    const Card = ({ file, children, renderActions }) => {
        const [hover, setHover] = useState(false);
        return (
            <div
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={{
                    border: hover ? "1px solid var(--primary-soft)" : "1px solid var(--border)",
                    padding: 12,
                    borderRadius: 10,
                    textAlign: "center",
                    boxShadow: hover
                        ? "0 8px 18px rgba(0,0,0,0.12)"
                        : "0 2px 8px rgba(0,0,0,0.06)",
                    background: "var(--card-bg)",
                    transform: hover ? "translateY(-2px) scale(1.02)" : "none",
                    transition:
                        "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                }}
            >
                <div style={{ borderRadius: 8, overflow: "hidden" }}>{children}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--text)", fontWeight: 600 }}>{file.key}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
                    {formatSize(file.size)} · {formatTime(file.lastModified)}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}>{renderActions ? renderActions(file) : null}</div>
            </div>
        );
    };

    const Grid = ({ items, render, actions }) => (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 20,
                marginTop: 16,
            }}
        >
            {items.map((file) => (
                <Card key={file.key} file={file} renderActions={actions}>{render(file)}</Card>
            ))}
        </div>
    );

    const ListView = ({ items, render, actions }) => (
        <div style={{ marginTop: 16 }}>
            {items.map((file) => (
                <div
                    key={file.key}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        background: "var(--card-bg)",
                        marginBottom: 10,
                    }}
                >
                    <div style={{ width: 80, height: 60, borderRadius: 8, overflow: "hidden", background: "var(--video-bg)" }}>
                        {render(file)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{file.key}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>{formatSize(file.size)} · {formatTime(file.lastModified)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {actions ? actions(file) : null}
                    </div>
                </div>
            ))}
        </div>
    );

    function formatSize(bytes) {
        if (!bytes && bytes !== 0) return "";
        const units = ["B", "KB", "MB", "GB", "TB"];
        let size = bytes;
        let u = 0;
        while (size >= 1024 && u < units.length - 1) {
            size /= 1024;
            u += 1;
        }
        return `${size.toFixed(size < 10 && u > 0 ? 1 : 0)} ${units[u]}`;
    }

    function formatTime(iso) {
        if (!iso) return "";
        try {
            const d = new Date(iso);
            return d.toLocaleString();
        } catch { }
        return "";
    }

    return (
        <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{ fontSize: 28, margin: 0 }}>📸 My Gallery</h1>
                <div style={{ marginLeft: "auto" }}>
                    <button
                        onClick={toggleTheme}
                        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                        style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "var(--card-bg)",
                            color: "var(--text)",
                            cursor: "pointer",
                            transform: "translateY(0)",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                            transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-1px) scale(1.03)";
                            e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.14)";
                            e.currentTarget.style.borderColor = "var(--primary-soft)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.06)";
                            e.currentTarget.style.borderColor = "var(--border)";
                        }}
                    >
                        {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
                    </button>
                </div>
            </div>

            {/* Upload */}
            <form onSubmit={handleUpload} style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                <input
                    type="file"
                    name="file"
                    required
                    multiple
                    onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        setSelectedFile(f || null);
                        if (f && f.name) {
                            const dot = f.name.lastIndexOf(".");
                            const base = dot > -1 ? f.name.slice(0, dot) : f.name;
                            setCustomName(base);
                        } else {
                            setCustomName("");
                        }
                    }}
                />
                {selectedFile && (
                    <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Custom name (optional)"
                        aria-label="Custom name"
                        style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text)", minWidth: 220 }}
                    />
                )}
                <button
                    type="submit"
                    disabled={uploading}
                    style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: `1px solid ${hoverUpload ? "var(--success)" : "transparent"}`,
                        background: uploading ? "var(--neutral-500)" : "var(--success)",
                        color: "white",
                        cursor: uploading ? "not-allowed" : "pointer",
                        transform: hoverUpload && !uploading ? "translateY(-1px) scale(1.03)" : "none",
                        boxShadow: hoverUpload && !uploading ? "0 8px 16px rgba(0,0,0,0.14)" : "0 2px 6px rgba(0,0,0,0.06)",
                        transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                    }}
                    onMouseEnter={() => setHoverUpload(true)}
                    onMouseLeave={() => setHoverUpload(false)}
                >
                    {uploading ? "Uploading..." : "Upload"}
                </button>
            </form>

            {/* Tabs + Sort */}
            <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
                {[
                    { id: "images", label: "Images" },
                    { id: "videos", label: "Videos" },
                    { id: "bin", label: "Bin" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        onMouseEnter={() => setHoverTab(tab.id)}
                        onMouseLeave={() => setHoverTab((t) => (t === tab.id ? null : t))}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: `1px solid ${hoverTab === tab.id || activeTab === tab.id ? "var(--primary-soft)" : "var(--border)"}`,
                            background: activeTab === tab.id ? "var(--tab-active-bg)" : "var(--tab-inactive-bg)",
                            color: activeTab === tab.id ? "var(--tab-active-text)" : "var(--tab-inactive-text)",
                            cursor: "pointer",
                            transform: hoverTab === tab.id ? "translateY(-1px) scale(1.03)" : "none",
                            boxShadow: hoverTab === tab.id ? "0 8px 16px rgba(0,0,0,0.14)" : "0 2px 6px rgba(0,0,0,0.06)",
                            transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                        }}
                    >
                        {tab.label}
                    </button>
                ))}

                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                    <label htmlFor="sortBy" style={{ color: "var(--muted)", fontSize: 14 }}>Sort by</label>
                    <select
                        id="sortBy"
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value)}
                        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text)" }}
                    >
                        <option value="dateDesc">Date: Latest → Oldest</option>
                        <option value="dateAsc">Date: Oldest → Latest</option>
                        <option value="sizeAsc">Size: Small → Large</option>
                        <option value="sizeDesc">Size: Large → Small</option>
                        <option value="nameAsc">Name: A → Z</option>
                        <option value="nameDesc">Name: Z → A</option>
                    </select>
                    <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
                        <button
                            aria-label="Grid view"
                            onClick={() => setViewMode("grid")}
                            style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: `1px solid ${viewMode === "grid" ? "var(--primary-soft)" : "var(--border)"}`,
                                background: viewMode === "grid" ? "var(--tab-active-bg)" : "var(--tab-inactive-bg)",
                                color: viewMode === "grid" ? "var(--tab-active-text)" : "var(--tab-inactive-text)",
                                cursor: "pointer",
                            }}
                        >
                            Grid
                        </button>
                        <button
                            aria-label="List view"
                            onClick={() => setViewMode("list")}
                            style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: `1px solid ${viewMode === "list" ? "var(--primary-soft)" : "var(--border)"}`,
                                background: viewMode === "list" ? "var(--tab-active-bg)" : "var(--tab-inactive-bg)",
                                color: viewMode === "list" ? "var(--tab-active-text)" : "var(--tab-inactive-text)",
                                cursor: "pointer",
                            }}
                        >
                            List
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {activeTab !== "bin" && files.length === 0 ? (
                <p style={{ marginTop: 12, color: "var(--muted)" }}>No files yet. Upload one above 👆</p>
            ) : null}

            {activeTab === "images" && (
                viewMode === "grid" ? (
                    <Grid
                        items={sortFilesBy(imageFiles, sortKey)}
                        render={(file) => (
                            <img
                                src={`/api/download?inline=1&key=${encodeURIComponent(file.key)}`}
                                alt={file.key}
                                style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8, cursor: "zoom-in" }}
                                onClick={() => setLightboxFile(file)}
                            />
                        )}
                        actions={(file) => (
                            <>
                                <a href={`/api/download?key=${encodeURIComponent(file.key)}`} target="_blank" rel="noreferrer" style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid transparent", background: "var(--primary)", color: "white", textDecoration: "none" }}>Download</a>
                                <button onClick={() => handleDelete(file.key)} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--danger)", color: "white", border: "1px solid transparent", cursor: "pointer" }}>Delete</button>
                            </>
                        )}
                    />
                ) : (
                    <ListView
                        items={sortFilesBy(imageFiles, sortKey)}
                        render={(file) => (
                            <img
                                src={`/api/download?inline=1&key=${encodeURIComponent(file.key)}`}
                                alt={file.key}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onClick={() => setLightboxFile(file)}
                            />
                        )}
                        actions={(file) => (
                            <>
                                <a href={`/api/download?key=${encodeURIComponent(file.key)}`} target="_blank" rel="noreferrer" style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid transparent", background: "var(--primary)", color: "white", textDecoration: "none" }}>Download</a>
                                <button onClick={() => handleDelete(file.key)} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--danger)", color: "white", border: "1px solid transparent", cursor: "pointer" }}>Delete</button>
                            </>
                        )}
                    />
                )
            )}

            {activeTab === "videos" && (
                viewMode === "grid" ? (
                    <Grid
                        items={sortFilesBy(videoFiles, sortKey)}
                        render={(file) => (
                            <video
                                controls
                                src={`/api/download?inline=1&key=${encodeURIComponent(file.key)}`}
                                style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 8, background: "var(--video-bg)" }}
                            />
                        )}
                        actions={(file) => (
                            <>
                                <a href={`/api/download?key=${encodeURIComponent(file.key)}`} target="_blank" rel="noreferrer" style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid transparent", background: "var(--primary)", color: "white", textDecoration: "none" }}>Download</a>
                                <button onClick={() => handleDelete(file.key)} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--danger)", color: "white", border: "1px solid transparent", cursor: "pointer" }}>Delete</button>
                            </>
                        )}
                    />
                ) : (
                    <ListView
                        items={sortFilesBy(videoFiles, sortKey)}
                        render={(file) => (
                            <video
                                controls
                                src={`/api/download?inline=1&key=${encodeURIComponent(file.key)}`}
                                style={{ width: "100%", height: "100%", objectFit: "cover", background: "var(--video-bg)" }}
                            />
                        )}
                        actions={(file) => (
                            <>
                                <a href={`/api/download?key=${encodeURIComponent(file.key)}`} target="_blank" rel="noreferrer" style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid transparent", background: "var(--primary)", color: "white", textDecoration: "none" }}>Download</a>
                                <button onClick={() => handleDelete(file.key)} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--danger)", color: "white", border: "1px solid transparent", cursor: "pointer" }}>Delete</button>
                            </>
                        )}
                    />
                )
            )}

            {activeTab === "bin" && (
                viewMode === "grid" ? (
                    <Grid
                        items={sortFilesBy(binFiles, sortKey)}
                        render={(file) => (
                            isVideo(file.key) ? (
                                <div style={{ width: "100%", height: 220, borderRadius: 8, background: "var(--video-bg)" }} />
                            ) : (
                                <img
                                    src={`/api/download?inline=1&key=${encodeURIComponent("trash/" + file.key)}`}
                                    alt={file.key}
                                    style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8 }}
                                />
                            )
                        )}
                        actions={(file) => (
                            <>
                                <button onClick={() => handleRestore(file.key)} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--success)", color: "white", border: "1px solid transparent", cursor: "pointer" }}>Restore</button>
                                <button onClick={() => handleDeletePermanent(file.key)} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--danger)", color: "white", border: "1px solid transparent", cursor: "pointer" }}>Delete Permanently</button>
                            </>
                        )}
                    />
                ) : (
                    <ListView
                        items={sortFilesBy(binFiles, sortKey)}
                        render={(file) => (
                            isVideo(file.key) ? (
                                <div style={{ width: "100%", height: "100%", background: "var(--video-bg)" }} />
                            ) : (
                                <img
                                    src={`/api/download?inline=1&key=${encodeURIComponent("trash/" + file.key)}`}
                                    alt={file.key}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                            )
                        )}
                        actions={(file) => (
                            <>
                                <button onClick={() => handleRestore(file.key)} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--success)", color: "white", border: "1px solid transparent", cursor: "pointer" }}>Restore</button>
                                <button onClick={() => handleDeletePermanent(file.key)} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--danger)", color: "white", border: "1px solid transparent", cursor: "pointer" }}>Delete Permanently</button>
                            </>
                        )}
                    />
                )
            )}
            {/* Lightbox Modal */}
            {lightboxFile && (
                <div
                    onClick={() => setLightboxFile(null)}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "rgba(0,0,0,0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: 16,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ position: "relative", maxWidth: "90vw", maxHeight: "85vh" }}
                    >
                        <button
                            onClick={() => setLightboxFile(null)}
                            style={{
                                position: "absolute",
                                top: -8,
                                left: -8,
                                padding: "8px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--border)",
                                background: "var(--card-bg)",
                                color: "var(--text)",
                                cursor: "pointer",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                            }}
                        >
                            ← Back
                        </button>
                        {/* Left/Right arrows */}
                        <button
                            aria-label="Previous"
                            onClick={() => moveLightbox(-1)}
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: -56,
                                transform: "translateY(-50%)",
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                border: "1px solid var(--border)",
                                background: "rgba(255,255,255,0.12)",
                                color: "#fff",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backdropFilter: "blur(2px)",
                            }}
                        >
                            ‹
                        </button>
                        <button
                            aria-label="Next"
                            onClick={() => moveLightbox(1)}
                            style={{
                                position: "absolute",
                                top: "50%",
                                right: -56,
                                transform: "translateY(-50%)",
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                border: "1px solid var(--border)",
                                background: "rgba(255,255,255,0.12)",
                                color: "#fff",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backdropFilter: "blur(2px)",
                            }}
                        >
                            ›
                        </button>
                        <img
                            src={`/api/download?inline=1&key=${encodeURIComponent(lightboxFile.key)}`}
                            alt={lightboxFile.key}
                            style={{
                                maxWidth: "90vw",
                                maxHeight: "85vh",
                                objectFit: "contain",
                                borderRadius: 8,
                                background: "#000",
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
