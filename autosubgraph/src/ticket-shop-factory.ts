import { TicketShopDeployed as TicketShopDeployedEvent } from "../generated/TicketShopFactory/TicketShopFactory"
import { TicketShopDeployed } from "../generated/schema"

export function handleTicketShopDeployed(event: TicketShopDeployedEvent): void {
  let entity = new TicketShopDeployed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.ticketShop = event.params.ticketShop
  entity.creator = event.params.creator
  entity.name = event.params.name
  entity.eventDate = event.params.eventDate
  entity.price = event.params.price

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
