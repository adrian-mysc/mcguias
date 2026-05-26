#!/usr/bin/env python3
"""
Remove duplicatas exatas e corrige alternativas repetidas nas perguntas do simulado.
"""

import json
import re
from pathlib import Path
from collections import defaultdict

QUESTIONS_DIR = Path(__file__).parent / "data" / "questions"
REPORT_FILE = Path(__file__).parent / "audit_report.json"


# ── Union-Find ────────────────────────────────────────────────────────────────

class UnionFind:
    def __init__(self):
        self.parent = {}

    def find(self, x):
        self.parent.setdefault(x, x)
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            # keep lexicographically smaller as root
            if ra < rb:
                self.parent[rb] = ra
            else:
                self.parent[ra] = rb

    def clusters(self):
        groups = defaultdict(set)
        for node in self.parent:
            groups[self.find(node)].add(node)
        return dict(groups)


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_file(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def save_file(path, data):
    Path(path).write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )


def full_path(rel):
    return QUESTIONS_DIR / rel


def question_sort_key(q_id):
    """Sort key: file path first, then numeric part of ID."""
    parts = q_id.split("::")
    file_part = parts[0]
    id_part = parts[1] if len(parts) > 1 else ""
    nums = re.findall(r"\d+", id_part)
    num = int(nums[-1]) if nums else 0
    return (file_part, num, id_part)


# ── Step 1: Build clusters of exact duplicates ────────────────────────────────

def build_clusters(report):
    uf = UnionFind()
    exact = [
        d for d in report["duplicates"]
        if d["check"] == "similar_pergunta" and d["similaridade"] >= 0.999
    ]
    for d in exact:
        # Node key: "file::id"
        node_a = f"{d['arquivo_a']}::{d['id_a']}"
        node_b = f"{d['arquivo_b']}::{d['id_b']}"
        uf.union(node_a, node_b)

    return uf.clusters()


# ── Step 2: For each cluster, pick canonical; collect removals ────────────────

def plan_removals(clusters):
    """
    For each cluster pick the canonical node to keep.
    Priority: alphabetically by (file, numeric_id).
    Returns dict: file -> set of IDs to remove
    """
    to_remove = defaultdict(set)  # file_rel -> {id, ...}

    for root, members in clusters.items():
        if len(members) < 2:
            continue

        sorted_members = sorted(members, key=question_sort_key)
        canonical = sorted_members[0]
        canonical_file, canonical_id = canonical.split("::", 1)

        for node in sorted_members[1:]:
            node_file, node_id = node.split("::", 1)
            to_remove[node_file].add(node_id)
            print(f"  REMOVE [{node_id}] from {node_file}  (keep [{canonical_id}] in {canonical_file})")

    return to_remove


# ── Step 3: Fix repeated alternatives ────────────────────────────────────────

ALTERNATIVE_FIXES = {
    # condimentacao_010: "Pão de Batata" duplicado (idx 0 e 2)
    # Pergunta: Qual o pão do Chicken Bacon Ranch 3?  Resposta: idx 0 (Pão de Batata)
    # Original: ['Pão de Batata', 'Pão Big Mac', 'Pão de Batata', 'Pão Brioche']
    "condimentacao_010": {
        "alternativas": ["Pão de Batata", "Pão Big Mac", "Pão Quarterão", "Pão Brioche"],
    },
    # condimentacao_021: "Pão de Batata" duplicado (idx 2 e 3)
    # Pergunta: Qual o pão usado no McNífico?  Resposta: idx 1 (Pão Brioche)
    # Original: ['Pão Big Mac', 'Pão Brioche', 'Pão de Batata', 'Pão de Batata']
    "condimentacao_021": {
        "alternativas": ["Pão Big Mac", "Pão Brioche", "Pão de Batata", "Pão Quarterão"],
    },
}


def fix_alternatives(file_path, questions):
    changed = False
    for q in questions:
        if q.get("id") in ALTERNATIVE_FIXES:
            fix = ALTERNATIVE_FIXES[q["id"]]
            print(f"  FIX alternativas [{q['id']}]: {q['alternativas']} -> {fix['alternativas']}")
            q["alternativas"] = fix["alternativas"]
            changed = True
    return changed


# ── Step 4: Apply removals and fixes to each file ────────────────────────────

def apply_to_file(rel_path, remove_ids, fix_alts=False):
    abs_path = full_path(rel_path)
    data = load_file(abs_path)
    questions = data.get("questions", [])

    original_count = len(questions)
    if remove_ids:
        questions = [q for q in questions if q.get("id") not in remove_ids]
    removed = original_count - len(questions)

    fixed = False
    if fix_alts:
        fixed = fix_alternatives(abs_path, questions)

    if removed or fixed:
        data["questions"] = questions
        save_file(abs_path, data)
        print(f"  Saved {rel_path}: {original_count} -> {len(questions)} questões (-{removed})")

    return removed, fixed


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    report = load_file(REPORT_FILE)

    print("=" * 68)
    print("PASSO 1: Identificar clusters de duplicatas exatas")
    print("=" * 68)
    clusters = build_clusters(report)
    multi = {k: v for k, v in clusters.items() if len(v) > 1}
    print(f"  {len(multi)} clusters com 2+ membros\n")

    print("=" * 68)
    print("PASSO 2: Planejar remoções")
    print("=" * 68)
    to_remove = plan_removals(multi)

    total_planned = sum(len(v) for v in to_remove.values())
    print(f"\n  Total de perguntas a remover: {total_planned}")

    print()
    print("=" * 68)
    print("PASSO 3: Aplicar remoções e correções")
    print("=" * 68)

    # Files that need alternative fixes
    alt_fix_files = {"condimentacao/basico.json"}

    all_files = set(to_remove.keys()) | alt_fix_files
    total_removed = 0
    for rel in sorted(all_files):
        remove_ids = to_remove.get(rel, set())
        fix_alts = rel in alt_fix_files
        removed, _ = apply_to_file(rel, remove_ids, fix_alts)
        total_removed += removed

    print()
    print("=" * 68)
    print(f"Concluído: {total_removed} perguntas removidas, alternativas corrigidas.")
    print("=" * 68)


if __name__ == "__main__":
    main()
