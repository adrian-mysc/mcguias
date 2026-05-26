#!/usr/bin/env python3
"""Auditoria de perguntas do simulado: gramática e duplicatas."""

import json
import re
import os
import difflib
from pathlib import Path
from collections import defaultdict

QUESTIONS_DIR = Path(__file__).parent / "data" / "questions"

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_all_questions():
    all_qs = []
    for json_file in sorted(QUESTIONS_DIR.rglob("*.json")):
        if json_file.name == "index.json":
            continue
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            for q in data.get("questions", []):
                q["_file"] = str(json_file.relative_to(QUESTIONS_DIR))
                all_qs.append(q)
        except Exception as e:
            print(f"[ERRO ao ler {json_file}]: {e}")
    return all_qs


def correct_answer_text(q):
    """Retorna o texto da alternativa correta."""
    alts = q.get("alternativas", [])
    idx = q.get("respostaCorreta", -1)
    if 0 <= idx < len(alts):
        return alts[idx].strip().lower()
    return ""


def normalize(text):
    """Normaliza texto para comparação."""
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r'[°\'""‘’]', "", text)
    return text


def similarity(a, b):
    return difflib.SequenceMatcher(None, normalize(a), normalize(b)).ratio()


# ── Verificações gramaticais ──────────────────────────────────────────────────

GRAMMAR_CHECKS = [
    (
        "sem_interrogacao",
        lambda q: not q.get("pergunta", "").strip().endswith("?"),
        "Pergunta não termina com '?'",
    ),
    (
        "minuscula_inicio",
        lambda q: q.get("pergunta", "").strip()
        and q["pergunta"].strip()[0].islower(),
        "Pergunta começa com letra minúscula",
    ),
    (
        "espacos_duplos",
        lambda q: "  " in q.get("pergunta", ""),
        "Espaços duplos na pergunta",
    ),
    (
        "explicacao_vazia",
        lambda q: not q.get("explicacao", "").strip(),
        "Explicação vazia",
    ),
    (
        "alternativa_vazia",
        lambda q: any(
            not a.strip() for a in q.get("alternativas", [])
        ),
        "Alternativa vazia",
    ),
    (
        "menos_2_alternativas",
        lambda q: len(q.get("alternativas", [])) < 2,
        "Menos de 2 alternativas",
    ),
    (
        "resposta_invalida",
        lambda q: not (
            0 <= q.get("respostaCorreta", -1) < len(q.get("alternativas", []))
        ),
        "respostaCorreta fora do range de alternativas",
    ),
    (
        "pergunta_repetida_em_alternativa",
        lambda q: any(
            normalize(a) == normalize(q.get("pergunta", ""))
            for a in q.get("alternativas", [])
        ),
        "Alternativa idêntica à pergunta",
    ),
    (
        "alternativas_identicas",
        lambda q: len(q.get("alternativas", [])) != len(
            {normalize(a) for a in q.get("alternativas", [])}
        ),
        "Alternativas duplicadas dentro da mesma pergunta",
    ),
    (
        "pergunta_muito_curta",
        lambda q: len(q.get("pergunta", "").strip()) < 15,
        "Pergunta muito curta (< 15 caracteres)",
    ),
]


def check_grammar(questions):
    issues = []
    for q in questions:
        for check_id, fn, label in GRAMMAR_CHECKS:
            try:
                if fn(q):
                    issues.append({
                        "tipo": "gramatica",
                        "check": check_id,
                        "label": label,
                        "id": q.get("id", "?"),
                        "arquivo": q.get("_file", "?"),
                        "pergunta": q.get("pergunta", ""),
                    })
            except Exception:
                pass
    return issues


# ── Detecção de duplicatas ────────────────────────────────────────────────────

SIMILARITY_THRESHOLD = 0.82   # perguntas com >82% de similaridade
SAME_ANSWER_THRESHOLD = 0.72  # mesma resposta + >72% similaridade

def check_duplicates(questions):
    issues = []
    seen_pairs = set()

    # Agrupar por arquivo para comparação intra-arquivo primeiro
    # mas também checar entre arquivos com mesma categoria
    by_category = defaultdict(list)
    for q in questions:
        cat = q.get("categoria", q.get("_file", "unknown"))
        by_category[cat].append(q)

    # Também verificar globalmente (todas as perguntas entre si)
    groups = list(by_category.values()) + [questions]

    for group in groups:
        n = len(group)
        for i in range(n):
            for j in range(i + 1, n):
                qa, qb = group[i], group[j]
                id_a, id_b = qa.get("id", ""), qb.get("id", "")
                pair_key = tuple(sorted([id_a, id_b]))
                if pair_key in seen_pairs:
                    continue

                perg_a = qa.get("pergunta", "")
                perg_b = qb.get("pergunta", "")
                sim = similarity(perg_a, perg_b)

                ans_a = correct_answer_text(qa)
                ans_b = correct_answer_text(qb)
                same_answer = ans_a == ans_b and ans_a != ""

                if sim >= SIMILARITY_THRESHOLD:
                    seen_pairs.add(pair_key)
                    issues.append({
                        "tipo": "duplicata",
                        "check": "similar_pergunta",
                        "label": f"Perguntas muito similares ({sim:.0%})",
                        "id_a": id_a,
                        "id_b": id_b,
                        "arquivo_a": qa.get("_file", "?"),
                        "arquivo_b": qb.get("_file", "?"),
                        "pergunta_a": perg_a,
                        "pergunta_b": perg_b,
                        "resposta_a": ans_a,
                        "resposta_b": ans_b,
                        "mesma_resposta": same_answer,
                        "similaridade": sim,
                    })
                elif same_answer and sim >= SAME_ANSWER_THRESHOLD:
                    seen_pairs.add(pair_key)
                    issues.append({
                        "tipo": "duplicata",
                        "check": "mesma_resposta_similar",
                        "label": f"Mesma resposta, perguntas similares ({sim:.0%})",
                        "id_a": id_a,
                        "id_b": id_b,
                        "arquivo_a": qa.get("_file", "?"),
                        "arquivo_b": qb.get("_file", "?"),
                        "pergunta_a": perg_a,
                        "pergunta_b": perg_b,
                        "resposta_a": ans_a,
                        "resposta_b": ans_b,
                        "mesma_resposta": same_answer,
                        "similaridade": sim,
                    })

    return issues


