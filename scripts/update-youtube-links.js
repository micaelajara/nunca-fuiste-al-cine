const DATABASE_ID = '12f47f17-4264-4cb7-a719-e8fd3c3c8886';
const PLAYLIST_ID = 'PLKCQZewAjTBrK65hlG8FQcP1O52GnAi6L';

function normalize(str) {
  return String(str)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPlaylistEntries() {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`);
  if (!res.ok) {
    throw new Error(`Error consultando el feed de YouTube: ${res.status} ${await res.text()}`);
  }
  const xml = await res.text();

  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml))) {
    const block = match[1];
    const idMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = block.match(/<title>([^<]*)<\/title>/);
    if (idMatch && titleMatch) {
      entries.push({ videoId: idMatch[1], title: titleMatch[1] });
    }
  }
  return entries;
}

async function notionQuery(token, sql) {
  const res = await fetch('https://api.notion.com/v1/databases/' + DATABASE_ID + '/query', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 100 }),
  });
  if (!res.ok) {
    throw new Error(`Error consultando Notion: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function fetchAllRows(token) {
  const rows = [];
  let cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ start_cursor: cursor, page_size: 100 }),
    });
    if (!res.ok) {
      throw new Error(`Error consultando Notion: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    rows.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return rows.map((page) => ({
    id: page.id,
    nombre: (page.properties['Nombre']?.title || []).map((t) => t.plain_text).join('').trim(),
    link: page.properties['Link YouTube']?.url || null,
  }));
}

async function updateLink(token, pageId, url) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ properties: { 'Link YouTube': { url } } }),
  });
  if (!res.ok) {
    throw new Error(`Error actualizando ${pageId}: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    throw new Error('Falta la variable NOTION_API_KEY');
  }

  const [entries, rows] = await Promise.all([fetchPlaylistEntries(), fetchAllRows(token)]);

  const linkedVideoIds = new Set(
    rows
      .map((r) => r.link)
      .filter(Boolean)
      .map((url) => {
        const m = url.match(/[?&]v=([^&]+)/);
        return m ? m[1] : null;
      })
  );

  const unlinkedRows = rows.filter((r) => !r.link);

  let updated = 0;
  for (const entry of entries) {
    if (linkedVideoIds.has(entry.videoId)) continue; // ya vinculado a alguna fila

    const normalizedTitle = normalize(entry.title);
    const candidates = unlinkedRows.filter((r) => {
      const normalizedName = normalize(r.nombre);
      return normalizedName && normalizedTitle.includes(normalizedName);
    });

    if (candidates.length === 0) {
      console.log(`Sin candidato para "${entry.title}" (${entry.videoId}) — omitido.`);
      continue;
    }

    // Si el mismo nombre matchea más de una fila sin vincular, es ambiguo: no tocar ninguna.
    const nombresUnicos = new Set(candidates.map((c) => normalize(c.nombre)));
    if (nombresUnicos.size < candidates.length) {
      console.log(`Match ambiguo para "${entry.title}" (${entry.videoId}) — omitido, requiere revisión manual.`);
      continue;
    }

    const url = `https://www.youtube.com/watch?v=${entry.videoId}`;
    for (const candidate of candidates) {
      await updateLink(token, candidate.id, url);
      console.log(`Vinculado: ${candidate.nombre} -> ${url}`);
      updated += 1;
    }
  }

  console.log(`Listo. ${updated} fila(s) actualizadas.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
