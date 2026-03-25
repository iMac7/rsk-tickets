import {
  PurchaseFinalized as PurchaseFinalizedEvent,
  PurchaseQueued as PurchaseQueuedEvent,
  PurchaseRefunded as PurchaseRefundedEvent,
  TicketShop as TicketShopContract,
} from "../generated/templates/TicketShop/TicketShop"
import { Purchase, TicketShop } from "../generated/schema"

function getPurchaseEntityId(shopAddress: string, purchaseId: string): string {
  return shopAddress.concat("-").concat(purchaseId)
}

export function handlePurchaseQueued(event: PurchaseQueuedEvent): void {
  let shopAddress = event.address
  let shop = TicketShop.load(shopAddress)
  if (shop == null) {
    return
  }

  let purchaseEntityId = getPurchaseEntityId(
    shopAddress.toHexString(),
    event.params.purchaseId.toString()
  )
  let purchase = new Purchase(purchaseEntityId)
  let shopContract = TicketShopContract.bind(shopAddress)

  purchase.shop = shopAddress
  purchase.purchaseId = event.params.purchaseId
  purchase.buyer = event.params.buyer
  purchase.unlockTimestamp = event.params.unlockTimestamp
  purchase.amountPaid = shopContract.price()
  purchase.queuedBlockNumber = event.block.number
  purchase.queuedBlockTimestamp = event.block.timestamp
  purchase.queuedTransactionHash = event.transaction.hash
  purchase.finalized = false
  purchase.refunded = false

  purchase.save()
}

export function handlePurchaseFinalized(event: PurchaseFinalizedEvent): void {
  let purchaseEntityId = getPurchaseEntityId(
    event.address.toHexString(),
    event.params.purchaseId.toString()
  )
  let purchase = Purchase.load(purchaseEntityId)
  if (purchase == null) {
    return
  }

  purchase.finalized = true
  purchase.finalizedBlockNumber = event.block.number
  purchase.finalizedBlockTimestamp = event.block.timestamp
  purchase.finalizedTransactionHash = event.transaction.hash

  purchase.save()
}

export function handlePurchaseRefunded(event: PurchaseRefundedEvent): void {
  let purchaseEntityId = getPurchaseEntityId(
    event.address.toHexString(),
    event.params.purchaseId.toString()
  )
  let purchase = Purchase.load(purchaseEntityId)
  if (purchase == null) {
    return
  }

  purchase.refunded = true
  purchase.refundedBlockNumber = event.block.number
  purchase.refundedBlockTimestamp = event.block.timestamp
  purchase.refundedTransactionHash = event.transaction.hash

  purchase.save()
}