# ── Relatório ─────────────────────────────────────────────────────────────────

def print_report(grammar_issues, dup_issues, total_questions):
    sep = "─" * 72

    print(f"\n{'='*72}")
    print("  AUDITORIA DE PERGUNTAS DO SIMULADO")
    print(f"{'='*72}")
    print(f"  Total de perguntas analisadas: {total_questions}")
    print(f"  Problemas gramaticais: {len(grammar_issues)}")
    print(f"  Possíveis duplicatas:  {len(dup_issues)}")
    print(f"{'='*72}\n")

    # ── Gramática ──
    if grammar_issues:
        print("━━━  PROBLEMAS GRAMATICAIS  ━━━\n")

        by_check = defaultdict(list)
        for issue in grammar_issues:
            by_check[issue["check"]].append(issue)

        for check_id, items in sorted(by_check.items(), key=lambda x: -len(x[1])):
            label = items[0]["label"]
            print(f"[{len(items)}x] {label}")
            print(sep)
            for it in items:
                print(f"  ID: {it['id']}")
                print(f"  Arquivo: {it['arquivo']}")
                print(f"  Pergunta: {it['pergunta'][:120]}")
                print()
            print()
    else:
        print("✓ Nenhum problema gramatical encontrado.\n")

    # ── Duplicatas ──
    if dup_issues:
        print("━━━  POSSÍVEIS DUPLICATAS  ━━━\n")

        high = [d for d in dup_issues if d["check"] == "similar_pergunta"]
        medium = [d for d in dup_issues if d["check"] == "mesma_resposta_similar"]

        if high:
            print(f"  ► Perguntas muito similares ({len(high)} pares)\n")
            print(sep)
            for d in sorted(high, key=lambda x: -x["similaridade"]):
                print(f"  Similaridade: {d['similaridade']:.0%}  |  Mesma resposta: {'SIM' if d['mesma_resposta'] else 'NÃO'}")
                print(f"  [{d['id_a']}] {d['arquivo_a']}")
                print(f"  Pergunta A: {d['pergunta_a'][:100]}")
                print(f"  Resposta A: {d['resposta_a'][:60]}")
                print(f"  [{d['id_b']}] {d['arquivo_b']}")
                print(f"  Pergunta B: {d['pergunta_b'][:100]}")
                print(f"  Resposta B: {d['resposta_b'][:60]}")
                print()
            print()

        if medium:
            print(f"  ► Mesma resposta, abordagem diferente ({len(medium)} pares)\n")
            print(sep)
            for d in sorted(medium, key=lambda x: -x["similaridade"]):
                print(f"  Similaridade: {d['similaridade']:.0%}")
                print(f"  [{d['id_a']}] {d['arquivo_a']}")
                print(f"  Pergunta A: {d['pergunta_a'][:100]}")
                print(f"  [{d['id_b']}] {d['arquivo_b']}")
                print(f"  Pergunta B: {d['pergunta_b'][:100]}")
                print(f"  Resposta: {d['resposta_a'][:60]}")
                print()
    else:
        print("✓ Nenhuma duplicata detectada.\n")


def save_json_report(grammar_issues, dup_issues, output_path):
    report = {
        "summary": {
            "grammar_issues": len(grammar_issues),
            "duplicate_pairs": len(dup_issues),
        },
        "grammar": grammar_issues,
        "duplicates": dup_issues,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n[Relatório JSON salvo em: {output_path}]")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Carregando perguntas…")
    questions = load_all_questions()
    print(f"{len(questions)} perguntas carregadas de {QUESTIONS_DIR}")

    print("Verificando gramática…")
    grammar_issues = check_grammar(questions)

    print("Detectando duplicatas (pode demorar alguns segundos)…")
    dup_issues = check_duplicates(questions)

    print_report(grammar_issues, dup_issues, len(questions))
    save_json_report(grammar_issues, dup_issues, Path(__file__).parent / "audit_report.json")
