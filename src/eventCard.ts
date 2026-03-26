import { Contract, formatEther } from "ethers";

import {
  USE_LOCAL_SIGNER,
  USE_SUBGRAPH,
  clearActionError,
  escapeHtml,
  getErrorMessage,
  getLocalWallet,
  getReadProvider,
  getReadonlyAccount,
  getWalletProvider,
  setActionError,
  shopAbi,
  type Shop,
  type ShopDetails,
} from "./utils";

type EventCardBindings = {
  shopsNode: HTMLDivElement;
  loadShops: () => Promise<void>;
};

export async function getShopDetails(shop: Shop): Promise<ShopDetails> {
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

  try {
    const contract = new Contract(shop.address, shopAbi, provider);
    const [rawState, activeTickets] = await Promise.all([
      contract.state() as Promise<bigint>,
      contract.activeTickets(getReadonlyAccount()) as Promise<bigint>,
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
}

export function renderEventCard(shop: ShopDetails) {
  return `
    <article class="border border-white/10 bg-white/5 p-5 text-sm text-stone-200 shadow-xl shadow-black/20">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-xl font-semibold text-white">${escapeHtml(shop.name)}</h3>
            <span class="border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">${shop.stateLabel}</span>
          </div>
          <p class="break-all text-xs text-stone-400">${shop.address}</p>
          <div class="flex flex-col gap-2">
            <div><span class="text-stone-500">Price:</span> ${formatEther(shop.price)} RBTC</div>
            <div><span class="text-stone-500">Event:</span> ${new Date(Number(shop.eventDate) * 1000).toLocaleString()}</div>
            <div><span class="text-stone-500">Tickets not cancelled:</span> ${shop.ticketsSold}</div>
            <div><span class="text-stone-500">Your active tickets:</span> ${shop.activeTickets}</div>
          </div>
          ${USE_SUBGRAPH && shop.availablePurchaseIds.length
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
  `;
}

export function bindEventCardActions({ shopsNode, loadShops }: EventCardBindings) {
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
        }, loadShops);
        return;
      }

      const purchaseIdInput = shopsNode.querySelector<HTMLInputElement>(`[data-purchase-id="${address}"]`);
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
        loadShops,
      );
    });
  });
}

async function callShop(address: string, action: (shop: Contract) => Promise<void>, loadShops: () => Promise<void>) {
  try {
    const signer = USE_LOCAL_SIGNER ? getLocalWallet() : await (await getWalletProvider()).getSigner();
    const shop = new Contract(address, shopAbi, signer);
    await action(shop);
    await loadShops();
  } catch (error) {
    setActionError(address, getErrorMessage(error));
    console.error(error);
  }
}
