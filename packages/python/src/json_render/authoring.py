"""Serialize Python dataclasses to the existing TypeScript wire format."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

_UNSET = object()


@dataclass
class ActionBinding:
    """An action binding; snake_case Python fields serialize to camelCase JSON."""

    action: str
    params: dict[str, Any] | None = None
    confirm: dict[str, Any] | None = None
    on_success: dict[str, Any] | None = None
    on_error: dict[str, Any] | None = None
    prevent_default: bool | None = None

    def to_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {"action": self.action}
        for key, value in (
            ("params", self.params),
            ("confirm", self.confirm),
            ("onSuccess", self.on_success),
            ("onError", self.on_error),
            ("preventDefault", self.prevent_default),
        ):
            if value is not None:
                result[key] = value
        return result


@dataclass
class Element:
    """An element with child references, named slots, and top-level bindings."""

    type: str
    props: dict[str, Any] = field(default_factory=dict)
    children: list[str] = field(default_factory=list)
    slots: dict[str, list[str]] | None = None
    visible: Any = _UNSET
    on: dict[str, ActionBinding | list[ActionBinding]] | None = None
    repeat: dict[str, Any] | None = None
    watch: dict[str, ActionBinding | list[ActionBinding]] | None = None

    def to_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {
            "type": self.type,
            "props": self.props,
            "children": self.children,
        }
        if self.visible is not _UNSET:
            result["visible"] = self.visible
        for name, value in (("slots", self.slots), ("repeat", self.repeat)):
            if value is not None:
                result[name] = value
        for name, bindings in (("on", self.on), ("watch", self.watch)):
            if bindings is not None:
                result[name] = {
                    event: [binding.to_dict() for binding in value]
                    if isinstance(value, list)
                    else value.to_dict()
                    for event, value in bindings.items()
                }
        return result


@dataclass
class Spec:
    """A flat UI spec. Serialization checks all root, child, and slot references."""

    root: str
    elements: dict[str, Element]
    state: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        if self.root not in self.elements:
            raise ValueError(f"Root element {self.root!r} does not exist")
        for name, element in self.elements.items():
            references = element.children + [
                child for children in (element.slots or {}).values() for child in children
            ]
            for child in references:
                if child not in self.elements:
                    raise ValueError(f"Element {name!r} refers to missing element {child!r}")
        result: dict[str, Any] = {
            "root": self.root,
            "elements": {name: element.to_dict() for name, element in self.elements.items()},
        }
        if self.state is not None:
            result["state"] = self.state
        return result

    def to_json(self) -> str:
        """Return strict JSON, preserving Unicode and rejecting non-finite numbers."""
        return json.dumps(self.to_dict(), ensure_ascii=False, allow_nan=False)
