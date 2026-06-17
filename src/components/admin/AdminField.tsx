import { ReactNode } from "react";

interface AdminFieldProps {
  label: string;
  value: any;
  icon?: ReactNode;
  /**
   * When true, render the row even when value is empty, displaying "—".
   * Used in admin-only sections so admins can see *every* field they expected,
   * including blanks the user never filled in.
   */
  showEmpty?: boolean;
}

/**
 * Renders a single labeled field for the Admin View sections on profile pages.
 * Default: hides empty rows. With showEmpty, always renders and shows "—" for blanks.
 */
const AdminField = ({ label, value, icon, showEmpty = false }: AdminFieldProps) => {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  if (isEmpty && !showEmpty) return null;

  let display: string;
  if (isEmpty) display = "—";
  else if (typeof value === "boolean") display = value ? "Yes" : "No";
  else if (value instanceof Date) display = value.toISOString();
  else if (Array.isArray(value)) display = value.join(", ");
  else display = String(value);

  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <span className="text-muted-foreground min-w-[140px]">{label}:</span>
      <span className={`break-all ${isEmpty ? "text-muted-foreground italic" : ""}`}>{display}</span>
    </div>
  );
};

export default AdminField;
