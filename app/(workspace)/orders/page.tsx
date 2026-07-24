import { redirect } from "next/navigation";

/** Orders workflow removed — keep URL for bookmarks. */
export default function OrdersPage() {
  redirect("/sales");
}
