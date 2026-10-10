// =====================================================================
// dashboard.js — frontend   [ANSWER KEY]
// =====================================================================

let charactersById = new Map();
let allCharacters = [];

// ---------- TODO 5: โหลด 3 endpoint พร้อมกันด้วย Promise.all() ----------
async function loadDashboard() {
  const algo = document.getElementById('algo').value;
  try {
    const [cRes, wRes, hRes] = await Promise.all([
      fetch(`/characters?sort=${algo}`),
      fetch('/watchlist'),
      fetch('/history'),
    ]);

    if (!cRes.ok || !wRes.ok || !hRes.ok) throw new Error('เซิร์ฟเวอร์ตอบข้อมูลไม่สำเร็จ');

    const characters = await cRes.json();
    const watchlist  = await wRes.json();
    const history    = await hRes.json();

    renderCharacters(characters);
    renderWatchlist(watchlist);
    renderHistory(history);
    showError('');
  } catch (err) {
    showError('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
  }
}

function showError(msg) {
  const box = document.getElementById('error');
  box.textContent = msg;
  box.style.display = msg ? 'block' : 'none';
}

// ---------- render ----------
function renderCharacters(res) {
  allCharacters = res.data;
  charactersById = new Map(allCharacters.map(character => [String(character.id), character]));
  document.getElementById('sortInfo').textContent =
    `${res.algorithm} · ${res.count} ตัวละคร · ${res.ms} ms`;
  filterCharacters();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

function filterCharacters() {
  const query = document.getElementById('search').value.trim().toLowerCase();
  const rarity = document.getElementById('rarityFilter').value;
  const filtered = allCharacters.filter(character => {
    const matchesQuery = character.name.toLowerCase().includes(query);
    const matchesRarity = rarity === 'all' || String(character.rarity) === rarity;
    return matchesQuery && matchesRarity;
  });

  document.getElementById('visibleCount').textContent = filtered.length;
  document.getElementById('totalCount').textContent = allCharacters.length;
  document.getElementById('characters').innerHTML = filtered.length === 0
    ? '<div class="empty-results">ไม่พบตัวละครที่ตรงกับการค้นหา</div>'
    : filtered.map(c => `
    <div class="card" data-character-id="${escapeHtml(c.id)}" role="button" tabindex="0">
      <img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.name)}" loading="lazy">
      <div class="info">
        <strong>${escapeHtml(c.name)}</strong>
        <span class="meta">${escapeHtml(c.path)} · ${escapeHtml(c.element)}</span>
        <span class="eps">${escapeHtml(c.rarity)} ดาว</span>
      </div>
      <button class="queue-button" data-character-id="${escapeHtml(c.id)}">+ คิว</button>
    </div>
  `).join('');

  document.querySelectorAll('.card').forEach(card => {
    const id = card.dataset.characterId;
    card.addEventListener('click', () => showCharacter(id));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        showCharacter(id);
      }
    });
  });
  document.querySelectorAll('.queue-button').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      addToWatchlist(button.dataset.characterId);
    });
  });
}

function showCharacter(id) {
  const character = charactersById.get(String(id));
  if (!character) return;

  document.getElementById('modalImage').src = character.image;
  document.getElementById('modalImage').alt = character.name;
  document.getElementById('modalName').textContent = character.name;
  document.getElementById('modalRarity').textContent = `${character.rarity} ดาว`;
  document.getElementById('modalPath').textContent = character.path;
  document.getElementById('modalElement').textContent = character.element;
  document.getElementById('characterModal').classList.add('open');
  document.getElementById('modalClose').focus();
}

function closeCharacterModal() {
  document.getElementById('characterModal').classList.remove('open');
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeCharacterModal();
});

document.getElementById('search').addEventListener('input', filterCharacters);
document.getElementById('rarityFilter').addEventListener('change', filterCharacters);

function renderWatchlist(res) {
  document.getElementById('queueSize').textContent = res.size;
  document.getElementById('watchlist').innerHTML = res.size === 0
    ? '<li class="empty">คิวว่าง</li>'
    : res.items.map((c, i) => `<li>${i + 1}. ${c.name}</li>`).join('');
}

function renderHistory(res) {
  document.getElementById('history').innerHTML = res.size === 0
    ? '<li class="empty">ยังไม่มีประวัติ</li>'
    : res.history.map(h => `<li><b>${h.action}</b> ${h.character.name} <span>${h.time}</span></li>`).join('');
}

// ---------- actions ----------
async function addToWatchlist(id) {
  try {
    const res = await fetch('/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    await loadDashboard();
  } catch (err) {
    showError(err.message);
  }
}

async function processQueue() {
  try {
    const res = await fetch('/watchlist/process', { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error);
    await loadDashboard();
  } catch (err) {
    showError(err.message);
  }
}

async function undo() {
  try {
    const res = await fetch('/undo', { method: 'POST' });
    if (!res.ok) throw new Error((await res.json()).error);
    await loadDashboard();
  } catch (err) {
    showError(err.message);
  }
}

window.addEventListener('load', loadDashboard);
window.addEventListener('load', () => {
  if (!window.location.hash) {
    window.history.replaceState(null, '', '#character-section');
    document.getElementById('character-section').scrollIntoView();
  }
});
