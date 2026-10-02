"""Experimental, dependency-free authoring of json-render Spec JSON.

This design spike is not a released Python API. Rendering stays in TypeScript.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

_UNSET = object()


@dataclass
class ActionBinding:
    action: str
    params: dict[str, Any] | None = None
    confirm: dict[str, Any] | None = None
    on_success: dict[str, Any] | None = None
    on_error: dict[str, Any] | None = None
    prevent_default: bool | None = None

    def to_dict(self) -> dict[str, Any]:
        result = {"action": self.action}
        for key, value in (("params", self.params), ("confirm", self.confirm),
                           ("onSuccess", self.on_success), ("onError", self.on_error),
                           ("preventDefault", self.prevent_default)):
            if value is not None:
                result[key] = value
        return result


@dataclass
class Element:
    type: str
    props: dict[str, Any] = field(default_factory=dict)
    children: list[str] = field(default_factory=list)
    slots: dict[str, list[str]] | None = None
    visible: Any = _UNSET
    on: dict[str, ActionBinding | list[ActionBinding]] | None = None
    repeat: dict[str, Any] | None = None
    watch: dict[str, ActionBinding | list[ActionBinding]] | None = None

    def to_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {"type": self.type, "props": self.props, "children": self.children}
        if self.visible is not _UNSET:
            result["visible"] = self.visible
        for name, value in (("slots", self.slots), ("repeat", self.repeat)):
            if value is not None:
                result[name] = value
        for name, bindings in (("on", self.on), ("watch", self.watch)):
            if bindings is not None:
                result[name] = {
                    event: [binding.to_dict() for binding in value] if isinstance(value, list) else value.to_dict()
                    for event, value in bindings.items()
                }
        return result


@dataclass
class Spec:
    root: str
    elements: dict[str, Element]
    state: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        """Serialize after checking element references, including named slots.

        Catalog-specific prop, expression, and action validation belongs to the
        frontend's catalog. This prototype does not reproduce Zod validation.
        """
        if self.root not in self.elements:
            raise ValueError(f"Root element {self.root!r} does not exist")
        for name, element in self.elements.items():
            references = element.children + [child for children in (element.slots or {}).values() for child in children]
            for child in references:
                if child not in self.elements:
                    raise ValueError(f"Element {name!r} refers to missing element {child!r}")
        result: dict[str, Any] = {"root": self.root, "elements": {name: element.to_dict() for name, element in self.elements.items()}}
        if self.state is not None:
            result["state"] = self.state
        return result

    def to_json(self) -> str:
        """Return strict JSON; non-finite numbers are rejected."""
        return json.dumps(self.to_dict(), ensure_ascii=False, allow_nan=False)
