import "./style.css";
import { bindEventCardActions, getShopDetails, renderEventCard } from "./eventCard";
import { bindTicketForm, renderTicketForm } from "./ticketform";
import {
  FACTORY_ADDRESS,
  READ_RPC_URL,
  SUBGRAPH_URL,
  USE_LOCAL_SIGNER,
  USE_SUBGRAPH,
  connectWallet,
  disconnectWallet,
  fetchShops,
  formatAccountLabel,
  initializeAccount,
  state,
} from "./utils";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = renderAppShell();

void initApp();

function renderAppShell() {
  return `
    <main class="min-h-screen bg-stone-950 text-stone-100">
      <div class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        ${renderHeader()}
        <section class="grid gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          ${renderTicketForm()}
          ${renderEventsSection()}
        </section>
      </div>
    </main>
  `;
}

function renderHeader() {
  return `
    <section class="p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 class="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">Tickets and stuff</h1>
        <button id="connect" class="bg-amber-300 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-200">Connect wallet</button>
      </div>
      <div class="mt-6 grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:items-start sm:gap-x-4">
        <div class="text-xs uppercase tracking-[0.2em] text-stone-500">Factory</div>
        <div id="factoryAddress" class="break-all text-stone-100"></div>
        <div class="text-xs uppercase tracking-[0.2em] text-stone-500">RPC URL</div>
        <div id="rpcUrl" class="break-all text-stone-100"></div>
        <div class="text-xs uppercase tracking-[0.2em] text-stone-500">Subgraph</div>
        <div id="subgraphUrl" class="break-all text-stone-100"></div>
        <div class="text-xs uppercase tracking-[0.2em] text-stone-500">Account</div>
        <div id="account" class="break-all text-stone-100">Not connected</div>
      </div>
    </section>
  `;
}

function renderEventsSection() {
  return `
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="mt-2 text-2xl font-semibold text-white">Events</h2>
        <button id="refresh" class="border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Refresh</button>
      </div>
      <div id="shops" class="grid gap-4"></div>
    </section>
  `;
}

async function initApp() {
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

  const syncConnectButton = () => {
    connectButton.textContent = USE_LOCAL_SIGNER ? "Local signer active" : formatAccountLabel(state.account);
    connectButton.hidden = USE_LOCAL_SIGNER;
  };

  const loadShops = async () => {
    state.shops = await fetchShops();
    await renderShops(shopsNode, loadShops);
  };

  factoryAddressNode.textContent = FACTORY_ADDRESS || "Missing VITE_FACTORY_ADDRESS";
  rpcUrlNode.textContent = READ_RPC_URL;
  subgraphUrlNode.textContent = USE_SUBGRAPH ? SUBGRAPH_URL || "" : "Disabled";
  syncConnectButton();

  connectButton.addEventListener("click", async () => {
    try {
      if (state.account) {
        disconnectWallet(accountNode);
        syncConnectButton();
        await loadShops();
        return;
      }

      await connectWallet(accountNode);
      syncConnectButton();
      await loadShops();
    } catch (error) {
      console.error(error);
    }
  });

  refreshButton.addEventListener("click", async () => {
    await loadShops();
  });

  bindTicketForm({
    deployForm,
    accountNode,
    loadShops,
    setLoading,
    setValidation,
    syncConnectButton,
  });

  await initializeAccount(accountNode);
  syncConnectButton();
  await loadShops();
}

async function renderShops(shopsNode: HTMLDivElement, loadShops: () => Promise<void>) {
  if (!state.shops.length) {
    shopsNode.innerHTML = `
      <article class="border border-dashed border-white/15 bg-white/5 p-6 text-sm text-stone-300">
        No shops found yet.
      </article>
    `;
    return;
  }

  const details = await Promise.all(state.shops.map((shop) => getShopDetails(shop)));
  shopsNode.innerHTML = details.map((shop) => renderEventCard(shop)).join("");
  bindEventCardActions({ shopsNode, loadShops });
}
