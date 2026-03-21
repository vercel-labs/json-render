"use client";

import { Children, useState } from "react";
import dayjs from "dayjs";
import {
  useBoundProp,
  useStateBinding,
  useFieldValidation,
  type BaseComponentProps,
} from "@json-render/react";
import type { ReactNode } from "react";

/** BaseComponentProps extended with slots for components that use slotted content. */
type SlottedComponentProps<P> = BaseComponentProps<P> & {
  slots?: Record<string, ReactNode[]>;
};

import {
  Card,
  Space,
  Divider,
  Row,
  Col,
  Masonry,
  Layout,
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
  Calendar,
  List,
  Tree,
  QRCode,
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
  AutoComplete,
  Cascader,
  ColorPicker,
  Mentions,
  TreeSelect,
  Button,
  Pagination,
  Segmented,
  Steps,
  Result,
  Flex,
  Form,
  Affix,
  Anchor,
  Breadcrumb,
  BackTop,
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

  Layout: ({ props, children }: BaseComponentProps<AntdProps<"Layout">>) => {
    return <Layout hasSider={props.hasSider ?? undefined}>{children}</Layout>;
  },

  LayoutHeader: ({
    children,
  }: BaseComponentProps<AntdProps<"LayoutHeader">>) => {
    return <Layout.Header>{children}</Layout.Header>;
  },

  LayoutContent: ({
    children,
  }: BaseComponentProps<AntdProps<"LayoutContent">>) => {
    return <Layout.Content>{children}</Layout.Content>;
  },

  LayoutFooter: ({
    children,
  }: BaseComponentProps<AntdProps<"LayoutFooter">>) => {
    return <Layout.Footer>{children}</Layout.Footer>;
  },

  LayoutSider: ({
    props,
    children,
    emit,
  }: BaseComponentProps<AntdProps<"LayoutSider">>) => {
    return (
      <Layout.Sider
        width={props.width ?? undefined}
        collapsible={props.collapsible ?? false}
        collapsed={props.collapsed ?? undefined}
        defaultCollapsed={props.defaultCollapsed ?? false}
        collapsedWidth={props.collapsedWidth ?? undefined}
        reverseArrow={props.reverseArrow ?? false}
        breakpoint={props.breakpoint ?? undefined}
        theme={props.theme ?? "dark"}
        onCollapse={() => emit("collapse")}
      >
        {children}
      </Layout.Sider>
    );
  },

  Card: ({
    props,
    children,
    slots,
  }: SlottedComponentProps<AntdProps<"Card">>) => {
    const extraSlot = slots?.extra?.[0];
    const coverSlot = slots?.cover?.[0];
    const actionsSlots = slots?.actions ?? [];

    return (
      <Card
        title={props.title ?? undefined}
        extra={
          extraSlot ?? (props.extra ? <span>{props.extra}</span> : undefined)
        }
        variant={props.variant ?? "outlined"}
        hoverable={props.hoverable ?? false}
        loading={props.loading ?? false}
        size={props.size ?? "default"}
        cover={
          coverSlot ??
          (props.cover ? <img src={props.cover} alt="cover" /> : undefined)
        }
        actions={
          actionsSlots.length > 0
            ? actionsSlots
            : props.actions
              ? props.actions.map((action, idx) => (
                  <span key={idx}>{action}</span>
                ))
              : undefined
        }
      >
        {children}
      </Card>
    );
  },

  Flex: ({ props, children }: BaseComponentProps<AntdProps<"Flex">>) => {
    return (
      <Flex
        vertical={props.vertical ?? undefined}
        wrap={props.wrap ?? undefined}
        justify={props.justify ?? undefined}
        align={props.align ?? undefined}
        gap={props.gap ?? undefined}
        flex={props.flex ?? undefined}
      >
        {children}
      </Flex>
    );
  },

  Stack: ({ props, children }: BaseComponentProps<AntdProps<"Stack">>) => {
    return (
      <Flex
        vertical={props.direction !== "horizontal"}
        wrap={props.wrap ?? undefined}
        justify={props.justify ?? undefined}
        align={props.align ?? undefined}
        gap={props.gap ?? undefined}
      >
        {children}
      </Flex>
    );
  },

  Grid: ({ props, children }: BaseComponentProps<AntdProps<"Grid">>) => {
    const columns = props.columns ?? 3;
    const span = Math.floor(24 / Math.min(Math.max(columns, 1), 6));
    const gapMap = { sm: 8, md: 16, lg: 24 } as const;
    const gutter = props.gap ? gapMap[props.gap] : 16;
    const childArray = Children.toArray(children);
    return (
      <Row gutter={[gutter, gutter]}>
        {childArray.map((child, i) => (
          <Col key={i} span={span}>
            {child}
          </Col>
        ))}
      </Row>
    );
  },

  Row: ({ props, children }: BaseComponentProps<AntdProps<"Row">>) => {
    return (
      <Row
        gutter={props.gutter ?? undefined}
        align={props.align ?? undefined}
        justify={props.justify ?? undefined}
        wrap={props.wrap ?? undefined}
      >
        {children}
      </Row>
    );
  },

  Col: ({ props, children }: BaseComponentProps<AntdProps<"Col">>) => {
    return (
      <Col
        span={props.span ?? undefined}
        offset={props.offset ?? undefined}
        order={props.order ?? undefined}
        push={props.push ?? undefined}
        pull={props.pull ?? undefined}
        flex={props.flex ?? undefined}
      >
        {children}
      </Col>
    );
  },

  Masonry: ({ props, children }: BaseComponentProps<AntdProps<"Masonry">>) => {
    const childArray = Array.isArray(children)
      ? children
      : children
        ? [children]
        : [];
    const items = childArray.map((child, index) => ({
      key: index,
      children: child,
      data: {},
    }));

    return (
      <Masonry
        columns={props.columns ?? 3}
        gutter={props.gutter ?? [16, 16]}
        items={items}
      />
    );
  },

  Divider: ({ props }: BaseComponentProps<AntdProps<"Divider">>) => {
    return (
      <Divider
        orientation={
          props.vertical ? "vertical" : (props.orientation ?? "horizontal")
        }
        titlePlacement={props.titlePlacement ?? undefined}
        dashed={props.dashed ?? false}
        variant={props.variant ?? undefined}
        plain={props.plain ?? false}
        size={props.size ?? undefined}
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
        orientation={props.orientation ?? "horizontal"}
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
    slots,
    bindings,
    emit,
  }: SlottedComponentProps<AntdProps<"Tabs">>) => {
    const tabs = props.tabs ?? [];
    const tabContents = slots?.tabs ?? [];
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

    const items = tabs.map((tab, index) => ({
      key: tab.value,
      label: tab.label,
      children: tabContents[index] ?? null,
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
        centered={props.centered ?? false}
        size={props.size ?? undefined}
        tabBarGutter={props.tabBarGutter ?? undefined}
        destroyInactiveTabPane={props.destroyInactiveTabPane ?? false}
        items={items}
      />
    );
  },

  Collapse: ({
    props,
    slots,
  }: SlottedComponentProps<AntdProps<"Collapse">>) => {
    const items = props.items ?? [];
    const itemContents = slots?.items ?? [];

    const collapseItems = items.map((item, idx) => ({
      key: String(idx),
      label: item.title,
      children: itemContents[idx] ?? null,
    }));

    return (
      <Collapse
        accordion={props.accordion ?? false}
        bordered={props.bordered ?? true}
        ghost={props.ghost ?? false}
        size={props.size ?? undefined}
        expandIconPlacement={props.expandIconPlacement ?? undefined}
        collapsible={props.collapsible ?? undefined}
        defaultActiveKey={props.defaultActiveKey ?? undefined}
        activeKey={props.activeKey ?? undefined}
        items={collapseItems}
      />
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
        defaultSelectedKeys={props.defaultSelectedKeys ?? undefined}
        theme={props.theme ?? undefined}
        inlineCollapsed={props.inlineCollapsed ?? undefined}
        multiple={props.multiple ?? false}
        items={menuItems}
        onClick={({ key }) => emit("select")}
      />
    );
  },

  Affix: ({ props, children }: BaseComponentProps<AntdProps<"Affix">>) => {
    return (
      <Affix
        offsetBottom={props.offsetBottom ?? undefined}
        offsetTop={props.offsetTop ?? undefined}
      >
        {children}
      </Affix>
    );
  },

  Anchor: ({ props, emit }: BaseComponentProps<AntdProps<"Anchor">>) => {
    const items = (props.items ?? []).map((item) => ({
      key: item.key,
      title: item.title,
      href: item.href ?? `#${item.key}`,
    }));

    return (
      <Anchor
        affix={props.affix ?? true}
        bounds={props.bounds ?? 5}
        offsetTop={props.offsetTop ?? undefined}
        targetOffset={props.targetOffset ?? undefined}
        items={items}
        onChange={(currentActiveLink) => emit("change")}
        onClick={(e, link) => emit("click")}
      />
    );
  },

  Breadcrumb: ({ props }: BaseComponentProps<AntdProps<"Breadcrumb">>) => {
    const items = (props.items ?? []).map((item) => ({
      title: item.title,
      href: item.href ?? undefined,
    }));

    return <Breadcrumb separator={props.separator ?? "/"} items={items} />;
  },

  BackTop: ({ props, children }: BaseComponentProps<AntdProps<"BackTop">>) => {
    return (
      <BackTop
        visibilityHeight={props.visibilityHeight ?? 400}
        duration={props.duration ?? 450}
      >
        {children}
      </BackTop>
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
        centered={props.centered ?? false}
        closable={props.closable ?? true}
        maskClosable={props.maskClosable ?? true}
        okText={props.okText ?? undefined}
        cancelText={props.cancelText ?? undefined}
        confirmLoading={props.confirmLoading ?? false}
        destroyOnClose={props.destroyOnClose ?? false}
        keyboard={props.keyboard ?? true}
        loading={props.loading ?? false}
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
        height={props.height ?? undefined}
        closable={props.closable ?? true}
        maskClosable={props.maskClosable ?? true}
        destroyOnClose={props.destroyOnClose ?? false}
        keyboard={props.keyboard ?? true}
        loading={props.loading ?? false}
        size={props.size ?? undefined}
      >
        {props.description && <AntParagraph>{props.description}</AntParagraph>}
        {children}
      </Drawer>
    );
  },

  Popover: ({ props }: BaseComponentProps<AntdProps<"Popover">>) => {
    return (
      <Popover
        title={props.title ?? undefined}
        content={props.content}
        placement={props.placement ?? "top"}
        trigger={props.triggerType ?? "hover"}
        arrow={props.arrow ?? true}
        open={props.open ?? undefined}
        defaultOpen={props.defaultOpen ?? undefined}
      >
        <span>{props.trigger}</span>
      </Popover>
    );
  },

  Tooltip: ({ props }: BaseComponentProps<AntdProps<"Tooltip">>) => {
    return (
      <Tooltip
        title={props.content}
        placement={props.placement ?? "top"}
        trigger={props.triggerType ?? "hover"}
        arrow={props.arrow ?? true}
        color={props.color ?? undefined}
        open={props.open ?? undefined}
        defaultOpen={props.defaultOpen ?? undefined}
      >
        <span>{props.text}</span>
      </Tooltip>
    );
  },

  Dropdown: ({
    props,
    children,
    emit,
    bindings,
  }: SlottedComponentProps<AntdProps<"Dropdown">>) => {
    const items = props.items ?? [];

    const menuItems = items
      .filter((item) => !item.divider)
      .map((item) => ({
        key: item.key,
        label: item.label,
        icon: item.icon ? <span className={item.icon} /> : undefined,
        danger: item.danger ?? false,
        disabled: item.disabled ?? false,
      }));

    const [boundOpen, setBoundOpen] = useBoundProp<boolean>(
      props.open as boolean | undefined,
      bindings?.open,
    );
    const isControlled =
      bindings?.open !== undefined || props.open !== undefined;
    const [localOpen, setLocalOpen] = useState(props.defaultOpen ?? false);
    const open = isControlled ? (boundOpen ?? false) : localOpen;
    const setOpen = isControlled ? setBoundOpen : setLocalOpen;

    return (
      <Dropdown
        menu={{
          items: menuItems,
          onClick: ({ key }) => {
            emit("select");
          },
        }}
        trigger={props.trigger ? [props.trigger] : undefined}
        placement={props.placement ?? undefined}
        arrow={props.arrow ?? false}
        disabled={props.disabled ?? false}
        open={open}
        onOpenChange={(visible) => {
          setOpen(visible);
          emit("openChange");
          emit("visibleChange");
        }}
      >
        {children}
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

    const paginationConfig =
      props.pagination === false
        ? false
        : props.pagination === true || props.pagination == null
          ? false
          : {
              pageSize: props.pagination.pageSize ?? undefined,
              current: props.pagination.current ?? undefined,
              total: props.pagination.total ?? undefined,
              showSizeChanger: props.pagination.showSizeChanger ?? false,
              showQuickJumper: props.pagination.showQuickJumper ?? false,
              simple: props.pagination.simple ?? false,
              hideOnSinglePage: props.pagination.hideOnSinglePage ?? false,
            };

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
        pagination={paginationConfig}
        scroll={
          props.scroll
            ? { x: props.scroll.x ?? undefined, y: props.scroll.y ?? undefined }
            : undefined
        }
        showHeader={props.showHeader ?? true}
        rowKey={props.rowKey ?? "key"}
        sticky={props.sticky ?? false}
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
    return (
      <Image
        src={props.src}
        alt={props.alt}
        width={props.width ?? undefined}
        height={props.height ?? undefined}
        preview={props.preview ?? true}
        fallback={props.fallback ?? undefined}
      />
    );
  },

  Avatar: ({ props }: BaseComponentProps<AntdProps<"Avatar">>) => {
    const name = props.name || "?";

    return (
      <Avatar
        src={props.src ?? undefined}
        size={props.size ?? "default"}
        shape={props.shape ?? "circle"}
        icon={props.icon ? <span className={props.icon} /> : undefined}
        alt={props.alt ?? undefined}
        gap={props.gap ?? undefined}
      >
        {!props.src && name.charAt(0).toUpperCase()}
      </Avatar>
    );
  },

  Badge: ({ props, children }: BaseComponentProps<AntdProps<"Badge">>) => {
    const hasChildren = !!children;

    if (!hasChildren) {
      return (
        <Badge
          status={props.status ?? undefined}
          text={props.text ?? undefined}
          color={props.color ?? undefined}
        />
      );
    }

    return (
      <Badge
        count={props.count ?? undefined}
        dot={props.dot ?? false}
        color={props.color ?? undefined}
        status={props.status ?? undefined}
        text={props.text ?? undefined}
        size={props.size ?? undefined}
        overflowCount={props.overflowCount ?? 99}
        showZero={props.showZero ?? false}
        title={props.title ?? undefined}
        offset={props.offset ?? undefined}
      >
        {children}
      </Badge>
    );
  },

  Tag: ({ props, emit }: BaseComponentProps<AntdProps<"Tag">>) => {
    return (
      <Tag
        color={props.color ?? undefined}
        closable={props.closable ?? false}
        bordered={props.bordered ?? true}
        icon={props.icon ? <span className={props.icon} /> : undefined}
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
        title={props.title}
        description={props.description ?? undefined}
        type={props.type ?? "info"}
        closable={props.closable ?? false}
        showIcon={props.showIcon ?? true}
        banner={props.banner ?? false}
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
        showInfo={props.showInfo ?? true}
        strokeColor={props.strokeColor ?? undefined}
        size={props.size ?? undefined}
        steps={props.steps ?? undefined}
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
        avatar={props.avatar ?? false}
        title={props.title ?? true}
        round={props.round ?? false}
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
        delay={props.delay ?? undefined}
        fullscreen={props.fullscreen ?? false}
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
        precision={props.precision ?? undefined}
        loading={props.loading ?? false}
        groupSeparator={props.groupSeparator ?? undefined}
        decimalSeparator={props.decimalSeparator ?? undefined}
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
        colon={props.colon ?? true}
        layout={props.layout ?? undefined}
        size={props.size ?? undefined}
        items={items.map((item) => ({
          key: item.label,
          label: item.label,
          children: item.value,
          span: item.span ?? undefined,
        }))}
      />
    );
  },

  Timeline: ({
    props,
    slots,
  }: SlottedComponentProps<AntdProps<"Timeline">>) => {
    const items = props.items ?? [];
    const itemContents = slots?.items ?? [];

    return (
      <Timeline
        mode={props.mode ?? undefined}
        reverse={props.reverse ?? false}
        items={items.map((item, idx) => ({
          color: item.color ?? undefined,
          children: itemContents[idx] ?? null,
        }))}
      />
    );
  },

  Carousel: ({
    props,
    children,
  }: BaseComponentProps<AntdProps<"Carousel">>) => {
    return (
      <Carousel
        autoplay={props.autoplay ?? false}
        dots={props.dots ?? true}
        effect={props.effect ?? undefined}
        autoplaySpeed={props.autoplaySpeed ?? undefined}
        speed={props.speed ?? undefined}
        infinite={props.infinite ?? true}
        arrows={props.arrows ?? false}
        dotPosition={props.dotPosition ?? undefined}
      >
        {children}
      </Carousel>
    );
  },

  Calendar: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Calendar">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState<string | null>(null);
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? null) : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    const dayjsValue = value ? dayjs(value) : undefined;

    return (
      <Calendar
        value={dayjsValue}
        mode={props.mode ?? "month"}
        fullscreen={props.fullscreen ?? true}
        onChange={(date) => {
          setValue(date.format("YYYY-MM-DD"));
          emit("change");
        }}
        onSelect={(date) => {
          setValue(date.format("YYYY-MM-DD"));
          emit("select");
        }}
      />
    );
  },

  List: ({ props, children }: BaseComponentProps<AntdProps<"List">>) => {
    const pagination =
      props.pagination === false
        ? false
        : props.pagination === true
          ? { pageSize: 10 }
          : props.pagination
            ? {
                pageSize: props.pagination.pageSize ?? 10,
                total: props.pagination.total ?? undefined,
              }
            : false;

    const grid = props.grid
      ? {
          gutter: props.grid.gutter ?? undefined,
          column: props.grid.column ?? undefined,
        }
      : undefined;

    return (
      <List
        bordered={props.bordered ?? false}
        loading={props.loading ?? false}
        size={props.size ?? "default"}
        split={props.split ?? true}
        grid={grid}
        pagination={pagination}
        dataSource={props.dataSource ?? undefined}
        renderItem={(item, index) => {
          const childArray = Array.isArray(children)
            ? children
            : children
              ? [children]
              : [];
          return <List.Item>{childArray[index] ?? null}</List.Item>;
        }}
      />
    );
  },

  Tree: ({ props, bindings, emit }: BaseComponentProps<AntdProps<"Tree">>) => {
    const [boundCheckedKeys, setBoundCheckedKeys] = useBoundProp<string[]>(
      props.checkedKeys as string[] | undefined,
      bindings?.checkedKeys,
    );
    const [localCheckedKeys, setLocalCheckedKeys] = useState<string[]>([]);
    const isBoundChecked = !!bindings?.checkedKeys;
    const checkedKeys = isBoundChecked
      ? (boundCheckedKeys ?? [])
      : localCheckedKeys;
    const setCheckedKeys = isBoundChecked
      ? setBoundCheckedKeys
      : setLocalCheckedKeys;

    // Transform treeData to handle null children -> undefined
    const transformTreeData = (data: unknown[]): unknown[] => {
      return data.map((item: any) => ({
        key: item.key,
        title: item.title,
        ...(item.children
          ? { children: transformTreeData(item.children) }
          : {}),
      }));
    };

    return (
      <Tree
        treeData={transformTreeData(props.treeData ?? []) as any}
        checkable={props.checkable ?? false}
        checkedKeys={checkedKeys}
        expandedKeys={props.expandedKeys ?? undefined}
        selectedKeys={props.selectedKeys ?? undefined}
        defaultExpandAll={props.defaultExpandAll ?? false}
        showLine={props.showLine ?? false}
        multiple={props.multiple ?? false}
        onCheck={(checked) => {
          setCheckedKeys(checked as string[]);
          emit("check");
        }}
        onExpand={(expandedKeys) => emit("expand")}
        onSelect={(selectedKeys) => emit("select")}
      />
    );
  },

  QRCode: ({ props }: BaseComponentProps<AntdProps<"QRCode">>) => {
    return (
      <QRCode
        value={props.value}
        size={props.size ?? 128}
        color={props.color ?? undefined}
        bgColor={props.bgColor ?? undefined}
        bordered={props.bordered ?? true}
        status={props.status ?? "active"}
      />
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
          size={props.size ?? undefined}
          variant={props.variant ?? undefined}
          readOnly={props.readOnly ?? false}
          addonBefore={props.addonBefore ?? undefined}
          addonAfter={props.addonAfter ?? undefined}
          disabled={props.disabled ?? false}
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
          size={props.size ?? undefined}
          variant={props.variant ?? undefined}
          readOnly={props.readOnly ?? false}
          autoSize={props.autoSize ?? undefined}
          disabled={props.disabled ?? false}
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

    const validateOn = props.validateOn ?? "change";
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
        <InputNumber
          name={props.name}
          placeholder={props.placeholder ?? undefined}
          value={value}
          min={props.min ?? undefined}
          max={props.max ?? undefined}
          step={props.step ?? undefined}
          precision={props.precision ?? undefined}
          disabled={props.disabled ?? false}
          size={props.size ?? undefined}
          variant={props.variant ?? undefined}
          prefix={props.prefix ? <span className={props.prefix} /> : undefined}
          addonAfter={
            props.suffix ? <span className={props.suffix} /> : undefined
          }
          status={errors.length > 0 ? "error" : undefined}
          onChange={(val) => {
            setValue(val as number);
            if (hasValidation && validateOn === "change") validate();
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
          size={props.size ?? undefined}
          variant={props.variant ?? undefined}
          disabled={props.disabled ?? false}
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
          disabled={props.disabled ?? false}
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
        <Checkbox.Group
          options={options}
          value={value}
          disabled={props.disabled ?? false}
          onChange={(checkedValues) => {
            setValue(checkedValues as string[]);
            if (hasValidation && validateOn === "change") validate();
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
          disabled={props.disabled ?? false}
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
          disabled={props.disabled ?? false}
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
            disabled={props.disabled ?? false}
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
            disabled={props.disabled ?? false}
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
          disabled={props.disabled ?? false}
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
    const [localValue, setLocalValue] = useState<string | null>(null);
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? null) : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    // Convert string value to dayjs object for antd DatePicker
    const dayjsValue = value ? dayjs(value) : null;

    return (
      <Form.Item label={props.label}>
        <DatePicker
          name={props.name}
          placeholder={props.placeholder ?? undefined}
          format={props.format ?? "YYYY-MM-DD"}
          picker={props.picker ?? "date"}
          showTime={props.showTime ?? false}
          disabled={props.disabled ?? false}
          value={dayjsValue}
          onChange={(date, dateString) => {
            setValue(dateString as string);
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
          disabled={props.disabled ?? false}
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
          disabled={props.disabled ?? false}
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
          disabled={props.disabled ?? false}
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

  AutoComplete: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"AutoComplete">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState("");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    const options = (props.options ?? []).map((opt) =>
      typeof opt === "string" ? { label: opt, value: opt } : opt,
    );

    return (
      <Form.Item label={props.label}>
        <AutoComplete
          options={options}
          placeholder={props.placeholder ?? undefined}
          value={value}
          allowClear={props.allowClear ?? false}
          disabled={props.disabled ?? false}
          status={props.status ?? undefined}
          onChange={(val) => {
            setValue(val as string);
            emit("change");
          }}
          onSelect={(val) => {
            setValue(val as string);
            emit("select");
          }}
        />
      </Form.Item>
    );
  },

  Cascader: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Cascader">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string[]>(
      props.value as string[] | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState<string[]>([]);
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? []) : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    // Transform options to handle null children -> undefined
    const transformOptions = (options: unknown[]): unknown[] => {
      return options.map((opt: any) => ({
        label: opt.label,
        value: opt.value,
        ...(opt.children ? { children: transformOptions(opt.children) } : {}),
      }));
    };

    return (
      <Form.Item label={props.label}>
        <Cascader
          options={transformOptions(props.options ?? []) as any}
          placeholder={props.placeholder ?? undefined}
          value={value}
          allowClear={props.allowClear ?? true}
          showSearch={props.showSearch ?? false}
          disabled={props.disabled ?? false}
          size={props.size ?? undefined}
          onChange={(val) => {
            setValue(val as string[]);
            emit("change");
          }}
        />
      </Form.Item>
    );
  },

  ColorPicker: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"ColorPicker">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState<string | null>(null);
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? null) : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    // Map format to valid antd format types
    const format =
      props.format === "hex"
        ? ("hex" as const)
        : props.format === "rgb"
          ? ("rgb" as const)
          : ("hsb" as const);

    return (
      <Form.Item label={props.label}>
        <ColorPicker
          value={value ?? undefined}
          showText={props.showText ?? false}
          disabled={props.disabled ?? false}
          allowClear={props.allowClear ?? false}
          format={format}
          onChange={(color) => {
            const colorValue =
              props.format === "hex"
                ? color.toHexString()
                : props.format === "rgb"
                  ? color.toRgbString()
                  : color.toHsbString();
            setValue(colorValue);
            emit("change");
          }}
        />
      </Form.Item>
    );
  },

  Mentions: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"Mentions">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState("");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    const options = (props.options ?? []).map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));

    return (
      <Form.Item label={props.label}>
        <Mentions
          options={options}
          placeholder={props.placeholder ?? undefined}
          value={value}
          autoSize={props.autoSize ?? undefined}
          disabled={props.disabled ?? false}
          onChange={(val) => {
            setValue(val);
            emit("change");
          }}
        />
      </Form.Item>
    );
  },

  TreeSelect: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<AntdProps<"TreeSelect">>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState("");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    return (
      <Form.Item label={props.label}>
        <TreeSelect
          treeData={(props.treeData ?? []).map((item) => ({
            ...item,
            children: item.children ?? undefined,
          }))}
          placeholder={props.placeholder ?? undefined}
          value={value || undefined}
          allowClear={props.allowClear ?? false}
          showSearch={props.showSearch ?? false}
          multiple={props.multiple ?? false}
          disabled={props.disabled ?? false}
          treeCheckable={props.treeCheckable ?? false}
          size={props.size ?? undefined}
          onChange={(val) => {
            setValue(val as string);
            emit("change");
          }}
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
        ghost={props.ghost ?? false}
        shape={props.shape ?? undefined}
        href={props.href ?? undefined}
        target={props.target ?? undefined}
        htmlType={props.htmlType ?? undefined}
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
        disabled={props.disabled ?? false}
        size={props.size === "small" ? "small" : undefined}
        hideOnSinglePage={props.hideOnSinglePage ?? false}
        pageSizeOptions={props.pageSizeOptions ?? undefined}
        align={props.align ?? undefined}
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
        disabled={props.disabled ?? false}
        size={props.size ?? undefined}
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
      subTitle: item.subTitle ?? undefined,
      icon: item.icon ? <span className={item.icon} /> : undefined,
      disabled: item.disabled ?? false,
      status: item.status ?? undefined,
    }));

    return (
      <Steps
        current={current}
        direction={props.direction ?? "horizontal"}
        status={props.status ?? "process"}
        size={props.size ?? undefined}
        type={props.type ?? undefined}
        initial={props.initial ?? undefined}
        labelPlacement={props.labelPlacement ?? undefined}
        percent={props.percent ?? undefined}
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
