import { cn } from "~/lib/utils";
import type { JSX, Component, ParentComponent } from "solid-js";
import { splitProps, For } from "solid-js";

/**
 * Table components following solid-ui patterns
 * Light-mode only styling - no dark: variants
 */

export interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {}

export const Table: ParentComponent<TableProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <div class="relative w-full overflow-auto">
      <table
        class={cn("w-full caption-bottom text-sm", local.class)}
        {...others}
      >
        {local.children}
      </table>
    </div>
  );
};

export interface TableHeaderProps extends JSX.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader: ParentComponent<TableHeaderProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <thead class={cn("[&_tr]:border-b", local.class)} {...others}>
      {local.children}
    </thead>
  );
};

export interface TableBodyProps extends JSX.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody: ParentComponent<TableBodyProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <tbody class={cn("[&_tr:last-child]:border-0", local.class)} {...others}>
      {local.children}
    </tbody>
  );
};

export interface TableFooterProps extends JSX.HTMLAttributes<HTMLTableSectionElement> {}

export const TableFooter: ParentComponent<TableFooterProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <tfoot
      class={cn("border-t bg-gray-100/50 font-medium [&>tr]:last:border-b-0", local.class)}
      {...others}
    >
      {local.children}
    </tfoot>
  );
};

export interface TableRowProps extends JSX.HTMLAttributes<HTMLTableRowElement> {}

export const TableRow: ParentComponent<TableRowProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <tr
      class={cn(
        "border-b border-gray-200 transition-colors hover:bg-gray-100/50 data-[state=selected]:bg-gray-100",
        local.class
      )}
      {...others}
    >
      {local.children}
    </tr>
  );
};

export interface TableHeadProps extends JSX.ThHTMLAttributes<HTMLTableCellElement> {}

export const TableHead: ParentComponent<TableHeadProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <th
      class={cn(
        "h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0",
        local.class
      )}
      {...others}
    >
      {local.children}
    </th>
  );
};

export interface TableCellProps extends JSX.TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell: ParentComponent<TableCellProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <td
      class={cn("p-4 align-middle text-gray-900 [&:has([role=checkbox])]:pr-0", local.class)}
      {...others}
    >
      {local.children}
    </td>
  );
};

export interface TableCaptionProps extends JSX.HTMLAttributes<HTMLTableCaptionElement> {}

export const TableCaption: ParentComponent<TableCaptionProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <caption class={cn("mt-4 text-sm text-gray-500", local.class)} {...others}>
      {local.children}
    </caption>
  );
};
