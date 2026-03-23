// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {TicketShop} from "./TicketShop.sol";

contract TicketShopFactory {
  event TicketShopDeployed(
    address indexed ticketShop,
    address indexed creator,
    string name,
    uint256 eventDate,
    string metadataUri,
    uint256 price
  );

  function deployTicketShop(
    string calldata name,
    uint256 eventDate,
    string calldata metadataUri,
    uint256 price
  ) external returns (address ticketShop) {
    TicketShop createdTicketShop = new TicketShop(
      name,
      eventDate,
      metadataUri,
      price
    );

    ticketShop = address(createdTicketShop);

    emit TicketShopDeployed(
      ticketShop,
      msg.sender,
      name,
      eventDate,
      metadataUri,
      price
    );
  }
}
