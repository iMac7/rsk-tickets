// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {TicketShop} from "./TicketShop.sol";
import {TicketShopFactory} from "./TicketShopFactory.sol";

interface Vm {
  function warp(uint256 newTimestamp) external;
  function deal(address account, uint256 newBalance) external;
  function prank(address msgSender) external;
}

contract TicketsTest {
  address private constant BUYER = address(0xB0B);
  address private constant SECOND_BUYER = address(0xCAFE);
  Vm private constant vm =
    Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

  uint256 private constant EVENT_OFFSET = 5 days;
  uint256 private constant TICKET_PRICE = 0.01 ether;

  TicketShopFactory private factory;
  TicketShop private ticketShop;

  function setUp() public {
    factory = new TicketShopFactory();
    ticketShop = new TicketShop(
      "RSK Summit",
      block.timestamp + EVENT_OFFSET,
      "ipfs://rsk-summit",
      TICKET_PRICE
    );

    vm.deal(BUYER, 10 ether);
    vm.deal(SECOND_BUYER, 10 ether);
  }

  function test_FactoryDeploysTicketShops() public {
    address deployedAddress = factory.deployTicketShop(
      "Random rsk event",
      block.timestamp + 10 days,
      "ipfs://rsk-stuff",
      0.1 ether
    );

    TicketShop deployedTicketShop = TicketShop(deployedAddress);

    require(
      keccak256(bytes(deployedTicketShop.name())) ==
        keccak256(bytes("Random rsk event")),
      "unexpected event name"
    );
    require(deployedTicketShop.price() == 0.1 ether, "unexpected ticket price");
    require(
      keccak256(bytes(deployedTicketShop.metadataUri())) ==
        keccak256(bytes("ipfs://rsk-stuff")),
      "unexpected metadata uri"
    );
  }

  function test_QueuedPurchaseCanBeFinalizedAtEventStart() public {
    vm.prank(BUYER);
    uint256 purchaseId = ticketShop.queue{value: TICKET_PRICE}();

    require(ticketShop.activeTickets(BUYER) == 0, "ticket should be pending");

    vm.warp(block.timestamp + EVENT_OFFSET);
    vm.prank(BUYER);
    ticketShop.execute(purchaseId);

    require(ticketShop.activeTickets(BUYER) == 1, "ticket was not finalized");
  }

  function test_PurchaseCanBeRefundedBeforeEventStarts() public {
    vm.prank(BUYER);
    uint256 purchaseId = ticketShop.queue{value: TICKET_PRICE}();

    vm.warp(block.timestamp + EVENT_OFFSET - 1);
    vm.prank(BUYER);
    (bool success, ) = address(ticketShop).call(
      abi.encodeCall(TicketShop.execute, (purchaseId))
    );
    require(!success, "execution should wait until event start");

    uint256 buyerBalanceBeforeRefund = BUYER.balance;

    vm.prank(BUYER);
    ticketShop.cancel(purchaseId);

    require(ticketShop.activeTickets(BUYER) == 0, "ticket should be removed");
    require(
      BUYER.balance == buyerBalanceBeforeRefund + TICKET_PRICE,
      "refund amount was incorrect"
    );
  }

  function test_PendingPurchaseCanAlsoBeRefundedBeforeEventStarts() public {
    vm.prank(SECOND_BUYER);
    uint256 purchaseId = ticketShop.queue{value: TICKET_PRICE}();

    vm.prank(SECOND_BUYER);
    ticketShop.cancel(purchaseId);

    require(
      ticketShop.activeTickets(SECOND_BUYER) == 0,
      "pending purchase should not mint a ticket"
    );
  }

  function test_NoSalesOrRefundsOnceEventStarts() public {
    vm.prank(BUYER);
    uint256 purchaseId = ticketShop.queue{value: TICKET_PRICE}();

    vm.warp(block.timestamp + EVENT_OFFSET);

    (bool purchaseSuccess, ) = address(ticketShop).call{value: TICKET_PRICE}(
      abi.encodeCall(TicketShop.queue, ())
    );
    require(!purchaseSuccess, "purchase should fail after event start");

    vm.prank(BUYER);
    (bool refundSuccess, ) = address(ticketShop).call(
      abi.encodeCall(TicketShop.cancel, (purchaseId))
    );
    require(!refundSuccess, "refund should fail after event start");
  }

  function test_FinalizeFailsBeforeEventStarts() public {
    vm.prank(BUYER);
    uint256 purchaseId = ticketShop.queue{value: TICKET_PRICE}();

    vm.prank(BUYER);
    (bool success, ) = address(ticketShop).call(
      abi.encodeCall(TicketShop.execute, (purchaseId))
    );

    require(!success, "finalization should wait for event start");
  }
}
