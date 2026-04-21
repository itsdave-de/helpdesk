<template>
  <div class="h-full overflow-y-auto p-5">
    <div v-if="resource.loading" class="flex items-center justify-center py-20">
      <LoadingIndicator :scale="6" class="text-ink-gray-5" />
    </div>

    <div v-else>
      <div class="flex items-center justify-between mb-4">
        <div class="text-lg font-semibold text-ink-gray-9">Checklisten</div>
        <Button @click="openAttachDialog">
          <template #prefix>
            <Plus class="w-3.5 h-3.5" />
          </template>
          Checkliste anhängen
        </Button>
      </div>

      <div
        v-if="!checklists.length"
        class="py-12 text-center text-ink-gray-5 text-sm"
      >
        Keine Checkliste an diesem Ticket.
      </div>

      <div
        v-for="cl in checklists"
        :key="cl.name"
        class="mb-4 bg-surface-white border border-outline-gray-1 rounded-lg overflow-hidden"
      >
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="font-semibold text-base text-ink-gray-9">
                {{ cl.title }}
              </div>
              <Badge :theme="cl.status === 'Abgeschlossen' ? 'green' : 'gray'">
                {{ cl.status }}
              </Badge>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-sm text-ink-gray-7 tabular-nums">
                {{ cl.completed_tasks }} / {{ cl.total_tasks }}
                <span class="text-ink-gray-5">
                  ({{ percent(cl) }}%)
                </span>
              </div>
              <Button variant="ghost" theme="gray" @click="detach(cl)">
                <template #icon>
                  <Trash2 class="w-3.5 h-3.5" />
                </template>
              </Button>
            </div>
          </div>
          <div class="h-1 bg-surface-gray-2 rounded overflow-hidden">
            <div
              class="h-full bg-surface-primary transition-all"
              :style="{ width: percent(cl) + '%' }"
            />
          </div>
        </div>

        <div class="border-t border-outline-gray-1 bg-surface-gray-1 px-4 py-2">
          <template v-for="item in cl.items" :key="item.name">
            <div
              v-if="item.item_type === 'Headline'"
              class="mt-3 mb-1 pb-1 font-semibold text-sm text-ink-gray-9 border-b border-outline-gray-2 first:mt-0"
            >
              {{ item.label }}
            </div>

            <div
              v-else
              class="grid grid-cols-[180px_1fr_auto] gap-3 items-center py-1.5"
            >
              <FormControl
                type="select"
                :options="statusOptions"
                :modelValue="item.status || 'Offen'"
                @update:modelValue="(v) => changeStatus(cl, item, v as string)"
                size="sm"
              />
              <div :class="labelClass(item)">{{ item.label }}</div>
              <div
                v-if="item.completed_by"
                class="text-xs text-ink-gray-5 whitespace-nowrap"
              >
                {{ item.completed_by }}
                <span class="text-ink-gray-4">·</span>
                {{ formatDate(item.completed_at) }}
              </div>
              <div v-else />
            </div>
          </template>
        </div>
      </div>
    </div>

    <Dialog
      v-model="showAttachDialog"
      :options="{
        title: 'Checkliste anhängen',
        actions: [
          {
            label: 'Anhängen',
            variant: 'solid',
            disabled: !selectedTemplate,
            onClick: attach,
          },
        ],
      }"
    >
      <template #body-content>
        <div v-if="templateResource.loading" class="py-6 text-center">
          <LoadingIndicator :scale="4" class="text-ink-gray-5" />
        </div>
        <div v-else-if="!availableTemplates.length" class="text-sm text-ink-gray-6">
          Keine aktiven Checklisten-Vorlagen verfügbar.
        </div>
        <div v-else class="space-y-2">
          <label
            v-for="t in availableTemplates"
            :key="t.name"
            class="flex items-start gap-2 p-3 border border-outline-gray-2 rounded-md cursor-pointer hover:bg-surface-gray-1"
            :class="selectedTemplate === t.name ? 'border-outline-gray-3 bg-surface-gray-1' : ''"
          >
            <input
              type="radio"
              name="template"
              :value="t.name"
              v-model="selectedTemplate"
              class="mt-1"
            />
            <div>
              <div class="font-medium text-ink-gray-9">{{ t.title }}</div>
              <div
                v-if="t.description"
                class="text-xs text-ink-gray-5 mt-0.5"
              >
                {{ t.description }}
              </div>
            </div>
          </label>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import {
  Badge,
  Button,
  Dialog,
  FormControl,
  LoadingIndicator,
  call,
  createResource,
  toast,
} from "frappe-ui";
import { computed, inject, ref } from "vue";
import { TicketSymbol } from "@/types";
import Plus from "~icons/lucide/plus";
import Trash2 from "~icons/lucide/trash-2";

