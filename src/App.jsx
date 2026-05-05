import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";

/* Componentes simples para no depender de shadcn/ui */
const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-slate-200 ${className}`}>{children}</div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);

const Button = ({ children, onClick, className = "", disabled = false, variant = "default" }) => {
  const base = "inline-flex items-center justify-center p-3 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const style =
    variant === "outline"
      ? "bg-white text-slate-900 border border-slate-300"
      : "bg-slate-950 text-white border border-slate-950";

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${style} ${className}`}>
      {children}
    </button>
  );
};

const truckItems = [
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

const fleetManagerItems = [
  "Capacitaciones",
  "Revisiones 360",
  "Salida a ruta",
  "Visita agencias",
  "Estudio de llantas",
  "Prog. servicios prev.",
  "Catálogo mensual",
  "WCDP",
  "Inventarios",
  "Multas",
  "SDG mensual",
  "Cuadro de autorizaciones",
  "Programador"
];

const buildItems = (list) =>
  list.map((name) => ({
    name,
    status: "",
    photo: null,
    photoPreview: null,
    comment: ""
  }));

const getSummary = (items) => {
  const buenos = items.filter((i) => i.status === "Bueno").length;
  const malos = items.filter((i) => i.status === "Malo").length;
  const na = items.filter((i) => i.status === "N/A").length;
  const aplicables = buenos + malos;
  const nota = aplicables > 0 ? Math.round((buenos / aplicables) * 100) : 0;
  return { buenos, malos, na, aplicables, nota };
};

export default function App() {
  const [processStarted, setProcessStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [view, setView] = useState("truck");

  const [form, setForm] = useState({
    agencia: "",
    idEquipo: "",
    evaluador: "",
    encargadoFlota: "",
    fecha: new Date().toISOString().slice(0, 10)
  });

  const [currentTruckItems, setCurrentTruckItems] = useState(buildItems(truckItems));
  const [truckInspections, setTruckInspections] = useState([]);
  const [fleetItems, setFleetItems] = useState(buildItems(fleetManagerItems));

  const truckSummary = useMemo(() => getSummary(currentTruckItems), [currentTruckItems]);
  const fleetSummary = useMemo(() => getSummary(fleetItems), [fleetItems]);

  const updateTruckItem = (index, field, value) => {
    setCurrentTruckItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const updateFleetItem = (index, field, value) => {
    setFleetItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handlePhoto = (section, index, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    const setter = section === "truck" ? setCurrentTruckItems : setFleetItems;

    setter((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, photo: file, photoPreview: previewUrl } : item
      )
    );
  };

  const pendingTruckStatus = currentTruckItems.filter((i) => !i.status).length;
  const pendingTruckPhotos = currentTruckItems.filter((i) => i.status && !i.photo).length;

  const canSaveTruck =
    form.agencia &&
    form.idEquipo &&
    form.evaluador &&
    pendingTruckStatus === 0 &&
    pendingTruckPhotos === 0;

  const pendingFleetStatus = fleetItems.filter((i) => !i.status).length;
  const pendingFleetPhotos = fleetItems.filter((i) => i.status && !i.photo).length;
  const fleetCompleted =
    form.encargadoFlota && pendingFleetStatus === 0 && pendingFleetPhotos === 0;

  const hasTruckInspections = truckInspections.length > 0;

  const canFinishProcess =
    form.agencia && form.evaluador && hasTruckInspections && fleetCompleted;

  const addTruckInspection = () => {
    if (!canSaveTruck) return;

    const inspection = {
      idEquipo: form.idEquipo,
      fecha: form.fecha,
      items: currentTruckItems,
      summary: truckSummary
    };

    setTruckInspections((prev) => [...prev, inspection]);
    setForm((prev) => ({
      ...prev,
      idEquipo: "",
      fecha: new Date().toISOString().slice(0, 10)
    }));
    setCurrentTruckItems(buildItems(truckItems));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generateXLSX = () => {
    if (!canFinishProcess) return;

    const truckRows = [];

    truckInspections.forEach((inspection) => {
      inspection.items.forEach((item, index) => {
        truckRows.push({
          Agencia: form.agencia,
          Evaluador: form.evaluador,
          Fecha: inspection.fecha,
          ID_Equipo: inspection.idEquipo,
          Numero_Item: index + 1,
          Item: item.name,
          Resultado: item.status,
          Comentario: item.comment || "",
          Nota_Camion: inspection.summary.nota
        });
      });
    });

    const fleetRows = fleetItems.map((item, index) => ({
      Agencia: form.agencia,
      Evaluador: form.evaluador,
      Fecha: form.fecha,
      Encargado_OPL: form.encargadoFlota,
      Numero_Item: index + 1,
      Item: item.name,
      Resultado: item.status,
      Comentario: item.comment || "",
      Nota_OPL: fleetSummary.nota
    }));

    const wb = XLSX.utils.book_new();

    const wsTrucks = XLSX.utils.json_to_sheet(truckRows);
    const wsFleet = XLSX.utils.json_to_sheet(fleetRows);

    XLSX.utils.book_append_sheet(wb, wsTrucks, "Camiones");
    XLSX.utils.book_append_sheet(wb, wsFleet, "Encargado_OPL");

    XLSX.writeFile(wb, `detalle_inspeccion_${form.agencia}_${form.fecha}.xlsx`);
  };

  const resetAll = () => {
    setProcessStarted(false);
    setStartTime(null);
    setView("truck");
    setTruckInspections([]);
    setCurrentTruckItems(buildItems(truckItems));
    setFleetItems(buildItems(fleetManagerItems));
    setForm({
      agencia: "",
      idEquipo: "",
      evaluador: "",
      encargadoFlota: "",
      fecha: new Date().toISOString().slice(0, 10)
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finishInspection = () => {
    if (!canFinishProcess) return;
    const confirmFinish = window.confirm(
      "¿Finalizar inspección? Se reiniciará el flujo para una nueva evaluación."
    );
    if (!confirmFinish) return;
    resetAll();
  };

  const generatePDF = () => {
    if (!canFinishProcess) return;
    const endTime = new Date();

    const truckBlocks = truckInspections
      .map((inspection, truckIndex) => {
        const rows = inspection.items
          .map(
            (item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td class="${item.status === "Bueno" ? "good" : item.status === "Malo" ? "bad" : "na"}">${item.status}</td>
                <td>${item.comment || ""}</td>
              </tr>`
          )
          .join("");

        const photos = inspection.items
          .map(
            (item, index) => `
              <section class="page">
                <h2>Camión ${inspection.idEquipo} - ${index + 1}. ${item.name}</h2>
                <p><strong>Estado:</strong> ${item.status}</p>
                <p><strong>Comentario:</strong> ${item.comment || "Sin comentario"}</p>
                ${item.photoPreview ? `<img src="${item.photoPreview}" />` : ""}
              </section>`
          )
          .join("");

        return `
          <section class="${truckIndex === 0 ? "" : "page"}">
            <h2>Inspección de camión: ${inspection.idEquipo}</h2>
            <div class="score">Nota camión: ${inspection.summary.nota}%</div>
            <div class="grid">
              <div class="box"><strong>Buenos:</strong> ${inspection.summary.buenos}</div>
              <div class="box"><strong>Malos:</strong> ${inspection.summary.malos}</div>
              <div class="box"><strong>N/A:</strong> ${inspection.summary.na}</div>
              <div class="box"><strong>Aplicables:</strong> ${inspection.summary.aplicables}</div>
            </div>
            <table>
              <thead>
                <tr><th>#</th><th>Ítem</th><th>Estado</th><th>Comentario</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </section>
          ${photos}`;
      })
      .join("");

    const fleetRows = fleetItems
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.name}</td>
            <td class="${item.status === "Bueno" ? "good" : item.status === "Malo" ? "bad" : "na"}">${item.status}</td>
            <td>${item.comment || ""}</td>
          </tr>`
      )
      .join("");

    const fleetPhotos = fleetItems
      .map(
        (item, index) => `
          <section class="page">
            <h2>Encargado OPL - ${index + 1}. ${item.name}</h2>
            <p><strong>Resultado:</strong> ${item.status}</p>
            <p><strong>Comentario:</strong> ${item.comment || "Sin comentario"}</p>
            ${item.photoPreview ? `<img src="${item.photoPreview}" />` : ""}
          </section>`
      )
      .join("");

    const averageTruckScore = Math.round(
      truckInspections.reduce((acc, inspection) => acc + inspection.summary.nota, 0) /
        truckInspections.length
    );

    const html = `
      <html>
        <head>
          <title>Reporte inspección ${form.agencia}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
            h1 { margin-bottom: 4px; }
            .muted { color: #6b7280; }
            .score { font-size: 32px; font-weight: bold; color: #dc2626; border: 2px solid #111827; padding: 12px; text-align: center; margin: 16px 0; }
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
          <h1>Reporte general de inspección</h1>
          <p class="muted">Inspecciones de camiones y atribuciones del encargado OPL</p>

          <div class="grid">
            <div class="box"><strong>Agencia:</strong><br/>${form.agencia}</div>
            <div class="box"><strong>Evaluador:</strong><br/>${form.evaluador}</div>
            <div class="box"><strong>Encargado OPL:</strong><br/>${form.encargadoFlota}</div>
            <div class="box"><strong>Fecha:</strong><br/>${form.fecha}</div>
            <div class="box"><strong>Inicio proceso:</strong><br/>${startTime ? startTime.toLocaleString() : ""}</div>
            <div class="box"><strong>Fin proceso:</strong><br/>${endTime.toLocaleString()}</div>
          </div>

          <div class="score">Promedio camiones: ${averageTruckScore}%</div>
          <div class="score">Resultado encargado OPL: ${fleetSummary.nota}%</div>
          <div class="box"><strong>Camiones inspeccionados:</strong> ${truckInspections
            .map((i) => i.idEquipo)
            .join(", ")}</div>

          ${truckBlocks}

          <section class="page">
            <h2>Atribuciones encargado OPL</h2>
            <div class="score">Resultado: ${fleetSummary.nota}%</div>
            <table>
              <thead>
                <tr><th>#</th><th>Actividad</th><th>Resultado</th><th>Comentario</th></tr>
              </thead>
              <tbody>${fleetRows}</tbody>
            </table>
          </section>
          ${fleetPhotos}

          <script>window.onload = () => window.print();</script>
        </body>
      </html>`;

    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      alert("El navegador bloqueó la ventana emergente. Permite popups para generar el PDF.");
      return;
    }

    reportWindow.document.write(html);
    reportWindow.document.close();
  };

  const ChecklistCard = ({ item, index, section, updateFn }) => (
    <Card key={item.name} className="rounded-2xl shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">
              {index + 1}. {item.name}
            </p>
            <p className="text-xs text-slate-500">Foto obligatoria</p>
          </div>

          {item.status === "Bueno" && <span className="text-xl text-green-600">✓</span>}
          {item.status === "Malo" && <span className="text-xl text-red-600">✕</span>}
          {item.status === "N/A" && <span className="text-xl text-slate-500">−</span>}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {["Bueno", "Malo", "N/A"].map((status) => (
            <Button
              key={status}
              variant={item.status === status ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => updateFn(index, "status", status)}
            >
              {status}
            </Button>
          ))}
        </div>

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-sm">
          <span className="text-lg">📷</span>
          {item.photo ? "Cambiar foto" : "Abrir cámara"}
          <input
            className="hidden"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handlePhoto(section, index, e.target.files?.[0])}
          />
        </label>

        {item.photoPreview && (
          <div className="overflow-hidden rounded-xl border bg-white">
            <img
              src={item.photoPreview}
              alt={`Foto de ${item.name}`}
              className="h-44 w-full object-cover"
            />
            <p className="p-2 text-xs text-slate-500">{item.photo?.name}</p>
          </div>
        )}

        <textarea
          className="w-full rounded-xl border p-3 text-sm"
          rows="2"
          placeholder="Comentario opcional"
          value={item.comment}
          onChange={(e) => updateFn(index, "comment", e.target.value)}
        />
      </CardContent>
    </Card>
  );

  if (!processStarted) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-md items-center">
          <Card className="w-full rounded-2xl shadow-lg">
            <CardContent className="space-y-5 p-6 text-center">
              <div className="rounded-2xl bg-slate-950 p-5 text-white">
                <p className="text-sm text-slate-300">Evaluación operativa</p>
                <h1 className="text-2xl font-bold">Inspección de flota</h1>
                <p className="mt-2 text-sm text-slate-300">
                  Camiones + encargado OPL + PDF final + XLSX.
                </p>
              </div>

              <div className="space-y-2 text-left">
                <p className="text-sm text-slate-600">
                  Al iniciar se registrará la hora de comienzo del proceso.
                </p>
                <p className="text-sm text-slate-600">
                  El fin del proceso se tomará al generar el PDF final o al finalizar inspección.
                </p>
              </div>

              <Button
                className="w-full rounded-xl"
                onClick={() => {
                  setStartTime(new Date());
                  setProcessStarted(true);
                }}
              >
                Iniciar inspección
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" className="rounded-xl" onClick={resetAll}>
            ← Inicio
          </Button>
        </div>

        <header className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg">
          <p className="text-sm text-slate-300">Evaluación operativa</p>
          <h1 className="text-2xl font-bold">Inspección de flota</h1>
          <p className="mt-2 text-sm text-slate-300">
            Camiones + atribuciones del encargado OPL + reporte final.
          </p>
        </header>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="grid grid-cols-2 gap-2 p-4">
            <Button
              className="rounded-xl"
              variant={view === "truck" ? "default" : "outline"}
              onClick={() => setView("truck")}
            >
              Camiones
            </Button>
            <Button
              className="rounded-xl"
              variant={view === "fleet" ? "default" : "outline"}
              onClick={() => setView("fleet")}
            >
              Encargado OPL
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="space-y-3 p-4">
            <h2 className="font-semibold">Datos generales</h2>

            <input
              className="w-full rounded-xl border p-3"
              placeholder="Agencia"
              value={form.agencia}
              onChange={(e) => setForm({ ...form, agencia: e.target.value })}
            />

            <input
              className="w-full rounded-xl border p-3"
              placeholder="Evaluador"
              value={form.evaluador}
              onChange={(e) => setForm({ ...form, evaluador: e.target.value })}
            />

            {view === "truck" && (
              <input
                className="w-full rounded-xl border p-3"
                placeholder="ID del equipo"
                value={form.idEquipo}
                onChange={(e) => setForm({ ...form, idEquipo: e.target.value })}
              />
            )}

            {view === "fleet" && (
              <input
                className="w-full rounded-xl border p-3"
                placeholder="Nombre encargado OPL"
                value={form.encargadoFlota}
                onChange={(e) => setForm({ ...form, encargadoFlota: e.target.value })}
              />
            )}

            <input
              className="w-full rounded-xl border p-3"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </CardContent>
        </Card>

        {view === "truck" && (
          <>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="space-y-3 p-4">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-xl font-bold">{truckSummary.nota}%</p>
                    <p className="text-xs text-slate-500">Nota</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{truckSummary.buenos}</p>
                    <p className="text-xs text-slate-500">Buenos</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{truckSummary.malos}</p>
                    <p className="text-xs text-slate-500">Malos</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{truckSummary.na}</p>
                    <p className="text-xs text-slate-500">N/A</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600">
                  Camiones guardados: <strong>{truckInspections.length}</strong>
                </p>

                {truckInspections.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {truckInspections.map((i) => i.idEquipo).join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>

            <section className="space-y-3">
              <h2 className="font-semibold">Checklist de camión</h2>
              {currentTruckItems.map((item, index) => (
                <ChecklistCard
                  key={item.name}
                  item={item}
                  index={index}
                  section="truck"
                  updateFn={updateTruckItem}
                />
              ))}
            </section>
          </>
        )}

        {view === "fleet" && (
          <>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="grid grid-cols-4 gap-2 p-4 text-center">
                <div>
                  <p className="text-xl font-bold">{fleetSummary.nota}%</p>
                  <p className="text-xs text-slate-500">Resultado</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{fleetSummary.buenos}</p>
                  <p className="text-xs text-slate-500">Buenos</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{fleetSummary.malos}</p>
                  <p className="text-xs text-slate-500">Malos</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{fleetSummary.na}</p>
                  <p className="text-xs text-slate-500">N/A</p>
                </div>
              </CardContent>
            </Card>

            <section className="space-y-3">
              <h2 className="font-semibold">Atribuciones encargado OPL</h2>
              {fleetItems.map((item, index) => (
                <ChecklistCard
                  key={item.name}
                  item={item}
                  index={index}
                  section="fleet"
                  updateFn={updateFleetItem}
                />
              ))}
            </section>
          </>
        )}

        <Card className="sticky bottom-4 rounded-2xl border-slate-300 shadow-xl">
          <CardContent className="space-y-3 p-4">
            {view === "truck" && !canSaveTruck && (
              <p className="text-sm text-red-600">
                Pendiente camión: {pendingTruckStatus} ítems sin estado y {pendingTruckPhotos} ítems sin foto.
              </p>
            )}

            {view === "fleet" && !canFinishProcess && (
              <p className="text-sm text-red-600">
                Pendiente final:{" "}
                {truckInspections.length === 0 ? "guarda al menos un camión. " : ""}
                {!form.encargadoFlota ? "falta encargado OPL. " : ""}
                {pendingFleetStatus} ítems sin estado y {pendingFleetPhotos} ítems sin foto.
              </p>
            )}

            {view === "truck" ? (
              <Button
                className="w-full rounded-xl"
                disabled={!canSaveTruck}
                onClick={addTruckInspection}
              >
                <span className="mr-2">➕</span> Guardar y nuevo camión
              </Button>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <Button
                  className="w-full rounded-xl"
                  disabled={!canFinishProcess}
                  onClick={generatePDF}
                >
                  <span className="mr-2">📄</span> Generar PDF final
                </Button>

                <Button
                  className="w-full rounded-xl"
                  variant="outline"
                  disabled={!canFinishProcess}
                  onClick={generateXLSX}
                >
                  <span className="mr-2">📊</span> Generar XLSX
                </Button>

                <Button
                  className="w-full rounded-xl"
                  variant="outline"
                  disabled={!canFinishProcess}
                  onClick={finishInspection}
                >
                  <span className="mr-2">✅</span> Finalizar inspección
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
