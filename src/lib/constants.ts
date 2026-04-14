export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5050";

export const API_ENDPOINTS = {
  LOGIN: "login",
  CATEGORY: "api/v1/Category",
  BRAND: "api/v1/Brand",
  PRODUCT_TAG: "api/v1/ProductTag",
  PRODUCT_FAQ: "api/v1/ProductFaq",
  PRODUCT_RATING: "api/v1/ProductRating",
  UNIT: "api/v1/Unit",
  TOPPING: "api/v1/Topping",
  PRODUCT_TOPPING: "api/v1/ProductTopping",
  OFFER: "api/v1/Offer",
  PRODUCT_SPECIFICATION_FILTER: "api/v1/ProductSpecificationFilter",
  PRODUCT_SPECIFICATION: "api/v1/ProductSpecification",
  PRODUCT: "api/v1/Product",
  PRODUCT_VARIANT: "api/v1/ProductVariant",
  PRODUCT_IMAGES: "api/v1/ProductImages",
  PRODUCT_NUTRITION: "api/v1/ProductNutrition",
  PRODUCT_UNIT: "api/v1/ProductUnit",
  BANNER: "api/v1/Banner",
  PROMOTIONAL_CONTENT: "api/v1/PromotionalContent",
  DELIVERY_PLACES: "api/v1/DeliveryPlaces",
  DELIVERY_BOY: "api/v1/DeliveryBoy",
  DELIVERY_BOY_ORDER_TRANSACTIONS: "api/v1/DeliveryBoyOrderTransactions",
  DELIVERY_BOY_TRANSACTION: "api/v1/DeliveryBoyTransaction",
  DELIVERY_REQUEST: "api/v1/DeliveryRequest",
  ORDER: "api/v1/Order",
  ORDER_DELIVERY: "api/v1/OrderDelivery",
  INVOICE: "api/v1/Invoice",
  USER: "api/v1/User",
  SELLER: "api/v1/Seller",
  SELLER_SETTINGS: "api/v1/SellerSettings",
  ADMIN: "api/v1/Admin",
  PROMOCODE: "api/v1/Promocode",
  COMBO: "api/v1/Combo",
  ADDON: "api/v1/AddOn",
  CATEGORY_SELLER: "api/v1/CategorySeller",
  USER_SUPPORT: "api/v1/UserSupport",
  SETTINGS: "api/v1/Settings",
  FAQ: "api/v1/Faq",
  NOTIFICATION: "api/v1/Notification",
  PROFILE: "api/v1/ClientUser",
  STORE_HOURS: "api/v1/StoreHours",
  PRODUCT_TIMING: "api/v1/ProductTiming",
} as const;

export enum RoleType {
  SuperAdmin = 1,
  SystemAdmin = 2,
  Seller = 3,
  User = 4,
  DeliveryBoy = 5,
}

export const ROLE_LABELS: Record<number, string> = {
  [RoleType.SuperAdmin]: "Super Admin",
  [RoleType.SystemAdmin]: "System Admin",
  [RoleType.Seller]: "Seller",
  [RoleType.User]: "User",
  [RoleType.DeliveryBoy]: "Delivery Boy",
};

export enum OrderStatus {
  Created = 0,
  Processing = 1,
  Shipped = 2,
  Delivered = 3,
  Cancelled = 4,
  Returned = 5,
  Failed = 6,
  Assigned = 7,
  CancelledBySeller = 8,
  SellerAccepted = 9,
}

export const ORDER_STATUS_LABELS: Record<number, string> = {
  0: "Created",
  1: "Processing",
  2: "Shipped",
  3: "Delivered",
  4: "Cancelled",
  5: "Returned",
  6: "Failed",
  7: "Assigned",
  8: "Cancelled by Seller",
  9: "Seller Accepted",
};

export enum PaymentMode {
  Online = 0,
  CashOnDelivery = 1,
}

export enum PlatformType {
  None = 0,
  HotBox = 1,
  SpeedyMart = 2,
}

export const TOKEN_KEYS = {
  Role: "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
  Expiry: "exp",
  RecordId: "dbRId",
  UserName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  GivenName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
  EmailAddress: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
} as const;
