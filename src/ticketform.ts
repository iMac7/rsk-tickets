import { parseEther } from "ethers";

import { FACTORY_ADDRESS, USE_LOCAL_SIGNER, connectWallet, getErrorMessage, getFactory } from "./utils";

type TicketFormBindings = {
  deployForm: HTMLFormElement;
  accountNode: HTMLDivElement;
  loadShops: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setValidation: (message?: string) => void;
  syncConnectButton: () => void;
};

export function renderTicketForm() {
  return `
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
        <span class="text-sm font-medium">Ticket price (RBTC)</span>
        <input name="price" type="number" min="0" step="0.00000000001" required class="w-full border border-stone-300 px-3 py-2 outline-none placeholder:text-stone-400 focus:border-amber-500" placeholder="0.01" />
      </label>
      <div id="validation" class="min-h-6 text-sm text-pink-600"></div>
      <button class="w-full bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800">Deploy ticket shop</button>
    </form>
  `;
}

export function bindTicketForm({
  deployForm,
  accountNode,
  loadShops,
  setLoading,
  setValidation,
  syncConnectButton,
}: TicketFormBindings) {
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
          syncConnectButton();
        }

        const factory = await getFactory(true);
        const tx = await factory.deployTicketShop(name, Math.floor(eventTimestamp / 1000), parseEther(price));
        await tx.wait();

        deployForm.reset();
        setValidation();
        await loadShops();
      },
      setLoading,
      setValidation,
    );
  });
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
