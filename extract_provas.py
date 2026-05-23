#!/usr/bin/env python3
"""Extract PROVAS questions from provas-testes.html and convert to battle JSON format."""

import re
import json
import os

# ── Read the HTML file ─────────────────────────────────────────────────────────
with open('/home/user/mcguias/pages/provas-testes.html', 'r', encoding='utf-8') as f:
    content = f.read()

# ── Extract the PROVAS array text ──────────────────────────────────────────────
lines = content.split('\n')
start_line = None
end_line = None

for i, line in enumerate(lines):
    if 'const PROVAS = [' in line and start_line is None:
        start_line = i
    if start_line is not None and i > start_line and line.strip() == '];':
        end_line = i
        break

print(f"PROVAS block: lines {start_line+1} to {end_line+1}")

raw = '\n'.join(lines[start_line:end_line+1])
bracket_start = raw.index('[')
arr = raw[bracket_start:]   # starts with `[`, ends with `]`
print(f"Extracted {len(arr)} chars")


def split_top_level_objects(text):
    """
    Split a JS array text (starting with `[`) into its top-level `{}` objects.
    Correctly handles nested braces and strings.
    """
    objects = []
    depth = 1   # we start inside the `[`
    start = None
    i = 1       # skip the opening `[`
    in_string = False
    string_char = None

    while i < len(text):
        c = text[i]
        if in_string:
            if c == '\\':
                i += 2
                continue
            elif c == string_char:
                in_string = False
        else:
            if c in ('"', "'"):
                in_string = True
                string_char = c
            elif c == '{':
                if depth == 1:
                    start = i
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 1 and start is not None:
                    objects.append(text[start:i+1])
                    start = None
        i += 1
    return objects


def get_array_slice(text, key):
    """
    Given a JS object text, find `key: [...]` and return the full `[...]` substring.
    """
    pat = rf'\b{key}:\s*\['
    m = re.search(pat, text)
    if not m:
        return None
    bracket_pos = m.end() - 1
    depth = 0
    i = bracket_pos
    in_string = False
    string_char = None
    while i < len(text):
        c = text[i]
        if in_string:
            if c == '\\':
                i += 2
                continue
            elif c == string_char:
                in_string = False
        else:
            if c in ('"', "'"):
                in_string = True
                string_char = c
            elif c == '[':
                depth += 1
            elif c == ']':
                depth -= 1
                if depth == 0:
                    return text[bracket_pos:i+1]
        i += 1
    return None


def extract_str(text, key):
    """Extract first quoted string value for a JS key."""
    patterns = [
        rf'\b{key}:\s*"((?:[^"\\]|\\.)*)"',
        rf'\b{key}:\s*\'((?:[^\'\\]|\\.)*)\''
    ]
    for pat in patterns:
        m = re.search(pat, text, re.DOTALL)
        if m:
            v = m.group(1)
            v = v.replace('\\"', '"').replace("\\'", "'").replace('\\n', '\n').replace('\\t', '\t')
            return v
    return None


def extract_int(text, key):
    m = re.search(rf'\b{key}:\s*(\d+)', text)
    return int(m.group(1)) if m else 0


def extract_strings_from_array_text(arr_text):
    """Parse a JS array string like `["a", "b", "c"]` into a Python list."""
    # arr_text starts with `[` and ends with `]`
    inner = arr_text[1:-1]
    items = []
    i = 0
    while i < len(inner):
        c = inner[i]
        if c in ('"', "'"):
            quote = c
            j = i + 1
            val = []
            while j < len(inner):
                if inner[j] == '\\' and j + 1 < len(inner):
                    nc = inner[j+1]
                    if nc == 'n':
                        val.append('\n')
                    elif nc == 't':
                        val.append('\t')
                    elif nc in ('"', "'", '\\'):
                        val.append(nc)
                    else:
                        val.append('\\')
                        val.append(nc)
                    j += 2
                elif inner[j] == quote:
                    break
                else:
                    val.append(inner[j])
                    j += 1
            items.append(''.join(val))
            i = j + 1
        else:
            i += 1
    return items


# ── Split PROVAS array into 8 prova objects ────────────────────────────────────
prova_chunks = split_top_level_objects(arr)
print(f"Found {len(prova_chunks)} prova objects")

# ── Parse each prova ───────────────────────────────────────────────────────────
all_provas = []
for chunk in prova_chunks:
    prova_id = extract_str(chunk, 'id')
    titulo = extract_str(chunk, 'titulo')

    perguntas_arr_text = get_array_slice(chunk, 'perguntas')
    perguntas = []
    if perguntas_arr_text:
        q_chunks = split_top_level_objects(perguntas_arr_text)
        for qc in q_chunks:
            texto = extract_str(qc, 'texto')
            opcoes_text = get_array_slice(qc, 'opcoes')
            opcoes = extract_strings_from_array_text(opcoes_text) if opcoes_text else []
            correta = extract_int(qc, 'correta')
            explicacao = extract_str(qc, 'explicacao') or ''
            perguntas.append({'texto': texto, 'opcoes': opcoes, 'correta': correta, 'explicacao': explicacao})

    prova = {'id': prova_id, 'titulo': titulo, 'perguntas': perguntas}
    all_provas.append(prova)
    print(f"  '{prova_id}': {len(perguntas)} questions")

total_q = sum(len(p['perguntas']) for p in all_provas)
print(f"\nTotal questions: {total_q}")

