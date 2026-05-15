export interface ShopItem {
  id: number
  name: string
  logo: string
  banner: string
  rating: number
  productCount: number
  description: string
}

export interface ProductDetailResp {
  id: number
  name: string
  description: string
  price: number
  stock: number
  images: string[]
  shopId: number
  status: number
}

export interface CartItem {
  productId: number
  quantity: number
  selected: boolean
}

export interface CartListResp {
  items: CartItem[]
}

export interface ShopDetailResp {
  shop: ShopItem
}

export interface ShopListResp {
  shops: ShopItem[]
  total: number
}

export interface ProductListResp {
  products: ProductDetailResp[]
  total: number
}

export interface IsFollowingResp {
  isFollowing: boolean
}

export interface OkResp {
  ok: boolean
}

export interface ApiError {
  code: number
  message: string
}

export interface UserInfoResp {
  id: number
  username: string
  phone: string
  avatar: string
  createTime: number
}

// S1.2 收银台
export interface CashierInfo {
  orderId: number
  orderNo: string
  amount: number // cents
  expireAt: number // unix sec
  channels: string[]
  mockEnabled: boolean
}

export interface AddressItem {
  id: number
  userId: number
  receiverName: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault: boolean
  createTime: number
}

// S1.7 订单详情（含时间线字段）
export interface OrderItem {
  productId: number
  productName: string
  price: number
  quantity: number
}

export interface CreateOrderItem {
  productId: number
  productName: string
  price: number
  quantity: number
}

export interface CreateOrderResp {
  id: number
  orderNo: string
  totalAmount: number
}

export interface OrderDetailResp {
  id: number
  orderNo: string
  userId: number
  totalAmount: number
  status: number // 0=待支付 1=已支付 2=已发货 3=已完成 4=已取消
  items: OrderItem[]
  createTime: number
  payTime?: number
  shipTime?: number
  completeTime?: number
  cancelTime?: number
  cancelReason?: string
}

export interface OrderListResp {
  orders: OrderDetailResp[]
  total: number
}

// S4.4 KYC
export interface SubmitKycReq {
  realName: string
  idCardNo: string
  idCardFrontUrl: string
  idCardBackUrl: string
  faceVideoUrl: string
}

export interface SubmitKycResp {
  requestId: string
  status: number
}

export interface KycStatusResp {
  status: number       // 0=未提交 1=审核中 2=已通过 3=已拒绝
  rejectReason: string
  submitTime: number
  auditTime: number
  realName: string     // server-masked: 张**
  idCardNo: string     // server-masked: 1101**********1234
}

// S2 Refund
export interface RefundRequest {
  id: number
  orderId: number
  orderNo: string
  userId: number
  shopId: number
  amount: number
  reason: string
  evidence?: string[]
  status: number // 0=pending,1=approved,2=rejected,3=arbitrating,4=refunded,5=final_rejected
  merchantRemark?: string
  merchantHandleTime?: number
  adminRemark?: string
  adminHandleTime?: number
  appealReason?: string
  appealTime?: number
  refundNo?: string
  refundCompleteTime?: number
  createTime: number
}

export interface ListRefundRequestsResp {
  requests: RefundRequest[]
  total: number
}
