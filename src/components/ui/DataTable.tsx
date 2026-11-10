import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DataTableProps {
  children: React.ReactNode;
  className?: string;
  allowHorizontalScroll?: boolean;
  tableClassName?: string;
}

export function DataTable({
  children,
  className,
  allowHorizontalScroll = true,
  tableClassName,
}: DataTableProps) {
  return (
    <div className={cn('rounded-2xl border border-primary/20 overflow-hidden glass-panel', className)}>
      <div className={cn(allowHorizontalScroll ? 'overflow-x-auto' : 'overflow-x-hidden')}>
        <table className={cn('w-full', tableClassName)}>{children}</table>
      </div>
    </div>
  );
}

interface DataTableHeaderProps {
  children: React.ReactNode;
}

export function DataTableHeader({ children }: DataTableHeaderProps) {
  return (
    <thead className="bg-surface-100/80 dark:bg-surface-300/45 border-b border-primary/15">
      {children}
    </thead>
  );
}

interface DataTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export function DataTableRow({ children, className, ...props }: DataTableRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'border-b border-primary/10 hover:bg-surface-100/60 dark:hover:bg-surface-300/30 transition-all duration-200 group',
        className
      )}
      {...props}
    >
      {children}
    </motion.tr>
  );
}

interface DataTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function DataTableHead({ children, className, ...props }: DataTableHeadProps) {
  return (
    <th
      className={cn(
        'px-6 py-4 text-left text-caption font-semibold text-muted-foreground/80 uppercase tracking-wider',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

interface DataTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function DataTableCell({ children, className, ...props }: DataTableCellProps) {
  return (
    <td
      className={cn('px-6 py-4 whitespace-nowrap text-body text-foreground', className)}
      {...props}
    >
      {children}
    </td>
  );
}

interface DataTableBodyProps {
  children: React.ReactNode;
}

export function DataTableBody({ children }: DataTableBodyProps) {
  return <tbody>{children}</tbody>;
}
