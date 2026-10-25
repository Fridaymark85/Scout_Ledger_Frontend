// Request form: header note + material / service line items. Logic: React Hook Form + Zod SAP rules.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../api";
import { requisitionSchema } from "../schemas";
import { CURRENCIES, DEFAULTS, MATERIAL_GROUPS, UNITS } from "../constants";

const emptyMaterial = () => ({
  item_type: "MATERIAL", short_text: "", quantity: "1", unit_of_measure: "EA", delivery_date: "",
  purchasing_group: DEFAULTS.purchasingGroup, total_value: "", plant: DEFAULTS.plant,
  storage_location: DEFAULTS.storageLocation, requisitioner: "", material_group: "",
});
const emptyService = () => ({
  item_type: "SERVICE", short_text: "", quantity: "1", unit_of_measure: "EA", gross_price: "",
  currency: DEFAULTS.currency, cost_center: "", plant: DEFAULTS.plant,
});

// Number inputs: arrows stop at 0 and the sign/exponent keys are blocked (Zod still enforces > 0).
const numProps = {
  type: "number", min: "0", step: "any",
  onKeyDown: (e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault(),
};

// Small labelled input wrapper used for every item field; shows the Zod/server error below it.
const Field = ({ label, hint, error, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
    {error && <small role="alert" className="error">{error}</small>}
  </label>
);

// Line numbers are derived from position so removing a row never leaves gaps/duplicates.
const withLineNumbers = (values) => ({
  ...values,
  items: (values.items ?? []).map((it, i) => ({ ...it, line_number: i + 1 })),
});
const schemaResolver = zodResolver(requisitionSchema);
const resolver = (values, ctx, opts) => schemaResolver(withLineNumbers(values), ctx, opts);

export default function NewRequest() {
  const nav = useNavigate();
  const {
    register, control, handleSubmit, setError, getValues, formState: { errors, isSubmitting },
  } = useForm({ resolver, defaultValues: { header_note: "", items: [emptyMaterial()] } });
  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" });
  const watched = useWatch({ control, name: "items" });

  // Display-only estimate; the backend recalculates the authoritative total.
  const total = useMemo(
    () => (watched ?? []).reduce((s, it) =>
      s + (it.item_type === "MATERIAL" ? Number(it.total_value) || 0 : (Number(it.quantity) || 0) * (Number(it.gross_price) || 0)), 0),
    [watched],
  );

  const submit = async (values) => {
    // `values` is the validated, renumbered output of the Zod schema (decimals stay strings).
    const payload = { header_note: values.header_note, items: values.items };
    try {
      const { data } = await api.post("/api/requisitions/", payload);
      nav(`/requests/${data.id}`);
    } catch (e) {
      const d = e.response?.data;
      if (e.response?.status === 400 && d && typeof d === "object") {
        // Map DRF errors ({header_note: [...], items: [{plant: [...]}, {}]}) back onto the inputs.
        if (d.header_note) setError("header_note", { message: [].concat(d.header_note)[0] });
        if (Array.isArray(d.items)) {
          d.items.forEach((row, i) => Object.entries(row ?? {}).forEach(([k, m]) =>
            setError(`items.${i}.${k}`, { message: [].concat(m)[0] })));
        }
        if (!d.header_note && !Array.isArray(d.items)) setError("root", { message: JSON.stringify(d) });
      } else {
        setError("root", { message: "Could not submit the request. Please try again." });
      }
    }
  };

  // Registers input `f` of item i and exposes its error message.
  const ctl = (i, f) => ({ ...register(`items.${i}.${f}`) });
  const err = (i, f) => errors.items?.[i]?.[f]?.message;

  return (
    <form className="card" onSubmit={handleSubmit(submit)} noValidate>
      <h2>New request</h2>
      <h3>Header details</h3>
      <Field label="Header note" hint="Brief your requirement" error={errors.header_note?.message}>
        <textarea {...register("header_note")} />
      </Field>

      <h3>Items</h3>
      {fields.map((f, i) => {
        const type = watched?.[i]?.item_type ?? f.item_type;
        return (
          <div className="item-card" key={f.id}>
            <div className="item-head">
              <strong>Item {i + 1}</strong>
              <select
                value={type}
                onChange={(e) => {
                  const next = e.target.value === "MATERIAL" ? emptyMaterial() : emptyService();
                  const rows = getValues("items").map((x, n) => (n === i ? next : x));
                  replace(rows);
                }}
              >
                <option value="MATERIAL">Material</option>
                <option value="SERVICE">Service</option>
              </select>
              {fields.length > 1 && (
                <button type="button" className="btn small" onClick={() => remove(i)}>Remove</button>
              )}
            </div>

            <div className="grid">
              {type === "MATERIAL" ? (
                <>
                  <Field label="Material" hint="S/X code will be generated through digitizer">
                    <input disabled value="Auto-generated" />
                  </Field>
                  <Field label="Short text" hint="Specify requirement in short" error={err(i, "short_text")}><input {...ctl(i, "short_text")} /></Field>
                  <Field label="Quantity requested" error={err(i, "quantity")}><input {...numProps} {...ctl(i, "quantity")} /></Field>
                  <Field label="Unit of measure" error={err(i, "unit_of_measure")}>
                    <select {...ctl(i, "unit_of_measure")}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
                  </Field>
                  <Field label="Delivery date" error={err(i, "delivery_date")}><input type="date" {...ctl(i, "delivery_date")} /></Field>
                  <Field label="Purchasing group" hint="77 - Sahil Negi (default)" error={err(i, "purchasing_group")}><input {...ctl(i, "purchasing_group")} /></Field>
                  <Field label="Total value" hint="Budgetary value" error={err(i, "total_value")}><input {...numProps} {...ctl(i, "total_value")} /></Field>
                  <Field label="Plant" hint="7206 (default)" error={err(i, "plant")}><input {...ctl(i, "plant")} /></Field>
                  <Field label="Storage location" hint="GS27 (default)" error={err(i, "storage_location")}><input {...ctl(i, "storage_location")} /></Field>
                  <Field label="Requisitioner" hint="Indentor ID (e.g. E52114)" error={err(i, "requisitioner")}><input {...ctl(i, "requisitioner")} /></Field>
                  <Field label="Material group" error={err(i, "material_group")}>
                    <select {...ctl(i, "material_group")}>
                      <option value="">Select…</option>
                      {MATERIAL_GROUPS.map((g) => <option key={g.code} value={g.code}>{g.label}</option>)}
                    </select>
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Short text" hint="Specify requirement in short" error={err(i, "short_text")}><input {...ctl(i, "short_text")} /></Field>
                  <Field label="Quantity" error={err(i, "quantity")}><input {...numProps} {...ctl(i, "quantity")} /></Field>
                  <Field label="UOM" error={err(i, "unit_of_measure")}>
                    <select {...ctl(i, "unit_of_measure")}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
                  </Field>
                  <Field label="Gross price" hint="Budgetary unit rate" error={err(i, "gross_price")}><input {...numProps} {...ctl(i, "gross_price")} /></Field>
                  <Field label="Currency" hint="INR or case to case basis" error={err(i, "currency")}>
                    <select {...ctl(i, "currency")}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
                  </Field>
                  <Field label="Cost center" hint="Account assignment – cost center allotted to the project" error={err(i, "cost_center")}><input {...ctl(i, "cost_center")} /></Field>
                </>
              )}
            </div>
          </div>
        );
      })}

      {errors.items?.message && <p role="alert" className="error">{errors.items.message}</p>}
      {errors.items?.root?.message && <p role="alert" className="error">{errors.items.root.message}</p>}
      <button type="button" className="btn" onClick={() => append(emptyMaterial())}>+ Add item</button>
      <p><strong>Estimated total: {total.toFixed(2)}</strong></p>
      {errors.root?.message && <p role="alert" className="error">{errors.root.message}</p>}
      <button className="btn primary" disabled={isSubmitting}>{isSubmitting ? "Submitting…" : "Submit for approval"}</button>
    </form>
  );
}
