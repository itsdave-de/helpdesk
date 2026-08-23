<template>
  <div
    v-if="contact"
    class="flex flex-col gap-2 rounded-lg border border-outline-gray-2 px-4 py-3"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm text-ink-gray-6 truncate">
        {{ heading }}
      </span>
      <RouterLink
        v-if="customers.length === 1"
        :to="{ name: 'Customer', params: { id: customers[0] } }"
        class="shrink-0 text-sm text-ink-gray-5 hover:text-ink-gray-8"
      >
        {{ __("All tickets") }}
      </RouterLink>
    </div>
    <div
      v-if="loading"
      class="flex items-center justify-center py-4 text-ink-gray-4"
    >
      <LoadingIndicator :scale="6" />
    </div>
    <div v-else-if="!rows.length" class="py-1 text-sm text-ink-gray-5">
      {{ __("No recent tickets") }}
    </div>
    <div v-else class="flex flex-col divide-y divide-outline-gray-1">
      <div
        v-for="ticket in rows"
        :key="ticket.name"
        class="grid cursor-pointer items-center gap-3 rounded px-1 py-2 text-sm text-ink-gray-8 hover:bg-surface-gray-1"
        style="grid-template-columns: 6.5rem minmax(0, 1fr) 7rem 7rem"
        @click="openTicket(ticket.name)"
      >
        <div class="text-ink-gray-6">{{ ticket.name }}</div>
        <div class="flex min-w-0 flex-col">
          <span class="truncate font-medium">{{ ticket.subject }}</span>
          <span
            class="truncate text-xs"
            :class="
              ticket.contact === contact
                ? 'text-ink-gray-7 font-medium'
                : 'text-ink-gray-5'
            "
          >
            {{ ticket.raised_by }}
          </span>
        </div>
        <div class="flex items-center gap-1.5 truncate">
          <IndicatorIcon
            class="shrink-0"
            :class="getStatus(ticket.status)?.parsed_color"
          />
          <span class="truncate">{{ ticket.status }}</span>
        </div>
        <Tooltip :text="dayjsLocal(ticket.modified).format('LLL')">
          <div class="text-ink-gray-6 truncate">
            {{ dayjsLocal(ticket.modified).fromNow() }}
          </div>
        </Tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IndicatorIcon } from "@/components/icons";
import { useTicketStatusStore } from "@/stores/ticketStatus";
import { __ } from "@/translation";
import type { HDTicket } from "@/types/doctypes";
import {
  createListResource,
  createResource,
  dayjsLocal,
  LoadingIndicator,
  Tooltip,
} from "frappe-ui";
import { computed, watch } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{
  contact: string;
  limit?: number;
}>();

const router = useRouter();
const { getStatus } = useTicketStatusStore();

const contactInfo = createResource({
  url: "helpdesk.api.contact.get_contact_info",
  method: "GET",
  makeParams: () => ({ name: props.contact }),
  onSuccess: () => loadTickets(),
});

const customers = computed<string[]>(
  () => contactInfo.data?.customers?.map((c: { name: string }) => c.name) || []
);

const tickets = createListResource({
  doctype: "HD Ticket",
  fields: [
    "name",
    "subject",
    "status",
    "status_category",
    "modified",
    "contact",
    "raised_by",
  ],
  orderBy: "modified desc",
  pageLength: props.limit || 8,
});

function loadTickets() {
  const filters = customers.value.length
    ? { customer: ["in", customers.value] }
    : { contact: props.contact };
  tickets.update({ filters });
  tickets.reload();
}

watch(
  () => props.contact,
  (val) => {
    if (!val) return;
    contactInfo.data = null;
    tickets.data = null;
    contactInfo.fetch();
  },
  { immediate: true }
);

const loading = computed(
  () => contactInfo.loading || (tickets.loading && !tickets.data)
);

// Open tickets first, newest first within each group.
const categoryRank = { Open: 0, Paused: 1, Resolved: 2 };
const rows = computed<HDTicket[]>(() =>
  [...(tickets.data || [])].sort(
    (a, b) =>
      (categoryRank[a.status_category] ?? 3) -
        (categoryRank[b.status_category] ?? 3) ||
      dayjsLocal(b.modified).valueOf() - dayjsLocal(a.modified).valueOf()
  )
);

const heading = computed(() => {
  if (customers.value.length === 1) {
    return __("Recent tickets for {0}", customers.value[0]);
  }
  return __("Recent tickets for this contact");
});

function openTicket(name: string) {
  router.push({ name: "TicketAgent", params: { ticketId: name } });
}
</script>
