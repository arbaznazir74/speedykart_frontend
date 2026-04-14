"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiGet } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  Package, MapPin, Store, User, CreditCard, Receipt,
  ChevronDown, ChevronUp, FileText, Loader2,
} from "lucide-react";

/* ─── Types matching our enriched backend response ─── */
interface OrderItemDetail {
  id: number;
  orderId: number;
  customerName: string;
  productId: number;
  baseProductName: string;
  productVariantId: number;
  variantName: string;
  variantImageBase64: string | null;
  indicator: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentStatus: string;
  orderStatus: string;
  paymentMode: string;
  toppings: { toppingId: number; toppingName: string; price: number; quantity: number }[] | null;
  addons: { addonProductId: number; addonName: string; price: number; quantity: number; categoryId: number; categoryName: string }[] | null;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  orderId: number;
  orderNumber: string;
  seller: {
    id: number; name: string; storeName: string; email: string; mobile: string;
    address: string | null; city: string | null; state: string | null; fssaiLicNo: string | null;
    taxName: string | null; taxNumber: string | null;
  } | null;
  customer: { id: number; name: string; mobile: string; email: string | null };
  deliveryAddress: {
    name: string; mobile: string; address: string; landmark: string;
    area: string; pincode: string; city: string; state: string; country: string;
  } | null;
  items: {
    productVariantId: number; baseProductName: string; variantName: string; indicator: string;
    quantity: number; unitPrice: number; totalPrice: number;
    toppings: { toppingName: string; price: number; quantity: number }[] | null;
    toppingsTotal: number;
    addons: { addonName: string; price: number; quantity: number; categoryName: string }[] | null;
    addonsTotal: number;
    lineTotal: number;
  }[];
  subtotal: number;
  deliveryCharge: number;
  platformCharge: number;
  cutleryCharge: number;
  lowCartFeeCharge: number;
  tipAmount: number;
  totalAmount: number;
  currency: string;
  paymentMode: string;
  paymentStatus: string;
  orderStatus: string;
}

export interface OrderSummary {
  id: number;
  orderNumber: string;
  customerName: string;
  userId: number;
  sellerId: number | null;
  amount: number;
  deliveryCharge: number;
  platormCharge: number;
  cutlaryCharge: number;
  lowCartFeeCharge: number;
  tipAmount: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMode: string | number;
  createdAt: string;
  receipt?: string;
}

function formatPaymentMode(mode: string | number): string {
  if (typeof mode === "string") return mode === "CashOnDelivery" ? "COD" : mode;
  return mode === 1 ? "COD" : "Online";
}

function IndicatorDot({ indicator }: { indicator: string }) {
  const color = indicator === "Veg" ? "bg-green-500" : indicator === "NonVeg" ? "bg-red-500" : "bg-yellow-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-sm ${color} mr-1.5`} />;
}

interface Props {
  order: OrderSummary | null;
  open: boolean;
  onClose: () => void;
  showInvoice?: boolean;
}

