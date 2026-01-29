async function load() {
  const res = await fetch("./data.json", { cache: "no-store" });
  const data = await res.json();

  const meta = document.getElementById("meta");
  meta.textContent = data.generatedAt ? `Son güncelleme: ${data.generatedAt}` : "Henüz veri yok (ilk action koşunca gelecek).";

  const cards = document.getElementById("cards");
  cards.innerHTML = "";

  for (const t of (data.targets || [])) {
    const ok = t.last?.ok;
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="row">
        <strong>${t.name}</strong>
        <span class="badge ${ok ? "up" : "down"}">${ok ? "UP" : "DOWN"}</span>
      </div>
      <div class="row"><span>URL</span><a href="${t.url}" target="_blank" rel="noreferrer">aç</a></div>
      <div class="row"><span>Son kontrol</span><span>${t.last?.t || "-"}</span></div>
      <div class="row"><span>Latency</span><span>${t.last?.ms ?? "-"} ms</span></div>
      <div class="row"><span>Uptime (24h)</span><span>${t.uptime24h ?? "-"}%</span></div>
      <div class="row"><span>p95 (24h)</span><span>${t.p95ms24h ?? "-"} ms</span></div>
      <canvas height="80"></canvas>
    `;

    cards.appendChild(card);

    const canvas = card.querySelector("canvas");
    const labels = (t.history || []).map(x => x.t.slice(11, 16));
    const values = (t.history || []).map(x => x.ok ? x.ms : null);

    // basit sparkline
    new Chart(canvas, {
      type: "line",
      data: { labels, datasets: [{ label: "ms", data: values, spanGaps: true, pointRadius: 0, borderWidth: 2 }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
  }
}

load();
