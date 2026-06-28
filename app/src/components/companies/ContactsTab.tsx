"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  contactFormSchema,
  type ContactFormData,
  type ContactFormInput,
  type ContactInfluence,
} from "@/lib/validation/contact";
import styles from "./ContactsTab.module.css";

// Types
interface Contact {
  id: string;
  fullName: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  influence: ContactInfluence | null;
  notes: string | null;
  createdAt: string;
}

interface ContactsTabProps {
  companyId: string;
}

const INFLUENCE_MAP: Record<string, { label: string; className: string }> = {
  high: { label: "Cao", className: styles.influenceHigh },
  medium: { label: "TB", className: styles.influenceMedium },
  low: { label: "Thấp", className: styles.influenceLow },
};

export function ContactsTab({ companyId }: ContactsTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Fetch contacts
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["contacts", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/contacts`);
      if (!res.ok) throw new Error("Lỗi tải danh sách liên hệ");
      return res.json() as Promise<{ data: Contact[] }>;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (formData: ContactFormData) => {
      const res = await fetch(`/api/companies/${companyId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lỗi tạo liên hệ" }));
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      setShowForm(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ContactFormData }) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lỗi cập nhật liên hệ" }));
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      setEditingContact(null);
      setShowForm(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lỗi xóa liên hệ" }));
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    },
  });

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleDelete = (contact: Contact) => {
    if (confirm(`Xóa liên hệ "${contact.fullName}"?`)) {
      deleteMutation.mutate(contact.id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingContact(null);
  };

  const contacts = data?.data || [];

  if (isLoading) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  if (isError) {
    return (
      <div className={styles.error} role="alert">
        {(error as Error).message}
      </div>
    );
  }

  const mutationError =
    createMutation.error || updateMutation.error || deleteMutation.error;

  return (
    <div>
      <div className={styles.header}>
        <h3 className={styles.title}>Người liên hệ ({contacts.length})</h3>
        <button
          className={styles.addButton}
          onClick={() => { setEditingContact(null); setShowForm(true); }}
        >
          + Thêm liên hệ
        </button>
      </div>

      {contacts.length === 0 && (
        <div className={styles.empty}>
          Chưa có người liên hệ. Bấm &ldquo;Thêm liên hệ&rdquo; để bắt đầu.
        </div>
      )}

      {mutationError && (
        <div className={styles.error} role="alert">
          {(mutationError as Error).message}
        </div>
      )}

      <div className={styles.contactList}>
        {contacts.map((contact) => {
          const inf = contact.influence ? INFLUENCE_MAP[contact.influence] : null;
          return (
            <div key={contact.id} className={styles.contactCard}>
              <div className={styles.contactInfo}>
                <div className={styles.contactName}>
                  {contact.fullName}
                  {contact.isPrimary && (
                    <span className={styles.primaryBadge}>Chính</span>
                  )}
                  {inf && (
                    <span className={`${styles.influenceBadge} ${inf.className}`}>
                      {inf.label}
                    </span>
                  )}
                </div>
                <div className={styles.contactMeta}>
                  {contact.position && <span>📋 {contact.position}</span>}
                  {contact.phone && <span>📞 {contact.phone}</span>}
                  {contact.email && <span>✉️ {contact.email}</span>}
                </div>
                {contact.notes && (
                  <div className={styles.contactNotes}>{contact.notes}</div>
                )}
              </div>
              <div className={styles.contactActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => handleEdit(contact)}
                >
                  Sửa
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                  onClick={() => handleDelete(contact)}
                >
                  Xóa
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <ContactFormModal
          contact={editingContact}
          onSubmit={(formData) => {
            if (editingContact) {
              updateMutation.mutate({ id: editingContact.id, data: formData });
            } else {
              createMutation.mutate(formData);
            }
          }}
          onClose={handleCloseForm}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

// Form Modal component
function ContactFormModal({
  contact,
  onSubmit,
  onClose,
  isLoading,
}: {
  contact: Contact | null;
  onSubmit: (data: ContactFormData) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormInput, unknown, ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contact
      ? {
          fullName: contact.fullName,
          position: contact.position || "",
          phone: contact.phone || "",
          email: contact.email || "",
          isPrimary: contact.isPrimary,
          influence: contact.influence || "",
          notes: contact.notes || "",
        }
      : {
          isPrimary: false,
          influence: "",
        },
  });

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="contact-form-title" className={styles.modalTitle}>
          {contact ? "Sửa liên hệ" : "Thêm liên hệ mới"}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="cf-fullName">
              Họ tên *
            </label>
            <input
              id="cf-fullName"
              type="text"
              className={styles.formInput}
              placeholder="Nguyễn Văn A"
              {...register("fullName")}
            />
            {errors.fullName && (
              <span className={styles.formError}>{errors.fullName.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="cf-position">
              Chức vụ
            </label>
            <input
              id="cf-position"
              type="text"
              className={styles.formInput}
              placeholder="Giám đốc, Trưởng phòng..."
              {...register("position")}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="cf-phone">
              Số điện thoại
            </label>
            <input
              id="cf-phone"
              type="text"
              className={styles.formInput}
              placeholder="0901234567"
              {...register("phone")}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="cf-email">
              Email
            </label>
            <input
              id="cf-email"
              type="email"
              className={styles.formInput}
              placeholder="email@example.com"
              {...register("email")}
            />
            {errors.email && (
              <span className={styles.formError}>{errors.email.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="cf-influence">
              Mức ảnh hưởng
            </label>
            <select
              id="cf-influence"
              className={styles.formSelect}
              {...register("influence")}
            >
              <option value="">— Không xác định —</option>
              <option value="high">Cao</option>
              <option value="medium">Trung bình</option>
              <option value="low">Thấp</option>
            </select>
          </div>

          <div className={styles.checkboxField}>
            <input
              id="cf-isPrimary"
              type="checkbox"
              {...register("isPrimary")}
            />
            <label htmlFor="cf-isPrimary">Liên hệ chính</label>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="cf-notes">
              Ghi chú
            </label>
            <textarea
              id="cf-notes"
              className={styles.formTextarea}
              placeholder="Ghi chú về người liên hệ..."
              {...register("notes")}
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? "Đang lưu..." : contact ? "Cập nhật" : "Thêm"}
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