export function OrderDetailDialog({ order, open, onClose, showInvoice = true }: Props) {
  const [items, setItems] = useState<OrderItemDetail[]>([]);
  const [fullOrder, setFullOrder] = useState<OrderSummary | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !order) {
      setItems([]);
      setFullOrder(null);
      setInvoice(null);
      setShowInvoiceView(false);
      return;
    }
    fetchItems(order.id);
  }, [open, order?.id]);

  const displayOrder = fullOrder ?? order;

  async function fetchItems(orderId: number) {
    setLoading(true);
    try {
      const [itemsResp, orderResp] = await Promise.all([
        apiGet<OrderItemDetail[]>(`api/v1/Order/order-items/${orderId}`, { skip: 0, top: 50 }),
        apiGet<OrderSummary>(`api/v1/Order/order?orderId=${orderId}`),
      ]);
      setItems(itemsResp.successData ?? []);
      if (orderResp.successData) {
        setFullOrder(orderResp.successData);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchInvoice(orderId: number) {
    setInvoiceLoading(true);
    try {
      const resp = await apiGet<InvoiceData>(`api/v1/Order/invoice/${orderId}`);
      setInvoice(resp.successData ?? null);
      setShowInvoiceView(true);
    } catch {
      setInvoice(null);
    } finally {
      setInvoiceLoading(false);
    }
  }

  if (!order || !displayOrder) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Order #{order.orderNumber || order.id}</DialogTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.orderStatus} />
              <StatusBadge status={order.paymentStatus} />
            </div>
          </div>
        </DialogHeader>

        {!showInvoiceView ? (
          <div className="px-6 pb-6 space-y-5">
            {/* Order summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs">Customer</p>
                  <p className="font-semibold text-slate-900">{displayOrder.customerName || `User ${displayOrder.userId}`}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CreditCard className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs">Payment</p>
                  <p className="font-semibold text-slate-900">{formatPaymentMode(displayOrder.paymentMode)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Receipt className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs">Date</p>
                  <p className="font-semibold text-slate-900">{displayOrder.createdAt ? formatDateTime(displayOrder.createdAt) : "—"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Order items */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900">Items Ordered</h3>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No items found</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => {
                    const hasToppings = item.toppings && item.toppings.length > 0;
                    const hasAddons = item.addons && item.addons.length > 0;
                    const hasExtras = hasToppings || hasAddons;
                    const isExpanded = expandedItem === item.id;

                    return (
                      <div key={item.id} className="border rounded-xl overflow-hidden">
                        <div
                          className={`flex items-center justify-between p-3 ${hasExtras ? "cursor-pointer hover:bg-slate-50" : ""}`}
                          onClick={() => hasExtras && setExpandedItem(isExpanded ? null : item.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.variantImageBase64 ? (
                              <img src={`data:image/png;base64,${item.variantImageBase64}`} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <Package className="h-5 w-5 text-slate-300" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <IndicatorDot indicator={item.indicator} />
                                <p className="text-sm font-semibold text-slate-900 truncate">{item.baseProductName}</p>
                              </div>
                              {item.variantName !== item.baseProductName && (
                                <p className="text-xs text-slate-500">Variant: {item.variantName}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-semibold">{formatCurrency(item.totalPrice)}</p>
                              <p className="text-xs text-slate-500">
                                {item.quantity} × {formatCurrency(item.unitPrice)}
                              </p>
                            </div>
                            {hasExtras && (
                              isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {isExpanded && hasExtras && (
                          <div className="border-t bg-slate-50 px-3 py-2 space-y-2">
                            {hasToppings && (
                              <div>
                                <p className="text-xs font-semibold text-slate-600 mb-1">Toppings / Extras</p>
                                {item.toppings!.map((t, i) => (
                                  <div key={i} className="flex justify-between text-xs text-slate-600 py-0.5">
                                    <span>{t.toppingName} × {t.quantity}</span>
                                    <span className="font-medium">{formatCurrency(t.price * t.quantity)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {hasAddons && (
                              <div>
                                <p className="text-xs font-semibold text-slate-600 mb-1">Add-ons</p>
                                {item.addons!.map((a, i) => (
                                  <div key={i} className="flex justify-between text-xs text-slate-600 py-0.5">
                                    <span>{a.addonName} × {a.quantity} <span className="text-slate-400">({a.categoryName})</span></span>
                                    <span className="font-medium">{formatCurrency(a.price * a.quantity)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Price breakdown */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Items Total</span>
                <span className="font-medium">{formatCurrency(items.reduce((s, i) => s + i.totalPrice, 0))}</span>
              </div>
              {(displayOrder.deliveryCharge ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery</span>
                  <span className="font-medium">{formatCurrency(displayOrder.deliveryCharge)}</span>
                </div>
              )}
              {(displayOrder.platormCharge ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Platform Fee</span>
                  <span className="font-medium">{formatCurrency(displayOrder.platormCharge)}</span>
                </div>
              )}
              {(displayOrder.cutlaryCharge ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Cutlery</span>
                  <span className="font-medium">{formatCurrency(displayOrder.cutlaryCharge)}</span>
                </div>
              )}
              {(displayOrder.lowCartFeeCharge ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Low Cart Fee</span>
                  <span className="font-medium">{formatCurrency(displayOrder.lowCartFeeCharge)}</span>
                </div>
              )}
              {(displayOrder.tipAmount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tip</span>
                  <span className="font-medium">{formatCurrency(displayOrder.tipAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(displayOrder.amount)}</span>
              </div>
            </div>
          </div>
        ) : invoice ? (
          /* ─── Invoice View ─── */
          <div className="px-6 pb-6 space-y-5" id="invoice-content">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setShowInvoiceView(false)}>← Back to details</Button>
              <Badge variant="outline" className="text-xs">{invoice.invoiceNumber}</Badge>
              <Badge variant="secondary" className="text-xs ml-1">Order #{invoice.orderNumber}</Badge>
            </div>

            {/* Seller / Customer */}
            <div className="grid grid-cols-2 gap-6 text-sm">
              {invoice.seller && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Store className="h-3.5 w-3.5" /> Seller
                  </div>
                  <p className="font-semibold text-slate-900">{invoice.seller.storeName || invoice.seller.name}</p>
                  {invoice.seller.address && <p className="text-slate-600">{invoice.seller.address}</p>}
                  {invoice.seller.city && <p className="text-slate-600">{invoice.seller.city}, {invoice.seller.state}</p>}
                  {invoice.seller.mobile && <p className="text-slate-600">{invoice.seller.mobile}</p>}
                  {invoice.seller.fssaiLicNo && <p className="text-xs text-slate-400">FSSAI: {invoice.seller.fssaiLicNo}</p>}
                  {invoice.seller.taxNumber && <p className="text-xs text-slate-400">{invoice.seller.taxName}: {invoice.seller.taxNumber}</p>}
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <User className="h-3.5 w-3.5" /> Bill To
                </div>
                <p className="font-semibold text-slate-900">{invoice.customer.name}</p>
                <p className="text-slate-600">{invoice.customer.mobile}</p>
                {invoice.customer.email && <p className="text-slate-600">{invoice.customer.email}</p>}
              </div>
            </div>

            {invoice.deliveryAddress && (
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <MapPin className="h-3.5 w-3.5" /> Delivery Address
                </div>
                <p className="text-slate-700">
                  {invoice.deliveryAddress.name}, {invoice.deliveryAddress.address}
                  {invoice.deliveryAddress.landmark && `, near ${invoice.deliveryAddress.landmark}`}
                  , {invoice.deliveryAddress.city} - {invoice.deliveryAddress.pincode}
                </p>
              </div>
            )}

            <Separator />

            {/* Invoice items */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 pr-2">Item</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Price</th>
                    <th className="py-2 pl-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2.5 pr-2">
                        <p className="font-semibold text-slate-900">{item.baseProductName}</p>
                        {item.variantName !== item.baseProductName && (
                          <p className="text-xs text-slate-500">{item.variantName}</p>
                        )}
                        {item.toppings && item.toppings.length > 0 && (
                          <div className="mt-1">
                            {item.toppings.map((t, i) => (
                              <p key={i} className="text-xs text-slate-500">+ {t.toppingName} × {t.quantity} = {formatCurrency(t.price * t.quantity)}</p>
                            ))}
                          </div>
                        )}
                        {item.addons && item.addons.length > 0 && (
                          <div className="mt-1">
                            {item.addons.map((a, i) => (
                              <p key={i} className="text-xs text-slate-500">+ {a.addonName} × {a.quantity} = {formatCurrency(a.price * a.quantity)}</p>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">{item.quantity}</td>
                      <td className="py-2.5 px-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2.5 pl-2 text-right font-semibold">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-1.5 text-sm max-w-xs ml-auto">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
              {invoice.deliveryCharge > 0 && <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span>{formatCurrency(invoice.deliveryCharge)}</span></div>}
              {invoice.platformCharge > 0 && <div className="flex justify-between"><span className="text-slate-500">Platform Fee</span><span>{formatCurrency(invoice.platformCharge)}</span></div>}
              {invoice.cutleryCharge > 0 && <div className="flex justify-between"><span className="text-slate-500">Cutlery</span><span>{formatCurrency(invoice.cutleryCharge)}</span></div>}
              {invoice.lowCartFeeCharge > 0 && <div className="flex justify-between"><span className="text-slate-500">Low Cart Fee</span><span>{formatCurrency(invoice.lowCartFeeCharge)}</span></div>}
              {invoice.tipAmount > 0 && <div className="flex justify-between"><span className="text-slate-500">Tip</span><span>{formatCurrency(invoice.tipAmount)}</span></div>}
              <Separator />
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatCurrency(invoice.totalAmount)}</span></div>
            </div>

            <div className="flex justify-between text-xs text-slate-400">
              <span>{invoice.invoiceNumber}</span>
              <span>{formatDateTime(invoice.invoiceDate)}</span>
            </div>
          </div>
        ) : null}

        <div className="border-t px-6 py-3 flex items-center justify-between">
          {showInvoice && !showInvoiceView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchInvoice(order.id)}
              disabled={invoiceLoading}
            >
              {invoiceLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Invoice
            </Button>
          )}
          {showInvoiceView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const el = document.getElementById("invoice-content");
                if (el) {
                  const w = window.open("", "_blank");
                  if (w) {
                    w.document.write(`<html><head><title>Invoice ${invoice?.invoiceNumber} - Order ${invoice?.orderNumber}</title><style>body{font-family:system-ui,sans-serif;padding:2rem;max-width:800px;margin:auto}table{width:100%;border-collapse:collapse}th,td{padding:6px 8px;text-align:left;border-bottom:1px solid #e2e8f0}th{font-size:11px;text-transform:uppercase;color:#64748b}</style></head><body>${el.innerHTML}</body></html>`);
                    w.document.close();
                    w.print();
                  }
                }
              }}
            >
              Print / Download
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} className="ml-auto">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