# ── Validate parsing ───────────────────────────────────────────────────────────
print("\n── Parsing validation ──────────────────────────────────────────────────")
errors = 0
for prova in all_provas:
    for i, q in enumerate(prova['perguntas']):
        if not q['texto']:
            print(f"  WARNING: Missing texto in '{prova['id']}' q{i+1}")
            errors += 1
        if not q['opcoes']:
            print(f"  WARNING: Missing opcoes in '{prova['id']}' q{i+1}")
            errors += 1
        if q['correta'] >= len(q['opcoes']):
            print(f"  WARNING: correta={q['correta']} out of range in '{prova['id']}' q{i+1} (opcoes={len(q['opcoes'])})")
            errors += 1
if errors == 0:
    print("  All questions parsed cleanly ✓")

# ── Grouping / mapping config ──────────────────────────────────────────────────
GRUPOS = {
    'treinador': ['pre-prova-treinador', 'avaliacao-treinador-2018', 'avaliacao-treinador-ga', 'teste-treinador-coach'],
    'gerencia':  ['gerente-de-turno', 'gerente-de-plantao'],
    'lideranca': ['recrutamento-interno', 'prova-supervisor'],
}

PREFIX_MAP = {'treinador': 'tr', 'gerencia': 'ge', 'lideranca': 'li'}

SUBCATEGORIAS = {
    'pre-prova-treinador':      '🎓 PDT · Treinador',
    'avaliacao-treinador-2018': '📋 Avaliação · Treinador 2018',
    'avaliacao-treinador-ga':   '📊 Avaliação · Treinador GA',
    'teste-treinador-coach':    '🏆 Teste · Coach',
    'gerente-de-turno':         '⏱️ Gerente de Turno',
    'gerente-de-plantao':       '🌙 Gerente de Plantão',
    'recrutamento-interno':     '🔍 Recrutamento Interno',
    'prova-supervisor':         '👔 Supervisor',
}

provas_by_id = {p['id']: p for p in all_provas}


def make_question(prova_id, categoria, q, num):
    prefix = PREFIX_MAP[categoria]
    return {
        "id": f"{prefix}_{num:03d}",
        "categoria": categoria,
        "subcategoria": SUBCATEGORIAS.get(prova_id, prova_id),
        "dificuldade": 2,
        "tipo": "multipla_escolha",
        "tags": [],
        "pergunta": q['texto'],
        "alternativas": q['opcoes'],
        "respostaCorreta": q['correta'],
        "explicacao": q['explicacao'],
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
        "errorStats": {"timesWrong": 0, "timesCorrect": 0, "weaknessScore": 0},
        "analytics": {"globalAccuracy": 0, "averageTime": 0, "dropRate": 0},
        "contextHints": [],
        "relatedQuestions": []
    }


# ── Build question lists ───────────────────────────────────────────────────────
results = {}
for categoria, prova_ids in GRUPOS.items():
    questions = []
    num = 1
    for prova_id in prova_ids:
        if prova_id not in provas_by_id:
            print(f"  WARNING: Prova '{prova_id}' not found in parsed data!")
            continue
        prova = provas_by_id[prova_id]
        for q in prova['perguntas']:
            questions.append(make_question(prova_id, categoria, q, num))
            num += 1
    results[categoria] = questions
    print(f"\nCategoria '{categoria}': {len(questions)} questions")

# ── Validate IDs ───────────────────────────────────────────────────────────────
print("\n── ID validation ───────────────────────────────────────────────────────")
all_ids = []
ok = True
for categoria, questions in results.items():
    ids = [q['id'] for q in questions]
    seen, dupes = set(), set()
    for id_ in ids:
        if id_ in seen:
            dupes.add(id_)
        seen.add(id_)
    if dupes:
        print(f"  ERROR: Duplicate IDs in '{categoria}': {dupes}")
        ok = False
    else:
        print(f"  {categoria}: {len(ids)} unique IDs ✓")
    all_ids.extend(ids)

cross_seen, cross_dupes = set(), set()
for id_ in all_ids:
    if id_ in cross_seen:
        cross_dupes.add(id_)
    cross_seen.add(id_)
if cross_dupes:
    print(f"  ERROR: Cross-category duplicate IDs: {cross_dupes}")
    ok = False
else:
    print("  No cross-category duplicates ✓")

# ── Validate JSON ─────────────────────────────────────────────────────────────
for categoria, questions in results.items():
    try:
        json.dumps(questions, ensure_ascii=False)
        print(f"  {categoria}: valid JSON ✓")
    except Exception as e:
        print(f"  ERROR: {categoria} JSON invalid: {e}")
        ok = False

if not ok:
    print("\nAborting due to validation errors!")
    exit(1)

# ── Save files ────────────────────────────────────────────────────────────────
print("\n── Saving files ────────────────────────────────────────────────────────")
base_dir = '/home/user/mcguias/data/questions'

for categoria, questions in results.items():
    dir_path = os.path.join(base_dir, categoria)
    os.makedirs(dir_path, exist_ok=True)
    file_path = os.path.join(dir_path, 'basico.json')
    data = {
        "version": "1.0.0",
        "updatedAt": "2026-05-23",
        "categoria": categoria,
        "nivel": "basico",
        "questions": questions
    }
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Saved: {file_path} ({len(questions)} questions)")

print("\nAll done!")
