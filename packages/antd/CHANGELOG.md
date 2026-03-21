# @json-render/antd

## 0.11.0

### Minor Changes

- Initial release of `@json-render/antd` package.

  Pre-built [Ant Design](https://ant.design/) component library for json-render. 50+ components ready to use with `defineCatalog` and `defineRegistry`.

  - `antdComponentDefinitions` — Zod-based catalog definitions for all components (server-safe, no React dependency via `@json-render/antd/catalog`)
  - `antdComponents` — React implementations for all components

  ### Layout Components
  - Card, Stack, Grid, Divider, Space

  ### Navigation Components
  - Tabs, Collapse, Menu

  ### Overlay Components
  - Modal, Drawer, Popover, Tooltip, Dropdown

  ### Data Display Components
  - Table, Heading, Text, Paragraph, Image, Avatar, Badge, Tag, Alert, Progress, Skeleton, Spin, Empty, Statistic, Descriptions, Timeline, Carousel

  ### Form Components
  - Input, TextArea, InputNumber, Select, Checkbox, CheckboxGroup, Radio, Switch, Slider, Rate, DatePicker, TimePicker, Upload, Transfer

  ### Action Components
  - Button, ButtonGroup, Link, Pagination, Segmented, Steps, Result

### Patch Changes

- Updated dependencies
  - @json-render/core@0.11.0
  - @json-render/react@0.11.0
