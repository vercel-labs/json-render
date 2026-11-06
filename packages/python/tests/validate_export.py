"""Exercise an actual TypeScript catalog export, supplied by interop.test.ts."""

import json
import sys

from jsonschema.exceptions import ValidationError

from json_render import Catalog, Element, Spec

catalog = Catalog.from_file(sys.argv[1])
valid = Spec("text", {"text": Element("Text", props={"text": "Café"})})
document = catalog.validate(valid)
rejected = []
for candidate in (
    Spec("text", {"text": Element("Text", props={"text": 7})}),
    Spec("text", {"text": Element("Unknown", props={"text": "Hello"})}),
    Spec("text", {"text": Element("Text", props={})}),
    Spec("text", {"text": Element("Text", props={"text": "Hello"})}, state={}),
):
    try:
        catalog.validate(candidate)
    except ValidationError:
        rejected.append(True)
    else:
        rejected.append(False)
print(json.dumps({"valid": document, "rejected": rejected}, ensure_ascii=False))
