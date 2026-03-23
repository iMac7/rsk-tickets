// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract TicketShop {
  error EventAlreadyStarted();
  error EventDateMustBeInTheFuture();
  error IncorrectTicketPrice();
  error InvalidBuyer();
  error NotPurchaseOwner();
  error PurchaseAlreadyFinalized();
  error PurchaseAlreadyRefunded();
  error PurchaseTimelockActive();

  enum EventState {
    SalesOpen,
    EventStarted
  }

  struct Purchase {
    address buyer;
    uint256 amountPaid;
    uint256 unlockTimestamp;
    bool finalized;
    bool refunded;
  }

  string public name;
  string public metadataUri;
  uint256 public immutable eventDate;
  uint256 public immutable price;
  uint256 public nextPurchaseId;

  mapping(uint256 => Purchase) public purchases;
  mapping(address => uint256) public activeTickets;

  event PurchaseQueued(
    uint256 indexed purchaseId,
    address indexed buyer,
    uint256 unlockTimestamp
  );
  event PurchaseFinalized(uint256 indexed purchaseId, address indexed buyer);
  event PurchaseRefunded(uint256 indexed purchaseId, address indexed buyer);

  constructor(
    string memory eventName,
    uint256 eventTimestamp,
    string memory eventMetadataUri,
    uint256 ticketPrice
  ) {
    if (eventTimestamp <= block.timestamp) revert EventDateMustBeInTheFuture();

    name = eventName;
    eventDate = eventTimestamp;
    metadataUri = eventMetadataUri;
    price = ticketPrice;
  }

  function state() public view returns (EventState) {
    if (block.timestamp >= eventDate) {
      return EventState.EventStarted;
    }

    return EventState.SalesOpen;
  }

  function queue() external payable returns (uint256 purchaseId) {
    if (state() != EventState.SalesOpen) revert EventAlreadyStarted();
    if (msg.value != price) revert IncorrectTicketPrice();

    purchaseId = nextPurchaseId;
    nextPurchaseId += 1;

    purchases[purchaseId] = Purchase({
      buyer: msg.sender,
      amountPaid: msg.value,
      unlockTimestamp: eventDate,
      finalized: false,
      refunded: false
    });

    emit PurchaseQueued(purchaseId, msg.sender, eventDate);
  }

  function execute(uint256 purchaseId) external {
    Purchase storage purchase = purchases[purchaseId];
    _requireValidPurchase(purchase);

    if (purchase.buyer != msg.sender) revert NotPurchaseOwner();
    if (purchase.refunded) revert PurchaseAlreadyRefunded();
    if (purchase.finalized) revert PurchaseAlreadyFinalized();
    if (block.timestamp < purchase.unlockTimestamp) revert PurchaseTimelockActive();

    purchase.finalized = true;
    activeTickets[msg.sender] += 1;

    emit PurchaseFinalized(purchaseId, msg.sender);
  }

  function cancel(uint256 purchaseId) external {
    if (state() != EventState.SalesOpen) revert EventAlreadyStarted();

    Purchase storage purchase = purchases[purchaseId];
    _requireValidPurchase(purchase);

    if (purchase.buyer != msg.sender) revert NotPurchaseOwner();
    if (purchase.refunded) revert PurchaseAlreadyRefunded();

    purchase.refunded = true;

    if (purchase.finalized) {
      activeTickets[msg.sender] -= 1;
    }

    (bool success, ) = payable(msg.sender).call{value: purchase.amountPaid}("");
    require(success, "refund transfer failed");

    emit PurchaseRefunded(purchaseId, msg.sender);
  }

  function _requireValidPurchase(Purchase storage purchase) private view {
    if (purchase.buyer == address(0)) revert InvalidBuyer();
  }
}
