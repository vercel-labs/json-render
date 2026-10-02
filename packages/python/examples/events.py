"""Generate a fixture consumed by the current TypeScript catalog and action resolver."""
from json_render import ActionBinding, Element, Spec

spec = Spec(
    root="card",
    state={"count": 2, "items": [{"name": "First"}]},
    elements={
        "card": Element(type="Card", props={"title": "Café"}, children=["button"], slots={"footer": ["note"]}),
        "button": Element(
            type="Button", props={"label": "Save"}, visible=False,
            on={"press": ActionBinding(action="save", params={"count": {"$state": "/count"}}, prevent_default=False)},
            watch={"/count": [ActionBinding(action="save", params={"count": {"$state": "/count"}})]},
        ),
        "note": Element(type="Text", props={"text": "Saved"}),
    },
)
print(spec.to_json())
