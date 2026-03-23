// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {TicketShop} from "./TicketShop.sol";

contract TicketShopFactory {
  address[] public ticketShops;

  event TicketShopDeployed(
    address indexed ticketShop,
    address indexed creator,
    string name,
    uint256 eventDate,
    uint256 price
  );

  function deployTicketShop(
    string calldata name,
    uint256 eventDate,
    uint256 price
  ) external returns (address ticketShop) {
    TicketShop createdTicketShop = new TicketShop(name, eventDate, price);

    ticketShop = address(createdTicketShop);
    ticketShops.push(ticketShop);

    emit TicketShopDeployed(
      ticketShop,
      msg.sender,
      name,
      eventDate,
      price
    );
  }

  function getTicketShops() external view returns (address[] memory) {
    return ticketShops;
  }
}
