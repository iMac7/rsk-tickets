import { TicketShopDeployed as TicketShopDeployedEvent } from "../generated/TicketShopFactory/TicketShopFactory"
import { TicketShop as TicketShopEntity } from "../generated/schema"
import { TicketShop as TicketShopTemplate } from "../generated/templates"

export function handleTicketShopDeployed(event: TicketShopDeployedEvent): void {
  let entity = new TicketShopEntity(event.params.ticketShop)
  entity.creator = event.params.creator
  entity.name = event.params.name
  entity.eventDate = event.params.eventDate
  entity.price = event.params.price
  entity.createdAtBlockNumber = event.block.number
  entity.createdAtTimestamp = event.block.timestamp
  entity.createdAtTransactionHash = event.transaction.hash

  entity.save()
  TicketShopTemplate.create(event.params.ticketShop)
}
