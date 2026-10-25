"""Examples and boundary checks for the upload draft; no app runtime is added."""

import copy
import importlib.util
import json
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location("normalize_ama", Path(__file__).with_name("normalize-ama-spine.py"))
normalizer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(normalizer)

build_spec = importlib.util.spec_from_file_location("build_ama", Path(__file__).with_name("build-ama-spine.py"))
builder = importlib.util.module_from_spec(build_spec)
build_spec.loader.exec_module(builder)
parse_spec = importlib.util.spec_from_file_location("parse_ama", Path(__file__).with_name("parse-ama-rows.py"))
row_parser = importlib.util.module_from_spec(parse_spec)
parse_spec.loader.exec_module(row_parser)


def evaluate(rule, answers):
    """Test-only reference semantics: None is unresolved, never false."""
    if rule is None:
        return None
    if "field" in rule:
        value = answers.get(rule["field"])
        return None if value is None else value == rule["equals"]
    if "all" in rule:
        results = [evaluate(child, answers) for child in rule["all"]]
        return False if False in results else None if None in results else True
    if "any" in rule:
        results = [evaluate(child, answers) for child in rule["any"]]
        return True if True in results else None if None in results else False
    results = [evaluate(child, answers) for child in rule["of"]]
    yes = sum(result is True for result in results)
    unknown = sum(result is None for result in results)
    return True if yes >= rule["at_least"] else False if yes + unknown < rule["at_least"] else None


class UploadDraftTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = normalizer.normalize_rows()
        cls.by_id = {row["row_id"]: row for row in cls.rows}

    def entry(self, row_id, entry_id):
        return next(entry for entry in self.by_id[row_id]["entries"] if entry["entry_id"] == entry_id)

    def matches(self, row_id, answers):
        return [(entry["entry_id"], entry["impairment"]["value"])
                for entry in self.by_id[row_id]["entries"] if evaluate(entry["criteria"], answers) is True]

    def test_complete_identity_value_and_deterministic_export(self):
        source_rows = [row for region in normalizer.REGIONS for row in json.loads(
            (normalizer.ROOT / f"docs/rowparse/ama-rows-{region}.parsed.json").read_text())["rows"]]
        expected = {(row["row_id"], entry["entry_id"]): entry["impairment"]
                    for row in source_rows for entry in row["entries"]}
        actual = {(row["row_id"], entry["entry_id"]): entry["impairment"]
                  for row in self.rows for entry in row["entries"]}
        self.assertEqual(expected, actual)
        self.assertEqual((len(self.rows), len(actual)), (30, 108))
        upload = json.loads(normalizer.OUTPUT.read_text())
        normalizer.validate(upload)
        self.assertEqual([{key: value for key, value in row.items() if key != "examination_tasks"}
                          for row in upload], self.rows)
        self.assertEqual(normalizer.normalize_rows(), self.rows)
        self.assertTrue(all("eligibility" not in row for row in self.rows))
        self.assertTrue(all(question["group"] != "CH" for row in self.rows for question in row["questions"]))

    def test_root_metadata_includes_grouped_roots_but_not_vertebral_levels(self):
        expected = {f"17-19-{root + 2:02d}": [f"C{root}"] for root in range(1, 9)}
        expected.update({f"17-21-{root + 2:02d}": [f"L{root}"] for root in range(1, 6)})
        expected.update({
            "17-20-03": ["T1"],
            "17-20-04": ["T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
            "17-21-08": ["S1"],
        })
        for row in self.rows:
            with self.subTest(row_id=row["row_id"]):
                self.assertEqual(row["nerve_roots"], expected.get(row["row_id"], []))
        self.assertEqual(sum(bool(row["nerve_roots"]) for row in self.rows), 16)

    def test_enriched_tasks_require_complete_local_pe_links_and_shared_meanings(self):
        upload = json.loads(normalizer.OUTPUT.read_text())
        normalizer.validate(upload)
        if "examination_tasks" not in upload[0]:
            self.skipTest("Upload has not been enriched")
        invalid = copy.deepcopy(upload)
        invalid[0]["examination_tasks"] = []
        with self.assertRaises(ValueError):
            normalizer.validate(invalid)
        invalid = copy.deepcopy(upload)
        invalid[0]["examination_tasks"][0]["question_ids"] = ["cs_confirmed"]
        with self.assertRaises(ValueError):
            normalizer.validate(invalid)
        invalid = copy.deepcopy(upload)
        del invalid[0]["examination_tasks"]
        with self.assertRaises(ValueError):
            normalizer.validate(invalid)
        invalid = copy.deepcopy(upload)
        seen = set()
        for row in invalid:
            for task in row["examination_tasks"]:
                if task["id"] in seen:
                    task["help"] = "Conflicting collection instructions"
                    with self.assertRaises(ValueError):
                        normalizer.validate(invalid)
                    return
                seen.add(task["id"])
        self.fail("Expected shared examination tasks")

    def test_validator_rejects_missing_or_inaccurate_root_metadata(self):
        cases = [
            ("17-21-07", None),
            ("17-21-07", "L5"),
            ("17-21-07", []),
            ("17-21-07", ["L4"]),
            ("17-21-07", ["L5", "L5"]),
            ("17-20-04", ["T2", "T12"]),
            ("17-19-11", ["C1", "C2"]),
        ]
        for row_id, roots in cases:
            rows = copy.deepcopy(self.rows)
            row = next(row for row in rows if row["row_id"] == row_id)
            if roots is None:
                del row["nerve_roots"]
            else:
                row["nerve_roots"] = roots
            with self.subTest(row_id=row_id, roots=roots), self.assertRaisesRegex(ValueError, "nerve roots"):
                normalizer.validate(rows)

    def test_c3_sensory_choice_and_cs_confirmation(self):
        for value, expected in [("symptoms_without_objective_loss", ("1A", 2)),
                                ("diminished_pinprick", ("1B", 4)), ("sharp_dull_loss", ("1C", 5))]:
            self.assertEqual(self.matches("17-19-05", {"cs_confirmed": True, "sensory_status": value}), [expected])
            self.assertEqual(self.matches("17-19-05", {"cs_confirmed": False, "sensory_status": value}), [])
        self.assertIsNone(evaluate(self.entry("17-19-05", "1C")["criteria"], {"sensory_status": "sharp_dull_loss"}))

    def test_lumbar_fusion_requires_pe_and_distinguishes_extent(self):
        self.assertEqual(self.matches("17-21-11", {"pe_consistent": True, "fusion_extent": "single_level"}), [("1A", 5)])
        self.assertEqual(self.matches("17-21-11", {"pe_consistent": True, "fusion_extent": "multiple_levels"}), [("1B", 9)])
        self.assertEqual(self.matches("17-21-11", {"pe_consistent": False, "fusion_extent": "multiple_levels"}), [])
        self.assertEqual(self.matches("17-21-11", {"pe_consistent": True, "fusion_extent": "not_confirmed"}), [])

    def test_fracture_alternatives_remain_entry_specific(self):
        row_id = "17-20-05"
        answers = {question["id"]: False for question in self.by_id[row_id]["questions"]}
        answers.update(pe_consistent=True, fracture_finding_2=True)
        self.assertEqual(self.matches(row_id, answers), [("1A", 2)])
        answers.update(fracture_finding_2=False, fracture_finding_6=True)
        self.assertEqual(self.matches(row_id, answers), [("2A", 10)])

    def test_four_of_five_is_a_minimum_not_exact(self):
        rule = self.entry("17-21-06", "2A")["criteria"]
        group = rule["all"][1]
        self.assertEqual((group["at_least"], len(group["of"])), (4, 5))
        findings = group["of"]
        for present in (3, 4, 5):
            answers = {item["field"]: item["equals"] if index < present else False
                       for index, item in enumerate(findings)}
            answers["cs_confirmed"] = True
            self.assertEqual(evaluate(rule, answers), present >= 4)
        partial = {item["field"]: item["equals"] for item in findings[:3]}
        partial["cs_confirmed"] = True
        self.assertIsNone(evaluate(rule, partial))

    def test_source_l3_three_b_keeps_two_of_four(self):
        group = self.entry("17-21-05", "3B")["criteria"]["all"][1]
        self.assertEqual((group["at_least"], len(group["of"])), (2, 4))

    def test_all_of_l2_requires_each_finding(self):
        rule = self.entry("17-21-04", "2A")["criteria"]
        self.assertIn("all", rule["all"][1])
        self.assertFalse(evaluate(rule, {"cs_confirmed": True, "sensory_status": "sharp_dull_loss",
                                        "neural_tension": True, "motor_4": False}))

    def test_special_history_and_absent_pe_are_preserved(self):
        answers = {"claudication_history_confirmed": True, "stenosis_extent": "multiple_levels_or_bilateral"}
        self.assertEqual(self.matches("17-21-10", answers), [("1B", 4)])
        answers["claudication_history_confirmed"] = False
        self.assertEqual(self.matches("17-21-10", answers), [])
        self.assertFalse(any(question["group"] == "PE" for question in self.by_id["17-21-10"]["questions"]))
        for row_id in ("17-19-15", "17-20-08", "17-21-13"):
            self.assertEqual(self.matches(row_id, {"pe_consistent": True, "cs_confirmed": True,
                                                  "infection_history_confirmed": False}), [])

    def test_nested_instability_thresholds_survive_in_confirmation_help(self):
        question = next(q for q in self.by_id["17-21-12"]["questions"] if q["group"] == "CS")
        for phrase in ["T12-L5 >8% anterior or >9% posterior", "L5-S1 >6% anterior", "L4-L5 >20°", "L5-S1 >25°"]:
            self.assertIn(phrase, question["help"])
        self.assertEqual(self.matches("17-21-12", {"pe_consistent": True, "instability_confirmed": True}), [("1A", 5)])

    def test_full_source_preparation_and_parsing_match_generated_files(self):
        for region in normalizer.REGIONS:
            source = (normalizer.ROOT / f"docs/rowparse/ama-rows-{region}.source.md").read_text()
            working = builder.prepare_source(region, source)
            self.assertEqual(working, (normalizer.ROOT / f"docs/rowparse/ama-rows-{region}.md").read_text())
            parsed, warnings, notes = row_parser.parse_rows(working)
            self.assertEqual(json.dumps(parsed, ensure_ascii=False, indent=2) + "\n",
                             (normalizer.ROOT / f"docs/rowparse/ama-rows-{region}.parsed.json").read_text())
            self.assertTrue(all(warning["code"] == "inline_text_and_list" for warning in warnings))

    def test_approved_dermatome_corrections_and_complete_rules(self):
        self.assertTrue(all(entry["criteria"] is not None for row in self.rows for entry in row["entries"]))
        self.assertIn("C5 dermatome (ie, lateral forearm and hand, thumb)",
                      (normalizer.ROOT / "docs/rowparse/ama-rows-cervical.source.md").read_text())
        self.assertIn("L2 dermatome (ie, lower back or upper lumbar region",
                      (normalizer.ROOT / "docs/rowparse/ama-rows-lumbar.source.md").read_text())
        for row_id, option, root, value in [("17-19-08", "sharp_dull_loss", "C6", 5),
                                           ("17-21-03", "symptoms_without_objective_loss", "L1", 2)]:
            question = next(q for q in self.by_id[row_id]["questions"] if q["id"] == "sensory_status")
            help_text = next(o for o in question["options"] if o["value"] == option)["help"]
            self.assertIn(f"{root} dermatome", help_text)
            entry_id = "1C" if root == "C6" else "1A"
            self.assertTrue(evaluate(self.entry(row_id, entry_id)["criteria"],
                                     {"cs_confirmed": True, "sensory_status": option}))
            self.assertEqual(self.entry(row_id, entry_id)["impairment"]["value"], value)

    def test_l2_2b_uses_sharp_dull_loss_like_l3_and_l4(self):
        # The Guides' L2 2B cell ends "...L2 dermatome and/or paresthesias)", copied
        # from the femoral stretch cell; symptoms alone do not meet 2B.
        self.assertNotIn("sensory_criterion_2b",
                         [q["id"] for q in self.by_id["17-21-04"]["questions"]])
        rule = self.entry("17-21-04", "2B")["criteria"]
        answers = {"cs_confirmed": True, "neural_tension": True, "motor_3": True,
                   "sensory_status": "sharp_dull_loss"}
        self.assertTrue(evaluate(rule, answers))
        answers["sensory_status"] = "symptoms_without_objective_loss"
        self.assertFalse(evaluate(rule, answers))

    def test_deduplicates_l5_neural_tension_and_keeps_full_compound_findings(self):
        questions = self.by_id["17-21-07"]["questions"]
        self.assertEqual(sum(q["id"].startswith("neural_tension") for q in questions), 1)
        atrophy = next(q for q in questions if q["id"] == "atrophy")
        self.assertIn("or calf", atrophy["help"])
        self.assertIn("15 cm", atrophy["help"])

    def test_validator_rejects_invalid_references_types_and_duplicate_counts(self):
        for mutation in ["unknown_field", "unknown_value", "boolean_value", "duplicate_count", "duplicate_question", "null_rule"]:
            rows = copy.deepcopy(self.rows)
            by_id = {row["row_id"]: row for row in rows}
            row = by_id["17-19-05"]
            rules = row["entries"][0]["criteria"]["all"]
            if mutation == "unknown_field":
                rules[0]["field"] = "missing_question"
            elif mutation == "unknown_value":
                rules[1]["equals"] = "invalid_status"
            elif mutation == "boolean_value":
                rules[0]["equals"] = "true"
            elif mutation == "duplicate_count":
                group = next(e for e in by_id["17-21-06"]["entries"] if e["entry_id"] == "2A")["criteria"]["all"][1]
                group["of"][1] = group["of"][0]
            elif mutation == "duplicate_question":
                row["questions"].append(row["questions"][0])
            else:
                row["entries"][0]["criteria"] = None
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                normalizer.validate(rows)


if __name__ == "__main__":
    unittest.main()
