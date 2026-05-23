#!/usr/bin/env python3
"""
Extrai perguntas de provas-testes.html e salva em JSONs temáticos para o sistema de batalha.
"""

import re
import json
import os
import sys

# ── Caminhos ──────────────────────────────────────────────────────────────────
HTML_FILE = "/home/user/mcguias/pages/provas-testes.html"
OUT_BASE  = "/home/user/mcguias/data/questions"

# ── Agrupamentos temáticos ────────────────────────────────────────────────────
GRUPOS = {
    "treinador": ["pre-prova-treinador", "avaliacao-treinador-2018",
                  "avaliacao-treinador-ga", "teste-treinador-coach"],
    "gerencia":  ["gerente-de-turno", "gerente-de-plantao"],
    "lideranca": ["recrutamento-interno", "prova-supervisor"],
}

# ── Subcategorias por ID de prova ─────────────────────────────────────────────
SUBCATEGORIAS = {
    "pre-prova-treinador":      "🎓 PDT · Treinador",
    "avaliacao-treinador-2018": "📋 Avaliação · Treinador 2018",
    "avaliacao-treinador-ga":   "📊 Avaliação · Treinador GA",
    "teste-treinador-coach":    "🏆 Teste · Coach",
    "gerente-de-turno":         "⏱️ Gerente de Turno",
    "gerente-de-plantao":       "🌙 Gerente de Plantão",
    "recrutamento-interno":     "🔍 Recrutamento Interno",
    "prova-supervisor":         "👔 Supervisor",
}

# ── Leitura do arquivo ─────────────────────────────────────────────────────────
with open(HTML_FILE, encoding="utf-8") as f:
    html = f.read()

# ── Extração do bloco JS: const PROVAS = [ ... ]; (antes de QUIZ_PROVAS) ──────
# Encontra início do array
start_marker = "const PROVAS = ["
start_idx = html.index(start_marker) + len(start_marker) - 1  # posição do '['

# Encontra o ']' correspondente contando brackets
depth = 0
end_idx = None
for i in range(start_idx, len(html)):
    c = html[i]
    if c == '[':
        depth += 1
    elif c == ']':
        depth -= 1
        if depth == 0:
            end_idx = i
            break

if end_idx is None:
    print("ERRO: não encontrou o fim do array PROVAS", file=sys.stderr)
    sys.exit(1)

js_block = html[start_idx:end_idx + 1]
print(f"Bloco JS extraído: {len(js_block)} caracteres")

# ── Parse via json5 / fix-up ──────────────────────────────────────────────────
# O JS é quase JSON – precisa de alguns ajustes:
# 1. Remover comentários JS  // ...
# 2. Remover trailing commas antes de } ou ]

def js_to_json(s):
    # Remove comentários de linha // ... (fora de strings)
    # Estratégia simples: percorre char a char rastreando strings
    result = []
    i = 0
    in_str = False
    str_char = None
    while i < len(s):
        c = s[i]
        if in_str:
            if c == '\\':
                result.append(c)
                result.append(s[i+1])
                i += 2
                continue
            if c == str_char:
                in_str = False
            result.append(c)
            i += 1
        else:
            if c in ('"', "'"):
                in_str = True
                str_char = c
                result.append(c)
                i += 1
            elif c == '/' and i + 1 < len(s) and s[i+1] == '/':
                # skip till end of line
                while i < len(s) and s[i] != '\n':
                    i += 1
            else:
                result.append(c)
                i += 1
    cleaned = ''.join(result)

    # Convert single-quoted strings to double-quoted
    # Only safe to do outside of double-quoted strings
    # We'll do a careful pass
    out = []
    i = 0
    in_dstr = False
    while i < len(cleaned):
        c = cleaned[i]
        if in_dstr:
            if c == '\\':
                out.append(c)
                out.append(cleaned[i+1])
                i += 2
                continue
            if c == '"':
                in_dstr = False
            out.append(c)
            i += 1
        else:
            if c == '"':
                in_dstr = True
                out.append(c)
                i += 1
            elif c == "'":
                # single-quoted string: convert to double
                out.append('"')
                i += 1
                while i < len(cleaned):
                    cc = cleaned[i]
                    if cc == '\\':
                        nxt = cleaned[i+1]
                        if nxt == "'":
                            # escaped single quote -> just single quote
                            out.append("'")
                            i += 2
                        else:
                            out.append(cc)
                            out.append(nxt)
                            i += 2
                        continue
                    if cc == "'":
                        out.append('"')
                        i += 1
                        break
                    if cc == '"':
                        out.append('\\"')
                        i += 1
                    else:
                        out.append(cc)
                        i += 1
            else:
                out.append(c)
                i += 1
    cleaned = ''.join(out)

    # Remove trailing commas: ,\s*} or ,\s*]
    cleaned = re.sub(r',(\s*[}\]])', r'\1', cleaned)

    # Unquoted keys: word: -> "word":
    cleaned = re.sub(r'(?<!["\w])(\b[a-zA-Z_][a-zA-Z0-9_]*\b)\s*:', r'"\1":', cleaned)

    return cleaned

