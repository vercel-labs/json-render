import json
import unittest

from json_render import ActionBinding, Element, Spec


class AuthoringTest(unittest.TestCase):
    def test_optional_fields_are_omitted(self):
        self.assertEqual(Element("Text").to_dict(), {"type": "Text", "props": {}, "children": []})

    def test_false_and_empty_values_are_preserved(self):
        element = Element("Button", visible=False, on={"press": ActionBinding("save", params={}, prevent_default=False)})
        wire = element.to_dict()
        self.assertIs(wire["visible"], False)
        self.assertEqual(wire["on"]["press"], {"action": "save", "params": {}, "preventDefault": False})

    def test_camel_case_action_fields(self):
        wire = ActionBinding("save", on_success={"navigate": "/done"}, on_error={"set": {"/failed": True}}).to_dict()
        self.assertIn("onSuccess", wire)
        self.assertIn("onError", wire)

    def test_action_arrays_and_watch(self):
        element = Element("Text", on={"press": [ActionBinding("first"), ActionBinding("second")]},
                          watch={"/value": ActionBinding("changed")})
        self.assertEqual([binding["action"] for binding in element.to_dict()["on"]["press"]], ["first", "second"])
        self.assertEqual(element.to_dict()["watch"]["/value"], {"action": "changed"})

    def test_named_slot_reference_is_checked(self):
        with self.assertRaisesRegex(ValueError, "missing element"):
            Spec("root", {"root": Element("Card", slots={"footer": ["missing"]})}).to_json()

    def test_root_and_child_references_are_checked(self):
        for spec in (Spec("missing", {}), Spec("root", {"root": Element("Card", children=["missing"])})):
            with self.assertRaises(ValueError):
                spec.to_dict()

    def test_state_null_unicode_and_dynamic_values_round_trip(self):
        props = {"text": "Café", "nullable": None, "value": {"$state": "/value"}}
        wire = json.loads(Spec("root", {"root": Element("Text", props=props)}, state={}).to_json())
        self.assertEqual(wire["elements"]["root"]["props"], props)
        self.assertEqual(wire["state"], {})

    def test_non_finite_number_is_rejected(self):
        with self.assertRaises(ValueError):
            Spec("root", {"root": Element("Text", props={"number": float("nan")})}).to_json()


if __name__ == "__main__":
    unittest.main()
