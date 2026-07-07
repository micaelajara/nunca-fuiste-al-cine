const fs = require('fs');
const path = require('path');

const SHOW_ID = '7GVR3qZjFmv0jUiz4pH39w';
const INDEX_PATH = path.join(__dirname, '..', 'index.html');

async function getAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Faltan las variables SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Error pidiendo token de Spotify: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function getLatestEpisodeId(token) {
  const res = await fetch(
    `https://api.spotify.com/v1/shows/${SHOW_ID}/episodes?limit=5&market=AR`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    throw new Error(`Error pidiendo episodios: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const episodes = (data.items || []).filter(Boolean);

  if (episodes.length === 0) {
    throw new Error('Spotify no devolvió episodios para este show');
  }

  episodes.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
  return episodes[0].id;
}

async function main() {
  const token = await getAccessToken();
  const latestId = await getLatestEpisodeId(token);

  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const episodePattern = /open\.spotify\.com\/embed\/episode\/[a-zA-Z0-9]+/;
  const match = html.match(episodePattern);

  if (!match) {
    throw new Error('No encontré el iframe del episodio en index.html');
  }

  const currentId = match[0].split('/').pop();

  if (currentId === latestId) {
    console.log(`Ya está el último episodio (${latestId}). Nada para actualizar.`);
    return;
  }

  const updated = html.replace(episodePattern, `open.spotify.com/embed/episode/${latestId}`);
  fs.writeFileSync(INDEX_PATH, updated);
  console.log(`Episodio actualizado: ${currentId} -> ${latestId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
