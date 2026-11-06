import json
import tempfile
import unittest
from pathlib import Path

from jsonschema.exceptions import SchemaError, ValidationError
from referencing.exceptions import Unresolvable

from json_render import Catalog, Element, Spec


class CatalogTest(unittest.TestCase):
    def setUp(self):
        self.schema = {
            "type": "object",
            "properties": {"title": {"type": "string"}},
            "required": ["title"],
            "additionalProperties": False,
        }

    def test_json_and_file_loading(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "catalog.json"
            path.write_text(json.dumps(self.schema), encoding="utf-8")
            for catalog in (Catalog.from_file(path), Catalog.from_json(json.dumps(self.schema))):
                self.assertEqual(catalog.validate({"title": "Café"}), {"title": "Café"})

    def test_wrong_props_missing_fields_and_extra_fields_are_rejected(self):
        catalog = Catalog(self.schema)
        for document in ({"title": 7}, {}, {"title": "Hello", "unknown": False}):
            with self.assertRaises(ValidationError):
                catalog.validate(document)

    def test_schema_and_output_are_detached(self):
        catalog = Catalog(self.schema)
        self.schema["properties"]["title"]["type"] = "number"
        catalog.json_schema["properties"]["title"]["type"] = "boolean"
        document = {"title": "Hello"}
        result = catalog.validate(document)
        result["title"] = "Changed"
        self.assertEqual(document["title"], "Hello")
        with self.assertRaises(ValidationError):
            catalog.validate({"title": 7})

    def test_local_references_and_declared_dialect(self):
        catalog = Catalog({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "definitions": {"title": {"type": "string"}},
            "type": "object",
            "properties": {"title": {"$ref": "#/definitions/title"}},
        })
        self.assertEqual(catalog.validate({"title": "Hello"}), {"title": "Hello"})
        with self.assertRaises(ValidationError):
            catalog.validate({"title": 7})

    def test_external_references_are_not_fetched(self):
        catalog = Catalog({"$ref": "https://example.invalid/schema.json"})
        with self.assertRaises(Unresolvable):
            catalog.validate({})

    def test_invalid_schema_is_rejected_early(self):
        with self.assertRaises(SchemaError):
            Catalog({"type": "invalid"})
        with self.assertRaisesRegex(ValueError, "must be an object"):
            Catalog.from_json("[]")

    def test_spec_references_are_checked_before_catalog_validation(self):
        with self.assertRaisesRegex(ValueError, "missing element"):
            Catalog({}).validate(Spec("root", {"root": Element("Card", children=["missing"])}))

    def test_non_finite_values_are_not_valid_json(self):
        with self.assertRaises(ValueError):
            Catalog({}).validate({"value": float("inf")})


if __name__ == "__main__":
    unittest.main()