json_str = js_to_json(js_block)

try:
    provas = json.loads(json_str)
    print(f"Parse JSON OK — {len(provas)} provas encontradas")
except json.JSONDecodeError as e:
    print(f"ERRO no parse JSON: {e}", file=sys.stderr)
    # Show context around error
    pos = e.pos
    print(f"Contexto: ...{repr(json_str[max(0,pos-100):pos+100])}...", file=sys.stderr)
    sys.exit(1)

# ── Resumo das provas ──────────────────────────────────────────────────────────
for p in provas:
    print(f"  {p['id']}: {len(p['perguntas'])} perguntas")

# ── Conversão para schema de batalha ──────────────────────────────────────────
def make_question(prova_id, categoria, seq_num, q):
    return {
        "id": f"{categoria}_{seq_num:03d}",
        "categoria": categoria,
        "subcategoria": SUBCATEGORIAS.get(prova_id, prova_id),
        "dificuldade": 2,
        "tipo": "multipla_escolha",
        "tags": [],
        "pergunta": q["texto"],
        "alternativas": q["opcoes"],
        "respostaCorreta": q["correta"],
        "explicacao": q.get("explicacao", ""),
        "dica": "",
        "tempoEstimado": 15,
        "xp": 10,
        "peso": 1,
        "frequenciaErro": 0,
        "taxaAcertoGlobal": 0,
        "timesAnswered": 0,
        "mediaTempoResposta": 0,
        "ativo": True,
        "reviewData": {
            "facilidade": 2.5,
            "intervalo": 1,
            "ultimaRevisao": None,
            "proximaRevisao": None,
            "nivelDominio": 0
        },
        "errorStats": {
            "timesWrong": 0,
            "timesCorrect": 0,
            "weaknessScore": 0
        },
        "analytics": {
            "globalAccuracy": 0,
            "averageTime": 0,
            "dropRate": 0
        },
        "contextHints": [],
        "relatedQuestions": []
    }

# Indexa provas por id
provas_by_id = {p["id"]: p for p in provas}

# ── Gera e salva os 3 arquivos ─────────────────────────────────────────────────
total_questions = 0
all_ids = []

for categoria, prova_ids in GRUPOS.items():
    questions = []
    seq = 1
    for pid in prova_ids:
        if pid not in provas_by_id:
            print(f"  AVISO: prova '{pid}' não encontrada no HTML")
            continue
        prova = provas_by_id[pid]
        for q in prova["perguntas"]:
            questions.append(make_question(pid, categoria, seq, q))
            seq += 1

    # Validação de IDs únicos dentro do grupo
    ids = [q["id"] for q in questions]
    duplicates = [id_ for id_ in ids if ids.count(id_) > 1]
    if duplicates:
        print(f"  ERRO: IDs duplicados em '{categoria}': {set(duplicates)}", file=sys.stderr)
        sys.exit(1)

    all_ids.extend(ids)

    output = {
        "version": "1.0.0",
        "updatedAt": "2026-05-23",
        "categoria": categoria,
        "nivel": "basico",
        "questions": questions
    }

    # Cria diretório se necessário
    out_dir = os.path.join(OUT_BASE, categoria)
    os.makedirs(out_dir, exist_ok=True)

    out_path = os.path.join(out_dir, "basico.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    total_questions += len(questions)
    print(f"  Salvo: {out_path} ({len(questions)} perguntas)")

    # Valida o JSON salvo
    with open(out_path, encoding="utf-8") as f:
        check = json.load(f)
    assert len(check["questions"]) == len(questions), "Contagem incorreta após salvar!"
    print(f"    Validado OK — {len(check['questions'])} perguntas, JSON válido")

# Verificar IDs duplicados entre grupos
global_dups = [id_ for id_ in all_ids if all_ids.count(id_) > 1]
if global_dups:
    print(f"AVISO: IDs duplicados entre grupos: {set(global_dups)}")
else:
    print(f"\nTotal: {total_questions} perguntas, sem IDs duplicados globais. Tudo OK!")
