import "./style.css";
import { initApp } from "./helpers";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <main class="min-h-screen bg-stone-950 text-stone-100">
    <div class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
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

      <section class="grid gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <form id="deployForm" class="max-w-[400px] space-y-4 border border-white/10 bg-white p-5 text-stone-900 shadow-xl shadow-black/20">
          <h2 class="mt-2 text-2xl font-semibold">Create Event</h2>
          <label class="block space-y-2">
            <span class="text-sm font-medium">Name</span>
            <input name="name" required class="w-full border border-stone-300 px-3 py-2 outline-none ring-0 placeholder:text-stone-400 focus:border-amber-500" placeholder="Devcon side event" />
          </label>
          <label class="block space-y-2">
            <span class="text-sm font-medium">Event date</span>
            <input name="eventDate" type="date" required class="w-full border border-stone-300 px-3 py-2 outline-none focus:border-amber-500" />
          </label>
          <label class="block space-y-2">
            <span class="text-sm font-medium">Event time</span>
            <input name="eventTime" type="time" required class="w-full border border-stone-300 px-3 py-2 outline-none focus:border-amber-500" />
          </label>
          <label class="block space-y-2">
            <span class="text-sm font-medium">Ticket price (RBTC/ETH)</span>
            <input name="price" type="number" min="0" step="0.00000000001" required class="w-full border border-stone-300 px-3 py-2 outline-none placeholder:text-stone-400 focus:border-amber-500" placeholder="0.01" />
          </label>
          <div id="validation" class="min-h-6 text-sm text-pink-600"></div>
          <button class="w-full bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800">Deploy ticket shop</button>
        </form>

        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="mt-2 text-2xl font-semibold text-white">Events</h2>
            <button id="refresh" class="border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Refresh</button>
          </div>
          <div id="shops" class="grid gap-4"></div>
        </section>
      </section>
    </div>
  </main>
`;

void initApp();
