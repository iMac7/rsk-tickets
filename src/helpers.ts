import { BrowserProvider, Contract, Interface, JsonRpcProvider, Wallet, formatEther, parseEther } from "ethers";

const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS?.trim();
const TESTNET_RPC_URL = import.meta.env.VITE_TESTNET_RPC_URL?.trim();
const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL?.trim();
const LOCAL_RPC_URL = import.meta.env.VITE_LOCAL_RPC_URL?.trim() || "http://127.0.0.1:8545";
const LOCAL_PRIVATE_KEY =
  import.meta.env.VITE_LOCAL_PRIVATE_KEY?.trim() ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const USE_LOCAL_SIGNER = !TESTNET_RPC_URL;
const READ_RPC_URL = TESTNET_RPC_URL || LOCAL_RPC_URL;
const USE_SUBGRAPH = Boolean(!USE_LOCAL_SIGNER && SUBGRAPH_URL);

const factoryAbi = [
  "event TicketShopDeployed(address indexed ticketShop, address indexed creator, string name, uint256 eventDate, uint256 price)",
  "function deployTicketShop(string name, uint256 eventDate, uint256 price) external returns (address ticketShop)",
  "function getTicketShops() view returns (address[])",
];

const shopAbi = [
  "event PurchaseQueued(uint256 indexed purchaseId, address indexed buyer, uint256 unlockTimestamp)",
  "event PurchaseRefunded(uint256 indexed purchaseId, address indexed buyer)",
  "function name() view returns (string)",
  "function eventDate() view returns (uint256)",
  "function price() view returns (uint256)",
  "function state() view returns (uint8)",
  "function activeTickets(address) view returns (uint256)",
  "function queue() payable returns (uint256)",
  "function execute(uint256 purchaseId) external",
  "function cancel(uint256 purchaseId) external",
];

const errorInterface = new Interface([
  "error EventAlreadyStarted()",
  "error EventDateMustBeInTheFuture()",
  "error IncorrectTicketPrice()",
  "error InvalidBuyer()",
  "error NotPurchaseOwner()",
  "error PurchaseAlreadyFinalized()",
  "error PurchaseAlreadyRefunded()",
  "error PurchaseTimelockActive()",
]);

const customErrorMessages: Record<string, string> = {
  EventAlreadyStarted: "The event has already started.",
  EventDateMustBeInTheFuture: "Event date and time must be in the future.",
  IncorrectTicketPrice: "Ticket price sent does not match the event price.",
  InvalidBuyer: "That purchase ID does not exist.",
  NotPurchaseOwner: "Only the buyer who made this purchase can do that.",
  PurchaseAlreadyFinalized: "This purchase has already been finalized.",
  PurchaseAlreadyRefunded: "This purchase has already been cancelled.",
  PurchaseTimelockActive: "This purchase cannot be finalized until the event start time.",
};

type Shop = {
  address: string;
  name: string;
  eventDate: bigint;
  price: bigint;
  ticketsSold?: number;
  activeTickets?: bigint;
  availablePurchaseIds?: string[];
};

declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] }): Promise<unknown>;
    };
  }
}

const state = {
  account: "",
  loading: false,
  shops: [] as Shop[],
};

