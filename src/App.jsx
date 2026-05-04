import React, { useMemo, useState } from "react";
import "./App.css";

const initialItems = [
  "Documentación actualizada",
  "Cabina",
  "Estado de llantas",
  "Herramienta básica",
  "Sistema de frenos",
  "Nivel de líquido de frenos",
  "Nivel de aceite de motor",
  "Nivel de líquido hidráulico",
  "Sistema de embrague",
  "Suspensión",
  "Sistema eléctrico",
  "Sistema de refrigeración",
  "Cumplimiento 360",
  "Marcaje de batería",
  "Marcaje de filtros",
  "Marcaje de llantas",
  "Servicio al día",
  "Candado en tanque de combustible",
  "Limpieza de camión"
];

export default function App() {
  const [form, setForm] = useState({
    agencia: "",
    idEquipo: "",
    evaluador: "",
    fecha: new Date().toISOString().slice(0, 10)
  });

  const [items, setItems] = useState(
    initialItems.map((name) => ({
      name,
      status: "",
      photo: null,
      photoPreview: null,
      comment: ""
    }))
  );

  const summary = useMemo(() => {
    const buenos = items.filter((i) => i.status === "Bueno").length;
    const malos = items.filter((i) => i.status === "Malo").length;
    const na = items.filter((i) => i.status === "N/A").length;
    const aplicables = buenos + malos;
    const nota = aplicables > 0 ? Math.round((buenos / aplicables) * 100) : 0;
    return { buenos, malos, na, aplicables, nota };
  }, [items]);

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handlePhoto = (index, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, photo: file, photoPreview: previewUrl } : item
      )
    );
  };

  const pendingPhotos = items.filter((i) => i.status && !i.photo).length;
  const pendingStatus = items.filter((i) => !i.status).length;
  const canGenerate =
    form.agencia &&
    form.idEquipo &&
    form.evaluador &&
    pendingPhotos === 0 &&
    pendingStatus === 0;

  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const generatePDF = () => {
    if (!canGenerate) return;

    const rows = items
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.name)}</td>
            <td class="${item.status === "Bueno" ? "good" : item.status === "Malo" ? "bad" : "na"}">${escapeHtml(item.status)}</td>
            <td>${escapeHtml(item.comment)}</td>
          </tr>`
      )
      .join("");

    const photoPages = items
      .map(
        (item, index) => `
          <section class="page">
            <h2>${index + 1}. ${escapeHtml(item.name)}</h2>
            <p><strong>Estado:</strong> ${escapeHtml(item.status)}</p>
            <p><strong>Comentario:</strong> ${escapeHtml(item.comment || "Sin comentario")}</p>
            ${item.photoPreview ? `<img src="${item.photoPreview}" />` : ""}
          </section>`
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Inspección ${escapeHtml(form.idEquipo)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
            h1 { margin-bottom: 4px; }
            .muted { color: #6b7280; }
            .score { font-size: 42px; font-weight: bold; color: #dc2626; border: 2px solid #111827; padding: 12px; text-align: center; margin: 20px 0; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 16px 0; }
            .box { border: 1px solid #d1d5db; padding: 10px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
            th { background: #1f4e79; color: white; }
            .good { color: #15803d; font-weight: bold; }
            .bad { color: #dc2626; font-weight: bold; }
            .na { color: #64748b; font-weight: bold; }
            .page { page-break-before: always; }
            .page img { width: 100%; max-height: 720px; object-fit: contain; border: 1px solid #d1d5db; margin-top: 12px; }
          </style>
        </head>
        <body>
          <h1>Reporte de inspección de camión</h1>
          <p class="muted">Checklist con evidencia fotográfica</p>
          <div class="grid">
            <div class="box"><strong>Agencia:</strong><br/>${escapeHtml(form.agencia)}</div>
            <div class="box"><strong>ID equipo:</strong><br/>${escapeHtml(form.idEquipo)}</div>
            <div class="box"><strong>Evaluador:</strong><br/>${escapeHtml(form.evaluador)}</div>
            <div class="box"><strong>Fecha:</strong><br/>${escapeHtml(form.fecha)}</div>
          </div>
          <div class="score">NOTA DE AGENCIA: ${summary.nota}%</div>
          <div class="grid">
            <div class="box"><strong>Buenos:</strong> ${summary.buenos}</div>
            <div class="box"><strong>Malos:</strong> ${summary.malos}</div>
            <div class="box"><strong>N/A:</strong> ${summary.na}</div>
            <div class="box"><strong>Aplicables:</strong> ${summary.aplicables}</div>
          </div>
          <h2>Resumen de evaluación</h2>
          <table>
            <thead>
              <tr><th>#</th><th>Ítem</th><th>Estado</th><th>Comentario</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${photoPages}
          <script>
            window.onload = () => setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `;

    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      alert("El navegador bloqueó la ventana emergente. Permite popups para generar el PDF.");
      return;
    }
    reportWindow.document.write(html);
    reportWindow.document.close();
  };

  return (
    <main className="app">
      <div className="container">
        <header className="hero">
          <p>Evaluación operativa</p>
          <h1>Inspección de camión</h1>
          <span>Checklist con evidencia fotográfica y reporte PDF.</span>
        </header>

        <section className="card">
          <h2>Datos generales</h2>
          <input placeholder="Agencia" value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} />
          <input placeholder="ID del equipo" value={form.idEquipo} onChange={(e) => setForm({ ...form, idEquipo: e.target.value })} />
          <input placeholder="Evaluador" value={form.evaluador} onChange={(e) => setForm({ ...form, evaluador: e.target.value })} />
          <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
        </section>

        <section className="card summary">
          <div><strong>{summary.nota}%</strong><span>Nota</span></div>
          <div><strong>{summary.buenos}</strong><span>Buenos</span></div>
          <div><strong>{summary.malos}</strong><span>Malos</span></div>
          <div><strong>{summary.na}</strong><span>N/A</span></div>
        </section>

        <section className="list">
          <h2>Checklist</h2>
          {items.map((item, index) => (
            <article key={item.name} className="card item">
              <div className="itemHead">
                <div>
                  <h3>{index + 1}. {item.name}</h3>
                  <small>Foto obligatoria</small>
                </div>
                {item.status === "Bueno" && <b className="good">✓</b>}
                {item.status === "Malo" && <b className="bad">✕</b>}
                {item.status === "N/A" && <b className="na">−</b>}
              </div>

              <div className="actions">
                {["Bueno", "Malo", "N/A"].map((status) => (
                  <button
                    key={status}
                    className={item.status === status ? "active" : ""}
                    onClick={() => updateItem(index, "status", status)}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <label className="camera">
                <span>📷</span>
                {item.photo ? "Cambiar foto" : "Abrir cámara"}
                <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhoto(index, e.target.files?.[0])} />
              </label>

              {item.photoPreview && (
                <div className="preview">
                  <img src={item.photoPreview} alt={`Foto de ${item.name}`} />
                  <small>{item.photo?.name}</small>
                </div>
              )}

              <textarea rows="2" placeholder="Comentario opcional" value={item.comment} onChange={(e) => updateItem(index, "comment", e.target.value)} />
            </article>
          ))}
        </section>

        <footer className="footer card">
          {!canGenerate && (
            <p>Pendiente: {pendingStatus} ítems sin estado y {pendingPhotos} ítems sin foto.</p>
          )}
          <div className="footerBtns">
            <button className="secondary">💾 Guardar</button>
            <button disabled={!canGenerate} onClick={generatePDF}>📄 PDF</button>
          </div>
        </footer>
      </div>
    </main>
  );
}