const ticket = inject(TicketSymbol);

const statusOptions = [
  { label: "☐ Offen", value: "Offen" },
  { label: "☑ Erledigt", value: "Erledigt" },
  { label: "⊘ Nicht benötigt", value: "Nicht benötigt" },
];

type ChecklistItem = {
  name: string;
  item_type: "Headline" | "Task";
  label: string;
  status: "Offen" | "Erledigt" | "Nicht benötigt" | null;
  completed_by: string | null;
  completed_at: string | null;
  note: string | null;
};

type Checklist = {
  name: string;
  title: string;
  status: "Aktiv" | "Abgeschlossen";
  template: string;
  total_tasks: number;
  completed_tasks: number;
  items: ChecklistItem[];
};

const resource = createResource({
  url: "helpdesk_addon.api.checklist_actions.get_for_ticket",
  makeParams: () => ({ ticket: ticket.value.doc?.name }),
  auto: true,
});

const checklists = computed<Checklist[]>(() => resource.data || []);

const templateResource = createResource({
  url: "helpdesk_addon.api.checklist_actions.list_available_templates",
  auto: false,
});

const availableTemplates = computed(() => templateResource.data || []);
const showAttachDialog = ref(false);
const selectedTemplate = ref<string | null>(null);

function percent(cl: Checklist) {
  if (!cl.total_tasks) return 0;
  return Math.round((cl.completed_tasks / cl.total_tasks) * 100);
}

function labelClass(item: ChecklistItem) {
  if (item.status === "Erledigt") return "line-through text-ink-gray-5";
  if (item.status === "Nicht benötigt") return "italic text-ink-gray-5";
  return "text-ink-gray-8";
}

function formatDate(d?: string | null) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function changeStatus(
  cl: Checklist,
  item: ChecklistItem,
  newStatus: string
) {
  try {
    await call("helpdesk_addon.api.checklist_actions.set_item_status", {
      checklist: cl.name,
      item_name: item.name,
      status: newStatus,
    });
    resource.reload();
  } catch (e: any) {
    toast.error(e.messages?.join("\n") || "Statusänderung fehlgeschlagen");
  }
}

function openAttachDialog() {
  selectedTemplate.value = null;
  templateResource.reload();
  showAttachDialog.value = true;
}

async function attach() {
  if (!selectedTemplate.value) return;
  try {
    await call("helpdesk_addon.api.checklist_actions.attach_template", {
      ticket: ticket.value.doc.name,
      template: selectedTemplate.value,
    });
    showAttachDialog.value = false;
    resource.reload();
    toast.success("Checkliste angehängt");
  } catch (e: any) {
    toast.error(e.messages?.join("\n") || "Anhängen fehlgeschlagen");
  }
}

async function detach(cl: Checklist) {
  if (!confirm(`Checkliste „${cl.title}" entfernen?`)) return;
  try {
    await call("helpdesk_addon.api.checklist_actions.detach_checklist", {
      checklist: cl.name,
    });
    resource.reload();
    toast.success("Checkliste entfernt");
  } catch (e: any) {
    toast.error(e.messages?.join("\n") || "Entfernen fehlgeschlagen");
  }
}
</script>
