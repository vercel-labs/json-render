import Foundation

/// A prop declared by a catalog component.
public struct CatalogProperty: Equatable, Sendable {
    /// Prop name as written in the spec.
    public var name: String
    /// JSON type: `string`, `number`, `boolean`, `array`, `object`, or `any`.
    public var type: String
    public var required: Bool
    public var description: String?

    public init(name: String, type: String, required: Bool = false, description: String? = nil) {
        self.name = name
        self.type = type
        self.required = required
        self.description = description
    }
}

/// A catalog component and its declared props and slots.
public struct CatalogComponent: Equatable, Sendable {
    public var name: String
    public var description: String
    public var props: [CatalogProperty]
    public var slots: [String]

    public init(name: String, description: String, props: [CatalogProperty] = [], slots: [String] = []) {
        self.name = name
        self.description = description
        self.props = props
        self.slots = slots
    }
}

/// A catalog action and the params it expects.
public struct CatalogAction: Equatable, Sendable {
    public var name: String
    public var description: String
    public var params: [CatalogProperty]

    public init(name: String, description: String, params: [CatalogProperty] = []) {
        self.name = name
        self.description = description
        self.params = params
    }
}

/// Component and action metadata for a spec. The catalog is the contract
/// between a spec author and a renderer; the renderer looks components up by
/// name in its catalog.
public struct Catalog: Equatable, Sendable {
    public var name: String
    public var components: [String: CatalogComponent]
    public var actions: [String: CatalogAction]

    public init(name: String, components: [CatalogComponent] = [], actions: [CatalogAction] = []) {
        self.name = name
        self.components = Dictionary(uniqueKeysWithValues: components.map { ($0.name, $0) })
        self.actions = Dictionary(uniqueKeysWithValues: actions.map { ($0.name, $0) })
    }
}

/// A spec problem found by catalog validation.
public struct CatalogIssue: Equatable, Sendable {
    public enum Code: String, Sendable {
        case unknownComponent = "unknown_component"
        case unknownAction = "unknown_action"
        case missingRequiredProp = "missing_required_prop"
    }

    public var code: Code
    public var message: String
    public var elementKey: String?

    public init(code: Code, message: String, elementKey: String? = nil) {
        self.code = code
        self.message = message
        self.elementKey = elementKey
    }
}

/// Checks a spec against a catalog: every component type is declared, every
/// referenced action is declared, and required props are present.
public func validateCatalog(_ spec: Spec, catalog: Catalog) -> [CatalogIssue] {
    var issues: [CatalogIssue] = []

    for key in spec.elements.keys.sorted() {
        guard let element = spec.elements[key] else { continue }

        guard let component = catalog.components[element.type] else {
            issues.append(
                CatalogIssue(
                    code: .unknownComponent,
                    message: "Element \"\(key)\" uses component \"\(element.type)\", which is not in catalog \"\(catalog.name)\".",
                    elementKey: key
                )
            )
            continue
        }

        for property in component.props where property.required {
            if element.props[property.name] == nil || element.props[property.name] == .null {
                issues.append(
                    CatalogIssue(
                        code: .missingRequiredProp,
                        message: "Element \"\(key)\" of type \"\(element.type)\" is missing required prop \"\(property.name)\".",
                        elementKey: key
                    )
                )
            }
        }

        for event in (element.on ?? [:]).keys.sorted() {
            for binding in element.on?[event]?.bindings ?? [] where catalog.actions[binding.action] == nil {
                issues.append(
                    CatalogIssue(
                        code: .unknownAction,
                        message: "Element \"\(key)\" binds action \"\(binding.action)\" for event \"\(event)\", which is not in catalog \"\(catalog.name)\".",
                        elementKey: key
                    )
                )
            }
        }

        for path in (element.watch ?? [:]).keys.sorted() {
            for binding in element.watch?[path]?.bindings ?? [] where catalog.actions[binding.action] == nil {
                issues.append(
                    CatalogIssue(
                        code: .unknownAction,
                        message: "Element \"\(key)\" watches \"\(path)\" with action \"\(binding.action)\", which is not in catalog \"\(catalog.name)\".",
                        elementKey: key
                    )
                )
            }
        }
    }

    return issues
}

/// The catalog that ships with the Swift renderer.
public enum BuiltInCatalog {
    public static let text = CatalogComponent(
        name: "Text",
        description: "Inline text.",
        props: [CatalogProperty(name: "text", type: "string", required: true)]
    )

    public static let stack = CatalogComponent(
        name: "Stack",
        description: "Vertical or horizontal stack of children.",
        props: [
            CatalogProperty(name: "direction", type: "string", description: "\"vertical\" or \"horizontal\""),
            CatalogProperty(name: "gap", type: "number"),
            CatalogProperty(name: "spacing", type: "number"),
            CatalogProperty(name: "align", type: "string"),
        ]
    )

    public static let row = CatalogComponent(name: "Row", description: "Horizontal stack of children.", props: [
        CatalogProperty(name: "gap", type: "number"),
        CatalogProperty(name: "spacing", type: "number"),
    ])

    public static let column = CatalogComponent(name: "Column", description: "Vertical stack of children.", props: [
        CatalogProperty(name: "gap", type: "number"),
        CatalogProperty(name: "spacing", type: "number"),
    ])

    public static let button = CatalogComponent(
        name: "Button",
        description: "Clickable button that emits the press event.",
        props: [
            CatalogProperty(name: "label", type: "string"),
            CatalogProperty(name: "text", type: "string"),
            CatalogProperty(name: "variant", type: "string", description: "\"primary\" or \"secondary\""),
            CatalogProperty(name: "disabled", type: "boolean"),
            CatalogProperty(name: "fullWidth", type: "boolean", description: "Stretches the button to the width of its container."),
        ]
    )

    public static let image = CatalogComponent(
        name: "Image",
        description: "Remote image.",
        props: [
            CatalogProperty(name: "src", type: "string", required: true),
            CatalogProperty(name: "alt", type: "string"),
            CatalogProperty(name: "width", type: "number"),
            CatalogProperty(name: "height", type: "number"),
        ]
    )

    public static let list = CatalogComponent(
        name: "List",
        description: "Vertical list of children. Pair it with repeat for data.",
        props: [CatalogProperty(name: "spacing", type: "number")]
    )

    public static let input = CatalogComponent(
        name: "Input",
        description: "Text field. Bind its value to state with $bindState.",
        props: [
            CatalogProperty(name: "label", type: "string"),
            CatalogProperty(name: "placeholder", type: "string"),
            CatalogProperty(name: "value", type: "string"),
            CatalogProperty(name: "type", type: "string"),
        ]
    )

    public static let setState = CatalogAction(
        name: "setState",
        description: "Sets a value in the state model.",
        params: [
            CatalogProperty(name: "statePath", type: "string", required: true),
            CatalogProperty(name: "value", type: "any"),
        ]
    )

    public static let pushState = CatalogAction(
        name: "pushState",
        description: "Appends a value to an array in the state model.",
        params: [
            CatalogProperty(name: "statePath", type: "string", required: true),
            CatalogProperty(name: "value", type: "any"),
            CatalogProperty(name: "clearStatePath", type: "string"),
        ]
    )

    public static let removeState = CatalogAction(
        name: "removeState",
        description: "Removes an array item from the state model by index.",
        params: [
            CatalogProperty(name: "statePath", type: "string", required: true),
            CatalogProperty(name: "index", type: "number", required: true),
        ]
    )

    public static let catalog = Catalog(
        name: "json-render",
        components: [text, stack, row, column, button, image, list, input],
        actions: [setState, pushState, removeState]
    )
}
