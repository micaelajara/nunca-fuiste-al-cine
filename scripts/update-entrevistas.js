const fs = require('fs');
const path = require('path');

const DATABASE_ID = '12f47f17-4264-4cb7-a719-e8fd3c3c8886';
const HTML_PATH = path.join(__dirname, '..', 'entrevistas.html');
const START_MARKER = '<!-- ENTREVISTAS:START (generado por scripts/update-entrevistas.js, no editar a mano) -->';
const END_MARKER = '<!-- ENTREVISTAS:END -->';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function modalidadClass(modalidad) {
  return modalidad
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

async function fetchAllPages() {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    throw new Error('Falta la variable NOTION_API_KEY');
  }

  const pages = [];
  let cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
        start_cursor: cursor,
        page_size: 100,
      }),
    });

    if (!res.ok) {
      throw new Error(`Error consultando Notion: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return pages;
}

function parsePage(page) {
  const props = page.properties;
  return {
    nombre: (props['Nombre']?.title || []).map((t) => t.plain_text).join('').trim(),
    fecha: props['Fecha']?.date ? props['Fecha'].date.start : null,
    tema: (props['Tema/motivo']?.rich_text || []).map((t) => t.plain_text).join('').trim(),
    modalidad: props['Modalidad']?.select ? props['Modalidad'].select.name : '',
    destacado: !!props['Destacado']?.checkbox,
    youtube: props['Link YouTube']?.url || null,
  };
}

const YOUTUBE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';

function buildItemHtml(item) {
  const [y, m, d] = item.fecha.split('-').map(Number);
  const fechaTexto = `${String(d).padStart(2, '0')} ${MESES[m - 1]} ${y}`;
  const search = `${item.nombre} ${item.tema}`.toLowerCase();
  const modClass = modalidadClass(item.modalidad);
  const youtubeLink = item.youtube
    ? `\n          <a class="archive-youtube" href="${escapeHtml(item.youtube)}" target="_blank" rel="noopener" aria-label="Ver entrevista en YouTube">${YOUTUBE_ICON}</a>`
    : '';

  return `        <div class="archive-item" data-search="${escapeHtml(search)}" data-destacado="${item.destacado ? 1 : 0}">
          <span class="archive-date">${fechaTexto}</span>
          <div class="archive-info">
            <span class="archive-name">${escapeHtml(item.nombre)}</span>
            <span class="archive-topic">${escapeHtml(item.tema)}</span>
          </div>
          <span class="archive-modalidad archive-modalidad-${modClass}"><span class="dot"></span>${escapeHtml(item.modalidad)}</span>${youtubeLink}
        </div>`;
}

function buildGroups(sortedItems) {
  const byYear = new Map();
  for (const item of sortedItems) {
    const year = item.fecha.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(item);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  const filterButtons = [
    '      <button class="filter-btn" data-filter="destacados" type="button">Destacados</button>',
    ...years.map((y) => `      <button class="filter-btn" data-filter="${y}" type="button">${y}</button>`),
  ].join('\n');

  const groups = years
    .map((year) => {
      const yearItems = byYear.get(year);
      const itemsHtml = yearItems.map(buildItemHtml).join('\n');
      return `    <div class="archive-group" data-year="${year}">
      <h2 class="archive-season-title">${year} <span class="archive-season-count">(${yearItems.length})</span></h2>
      <div class="archive-list">
${itemsHtml}
      </div>
    </div>`;
    })
    .join('\n');

  return { filterButtons, groups };
}

async function main() {
  const pages = await fetchAllPages();
  const items = pages.map(parsePage).filter((i) => i.fecha && i.nombre);

  if (items.length === 0) {
    throw new Error('Notion no devolvió entrevistas con Fecha y Nombre.');
  }

  // Orden descendente por fecha; los empates conservan el orden de creación en Notion
  // (que a su vez sigue el orden original de filas del Excel migrado).
  const sorted = [...items].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  const minDate = items.reduce((min, i) => (i.fecha < min ? i.fecha : min), items[0].fecha);
  const [minY, minM] = minDate.split('-').map(Number);

  const { filterButtons, groups } = buildGroups(sorted);

  const sectionSub = `<p class="section-sub">${sorted.length} entrevistas realizadas desde ${MESES_LARGOS[minM - 1]} de ${minY} hasta hoy: directorxs, productorxs, programadores de festivales y más.</p>`;

  const newBlock = `${START_MARKER}
    ${sectionSub}

    <input type="search" id="archiveSearch" class="archive-search" placeholder="Buscar por nombre o tema..." aria-label="Buscar entrevistas" />

    <div class="archive-filters" id="archiveFilters">
${filterButtons}
    </div>

    <p id="archiveEmpty" class="archive-empty" hidden>No encontramos entrevistas que coincidan con la búsqueda.</p>

${groups}
    ${END_MARKER}`;

  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('No encontré los marcadores ENTREVISTAS:START/END en entrevistas.html');
  }

  const updated = html.slice(0, startIdx) + newBlock + html.slice(endIdx + END_MARKER.length);

  if (updated === html) {
    console.log('Sin cambios: entrevistas.html ya refleja los datos de Notion.');
    return;
  }

  fs.writeFileSync(HTML_PATH, updated);
  console.log(`entrevistas.html actualizado con ${sorted.length} entrevistas.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
