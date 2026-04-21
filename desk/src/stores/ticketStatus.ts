import { HDTicketStatus } from "@/types/doctypes";
import { createListResource } from "frappe-ui";
import { defineStore } from "pinia";

// Badge theme mapping for Frappe-UI Badge component
type BadgeTheme = "gray" | "blue" | "green" | "orange" | "red";

const badgeThemeMap: Record<string, BadgeTheme> = {
  blue: "blue",
  green: "green",
  orange: "orange",
  red: "red",
  gray: "gray",
  black: "gray",
  pink: "red",
  amber: "orange",
  yellow: "orange",
  cyan: "blue",
  teal: "green",
  violet: "blue",
  purple: "blue",
};

export const useTicketStatusStore = defineStore("ticketStatus", () => {
  const statuses = createListResource({
    doctype: "HD Ticket Status",
    cache: ["HD Ticket Status", "list"],
    fields: [
      "label_agent",
      "label_customer",
      "order",
      "different_view",
      "category",
      "color",
      "enabled",
    ],
    orderBy: "\`tabHD Ticket Status\`.order",
    pageLength: 1000,
    auto: true,
    transform: (data: HDTicketStatus[]) => {
      return data.map((d) => {
        if (!d.different_view) {
          d.label_customer = d.label_agent;
        }
        d["badge_theme"] = getBadgeTheme(d.color);
        return d;
      });
    },
  });

  function getStatus(label: string): HDTicketStatus | undefined {
    return statuses.data?.find(
      (s: HDTicketStatus) =>
        s.label_agent === label || s.label_customer === label
    );
  }

  function getBadgeTheme(color: string): BadgeTheme {
    return badgeThemeMap[color?.toLowerCase()] || "gray";
  }

  return {
    statuses,
    getStatus,
    getBadgeTheme,
  };
});
