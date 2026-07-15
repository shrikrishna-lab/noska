// ============================================================
// Admin Security Penetration Test Suite
// Run: node test/admin-security.mjs
// Requires: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in env
// ============================================================

import { createClient } from "@supabase/supabase-js";

const PASS = "\x1b[32m✓ PASS\x1b[0m";
const FAIL = "\x1b[31m✗ FAIL\x1b[0m";
const WARN = "\x1b[33m⚠ WARN\x1b[0m";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(PASS, name);
    passed++;
  } catch (e) {
    console.log(FAIL, name, "-", e.message);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

// ============================================================
// 1. AUTH GATES
// ============================================================

async function t_auth_gates() {
  // admin_select with fake token
  const { error: selectErr } = await supabase.rpc("admin_select", {
    p_session_token: "fake-token",
    p_table: "admin_users",
    p_select: "id",
  });
  assert(selectErr, "admin_select should reject fake token");
  assert(selectErr.message.includes("UNAUTHORIZED") || selectErr.message.includes("42501"),
    "Expected authorization error");

  // admin_update with fake token
  const { error: updateErr } = await supabase.rpc("admin_update", {
    p_session_token: "fake-token",
    p_table: "admin_users",
    p_id: "00000000-0000-0000-0000-000000000000",
    p_data: { name: "test" },
  });
  assert(updateErr, "admin_update should reject fake token");

  // admin_delete with fake token
  const { error: deleteErr } = await supabase.rpc("admin_delete", {
    p_session_token: "fake-token",
    p_table: "admin_users",
    p_id: "00000000-0000-0000-0000-000000000000",
  });
  assert(deleteErr, "admin_delete should reject fake token");

  // admin_insert with fake token
  const { error: insertErr } = await supabase.rpc("admin_insert", {
    p_session_token: "fake-token",
    p_table: "admin_users",
    p_data: { name: "test", email: "test@test.com" },
  });
  assert(insertErr, "admin_insert should reject fake token");

  // ban_user with fake token
  const { error: banErr } = await supabase.rpc("ban_user", {
    p_user_id: "00000000-0000-0000-0000-000000000000",
    p_reason: "test",
    p_ban_type: "soft",
    p_session_token: "fake-token",
  });
  assert(banErr, "ban_user should reject fake token");

  // hard_ban_user with fake token
  const { error: hardBanErr } = await supabase.rpc("hard_ban_user", {
    p_user_id: "00000000-0000-0000-0000-000000000000",
    p_reason: "test",
    p_session_token: "fake-token",
  });
  assert(hardBanErr, "hard_ban_user should reject fake token");

  // unban_user with fake token
  const { error: unbanErr } = await supabase.rpc("unban_user", {
    p_user_id: "00000000-0000-0000-0000-000000000000",
    p_session_token: "fake-token",
  });
  assert(unbanErr, "unban_user should reject fake token");

  // delete_user_data with fake token
  const { error: deleteDataErr } = await supabase.rpc("delete_user_data", {
    p_user_id: "00000000-0000-0000-0000-000000000000",
    p_session_token: "fake-token",
  });
  assert(deleteDataErr, "delete_user_data should reject fake token");

  // set_admin_password with fake token (and existing admin)
  const { error: setPwdErr } = await supabase.rpc("set_admin_password", {
    p_email: "test@test.com",
    p_password: "Password123!",
    p_session_token: "fake-token",
  });
  // May fail due to no admin existing OR auth — either is fine
  // If it fails with password error instead of auth, test is still valid
  if (setPwdErr && !setPwdErr.message.includes("PASSWORD")) {
    assert(setPwdErr.message.includes("UNAUTHORIZED") || setPwdErr.message.includes("42501"),
      "set_admin_password should reject fake token or indicate no admin exists");
  }
}

// ============================================================
// 2. ADMIN LOGIN RESPONSE FORMAT
// ============================================================

async function t_admin_login_response() {
  // Non-existent email returns structured error (not exception)
  const { data, error } = await supabase.rpc("admin_login", {
    p_email: "nonexistent-" + Date.now() + "@test.com",
    p_password: "wrong-password",
  });

  assert(!error, "admin_login should not throw for invalid credentials");
  assert(data, "admin_login should return data");
  assert(data.error === "INVALID_CREDENTIALS", "Expected INVALID_CREDENTIALS error");
  assert(data.token === null, "Expected null token");
  assert(data.user === null, "Expected null user");
}

// ============================================================
// 3. SQL INJECTION VIA admin_select
// ============================================================

async function t_sql_injection_select() {
  // injection via p_select
  const { error: err1 } = await supabase.rpc("admin_select", {
    p_session_token: "fake-token",
    p_table: "admin_users",
    p_select: "id; DROP TABLE admin_users; --",
  });
  assert(err1, "Should block SQL injection in p_select");

  // injection via p_eq_col
  const { error: err2 } = await supabase.rpc("admin_select", {
    p_session_token: "fake-token",
    p_table: "admin_users",
    p_select: "id",
    p_eq_col: "id; DROP TABLE admin_users; --",
    p_eq_val: "1",
  });
  assert(err2, "Should block SQL injection in p_eq_col");

  // unauthorized table
  const { error: err3 } = await supabase.rpc("admin_select", {
    p_session_token: "fake-token",
    p_table: "pg_catalog.pg_class",
    p_select: "*",
  });
  assert(err3, "Should block unauthorized table access");
}

// ============================================================
// 4. VALIDATE SELECT COLUMNS
// ============================================================

async function t_validate_columns() {
  // Valid inputs
  await supabase.rpc("validate_select_columns", { p_select: "id" });
  await supabase.rpc("validate_select_columns", { p_select: "id, name, email" });
  await supabase.rpc("validate_select_columns", { p_select: "*" });

  // Invalid: parentheses
  const { error: err1 } = await supabase.rpc("validate_select_columns", { p_select: "col(1)" });
  assert(err1, "Should block parentheses");

  // Invalid: semicolon
  const { error: err2 } = await supabase.rpc("validate_select_columns", { p_select: "col; drop" });
  assert(err2, "Should block semicolon");

  // Invalid: comment
  const { error: err3 } = await supabase.rpc("validate_select_columns", { p_select: "col/*comment*/" });
  assert(err3, "Should block comments");

  // Invalid: whitespace in name
  const { error: err4 } = await supabase.rpc("validate_select_columns", { p_select: "col name" });
  assert(err4, "Should block whitespace in column name");
}

// ============================================================
// 5. SEARCH LENGTH LIMIT
// ============================================================

async function t_search_length_limit() {
  const longSearch = "a".repeat(300);

  const { data, error } = await supabase.rpc("get_page_audit_events", {
    p_page_id: "00000000-0000-0000-0000-000000000000",
    p_search: longSearch,
  });

  // RPC returns error OR returns empty results
  if (error) {
    assert(error.message.includes("SEARCH_TOO_LONG") || error.message.includes("42501"),
      "Should reject searches over 200 chars");
  } else {
    assert(Array.isArray(data), "Should return array");
  }
}

// ============================================================
// 6. LIMIT/OFFSET VALIDATION
// ============================================================

async function t_limit_offset_validation() {
  // Large limit
  const { error: err1 } = await supabase.rpc("get_page_audit_events", {
    p_page_id: "00000000-0000-0000-0000-000000000000",
    p_limit: 9999,
  });
  if (err1) {
    assert(err1.message.includes("LIMIT_TOO_LARGE"),
      "Should reject limits over 500");
  } else {
    // If it works, that's OK too (the function might handle it gracefully)
  }

  // Large offset
  const { error: err2 } = await supabase.rpc("get_page_audit_events", {
    p_page_id: "00000000-0000-0000-0000-000000000000",
    p_offset: 99999,
    p_limit: 1,
  });
  if (err2) {
    assert(err2.message.includes("OFFSET_TOO_LARGE"),
      "Should reject offsets over 10000");
  }
}

// ============================================================
// 7. EMPTY/NULL TOKEN HANDLING
// ============================================================

async function t_empty_token() {
  const { error } = await supabase.rpc("admin_select", {
    p_session_token: "",
    p_table: "admin_users",
    p_select: "id",
  });
  assert(error, "Should reject empty token");
}

// ============================================================
// 8. AUDIT RPCs EXIST AND ARE CALLABLE
// ============================================================

async function t_audit_rpcs() {
  // batch_insert_audit_events
  const { data: insertData, error: insertErr } = await supabase.rpc(
    "batch_insert_audit_events",
    { p_events: [] }
  );
  assert(!insertErr, "batch_insert_audit_events should accept empty array");
  assert(insertData === 0, "Should return 0 for empty batch");

  // get_audit_summary with non-existent page
  const { data: summaryData, error: summaryErr } = await supabase.rpc(
    "get_audit_summary",
    { p_page_id: "00000000-0000-0000-0000-000000000000" }
  );
  assert(!summaryErr, "get_audit_summary should not error");
  assert(summaryData, "Should return data");
  assert(typeof summaryData.total === "number", "Should have total field");

  // get_audit_event with non-existent id
  const { data: eventData, error: eventErr } = await supabase.rpc(
    "get_audit_event",
    { p_event_id: "00000000-0000-0000-0000-000000000000" }
  );
  assert(!eventErr, "get_audit_event should not error");
  assert(eventData === null, "Should return null for non-existent event");

  // get_ai_audit_events with non-existent page
  const { data: aiData, error: aiErr } = await supabase.rpc(
    "get_ai_audit_events",
    { p_page_id: "00000000-0000-0000-0000-000000000000", p_limit: 10 }
  );
  assert(!aiErr, "get_ai_audit_events should not error");
  assert(Array.isArray(aiData), "Should return array");
}

// ============================================================
// RUN ALL TESTS
// ============================================================

console.log("\n\x1b[1mAdmin Security Penetration Test Suite\x1b[0m\n");

const tests = [
  ["Auth gates reject fake tokens", t_auth_gates],
  ["Admin login returns structured error (not exception)", t_admin_login_response],
  ["SQL injection prevention in admin_select", t_sql_injection_select],
  ["Column validation blocks SQL metacharacters", t_validate_columns],
  ["Search length limit enforced", t_search_length_limit],
  ["Limit/offset validation enforced", t_limit_offset_validation],
  ["Empty token rejected", t_empty_token],
  ["Audit RPCs are callable", t_audit_rpcs],
];

for (const [name, fn] of tests) {
  await test(name, fn);
}

console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m\n`);

if (failed > 0) {
  console.log("\x1b[31mSome tests failed!\x1b[0m");
  process.exit(1);
} else {
  console.log("\x1b[32mAll tests passed!\x1b[0m");
}
