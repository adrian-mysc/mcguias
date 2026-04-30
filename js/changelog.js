/* =============================================================
   changelog.js — MC Guias
   Carrega /guiaoperacional/changelog.json e renderiza o painel
   de Novidades dinamicamente.
   ============================================================= */

(function () {
  'use strict';

  // ── Estado ──────────────────────────────────────────────────
  let changelogLoaded = false;

  // ── Labels e mapeamentos ─────────────────────────────────────
  const TAG_LABELS = {
    guia:    'Guia',
    quiz:    'Quiz',
    sistema: 'Sistema',
    bug:     'Bug',
  };

  // ── Utilitários ──────────────────────────────────────────────

  /**
   * Converte **texto** em <strong>texto</strong>.
   * Não usa innerHTML arbitrário — só aplica negrito simples.
   */
  function parseMd(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  function tagLabel(tag) {
    return TAG_LABELS[tag] || tag;
  }

  // ── Renderização ─────────────────────────────────────────────

  function renderItem(item) {
    return `
      <div class="cl-item">
        <div class="cl-item-icon">${item.icon}</div>
        <div class="cl-item-text">${parseMd(item.text)}</div>
        <span class="cl-tag ${item.tag}">${tagLabel(item.tag)}</span>
      </div>`;
  }

  function renderVersion(v) {
    const items = v.items.map(renderItem).join('');
    return `
      <div class="cl-entry">
        <div class="cl-date-row">
          <span class="cl-date">${v.date_display}</span>
          <div class="cl-date-line"></div>
          <span class="cl-badge ${v.badge_type}">${v.badge}</span>
        </div>
        <div class="cl-items">${items}</div>
      </div>`;
  }

  function renderCredit() {
    return `
      <div style="text-align:center;padding:4px 0 8px;">
        <span style="font-size:11px;color:var(--muted);">
          Desenvolvido por <strong style="color:var(--text);">Adrian E. Silva</strong>
        </span>
      </div>`;
  }

  function renderError() {
    return `
      <div style="text-align:center;padding:32px 16px;color:var(--muted);">
        <div style="font-size:32px;margin-bottom:10px;">⚠️</div>
        <div style="font-size:13px;">Não foi possível carregar o changelog.<br>Tente novamente mais tarde.</div>
      </div>`;
  }

  function renderLoading() {
    return `
      <div style="text-align:center;padding:32px 16px;color:var(--muted);">
        <div style="font-size:13px;">Carregando...</div>
      </div>`;
  }

  // ── Fetch e injeção ──────────────────────────────────────────

  async function loadChangelog() {
    const body = document.getElementById('clBody');
    if (!body) return;

    // Exibe estado de carregamento imediatamente
    body.innerHTML = renderLoading();

    try {
      // Busca o JSON — caminho relativo funciona tanto em
      // localhost quanto no GitHub Pages (/guiaoperacional/)
      const res = await fetch('changelog.json');

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (!data.versions || !Array.isArray(data.versions)) {
        throw new Error('Formato inválido');
      }

      body.innerHTML =
        renderCredit() +
        data.versions.map(renderVersion).join('');

    } catch (err) {
      console.warn('[MC Guias] Changelog não carregado:', err.message);
      body.innerHTML = renderError();
      // Permite nova tentativa na próxima abertura
      changelogLoaded = false;
    }
  }

  // ── Inicialização ────────────────────────────────────────────

  function init() {
    const btn     = document.getElementById('changelogBtn');
    const overlay = document.getElementById('clOverlay');
    const close   = document.getElementById('clClose');

    if (!btn || !overlay) return;

    // Abre o painel e carrega sob demanda (evita fetch desnecessário)
    btn.addEventListener('click', function () {
      overlay.classList.add('open');
      if (!changelogLoaded) {
        loadChangelog().then(function () {
          changelogLoaded = true;
        });
      }
    });

    // Fecha ao clicar no botão ✕
    if (close) {
      close.addEventListener('click', function () {
        overlay.classList.remove('open');
      });
    }

    // Fecha ao clicar fora do sheet
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  }

  // Aguarda o DOM antes de registrar os listeners
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
