import { ReactNode } from "react";

interface AdminFieldProps {
  label: string;
  value: any;
  icon?: ReactNode;
}

/**
 * Renders a single labeled field for the Admin View sections on profile pages.
 * Hides the row entirely when value is null/undefined/empty so admins only see
 * fields the user actually submitted, but never silently drops a populated value.
 */
const AdminField = ({ label, value, icon }: AdminFieldProps) => {
  if (value === null || value === undefined || value === "") return null;
  let display: string;
  if (typeof value === "boolean") display = value ? "Yes" : "No";
  else if (value instanceof Date) display = value.toISOString();
  else display = String(value);

  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <span className="text-muted-foreground min-w-[140px]">{label}:</span>
      <span className="break-all">{display}</span>
    </div>
  );
};

export default AdminField;
