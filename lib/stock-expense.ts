import { STOCK_PURCHASES_CATEGORY } from "./cash";
import { roundMoney } from "./calculations";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Record money spent on stock under Stock purchases. */
export async function recordStockPurchaseExpense(
  supabase: SupabaseClient,
  businessId: string,
  description: string,
  amount: number,
  paymentMethod = "cash",
) {
  const spent = roundMoney(amount);
  if (spent <= 0) return;

  const { data: category, error: categoryError } = await supabase
    .from("expense_categories")
    .select("id")
    .eq("business_id", businessId)
    .eq("name", STOCK_PURCHASES_CATEGORY)
    .maybeSingle();
  if (categoryError) throw categoryError;

  let categoryId = category?.id as string | undefined;
  if (!categoryId) {
    const { data: created, error: createError } = await supabase
      .from("expense_categories")
      .insert({
        business_id: businessId,
        name: STOCK_PURCHASES_CATEGORY,
        is_system: true,
      })
      .select("id")
      .single();
    if (createError) throw createError;
    categoryId = created.id;
  }

  const { error } = await supabase.from("expenses").insert({
    business_id: businessId,
    category_id: categoryId,
    description: description.slice(0, 180),
    amount: spent,
    payment_method: paymentMethod,
    expense_date: new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
}
