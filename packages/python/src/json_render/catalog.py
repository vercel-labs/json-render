"""Validate against JSON Schema exported by the application's TypeScript catalog."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

from jsonschema.validators import validator_for
from referencing import Registry
from referencing.exceptions import NoSuchResource

from .authoring import Spec


def _no_remote_references(uri: str) -> Any:
    raise NoSuchResource(ref=uri)


class Catalog:
    """An exported JSON Schema, not a second implementation of a Zod catalog.

    Validation uses the supplied schema exactly. No fields are dropped and no
    defaults, transformations, bindings, or actions are evaluated. References
    within the schema work; external references are never fetched.
    """

    def __init__(self, json_schema: dict[str, Any]) -> None:
        self._json_schema = deepcopy(json_schema)
        validator_class = validator_for(self._json_schema)
        validator_class.check_schema(self._json_schema)
        self._validator = validator_class(
            self._json_schema, registry=Registry(retrieve=_no_remote_references)
        )

    @property
    def json_schema(self) -> dict[str, Any]:
        """Return a copy of the schema without changing subsequent validation."""
        return deepcopy(self._json_schema)

    @classmethod
    def from_json(cls, data: str) -> Catalog:
        """Load the output of JSON.stringify(catalog.jsonSchema())."""
        schema = json.loads(data)
        if not isinstance(schema, dict):
            raise ValueError("Catalog JSON Schema must be an object")
        return cls(schema)

    @classmethod
    def from_file(cls, path: str | Path) -> Catalog:
        return cls.from_json(Path(path).read_text(encoding="utf-8"))

    def validate(self, spec: Spec | dict[str, Any]) -> dict[str, Any]:
        """Return the JSON document or raise jsonschema.ValidationError.

        Spec instances additionally check element references during serialization.
        Raw dictionaries may follow any exported schema; no UI graph checks are
        imposed on them. The returned document is detached from the input.
        """
        document = json.loads(
            spec.to_json()
            if isinstance(spec, Spec)
            else json.dumps(spec, ensure_ascii=False, allow_nan=False)
        )
        self._validator.validate(document)
        return document
