"use client";

import { useQuery } from "@tanstack/react-query";
import styles from "./TimelineTab.module.css";

type InteractionType =
  | "CALL"
  | "VISIT"
  | "EMAIL"
  | "MEETING"
  | "ZALO"
  | "OTHER";

interface Interaction {
  id: string;
  type: InteractionType;
  content: string;
  result: string | null;
  contactName: string | null;
  followUpAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

interface TimelineTabProps {
  companyId: string;
}

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

const TYPE_MAP: Record<
  InteractionType,
  { label: string; icon: string; className: string }
> = {
  CALL: { label: "Gọi điện", icon: "☎", className: styles.typeCall },
  VISIT: { label: "Ghé thăm", icon: "⌂", className: styles.typeVisit },
  EMAIL: { label: "Email", icon: "✉", className: styles.typeEmail },
  MEETING: { label: "Cuộc họp", icon: "♟", className: styles.typeMeeting },
  ZALO: { label: "Zalo/Chat", icon: "●", className: styles.typeZalo },
  OTHER: { label: "Khác", icon: "•", className: styles.typeOther },
};

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: VIETNAM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateLabelFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  weekday: "long",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function groupInteractionsByDate(interactions: Interaction[]) {
  const groups = new Map<string, Interaction[]>();

  for (const interaction of interactions) {
    const key = dateKeyFormatter.format(new Date(interaction.createdAt));
    const group = groups.get(key) || [];
    group.push(interaction);
    groups.set(key, group);
  }

  return Array.from(groups.entries()).map(([dateKey, items]) => ({
    dateKey,
    label: dateLabelFormatter.format(new Date(items[0].createdAt)),
    items,
  }));
}

export function TimelineTab({ companyId }: TimelineTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["interactions", companyId],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/interactions`);
      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Lỗi tải timeline tương tác" }));
        throw new Error(body.error);
      }

      return response.json() as Promise<{ data: Interaction[] }>;
    },
  });

  if (isLoading) {
    return <div className={styles.loading}>Đang tải timeline...</div>;
  }

  if (isError) {
    return (
      <div className={styles.error} role="alert">
        <span>{(error as Error).message}</span>
        <button type="button" className={styles.retryButton} onClick={() => refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  const interactions = data?.data || [];

  if (interactions.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon} aria-hidden="true">◎</div>
        <h3>Chưa có tương tác</h3>
        <p>Các cuộc gọi, buổi gặp và trao đổi với NPP sẽ xuất hiện tại đây.</p>
      </div>
    );
  }

  const groups = groupInteractionsByDate(interactions);

  return (
    <section aria-labelledby="timeline-title">
      <div className={styles.header}>
        <div>
          <h3 id="timeline-title" className={styles.title}>Timeline tương tác</h3>
          <p className={styles.subtitle}>{interactions.length} hoạt động đã ghi nhận</p>
        </div>
      </div>

      <div className={styles.groups}>
        {groups.map((group) => (
          <section key={group.dateKey} className={styles.group}>
            <h4 className={styles.dateHeading}>{group.label}</h4>
            <ol className={styles.timelineList}>
              {group.items.map((interaction) => {
                const type = TYPE_MAP[interaction.type];

                return (
                  <li key={interaction.id} className={styles.timelineItem}>
                    <div
                      className={`${styles.marker} ${type.className}`}
                      aria-hidden="true"
                    >
                      {type.icon}
                    </div>
                    <article className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitleRow}>
                          <span className={`${styles.typeBadge} ${type.className}`}>
                            {type.label}
                          </span>
                          {interaction.contactName && (
                            <span className={styles.contactName}>
                              với {interaction.contactName}
                            </span>
                          )}
                        </div>
                        <time dateTime={interaction.createdAt} className={styles.time}>
                          {timeFormatter.format(new Date(interaction.createdAt))}
                        </time>
                      </div>

                      <p className={styles.content}>{interaction.content}</p>

                      {interaction.result && (
                        <div className={styles.result}>
                          <span className={styles.detailLabel}>Kết quả</span>
                          <span>{interaction.result}</span>
                        </div>
                      )}

                      <div className={styles.cardFooter}>
                        <span>Ghi bởi {interaction.createdBy.name}</span>
                        {interaction.followUpAt && (
                          <span className={styles.followUp}>
                            Follow-up: {dateTimeFormatter.format(new Date(interaction.followUpAt))}
                          </span>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}
