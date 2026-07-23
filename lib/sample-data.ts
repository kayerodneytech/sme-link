export const products = [
  { id: "p1", name: "Cooking oil 2L", sku: "OIL-2L", category: "Groceries", price: 6.5, stock: 3, threshold: 5, status: "Low stock" },
  { id: "p2", name: "Maize meal 10kg", sku: "MEAL-10", category: "Groceries", price: 9.8, stock: 4, threshold: 8, status: "Low stock" },
  { id: "p3", name: "Brown sugar 2kg", sku: "SUG-2KG", category: "Groceries", price: 4.2, stock: 2, threshold: 6, status: "Low stock" },
  { id: "p4", name: "Rice 2kg", sku: "RICE-2", category: "Groceries", price: 5.25, stock: 18, threshold: 6, status: "In stock" },
  { id: "p5", name: "Laundry soap", sku: "SOAP-L", category: "Household", price: 2.1, stock: 26, threshold: 10, status: "In stock" },
  { id: "p6", name: "Long-life milk 1L", sku: "MILK-1", category: "Dairy", price: 1.75, stock: 14, threshold: 8, status: "In stock" },
];

export const sales = [
  { id: "SL-1048", customer: "Walk-in customer", date: "2026-06-23T10:42:00Z", items: 6, method: "EcoCash", total: 186, status: "Completed" },
  { id: "SL-1047", customer: "Makanaka Store", date: "2026-06-22T14:20:00Z", items: 12, method: "Bank transfer", total: 342.5, status: "Completed" },
  { id: "SL-1046", customer: "Rudo Moyo", date: "2026-06-22T09:10:00Z", items: 3, method: "Cash", total: 47.75, status: "Completed" },
  { id: "SL-1045", customer: "Walk-in customer", date: "2026-06-21T16:25:00Z", items: 4, method: "Cash", total: 84.2, status: "Completed" },
  { id: "SL-1044", customer: "Tawanda Mini Mart", date: "2026-06-20T11:05:00Z", items: 18, method: "Bank transfer", total: 518.6, status: "Completed" },
];

export const expenses = [
  { id: "EX-208", description: "Delivery fuel", category: "Transport", date: "2026-06-23", method: "Cash", amount: 42 },
  { id: "EX-207", description: "Shop electricity", category: "Utilities", date: "2026-06-21", method: "Bank transfer", amount: 118.3 },
  { id: "EX-206", description: "Packaging bags", category: "Supplies", date: "2026-06-19", method: "EcoCash", amount: 36.5 },
  { id: "EX-205", description: "June shop rent", category: "Rent", date: "2026-06-01", method: "Bank transfer", amount: 650 },
];

export const customers = [
  { id: "CU-018", name: "Makanaka Store", phone: "+263 77 245 1930", email: "orders@makanaka.co.zw", orders: 8, spent: 1842.5 },
  { id: "CU-017", name: "Rudo Moyo", phone: "+263 71 882 5041", email: "rudo.moyo@example.com", orders: 4, spent: 296.75 },
  { id: "CU-016", name: "Tawanda Mini Mart", phone: "+263 78 401 2692", email: "tawanda.mart@example.com", orders: 11, spent: 2734.2 },
  { id: "CU-015", name: "Chiedza Dube", phone: "+263 77 604 1778", email: "chiedza.dube@example.com", orders: 2, spent: 128.4 },
];

export const orders = [
  { id: "OR-0318", customer: "Makanaka Store", date: "2026-06-23", items: 8, total: 226.4, status: "Pending" },
  { id: "OR-0317", customer: "Tawanda Mini Mart", date: "2026-06-22", items: 15, total: 468.75, status: "Confirmed" },
  { id: "OR-0316", customer: "Rudo Moyo", date: "2026-06-20", items: 4, total: 84.2, status: "Completed" },
  { id: "OR-0315", customer: "Chiedza Dube", date: "2026-06-18", items: 3, total: 57.85, status: "Cancelled" },
];