export async function initApp() {
  const factoryAddressNode = document.querySelector<HTMLDivElement>("#factoryAddress");
  const rpcUrlNode = document.querySelector<HTMLDivElement>("#rpcUrl");
  const subgraphUrlNode = document.querySelector<HTMLDivElement>("#subgraphUrl");
  const accountNode = document.querySelector<HTMLDivElement>("#account");
  const validationNode = document.querySelector<HTMLDivElement>("#validation");
  const shopsNode = document.querySelector<HTMLDivElement>("#shops");
  const connectButton = document.querySelector<HTMLButtonElement>("#connect");
  const refreshButton = document.querySelector<HTMLButtonElement>("#refresh");
  const deployForm = document.querySelector<HTMLFormElement>("#deployForm");

  if (!factoryAddressNode || !rpcUrlNode || !subgraphUrlNode || !accountNode || !validationNode || !shopsNode || !connectButton || !refreshButton || !deployForm) {
    throw new Error("Missing app elements.");
  }

  const setValidation = (message = "") => {
    validationNode.textContent = message;
  };

  const setLoading = (loading: boolean) => {
    state.loading = loading;
    connectButton.disabled = loading;
    refreshButton.disabled = loading;
    deployForm.querySelectorAll("button, input").forEach((node) => {
      (node as HTMLButtonElement | HTMLInputElement).disabled = loading;
    });
  };

  factoryAddressNode.textContent = FACTORY_ADDRESS || "Missing VITE_FACTORY_ADDRESS";
  rpcUrlNode.textContent = READ_RPC_URL;
  subgraphUrlNode.textContent = USE_SUBGRAPH ? SUBGRAPH_URL! : "Disabled";
  connectButton.textContent = USE_LOCAL_SIGNER ? "Local signer active" : "Connect wallet";
  connectButton.hidden = USE_LOCAL_SIGNER;

  connectButton.addEventListener("click", async () => {
    try {
      await connectWallet(accountNode);
      await loadShops(shopsNode);
    } catch (error) {
      console.error(error);
    }
  });

  refreshButton.addEventListener("click", async () => {
    await loadShops(shopsNode);
  });

  deployForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!FACTORY_ADDRESS) {
      setValidation("Set VITE_FACTORY_ADDRESS before deploying.");
      return;
    }

    const form = new FormData(deployForm);
    const name = String(form.get("name") || "").trim();
    const eventDate = String(form.get("eventDate") || "");
    const eventTime = String(form.get("eventTime") || "");
    const price = String(form.get("price") || "").trim();
    const [year, month, day] = eventDate.split("-").map(Number);
    const [hours, minutes] = eventTime.split(":").map(Number);
    const eventDateValue = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const eventTimestamp = eventDateValue.getTime();

    if (Number.isNaN(eventTimestamp)) {
      setValidation("Enter a valid event date and time.");
      return;
    }

    if (eventTimestamp <= Date.now()) {
      setValidation("Event date and time must be in the future.");
      return;
    }

    setValidation();

    await runAction(
      async () => {
        if (!USE_LOCAL_SIGNER) {
          await connectWallet(accountNode);
        }

        const factory = await getFactory(true);
        const tx = await factory.deployTicketShop(name, Math.floor(eventTimestamp / 1000), parseEther(price));

        await tx.wait();

        deployForm.reset();
        setValidation();
        await loadShops(shopsNode);
      },
      setLoading,
      setValidation,
    );
  });

  await initializeAccount(accountNode);
  await loadShops(shopsNode);
}

async function runAction(
  action: () => Promise<void>,
  setLoading: (loading: boolean) => void,
  onError?: (message: string) => void,
) {
  try {
    setLoading(true);
    await action();
  } catch (error) {
    onError?.(getErrorMessage(error));
    console.error(error);
  } finally {
    setLoading(false);
  }
}

function getReadProvider() {
  return new JsonRpcProvider(READ_RPC_URL);
}

async function getWalletProvider() {
  if (!window.ethereum) {
    throw new Error("No injected wallet found.");
  }

  return new BrowserProvider(window.ethereum);
}

async function connectWallet(accountNode: HTMLDivElement) {
  if (USE_LOCAL_SIGNER) {
    await initializeAccount(accountNode);
    return;
  }

  const provider = await getWalletProvider();
  const accounts = (await provider.send("eth_requestAccounts", [])) as string[];
  state.account = String(accounts[0] || "");
  accountNode.textContent = state.account || "Not connected";
}

async function initializeAccount(accountNode: HTMLDivElement) {
  if (USE_LOCAL_SIGNER) {
    const wallet = getLocalWallet();
    state.account = await wallet.getAddress();
    accountNode.textContent = state.account;
    return;
  }

  if (window.ethereum) {
    try {
      const provider = await getWalletProvider();
      const accounts = (await provider.send("eth_accounts", [])) as string[];
      state.account = String(accounts[0] || "");
    } catch (error) {
      console.error(error);
    }
  }

  accountNode.textContent = state.account || "Not connected";
}

function getLocalWallet() {
  return new Wallet(LOCAL_PRIVATE_KEY, new JsonRpcProvider(LOCAL_RPC_URL));
}

async function getFactory(withSigner = false) {
  if (!FACTORY_ADDRESS) {
    throw new Error("Missing VITE_FACTORY_ADDRESS.");
  }

  const signer = withSigner
    ? USE_LOCAL_SIGNER
      ? getLocalWallet()
      : await (await getWalletProvider()).getSigner()
    : getReadProvider();
  return new Contract(FACTORY_ADDRESS, factoryAbi, signer);
}

async function loadShops(shopsNode: HTMLDivElement) {
  if (!FACTORY_ADDRESS) {
    await renderShops(shopsNode);
    return;
  }

  if (USE_SUBGRAPH) {
    state.shops = await loadShopsFromSubgraph();
    await renderShops(shopsNode);
    return;
  }

  const factory = await getFactory();
  const addresses = (await factory.getTicketShops()) as string[];
  const provider = getReadProvider();

  state.shops = (
    await Promise.all(
      addresses.map(async (address) => {
        const shop = new Contract(address, shopAbi, provider);
        const [name, eventDate, price] = await Promise.all([
          shop.name() as Promise<string>,
          shop.eventDate() as Promise<bigint>,
          shop.price() as Promise<bigint>,
        ]);

        return {
          address,
          name,
          eventDate,
          price,
          ticketsSold: undefined,
        };
      }),
    )
  ).reverse();

  await renderShops(shopsNode);
}

