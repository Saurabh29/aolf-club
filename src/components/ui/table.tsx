/**
 * Table Components
 * 
 * Light-mode only table styling with Tailwind.
 * 
 * Usage:
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Name</TableHead>
 *       <TableHead>Status</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <For each={items}>
 *       {(item) => (
 *         <TableRow>
 *           <TableCell>{item.name}</TableCell>
 *           <TableCell>{item.status}</TableCell>
 *         </TableRow>
 *       )}
 *     </For>
 *   </TableBody>
 * </Table>
 */

import { splitProps, type JSX, type Component } from "solid-js";
import { cn } from "~/lib/utils";

export interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {}

export const Table: Component<TableProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div class="relative w-full overflow-auto">
      <table
        class={cn("w-full caption-bottom text-sm", local.class)}
        {...rest}
      >
        {local.children}
      </table>
    </div>
  );
};

export interface TableHeaderProps extends JSX.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader: Component<TableHeaderProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <thead class={cn("[&_tr]:border-b", local.class)} {...rest}>
      {local.children}
    </thead>
  );
};

export interface TableBodyProps extends JSX.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody: Component<TableBodyProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <tbody
      class={cn("[&_tr:last-child]:border-0", local.class)}
      {...rest}
    >
      {local.children}
    </tbody>
  );
};

export interface TableRowProps extends JSX.HTMLAttributes<HTMLTableRowElement> {}

export const TableRow: Component<TableRowProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <tr
      class={cn(
        "border-b border-gray-200 transition-colors hover:bg-gray-50",
        local.class
      )}
      {...rest}
    >
      {local.children}
    </tr>
  );
};

export interface TableHeadProps extends JSX.ThHTMLAttributes<HTMLTableCellElement> {}

export const TableHead: Component<TableHeadProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <th
      class={cn(
        "h-12 px-4 text-left align-middle font-medium text-gray-600",
        "[&:has([role=checkbox])]:pr-0",
        local.class
      )}
      {...rest}
    >
      {local.children}
    </th>
  );
};

export interface TableCellProps extends JSX.TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell: Component<TableCellProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <td
      class={cn(
        "p-4 align-middle text-gray-900",
        "[&:has([role=checkbox])]:pr-0",
        local.class
      )}
      {...rest}
    >
      {local.children}
    </td>
  );
};
