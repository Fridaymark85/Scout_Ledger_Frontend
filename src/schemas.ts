// SAP rulebook: Zod schemas mirroring the Django backend's limits (backend/procurement/models.py).
import { z } from "zod";

// Decimal helper. Values are validated on their string form (never via float math) so
// "0.1 + 0.2"-style errors cannot occur, and are sent to DRF as strings to keep exact precision.
//  - maxDp:     max decimal places (price = 2, quantity = 3)
//  - maxDigits: DecimalField max_digits (price = 12, quantity = 13)
const positiveDecimal = (label: string, maxDp: number, maxDigits: number) =>
  z
    .union([z.string(), z.number()], { error: `${label} is required` })
    .transform((v) => String(v).trim())
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .regex(/^\d+(\.\d+)?$/, `${label} must be a valid positive number`)
        .refine((s) => (s.split(".")[1] ?? "").length <= maxDp, `${label} allows at most ${maxDp} decimal places`)
        .refine(
          (s) => s.replace(".", "").replace(/^0+/, "").length <= maxDigits,
          `${label} cannot exceed ${maxDigits} digits in total`,
        )
        .refine((s) => Number(s) > 0, `${label} must be greater than 0`),
    );

export const priceField = (label = "Price") => positiveDecimal(label, 2, 12); // DecimalField(12, 2)
export const quantityField = (label = "Quantity") => positiveDecimal(label, 3, 13); // DecimalField(13, 3)

// Trimmed text with a max length and a readable message.
const text = (label: string, max: number) =>
  z.string().trim().max(max, `${label} cannot exceed ${max} characters`);
const requiredText = (label: string, max: number) =>
  text(label, max).min(1, `${label} is required`);

// ---------- Line items ----------

// Fields shared by materials and services.
const itemBase = {
  line_number: z.number().int().positive(),
  short_text: requiredText("Short text", 40), // SAP TXZ01
  quantity: quantityField("Quantity"),
  unit_of_measure: requiredText("Unit of measure", 3),
  plant: requiredText("Plant", 4), // SAP WERKS
};

export const materialItemSchema = z.object({
  ...itemBase,
  item_type: z.literal("MATERIAL"),
  // Normally assigned by the digitizer (read-only on the server); validated if supplied.
  material_number: text("Material number", 18).optional(),
  delivery_date: z.string().min(1, "Delivery date is required"),
  purchasing_group: requiredText("Purchasing group", 3),
  total_value: priceField("Total value"),
  storage_location: text("Storage location", 4).optional(),
  requisitioner: requiredText("Requisitioner", 12),
  material_group: z.enum(["05147", "13147"], { error: "Select a material group" }),
});

export const serviceItemSchema = z.object({
  ...itemBase,
  item_type: z.literal("SERVICE"),
  gross_price: priceField("Gross price"),
  currency: requiredText("Currency", 3),
  cost_center: requiredText("Cost center", 10),
});

// Discriminated on item_type so each type is checked against its own mandatory fields.
export const lineItemSchema = z.discriminatedUnion("item_type", [materialItemSchema, serviceItemSchema]);

// ---------- Requisition header ----------

export const requisitionSchema = z.object({
  header_note: requiredText("Header note", 2000),
  purchasing_org: text("Purchasing org", 4).optional(), // SAP EKORG
  purchasing_group: text("Purchasing group", 3).optional(), // SAP EKGRP (per-item on the backend)
  items: z
    .array(lineItemSchema)
    .min(1, "Add at least one item")
    .refine((items) => new Set(items.map((i) => i.line_number)).size === items.length, "Line numbers must be unique"),
});

export type LineItem = z.infer<typeof lineItemSchema>;
export type RequisitionInput = z.input<typeof requisitionSchema>; // form values
export type RequisitionPayload = z.output<typeof requisitionSchema>; // validated, API-ready