async function renderShops(shopsNode: HTMLDivElement) {
  if (!state.shops.length) {
    shopsNode.innerHTML = `
      <article class="border border-dashed border-white/15 bg-white/5 p-6 text-sm text-stone-300">
        No shops found yet.
      </article>
    `;
    return;
  }

  const details = await Promise.all(
    state.shops.map(async (shop) => {
      const derivedStateLabel = Number(shop.eventDate) * 1000 > Date.now() ? "Sales open" : "Event started";

      if (USE_SUBGRAPH) {
        return {
          ...shop,
          stateLabel: derivedStateLabel,
          activeTickets: shop.activeTickets ?? 0n,
          ticketsSold: shop.ticketsSold ?? 0,
          availablePurchaseIds: shop.availablePurchaseIds ?? [],
        };
      }

      const provider = getReadProvider();
      const readonlyAccount = state.account || "0x0000000000000000000000000000000000000000";

      try {
        const contract = new Contract(shop.address, shopAbi, provider);
        const [rawState, activeTickets] = await Promise.all([
          contract.state() as Promise<bigint>,
          contract.activeTickets(readonlyAccount) as Promise<bigint>,
        ]);

        return {
          ...shop,
          stateLabel: Number(rawState) === 0 ? "Sales open" : "Event started",
          activeTickets,
          ticketsSold: shop.ticketsSold ?? 0,
          availablePurchaseIds: [],
        };
      } catch (error) {
        console.error(`Failed to load shop details for ${shop.address}`, error);

        return {
          ...shop,
          stateLabel: derivedStateLabel,
          activeTickets: 0n,
          ticketsSold: shop.ticketsSold ?? 0,
          availablePurchaseIds: [],
        };
      }
    }),
  );

  shopsNode.innerHTML = details
    .map(
      (shop) => `
        <article class="border border-white/10 bg-white/5 p-5 text-sm text-stone-200 shadow-xl shadow-black/20">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-xl font-semibold text-white">${escapeHtml(shop.name)}</h3>
                <span class="border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">${shop.stateLabel}</span>
              </div>
              <p class="break-all text-xs text-stone-400">${shop.address}</p>
              <div class="grid gap-2 sm:grid-cols-2">
                <div><span class="text-stone-500">Price:</span> ${formatEther(shop.price)} RBTC</div>
                <div><span class="text-stone-500">Event:</span> ${new Date(Number(shop.eventDate) * 1000).toLocaleString()}</div>
                <div><span class="text-stone-500">Tickets not cancelled:</span> ${shop.ticketsSold}</div>
                <div><span class="text-stone-500">Your active tickets:</span> ${shop.activeTickets}</div>
              </div>
              ${USE_SUBGRAPH && shop.availablePurchaseIds?.length
                ? `<div><span class="text-stone-500">Your purchase IDs:</span> ${shop.availablePurchaseIds.join(", ")}</div>`
                : ""}
            </div>
            <div class="grid w-full gap-3 lg:max-w-sm">
              <button data-action="queue" data-address="${shop.address}" data-price="${shop.price}" class="mb-3 bg-amber-300 px-4 py-3 font-semibold text-stone-950 transition hover:bg-amber-200">Buy ticket</button>
              <div class="rounded border border-white/10 bg-black/15 p-3">
                <div class="grid gap-2">
                  <input data-purchase-id="${shop.address}" type="number" min="0" class="border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:border-amber-400" placeholder="Purchase ID" />
                  <div class="grid gap-2 sm:grid-cols-2">
                    <button data-action="execute" data-address="${shop.address}" class="border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10">Finalize</button>
                    <button data-action="cancel" data-address="${shop.address}" class="border border-red-400/20 bg-red-400/10 px-4 py-3 font-semibold text-red-100 transition hover:bg-red-400/20">Cancel purchase</button>
                  </div>
                </div>
              </div>
              <div data-action-error="${shop.address}" class="min-h-6 text-sm text-pink-400"></div>
            </div>
          </div>
        </article>
      `,
    )
    .join("");

  shopsNode.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const address = button.dataset.address;
      const action = button.dataset.action;

      if (!address || !action) {
        return;
      }

      if (action === "queue") {
        const price = button.dataset.price;
        clearActionError(address);
        await callShop(address, async (shop) => {
          const tx = await shop.queue({ value: BigInt(price || "0") });
          await tx.wait();
        });
        return;
      }

      const purchaseIdInput = document.querySelector<HTMLInputElement>(`[data-purchase-id="${address}"]`);
      const purchaseId = purchaseIdInput?.value.trim();

      if (!purchaseId) {
        setActionError(address, "Enter a purchase ID first.");
        return;
      }

      clearActionError(address);
      await callShop(
        address,
        async (shop) => {
          const tx = action === "execute" ? await shop.execute(BigInt(purchaseId)) : await shop.cancel(BigInt(purchaseId));
          await tx.wait();
        },
      );
    });
  });
}

