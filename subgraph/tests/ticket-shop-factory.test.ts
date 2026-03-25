import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { TicketShopDeployed } from "../generated/schema"
import { TicketShopDeployed as TicketShopDeployedEvent } from "../generated/TicketShopFactory/TicketShopFactory"
import { handleTicketShopDeployed } from "../src/ticket-shop-factory"
import { createTicketShopDeployedEvent } from "./ticket-shop-factory-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let ticketShop = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let creator = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let name = "Example string value"
    let eventDate = BigInt.fromI32(234)
    let price = BigInt.fromI32(234)
    let newTicketShopDeployedEvent = createTicketShopDeployedEvent(
      ticketShop,
      creator,
      name,
      eventDate,
      price
    )
    handleTicketShopDeployed(newTicketShopDeployedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("TicketShopDeployed created and stored", () => {
    assert.entityCount("TicketShopDeployed", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "TicketShopDeployed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "ticketShop",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "TicketShopDeployed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "creator",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "TicketShopDeployed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "name",
      "Example string value"
    )
    assert.fieldEquals(
      "TicketShopDeployed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "eventDate",
      "234"
    )
    assert.fieldEquals(
      "TicketShopDeployed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "price",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
