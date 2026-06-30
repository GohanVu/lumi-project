import assert from "node:assert/strict";
import test from "node:test";
import { createUserSchema, updateUserSchema, userFormSchema } from "./user";

test("user form rejects invalid email", () => {
  const result = userFormSchema.safeParse({
    name: "Nguyễn Văn A",
    email: "khong-phai-email",
    password: "secret123",
    role: "USER",
  });
  assert.equal(result.success, false);
  assert.ok(result.error?.errors[0]?.message?.includes("Email"));
});

test("user form rejects short password", () => {
  const result = userFormSchema.safeParse({
    name: "A",
    email: "a@lumi.vn",
    password: "123",
    role: "USER",
  });
  assert.equal(result.success, false);
  assert.ok(result.error?.errors[0]?.message?.includes("Mật khẩu"));
});

test("user form rejects unknown role", () => {
  const result = userFormSchema.safeParse({
    name: "A",
    email: "a@lumi.vn",
    password: "secret123",
    role: "SUPERADMIN",
  });
  assert.equal(result.success, false);
});

test("create user schema chuẩn hóa email về lowercase và trim", () => {
  const result = createUserSchema.safeParse({
    name: "A",
    email: "  ADMIN@Lumi.VN  ",
    password: "secret123",
    role: "ADMIN",
  });
  assert.equal(result.success, true);
  assert.equal(result.data?.email, "admin@lumi.vn");
});

test("update user schema yêu cầu ít nhất một trường", () => {
  const empty = updateUserSchema.safeParse({});
  assert.equal(empty.success, false);

  const roleOnly = updateUserSchema.safeParse({ role: "ADMIN" });
  assert.equal(roleOnly.success, true);

  const activeOnly = updateUserSchema.safeParse({ isActive: false });
  assert.equal(activeOnly.success, true);
});