async function loadShopsFromSubgraph(): Promise<Shop[]> {
  const response = await fetch(SUBGRAPH_URL!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query TicketShops {
          ticketShops(orderBy: createdAtTimestamp, orderDirection: desc) {
            id
            creator
            name
            eventDate
            price
          }
          purchases(first: 1000, where: { refunded: false }) {
            id
            purchaseId
            buyer
            finalized
            shop {
              id
            }
          }
        }
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to load subgraph data: ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: {
      ticketShops?: Array<{
        id: string;
        creator: string;
        name: string;
        eventDate: string;
        price: string;
      }>;
      purchases?: Array<{
        id: string;
        purchaseId: string;
        buyer: string;
        finalized: boolean;
        shop: {
          id: string;
        };
      }>;
    };
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || "Subgraph query failed.");
  }

  const ticketsSoldByShop = new Map<string, number>();
  const activeTicketsByShop = new Map<string, bigint>();
  const availablePurchaseIdsByShop = new Map<string, string[]>();
  const account = state.account.toLowerCase();
  for (const purchase of payload.data?.purchases || []) {
    const shopId = purchase.shop.id.toLowerCase();
    ticketsSoldByShop.set(shopId, (ticketsSoldByShop.get(shopId) || 0) + 1);
    if (account && purchase.buyer.toLowerCase() === account) {
      const purchaseIds = availablePurchaseIdsByShop.get(shopId) || [];
      purchaseIds.push(purchase.purchaseId);
      availablePurchaseIdsByShop.set(shopId, purchaseIds);

      if (purchase.finalized) {
        activeTicketsByShop.set(shopId, (activeTicketsByShop.get(shopId) || 0n) + 1n);
      }
    }
  }

  return (payload.data?.ticketShops || []).map((shop) => ({
    address: shop.id,
    name: shop.name,
    eventDate: BigInt(shop.eventDate),
    price: BigInt(shop.price),
    ticketsSold: ticketsSoldByShop.get(shop.id.toLowerCase()) || 0,
    activeTickets: activeTicketsByShop.get(shop.id.toLowerCase()) || 0n,
    availablePurchaseIds: availablePurchaseIdsByShop.get(shop.id.toLowerCase()) || [],
  }));
}

async function callShop(address: string, action: (shop: Contract) => Promise<void>) {
  try {
    const signer = USE_LOCAL_SIGNER ? getLocalWallet() : await (await getWalletProvider()).getSigner();
    const shop = new Contract(address, shopAbi, signer);
    await action(shop);
    const shopsNode = document.querySelector<HTMLDivElement>("#shops");
    if (shopsNode) {
      await loadShops(shopsNode);
    }
  } catch (error) {
    setActionError(address, getErrorMessage(error));
    console.error(error);
  }
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function setActionError(address: string, message = "") {
  const node = document.querySelector<HTMLElement>(`[data-action-error="${address}"]`);
  if (node) {
    node.textContent = message;
  }
}

function clearActionError(address: string) {
  setActionError(address);
}

function getErrorMessage(error: unknown) {
  const customErrors = collectCustomErrors(error);

  for (const err of customErrors) {
    const decoded = decodeCustomError(err);
    if (decoded) {
      return decoded;
    }
  }

  for (const err of customErrors) {
    if (
      err &&
      typeof err === "object" &&
      "shortMessage" in err &&
      typeof err.shortMessage === "string" &&
      err.shortMessage !== "missing revert data"
    ) {
      return err.shortMessage;
    }
  }

  for (const err of customErrors) {
    if (err instanceof Error && err.message && err.message !== "missing revert data") {
      return err.message;
    }
  }

  for (const err of customErrors) {
    if (typeof err === "string" && err && err !== "missing revert data") {
      return err;
    }
  }

  return "Something went wrong.";
}

function collectCustomErrors(error: unknown): unknown[] {
  const queue = [error];
  const seen = new Set<unknown>();
  const results: unknown[] = [];

  while (queue.length) {
    const current = queue.shift();
    if (current === undefined || seen.has(current)) {
      continue;
    }

    seen.add(current);
    results.push(current);

    if (current && typeof current === "object") {
      for (const key of ["info", "error", "data", "cause", "reason", "message", "shortMessage"]) {
        if (key in current) {
          queue.push((current as Record<string, unknown>)[key]);
        }
      }
    }
  }

  return results;
}

function decodeCustomError(err: unknown) {
  if (typeof err !== "string" || !err.startsWith("0x")) {
    return null;
  }

  try {
    const decoded = errorInterface.parseError(err);
    return customErrorMessages[decoded?.name || ""] || decoded?.name || null;
  } catch {
    return null;
  }
}
