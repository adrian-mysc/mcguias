// ── Certificado · Compartilhar · Clipboard · Toast ────────────

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── Certificado de Conclusão ────────────────────────────────────────────────
window.gerarCertificado = function(score, total, guia) {
  var pct  = total > 0 ? Math.round((score / total) * 100) : 0;
  var guiaNome = (guia || window._quizGuia || 'Treinamento').replace(/_/g, ' ');
  var perfil   = McStorage.get('mc_perfil_dados', {});
  var userName = McStorage.get('mc_username', null) || perfil.apelido || perfil.nome || 'Colaborador';
  var loja     = perfil.loja || perfil.sigla || '';
  var dataStr  = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  var W = 900, H = 620;
  var cv = document.createElement('canvas');
  cv.width  = W * 2; // retina
  cv.height = H * 2;
  cv.style.width  = W + 'px';
  cv.style.height = H + 'px';
  var c = cv.getContext('2d');
  c.scale(2, 2);

  // Fundo branco
  c.fillStyle = '#FFFFFF';
  c.fillRect(0, 0, W, H);

  // Moldura dourada externa
  c.strokeStyle = '#FFC72C';
  c.lineWidth = 6;
  c.strokeRect(14, 14, W - 28, H - 28);
  // Moldura interna fina
  c.lineWidth = 1.5;
  c.strokeRect(22, 22, W - 44, H - 44);

  // Barra vermelha superior
  c.fillStyle = '#DA291C';
  c.fillRect(14, 14, W - 28, 76);

  // Título na barra
  c.fillStyle = '#FFFFFF';
  c.font = 'bold 13px system-ui, sans-serif';
  c.letterSpacing = '3px';
  c.textAlign = 'center';
  c.fillText('MC TREINAMENTOS', W / 2, 44);
  c.font = 'bold 22px system-ui, sans-serif';
  c.letterSpacing = '1px';
  c.fillText('CERTIFICADO DE CONCLUSÃO', W / 2, 72);
  c.letterSpacing = '0px';

  // Ornamento dourado
  c.fillStyle = '#FFC72C';
  c.font = 'bold 28px serif';
  c.fillText('✦  ✦  ✦', W / 2, 130);

  // Texto introdutório
  c.fillStyle = '#777';
  c.font = 'italic 15px Georgia, serif';
  c.fillText('Certificamos que', W / 2, 168);

  // Nome do usuário
  c.fillStyle = '#1a1a1a';
  c.font = 'bold 34px system-ui, sans-serif';
  c.fillText(userName, W / 2, 218);

  // Linha dourada abaixo do nome
  var nameW = Math.min(c.measureText(userName).width + 60, W - 100);
  c.strokeStyle = '#FFC72C';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo((W - nameW) / 2, 228);
  c.lineTo((W + nameW) / 2, 228);
  c.stroke();

  // Texto do guia
  c.fillStyle = '#555';
  c.font = 'italic 15px Georgia, serif';
  c.fillText('concluiu com êxito o guia de treinamento', W / 2, 268);

  c.fillStyle = '#DA291C';
  c.font = 'bold 26px system-ui, sans-serif';
  c.fillText(guiaNome, W / 2, 308);

  // Badge de aproveitamento
  var badgeX = W / 2, badgeY = 375, badgeR = 52;
  c.beginPath();
  c.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  c.fillStyle = pct >= 90 ? '#15803d' : pct >= 70 ? '#1d4ed8' : '#92400e';
  c.fill();
  c.strokeStyle = '#FFC72C';
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = '#FFFFFF';
  c.font = 'bold 28px system-ui, sans-serif';
  c.fillText(pct + '%', badgeX, badgeY + 5);
  c.font = '11px system-ui, sans-serif';
  c.fillText(score + '/' + total + ' acertos', badgeX, badgeY + 22);

  // Linha separadora
  c.strokeStyle = '#FFC72C';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(60, 450);
  c.lineTo(W - 60, 450);
  c.stroke();

  // Rodapé
  c.fillStyle = '#999';
  c.font = '12px system-ui, sans-serif';
  c.textAlign = 'left';
  c.fillText(loja ? 'Loja: ' + loja : '', 60, 478);
  c.textAlign = 'right';
  c.fillText(dataStr, W - 60, 478);
  c.textAlign = 'center';
  c.font = '10px system-ui, sans-serif';
  c.fillText('Documento gerado automaticamente · MC Guias de Treinamento', W / 2, 510);

  // Download
  cv.toBlob(function(blob) {
    var url  = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href     = url;
    link.download = 'certificado-' + guiaNome.toLowerCase().replace(/\s+/g, '-') + '.png';
    link.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 3000);
  }, 'image/png');
};

window.shareQuizResult = function(score, total, guia) {
  var g = guia || window._quizGuia || 'Simulado';
  var pct;
  if (total && typeof score === 'number') {
    pct = Math.round((score / total) * 100);
  } else {
    pct = parseInt(score, 10) || 0;
    total = null;
  }
  var medal  = pct >= 90 ? '🏆' : pct >= 80 ? '⭐' : pct >= 60 ? '👍' : '📖';
  var nivel  = pct >= 90 ? 'Excelente!' : pct >= 80 ? 'Muito bom!' : pct >= 60 ? 'Bom trabalho!' : 'Continue estudando!';
  var bars   = '';
  var filled = Math.round(pct / 10);
  for (var i = 0; i < 10; i++) bars += (i < filled ? '🟩' : '⬜');
  var guiaLabel  = g.replace(/\s*✏️\s*$/, '').trim();
  var scoreStr   = total ? (score + '/' + total + ' (' + pct + '%)') : (pct + '%');
  var text = medal + ' ' + nivel + '\n'
           + '📋 Guia: ' + guiaLabel + '\n'
           + '✅ ' + scoreStr + '\n'
           + bars + '\n'
           + '📱 MC Guias — Treine onde estiver\n'
           + '🔗 mc-guias.github.io/mcguias/';
  if (navigator && navigator.share) {
    navigator.share({ title: 'MC Guias — ' + guiaLabel, text: text })
      .catch(function() { mcCopyToClipboard(text); });
    return;
  }
  mcCopyToClipboard(text);
};

function mcCopyToClipboard(text) {
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(function() { mcShowToast('✅ Resultado copiado!', false); })
      .catch(function() { mcExecCopy(text); });
    return;
  }
  mcExecCopy(text);
}

function mcExecCopy(text) {
  try {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    mcShowToast(ok ? '✅ Resultado copiado!' : '⚠️ Não foi possível copiar', !ok);
  } catch(e) {
    mcShowToast('⚠️ Não foi possível copiar', true);
  }
}

function mcShowToast(msg, isWarn) {
  var old = document.getElementById('mc-toast');
  if (old) old.remove();
  var toast = document.createElement('div');
  toast.id = 'mc-toast';
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);'
    + 'background:' + (isWarn ? '#f57f17' : '#1b5e20') + ';color:#fff;'
    + 'padding:11px 20px;border-radius:24px;font-size:14px;font-weight:700;'
    + 'z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.25);white-space:nowrap;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.remove(); }, 2800);
}
