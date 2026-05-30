import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env";

loadLocalEnv();
dns.setDefaultResultOrder("ipv4first");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD || process.env.DEMO_STUDENT_PASSWORD || "132400";
const accountPrefix = "xy";
const outputPath = path.join(process.cwd(), "student-accounts.generated.csv");

if (!url || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

type MemberRow = {
  id: string;
  member_no: number;
  chinese_name: string;
  campus: string | null;
};

type ProfileRow = {
  id: string;
  account: string | null;
  member_id: string | null;
};

function accountToEmail(account: string) {
  return `${account}@swimops.local`;
}

function normalizeAccount(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function accountNumber(account: string) {
  const match = account.match(/^xy(\d+)$/);
  return match ? Number(match[1]) : null;
}

function formatAccount(index: number) {
  return `${accountPrefix}${String(index).padStart(3, "0")}`;
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

async function listAllAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const result = await supabase.auth.admin.listUsers({ page, perPage });
    if (result.error) throw new Error(`list auth users: ${result.error.message}`);
    users.push(...result.data.users);
    if (result.data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

async function main() {
  if (defaultPassword.length < 4) {
    throw new Error("DEFAULT_STUDENT_PASSWORD must be at least 4 characters");
  }

  const [{ data: members, error: membersError }, { data: profiles, error: profilesError }, users] =
    await Promise.all([
      supabase.from("members").select("id, member_no, chinese_name, campus"),
      supabase.from("profiles").select("id, account, member_id").eq("role", "student"),
      listAllAuthUsers()
    ]);

  if (membersError) throw new Error(`load members: ${membersError.message}`);
  if (profilesError) throw new Error(`load profiles: ${profilesError.message}`);

  const profileRows = (profiles ?? []) as ProfileRow[];
  const existingAccounts = new Set(profileRows.map((profile) => normalizeAccount(profile.account)).filter(Boolean));
  const existingMemberIds = new Set(profileRows.map((profile) => profile.member_id).filter(Boolean));
  const authByEmail = new Map(users.map((user) => [user.email?.toLowerCase() ?? "", user]));
  let nextNumber = Math.max(0, ...[...existingAccounts].map((account) => accountNumber(account) ?? 0)) + 1;

  const sortedMembers = ((members ?? []) as MemberRow[])
    .filter((member) => !existingMemberIds.has(member.id))
    .sort((a, b) =>
      a.chinese_name.localeCompare(b.chinese_name, "zh-CN-u-co-pinyin", {
        numeric: true,
        sensitivity: "base"
      })
    );

  const exportedRows = [["账号", "初始密码", "学员姓名", "学员编号", "校区", "邮箱"]];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const member of sortedMembers) {
    let account = formatAccount(nextNumber);
    while (existingAccounts.has(account)) {
      nextNumber += 1;
      account = formatAccount(nextNumber);
    }

    const email = accountToEmail(account);
    const existingUser = authByEmail.get(email);
    const metadata = {
      full_name: member.chinese_name,
      account,
      role: "student"
    };

    const userResult = existingUser
      ? await supabase.auth.admin.updateUserById(existingUser.id, {
          password: defaultPassword,
          email_confirm: true,
          user_metadata: metadata
        })
      : await supabase.auth.admin.createUser({
          email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: metadata
        });

    if (userResult.error || !userResult.data.user) {
      console.warn(`skip ${member.chinese_name} ${account}: ${userResult.error?.message ?? "no user returned"}`);
      skipped += 1;
      nextNumber += 1;
      continue;
    }

    const user = userResult.data.user;
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: member.chinese_name,
      role: "student",
      account,
      campus: member.campus,
      coach_name: null,
      member_id: member.id,
      updated_at: new Date().toISOString()
    });

    if (profileError) {
      console.warn(`skip profile ${member.chinese_name} ${account}: ${profileError.message}`);
      skipped += 1;
      nextNumber += 1;
      continue;
    }

    existingAccounts.add(account);
    exportedRows.push([account, defaultPassword, member.chinese_name, String(member.member_no), member.campus ?? "", email]);
    if (existingUser) updated += 1;
    else created += 1;
    nextNumber += 1;
  }

  fs.writeFileSync(outputPath, `${exportedRows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`, "utf8");

  console.log("Student account generation completed");
  console.log({
    created,
    updated,
    skipped,
    alreadyBound: existingMemberIds.size,
    output: outputPath
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
