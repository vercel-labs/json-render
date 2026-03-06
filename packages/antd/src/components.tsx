"use client";

import { useState } from "react";
import dayjs from "dayjs";
import {
  useBoundProp,
  useStateBinding,
  useFieldValidation,
  type BaseComponentProps,
} from "@json-render/react";

import {
  Card,
  Space,
  Divider,
  Tabs,
  Collapse,
  Menu,
  Modal,
  Drawer,
  Popover,
  Tooltip,
  Dropdown,
  Table,
  Typography,
  Image,
  Avatar,
  Badge,
  Tag,
  Alert,
  Progress,
  Skeleton,
  Spin,
  Empty,
  Statistic,
  Descriptions,
  Timeline,
  Carousel,
  Input,
  InputNumber,
  Select,
  Checkbox,
  Radio,
  Switch,
  Slider,
  Rate,
  DatePicker,
  TimePicker,
  Upload,
  Transfer,
  Button,
  Pagination,
  Segmented,
  Steps,
  Result,
  Flex,
  Form,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import type { AntdProps } from "./catalog";

const {
  Title,
  Text: AntText,
  Paragraph: AntParagraph,
  Link: AntLink,
} = Typography;

// =============================================================================
// Standard Component Implementations
// =============================================================================

/**
 * Ant Design component implementations for json-render.
 *
 * Pass to `defineRegistry()` from `@json-render/react` to create a
 * component registry for rendering JSON specs with Ant Design components.
 *
 * @example
 * ```ts
 * import { defineRegistry } from "@json-render/react";
 * import { antdComponents } from "@json-render/antd";
 *
 * const { registry } = defineRegistry(catalog, {
 *   components: {
 *     Card: antdComponents.Card,
 *     Button: antdComponents.Button,
 *   },
 * });
 * ```
 */
export const antdComponents = {
  // ── Layout ────────────────────────────────────────────────────────────

  Card: ({ props, children }: BaseComponentProps<AntdProps<"Card">>) => {
    return (
      <Card
        title={props.title ?? undefined}
        bordered={props.bordered ?? true}
        hoverable={props.hoverable ?? false}
        loading={props.loading ?? false}
        size={props.size ?? "default"}
      >
        {props.description && (
          <AntParagraph type="secondary">{props.description}</AntParagraph>
        )}
        {children}
      </Card>
    );
  },

  Stack: ({ props, children }: BaseComponentProps<AntdProps<"Stack">>) => {
    const isHorizontal = props.direction === "horizontal";
    const gapMap: Record<string, number> = {
      none: 0,
      sm: 8,
      md: 16,
      lg: 24,
    };
    const alignMap: Record<
      string,
      "flex-start" | "center" | "flex-end" | "stretch"
    > = {
      start: "flex-start",
      center: "center",
      end: "flex-end",
      stretch: "stretch",
    };
    const justifyMap: Record<
      string,
      "flex-start" | "center" | "flex-end" | "space-between" | "space-around"
    > = {
      start: "flex-start",
      center: "center",
      end: "flex-end",
      between: "space-between",
      around: "space-around",
    };

    return (
      <Flex
        vertical={!isHorizontal}
        gap={gapMap[props.gap ?? "md"] ?? 16}
        align={props.align ? alignMap[props.align] : "stretch"}
        justify={props.justify ? justifyMap[props.justify] : "flex-start"}
        wrap={props.wrap ? "wrap" : "nowrap"}
      >
        {children}
      </Flex>
    );
  },

  Grid: ({ props, children }: BaseComponentProps<AntdProps<"Grid">>) => {
    const n = Math.max(1, Math.min(12, props.columns ?? 3));
    const gapMap: Record<string, number> = {
      sm: 8,
      md: 16,
      lg: 24,
    };

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${n}, 1fr)`,
          gap: gapMap[props.gap ?? "md"] ?? 16,
        }}
      >
        {children}
      </div>
    );
  },

  Divider: ({ props }: BaseComponentProps<AntdProps<"Divider">>) => {
    return (
      <Divider
        orientation={props.orientation ?? "horizontal"}
        dashed={props.dashed ?? false}
      >
        {props.text}
      </Divider>
    );
  },

  Space: ({ props, children }: BaseComponentProps<AntdProps<"Space">>) => {
    const sizeMap: Record<string, number> = {
      small: 8,
      middle: 16,
      large: 24,
    };

    return (
      <Space
        direction={props.direction ?? "horizontal"}
        size={props.size ? sizeMap[props.size] : 8}
        wrap={props.wrap ?? false}
        align={props.align ?? undefined}
      >
        {children}
      </Space>
    );
  },

  // ── Navigation ─────────────────────────────────────────────────────────

  Tabs: ({
    props,
    children,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Tabs">>) => {
    const tabs = props.tabs ?? [];
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState(
      props.defaultValue ?? tabs[0]?.value ?? "",
    );
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? tabs[0]?.value ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    const items = tabs.map((tab) => ({
      key: tab.value,
      label: tab.label,
      children: tab.value === value ? children : null,
    }));

    return (
      <Tabs
        activeKey={value}
        onChange={(key) => {
          setValue(key);
          emit("change");
        }}
        tabPosition={props.position ?? "top"}
        type={props.type ?? "line"}
        items={items}
      />
    );
  },

  Collapse: ({ props }: BaseComponentProps<AntdProps<"Collapse">>) => {
    const items = props.items ?? [];

    const collapseItems = items.map((item, idx) => ({
      key: String(idx),
      label: item.title,
      children: <AntText>{item.content}</AntText>,
    }));

    return (
      <Collapse accordion={props.accordion ?? false} items={collapseItems} />
    );
  },

  Menu: ({ props, emit }: BaseComponentProps<AntdProps<"Menu">>) => {
    const items = props.items ?? [];

    const menuItems = items.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon ? <span className={item.icon} /> : undefined,
    }));

    return (
      <Menu
        mode={props.mode ?? "vertical"}
        selectedKeys={props.selectedKey ? [props.selectedKey] : []}
        items={menuItems}
        onClick={({ key }) => emit("select")}
      />
    );
  },

  // ── Overlay ────────────────────────────────────────────────────────────

  Modal: ({
    props,
    children,
    emit,
  }: BaseComponentProps<AntdProps<"Modal">>) => {
    const [open, setOpen] = useStateBinding<boolean>(props.openPath ?? "");

    return (
      <Modal
        title={props.title}
        open={open ?? false}
        onOk={() => {
          emit("ok");
          setOpen(false);
        }}
        onCancel={() => {
          emit("cancel");
          setOpen(false);
        }}
        width={props.width ?? 520}
        footer={props.footer === false ? null : undefined}
      >
        {props.description && <AntParagraph>{props.description}</AntParagraph>}
        {children}
      </Modal>
    );
  },

  Drawer: ({
    props,
    children,
    emit,
  }: BaseComponentProps<AntdProps<"Drawer">>) => {
    const [open, setOpen] = useStateBinding<boolean>(props.openPath ?? "");

    return (
      <Drawer
        title={props.title}
        open={open ?? false}
        onClose={() => {
          emit("close");
          setOpen(false);
        }}
        placement={props.placement ?? "right"}
        width={props.width ?? 378}
      >
        {props.description && <AntParagraph>{props.description}</AntParagraph>}
        {children}
      </Drawer>
    );
  },

  Popover: ({ props }: BaseComponentProps<AntdProps<"Popover">>) => {
    return (
      <Popover content={props.content} placement={props.placement ?? "top"}>
        <span>{props.trigger}</span>
      </Popover>
    );
  },

  Tooltip: ({ props }: BaseComponentProps<AntdProps<"Tooltip">>) => {
    return (
      <Tooltip title={props.content} placement={props.placement ?? "top"}>
        <span>{props.text}</span>
      </Tooltip>
    );
  },

  Dropdown: ({ props, emit }: BaseComponentProps<AntdProps<"Dropdown">>) => {
    const items = props.items ?? [];

    const menuItems = items.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon ? <span className={item.icon} /> : undefined,
      danger: item.danger ?? false,
    }));

    return (
      <Dropdown
        menu={{
          items: menuItems,
          onClick: () => emit("select"),
        }}
      >
        <Button>{props.label}</Button>
      </Dropdown>
    );
  },

  // ── Data Display ───────────────────────────────────────────────────────

  Table: ({ props }: BaseComponentProps<AntdProps<"Table">>) => {
    const columns = props.columns ?? [];
    const rows = props.rows ?? [];

    const dataSource = rows.map((row, idx) => ({
      key: String(idx),
      ...row.reduce(
        (acc, cell, colIdx) => {
          acc[`col${colIdx}`] = cell;
          return acc;
        },
        {} as Record<string, string>,
      ),
    }));

    const tableColumns = columns.map((col, idx) => ({
      title: col,
      dataIndex: `col${idx}`,
      key: `col${idx}`,
    }));

    return (
      <Table
        columns={tableColumns}
        dataSource={dataSource}
        bordered={props.bordered ?? false}
        size={props.size ?? "middle"}
        loading={props.loading ?? false}
        title={
          props.caption
            ? () => <AntText strong>{props.caption}</AntText>
            : undefined
        }
        pagination={false}
      />
    );
  },

  Heading: ({ props }: BaseComponentProps<AntdProps<"Heading">>) => {
    const levelMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
      h1: 1,
      h2: 2,
      h3: 3,
      h4: 4,
      h5: 5,
    };

    return (
      <Title level={levelMap[props.level ?? "h2"] ?? 2}>{props.text}</Title>
    );
  },

  Text: ({ props }: BaseComponentProps<AntdProps<"Text">>) => {
    return (
      <AntText
        type={props.type ?? undefined}
        code={props.code ?? false}
        copyable={props.copyable ?? false}
        delete={props.delete ?? false}
        mark={props.mark ?? false}
        underline={props.underline ?? false}
        strong={props.strong ?? false}
        italic={props.italic ?? false}
      >
        {props.text}
      </AntText>
    );
  },

  Paragraph: ({ props }: BaseComponentProps<AntdProps<"Paragraph">>) => {
    return (
      <AntParagraph
        ellipsis={
          props.ellipsis && props.rows
            ? { rows: props.rows }
            : (props.ellipsis ?? false)
        }
      >
        {props.text}
      </AntParagraph>
    );
  },

  Image: ({ props }: BaseComponentProps<AntdProps<"Image">>) => {
    if (props.src) {
      return (
        <Image
          src={props.src}
          alt={props.alt}
          width={props.width ?? undefined}
          height={props.height ?? undefined}
          preview={props.preview ?? true}
        />
      );
    }
    return (
      <div
        className="bg-gray-100 border rounded flex items-center justify-center text-xs text-gray-500"
        style={{
          width: typeof props.width === "number" ? props.width : 80,
          height: typeof props.height === "number" ? props.height : 60,
        }}
      >
        {props.alt || "img"}
      </div>
    );
  },

  Avatar: ({ props }: BaseComponentProps<AntdProps<"Avatar">>) => {
    const name = props.name || "?";

    return (
      <Avatar
        src={props.src ?? undefined}
        size={props.size ?? "default"}
        shape={props.shape ?? "circle"}
      >
        {!props.src && name.charAt(0).toUpperCase()}
      </Avatar>
    );
  },

  Badge: ({ props, children }: BaseComponentProps<AntdProps<"Badge">>) => {
    if (props.count !== undefined) {
      return (
        <Badge count={props.count} color={props.color ?? undefined}>
          {children}
        </Badge>
      );
    }
    return (
      <Badge
        status={props.status ?? undefined}
        text={props.text ?? undefined}
      />
    );
  },

  Tag: ({ props, emit }: BaseComponentProps<AntdProps<"Tag">>) => {
    return (
      <Tag
        color={props.color ?? undefined}
        closable={props.closable ?? false}
        onClose={(e) => {
          e.preventDefault();
          emit("close");
        }}
      >
        {props.text}
      </Tag>
    );
  },

  Alert: ({ props, emit }: BaseComponentProps<AntdProps<"Alert">>) => {
    return (
      <Alert
        message={props.title}
        description={props.message ?? undefined}
        type={props.type ?? "info"}
        closable={props.closable ?? false}
        showIcon={props.showIcon ?? true}
        onClose={() => emit("close")}
      />
    );
  },

  Progress: ({ props }: BaseComponentProps<AntdProps<"Progress">>) => {
    const max = props.max ?? 100;
    const value = Math.min(max, Math.max(0, props.value ?? 0));
    const percent = Math.round((value / max) * 100);

    return (
      <Progress
        percent={percent}
        status={props.status ?? undefined}
        type={props.type ?? "line"}
        format={() => props.label ?? `${percent}%`}
      />
    );
  },

  Skeleton: ({
    props,
    children,
  }: BaseComponentProps<AntdProps<"Skeleton">>) => {
    return (
      <Skeleton
        loading={props.loading ?? true}
        active={props.active ?? true}
        paragraph={{ rows: props.rows ?? 3 }}
      >
        {children}
      </Skeleton>
    );
  },

  Spin: ({ props, children }: BaseComponentProps<AntdProps<"Spin">>) => {
    return (
      <Spin
        size={props.size ?? "default"}
        tip={props.label ?? undefined}
        spinning={props.spinning ?? true}
      >
        {children}
      </Spin>
    );
  },

  Empty: ({ props }: BaseComponentProps<AntdProps<"Empty">>) => {
    return <Empty description={props.description ?? undefined} />;
  },

  Statistic: ({ props }: BaseComponentProps<AntdProps<"Statistic">>) => {
    return (
      <Statistic
        title={props.title}
        value={props.value}
        prefix={props.prefix ?? undefined}
        suffix={props.suffix ?? undefined}
      />
    );
  },

  Descriptions: ({ props }: BaseComponentProps<AntdProps<"Descriptions">>) => {
    const items = props.items ?? [];

    return (
      <Descriptions
        title={props.title ?? undefined}
        bordered={props.bordered ?? false}
        column={props.column ?? 1}
        items={items.map((item) => ({
          key: item.label,
          label: item.label,
          children: item.value,
        }))}
      />
    );
  },

  Timeline: ({ props }: BaseComponentProps<AntdProps<"Timeline">>) => {
    const items = props.items ?? [];

    return (
      <Timeline
        items={items.map((item) => ({
          color: item.color ?? undefined,
          children: item.content,
        }))}
      />
    );
  },

  Carousel: ({ props }: BaseComponentProps<AntdProps<"Carousel">>) => {
    const items = props.items ?? [];

    return (
      <Carousel autoplay={props.autoplay ?? false} dots={props.dots ?? true}>
        {items.map((item, idx) => (
          <div key={idx} className="p-4">
            {item.title && <Title level={3}>{item.title}</Title>}
            {item.description && (
              <AntParagraph>{item.description}</AntParagraph>
            )}
          </div>
        ))}
      </Carousel>
    );
  },

  // ── Form Inputs ────────────────────────────────────────────────────────

  Input: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Input">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState("");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;
    const validateOn = props.validateOn ?? "blur";

    const hasValidation = !!(bindings?.value && props.checks?.length);
    const { errors, validate } = useFieldValidation(
      bindings?.value ?? "",
      hasValidation ? { checks: props.checks ?? [], validateOn } : undefined,
    );

    return (
      <Form.Item
        label={props.label}
        validateStatus={
          errors.length > 0 ? "error" : (props.status ?? undefined)
        }
        help={errors[0]}
      >
        <Input
          name={props.name}
          type={props.type ?? "text"}
          placeholder={props.placeholder ?? undefined}
          value={value}
          prefix={props.prefix ? <span className={props.prefix} /> : undefined}
          suffix={props.suffix ? <span className={props.suffix} /> : undefined}
          allowClear={props.allowClear ?? false}
          showCount={props.showCount ?? false}
          maxLength={props.maxLength ?? undefined}
          status={props.status ?? (errors.length > 0 ? "error" : undefined)}
          onChange={(e) => {
            setValue(e.target.value);
            if (hasValidation && validateOn === "change") validate();
            emit("change");
          }}
          onFocus={() => emit("focus")}
          onBlur={() => {
            if (hasValidation && validateOn === "blur") validate();
            emit("blur");
          }}
          onPressEnter={() => emit("submit")}
        />
      </Form.Item>
    );
  },

  TextArea: ({
    props,
    bindings,
  }: BaseComponentProps<AntdProps<"TextArea">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState("");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;
    const validateOn = props.validateOn ?? "blur";

    const hasValidation = !!(bindings?.value && props.checks?.length);
    const { errors, validate } = useFieldValidation(
      bindings?.value ?? "",
      hasValidation ? { checks: props.checks ?? [], validateOn } : undefined,
    );

    return (
      <Form.Item
        label={props.label}
        validateStatus={errors.length > 0 ? "error" : undefined}
        help={errors[0]}
      >
        <Input.TextArea
          name={props.name}
          placeholder={props.placeholder ?? undefined}
          rows={props.rows ?? 3}
          value={value}
          allowClear={props.allowClear ?? false}
          showCount={props.showCount ?? false}
          maxLength={props.maxLength ?? undefined}
          autoSize={props.autoSize ?? undefined}
          status={errors.length > 0 ? "error" : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            if (hasValidation && validateOn === "change") validate();
          }}
          onBlur={() => {
            if (hasValidation && validateOn === "blur") validate();
          }}
        />
      </Form.Item>
    );
  },

  InputNumber: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"InputNumber">>) => {
    const [boundValue, setBoundValue] = useBoundProp<number>(
      props.value as number | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState<number | null>(null);
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? null) : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    return (
      <Form.Item label={props.label}>
        <InputNumber
          name={props.name}
          placeholder={props.placeholder ?? undefined}
          value={value}
          min={props.min ?? undefined}
          max={props.max ?? undefined}
          step={props.step ?? undefined}
          precision={props.precision ?? undefined}
          prefix={props.prefix ? <span className={props.prefix} /> : undefined}
          addonAfter={
            props.suffix ? <span className={props.suffix} /> : undefined
          }
          onChange={(val) => {
            setValue(val as number);
            emit("change");
          }}
        />
      </Form.Item>
    );
  },

  Select: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Select">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState("");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;
    const validateOn = props.validateOn ?? "change";

    const hasValidation = !!(bindings?.value && props.checks?.length);
    const { errors, validate } = useFieldValidation(
      bindings?.value ?? "",
      hasValidation ? { checks: props.checks ?? [], validateOn } : undefined,
    );

    const options = (props.options ?? []).map((opt) =>
      typeof opt === "string" ? { label: opt, value: opt } : opt,
    );

    return (
      <Form.Item
        label={props.label}
        validateStatus={errors.length > 0 ? "error" : undefined}
        help={errors[0]}
      >
        <Select
          options={options}
          placeholder={props.placeholder ?? undefined}
          value={value}
          mode={props.mode ?? undefined}
          allowClear={props.allowClear ?? false}
          showSearch={props.showSearch ?? false}
          status={errors.length > 0 ? "error" : undefined}
          onChange={(val) => {
            setValue(val as string);
            if (hasValidation && validateOn === "change") validate();
            emit("change");
          }}
        />
      </Form.Item>
    );
  },

  Checkbox: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Checkbox">>) => {
    const [boundChecked, setBoundChecked] = useBoundProp<boolean>(
      props.checked as boolean | undefined,
      bindings?.checked,
    );
    const [localChecked, setLocalChecked] = useState(props.checked ?? false);
    const isBound = !!bindings?.checked;
    const checked = isBound ? (boundChecked ?? false) : localChecked;
    const setChecked = isBound ? setBoundChecked : setLocalChecked;

    const validateOn = props.validateOn ?? "change";
    const hasValidation = !!(bindings?.checked && props.checks?.length);
    const { errors, validate } = useFieldValidation(
      bindings?.checked ?? "",
      hasValidation ? { checks: props.checks ?? [], validateOn } : undefined,
    );

    return (
      <Form.Item
        validateStatus={errors.length > 0 ? "error" : undefined}
        help={errors[0]}
      >
        <Checkbox
          name={props.name}
          checked={checked}
          indeterminate={props.indeterminate ?? false}
          onChange={(e) => {
            setChecked(e.target.checked);
            if (hasValidation && validateOn === "change") validate();
            emit("change");
          }}
        >
          {props.label}
        </Checkbox>
      </Form.Item>
    );
  },

  CheckboxGroup: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"CheckboxGroup">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string[]>(
      props.value as string[] | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState<string[]>([]);
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? []) : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    const options = (props.options ?? []).map((opt) =>
      typeof opt === "string" ? { label: opt, value: opt } : opt,
    );

    return (
      <Form.Item label={props.label}>
        <Checkbox.Group
          options={options}
          value={value}
          onChange={(checkedValues) => {
            setValue(checkedValues as string[]);
            emit("change");
          }}
        />
      </Form.Item>
    );
  },

  Radio: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Radio">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState("");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    const validateOn = props.validateOn ?? "change";
    const hasValidation = !!(bindings?.value && props.checks?.length);
    const { errors, validate } = useFieldValidation(
      bindings?.value ?? "",
      hasValidation ? { checks: props.checks ?? [], validateOn } : undefined,
    );

    const options = (props.options ?? []).map((opt) =>
      typeof opt === "string" ? { label: opt, value: opt } : opt,
    );

    return (
      <Form.Item
        label={props.label}
        validateStatus={errors.length > 0 ? "error" : undefined}
        help={errors[0]}
      >
        <Radio.Group
          name={props.name}
          value={value}
          optionType={props.optionType ?? "default"}
          onChange={(e) => {
            setValue(e.target.value);
            if (hasValidation && validateOn === "change") validate();
            emit("change");
          }}
        >
          {options.map((opt) => (
            <Radio key={opt.value} value={opt.value}>
              {opt.label}
            </Radio>
          ))}
        </Radio.Group>
      </Form.Item>
    );
  },

  Switch: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Switch">>) => {
    const [boundChecked, setBoundChecked] = useBoundProp<boolean>(
      props.checked as boolean | undefined,
      bindings?.checked,
    );
    const [localChecked, setLocalChecked] = useState(props.checked ?? false);
    const isBound = !!bindings?.checked;
    const checked = isBound ? (boundChecked ?? false) : localChecked;
    const setChecked = isBound ? setBoundChecked : setLocalChecked;

    const validateOn = props.validateOn ?? "change";
    const hasValidation = !!(bindings?.checked && props.checks?.length);
    const { errors, validate } = useFieldValidation(
      bindings?.checked ?? "",
      hasValidation ? { checks: props.checks ?? [], validateOn } : undefined,
    );

    return (
      <Form.Item
        label={props.label}
        validateStatus={errors.length > 0 ? "error" : undefined}
        help={errors[0]}
      >
        <Switch
          checked={checked}
          checkedChildren={props.checkedChildren ?? undefined}
          unCheckedChildren={props.unCheckedChildren ?? undefined}
          onChange={(c) => {
            setChecked(c);
            if (hasValidation && validateOn === "change") validate();
            emit("change");
          }}
        />
      </Form.Item>
    );
  },

  Slider: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Slider">>) => {
    const isRange = props.range ?? false;
    const singleDefault = props.min ?? 0;
    const rangeDefault: [number, number] = [props.min ?? 0, props.max ?? 100];

    const [localValue, setLocalValue] = useState<number | [number, number]>(
      isRange ? rangeDefault : singleDefault,
    );
    const [boundValue, setBoundValue] = useBoundProp<number | [number, number]>(
      (props.value as number | [number, number] | undefined) ??
        (isRange ? rangeDefault : singleDefault),
      bindings?.value,
    );
    const isBound = !!bindings?.value;
    const value = isBound
      ? (boundValue ?? (isRange ? rangeDefault : singleDefault))
      : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    return (
      <Form.Item label={props.label}>
        {isRange ? (
          <Slider
            min={props.min ?? 0}
            max={props.max ?? 100}
            step={props.step ?? 1}
            value={value as [number, number]}
            range
            marks={props.marks ?? undefined}
            onChange={(val: number | number[]) => {
              setValue(val as [number, number]);
              emit("change");
            }}
          />
        ) : (
          <Slider
            min={props.min ?? 0}
            max={props.max ?? 100}
            step={props.step ?? 1}
            value={value as number}
            marks={props.marks ?? undefined}
            onChange={(val: number | number[]) => {
              setValue(val as number);
              emit("change");
            }}
          />
        )}
      </Form.Item>
    );
  },

  Rate: ({ props, bindings, emit }: BaseComponentProps<AntdProps<"Rate">>) => {
    const [boundValue, setBoundValue] = useBoundProp<number>(
      props.value as number | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState(0);
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? 0) : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    return (
      <Form.Item label={props.label}>
        <Rate
          count={props.count ?? 5}
          value={value}
          allowHalf={props.allowHalf ?? false}
          allowClear={props.allowClear ?? true}
          onChange={(val) => {
            setValue(val);
            emit("change");
          }}
        />
      </Form.Item>
    );
  },

  DatePicker: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"DatePicker">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const isBound = !!bindings?.value;
    const value = boundValue ?? props.value;

    // Note: Antd DatePicker requires dayjs for full functionality
    // For string-based usage, we pass the value directly
    return (
      <Form.Item label={props.label}>
        <Input
          name={props.name}
          type="date"
          placeholder={props.placeholder ?? undefined}
          value={value ?? ""}
          onChange={(e) => {
            if (isBound) {
              setBoundValue(e.target.value);
            }
            emit("change");
          }}
        />
      </Form.Item>
    );
  },

  TimePicker: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"TimePicker">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState("");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    // Convert string value to dayjs object for antd TimePicker
    const dayjsValue = value ? dayjs(value, props.format ?? "HH:mm:ss") : null;

    return (
      <Form.Item label={props.label}>
        <TimePicker
          name={props.name}
          placeholder={props.placeholder ?? undefined}
          format={props.format ?? "HH:mm:ss"}
          value={dayjsValue}
          onChange={(time, timeString) => {
            setValue(timeString as string);
            emit("change");
          }}
        />
      </Form.Item>
    );
  },

  Upload: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Upload">>) => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    return (
      <Form.Item label={props.label}>
        <Upload
          accept={props.accept ?? undefined}
          multiple={props.multiple ?? false}
          maxCount={props.maxCount ?? undefined}
          listType={props.listType ?? "text"}
          fileList={fileList}
          beforeUpload={() => false}
          onChange={(info) => {
            setFileList(info.fileList);
            emit("change");
          }}
        >
          <Button>{props.buttonText ?? "Upload"}</Button>
        </Upload>
      </Form.Item>
    );
  },

  Transfer: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Transfer">>) => {
    const [boundTargetKeys, setBoundTargetKeys] = useBoundProp<string[]>(
      (props.targetKeys as string[] | null) ?? undefined,
      bindings?.targetKeys,
    );
    const [localTargetKeys, setLocalTargetKeys] = useState<string[]>([]);
    const isBound = !!bindings?.targetKeys;
    const targetKeys = isBound ? (boundTargetKeys ?? []) : localTargetKeys;
    const setTargetKeys = isBound ? setBoundTargetKeys : setLocalTargetKeys;

    const dataSource = (props.dataSource ?? []).map((item) => ({
      ...item,
      description: item.description ?? undefined,
    }));

    return (
      <Form.Item label={props.label}>
        <Transfer
          dataSource={dataSource}
          targetKeys={targetKeys}
          titles={props.titles ?? ["Source", "Target"]}
          onChange={(newTargetKeys) => {
            setTargetKeys(newTargetKeys as string[]);
            emit("change");
          }}
          render={(item) => item.title ?? ""}
        />
      </Form.Item>
    );
  },

  // ── Actions ───────────────────────────────────────────────────────────

  Button: ({ props, emit, on }: BaseComponentProps<AntdProps<"Button">>) => {
    const type = props.type ?? "default";

    return (
      <Button
        type={type}
        danger={props.danger ?? false}
        disabled={props.disabled ?? false}
        loading={props.loading ?? false}
        icon={props.icon ? <span className={props.icon} /> : undefined}
        block={props.block ?? false}
        size={props.size ?? "middle"}
        onClick={() => emit("press")}
      >
        {props.label}
      </Button>
    );
  },

  ButtonGroup: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"ButtonGroup">>) => {
    const buttons = props.buttons ?? [];
    const [boundSelected, setBoundSelected] = useBoundProp<string>(
      props.selected as string | undefined,
      bindings?.selected,
    );
    const [localValue, setLocalValue] = useState(buttons[0]?.value ?? "");
    const isBound = !!bindings?.selected;
    const value = isBound ? (boundSelected ?? "") : localValue;
    const setValue = isBound ? setBoundSelected : setLocalValue;

    return (
      <Segmented
        options={buttons.map((btn) => ({
          label: btn.label,
          value: btn.value,
        }))}
        value={value}
        onChange={(val) => {
          setValue(val as string);
          emit("change");
        }}
      />
    );
  },

  Link: ({ props, emit, on }: BaseComponentProps<AntdProps<"Link">>) => {
    const handlePress = () => {
      emit("press");
    };

    return (
      <AntLink
        href={props.href ?? "#"}
        target={props.target ?? "_self"}
        disabled={props.disabled ?? false}
        onClick={(e) => {
          const press = on("press");
          if (press.shouldPreventDefault || !props.href || props.href === "#") {
            e.preventDefault();
          }
          press.emit();
        }}
      >
        {props.label}
      </AntLink>
    );
  },

  Pagination: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Pagination">>) => {
    const [boundCurrent, setBoundCurrent] = useBoundProp<number>(
      props.current as number | undefined,
      bindings?.current,
    );
    const [localCurrent, setLocalCurrent] = useState(1);
    const isBound = !!bindings?.current;
    const current = isBound ? (boundCurrent ?? 1) : localCurrent;
    const setCurrent = isBound ? setBoundCurrent : setLocalCurrent;

    return (
      <Pagination
        total={props.total}
        pageSize={props.pageSize ?? 10}
        current={current}
        showSizeChanger={props.showSizeChanger ?? false}
        showQuickJumper={props.showQuickJumper ?? false}
        simple={props.simple ?? false}
        onChange={(page, pageSize) => {
          setCurrent(page);
          emit("change");
        }}
      />
    );
  },

  Segmented: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Segmented">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState("");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    const options = (props.options ?? []).map((opt) =>
      typeof opt === "string"
        ? opt
        : {
            label: opt.label,
            value: opt.value,
            icon: opt.icon ? <span className={opt.icon} /> : undefined,
          },
    );

    return (
      <Segmented
        options={options}
        value={value}
        block={props.block ?? false}
        onChange={(val) => {
          setValue(val as string);
          emit("change");
        }}
      />
    );
  },

  Steps: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Steps">>) => {
    const [boundCurrent, setBoundCurrent] = useBoundProp<number>(
      props.current as number | undefined,
      bindings?.current,
    );
    const [localCurrent, setLocalCurrent] = useState(0);
    const isBound = !!bindings?.current;
    const current = isBound ? (boundCurrent ?? 0) : localCurrent;
    const setCurrent = isBound ? setBoundCurrent : setLocalCurrent;

    const items = (props.items ?? []).map((item) => ({
      title: item.title,
      description: item.description,
      icon: item.icon ? <span className={item.icon} /> : undefined,
    }));

    return (
      <Steps
        current={current}
        direction={props.direction ?? "horizontal"}
        status={props.status ?? "process"}
        items={items}
        onChange={(current) => {
          setCurrent(current);
          emit("change");
        }}
      />
    );
  },

  Result: ({ props, children }: BaseComponentProps<AntdProps<"Result">>) => {
    return (
      <Result
        status={props.status ?? "info"}
        title={props.title}
        subTitle={props.subTitle ?? undefined}
        extra={children}
      />
    );
  },
};
