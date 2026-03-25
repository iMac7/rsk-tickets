import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import { TicketShopDeployed } from "../generated/TicketShopFactory/TicketShopFactory"

export function createTicketShopDeployedEvent(
  ticketShop: Address,
  creator: Address,
  name: string,
  eventDate: BigInt,
  price: BigInt
): TicketShopDeployed {
  let ticketShopDeployedEvent = changetype<TicketShopDeployed>(newMockEvent())

  ticketShopDeployedEvent.parameters = new Array()

  ticketShopDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "ticketShop",
      ethereum.Value.fromAddress(ticketShop)
    )
  )
  ticketShopDeployedEvent.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  )
  ticketShopDeployedEvent.parameters.push(
    new ethereum.EventParam("name", ethereum.Value.fromString(name))
  )
  ticketShopDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "eventDate",
      ethereum.Value.fromUnsignedBigInt(eventDate)
    )
  )
  ticketShopDeployedEvent.parameters.push(
    new ethereum.EventParam("price", ethereum.Value.fromUnsignedBigInt(price))
  )

  return ticketShopDeployedEvent
}
